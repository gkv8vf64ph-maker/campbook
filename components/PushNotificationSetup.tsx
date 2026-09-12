"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) =>
      character.charCodeAt(0)
    )
  );
}

export default function PushNotificationSetup() {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function setup() {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (!supported) {
        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.register("/sw.js");

        console.log(
          "CampBook Service Worker registered"
        );

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoggedIn(false);
          return;
        }

        setIsLoggedIn(true);

        const subscription =
          await registration.pushManager.getSubscription();

        if (subscription) {
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error("Push setup error:", error);
      }
    }

    setup();
  }, []);

  async function enableNotifications() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage(
          "ログインしてから通知を設定してください"
        );
        return;
      }

      const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        console.error(
          "NEXT_PUBLIC_VAPID_PUBLIC_KEY がありません"
        );

        setMessage(
          "通知設定を読み込めませんでした"
        );
        return;
      }

      const permission =
        await Notification.requestPermission();

      if (permission !== "granted") {
        setMessage(
          "通知が許可されませんでした"
        );
        return;
      }

      const registration =
        await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64ToUint8Array(publicKey),
          });
      }

      const subscriptionJson =
        subscription.toJSON();

      const p256dh =
        subscriptionJson.keys?.p256dh;

      const authKey =
        subscriptionJson.keys?.auth;

      if (
        !subscription.endpoint ||
        !p256dh ||
        !authKey
      ) {
        console.error(
          "Push subscription keys missing"
        );

        setMessage(
          "通知端末の登録に失敗しました"
        );
        return;
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh,
            auth_key: authKey,
          },
          {
            onConflict: "endpoint",
          }
        );

      if (error) {
        console.error(
          "Push subscription save error:",
          error
        );

        setMessage(
          "通知設定の保存に失敗しました"
        );
        return;
      }

      setIsSubscribed(true);
      setMessage("通知をオンにしました 🔔");
    } catch (error) {
      console.error("通知設定エラー:", error);

      setMessage(
        "通知設定に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function sendTestNotification() {
    if (isTesting) {
      return;
    }

    setIsTesting(true);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        setMessage(
          "ログイン情報を取得できませんでした"
        );
        return;
      }

      const response = await fetch(
        "/api/push/test",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Test push error:",
          result
        );

        setMessage(
          result.error ||
            "テスト通知を送れませんでした"
        );

        return;
      }

      setMessage(
        `テスト通知を送信しました 🔔 (${result.sent}台)`
      );
    } catch (error) {
      console.error(
        "テスト通知エラー:",
        error
      );

      setMessage(
        "テスト通知の送信に失敗しました"
      );
    } finally {
      setIsTesting(false);
    }
  }

  if (!isSupported || !isLoggedIn) {
    return null;
  }

  // 通知登録済み
  if (isSubscribed) {
    return (
      <div className="fixed bottom-24 left-1/2 z-[9000] w-[calc(100%-32px)] max-w-sm -translate-x-1/2">
        <div className="rounded-[24px] border border-[#e6e4dc] bg-white p-4 shadow-[0_12px_35px_rgba(57,69,54,0.15)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef2e9] text-xl">
              🔔
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#394536]">
                通知テスト
              </p>

              <p className="mt-1 text-xs leading-5 text-[#81867d]">
                CampBookから通知が届くか確認します
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={sendTestNotification}
            disabled={isTesting}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl bg-[#394536] text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {isTesting
              ? "送信中..."
              : "テスト通知を送る"}
          </button>

          {message && (
            <p className="mt-2 text-center text-xs font-semibold text-[#777c73]">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // まだ通知登録していない
  return (
    <div className="fixed bottom-24 left-1/2 z-[9000] w-[calc(100%-32px)] max-w-sm -translate-x-1/2">
      <div className="rounded-[24px] border border-[#e6e4dc] bg-white p-4 shadow-[0_12px_35px_rgba(57,69,54,0.15)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef2e9] text-xl">
            🔔
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#394536]">
              CampBookの通知
            </p>

            <p className="mt-1 text-xs leading-5 text-[#81867d]">
              予定や投稿への反応をお知らせします
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={enableNotifications}
          disabled={isLoading}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl bg-[#394536] text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {isLoading
            ? "設定中..."
            : "通知をオンにする"}
        </button>

        {message && (
          <p className="mt-2 text-center text-xs font-semibold text-[#777c73]">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}