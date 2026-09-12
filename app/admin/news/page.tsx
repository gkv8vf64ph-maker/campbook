"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type NewsItem = {
  id: number;
  event_id: number;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
};

export default function AdminNewsPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendNotification, setSendNotification] =
  useState(true);

const [successMessage, setSuccessMessage] =
  useState("");

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

    async function fetchNews() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("news")
        .select(
          "id, event_id, title, content, sort_order, created_at"
        )
        .eq("event_id", currentEventId)
        .order("sort_order", {
          ascending: false,
        });

      if (error) {
        console.log(
          "お知らせ取得エラー:",
          error.message
        );

        setErrorMessage(
          "お知らせを読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      setNewsItems(data ?? []);
      setIsLoading(false);
    }

    fetchNews();
  }, [currentEventId]);

  async function handleAddNews() {
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

    if (!content.trim()) {
      setErrorMessage(
        "本文を入力してください。"
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    const nextSortOrder =
      newsItems.length > 0
        ? Math.max(
            ...newsItems.map(
              (item) => item.sort_order
            )
          ) + 1
        : 1;

    const { data, error } = await supabase
      .from("news")
      .insert({
        event_id: currentEventId,
        title: title.trim(),
        content: content.trim(),
        sort_order: nextSortOrder,
      })
      .select(
        "id, event_id, title, content, sort_order, created_at"
      )
      .single();

    if (error) {
      console.log(
        "お知らせ追加エラー:",
        error.message
      );

      setErrorMessage(
        "お知らせを追加できませんでした。"
      );

      setIsSaving(false);
      return;
    }

    setNewsItems((current) => [
  data,
  ...current,
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
        "お知らせは追加しましたが、通知は送信できませんでした。"
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
            title: `📢 ${title.trim()}`,
            body: content.trim(),
            url: "/news",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.log(
          "Push通知エラー:",
          result
        );

        setSuccessMessage(
          "お知らせは追加しましたが、通知は送信できませんでした。"
        );
      } else {
        setSuccessMessage(
          `お知らせを追加し、${result.sent}台に通知しました 🔔`
        );
      }
    }
  } catch (notificationError) {
    console.log(
      "Push通知送信エラー:",
      notificationError
    );

    setSuccessMessage(
      "お知らせは追加しましたが、通知は送信できませんでした。"
    );
  }
} else {
  setSuccessMessage(
    "お知らせを追加しました。"
  );
}

setTitle("");
setContent("");
setIsSaving(false);
  }

  async function handleDeleteNews(
    newsId: number
  ) {
    const shouldDelete = window.confirm(
      "このお知らせを削除しますか？"
    );

    if (!shouldDelete) return;

    const { error } = await supabase
      .from("news")
      .delete()
      .eq("id", newsId);

    if (error) {
      console.log(
        "お知らせ削除エラー:",
        error.message
      );

      setErrorMessage(
        "お知らせを削除できませんでした。"
      );

      return;
    }

    setNewsItems((current) =>
      current.filter(
        (item) => item.id !== newsId
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
            ADMIN / NEWS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            お知らせを編集
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            参加者に表示する最新情報を追加できます。
          </p>
        </div>

        <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <p className="text-sm font-bold text-[#394536]">
            新しいお知らせ
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
  setSuccessMessage("");
}}
              placeholder="例：集合時間を変更しました"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold text-[#7b8475]">
              本文
            </label>

            <textarea
              value={content}
              onChange={(event) => {
  setContent(event.target.value);
  setErrorMessage("");
  setSuccessMessage("");
}}
              placeholder="例：集合時間を10:30に変更しました。"
              className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-[#f4f6f1] p-4">
  <div>
    <p className="text-sm font-bold text-[#394536]">
      参加者へ通知する
    </p>

    <p className="mt-1 text-xs leading-5 text-[#81867d]">
      このイベントの参加者へPush通知を送ります
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
            onClick={handleAddNews}
            disabled={isSaving}
            className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white disabled:opacity-60"
          >
            {isSaving
              ? "追加しています…"
              : "＋ お知らせを追加"}
          </button>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                CURRENT NEWS
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                登録中のお知らせ
              </h2>
            </div>

            <p className="text-sm font-semibold text-[#7b8475]">
              {newsItems.length}件
            </p>
          </div>

          {isLoading && (
            <p className="mt-5 text-center text-sm text-[#777c73]">
              読み込んでいます…
            </p>
          )}

          {!isLoading &&
            newsItems.length === 0 && (
              <div className="mt-5 rounded-3xl bg-white p-7 text-center">
                <p className="text-3xl">
                  📢
                </p>

                <p className="mt-3 text-sm text-[#777c73]">
                  まだお知らせはありません。
                </p>
              </div>
            )}

          <div className="mt-5 space-y-3">
            {newsItems.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(57,69,54,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-[#394536]">
                      {item.title}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#777c73]">
                      {item.content}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteNews(
                        item.id
                      )
                    }
                    className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                  >
                    削除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <Link
          href="/news"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-2xl border border-[#d7dbd3] bg-white text-sm font-bold text-[#5d6b56]"
        >
          参加者画面を確認する
        </Link>
      </div>
    </main>
  );
}