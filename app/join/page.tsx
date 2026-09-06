"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
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

function getTodayDateKey() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}

function JoinPageContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const codeFromUrl =
    searchParams
      .get("code")
      ?.trim()
      .toUpperCase() ?? "";

  const [event, setEvent] =
    useState<Event | null>(null);

  const [
    isLoadingEvent,
    setIsLoadingEvent,
  ] = useState(true);

  const [
    isJoining,
    setIsJoining,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  // 参加コードから旅行を取得
  useEffect(() => {
    async function fetchEvent() {
      setIsLoadingEvent(true);
      setErrorMessage("");
      setEvent(null);

      if (!codeFromUrl) {
        setErrorMessage(
          "旅行コードがありません。トップページから参加してください。"
        );

        setIsLoadingEvent(false);
        return;
      }

      const { data, error } =
        await supabase.rpc(
          "get_event_by_join_code",
          {
            input_code: codeFromUrl,
          }
        );

      if (error) {
        console.log(
          "イベント取得エラー:",
          error.message
        );

        setErrorMessage(
          "旅行の情報を読み込めませんでした。"
        );

        setIsLoadingEvent(false);
        return;
      }

      const foundEvent =
        Array.isArray(data)
          ? data[0]
          : null;

      if (!foundEvent) {
        setErrorMessage(
          "旅行が見つかりませんでした。"
        );

        setIsLoadingEvent(false);
        return;
      }

      setEvent(
        foundEvent as Event
      );

      setIsLoadingEvent(false);
    }

    fetchEvent();
  }, [codeFromUrl]);

  async function handleJoin() {
    if (!event || isJoining) {
      return;
    }

    setIsJoining(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // 未ログインなら参加コードを保存してログインへ
    if (userError || !user) {
      localStorage.setItem(
        "campbook-pending-join-code",
        event.join_code
      );

      router.push("/login");
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("user_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      console.log(
        "プロフィール取得エラー:",
        profileError?.message
      );

      setErrorMessage(
        "プロフィールを取得できませんでした。"
      );

      setIsJoining(false);
      return;
    }

    // すでに参加済みか確認
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

    if (existingMember) {
      saveCurrentEventId(
        event.id
      );

      localStorage.removeItem(
        "campbook-pending-join-code"
      );

      router.push("/event");
      return;
    }

    // 終了済みの旅行には新規参加できない
    const today =
      getTodayDateKey();

    if (today > event.end_date) {
      setErrorMessage(
        "この旅行は終了しているため、新しく参加できません。"
      );

      setIsJoining(false);
      return;
    }

    const {
      error: memberInsertError,
    } = await supabase
      .from("event_members")
      .insert({
        event_id: event.id,
        user_id: user.id,
        user_name:
          profile.user_name,
      });

    if (memberInsertError) {
      console.log(
        "参加登録エラー:",
        memberInsertError.message
      );

      setErrorMessage(
        "しおりへの参加に失敗しました。"
      );

      setIsJoining(false);
      return;
    }

    saveCurrentEventId(
      event.id
    );

    localStorage.removeItem(
      "campbook-pending-join-code"
    );

    router.push("/event");
  }

  if (isLoadingEvent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm font-semibold text-[#73776f]">
          読み込み中…
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
          <h1 className="text-3xl font-bold">
            しおりに参加
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#777c73]">
            参加する旅行を確認してください。
          </p>
        </div>

        {event && (
          <section className="mt-7 rounded-[26px] bg-[#394536] p-5 text-white">
            <h2 className="text-2xl font-bold">
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
            <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          {event && (
            <button
              type="button"
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full rounded-2xl bg-[#5d6b56] py-4 font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isJoining
                ? "参加中…"
                : "このしおりに参加する"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
          <p className="text-sm font-semibold text-[#73776f]">
            読み込み中…
          </p>
        </main>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}