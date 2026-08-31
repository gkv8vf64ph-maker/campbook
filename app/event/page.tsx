"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type Event = {
  id: number;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  join_code: string | null;

  show_timeline: boolean;
  show_checklist: boolean;
  show_room: boolean;
  show_meeting_place: boolean;
  show_caution: boolean;
  show_members: boolean;
  show_news: boolean;
};

type Schedule = {
  id: number;
  day_number: number;
  time: string;
  title: string;
  description: string | null;
};


export default function EventHome() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [memberCount, setMemberCount] = useState(0);
    const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // 保存されている現在のイベントIDを取得
  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    } else {
      setIsLoading(false);
      setErrorMessage(
        "参加中のイベントがありません。参加コードを入力してください。"
      );
    }
  }, []);

  // 現在のイベント情報をSupabaseから取得
  // 現在のイベント情報をSupabaseから取得
useEffect(() => {
  if (!currentEventId) return;

  async function fetchEvent() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        location,
        start_date,
        end_date,
        join_code,
        show_timeline,
        show_checklist,
        show_room,
        show_meeting_place,
        show_caution,
        show_members,
        show_news
      `)
      .eq("id", currentEventId)
      .maybeSingle();

    if (error) {
      console.log(
        "イベント取得エラー:",
        error.message
      );

      setErrorMessage(
        "イベント情報を読み込めませんでした。"
      );

      setIsLoading(false);
      return;
    }

    if (!data) {
      setErrorMessage(
        "イベントが見つかりませんでした。"
      );

      setIsLoading(false);
      return;
    }

    setEvent(data);
    setIsLoading(false);
  }

  fetchEvent();
}, [currentEventId]);
  // 参加人数を取得
useEffect(() => {
  if (!currentEventId) return;

  async function fetchMemberCount() {
    const { count, error } = await supabase
      .from("event_members")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("event_id", currentEventId);

    if (error) {
      console.log(
        "参加人数取得エラー:",
        error.message
      );
      return;
    }

    setMemberCount(count ?? 0);
  }

  fetchMemberCount();
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

  function formatEventDate(dateString: string) {
    return new Date(
      `${dateString}T00:00:00`
    ).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function getDepartureText() {
    if (!event) return "";

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const startDate = new Date(
      `${event.start_date}T00:00:00`
    );

    const endDate = new Date(
      `${event.end_date}T00:00:00`
    );

    const diff =
      startDate.getTime() - today.getTime();

    const days = Math.ceil(
      diff / (1000 * 60 * 60 * 24)
    );

    if (today > endDate) {
      return "イベント終了";
    }

    if (days < 0) {
      return "開催中！";
    }

    if (days === 0) {
      return "今日！";
    }

    if (days === 1) {
      return "明日！";
    }

    return `あと${days}日`;
  }
  function getEventStatus() {
  if (!event) return "before";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(
    `${event.start_date}T00:00:00`
  );

  const endDate = new Date(
    `${event.end_date}T00:00:00`
  );

  if (today < startDate) {
    return "before";
  }

  if (today > endDate) {
    return "after";
  }

  return "during";
}

const eventStatus = getEventStatus();
  function getCurrentDayNumber() {
  if (!event) return 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(
    `${event.start_date}T00:00:00`
  );

  const diff =
    today.getTime() - startDate.getTime();

  const dayNumber =
    Math.floor(
      diff / (1000 * 60 * 60 * 24)
    ) + 1;

  if (dayNumber < 1) {
    return 1;
  }

  return dayNumber;
}
const currentDayNumber =
  getCurrentDayNumber();

const currentDaySchedules =
  schedules.filter(
    (schedule) =>
      schedule.day_number ===
      currentDayNumber
  );
  function getNextSchedule() {
  if (schedules.length === 0) {
    return null;
  }

  const currentDayNumber =
    getCurrentDayNumber();

  const todaySchedules =
    schedules.filter(
      (schedule) =>
        schedule.day_number ===
        currentDayNumber
    );

  if (todaySchedules.length === 0) {
    return null;
  }

  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const upcomingSchedule =
    todaySchedules.find(
      (schedule) => {
        const [hour, minute] =
          schedule.time
            .split(":")
            .map(Number);

        const scheduleMinutes =
          hour * 60 + minute;

        return (
          scheduleMinutes >=
          currentMinutes
        );
      }
    );

  return upcomingSchedule ?? null;
}
const nextSchedule =
  getNextSchedule();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm font-semibold text-[#73776f]">
          イベントを読み込んでいます…
        </p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9] px-5">
        <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-sm">
          <p className="text-4xl">
            🏕️
          </p>

          <h1 className="mt-4 text-xl font-bold">
            イベントがありません
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            {errorMessage}
          </p>

          <Link
            href="/join"
            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-[#394536] font-bold text-white"
          >
            参加コードを入力
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-28 text-[#252720]">
      {/* ヘッダー */}
      <section className="relative overflow-hidden rounded-b-[40px] bg-[#394536] px-6 pb-8 pt-12 text-white">
        <div className="absolute -right-16 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

        <div className="absolute -bottom-24 -left-14 h-56 w-56 rounded-full bg-[#849478]/25 blur-3xl" />

        <div className="relative mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <Link
              href="/join"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl backdrop-blur"
              aria-label="イベントを変更"
            >
              ‹
            </Link>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl backdrop-blur"
              aria-label="メニュー"
            >
              ⋯
            </button>
          </div>

          <div className="mt-12">
            {/* 日程 */}
            <p className="text-sm font-medium text-white/65">
              {formatEventDate(
                event.start_date
              )}
              {" — "}
              {formatEventDate(
                event.end_date
              )}
            </p>

            {/* イベント名 */}
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em]">
              {event.title}
            </h1>

            {/* 場所 */}
            {event.location && (
              <div className="mt-5 flex items-center gap-2 text-sm text-white/80">
                <span>📍</span>
                <span>
                  {event.location}
                </span>
              </div>
            )}
          </div>

          <div className="mt-10 flex items-end justify-between">
            {/* 開催までの日数 */}
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-white/55">
  {eventStatus === "after"
    ? "MEMORIES"
    : "DEPARTURE"}
</p>

              <p className="mt-1 text-2xl font-bold">
                {getDepartureText()}
              </p>
            </div>

            {/* 今は人数は仮 */}
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur">
              <p className="text-xs text-white/60">
                参加メンバー
              </p>

              <p className="mt-1 font-semibold">
                {memberCount}人
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-md px-5">
        {/* NEXT SCHEDULE */}
<section className="-mt-1 pt-7">
  <div className="rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(57,69,54,0.10)]">
    {eventStatus === "before" && (
      <>
        <p className="text-xs font-bold tracking-[0.14em] text-[#778271]">
          UPCOMING CAMP
        </p>

        <h2 className="mt-2 text-xl font-bold">
          合宿はまだ始まっていません
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#73776f]">
          出発までに持ち物や集合場所を確認しておこう。
        </p>
      </>
    )}

    {eventStatus === "during" && (
      <>
        <p className="text-xs font-bold tracking-[0.14em] text-[#778271]">
          NEXT SCHEDULE
        </p>

        <h2 className="mt-2 text-xl font-bold">
          次の予定
        </h2>

        {nextSchedule ? (
          <div className="mt-5 rounded-2xl bg-[#f6f5f0] p-4">
            <div className="flex gap-4">
              <p className="text-lg font-bold text-[#4d5c47]">
                {nextSchedule.time}
              </p>

              <div>
                <p className="font-bold">
                  {nextSchedule.title}
                </p>

                {nextSchedule.description && (
                  <p className="mt-1 text-sm leading-6 text-[#73776f]">
                    {nextSchedule.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#73776f]">
            今日の予定はすべて終了しました。
          </p>
        )}
      </>
    )}

    {eventStatus === "after" && (
      <>
        <p className="text-xs font-bold tracking-[0.14em] text-[#778271]">
          CAMP FINISHED
        </p>

        <h2 className="mt-2 text-xl font-bold">
          合宿は終了しました
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#73776f]">
          タイムラインからみんなの思い出を振り返ろう。
        </p>

        {event.show_timeline && (
          <Link
            href="/timeline"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[#394536] font-bold text-white"
          >
            思い出を見る
          </Link>
        )}
      </>
    )}
  </div>
</section>

        {/* INFORMATION */}
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                INFORMATION
              </p>

              <h2 className="mt-1 text-2xl font-bold">
  {eventStatus === "after"
    ? "旅の記録"
    : "旅の準備"}
</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {event.show_checklist && (
              <Link
              href="/checklist"
              className="block rounded-3xl bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.07)] transition active:scale-[0.98]"
              >
                <span className="text-2xl">🎒</span>
                <span className="mt-8 block font-bold">
                  持ち物
                  </span>
                  <span className="mt-1 block text-xs text-[#858980]">
                    忘れ物をチェック
                    </span>
                    </Link>
                  )}

                  {event.show_room &&(
            <Link
              href="/room"
              className="block rounded-3xl bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.07)] transition active:scale-[0.98]"
            >
              <span className="text-2xl">
                🏠
              </span>

              <span className="mt-8 block font-bold">
                部屋割り
              </span>

              <span className="mt-1 block text-xs text-[#858980]">
                メンバーを確認
              </span>
            </Link>
                  )}

                  {event.show_meeting_place && (            <Link
              href="/meeting-place"
              className="block rounded-3xl bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.07)] transition active:scale-[0.98]"
            >
              <span className="text-2xl">
                📍
              </span>

              <span className="mt-8 block font-bold">
                集合場所
              </span>

              <span className="mt-1 block text-xs text-[#858980]">
                地図と詳細
              </span>
            </Link>
            )}

            {event.show_caution &&(

            <Link
              href="/caution"
              className="block rounded-3xl bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.07)] transition active:scale-[0.98]"
            >
              <span className="text-2xl">
                ⚠️
              </span>

              <span className="mt-8 block font-bold">
                注意事項
              </span>

              <span className="mt-1 block text-xs text-[#858980]">
                出発前に確認
              </span>
            </Link>
            )}

            {event.show_news &&(

            <Link
              href="/news"
              className="block rounded-3xl bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.07)] transition active:scale-[0.98]"
            >
              <span className="text-2xl">
                📢
              </span>

              <span className="mt-8 block font-bold">
                お知らせ
              </span>

              <span className="mt-1 block text-xs text-[#858980]">
                最新情報
              </span>
            </Link>
            )}

            {event.show_members &&(

            <Link
              href="/members"
              className="block rounded-3xl bg-white p-5 text-left shadow-[0_10px_30px_rgba(57,69,54,0.07)] transition active:scale-[0.98]"
            >
              <span className="text-2xl">
                👥
              </span>

              <span className="mt-8 block font-bold">
                メンバー
              </span>

              <span className="mt-1 block text-xs text-[#858980]">
                参加者を確認
              </span>
            </Link>
            )}
          </div>
        </section>

        {/* 開催中の予定 */}
        {eventStatus   === "during" &&(
        <section className="mt-9">
          <div className="mb-5">
            <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
  DAY {getCurrentDayNumber()}
</p>

<h2 className="mt-1 text-2xl font-bold">
  {getCurrentDayNumber() === 1
    ? "最初の一日"
    : `${getCurrentDayNumber()}日目の予定`}
</h2>
          </div>

          <div className="relative">
            <div className="absolute bottom-7 left-[19px] top-5 w-px bg-[#cfd4ca]" />

            <div className="space-y-5">
              {currentDaySchedules.map(
  (schedule) => (
                  <div
                    key={`${schedule.time}-${schedule.title}`}
                    className="relative flex gap-4"
                  >
                    <div
                      className={`relative z-10 mt-1 h-10 w-10 shrink-0 rounded-full border-[6px] ${
                        currentDaySchedules[0]?.id === schedule.id
                          ? "border-[#dce5d7] bg-[#52644b]"
                          : "border-[#eeeDE8] bg-white"
                      }`}
                    />

                    <div className="flex-1 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
                      <p className="text-sm font-bold text-[#687562]">
                        {schedule.time}
                      </p>

                      <h3 className="mt-1 font-bold">
                        {schedule.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-[#7c8078]">
                        {schedule.description}
                      </p>
                    </div>
                  </div>
                )
              )}
              {currentDaySchedules.length === 0 && (
  <div className="ml-14 rounded-3xl bg-white p-5 text-sm text-[#777c73] shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
    この日の予定はまだ登録されていません。
  </div>
)}
            </div>
          </div>
        </section>
  )}
      </div>

      <BottomNav current="home" />
    </main>
  );
}