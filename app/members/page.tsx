"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type Member = {
  id: number;
  user_name: string;
};

type Profile = {
  user_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export default function MembersPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    } else {
      setIsLoading(false);
      setErrorMessage(
        "参加中のイベントが見つかりません。"
      );
    }
  }, []);

  useEffect(() => {
    if (!currentEventId) return;

    async function fetchMembers() {
      setIsLoading(true);
      setErrorMessage("");

      const { data: memberData, error: memberError } =
        await supabase
          .from("event_members")
          .select("id, user_name")
          .eq("event_id", currentEventId)
          .order("created_at", {
            ascending: true,
          });

      if (memberError) {
        console.log(
          "参加者取得エラー:",
          memberError.message
        );

        setErrorMessage(
          "参加メンバーを読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      const loadedMembers = memberData ?? [];

      setMembers(loadedMembers);

      if (loadedMembers.length === 0) {
        setProfiles([]);
        setIsLoading(false);
        return;
      }

      const userNames = loadedMembers.map(
        (member) => member.user_name
      );

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "user_name, avatar_url, bio"
          )
          .in("user_name", userNames);

      if (profileError) {
        console.log(
          "プロフィール取得エラー:",
          profileError.message
        );

        setProfiles([]);
      } else {
        setProfiles(profileData ?? []);
      }

      setIsLoading(false);
    }

    fetchMembers();
  }, [currentEventId]);

  function getProfile(userName: string) {
    return profiles.find(
      (profile) =>
        profile.user_name === userName
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-6 pb-12 pt-8 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/event"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← ホームへ戻る
        </Link>

        <section className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-[0_16px_40px_rgba(57,69,54,0.10)]">
          <div className="bg-[#394536] p-6 text-white">
            <p className="text-xs font-bold tracking-[0.14em] text-white/60">
              MEMBERS
            </p>

            <div className="mt-2 flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold">
                  参加メンバー
                </h1>

                <p className="mt-2 text-sm text-white/70">
                  一緒に旅をつくるメンバーです。
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-xs text-white/60">
                  参加者
                </p>

                <p className="mt-1 text-xl font-bold">
                  {members.length}人
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-6">
            {isLoading && (
              <p className="text-center text-sm text-[#777c73]">
                メンバーを読み込んでいます…
              </p>
            )}

            {errorMessage && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            {!isLoading &&
              !errorMessage &&
              members.length === 0 && (
                <p className="text-center text-sm text-[#777c73]">
                  まだ参加者はいません。
                </p>
              )}

            {!isLoading &&
              members.map((member) => {
                const profile =
                  getProfile(member.user_name);

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 rounded-2xl border border-[#ece9e2] p-4"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#f0f2ec]">
                      {profile?.avatar_url ? (
                        <img
                          src={
                            profile.avatar_url
                          }
                          alt={`${member.user_name}のプロフィール画像`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl">
                          👤
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-[#3f453c]">
                        {member.user_name}
                      </p>

                      <p className="mt-1 truncate text-sm text-[#777c73]">
                        {profile?.bio ||
                          "ひとこと未設定"}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
    </main>
  );
}