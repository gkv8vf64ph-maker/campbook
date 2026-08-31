"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { saveCurrentEventId } from "@/lib/currentEvent";

type Event = {
  id: number;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  join_code: string;
};

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const codeFromUrl =
    searchParams.get("code")?.trim().toUpperCase() ?? "";


  const [event, setEvent] = useState<Event | null>(null);

  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchEvent() {
      if (!codeFromUrl) {
        setErrorMessage(
          "旅行コードがありません。トップページから参加してください。"
        );
        setIsLoadingEvent(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          "id, title, location, start_date, end_date, join_code"
        )
        .ilike("join_code", codeFromUrl)
        .maybeSingle();

      if (error) {
        console.log(
          "イベント取得エラー:",
          error.message
        );

        setErrorMessage(
          "イベントを読み込めませんでした。"
        );

        setIsLoadingEvent(false);
        return;
      }

      if (!data) {
        setErrorMessage(
          "イベントが見つかりませんでした。"
        );

        setIsLoadingEvent(false);
        return;
      }

      setEvent(data as Event);
      setIsLoadingEvent(false);
    }

    fetchEvent();
  }, [codeFromUrl]);

  async function handleJoin() {
  if (!event) {
    setErrorMessage(
      "参加するイベントが見つかりません。"
    );
    return;
  }

  if (isJoining) return;

  setIsJoining(true);
  setErrorMessage("");

  // ① ログイン中のユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setErrorMessage(
      "合宿に参加するにはログインしてください。"
    );
    setIsJoining(false);
    return;
  }

  // ② プロフィールを取得
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("user_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    setErrorMessage(
      "プロフィールを取得できませんでした。"
    );
    setIsJoining(false);
    return;
  }

  // ③ この合宿に参加済みか確認
  const {
    data: existingMember,
    error: memberCheckError,
  } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberCheckError) {
    console.log(
      "参加状況確認エラー:",
      memberCheckError.message
    );

    setErrorMessage(
      "参加状況を確認できませんでした。"
    );

    setIsJoining(false);
    return;
  }

  // ④ すでに参加済みなら、終了後でも入れる
  if (existingMember) {
    localStorage.setItem(
      "campbook-current-user",
      profile.user_name
    );

    saveCurrentEventId(event.id);

    router.push("/event");
    return;
  }

  // ⑤ 未参加の場合だけ、合宿が終了しているか確認
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(
    `${event.end_date}T00:00:00`
  );

  if (today > endDate) {
    setErrorMessage(
      "この合宿は終了しているため、新しく参加することはできません。"
    );

    setIsJoining(false);
    return;
  }

  // ⑥ 開催中 ＋ 未参加なら新規参加
  const { error: memberInsertError } =
    await supabase
      .from("event_members")
      .insert({
        event_id: event.id,
        user_id: user.id,
        user_name: profile.user_name,
      });

  if (memberInsertError) {
    console.log(
      "参加登録エラー:",
      memberInsertError.message
    );

    setErrorMessage(
      "イベントへの参加登録に失敗しました。"
    );

    setIsJoining(false);
    return;
  }

  // ⑦ この端末の表示名を保存
  localStorage.setItem(
    "campbook-current-user",
    profile.user_name
  );

  // ⑧ 現在開いているイベントを保存
  saveCurrentEventId(event.id);

  router.push("/event");
}

  if (isLoadingEvent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm font-semibold text-[#73776f]">
          しおりを確認しています…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#252720]">
      <div className="mx-auto max-w-md px-5 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← 戻る
        </Link>

        <div className="mt-10">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            JOIN CAMP
          </p>

          <h1 className="mt-2 text-3xl font-bold">
  しおりに参加
</h1>

<p className="mt-3 text-sm leading-6 text-[#777c73]">
  この合宿のしおりに参加します。
</p>
        </div>

        {event && (
          <section className="mt-7 rounded-[26px] bg-[#394536] p-5 text-white">
            <p className="text-xs font-bold tracking-[0.14em] text-white/60">
              JOINING
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {event.title}
            </h2>

            {event.location && (
              <p className="mt-2 text-sm text-white/70">
                📍 {event.location}
              </p>
            )}
          </section>
        )}

        <div className="mt-7 rounded-[28px] bg-white p-6 shadow-sm">
          

          {errorMessage && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoining || !event}
            className="mt-6 w-full rounded-2xl bg-[#5d6b56] py-4 font-bold text-white transition hover:bg-[#4d5a47] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isJoining
              ? "参加しています…"
              : "このしおりに参加する"}
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-[#e8ede4] p-4">
          <p className="text-sm leading-6 text-[#687562]">
            この名前は、投稿・コメント・リアクションなどに表示されます。
          </p>
        </div>
      </div>
    </main>
  );
}