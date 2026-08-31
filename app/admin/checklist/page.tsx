"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type ChecklistItem = {
  id: number;
  event_id: number;
  name: string;
  sort_order: number;
};

export default function AdminChecklistPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [name, setName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 現在のイベントIDを取得
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

  // 持ち物を取得
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

  // 持ち物を追加
  async function handleAddItem() {
    if (!currentEventId) {
      setErrorMessage(
        "イベントが選択されていません。"
      );
      return;
    }

    if (!name.trim()) {
      setErrorMessage(
        "持ち物名を入力してください。"
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    const nextSortOrder =
      items.length > 0
        ? Math.max(
            ...items.map(
              (item) => item.sort_order
            )
          ) + 1
        : 1;

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        event_id: currentEventId,
        name: name.trim(),
        sort_order: nextSortOrder,
      })
      .select(
        "id, event_id, name, sort_order"
      )
      .single();

    if (error) {
      console.log(
        "持ち物追加エラー:",
        error.message
      );

      setErrorMessage(
        "持ち物を追加できませんでした。"
      );

      setIsSaving(false);
      return;
    }

    setItems((current) => [
      ...current,
      data,
    ]);

    setName("");
    setIsSaving(false);
  }

  // 持ち物を削除
  async function handleDeleteItem(
    itemId: number
  ) {
    const shouldDelete = window.confirm(
      "この持ち物を削除しますか？"
    );

    if (!shouldDelete) return;

    const { error } = await supabase
      .from("checklist_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.log(
        "持ち物削除エラー:",
        error.message
      );

      setErrorMessage(
        "持ち物を削除できませんでした。"
      );

      return;
    }

    setItems((current) =>
      current.filter(
        (item) => item.id !== itemId
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
            ADMIN / CHECKLIST
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            持ち物を編集
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            参加者に表示する持ち物を管理できます。
          </p>
        </div>

        <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <p className="text-sm font-bold text-[#394536]">
            新しい持ち物
          </p>

          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrorMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAddItem();
              }
            }}
            placeholder="例：体育館シューズ"
            className="mt-4 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
          />

          {errorMessage && (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleAddItem}
            disabled={isSaving}
            className="mt-5 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white disabled:opacity-60"
          >
            {isSaving
              ? "追加しています…"
              : "＋ 持ち物を追加"}
          </button>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                PACKING LIST
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                登録中の持ち物
              </h2>
            </div>

            <p className="text-sm font-semibold text-[#7b8475]">
              {items.length}個
            </p>
          </div>

          {isLoading && (
            <p className="mt-5 text-center text-sm text-[#777c73]">
              読み込んでいます…
            </p>
          )}

          {!isLoading &&
            items.length === 0 && (
              <div className="mt-5 rounded-3xl bg-white p-6 text-center">
                <p className="text-3xl">
                  🎒
                </p>

                <p className="mt-3 text-sm text-[#777c73]">
                  まだ持ち物はありません。
                </p>
              </div>
            )}

          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(57,69,54,0.05)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    🎒
                  </span>

                  <p className="font-bold text-[#394536]">
                    {item.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleDeleteItem(item.id)
                  }
                  className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </section>

        <Link
          href="/checklist"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-2xl border border-[#d7dbd3] bg-white text-sm font-bold text-[#5d6b56]"
        >
          参加者画面を確認する
        </Link>
      </div>
    </main>
  );
}