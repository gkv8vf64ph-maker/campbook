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

export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<JoinedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: memberships, error: membershipError } =
        await supabase
          .from("event_members")
          .select("event_id")
          .eq("user_id", user.id);

      if (membershipError) {
        console.error(membershipError);
        setErrorMessage(
          "参加しているしおりを読み込めませんでした。"
        );
        setIsLoading(false);
        return;
      }

      const eventIds = [
        ...new Set(
          (memberships ?? []).map(
            (membership) => membership.event_id
          )
        ),
      ];

      if (eventIds.length === 0) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const { data: eventData, error: eventError } =
        await supabase
          .from("events")
          .select(
            "id, title, location, start_date, end_date"
          )
          .in("id", eventIds)
          .order("start_date", {
            ascending: false,
          });

      if (eventError) {
        console.error(eventError);
        setErrorMessage(
          "しおりの情報を読み込めませんでした。"
        );
        setIsLoading(false);
        return;
      }

      setEvents(eventData ?? []);
      setIsLoading(false);
    }

    fetchEvents();
  }, [router]);

  function openEvent(eventId: number) {
    saveCurrentEventId(eventId);
    router.push("/event");
  }

  function formatDate(dateString: string) {
    return new Date(
      `${dateString}T00:00:00`
    ).toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 pb-12 pt-14 text-[#252720]">
      <div className="mx-auto w-full max-w-md">

        <Link
          href="/"
          className="text-sm font-bold text-[#66715f]"
        >
          ← 戻る
        </Link>

        <div className="mt-12">
          <h1 className="text-4xl font-bold tracking-[-0.04em]">
            あなたのしおり
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#777c73]">
            参加している旅行を選んでください。
          </p>
        </div>

        {isLoading ? (
          <div className="mt-12 text-center text-sm font-semibold text-[#777c73]">
            読み込み中…
          </div>
        ) : errorMessage ? (
          <div className="mt-10 rounded-3xl bg-white p-6 text-sm text-red-500 shadow-sm">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mt-10 space-y-3">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEvent(event.id)}
                  className="w-full rounded-[28px] bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.07)] transition active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold">
                        {event.title}
                      </h2>

                      <p className="mt-2 text-sm text-[#777c73]">
                        {formatDate(event.start_date)}
                        {" — "}
                        {formatDate(event.end_date)}
                      </p>

                      {event.location && (
                        <p className="mt-2 truncate text-sm text-[#777c73]">
                          📍 {event.location}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-2xl text-[#8b9187]">
                      ›
                    </span>
                  </div>
                </button>
              ))}

              {events.length === 0 && (
                <div className="rounded-[28px] bg-white p-6 text-center shadow-sm">
                  <p className="text-3xl">
                    🏕️
                  </p>

                  <p className="mt-3 font-bold">
                    参加中のしおりはありません
                  </p>
                </div>
              )}
            </div>

            <Link
              href="/"
              className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl border border-[#394536]/20 bg-white font-bold text-[#394536]"
            >
              ＋ 新しいしおりに参加
            </Link>
          </>
        )}
      </div>
    </main>
  );
}