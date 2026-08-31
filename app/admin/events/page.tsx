"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCurrentEventId,
  saveCurrentEventId,
} from "@/lib/currentEvent";

type Event = {
  id: number;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  join_code: string | null;
};

export default function AdminEventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [deletingEvent, setDeletingEvent] =
    useState<Event | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  useEffect(() => {
    setCurrentEventId(getCurrentEventId());
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("events")
      .select(
        "id, title, location, start_date, end_date, join_code"
      )
      .order("start_date", {
        ascending: false,
      });

    if (error) {
      console.log(
        "イベント一覧取得エラー:",
        error.message
      );

      setErrorMessage(
        "合宿一覧を読み込めませんでした。"
      );

      setIsLoading(false);
      return;
    }

    setEvents(data ?? []);
    setIsLoading(false);
  }

  function selectEvent(eventId: number) {
    saveCurrentEventId(eventId);

    router.push("/admin");
    router.refresh();
  }

  async function handleDeleteEvent() {
  if (!deletingEvent || isDeleting) {
    return;
  }

  setIsDeleting(true);
  setErrorMessage("");

  const eventId = deletingEvent.id;

  // ① Storageにある、この合宿の写真一覧を取得
  const folderPath = `event-${eventId}`;

  const {
    data: storageFiles,
    error: storageListError,
  } = await supabase.storage
    .from("photo")
    .list(folderPath);

  if (storageListError) {
    console.log(
      "写真一覧取得エラー:",
      storageListError.message
    );

    setErrorMessage(
      `合宿の写真を確認できませんでした：${storageListError.message}`
    );

    setIsDeleting(false);
    return;
  }

  // ② 写真があればStorageから削除
  if (storageFiles && storageFiles.length > 0) {
    const filePaths = storageFiles.map(
      (file) =>
        `${folderPath}/${file.name}`
    );

    const { error: storageDeleteError } =
      await supabase.storage
        .from("photo")
        .remove(filePaths);

    if (storageDeleteError) {
      console.log(
        "写真削除エラー:",
        storageDeleteError.message
      );

      setErrorMessage(
        `合宿の写真を削除できませんでした：${storageDeleteError.message}`
      );

      setIsDeleting(false);
      return;
    }
  }

  // ③ eventsを削除
  // CASCADEによって関連DBデータも削除される
  const { error: eventDeleteError } =
    await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

  if (eventDeleteError) {
    console.log(
      "合宿削除エラー:",
      eventDeleteError.message
    );

    setErrorMessage(
      `合宿を削除できませんでした：${eventDeleteError.message}`
    );

    setIsDeleting(false);
    return;
  }

  // ④ 削除した合宿が現在編集中だった場合
  if (currentEventId === eventId) {
    const remainingEvents =
      events.filter(
        (event) =>
          event.id !== eventId
      );

    if (remainingEvents.length > 0) {
      const nextEventId =
        remainingEvents[0].id;

      saveCurrentEventId(
        nextEventId
      );

      setCurrentEventId(
        nextEventId
      );
    } else {
      localStorage.removeItem(
        "campbook-current-event-id"
      );

      setCurrentEventId(null);
    }
  }

  // ⑤ 一覧から削除
  setEvents((currentEvents) =>
    currentEvents.filter(
      (event) =>
        event.id !== eventId
    )
  );

  setDeletingEvent(null);
  setIsDeleting(false);
}

  function formatDate(
    dateString: string
  ) {
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
          href="/admin"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← 管理画面へ戻る
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            ADMIN / CAMPS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            管理する合宿
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            編集したい合宿を選択してください。
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="mt-7 flex h-14 w-full items-center justify-center rounded-2xl bg-[#394536] font-bold text-white"
        >
          ＋ 新しい合宿を作る
        </Link>

        {isLoading && (
          <p className="mt-8 text-center text-sm text-[#777c73]">
            合宿一覧を読み込んでいます…
          </p>
        )}

        {errorMessage && (
          <p className="mt-8 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        {!isLoading &&
          !errorMessage &&
          events.length === 0 && (
            <div className="mt-8 rounded-[28px] bg-white p-8 text-center">
              <p className="text-4xl">
                🏕️
              </p>

              <p className="mt-4 font-bold">
                まだ合宿がありません
              </p>
            </div>
          )}

        <div className="mt-7 space-y-4">
          {events.map((event) => {
            const isCurrent =
              currentEventId ===
              event.id;

            return (
              <div
                key={event.id}
                className="rounded-[26px] bg-white p-5 shadow-[0_10px_30px_rgba(57,69,54,0.06)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    selectEvent(
                      event.id
                    )
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {isCurrent && (
                        <p className="mb-2 inline-block rounded-full bg-[#e8ede4] px-3 py-1 text-[11px] font-bold text-[#5d6b56]">
                          編集中
                        </p>
                      )}

                      <p className="text-xs font-bold tracking-[0.12em] text-[#7b8475]">
                        {formatDate(
                          event.start_date
                        )}
                        {" － "}
                        {formatDate(
                          event.end_date
                        )}
                      </p>

                      <h2 className="mt-2 text-xl font-bold text-[#394536]">
                        {event.title}
                      </h2>

                      {event.location && (
                        <p className="mt-2 text-sm text-[#777c73]">
                          📍{" "}
                          {
                            event.location
                          }
                        </p>
                      )}

                      {event.join_code && (
                        <p className="mt-3 text-xs font-bold text-[#92958e]">
                          CODE：
                          {
                            event.join_code
                          }
                        </p>
                      )}
                    </div>

                    <span className="mt-4 text-2xl text-[#a1a69d]">
                      ›
                    </span>
                  </div>
                </button>

                <div className="mt-4 border-t border-[#eeeeea] pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setDeletingEvent(
                        event
                      )
                    }
                    className="text-sm font-bold text-red-500"
                  >
                    合宿を削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 削除確認モーダル */}
      {deletingEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="text-4xl">
                ⚠️
              </div>

              <h2 className="mt-4 text-xl font-bold">
                この合宿を削除しますか？
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#777c73]">
                「
                <span className="font-bold text-[#394536]">
                  {
                    deletingEvent.title
                  }
                </span>
                」を削除します。
              </p>

              <p className="mt-2 text-sm font-medium leading-6 text-red-500">
                予定・投稿・コメントなどの
                合宿データも削除されます。
              </p>

              <p className="mt-2 text-xs text-[#999]">
                この操作は元に戻せません。
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleDeleteEvent
              }
              disabled={isDeleting}
              className="mt-6 h-12 w-full rounded-2xl bg-red-500 font-bold text-white disabled:opacity-50"
            >
              {isDeleting
                ? "削除しています…"
                : "削除する"}
            </button>

            <button
              type="button"
              onClick={() =>
                setDeletingEvent(
                  null
                )
              }
              disabled={isDeleting}
              className="mt-3 h-12 w-full rounded-2xl bg-[#f1f1ed] font-bold text-[#555]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </main>
  );
}