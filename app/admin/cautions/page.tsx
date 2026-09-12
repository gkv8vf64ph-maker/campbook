"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type Caution = {
  id: number;
  event_id: number;
  title: string;
  description: string;
  sort_order: number;
};

export default function AdminCautionsPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [cautions, setCautions] = useState<Caution[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
  useState("");

const [sendNotification, setSendNotification] =
  useState(false);

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

    fetchCautions();
  }, [currentEventId]);

  async function fetchCautions() {
    if (!currentEventId) return;

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("cautions")
      .select(
        "id, event_id, title, description, sort_order"
      )
      .eq("event_id", currentEventId)
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      console.log(
        "注意事項取得エラー:",
        error.message
      );

      setErrorMessage(
        "注意事項を読み込めませんでした。"
      );

      setIsLoading(false);
      return;
    }

    setCautions(data ?? []);
    setIsLoading(false);
  }

  async function handleAddCaution() {
    if (!currentEventId) {
      setErrorMessage(
        "イベントが選択されていません。"
      );
      return;
    }

    if (!title.trim()) {
      setErrorMessage(
        "タイトルを入力してください。"
      );
      return;
    }

    if (!description.trim()) {
      setErrorMessage(
        "内容を入力してください。"
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
setErrorMessage("");
setSuccessMessage("");

    const nextSortOrder =
      cautions.length > 0
        ? Math.max(
            ...cautions.map(
              (caution) => caution.sort_order
            )
          ) + 1
        : 1;

    const { data, error } = await supabase
      .from("cautions")
      .insert({
        event_id: currentEventId,
        title: title.trim(),
        description: description.trim(),
        sort_order: nextSortOrder,
      })
      .select(
        "id, event_id, title, description, sort_order"
      )
      .single();

    if (error) {
      console.log(
        "注意事項追加エラー:",
        error.message
      );

      setErrorMessage(
        "注意事項を追加できませんでした。"
      );

      setIsSaving(false);
      return;
    }

    setCautions((current) => [
  ...current,
  data,
]);

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
        "注意事項は追加しましたが、通知は送信できませんでした。"
      );
    } else {
      const response = await fetch(
        "/api/push/event",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            eventId: currentEventId,
            title:
              "⚠️ 注意事項が追加されました",
            body: title.trim(),
            url: "/caution",
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        console.log(
          "注意事項Push通知エラー:",
          result
        );

        setSuccessMessage(
          "注意事項は追加しましたが、通知は送信できませんでした。"
        );
      } else {
        setSuccessMessage(
          `注意事項を追加し、${result.sent}台に通知しました 🔔`
        );
      }
    }
  } catch (notificationError) {
    console.log(
      "注意事項通知送信エラー:",
      notificationError
    );

    setSuccessMessage(
      "注意事項は追加しましたが、通知は送信できませんでした。"
    );
  }
} else {
  setSuccessMessage(
    "注意事項を追加しました。"
  );
}

setTitle("");
setDescription("");
setSendNotification(false);
setIsSaving(false);
  }

  async function handleDeleteCaution(
    cautionId: number
  ) {
    const shouldDelete = window.confirm(
      "この注意事項を削除しますか？"
    );

    if (!shouldDelete) return;

    const { error } = await supabase
      .from("cautions")
      .delete()
      .eq("id", cautionId);

    if (error) {
      console.log(
        "注意事項削除エラー:",
        error.message
      );

      setErrorMessage(
        "注意事項を削除できませんでした。"
      );

      return;
    }

    setCautions((current) =>
      current.filter(
        (caution) =>
          caution.id !== cautionId
      )
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
            ADMIN / CAUTIONS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            注意事項を編集
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            参加者に表示する注意事項を追加できます。
          </p>
        </div>

        <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <p className="text-sm font-bold text-[#394536]">
            新しい注意事項
          </p>

          <div className="mt-5">
            <label className="text-xs font-bold text-[#7b8475]">
              タイトル
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrorMessage("");
              }}
              placeholder="例：時間を守ろう"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold text-[#7b8475]">
              内容
            </label>

            <textarea
              value={description}
              onChange={(event) => {
                setDescription(
                  event.target.value
                );
                setErrorMessage("");
              }}
              placeholder="例：集合時間には余裕を持って行動してください。"
              className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-[#f4f6f1] p-4">
  <div>
    <p className="text-sm font-bold text-[#394536]">
      参加者へ通知する
    </p>

    <p className="mt-1 text-xs leading-5 text-[#81867d]">
      この注意事項を追加したことをPush通知します
    </p>
  </div>

  <input
    type="checkbox"
    checked={sendNotification}
    onChange={(event) =>
      setSendNotification(
        event.target.checked
      )
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
  <p className="mt-5 rounded-2xl bg-[#eef2e9] p-4 text-sm font-medium text-[#394536]">
    {successMessage}
  </p>
)}

          <button
            type="button"
            onClick={handleAddCaution}
            disabled={isSaving}
            className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white disabled:opacity-60"
          >
            {isSaving
              ? "追加しています…"
              : "＋ 注意事項を追加"}
          </button>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                CURRENT CAUTIONS
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                登録中の注意事項
              </h2>
            </div>

            <p className="text-sm font-semibold text-[#7b8475]">
              {cautions.length}件
            </p>
          </div>

          {isLoading && (
            <p className="mt-5 text-center text-sm text-[#777c73]">
              読み込んでいます…
            </p>
          )}

          {!isLoading &&
            cautions.length === 0 && (
              <div className="mt-5 rounded-3xl bg-white p-6 text-center">
                <p className="text-sm text-[#777c73]">
                  まだ注意事項はありません。
                </p>
              </div>
            )}

          <div className="mt-5 space-y-3">
            {cautions.map((caution) => (
              <div
                key={caution.id}
                className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(57,69,54,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">
                        ⚠️
                      </span>

                      <div>
                        <p className="font-bold text-[#394536]">
                          {caution.title}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#777c73]">
                          {caution.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteCaution(
                        caution.id
                      )
                    }
                    className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Link
          href="/caution"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-2xl border border-[#d7dbd3] bg-white text-sm font-bold text-[#5d6b56]"
        >
          参加者画面を確認する
        </Link>
      </div>
    </main>
  );
}