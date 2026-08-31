"use client";

import { useEffect, useMemo, useState } from "react";
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




function formatTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scheduleTimeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function postTimeToMinutes(createdAt: string) {
  const date = new Date(createdAt);

  return date.getHours() * 60 + date.getMinutes();
}
function getPostDayNumber(
  createdAt: string,
  startDate: string
) {
  const postDate = new Date(createdAt);

  // 投稿した日の0:00
  postDate.setHours(0, 0, 0, 0);

  // 合宿開始日の0:00
  const eventStartDate = new Date(
    `${startDate}T00:00:00`
  );

  const diff =
    postDate.getTime() -
    eventStartDate.getTime();

  return (
    Math.floor(
      diff / (1000 * 60 * 60 * 24)
    ) + 1
  );
}

export default function TimelinePage() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);
  const [event, setEvent] =useState<Event | null>(null);

 // 現在のイベントIDを取得
useEffect(() => {
  const savedEventId = getCurrentEventId();

  if (savedEventId) {
    setCurrentEventId(savedEventId);
  }
}, []);
// 現在のイベント情報を取得
useEffect(() => {
  if (!currentEventId) return;

  async function fetchEvent() {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, start_date, end_date"
      )
      .eq("id", currentEventId)
      .maybeSingle();

    if (error) {
      console.log(
        "イベント取得エラー:",
        error.message
      );
      return;
    }
if (!data) {
  return;
}

const currentEvent = data as Event;

setEvent(currentEvent);
    const today = new Date();
today.setHours(0, 0, 0, 0);

const startDate = new Date(
  `${currentEvent.start_date}T00:00:00`
);

const diff =
  today.getTime() -
  startDate.getTime();

let dayNumber =
  Math.floor(
    diff / (1000 * 60 * 60 * 24)
  ) + 1;

if (dayNumber < 1) {
  dayNumber = 1;
}

const totalDays =
  Math.floor(
    (
      new Date(
  `${currentEvent.end_date}T00:00:00`
).getTime() -
      startDate.getTime()
    ) /
      (1000 * 60 * 60 * 24)
  ) + 1;

if (dayNumber > totalDays) {
  dayNumber = totalDays;
}

setSelectedDay(dayNumber);
  }

  fetchEvent();
}, [currentEventId]);

// 投稿を取得
useEffect(() => {
  if (!currentEventId) return;

  async function fetchPosts() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("event_id", currentEventId);

    if (error) {
      console.log(
        "タイムライン投稿取得エラー:",
        error.message
      );

      setErrorMessage(
        `投稿の読み込みに失敗しました：${error.message}`
      );

      setIsLoading(false);
      return;
    }

    const loadedPosts = (data ?? []) as Post[];

    loadedPosts.sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    setPosts(loadedPosts);
    setIsLoading(false);
  }

  fetchPosts();
}, [currentEventId]);

// 予定を取得
useEffect(() => {
  if (!currentEventId) return;

  async function fetchSchedules() {
    const { data, error } = await supabase
      .from("schedules")
      .select(
        "id, day_number, time, title, description"
      )
      .eq("event_id", currentEventId)
.order("day_number", { ascending: true })
.order("time", { ascending: true });

    if (error) {
      console.log(
        "予定取得エラー:",
        error.message
      );
      return;
    }

    setSchedules(data ?? []);
  }

  fetchSchedules();
}, [currentEventId]);

  const selectedDaySchedules = useMemo(() => {
  return schedules.filter(
    (schedule) =>
      schedule.day_number === selectedDay
  );
}, [schedules, selectedDay]);
const postsBySchedule = useMemo(() => {
  const groups: Post[][] =
  selectedDaySchedules.map(() => []);

  // 予定がまだ読み込まれていない場合
  if (selectedDaySchedules.length === 0) {
    return groups;
  }

  posts.forEach((post) => {
    const postDayNumber = event
  ? getPostDayNumber(
      post.created_at,
      event.start_date
    )
  : 1;

if (postDayNumber !== selectedDay) {
  return;
}
    const postMinutes =
      postTimeToMinutes(post.created_at);

    let scheduleIndex = 0;

    for (
      let index = selectedDaySchedules.length - 1;
      index >= 0;
      index--
    ) {
      const scheduleMinutes =
        scheduleTimeToMinutes(
          selectedDaySchedules[index].time
        );

      if (postMinutes >= scheduleMinutes) {
        scheduleIndex = index;
        break;
      }
    }

    // 念のため存在確認
    if (groups[scheduleIndex]) {
      groups[scheduleIndex].push(post);
    }
  });
  

  return groups;
}, [
  posts,
  selectedDaySchedules,
  selectedDay,
  event,
]);
function getSelectedDayDate() {
  if (!event) return "";

  const date = new Date(
    `${event.start_date}T00:00:00`
  );

  date.setDate(
    date.getDate() + selectedDay - 1
  );

  return date.toLocaleDateString(
    "ja-JP",
    {
      month: "long",
      day: "numeric",
    }
  );
}
function getTotalDays() {
  if (!event) return 1;

  const startDate = new Date(
    `${event.start_date}T00:00:00`
  );

  const endDate = new Date(
    `${event.end_date}T00:00:00`
  );

  return (
    Math.floor(
      (endDate.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
}
const selectedDayPostCount = event
  ? posts.filter(
      (post) =>
        getPostDayNumber(
          post.created_at,
          event.start_date
        ) === selectedDay
    ).length
  : 0;
const totalDays = getTotalDays();
const isEventFinished = (() => {
  if (!event) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(
    `${event.end_date}T00:00:00`
  );

  return today > endDate;
})();
  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-28 text-[#252720]">
      <header className="bg-[#394536] px-5 pb-6 pt-10 text-white">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-bold tracking-[0.16em] text-white/60">
  {event?.title ?? "CAMPBOOK"}
</p>

          <h1 className="mt-1 text-2xl font-bold">
            旅のタイムライン
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 py-6">
        <section className="rounded-[26px] bg-[#394536] p-5 text-white shadow-[0_16px_40px_rgba(57,69,54,0.18)]">
          <p className="text-xs font-bold tracking-[0.14em] text-white/60">
            DAY {selectedDay}
          </p>

          <div className="mt-2 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {getSelectedDayDate()}
              </h2>

              <p className="mt-1 text-sm text-white/70">
  {selectedDay === 1
    ? "出発の日"
    : selectedDay === totalDays
      ? "最終日"
      : `${selectedDay}日目`}
</p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-2 text-right">
              <p className="text-xs text-white/60">
                投稿
              </p>

              <p className="font-bold">
  {selectedDayPostCount}件
</p>
            </div>
          </div>
        </section>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
  {Array.from(
    { length: totalDays },
    (_, index) => index + 1
  ).map((day) => (
    <button
      key={day}
      type="button"
      onClick={() => setSelectedDay(day)}
      className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition ${
        selectedDay === day
          ? "bg-[#394536] text-white"
          : "bg-white text-[#687562]"
      }`}
    >
      DAY {day}
    </button>
  ))}
</div>
        <section className="relative mt-8">
          <div className="absolute bottom-4 left-[19px] top-4 w-px bg-[#cfd4ca]" />

          <div className="space-y-5">
            {isLoading && (
              <div className="ml-14 rounded-2xl bg-white p-5 text-sm text-gray-500">
                投稿を読み込んでいます…
              </div>
            )}

            {errorMessage && (
              <div className="ml-14 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
                {errorMessage}
              </div>
            )}

            {!isLoading &&
              selectedDaySchedules.map(
                (schedule, scheduleIndex) => (
                  <div
                    key={`${schedule.time}-${schedule.title}`}
                    className="space-y-5"
                  >
                    <ScheduleCard
                      time={schedule.time}
                      title={schedule.title}
                      description={schedule.description ?? ""}
                    />

                    {postsBySchedule[
                      scheduleIndex
                    ].map((post) => (
                      <PostCard
                    
  key={post.id}
  postId={post.id}
  postUserId={post.user_id}
  user={post.user_name}
  time={formatTime(post.created_at)}
  comment={post.comment}
  emoji="📷"
  image={post.image_url ?? ""}
/>
                    ))}
                  </div>
                )
              )}

{!isLoading &&
  selectedDaySchedules.length === 0 &&
  posts.some(
    (post) =>
      event &&
      getPostDayNumber(
        post.created_at,
        event.start_date
      ) === selectedDay
  ) && (
    <div className="space-y-5">
      {posts
        .filter(
          (post) =>
            event &&
            getPostDayNumber(
              post.created_at,
              event.start_date
            ) === selectedDay
        )
        .map((post) => (
          <PostCard
  key={post.id}
  postId={post.id}
  postUserId={post.user_id}
  user={post.user_name}
  time={formatTime(post.created_at)}
  comment={post.comment}
  emoji="📷"
  image={post.image_url ?? ""}
/>
        ))}
    </div>
  )}
            {!isLoading &&
              !errorMessage &&
              posts.length === 0 && (
                <div className="ml-14 rounded-2xl bg-white p-5 text-sm text-gray-500">
                  まだ投稿がありません。最初の思い出を残してみよう！
                </div>
              )}
          </div>
        </section>
      </div>

      {!isEventFinished && (
  <Link
    href="/post"
    className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#5d6b56] text-3xl text-white shadow-lg transition hover:scale-105"
    aria-label="新しい投稿"
  >
    ＋
  </Link>
)}

      <BottomNav current="timeline" />
    </main>
  );
}