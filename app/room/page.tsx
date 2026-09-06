"use client";

import { useEffect, useState } from "react";
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
  name: string;
  sort_order: number;
};

export default function RoomPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [rooms, setRooms] =
    useState<Room[]>([]);

  const [roomMembers, setRoomMembers] =
    useState<RoomMember[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  // 現在のイベントIDを取得
  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    } else {
      setErrorMessage(
        "参加中のイベントが見つかりません。"
      );
      setIsLoading(false);
    }
  }, []);

  // 公開中の部屋とメンバーを取得
  useEffect(() => {
    if (!currentEventId) return;

    async function fetchRooms() {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: roomData,
        error: roomError,
      } = await supabase
        .from("rooms")
        .select(
          "id, event_id, name, sort_order, is_published"
        )
        .eq("event_id", currentEventId)
        .eq("is_published", true)
        .order("sort_order", {
          ascending: true,
        });

      if (roomError) {
        console.log(
          "部屋取得エラー:",
          roomError.message
        );

        setErrorMessage(
          "部屋割りを読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      const loadedRooms =
        (roomData ?? []) as Room[];

      setRooms(loadedRooms);

      if (loadedRooms.length === 0) {
        setRoomMembers([]);
        setIsLoading(false);
        return;
      }

      const roomIds =
        loadedRooms.map(
          (room) => room.id
        );

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("room_members")
        .select(
          "id, room_id, name, sort_order"
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
          "部屋割りを読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      setRoomMembers(
        (memberData ?? []) as RoomMember[]
      );

      setIsLoading(false);
    }

    fetchRooms();
  }, [currentEventId]);

  return (
    <main className="min-h-screen bg-[#f4f1e9] p-6 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/event"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← ホームへ戻る
        </Link>

        <div className="mt-7">
          <h1 className="text-3xl font-bold">
            🏠 部屋割り
          </h1>

          <p className="mt-2 text-sm text-[#777c73]">
            部屋とメンバーを確認できます。
          </p>
        </div>

        {isLoading && (
          <p className="mt-8 text-center text-sm text-[#777c73]">
            読み込み中…
          </p>
        )}

        {errorMessage && (
          <p className="mt-8 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        {!isLoading &&
          !errorMessage &&
          rooms.length === 0 && (
            <section className="mt-8 rounded-[28px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2e9] text-3xl">
                🔒
              </div>

              <h2 className="mt-5 text-xl font-bold">
                部屋割りは未公開です
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#777c73]">
                公開されるとここに表示されます。
              </p>
            </section>
          )}

        {!isLoading &&
          !errorMessage &&
          rooms.length > 0 && (
            <div className="mt-8 space-y-5">
              {rooms.map((room) => {
                const members =
                  roomMembers.filter(
                    (member) =>
                      member.room_id ===
                      room.id
                  );

                return (
                  <section
                    key={room.id}
                    className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(57,69,54,0.06)]"
                  >
                    <div className="bg-[#394536] px-6 py-5 text-white">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="text-2xl font-bold">
                          {room.name}
                        </h2>

                        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                          {members.length}人
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      {members.length === 0 && (
                        <p className="py-3 text-center text-sm text-[#858980]">
                          メンバーはまだ登録されていません。
                        </p>
                      )}

                      {members.map(
                        (member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 rounded-2xl bg-[#f7f5ef] p-4"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9eee6]">
                              👤
                            </div>

                            <p className="min-w-0 truncate font-semibold text-[#3f453c]">
                              {member.name}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
      </div>
    </main>
  );
}