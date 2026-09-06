"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type ChecklistItem = {
  id: number;
  event_id: number;
  name: string;
  sort_order: number;
};

export default function ChecklistPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // 現在のイベントIDとログインユーザーを取得
  useEffect(() => {
    async function initialize() {
      const savedEventId = getCurrentEventId();

      if (!savedEventId) {
        setIsLoading(false);
        setErrorMessage(
          "参加中のイベントが見つかりません。"
        );
        return;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setIsLoading(false);
        setErrorMessage(
          "ログイン情報を確認できませんでした。"
        );
        return;
      }

      setCurrentEventId(savedEventId);
      setCurrentUserId(user.id);
    }

    initialize();
  }, []);

  // Supabaseから持ち物一覧を取得
  useEffect(() => {
    if (!currentEventId) return;

    async function fetchItems() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("checklist_items")
        .select(
          "id, event_id, name, sort_order"
        )
        .eq("event_id", currentEventId)
        .order("sort_order", {
          ascending: true,
        });

      if (error) {
        console.log(
          "持ち物取得エラー:",
          error.message
        );

        setErrorMessage(
          "持ち物を読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      setItems(data ?? []);
      setIsLoading(false);
    }

    fetchItems();
  }, [currentEventId]);

  // ユーザー・イベントごとのチェック状態を読み込む
  useEffect(() => {
    if (!currentEventId || !currentUserId) return;

    const storageKey =
      `campbook-checklist-${currentEventId}-${currentUserId}`;

    const savedData =
      localStorage.getItem(storageKey);

    if (!savedData) {
      setCheckedIds([]);
      return;
    }

    try {
      const parsedData = JSON.parse(savedData);

      if (Array.isArray(parsedData)) {
        setCheckedIds(
          parsedData.filter(
            (value): value is number =>
              typeof value === "number"
          )
        );
      }
    } catch {
      localStorage.removeItem(storageKey);
      setCheckedIds([]);
    }
  }, [currentEventId, currentUserId]);

  function toggle(itemId: number) {
    if (!currentEventId || !currentUserId) return;

    setCheckedIds((current) => {
      const nextCheckedIds = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];

      const storageKey =
        `campbook-checklist-${currentEventId}-${currentUserId}`;

      localStorage.setItem(
        storageKey,
        JSON.stringify(nextCheckedIds)
      );

      return nextCheckedIds;
    });
  }

  function resetChecklist() {
    if (!currentEventId || !currentUserId) return;

    const shouldReset = window.confirm(
      "チェックをすべて外しますか？"
    );

    if (!shouldReset) return;

    setCheckedIds([]);

    const storageKey =
      `campbook-checklist-${currentEventId}-${currentUserId}`;

    localStorage.setItem(
      storageKey,
      JSON.stringify([])
    );
  }

  const completedCount = useMemo(() => {
    return items.filter((item) =>
      checkedIds.includes(item.id)
    ).length;
  }, [items, checkedIds]);

  const progress =
    items.length === 0
      ? 0
      : Math.round(
          (completedCount / items.length) * 100
        );

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-6 pb-12 pt-8 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/event"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← ホームへ戻る
        </Link>

        <section className="mt-7 rounded-[28px] bg-[#394536] p-6 text-white shadow-[0_16px_40px_rgba(57,69,54,0.18)]">
          <h1 className="text-3xl font-bold">
            持ち物チェック
          </h1>

          <p className="mt-2 text-sm text-white/70">
            忘れ物がないように確認しよう。
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span>
                {completedCount} / {items.length} 完了
              </span>

              <span className="font-bold">
                {progress}%
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </section>

        {isLoading && (
          <p className="mt-7 text-center text-sm text-[#777c73]">
            読み込み中…
          </p>
        )}

        {errorMessage && (
          <p className="mt-7 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        {!isLoading &&
          !errorMessage &&
          items.length === 0 && (
            <div className="mt-7 rounded-3xl bg-white p-8 text-center">
              <p className="text-4xl">
                🎒
              </p>

              <p className="mt-3 font-bold">
                持ち物はまだありません
              </p>

              <p className="mt-2 text-sm text-[#777c73]">
                持ち物が追加されると、ここに表示されます。
              </p>
            </div>
          )}

        <section className="mt-7 space-y-3">
          {items.map((item) => {
            const isChecked =
              checkedIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition active:scale-[0.99] ${
                  isChecked
                    ? "border-[#5d6b56] bg-[#5d6b56] text-white"
                    : "border-white bg-white"
                }`}
              >
                <span
                  className={`font-semibold ${
                    isChecked
                      ? "line-through opacity-80"
                      : ""
                  }`}
                >
                  {item.name}
                </span>

                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    isChecked
                      ? "border-white bg-white text-[#5d6b56]"
                      : "border-[#aeb5a8] bg-white text-[#95998f]"
                  }`}
                >
                  {isChecked ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </section>

        {items.length > 0 && (
          <button
            type="button"
            onClick={resetChecklist}
            className="mt-6 w-full rounded-2xl border border-[#d8d9d3] bg-white/50 py-4 text-sm font-semibold text-[#73776f] transition hover:bg-white"
          >
            チェックをリセット
          </button>
        )}

        {items.length > 0 &&
          completedCount === items.length && (
            <div className="mt-6 rounded-2xl bg-[#e4ebdf] p-5 text-center">
              <p className="text-2xl">
                🎉
              </p>

              <p className="mt-2 font-bold text-[#46543f]">
                準備完了！
              </p>

              <p className="mt-1 text-sm text-[#6f786a]">
                忘れ物がないか、出発前にもう一度確認しよう。
              </p>
            </div>
          )}
      </div>
    </main>
  );
}