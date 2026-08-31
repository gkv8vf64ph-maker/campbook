"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveCurrentEventId } from "@/lib/currentEvent";

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCreateEvent() {
    const trimmedTitle = title.trim();
    const trimmedLocation = location.trim();
    const normalizedJoinCode = joinCode.trim().toUpperCase();

    if (!trimmedTitle) {
      setErrorMessage("合宿名を入力してください。");
      return;
    }

    if (!startDate) {
      setErrorMessage("開始日を入力してください。");
      return;
    }

    if (!endDate) {
      setErrorMessage("終了日を入力してください。");
      return;
    }

    if (endDate < startDate) {
      setErrorMessage(
        "終了日は開始日以降にしてください。"
      );
      return;
    }

    if (!normalizedJoinCode) {
      setErrorMessage(
        "参加コードを入力してください。"
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    // 同じ参加コードがないか確認
    const {
      data: existingEvent,
      error: codeCheckError,
    } = await supabase
      .from("events")
      .select("id")
      .ilike(
        "join_code",
        normalizedJoinCode
      )
      .maybeSingle();

    if (codeCheckError) {
      console.log(
        "参加コード確認エラー:",
        codeCheckError.message
      );

      setErrorMessage(
        "参加コードを確認できませんでした。"
      );

      setIsSaving(false);
      return;
    }

    if (existingEvent) {
      setErrorMessage(
        "その参加コードはすでに使われています。"
      );

      setIsSaving(false);
      return;
    }

    // 新しいイベントを作成
    const { data, error } = await supabase
      .from("events")
      .insert({
        title: trimmedTitle,
        location:
          trimmedLocation || null,
        start_date: startDate,
        end_date: endDate,
        join_code:
          normalizedJoinCode,

        show_timeline: true,
        show_checklist: true,
        show_room: true,
        show_meeting_place: true,
        show_caution: true,
        show_members: true,
        show_news: true,
      })
      .select("id")
      .single();

    if (error) {
      console.log(
        "イベント作成エラー:",
        error.message
      );

      setErrorMessage(
        `合宿を作成できませんでした：${error.message}`
      );

      setIsSaving(false);
      return;
    }

    // 作ったイベントを現在のイベントにする
    saveCurrentEventId(data.id);

    router.push("/admin");
    router.refresh();
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
            ADMIN / NEW CAMP
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            新しい合宿を作る
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            合宿の基本情報と参加コードを設定します。
          </p>
        </div>

        <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <div>
            <label className="text-sm font-bold">
              合宿名
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(
                  event.target.value
                );
                setErrorMessage("");
              }}
              placeholder="例：夏合宿2026"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-bold">
              場所
            </label>

            <input
              type="text"
              value={location}
              onChange={(event) => {
                setLocation(
                  event.target.value
                );
                setErrorMessage("");
              }}
              placeholder="例：長野県・白馬"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold">
                開始日
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(
                    event.target.value
                  );
                  setErrorMessage("");
                }}
                className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-3 py-3 outline-none focus:border-[#5d6b56]"
              />
            </div>

            <div>
              <label className="text-sm font-bold">
                終了日
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(
                    event.target.value
                  );
                  setErrorMessage("");
                }}
                className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-3 py-3 outline-none focus:border-[#5d6b56]"
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-bold">
              参加コード
            </label>

            <input
              type="text"
              value={joinCode}
              onChange={(event) => {
                setJoinCode(
                  event.target.value.toUpperCase()
                );
                setErrorMessage("");
              }}
              placeholder="例：SUMMER2026"
              maxLength={20}
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 font-bold uppercase tracking-[0.12em] outline-none focus:border-[#5d6b56]"
            />

            <p className="mt-2 text-xs leading-5 text-[#92958e]">
              このコードを参加者に共有します。
            </p>
          </div>

          {errorMessage && (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleCreateEvent}
            disabled={isSaving}
            className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            {isSaving
              ? "合宿を作成しています…"
              : "＋ 合宿を作成"}
          </button>
        </section>
      </div>
    </main>
  );
}