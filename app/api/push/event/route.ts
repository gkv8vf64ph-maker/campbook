import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type RequestBody = {
  eventId: number;
  title: string;
  body: string;
  url?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
      process.env.VAPID_PRIVATE_KEY;

    const subject =
      process.env.VAPID_SUBJECT;

    if (
      !supabaseUrl ||
      !supabaseKey ||
      !publicKey ||
      !privateKey ||
      !subject
    ) {
      return NextResponse.json(
        {
          error: "サーバーの通知設定が不足しています",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "ログインが必要です",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.slice("Bearer ".length);

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "ログイン情報を確認できませんでした",
        },
        { status: 401 }
      );
    }

    const {
      data: adminUser,
      error: adminError,
    } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) {
      console.error(
        "管理者確認エラー:",
        adminError
      );

      return NextResponse.json(
        {
          error: "管理者情報を確認できませんでした",
        },
        { status: 500 }
      );
    }

    if (!adminUser) {
      return NextResponse.json(
        {
          error: "管理者のみ通知を送信できます",
        },
        { status: 403 }
      );
    }

    const requestBody =
      (await request.json()) as RequestBody;

    const {
      eventId,
      title,
      body,
      url = "/event",
    } = requestBody;

    if (
      !eventId ||
      !title?.trim() ||
      !body?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "eventId、title、body は必須です",
        },
        { status: 400 }
      );
    }

    const {
      data: members,
      error: memberError,
    } = await supabase
      .from("event_members")
      .select("user_id")
      .eq("event_id", eventId);

    if (memberError) {
      console.error(
        "参加者取得エラー:",
        memberError
      );

      return NextResponse.json(
        {
          error: "イベント参加者を取得できませんでした",
        },
        { status: 500 }
      );
    }

    if (!members || members.length === 0) {
      return NextResponse.json(
        {
          error: "イベント参加者がいません",
        },
        { status: 404 }
      );
    }

    const userIds = [
      ...new Set(
        members
          .map((member) => member.user_id)
          .filter(Boolean)
      ),
    ];

    const {
      data: subscriptions,
      error: subscriptionError,
    } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key")
      .in("user_id", userIds);

    if (subscriptionError) {
      console.error(
        "購読情報取得エラー:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error: "通知端末を取得できませんでした",
        },
        { status: 500 }
      );
    }

    if (
      !subscriptions ||
      subscriptions.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "通知を受け取れる参加者がいません",
        },
        { status: 404 }
      );
    }

    webpush.setVapidDetails(
      subject,
      publicKey,
      privateKey
    );

    const notificationUrl =
  `/notification?eventId=${eventId}&to=${encodeURIComponent(url)}`;

const payload = JSON.stringify({
  title: title.trim(),
  body: body.trim(),
  url: notificationUrl,
});

    let successCount = 0;
let failureCount = 0;
let removedCount = 0;

for (const subscription of subscriptions) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_key,
        },
      },
      payload
    );

    successCount++;
  } catch (error) {
    console.error(
      "Push送信エラー:",
      error
    );

    failureCount++;

    let statusCode: number | undefined;

    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
    ) {
      statusCode = error.statusCode;
    }

    if (
      statusCode === 404 ||
      statusCode === 410
    ) {
      const { error: deleteError } =
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id);

      if (deleteError) {
        console.error(
          "期限切れ購読の削除エラー:",
          deleteError
        );
      } else {
        removedCount++;

        console.log(
          "期限切れPush購読を削除しました:",
          subscription.id
        );
      }
    }
  }
}

    if (successCount === 0) {
      return NextResponse.json(
        {
          error:
            "参加者へ通知を送信できませんでした",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
  success: true,
  eventId,
  sent: successCount,
  failed: failureCount,
  removed: removedCount,
});
  } catch (error) {
    console.error(
      "イベント通知APIエラー:",
      error
    );

    return NextResponse.json(
      {
        error:
          "イベント通知でエラーが発生しました",
      },
      { status: 500 }
    );
  }
}