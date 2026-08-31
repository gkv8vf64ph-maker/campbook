"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { getCurrentEventId } from "@/lib/currentEvent";

type Post = {
  id: number;
  created_at: string;
  user_name: string;
  comment: string;
  image_url: string | null;
  event_id: number;
};

type Reaction = {
  id: number;
  reaction_type: string;
};

type FaceReaction = {
  id: number;
  user_name: string;
  image_url: string;
};

type Event = {
  id: number;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
};

export default function MemoriesPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [faceReactions, setFaceReactions] = useState<FaceReaction[]>([]);
  const [commentCount, setCommentCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [currentEventId, setCurrentEventId] =
  useState<number | null>(null);

  useEffect(() => {
  const savedEventId = getCurrentEventId();

  if (savedEventId) {
    setCurrentEventId(savedEventId);
  } else {
    // 今だけイベント1を仮で使用
    setCurrentEventId(1);
  }
}, []);
  // イベント情報を取得
  useEffect(() => {
  if (!currentEventId) return;

  async function fetchEvent() {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, location, start_date, end_date")
      .eq("id", currentEventId)
      .maybeSingle();

    if (error) {
      console.log("イベント取得エラー:", error.message);
      setErrorMessage("イベント情報の読み込みに失敗しました。");
      return;
    }

    setEvent(data ?? null);
  }

  fetchEvent();
}, [currentEventId]);

  // 投稿一覧を取得
  useEffect(() => {
    async function fetchPosts() {
  setIsLoading(true);
  setErrorMessage("");

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("event_id", currentEventId);

  if (error) {
    setErrorMessage(
      `思い出の読み込みに失敗しました：${error.message || "不明なエラー"}`
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

  setPosts(
    loadedPosts.filter((post) => Boolean(post.image_url))
  );

  setIsLoading(false);
}

    fetchPosts();
  }, []);

  // 選択した投稿のリアクション・コメントなどを取得
  useEffect(() => {
    if (!selectedPost) {
      setReactions([]);
      setFaceReactions([]);
      setCommentCount(0);
      return;
    }

    // IDだけ先に取り出す
    const postId = selectedPost.id;

    async function fetchPostDetails() {
      setIsDetailLoading(true);

      const [
        reactionResult,
        faceReactionResult,
        commentResult,
      ] = await Promise.all([
        supabase
          .from("reactions")
          .select("id, reaction_type")
          .eq("post_id", postId),

        supabase
          .from("face_reactions")
          .select("id, user_name, image_url")
          .eq("post_id", postId)
          .order("created_at", { ascending: true }),

        supabase
          .from("comments")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("post_id", postId),
      ]);

      if (reactionResult.error) {
        console.log(
          "リアクション取得エラー:",
          reactionResult.error.message
        );
      } else {
        setReactions(reactionResult.data ?? []);
      }

      if (faceReactionResult.error) {
        console.log(
          "顔リアクション取得エラー:",
          faceReactionResult.error.message
        );
      } else {
        setFaceReactions(faceReactionResult.data ?? []);
      }

      if (commentResult.error) {
        console.log(
          "コメント件数取得エラー:",
          commentResult.error.message
        );
      } else {
        setCommentCount(commentResult.count ?? 0);
      }

      setIsDetailLoading(false);
    }

    fetchPostDetails();
  }, [selectedPost]);

  // start_date ～ end_date から DAY 1, DAY 2... を自動生成
  const eventDays = useMemo(() => {
    if (!event) return [];

    const days: {
      label: string;
      date: string;
      displayDate: string;
    }[] = [];

    const start = new Date(`${event.start_date}T00:00:00`);
    const end = new Date(`${event.end_date}T00:00:00`);

    const current = new Date(start);
    let dayNumber = 1;

    while (current <= end) {
      const dateString = current.toLocaleDateString("sv-SE", {
        timeZone: "Asia/Tokyo",
      });

      const displayDate = current.toLocaleDateString("ja-JP", {
        month: "long",
        day: "numeric",
        timeZone: "Asia/Tokyo",
      });

      days.push({
        label: `DAY ${dayNumber}`,
        date: dateString,
        displayDate,
      });

      current.setDate(current.getDate() + 1);
      dayNumber++;
    }

    return days;
  }, [event]);

  // DAYごとに投稿を分ける
  const postsByDay = useMemo(() => {
    return eventDays.map((day) => ({
      ...day,

      posts: posts.filter((post) => {
        const postDate = new Date(
          post.created_at
        ).toLocaleDateString("sv-SE", {
          timeZone: "Asia/Tokyo",
        });

        return postDate === day.date;
      }),
    }));
  }, [posts, eventDays]);

  function formatTime(createdAt: string) {
    return new Date(createdAt).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  }

  function getReactionCount(reactionType: string) {
    return reactions.filter(
      (reaction) => reaction.reaction_type === reactionType
    ).length;
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] pb-28 text-[#252720]">
      <div className="mx-auto max-w-md px-5 py-8">
        <Link
          href="/event"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← ホームへ戻る
        </Link>

        <div className="mt-6">
          <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
            MEMORIES
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            思い出
          </h1>

          <p className="mt-2 text-sm text-[#777c73]">
            {event
              ? `${event.title}の写真を振り返ろう。`
              : "イベントの写真を振り返ろう。"}
          </p>

          {event?.location && (
            <p className="mt-1 text-xs text-[#92958e]">
              📍 {event.location}
            </p>
          )}
        </div>

        <div className="mt-7 rounded-[28px] bg-[#394536] p-5 text-white">
          <p className="text-xs text-white/60">
            保存された写真
          </p>

          <p className="mt-1 text-2xl font-bold">
            {posts.length}枚
          </p>
        </div>

        {isLoading && (
          <p className="mt-8 text-center text-sm text-gray-500">
            思い出を読み込んでいます…
          </p>
        )}

        {errorMessage && (
          <p className="mt-8 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        {!isLoading &&
          !errorMessage &&
          posts.length === 0 && (
            <div className="mt-8 rounded-3xl bg-white p-8 text-center">
              <p className="text-4xl">📷</p>

              <p className="mt-4 font-bold">
                まだ思い出がありません
              </p>

              <p className="mt-2 text-sm text-[#858980]">
                タイムラインから写真を投稿してみよう。
              </p>
            </div>
          )}

        {!isLoading &&
          posts.length > 0 &&
          postsByDay.map((day) => (
            <section
              key={day.date}
              className="mt-10"
            >
              <div className="mb-4">
                <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                  {day.label}
                </p>

                <div className="mt-1 flex items-end justify-between">
                  <h2 className="text-2xl font-bold">
                    {day.displayDate}
                  </h2>

                  <p className="text-sm font-semibold text-[#7b8475]">
                    {day.posts.length}枚
                  </p>
                </div>
              </div>

              {day.posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {day.posts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="relative aspect-square overflow-hidden rounded-xl bg-[#e8ede4] transition active:scale-95"
                    >
                      <Image
                        src={post.image_url!}
                        alt={`${post.user_name}の思い出`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-5 text-center text-sm text-[#858980]">
                  この日の写真はまだありません。
                </div>
              )}
            </section>
          ))}
      </div>

      {selectedPost && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[30px] bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPost(null)}
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-2xl text-white"
              aria-label="閉じる"
            >
              ×
            </button>

            <div className="relative aspect-[4/3] w-full bg-black">
              <Image
                src={selectedPost.image_url!}
                alt={`${selectedPost.user_name}の思い出`}
                fill
                className="object-contain"
              />
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#394536]">
                  {selectedPost.user_name}
                </p>

                <p className="text-xs text-[#92958e]">
                  {formatTime(selectedPost.created_at)}
                </p>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#5f645b]">
                {selectedPost.comment}
              </p>

              {isDetailLoading ? (
                <p className="mt-6 text-sm text-[#888]">
                  リアクションを読み込んでいます…
                </p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <div className="rounded-full bg-[#f5f3ee] px-3 py-2 text-sm">
                      ♡ {getReactionCount("♡")}
                    </div>

                    <div className="rounded-full bg-[#f5f3ee] px-3 py-2 text-sm">
                      😂 {getReactionCount("😂")}
                    </div>

                    <div className="rounded-full bg-[#f5f3ee] px-3 py-2 text-sm">
                      🔥 {getReactionCount("🔥")}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#687562]">
                      コメント {commentCount}件
                    </p>

                    <p className="text-sm font-semibold text-[#687562]">
                      顔リアクション {faceReactions.length}件
                    </p>
                  </div>

                  {faceReactions.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold tracking-[0.12em] text-[#7b8475]">
                        FACE REACTIONS
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {faceReactions.map((reaction) => (
                          <div
                            key={reaction.id}
                            className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-[#dfe8d8]"
                          >
                            <Image
                              src={reaction.image_url}
                              alt={`${reaction.user_name}の顔リアクション`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav current="memories" />
    </main>
  );
}