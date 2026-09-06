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

export default function CautionPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [cautions, setCautions] = useState<Caution[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // 現在参加しているイベントIDを取得
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

  // 注意事項をSupabaseから取得
  useEffect(() => {
    if (!currentEventId) return;

    async function fetchCautions() {
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

    fetchCautions();
  }, [currentEventId]);

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
            

            <h1 className="mt-2 text-3xl font-bold">
              注意事項
            </h1>

            <p className="mt-2 text-sm text-white/70">
              出発前に必ず確認してください。
            </p>
          </div>

          <div className="space-y-4 p-6">
            {/* 読み込み中 */}
            {isLoading && (
              <p className="py-6 text-center text-sm text-[#777c73]">
                読み込み中…
              </p>
            )}

            {/* エラー */}
            {errorMessage && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            {/* 注意事項が0件 */}
            {!isLoading &&
              !errorMessage &&
              cautions.length === 0 && (
                <div className="rounded-2xl bg-[#f7f5ef] p-6 text-center">
                  <p className="text-3xl">
                    ⚠️
                  </p>

                  <p className="mt-3 text-sm text-[#777c73]">
                    注意事項はまだありません。
                  </p>
                </div>
              )}

            {/* 注意事項一覧 */}
            {!isLoading &&
              cautions.map((caution) => (
                <div
                  key={caution.id}
                  className="rounded-2xl bg-[#f7f5ef] p-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">
                      ⚠️
                    </span>

                    <div>
                      <p className="font-bold text-[#3f453c]">
                        {caution.title}
                      </p>

                      <p className="mt-1 text-[15px] font-medium leading-7 text-[#4f564a]">
                        {caution.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}