import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

    // ブラウザから送られたログイン情報を取得
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

    // access tokenから本人を確認
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

    // RLSにより本人の購読情報だけ取得できる
    const {
      data: subscriptions,
      error: subscriptionError,
    } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("user_id", user.id);

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

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        {
          error: "通知を受け取る端末がありません",
        },
        { status: 404 }
      );
    }

    webpush.setVapidDetails(
      subject,
      publicKey,
      privateKey
    );

    const payload = JSON.stringify({
      title: "🔔 CampBook",
      body: "通知テスト成功！CampBookから届きました 🎉",
      url: "/event",
    });

    let successCount = 0;

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
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        {
          error: "通知を送信できませんでした",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
    });
  } catch (error) {
    console.error(
      "テスト通知APIエラー:",
      error
    );

    return NextResponse.json(
      {
        error: "テスト通知でエラーが発生しました",
      },
      { status: 500 }
    );
  }
}