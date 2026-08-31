"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { saveCurrentEventId } from "@/lib/currentEvent";

type JoinedEvent = {
  id: number;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
};

export default function HistoryPage() {
  const router = useRouter();

  const [events, setEvents] = useState<JoinedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      // ログイン中のユーザーを取得
const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  setErrorMessage(
    "過去のしおりを見るにはログインしてください。"
  );
  setIsLoading(false);
  return;
}

      // このユーザーが参加したイベントIDを取得
      const {
  data: memberData,
  error: memberError,
} = await supabase
  .from("event_members")
  .select("event_id")
  .eq("user_id", user.id);

      if (memberError) {
        console.log(
          "参加イベント取得エラー:",
          memberError.message
        );

        setErrorMessage(
          "参加した合宿を読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      const eventIds = (memberData ?? []).map(
        (member) => member.event_id
      );

      if (eventIds.length === 0) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      // 参加したイベント情報を取得
      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from("events")
        .select(
          "id, title, location, start_date, end_date"
        )
        .in("id", eventIds)
        .order("start_date", {
          ascending: false,
        });

      if (eventError) {
        console.log(
          "イベント情報取得エラー:",
          eventError.message
        );

        setErrorMessage(
          "合宿情報を読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      // 終了済みだけ表示
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const finishedEvents = (
        eventData ?? []
      ).filter((event) => {
        const endDate = new Date(
          `${event.end_date}T00:00:00`
        );

        return today > endDate;
      });

      setEvents(finishedEvents);
      setIsLoading(false);
    }

    fetchHistory();
  }, []);

  function openEvent(eventId: number) {
    saveCurrentEventId(eventId);

    router.push("/event");
  }

  function formatDate(dateString: string) {
    return new Date(
      `${dateString}T00:00:00`
    ).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 pb-12 pt-8 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← トップへ戻る
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            HISTORY
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            過去のしおり
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            参加した合宿の思い出を振り返れます。
          </p>
        </div>

        {isLoading && (
          <p className="mt-10 text-center text-sm text-[#777c73]">
            過去のしおりを読み込んでいます…
          </p>
        )}

        {errorMessage && (
          <p className="mt-7 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        {!isLoading &&
          !errorMessage &&
          events.length === 0 && (
            <div className="mt-8 rounded-[28px] bg-white p-8 text-center shadow-sm">
              <p className="text-4xl">
                📖
              </p>

              <h2 className="mt-4 text-lg font-bold">
                まだ過去のしおりはありません
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#777c73]">
                終了した合宿がここに表示されます。
              </p>
            </div>
          )}

        <div className="mt-8 space-y-4">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() =>
                openEvent(event.id)
              }
              className="w-full rounded-[28px] bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.06)] transition active:scale-[0.98]"
            >
              <p className="text-xs font-bold tracking-[0.12em] text-[#7b8475]">
                {formatDate(event.start_date)}
                {" － "}
                {formatDate(event.end_date)}
              </p>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#394536]">
                    {event.title}
                  </h2>

                  {event.location && (
                    <p className="mt-2 text-sm text-[#777c73]">
                      📍 {event.location}
                    </p>
                  )}

                  <span className="mt-3 inline-block rounded-full bg-[#eef2e9] px-3 py-1 text-xs font-bold text-[#5d6b56]">
                    終了済み
                  </span>
                </div>

                <span className="mt-2 text-2xl text-[#a1a69d]">
                  ›
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}