"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type Room = {
  id: number;
  event_id: number;
  name: string;
  sort_order: number;
  is_published: boolean;
};

type RoomMember = {
  id: number;
  room_id: number;
  user_id: string | null;
  name: string;
  sort_order: number;
};

type EventMember = {
  user_id: string;
  user_name: string;
};

export default function AdminRoomsPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [eventMembers, setEventMembers] = useState<EventMember[]>([]);

  const [newRoomName, setNewRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

    async function fetchAll() {
      setIsLoading(true);
      setErrorMessage("");

      const { data: roomData, error: roomError } =
        await supabase
          .from("rooms")
          .select(
            "id, event_id, name, sort_order, is_published"
          )
          .eq("event_id", currentEventId)
          .order("sort_order", {
            ascending: true,
          });

      if (roomError) {
        console.log("部屋取得エラー:", roomError.message);
        setErrorMessage("部屋割りを読み込めませんでした。");
        setIsLoading(false);
        return;
      }

      const loadedRooms = roomData ?? [];
      setRooms(loadedRooms);

      if (loadedRooms.length > 0) {
        const roomIds = loadedRooms.map((room) => room.id);

        const { data: memberData, error: memberError } =
          await supabase
            .from("room_members")
            .select(
              "id, room_id, user_id, name, sort_order"
            )
            .in("room_id", roomIds)
            .order("sort_order", {
              ascending: true,
            });

        if (memberError) {
          console.log(
            "部屋メンバー取得エラー:",
            memberError.message
          );
          setErrorMessage(
            "部屋メンバーを読み込めませんでした。"
          );
          setIsLoading(false);
          return;
        }

        setRoomMembers(memberData ?? []);
      } else {
        setRoomMembers([]);
      }

     

      // イベント参加者を取得
const {
  data: eventMemberData,
  error: eventMemberError,
} = await supabase
  .from("event_members")
  .select("user_id")
  .eq("event_id", currentEventId);

if (eventMemberError) {
  console.log(
    "参加メンバー取得エラー:",
    eventMemberError.message
  );

  setErrorMessage(
    "参加メンバーを読み込めませんでした。"
  );

  setIsLoading(false);
  return;
}

const userIds = (eventMemberData ?? [])
  .map((member) => member.user_id)
  .filter(
    (userId): userId is string =>
      typeof userId === "string"
  );

// 参加者が0人なら終了
if (userIds.length === 0) {
  setEventMembers([]);
  setIsLoading(false);
  return;
}

// プロフィールを別で取得
const {
  data: profileData,
  error: profileError,
} = await supabase
  .from("profiles")
  .select("user_id, user_name")
  .in("user_id", userIds);

if (profileError) {
  console.log(
    "プロフィール取得エラー:",
    profileError.message
  );

  setErrorMessage(
    "参加メンバーのプロフィールを読み込めませんでした。"
  );

  setIsLoading(false);
  return;
}

// user_idで合体
const formattedMembers: EventMember[] =
  userIds.map((userId) => {
    const profile = (profileData ?? []).find(
      (item) => item.user_id === userId
    );

    return {
      user_id: userId,
      user_name:
        profile?.user_name ?? "名前未設定",
    };
  });

setEventMembers(formattedMembers);

setIsLoading(false);

      setIsLoading(false);
    }

    fetchAll();
  }, [currentEventId]);

  async function handleAddRoom() {
    if (!currentEventId) return;

    const roomName = newRoomName.trim();

    if (!roomName) {
      setErrorMessage("部屋名を入力してください。");
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    const nextSortOrder =
      rooms.length > 0
        ? Math.max(
            ...rooms.map((room) => room.sort_order)
          ) + 1
        : 1;

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        event_id: currentEventId,
        name: roomName,
        sort_order: nextSortOrder,
        is_published: false,
      })
      .select(
        "id, event_id, name, sort_order, is_published"
      )
      .single();

    if (error) {
      console.log("部屋追加エラー:", error.message);
      setErrorMessage("部屋を追加できませんでした。");
      setIsSaving(false);
      return;
    }

    setRooms((current) => [...current, data]);
    setNewRoomName("");
    setIsSaving(false);
  }

  async function handleDeleteRoom(roomId: number) {
    const shouldDelete = window.confirm(
      "この部屋と登録メンバーを削除しますか？"
    );

    if (!shouldDelete) return;

    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId);

    if (error) {
      console.log("部屋削除エラー:", error.message);
      setErrorMessage("部屋を削除できませんでした。");
      return;
    }

    setRooms((current) =>
      current.filter((room) => room.id !== roomId)
    );

    setRoomMembers((current) =>
      current.filter((member) => member.room_id !== roomId)
    );
  }

  async function handleAddMember(
    roomId: number,
    member: EventMember
  ) {
    setErrorMessage("");

    const alreadyAssigned = roomMembers.some(
      (roomMember) =>
        roomMember.user_id === member.user_id
    );

    if (alreadyAssigned) {
      setErrorMessage(
        "このメンバーはすでに別の部屋に登録されています。"
      );
      return;
    }

    const currentMembers =
      roomMembers.filter(
        (roomMember) =>
          roomMember.room_id === roomId
      );

    const nextSortOrder =
      currentMembers.length > 0
        ? Math.max(
            ...currentMembers.map(
              (roomMember) =>
                roomMember.sort_order
            )
          ) + 1
        : 1;

    const { data, error } = await supabase
      .from("room_members")
      .insert({
        room_id: roomId,
        user_id: member.user_id,
        name: member.user_name,
        sort_order: nextSortOrder,
      })
      .select(
        "id, room_id, user_id, name, sort_order"
      )
      .single();

    if (error) {
      console.log(
        "メンバー追加エラー:",
        error.message
      );

      setErrorMessage(
        "メンバーを追加できませんでした。"
      );

      return;
    }

    setRoomMembers((current) => [
      ...current,
      data,
    ]);
  }

  async function handleDeleteMember(
    memberId: number
  ) {
    const shouldDelete = window.confirm(
      "このメンバーを削除しますか？"
    );

    if (!shouldDelete) return;

    const { error } = await supabase
      .from("room_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.log(
        "メンバー削除エラー:",
        error.message
      );

      setErrorMessage(
        "メンバーを削除できませんでした。"
      );

      return;
    }

    setRoomMembers((current) =>
      current.filter(
        (member) =>
          member.id !== memberId
      )
    );
  }

  async function togglePublished(room: Room) {
  if (!currentEventId) return;

  const nextPublished =
    !room.is_published;

  setErrorMessage("");
  setSuccessMessage("");

  const { error } = await supabase
    .from("rooms")
    .update({
      is_published: nextPublished,
    })
    .eq("id", room.id)
    .eq("event_id", currentEventId);

  if (error) {
    console.log(
      "公開状態変更エラー:",
      error.message
    );

    setErrorMessage(
      "公開状態を変更できませんでした。"
    );

    return;
  }

  setRooms((current) =>
    current.map((item) =>
      item.id === room.id
        ? {
            ...item,
            is_published:
              nextPublished,
          }
        : item
    )
  );

  // 未公開に戻した場合は通知しない
  if (!nextPublished) {
    setSuccessMessage(
      `${room.name}を未公開にしました。`
    );
    return;
  }

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
        `${room.name}を公開しましたが、通知は送信できませんでした。`
      );

      return;
    }

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
            "🛏️ 部屋割りが公開されました",
          body:
            "自分の部屋を確認してみよう！",
          url: "/room",
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      console.log(
        "部屋割りPush通知エラー:",
        result
      );

      setSuccessMessage(
        `${room.name}を公開しましたが、通知は送信できませんでした。`
      );

      return;
    }

    setSuccessMessage(
      `${room.name}を公開し、${result.sent}台に通知しました 🔔`
    );
  } catch (notificationError) {
    console.log(
      "部屋割り通知送信エラー:",
      notificationError
    );

    setSuccessMessage(
      `${room.name}を公開しましたが、通知は送信できませんでした。`
    );
  }
}

  const assignedUserIds = useMemo(() => {
    return new Set(
      roomMembers
        .map((member) => member.user_id)
        .filter(
          (userId): userId is string =>
            typeof userId === "string"
        )
    );
  }, [roomMembers]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm text-[#777c73]">
          読み込んでいます…
        </p>
      </main>
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
            ADMIN / ROOMS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            部屋割りを編集
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            イベント参加者からメンバーを選択できます。
          </p>
        </div>


        {errorMessage && (
          <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}
        {successMessage && (
  <p className="mt-6 rounded-2xl bg-[#eef2e9] p-4 text-sm font-medium text-[#394536]">
    {successMessage}
  </p>
)}

        <section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <p className="text-sm font-bold text-[#394536]">
            新しい部屋
          </p>

          <input
            type="text"
            value={newRoomName}
            onChange={(event) => {
              setNewRoomName(event.target.value);
              setErrorMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAddRoom();
              }
            }}
            placeholder="例：101号室"
            className="mt-4 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
          />

          <button
            type="button"
            onClick={handleAddRoom}
            disabled={isSaving}
            className="mt-5 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white disabled:opacity-60"
          >
            {isSaving
              ? "追加しています…"
              : "＋ 部屋を追加"}
          </button>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                ROOM ASSIGNMENT
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                登録中の部屋
              </h2>
            </div>

            <p className="text-sm font-semibold text-[#7b8475]">
              {rooms.length}部屋
            </p>
          </div>

          <div className="mt-5 space-y-5">
            {rooms.map((room) => {
              const members =
                roomMembers.filter(
                  (member) =>
                    member.room_id === room.id
                );

              const availableMembers =
                eventMembers.filter(
                  (member) =>
                    !assignedUserIds.has(
                      member.user_id
                    )
                );

              return (
                <div
                  key={room.id}
                  className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(57,69,54,0.06)]"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-bold text-[#394536]">
                          {room.name}
                        </p>

                        <p className="mt-1 text-sm text-[#858980]">
                          {members.length}人
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          togglePublished(room)
                        }
                        className={`rounded-full px-4 py-2 text-xs font-bold ${
                          room.is_published
                            ? "bg-[#e4ebdf] text-[#46543f]"
                            : "bg-[#f1f0eb] text-[#777c73]"
                        }`}
                      >
                        {room.is_published
                          ? "🔓 公開中"
                          : "🔒 未公開"}
                      </button>
                    </div>

                    <div className="mt-5 space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-2xl bg-[#f7f5ef] px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9eee6]">
                              👤
                            </div>

                            <p className="font-semibold">
                              {member.name}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMember(
                                member.id
                              )
                            }
                            className="text-xs font-bold text-red-500"
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 border-t border-[#eee] pt-5">
                      <p className="text-sm font-bold text-[#394536]">
                        メンバーを追加
                      </p>

                      {availableMembers.length === 0 ? (
                        <p className="mt-3 text-sm text-[#858980]">
                          追加できる参加者はいません。
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {availableMembers.map(
                            (member) => (
                              <button
                                key={
                                  member.user_id
                                }
                                type="button"
                                onClick={() =>
                                  handleAddMember(
                                    room.id,
                                    member
                                  )
                                }
                                className="flex w-full items-center justify-between rounded-2xl border border-[#e1e3dc] bg-white px-4 py-3 text-left transition active:scale-[0.99]"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9eee6]">
                                    👤
                                  </div>

                                  <span className="font-semibold">
                                    {
                                      member.user_name
                                    }
                                  </span>
                                </div>

                                <span className="font-bold text-[#5d6b56]">
                                  ＋
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteRoom(room.id)
                    }
                    className="w-full border-t border-[#eee] py-4 text-sm font-bold text-red-500"
                  >
                    この部屋を削除
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <Link
          href="/room"
          className="mt-7 flex h-12 w-full items-center justify-center rounded-2xl border border-[#d7dbd3] bg-white text-sm font-bold text-[#5d6b56]"
        >
          参加者画面を確認する
        </Link>
      </div>
    </main>
  );
}
