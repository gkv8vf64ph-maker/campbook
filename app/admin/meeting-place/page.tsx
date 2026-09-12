"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type MeetingPlace = {
  id: number;
  event_id: number;
  name: string;
  address: string | null;
  description: string | null;
};

export default function AdminMeetingPlacePage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [meetingPlaceId, setMeetingPlaceId] =
    useState<number | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sendNotification, setSendNotification] =
  useState(true);

  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    } else {
      setIsLoading(false);
      setErrorMessage(
        "編集するイベントが選択されていません。"
      );
    }
  }, []);

  useEffect(() => {
    if (!currentEventId) return;

    async function fetchMeetingPlace() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("meeting_places")
        .select(
          "id, event_id, name, address, description"
        )
        .eq("event_id", currentEventId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log(
          "集合場所取得エラー:",
          error.message
        );

        setErrorMessage(
          "集合場所を読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      if (data) {
        const meetingPlace = data as MeetingPlace;

        setMeetingPlaceId(meetingPlace.id);
        setName(meetingPlace.name);
        setAddress(meetingPlace.address ?? "");
        setDescription(
          meetingPlace.description ?? ""
        );
      }

      setIsLoading(false);
    }

    fetchMeetingPlace();
  }, [currentEventId]);

  async function handleSave() {
    if (!currentEventId) {
      setErrorMessage(
        "イベントが選択されていません。"
      );
      return;
    }

    if (!name.trim()) {
      setErrorMessage(
        "集合場所名を入力してください。"
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (meetingPlaceId) {
      // すでに登録済みなら更新
      const { error } = await supabase
        .from("meeting_places")
        .update({
          name: name.trim(),
          address:
            address.trim() || null,
          description:
            description.trim() || null,
        })
        .eq("id", meetingPlaceId);

      if (error) {
        console.log(
          "集合場所更新エラー:",
          error.message
        );

        setErrorMessage(
          "集合場所を保存できませんでした。"
        );

        setIsSaving(false);
        return;
      }
    } else {
      // まだ未登録なら新規作成
      const { data, error } = await supabase
        .from("meeting_places")
        .insert({
          event_id: currentEventId,
          name: name.trim(),
          address:
            address.trim() || null,
          description:
            description.trim() || null,
        })
        .select("id")
        .single();

      if (error) {
        console.log(
          "集合場所追加エラー:",
          error.message
        );

        setErrorMessage(
          "集合場所を保存できませんでした。"
        );

        setIsSaving(false);
        return;
      }

      setMeetingPlaceId(data.id);
    }

    if (sendNotification) {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      console.log(
        "通知用ログイン情報取得エラー:",
        sessionError
      );

      setSuccessMessage(
        "集合場所は保存しましたが、通知は送信できませんでした。"
      );
    } else {
      const response = await fetch(
        "/api/push/event",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            eventId: currentEventId,
            title: "📍 集合場所が更新されました",
            body: name.trim(),
            url: "/meeting-place",
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        console.log(
          "集合場所Push通知エラー:",
          result
        );

        setSuccessMessage(
          "集合場所は保存しましたが、通知は送信できませんでした。"
        );
      } else {
        setSuccessMessage(
          `集合場所を保存し、${result.sent}台に通知しました 🔔`
        );
      }
    }
  } catch (notificationError) {
    console.log(
      "集合場所通知送信エラー:",
      notificationError
    );

    setSuccessMessage(
      "集合場所は保存しましたが、通知は送信できませんでした。"
    );
  }
} else {
  setSuccessMessage(
    "集合場所を保存しました。"
  );
}

setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm text-[#777c73]">
          読み込んでいます…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 pb-12 pt-8 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/admin"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← 管理画面へ戻る
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            ADMIN / MEETING PLACE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            集合場所を編集
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            参加者に表示する集合場所を設定できます。
          </p>
        </div>

        <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <div>
            <label className="text-xs font-bold text-[#7b8475]">
              集合場所名
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              placeholder="例：愛知県立大学 正門"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold text-[#7b8475]">
              住所
            </label>

            <input
              type="text"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setSuccessMessage("");
              }}
              placeholder="例：愛知県長久手市茨ケ廻間1522-3"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />

            <p className="mt-2 text-xs leading-5 text-[#92958e]">
              Googleマップを開くときは、住所が入力されていれば住所を優先します。
            </p>
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold text-[#7b8475]">
              説明
            </label>

            <textarea
              value={description}
              onChange={(event) => {
                setDescription(
                  event.target.value
                );
                setSuccessMessage("");
              }}
              placeholder="例：正門付近でスタッフが待機しています。"
              className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-[#f4f6f1] p-4">
  <div>
    <p className="text-sm font-bold text-[#394536]">
      参加者へ通知する
    </p>

    <p className="mt-1 text-xs leading-5 text-[#81867d]">
      集合場所の登録・変更をPush通知します
    </p>
  </div>

  <input
    type="checkbox"
    checked={sendNotification}
    onChange={(event) =>
      setSendNotification(event.target.checked)
    }
    className="h-5 w-5 accent-[#394536]"
  />
</label>

          {errorMessage && (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mt-5 rounded-2xl bg-[#eef2e9] p-4 text-sm font-bold text-[#52644b]">
              ✓ {successMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            {isSaving
              ? "保存しています…"
              : "保存する"}
          </button>
        </section>

        <Link
          href="/meeting-place"
          className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl border border-[#d7dbd3] bg-white text-sm font-bold text-[#5d6b56]"
        >
          参加者画面を確認する
        </Link>
      </div>
    </main>
  );
}