import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

type RequestBody = {
  postId: number;
  commentId: number;
};

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY;

    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY;

    const vapidSubject =
      process.env.VAPID_SUBJECT;

    if (
      !supabaseUrl ||
      !publishableKey ||
      !secretKey ||
      !vapidPublicKey ||
      !vapidPrivateKey ||
      !vapidSubject
    ) {
      return NextResponse.json(
        {
          error: "サーバー設定が不足しています",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "ログイン情報がありません",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

    const authSupabase =
      createClient(
        supabaseUrl,
        publishableKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        }
      );

    const {
      data: { user },
      error: userError,
    } =
      await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "ログイン情報を確認できません",
        },
        { status: 401 }
      );
    }

    const {
      postId,
      commentId,
    } =
      (await request.json()) as RequestBody;

    if (!postId || !commentId) {
      return NextResponse.json(
        {
          error: "必要な情報がありません",
        },
        { status: 400 }
      );
    }

    const adminSupabase =
      createClient(
        supabaseUrl,
        secretKey
      );

    // 実際にこのユーザーが送ったコメントか確認
    const {
      data: comment,
      error: commentError,
    } = await adminSupabase
      .from("comments")
      .select(
        "id, post_id, user_id, comment"
      )
      .eq("id", commentId)
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (commentError || !comment) {
      return NextResponse.json(
        {
          error: "コメントを確認できませんでした",
        },
        { status: 404 }
      );
    }

    // 投稿者とイベントを取得
    const {
      data: post,
      error: postError,
    } = await adminSupabase
      .from("posts")
      .select(
        "id, user_id, event_id"
      )
      .eq("id", postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json(
        {
          error: "投稿を取得できませんでした",
        },
        { status: 404 }
      );
    }

    if (!post.user_id) {
      return NextResponse.json({
        success: true,
        skipped: true,
      });
    }

    // 自分の投稿へのコメントは通知しない
    if (post.user_id === user.id) {
      return NextResponse.json({
        success: true,
        skipped: true,
      });
    }

    const {
      data: profile,
    } = await adminSupabase
      .from("profiles")
      .select("user_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const actorName =
      profile?.user_name ?? "誰か";

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await adminSupabase
      .from("push_subscriptions")
      .select(
        "id, endpoint, p256dh, auth_key"
      )
      .eq("user_id", post.user_id);

    if (subscriptionsError) {
      return NextResponse.json(
        {
          error: "通知先を取得できませんでした",
        },
        { status: 500 }
      );
    }

    if (
      !subscriptions ||
      subscriptions.length === 0
    ) {
      return NextResponse.json({
        success: true,
        sent: 0,
      });
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const shortComment =
      comment.comment.length > 40
        ? `${comment.comment.slice(0, 40)}…`
        : comment.comment;

    const notificationUrl =
      `/notification?eventId=${post.event_id}&to=${encodeURIComponent(
        "/timeline"
      )}`;

    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (
      const subscription
      of subscriptions
    ) {
      try {
        await webpush.sendNotification(
          {
            endpoint:
              subscription.endpoint,
            keys: {
              p256dh:
                subscription.p256dh,
              auth:
                subscription.auth_key,
            },
          },
          JSON.stringify({
            title:
              `💬 ${actorName}さんがコメントしました`,
            body: shortComment,
            url: notificationUrl,
          })
        );

        sent++;
      } catch (error) {
        failed++;

        const pushError =
          error as {
            statusCode?: number;
          };

        if (
          pushError.statusCode === 404 ||
          pushError.statusCode === 410
        ) {
          await adminSupabase
            .from("push_subscriptions")
            .delete()
            .eq(
              "id",
              subscription.id
            );

          removed++;
        }

        console.error(
          "コメントPush送信エラー:",
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      removed,
    });
  } catch (error) {
    console.error(
      "Comment Push API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "コメント通知中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}