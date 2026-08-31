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

export default function NewsPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    } else {
      setIsLoading(false);
      setErrorMessage(
        "参加中のイベントが見つかりません。"
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

  function formatDate(createdAt: string) {
    return new Date(createdAt).toLocaleDateString(
      "ja-JP",
      {
        month: "numeric",
        day: "numeric",
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6">
      <div className="mx-auto max-w-md">
        <Link
          href="/event"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← ホームへ戻る
        </Link>

        <div className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-[0_16px_40px_rgba(57,69,54,0.10)]">
          <div className="bg-[#394536] p-6 text-white">
            <p className="text-xs font-bold tracking-[0.14em] text-white/60">
              NEWS
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              お知らせ
            </h1>

            <p className="mt-2 text-sm text-white/70">
              運営からのお知らせです。
            </p>
          </div>

          <div className="space-y-5 p-6">
            {isLoading && (
              <p className="py-5 text-center text-sm text-[#777c73]">
                お知らせを読み込んでいます…
              </p>
            )}

            {errorMessage && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            {!isLoading &&
              !errorMessage &&
              newsItems.length === 0 && (
                <div className="rounded-2xl bg-[#f7f5ef] p-7 text-center">
                  <p className="text-3xl">📢</p>

                  <p className="mt-3 font-bold text-[#394536]">
                    お知らせはありません
                  </p>

                  <p className="mt-2 text-sm text-[#777c73]">
                    新しいお知らせが追加されると、
                    ここに表示されます。
                  </p>
                </div>
              )}

            {!isLoading &&
              newsItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#ece9e2] p-5"
                >
                  <p className="text-xs font-bold text-[#8a8f84]">
                    {formatDate(item.created_at)}
                  </p>

                  <h2 className="mt-2 text-lg font-bold text-[#394536]">
  {item.title}
</h2>

                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-[#394536]">
  {item.content}
</p>
                </article>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}