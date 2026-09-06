"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import ScheduleCard from "@/components/ScheduleCard";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type Post = {
  id: number;
  created_at: string;
  user_id: string | null;
  user_name: string;
  comment: string;
  image_url: string | null;
  event_id: number;
};

type Schedule = {
  id: number;
  day_number: number;
  time: string;
  title: string;
  description: string | null;
};

type Event = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
};

const DAY_MS =
  24 * 60 * 60 * 1000;

function getTokyoDateKey(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) => part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) => part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function dateKeyToUtc(
  dateKey: string
) {
  const [year, month, day] =
    dateKey.split("-").map(Number);

  return Date.UTC(
    year,
    month - 1,
    day
  );
}

function getDayDifference(
  dateKey: string,
  startDate: string
) {
  return Math.floor(
    (
      dateKeyToUtc(dateKey) -
      dateKeyToUtc(startDate)
    ) /
      DAY_MS
  );
}

function getPostDayNumber(
  createdAt: string,
  startDate: string
) {
  const postDateKey =
    getTokyoDateKey(
      new Date(createdAt)
    );

  return (
    getDayDifference(
      postDateKey,
      startDate
    ) + 1
  );
}

function formatTime(
  createdAt: string
) {
  return new Date(
    createdAt
  ).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

function scheduleTimeToMinutes(
  time: string
) {
  const [hour, minute] =
    time.split(":").map(Number);

  return hour * 60 + minute;
}

function postTimeToMinutes(
  createdAt: string
) {
  const timeParts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(
      new Date(createdAt)
    );

  const hour =
    Number(
      timeParts.find(
        (part) =>
          part.type === "hour"
      )?.value ?? 0
    );

  const minute =
    Number(
      timeParts.find(
        (part) =>
          part.type === "minute"
      )?.value ?? 0
    );

  return hour * 60 + minute;
}

export default function TimelinePage() {
  const [
    currentEventId,
    setCurrentEventId,
  ] = useState<number | null>(
    null
  );

  const [event, setEvent] =
    useState<Event | null>(null);

  const [
    selectedDay,
    setSelectedDay,
  ] = useState(1);

  const [schedules, setSchedules] =
    useState<Schedule[]>([]);

  const [posts, setPosts] =
    useState<Post[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  // 現在のイベントIDを取得
  useEffect(() => {
    const savedEventId =
      getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(
        savedEventId
      );
    } else {
      setErrorMessage(
        "参加中のイベントが見つかりません。"
      );

      setIsLoading(false);
    }
  }, []);

  // イベント情報を取得
  useEffect(() => {
    if (!currentEventId) return;

    async function fetchEvent() {
      const { data, error } =
        await supabase
          .from("events")
          .select(
            "id, title, start_date, end_date"
          )
          .eq(
            "id",
            currentEventId
          )
          .maybeSingle();

      if (error) {
        console.log(
          "イベント取得エラー:",
          error.message
        );

        setErrorMessage(
          "イベント情報を読み込めませんでした。"
        );

        return;
      }

      if (!data) {
        setErrorMessage(
          "イベントが見つかりませんでした。"
        );
        return;
      }

      const currentEvent =
        data as Event;

      setEvent(currentEvent);

      const todayKey =
        getTokyoDateKey(
          new Date()
        );

      let dayNumber =
        getDayDifference(
          todayKey,
          currentEvent.start_date
        ) + 1;

      const totalDays =
        getDayDifference(
          currentEvent.end_date,
          currentEvent.start_date
        ) + 1;

      if (dayNumber < 1) {
        dayNumber = 1;
      }

      if (dayNumber > totalDays) {
        dayNumber = totalDays;
      }

      setSelectedDay(
        dayNumber
      );
    }

    fetchEvent();
  }, [currentEventId]);

  // 投稿を取得
  useEffect(() => {
    if (!currentEventId) return;

    async function fetchPosts() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } =
        await supabase
          .from("posts")
          .select(
            "id, created_at, user_id, user_name, comment, image_url, event_id"
          )
          .eq(
            "event_id",
            currentEventId
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (error) {
        console.log(
          "タイムライン投稿取得エラー:",
          error.message
        );

        setErrorMessage(
          "投稿を読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      setPosts(
        (data ?? []) as Post[]
      );

      setIsLoading(false);
    }

    fetchPosts();
  }, [currentEventId]);

  // 予定を取得
  useEffect(() => {
    if (!currentEventId) return;

    async function fetchSchedules() {
      const { data, error } =
        await supabase
          .from("schedules")
          .select(
            "id, day_number, time, title, description"
          )
          .eq(
            "event_id",
            currentEventId
          )
          .order(
            "day_number",
            {
              ascending: true,
            }
          )
          .order("time", {
            ascending: true,
          });

      if (error) {
        console.log(
          "予定取得エラー:",
          error.message
        );

        setErrorMessage(
          "予定を読み込めませんでした。"
        );

        return;
      }

      setSchedules(
        (data ?? []) as Schedule[]
      );
    }

    fetchSchedules();
  }, [currentEventId]);

  const totalDays =
    useMemo(() => {
      if (!event) return 1;

      return (
        getDayDifference(
          event.end_date,
          event.start_date
        ) + 1
      );
    }, [event]);

  const selectedDaySchedules =
    useMemo(() => {
      return schedules.filter(
        (schedule) =>
          schedule.day_number ===
          selectedDay
      );
    }, [
      schedules,
      selectedDay,
    ]);

  const selectedDayPosts =
    useMemo(() => {
      if (!event) return [];

      return posts.filter(
        (post) =>
          getPostDayNumber(
            post.created_at,
            event.start_date
          ) === selectedDay
      );
    }, [
      posts,
      event,
      selectedDay,
    ]);

  const postsBySchedule =
    useMemo(() => {
      const groups: Post[][] =
        selectedDaySchedules.map(
          () => []
        );

      if (
        selectedDaySchedules.length ===
        0
      ) {
        return groups;
      }

      selectedDayPosts.forEach(
        (post) => {
          const postMinutes =
            postTimeToMinutes(
              post.created_at
            );

          let scheduleIndex = 0;

          for (
            let index =
              selectedDaySchedules.length -
              1;
            index >= 0;
            index--
          ) {
            const scheduleMinutes =
              scheduleTimeToMinutes(
                selectedDaySchedules[
                  index
                ].time
              );

            if (
              postMinutes >=
              scheduleMinutes
            ) {
              scheduleIndex =
                index;
              break;
            }
          }

          groups[
            scheduleIndex
          ]?.push(post);
        }
      );

      return groups;
    }, [
      selectedDayPosts,
      selectedDaySchedules,
    ]);

  function getSelectedDayDate() {
    if (!event) return "";

    const startUtc =
      dateKeyToUtc(
        event.start_date
      );

    const selectedUtc =
      startUtc +
      (selectedDay - 1) *
        DAY_MS;

    return new Date(
      selectedUtc
    ).toLocaleDateString(
      "ja-JP",
      {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }
    );
  }

  const isEventFinished =
    useMemo(() => {
      if (!event) return false;

      const todayKey =
        getTokyoDateKey(
          new Date()
        );

      return (
        dateKeyToUtc(todayKey) >
        dateKeyToUtc(
          event.end_date
        )
      );
    }, [event]);

  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-28 text-[#252720]">
      <header className="bg-[#394536] px-5 pb-6 pt-10 text-white">
        <div className="mx-auto max-w-md">
          {event?.title && (
            <p className="text-xs font-bold tracking-[0.12em] text-white/60">
              {event.title}
            </p>
          )}

          <h1 className="mt-1 text-2xl font-bold">
            タイムライン
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 py-6">
        <section className="rounded-[26px] bg-[#394536] p-5 text-white shadow-[0_16px_40px_rgba(57,69,54,0.18)]">
          <p className="text-xs font-bold tracking-[0.14em] text-white/60">
            DAY {selectedDay}
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {getSelectedDayDate()}
              </h2>

              <p className="mt-1 text-sm text-white/70">
                {totalDays === 1
                  ? "旅行の日"
                  : selectedDay === 1
                    ? "出発の日"
                    : selectedDay ===
                        totalDays
                      ? "最終日"
                      : `${selectedDay}日目`}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-white/10 px-4 py-2 text-right">
              <p className="text-xs text-white/60">
                投稿
              </p>

              <p className="font-bold">
                {
                  selectedDayPosts.length
                }
                件
              </p>
            </div>
          </div>
        </section>

        {totalDays > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {Array.from(
              {
                length:
                  totalDays,
              },
              (_, index) =>
                index + 1
            ).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setSelectedDay(
                    day
                  )
                }
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                  selectedDay ===
                  day
                    ? "bg-[#394536] text-white"
                    : "bg-white text-[#687562]"
                }`}
              >
                DAY {day}
              </button>
            ))}
          </div>
        )}

        <section className="relative mt-8">
          {(selectedDaySchedules.length >
            0 ||
            selectedDayPosts.length >
              0) && (
            <div className="absolute bottom-4 left-[19px] top-4 w-px bg-[#cfd4ca]" />
          )}

          <div className="space-y-5">
            {isLoading && (
              <div className="rounded-2xl bg-white p-5 text-center text-sm text-[#777c73]">
                読み込み中…
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
                {errorMessage}
              </div>
            )}

            {!isLoading &&
              !errorMessage &&
              selectedDaySchedules.map(
                (
                  schedule,
                  scheduleIndex
                ) => (
                  <div
                    key={
                      schedule.id
                    }
                    className="space-y-5"
                  >
                    <ScheduleCard
                      time={
                        schedule.time
                      }
                      title={
                        schedule.title
                      }
                      description={
                        schedule.description ??
                        ""
                      }
                    />

                    {postsBySchedule[
                      scheduleIndex
                    ].map(
                      (post) => (
                        <PostCard
                          key={
                            post.id
                          }
                          postId={
                            post.id
                          }
                          postUserId={
                            post.user_id
                          }
                          user={
                            post.user_name
                          }
                          time={formatTime(
                            post.created_at
                          )}
                          comment={
                            post.comment
                          }
                          emoji="📷"
                          image={
                            post.image_url ??
                            ""
                          }
                        />
                      )
                    )}
                  </div>
                )
              )}

            {!isLoading &&
              !errorMessage &&
              selectedDaySchedules.length ===
                0 &&
              selectedDayPosts.map(
                (post) => (
                  <PostCard
                    key={post.id}
                    postId={
                      post.id
                    }
                    postUserId={
                      post.user_id
                    }
                    user={
                      post.user_name
                    }
                    time={formatTime(
                      post.created_at
                    )}
                    comment={
                      post.comment
                    }
                    emoji="📷"
                    image={
                      post.image_url ??
                      ""
                    }
                  />
                )
              )}

            {!isLoading &&
              !errorMessage &&
              selectedDaySchedules.length ===
                0 &&
              selectedDayPosts.length ===
                0 && (
                <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#777c73]">
                  この日の予定や投稿はまだありません。
                </div>
              )}
          </div>
        </section>
      </div>

      {!isEventFinished &&
        currentEventId && (
          <Link
            href="/post"
            className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#5d6b56] text-3xl text-white shadow-lg transition active:scale-95"
            aria-label="新しい投稿"
          >
            ＋
          </Link>
        )}

      <BottomNav current="timeline" />
    </main>
  );
}