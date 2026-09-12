"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type Schedule = {
  id: number;
  event_id: number;
  day_number: number;
  time: string;
  title: string;
  description: string | null;
};

export default function AdminSchedulesPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [dayNumber, setDayNumber] = useState(1);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingScheduleId, setEditingScheduleId] =
  useState<number | null>(null);

const [editDayNumber, setEditDayNumber] =
  useState(1);

const [editTime, setEditTime] =
  useState("");

const [editTitle, setEditTitle] =
  useState("");

const [editDescription, setEditDescription] =
  useState("");

const [
  sendEditNotification,
  setSendEditNotification,
] = useState(true);

const [isEditing, setIsEditing] =
  useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sendNotification, setSendNotification] =
  useState(false);

const [successMessage, setSuccessMessage] =
  useState("");

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

  useEffect(() => {
    if (!currentEventId) return;

    fetchSchedules();
  }, [currentEventId]);

  async function fetchSchedules() {
    if (!currentEventId) return;

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("schedules")
      .select(
        "id, event_id, day_number, time, title, description"
      )
      .eq("event_id", currentEventId)
      .order("day_number", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.log(
        "予定取得エラー:",
        error.message
      );

      setErrorMessage(
        "予定を読み込めませんでした。"
      );

      setIsLoading(false);
      return;
    }

    setSchedules(data ?? []);
    setIsLoading(false);
  }
  function handleStartEdit(
  schedule: Schedule
) {
  setEditingScheduleId(schedule.id);
  setEditDayNumber(schedule.day_number);
  setEditTime(schedule.time.slice(0, 5));
  setEditTitle(schedule.title);
  setEditDescription(
    schedule.description ?? ""
  );
  setSendEditNotification(true);
  setErrorMessage("");
  setSuccessMessage("");
}
function handleCancelEdit() {
  setEditingScheduleId(null);
  setEditDayNumber(1);
  setEditTime("");
  setEditTitle("");
  setEditDescription("");
  setSendEditNotification(true);
}
async function handleSaveEdit() {
  if (!currentEventId || !editingScheduleId) {
    return;
  }

  if (!editTime) {
    setErrorMessage(
      "時間を入力してください。"
    );
    return;
  }

  if (!editTitle.trim()) {
    setErrorMessage(
      "予定名を入力してください。"
    );
    return;
  }

  if (isEditing) return;

  setIsEditing(true);
  setErrorMessage("");
  setSuccessMessage("");

  const { data, error } = await supabase
    .from("schedules")
    .update({
      day_number: editDayNumber,
      time: editTime,
      title: editTitle.trim(),
      description:
        editDescription.trim() || null,
    })
    .eq("id", editingScheduleId)
    .eq("event_id", currentEventId)
    .select(
      "id, event_id, day_number, time, title, description"
    )
    .single();

  if (error) {
    console.log(
      "予定更新エラー:",
      error.message
    );

    setErrorMessage(
      "予定を更新できませんでした。"
    );

    setIsEditing(false);
    return;
  }

  setSchedules((current) =>
    current
      .map((schedule) =>
        schedule.id === data.id
          ? data
          : schedule
      )
      .sort((a, b) => {
        if (
          a.day_number !== b.day_number
        ) {
          return (
            a.day_number -
            b.day_number
          );
        }

        return a.time.localeCompare(
          b.time
        );
      })
  );

  if (sendEditNotification) {
    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        setSuccessMessage(
          "予定は変更しましたが、通知は送信できませんでした。"
        );
      } else {
        const response = await fetch(
          "/api/push/event",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              eventId: currentEventId,
              title:
                "🗓️ 予定が変更されました",
              body:
                `DAY ${editDayNumber} ${editTime} ${editTitle.trim()}`,
              url: "/timeline",
            }),
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          console.log(
            "予定変更Pushエラー:",
            result
          );

          setSuccessMessage(
            "予定は変更しましたが、通知は送信できませんでした。"
          );
        } else {
          setSuccessMessage(
            `予定を変更し、${result.sent}台に通知しました 🔔`
          );
        }
      }
    } catch (notificationError) {
      console.log(
        "予定変更通知エラー:",
        notificationError
      );

      setSuccessMessage(
        "予定は変更しましたが、通知は送信できませんでした。"
      );
    }
  } else {
    setSuccessMessage(
      "予定を変更しました。"
    );
  }

  handleCancelEdit();
  setIsEditing(false);
}

  async function handleAddSchedule() {
    if (!currentEventId) {
      setErrorMessage(
        "イベントが選択されていません。"
      );
      return;
    }

    if (!time) {
      setErrorMessage(
        "時間を入力してください。"
      );
      return;
    }

    if (!title.trim()) {
      setErrorMessage(
        "予定名を入力してください。"
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("schedules")
      .insert({
        event_id: currentEventId,
        day_number: dayNumber,
        time,
        title: title.trim(),
        description:
          description.trim() || null,
      })
      .select(
        "id, event_id, day_number, time, title, description"
      )
      .single();

    if (error) {
      console.log(
        "予定追加エラー:",
        error.message
      );

      setErrorMessage(
        "予定を追加できませんでした。"
      );

      setIsSaving(false);
      return;
    }

    setSchedules((current) =>
      [...current, data].sort((a, b) => {
        if (a.day_number !== b.day_number) {
          return a.day_number - b.day_number;
        }

        return a.time.localeCompare(b.time);
      })
    );

    if (sendNotification) {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      console.log(
        "通知用ログイン情報取得エラー:",
        sessionError
      );

      setSuccessMessage(
        "予定は追加しましたが、通知は送信できませんでした。"
      );
    } else {
      const response = await fetch(
        "/api/push/event",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            eventId: currentEventId,
            title: "🗓️ 新しい予定が追加されました",
            body: `DAY ${dayNumber} ${time} ${title.trim()}`,
            url: "/timeline",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.log(
          "予定Push通知エラー:",
          result
        );

        setSuccessMessage(
          "予定は追加しましたが、通知は送信できませんでした。"
        );
      } else {
        setSuccessMessage(
          `予定を追加し、${result.sent}台に通知しました 🔔`
        );
      }
    }
  } catch (notificationError) {
    console.log(
      "予定Push通知送信エラー:",
      notificationError
    );

    setSuccessMessage(
      "予定は追加しましたが、通知は送信できませんでした。"
    );
  }
} else {
  setSuccessMessage(
    "予定を追加しました。"
  );
}

setTime("");
setTitle("");
setDescription("");
setSendNotification(false);
setIsSaving(false);
  }

  async function handleDeleteSchedule(
    scheduleId: number
  ) {
    const shouldDelete = window.confirm(
      "この予定を削除しますか？"
    );

    if (!shouldDelete) return;

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      console.log(
        "予定削除エラー:",
        error.message
      );

      setErrorMessage(
        "予定を削除できませんでした。"
      );

      return;
    }

    setSchedules((current) =>
      current.filter(
        (schedule) =>
          schedule.id !== scheduleId
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
            ADMIN / SCHEDULE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            予定を編集
          </h1>

          <p className="mt-2 text-sm text-[#777c73]">
            合宿の日程を追加・削除できます。
          </p>
        </div>

        <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <p className="text-sm font-bold text-[#394536]">
            新しい予定
          </p>

          <div className="mt-5">
            <label className="text-xs font-bold text-[#7b8475]">
              日
            </label>

            <select
              value={dayNumber}
              onChange={(event) =>
                setDayNumber(
                  Number(event.target.value)
                )
              }
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] bg-white px-4 py-3 outline-none focus:border-[#5d6b56]"
            >
              <option value={1}>DAY 1</option>
              <option value={2}>DAY 2</option>
              <option value={3}>DAY 3</option>
              <option value={4}>DAY 4</option>
              <option value={5}>DAY 5</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold text-[#7b8475]">
              時間
            </label>

            <input
              type="time"
              value={time}
              onChange={(event) =>
                setTime(event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold text-[#7b8475]">
              予定名
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="例：名古屋駅に集合"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-bold text-[#7b8475]">
              説明
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="例：10分前を目安に集合"
              className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-[#f4f6f1] p-4">
  <div>
    <p className="text-sm font-bold text-[#394536]">
      参加者へ通知する
    </p>

    <p className="mt-1 text-xs leading-5 text-[#81867d]">
      この予定を追加したことをPush通知します
    </p>
  </div>

  <input
    type="checkbox"
    checked={sendNotification}
    onChange={(event) =>
      setSendNotification(event.target.checked)
    }
    className="h-5 w-5 accent-[#394536]"
  />
</label>

          {errorMessage && (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-600">
              {errorMessage}
            </p>
          )}
          {successMessage && (
  <p className="mt-4 rounded-2xl bg-[#eef2e9] p-3 text-sm font-medium text-[#394536]">
    {successMessage}
  </p>
)}

          <button
            type="button"
            onClick={handleAddSchedule}
            disabled={isSaving}
            className="mt-5 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white disabled:opacity-60"
          >
            {isSaving
              ? "追加しています…"
              : "＋ 予定を追加"}
          </button>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                CURRENT SCHEDULE
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                登録中の予定
              </h2>
            </div>

            <p className="text-sm font-semibold text-[#7b8475]">
              {schedules.length}件
            </p>
          </div>

          {isLoading && (
            <p className="mt-5 text-center text-sm text-[#777c73]">
              予定を読み込んでいます…
            </p>
          )}

          {!isLoading &&
            schedules.length === 0 && (
              <div className="mt-5 rounded-3xl bg-white p-6 text-center">
                <p className="text-sm text-[#777c73]">
                  まだ予定はありません。
                </p>
              </div>
            )}

          <div className="mt-5 space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(57,69,54,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-[0.12em] text-[#7b8475]">
                      DAY {schedule.day_number}
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      <p className="font-bold text-[#5d6b56]">
                        {schedule.time.slice(
                          0,
                          5
                        )}
                      </p>

                      <p className="font-bold">
                        {schedule.title}
                      </p>
                    </div>

                    {schedule.description && (
                      <p className="mt-2 text-sm leading-6 text-[#777c73]">
                        {schedule.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
  <button
    type="button"
    onClick={() =>
      handleStartEdit(schedule)
    }
    className="rounded-xl bg-[#eef2e9] px-3 py-2 text-xs font-bold text-[#5d6b56]"
  >
    編集
  </button>

  <button
    type="button"
    onClick={() =>
      handleDeleteSchedule(
        schedule.id
      )
    }
    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
  >
    削除
  </button>
</div>
{editingScheduleId ===
  schedule.id && (
  <div className="mt-5 border-t border-[#eceee8] pt-5">
    <p className="text-sm font-bold text-[#394536]">
      予定を編集
    </p>

    <div className="mt-4">
      <label className="text-xs font-bold text-[#7b8475]">
        日
      </label>

      <select
        value={editDayNumber}
        onChange={(event) =>
          setEditDayNumber(
            Number(
              event.target.value
            )
          )
        }
        className="mt-2 w-full rounded-2xl border border-[#dedfd9] bg-white px-4 py-3"
      >
        <option value={1}>
          DAY 1
        </option>
        <option value={2}>
          DAY 2
        </option>
        <option value={3}>
          DAY 3
        </option>
        <option value={4}>
          DAY 4
        </option>
        <option value={5}>
          DAY 5
        </option>
      </select>
    </div>

    <div className="mt-4">
      <label className="text-xs font-bold text-[#7b8475]">
        時間
      </label>

      <input
        type="time"
        value={editTime}
        onChange={(event) =>
          setEditTime(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3"
      />
    </div>

    <div className="mt-4">
      <label className="text-xs font-bold text-[#7b8475]">
        予定名
      </label>

      <input
        type="text"
        value={editTitle}
        onChange={(event) =>
          setEditTitle(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3"
      />
    </div>

    <div className="mt-4">
      <label className="text-xs font-bold text-[#7b8475]">
        説明
      </label>

      <textarea
        value={editDescription}
        onChange={(event) =>
          setEditDescription(
            event.target.value
          )
        }
        className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#dedfd9] px-4 py-3"
      />
    </div>

    <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl bg-[#f4f6f1] p-4">
      <div>
        <p className="text-sm font-bold text-[#394536]">
          変更を参加者へ通知
        </p>

        <p className="mt-1 text-xs text-[#81867d]">
          予定変更をPush通知します
        </p>
      </div>

      <input
        type="checkbox"
        checked={
          sendEditNotification
        }
        onChange={(event) =>
          setSendEditNotification(
            event.target.checked
          )
        }
        className="h-5 w-5 accent-[#394536]"
      />
    </label>

    <div className="mt-5 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={
          handleCancelEdit
        }
        disabled={isEditing}
        className="rounded-2xl border border-[#d7dbd3] bg-white py-3 text-sm font-bold text-[#5d6b56]"
      >
        キャンセル
      </button>

      <button
        type="button"
        onClick={
          handleSaveEdit
        }
        disabled={isEditing}
        className="rounded-2xl bg-[#394536] py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {isEditing
          ? "保存中…"
          : "変更を保存"}
      </button>
    </div>
  </div>
)}
                </div>

              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}