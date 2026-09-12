"use client";

import FaceReactionCamera from "@/components/FaceReactionCamera";
import CommentModal from "@/components/CommentModal";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type PostCardProps = {
  postId: number;
  postUserId: string | null;
  user: string;
  time: string;
  comment: string;
  emoji: string;
  image: string;
};

type FaceReaction = {
  id: number;
  user_id: string | null;
  user_name: string;
  image_url: string;
};

type Reaction = {
  id: number;
  user_id: string | null;
  reaction_type: string;
  user_name: string;
};

type Profile = {
  user_name: string;
  avatar_url: string | null;
};

const reactionTypes = [
  "❤️",
  "😂",
  "🔥",
  "👏",
  "😳",
];

export default function PostCard({
  postId,
  postUserId,
  user,
  time,
  comment,
  emoji,
  image,
}: PostCardProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    isCommentOpen,
    setIsCommentOpen,
  ] = useState(false);

  const [
    commentCount,
    setCommentCount,
  ] = useState(0);

  const [
    isFaceCameraOpen,
    setIsFaceCameraOpen,
  ] = useState(false);

  const [
    faceReactions,
    setFaceReactions,
  ] = useState<FaceReaction[]>([]);

  const [
    isFaceUploading,
    setIsFaceUploading,
  ] = useState(false);

  const [
    selectedFaceReaction,
    setSelectedFaceReaction,
  ] = useState<FaceReaction | null>(
    null
  );

  const [
    isFaceReactionListOpen,
    setIsFaceReactionListOpen,
  ] = useState(false);

  const [
    reactions,
    setReactions,
  ] = useState<Reaction[]>([]);

  const [
    reactionLoading,
    setReactionLoading,
  ] = useState<string | null>(null);

  const [
    isReactionPickerOpen,
    setIsReactionPickerOpen,
  ] = useState(false);

  const [
  isReactionListOpen,
  setIsReactionListOpen,
] = useState(false);

  const [
    hoveredReaction,
    setHoveredReaction,
  ] = useState<string | null>(null);

  const reactionButtonRef =
    useRef<HTMLButtonElement | null>(
      null
    );

  const longPressTimer =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const didLongPress = useRef(false);

  const [
    currentUser,
    setCurrentUser,
  ] = useState("");

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<string | null>(null);

  const [
    currentProfile,
    setCurrentProfile,
  ] = useState<Profile | null>(null);

  // 投稿者プロフィール
  useEffect(() => {
    async function fetchProfile() {
      if (!postUserId) {
        setCurrentProfile(null);
        return;
      }

      const { data, error } =
        await supabase
          .from("profiles")
          .select(
            "user_name, avatar_url"
          )
          .eq(
            "user_id",
            postUserId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "投稿者プロフィール取得エラー:",
          error
        );
        return;
      }

      setCurrentProfile(
        data ?? null
      );
    }

    fetchProfile();
  }, [postUserId]);

  // ログイン中ユーザー
  useEffect(() => {
    async function fetchCurrentUser() {
      const {
        data: {
          user: authUser,
        },
      } =
        await supabase.auth.getUser();

      if (!authUser) return;

      setCurrentUserId(
        authUser.id
      );

      const { data: profile } =
        await supabase
          .from("profiles")
          .select("user_name")
          .eq(
            "user_id",
            authUser.id
          )
          .maybeSingle();

      if (
        profile?.user_name
      ) {
        setCurrentUser(
          profile.user_name
        );
      }
    }

    fetchCurrentUser();
  }, []);

  // コメント件数
  useEffect(() => {
    async function fetchCommentCount() {
      const {
        count,
        error,
      } = await supabase
        .from("comments")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "post_id",
          postId
        );

      if (error) {
        console.error(error);
        return;
      }

      setCommentCount(
        count ?? 0
      );
    }

    fetchCommentCount();
  }, [postId]);

  // 通常リアクション
  useEffect(() => {
    async function fetchReactions() {
      const {
        data,
        error,
      } = await supabase
        .from("reactions")
        .select(
          "id, user_id, reaction_type, user_name"
        )
        .eq(
          "post_id",
          postId
        );

      if (error) {
        console.error(error);
        return;
      }

      setReactions(
        data ?? []
      );
    }

    fetchReactions();
  }, [postId]);

  // 写真リアクション
  useEffect(() => {
    async function fetchFaceReactions() {
      const {
        data,
        error,
      } = await supabase
        .from(
          "face_reactions"
        )
        .select(
          "id, user_id, user_name, image_url"
        )
        .eq(
          "post_id",
          postId
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (error) {
        console.error(
          "リアクション取得エラー:",
          error
        );
        return;
      }

      setFaceReactions(
        data ?? []
      );
    }

    fetchFaceReactions();
  }, [postId]);

  async function toggleReaction(
    reactionType: string
  ) {
    if (
      reactionLoading ||
      !currentUserId
    ) {
      return;
    }

    setReactionLoading(
      reactionType
    );

    const existingReaction =
      reactions.find(
        (reaction) =>
          reaction.user_id ===
            currentUserId &&
          reaction.reaction_type ===
            reactionType
      );

    if (existingReaction) {
      const { error } =
        await supabase
          .from("reactions")
          .delete()
          .eq(
            "id",
            existingReaction.id
          );

      if (error) {
        console.error(error);
        setReactionLoading(
          null
        );
        return;
      }

      setReactions(
        (current) =>
          current.filter(
            (reaction) =>
              reaction.id !==
              existingReaction.id
          )
      );

      setReactionLoading(null);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("reactions")
      .insert({
        post_id: postId,
        user_id:
          currentUserId,
        user_name:
          currentUser,
        reaction_type:
          reactionType,
      })
      .select(
        "id, user_id, reaction_type, user_name"
      )
      .single();

    if (error) {
      console.error(error);
      setReactionLoading(null);
      return;
    }

    setReactions(
      (current) => [
        ...current,
        data,
      ]
    );
    if (
  postUserId &&
  postUserId !== currentUserId
) {
  try {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (session?.access_token) {
      const response =
        await fetch(
          "/api/push/user",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              postId,
              reactionType,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        console.error(
          "リアクション通知エラー:",
          result
        );
      }
    }
  } catch (error) {
    console.error(
      "リアクション通知送信エラー:",
      error
    );
  }
}

    setReactionLoading(null);
  }

  function getReactionCount(
    reactionType: string
  ) {
    return reactions.filter(
      (reaction) =>
        reaction.reaction_type ===
        reactionType
    ).length;
  }

  function startReactionPress() {
    didLongPress.current =
      false;

    longPressTimer.current =
      setTimeout(() => {
        didLongPress.current =
          true;

        setIsReactionPickerOpen(
          true
        );

        setHoveredReaction(
          "❤️"
        );

        if (
          "vibrate" in
          navigator
        ) {
          navigator.vibrate(
            20
          );
        }
      }, 350);
  }

  function cancelLongPressTimer() {
    if (
      longPressTimer.current
    ) {
      clearTimeout(
        longPressTimer.current
      );

      longPressTimer.current =
        null;
    }
  }

  function updateReactionFromPointer(
    clientX: number
  ) {
    if (
      !isReactionPickerOpen
    ) {
      return;
    }

    const button =
      reactionButtonRef.current;

    if (!button) return;

    const rect =
      button.getBoundingClientRect();

    const pickerWidth = 260;

    const pickerLeft =
      rect.left +
      rect.width / 2 -
      pickerWidth / 2;

    const relativeX =
      clientX -
      pickerLeft;

    const itemWidth =
      pickerWidth /
      reactionTypes.length;

    const index = Math.max(
      0,
      Math.min(
        reactionTypes.length -
          1,
        Math.floor(
          relativeX /
            itemWidth
        )
      )
    );

    const nextReaction =
      reactionTypes[index];

    if (
      nextReaction !==
      hoveredReaction
    ) {
      setHoveredReaction(
        nextReaction
      );

      if (
        "vibrate" in
        navigator
      ) {
        navigator.vibrate(
          10
        );
      }
    }
  }

  async function finishReactionPress() {
    cancelLongPressTimer();

    if (
      isReactionPickerOpen &&
      hoveredReaction
    ) {
      await toggleReaction(
        hoveredReaction
      );
    }

    setIsReactionPickerOpen(
      false
    );

    setHoveredReaction(
      null
    );
  }

  async function handleQuickReaction() {
    if (
      didLongPress.current
    ) {
      didLongPress.current =
        false;
      return;
    }

    await toggleReaction(
      "❤️"
    );
  }

  async function saveFaceReaction(
    file: File
  ) {
    if (
      isFaceUploading ||
      !currentUserId
    ) {
      return;
    }

    setIsFaceUploading(true);

    const extension =
      file.name
        .split(".")
        .pop() ?? "jpg";

    const filePath =
      `face-reactions/${postId}/${crypto.randomUUID()}.${extension}`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from("photo")
        .upload(
          filePath,
          file,
          {
            contentType:
              file.type,
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        "リアクション画像アップロード失敗:",
        uploadError
      );

      setIsFaceUploading(
        false
      );
      return;
    }

    const {
      data: publicUrlData,
    } =
      supabase.storage
        .from("photo")
        .getPublicUrl(
          filePath
        );

    const imageUrl =
      publicUrlData.publicUrl;

    const {
      data,
      error: insertError,
    } = await supabase
      .from(
        "face_reactions"
      )
      .insert({
        post_id: postId,
        user_id:
          currentUserId,
        user_name:
          currentUser,
        image_url:
          imageUrl,
      })
      .select(
        "id, user_id, user_name, image_url"
      )
      .single();

    if (insertError) {
      console.error(
        "リアクション保存失敗:",
        insertError
      );

      await supabase.storage
        .from("photo")
        .remove([
          filePath,
        ]);

      setIsFaceUploading(
        false
      );
      return;
    }

    setFaceReactions(
      (current) => [
        ...current,
        data,
      ]
    );

    setIsFaceUploading(
      false
    );
  }

  async function handleDeletePost() {
    const shouldDelete =
      window.confirm(
        "この投稿を削除しますか？"
      );

    if (!shouldDelete) {
      return;
    }

    let postImagePath:
      | string
      | null = null;

    if (image) {
      const marker =
        "/storage/v1/object/public/photo/";

      const markerIndex =
        image.indexOf(
          marker
        );

      if (
        markerIndex !== -1
      ) {
        postImagePath =
          decodeURIComponent(
            image.slice(
              markerIndex +
                marker.length
            )
          );
      }
    }

    const faceImagePaths =
      faceReactions
        .map(
          (reaction) => {
            const marker =
              "/storage/v1/object/public/photo/";

            const markerIndex =
              reaction.image_url.indexOf(
                marker
              );

            if (
              markerIndex ===
              -1
            ) {
              return null;
            }

            return decodeURIComponent(
              reaction.image_url.slice(
                markerIndex +
                  marker.length
              )
            );
          }
        )
        .filter(
          (
            path
          ): path is string =>
            path !== null
        );

    await supabase
      .from("comments")
      .delete()
      .eq(
        "post_id",
        postId
      );

    await supabase
      .from("reactions")
      .delete()
      .eq(
        "post_id",
        postId
      );

    await supabase
      .from(
        "face_reactions"
      )
      .delete()
      .eq(
        "post_id",
        postId
      );

    const {
      error:
        postDeleteError,
    } = await supabase
      .from("posts")
      .delete()
      .eq(
        "id",
        postId
      );

    if (
      postDeleteError
    ) {
      console.error(
        "投稿削除エラー:",
        postDeleteError
      );
      return;
    }

    if (postImagePath) {
      const {
        error:
          imageDeleteError,
      } =
        await supabase.storage
          .from("photo")
          .remove([
            postImagePath,
          ]);

      if (
        imageDeleteError
      ) {
        console.error(
          "投稿写真削除エラー:",
          imageDeleteError
        );
      }
    }

    if (
      faceImagePaths.length >
      0
    ) {
      const {
        error:
          faceImageDeleteError,
      } =
        await supabase.storage
          .from("photo")
          .remove(
            faceImagePaths
          );

      if (
        faceImageDeleteError
      ) {
        console.error(
          "リアクション画像削除エラー:",
          faceImageDeleteError
        );
      }
    }

    window.location.reload();
  }

  async function handleDeleteFaceReaction(
    reaction: FaceReaction
  ) {
    const shouldDelete =
      window.confirm(
        "このリアクションを削除しますか？"
      );

    if (!shouldDelete) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "face_reactions"
        )
        .delete()
        .eq(
          "id",
          reaction.id
        );

    if (error) {
      console.error(
        "リアクション削除エラー:",
        error
      );
      return;
    }

    setFaceReactions(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            reaction.id
        )
    );

    setSelectedFaceReaction(
      null
    );
  }

  return (
    <div className="relative flex gap-4">
      {/* タイムラインアイコン */}
      <div className="relative z-10 mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[#f4f1e9] bg-white text-lg shadow-sm">
        {emoji}
      </div>

      <article className="flex-1 overflow-hidden rounded-[26px] bg-white shadow-[0_10px_30px_rgba(57,69,54,0.07)]">
        {/* 投稿写真 */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setIsOpen(true)
            }
            className="relative block aspect-[4/3] w-full"
          >
            <Image
              src={image}
              alt={`${user}の投稿写真`}
              fill
              className="object-cover"
              unoptimized
            />
          </button>
        </div>

        <div className="p-5">
          {/* 投稿者 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[#e8ede4]">
                {currentProfile?.avatar_url ? (
                  <Image
                    src={
                      currentProfile.avatar_url
                    }
                    alt={`${user}のプロフィール画像`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">
                    👤
                  </div>
                )}
              </div>

              <p className="font-bold">
                {currentProfile?.user_name ??
                  user}
              </p>
            </div>

            <p className="text-xs text-[#92958e]">
              {time}
            </p>
          </div>

          {/* 投稿本文 */}
          <p className="mt-3 text-sm leading-6 text-[#656961]">
            {comment}
          </p>

          {postUserId ===
            currentUserId && (
            <button
              type="button"
              onClick={
                handleDeletePost
              }
              className="mt-3 text-xs font-bold text-red-500"
            >
              投稿を削除
            </button>
          )}

          {/* 通常リアクション */}
          <div className="relative mt-5">
            {isReactionPickerOpen && (
              <div className="absolute bottom-[58px] left-0 z-40 flex h-16 w-[260px] items-center justify-around rounded-full border border-[#e7e4dc] bg-white px-2 shadow-[0_12px_35px_rgba(40,50,38,0.18)]">
                {reactionTypes.map(
                  (
                    reactionType
                  ) => {
                    const selected =
                      hoveredReaction ===
                      reactionType;

                    return (
                      <div
                        key={
                          reactionType
                        }
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-all duration-100 ${
                          selected
                            ? "-translate-y-2 scale-125 bg-[#eef3e9] shadow-md"
                            : "scale-100"
                        }`}
                      >
                        {
                          reactionType
                        }
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                ref={
                  reactionButtonRef
                }
                type="button"
                onPointerDown={(
                  event
                ) => {
                  event.currentTarget.setPointerCapture(
                    event.pointerId
                  );

                  startReactionPress();
                }}
                onPointerMove={(
                  event
                ) => {
                  if (
                    isReactionPickerOpen
                  ) {
                    updateReactionFromPointer(
                      event.clientX
                    );
                  }
                }}
                onPointerUp={async () => {
                  if (
                    isReactionPickerOpen
                  ) {
                    await finishReactionPress();
                    return;
                  }

                  cancelLongPressTimer();

                  await handleQuickReaction();
                }}
                onPointerCancel={() => {
                  cancelLongPressTimer();

                  setIsReactionPickerOpen(
                    false
                  );

                  setHoveredReaction(
                    null
                  );
                }}
                onContextMenu={(
                  event
                ) =>
                  event.preventDefault()
                }
                disabled={
                  reactionLoading !==
                  null
                }
                className="touch-none rounded-full bg-[#f5f3ee] px-4 py-2.5 text-sm font-bold text-[#596153] transition active:scale-95"
              >
                ♡ リアクション
              </button>

              {reactions.length > 0 && (
  <button
    type="button"
    onClick={() =>
      setIsReactionListOpen(true)
    }
    className="flex items-center -space-x-1 rounded-full transition active:scale-95"
    aria-label="リアクションした人を見る"
  >
    {reactionTypes
      .filter(
        (reactionType) =>
          getReactionCount(
            reactionType
          ) > 0
      )
      .map(
        (reactionType) => (
          <div
            key={reactionType}
            className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-[#eef2e9] px-1.5 text-sm"
          >
            {reactionType}
          </div>
        )
      )}

    <span className="ml-2 text-xs font-bold text-[#7d8279]">
      {reactions.length}
    </span>
  </button>
)}
            </div>
          </div>

          {/* コメント */}
          <div className="mt-5 border-t border-[#eeece6] pt-3">
            <button
              type="button"
              onClick={() =>
                setIsCommentOpen(
                  true
                )
              }
              className="flex w-full items-center justify-between py-2 text-sm font-semibold text-[#687562] transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <span>💬</span>
                <span>
                  コメント
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#92958e]">
                <span className="text-xs font-bold">
                  {
                    commentCount
                  }
                </span>
                <span>›</span>
              </div>
            </button>
          </div>

          {/* みんなのリアクション */}
          <div className="mt-2 rounded-[20px] bg-[#f7f6f2] p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setIsFaceReactionListOpen(
                    true
                  )
                }
                className="flex items-center gap-2 text-left transition active:scale-[0.98]"
              >
                <span className="text-sm font-bold text-[#596153]">
                  みんなのリアクション
                </span>

                {faceReactions.length >
                  0 && (
                  <span className="text-xs font-bold text-[#92958e]">
                    {
                      faceReactions.length
                    }
                  </span>
                )}

                <span className="text-xs text-[#a1a59d]">
                  ›
                </span>
              </button>

              {/* 撮影だけ */}
              <button
                type="button"
                onClick={() =>
                  setIsFaceCameraOpen(
                    true
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm transition active:scale-90"
                aria-label="リアクションを撮る"
              >
                📷
              </button>
            </div>

            {/* 小さいプレビュー */}
            {faceReactions.length >
            0 ? (
              <button
                type="button"
                onClick={() =>
                  setIsFaceReactionListOpen(
                    true
                  )
                }
                className="mt-3 flex items-center -space-x-2"
              >
                {faceReactions
                  .slice(0, 5)
                  .map(
                    (
                      reaction,
                      index
                    ) => (
                      <div
                        key={
                          reaction.id
                        }
                        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white ring-1 ring-[#dfe8d8]"
                        style={{
                          zIndex:
                            index +
                            1,
                        }}
                      >
                        <Image
                          src={
                            reaction.image_url
                          }
                          alt={`${reaction.user_name}のリアクション`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )
                  )}

                {faceReactions.length >
                  5 && (
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#e9ede5] text-xs font-bold text-[#596153]">
                    +
                    {faceReactions.length -
                      5}
                  </div>
                )}
              </button>
            ) : (
              <p className="mt-2 text-xs text-[#9a9e96]">
                まだリアクションはありません
              </p>
            )}
          </div>
        </div>
      </article>

      {/* 投稿写真拡大 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() =>
            setIsOpen(false)
          }
        >
          <div
            className="relative h-[80vh] w-[90vw]"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <Image
              src={image}
              alt={`${user}の投稿写真`}
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          <button
            type="button"
            className="absolute right-6 top-6 text-4xl text-white"
            onClick={() =>
              setIsOpen(false)
            }
          >
            ×
          </button>
        </div>
      )}
      {/* 通常リアクション一覧 */}
{isReactionListOpen && (
  <div
    className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 sm:items-center sm:px-6"
    onClick={() =>
      setIsReactionListOpen(false)
    }
  >
    <div
      className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-[#f7f4ed] p-6 shadow-2xl sm:rounded-[32px]"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#394536]">
            リアクション
          </h2>

          <p className="mt-1 text-xs text-[#8a8e85]">
            誰がリアクションしたか見られます
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsReactionListOpen(false)
          }
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-[#777] shadow-sm"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {reactionTypes
          .filter(
            (reactionType) =>
              getReactionCount(
                reactionType
              ) > 0
          )
          .map(
            (reactionType) => {
              const people =
                reactions.filter(
                  (reaction) =>
                    reaction.reaction_type ===
                    reactionType
                );

              return (
                <div
                  key={reactionType}
                  className="rounded-[22px] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef2e9] text-xl">
                      {reactionType}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#394536]">
                          {reactionType}
                        </p>

                        <p className="text-xs font-bold text-[#92958e]">
                          {people.length}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {people.map(
                          (reaction) => (
                            <span
                              key={
                                reaction.id
                              }
                              className="rounded-full bg-[#f5f3ee] px-3 py-1.5 text-xs font-bold text-[#596153]"
                            >
                              {reaction.user_name ||
                                "名前なし"}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
      </div>
    </div>
  </div>
)}

      {/* みんなのリアクション一覧 */}
      {isFaceReactionListOpen && (
        <div
          className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 sm:items-center sm:px-6"
          onClick={() =>
            setIsFaceReactionListOpen(
              false
            )
          }
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-[#f7f4ed] p-6 shadow-2xl sm:rounded-[32px]"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#394536]">
                  みんなのリアクション
                </h2>

                <p className="mt-1 text-xs text-[#8a8e85]">
                  この投稿を見たみんな
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsFaceReactionListOpen(
                    false
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-[#777] shadow-sm"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            {faceReactions.length >
            0 ? (
              <div className="mt-6 grid grid-cols-3 gap-4">
                {faceReactions.map(
                  (
                    reaction
                  ) => (
                    <button
                      key={
                        reaction.id
                      }
                      type="button"
                      onClick={() => {
                        setIsFaceReactionListOpen(
                          false
                        );

                        setSelectedFaceReaction(
                          reaction
                        );
                      }}
                      className="text-center transition active:scale-95"
                    >
                      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-[22px] bg-white shadow-sm">
                        <Image
                          src={
                            reaction.image_url
                          }
                          alt={`${reaction.user_name}のリアクション`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>

                      <p className="mt-2 truncate text-xs font-bold text-[#596153]">
                        {
                          reaction.user_name
                        }
                      </p>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-3xl">
                  📷
                </p>

                <p className="mt-3 text-sm font-semibold text-[#777c73]">
                  まだリアクションはありません
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsFaceReactionListOpen(
                  false
                );

                setIsFaceCameraOpen(
                  true
                );
              }}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#394536] font-bold text-white transition active:scale-[0.98]"
            >
              <span>📷</span>
              <span>
                リアクションを撮る
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 1人のリアクション拡大 */}
      {selectedFaceReaction && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-6"
          onClick={() =>
            setSelectedFaceReaction(
              null
            )
          }
        >
          <div
            className="relative w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={() =>
                setSelectedFaceReaction(
                  null
                )
              }
              className="absolute right-5 top-4 z-10 text-3xl text-[#777]"
              aria-label="閉じる"
            >
              ×
            </button>

            <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
              REACTION
            </p>

            <div className="relative mx-auto mt-6 h-64 w-64 overflow-hidden rounded-full ring-4 ring-[#dfe8d8]">
              <Image
                src={
                  selectedFaceReaction.image_url
                }
                alt={`${selectedFaceReaction.user_name}のリアクション`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>

            <p className="mt-6 text-xl font-bold text-[#394536]">
              {
                selectedFaceReaction.user_name
              }
            </p>

            {selectedFaceReaction.user_id ===
              currentUserId && (
              <button
                type="button"
                onClick={() =>
                  handleDeleteFaceReaction(
                    selectedFaceReaction
                  )
                }
                className="mt-5 rounded-2xl bg-red-50 px-5 py-3 text-sm font-bold text-red-600"
              >
                このリアクションを削除
              </button>
            )}
          </div>
        </div>
      )}

      {/* コメント */}
      <CommentModal
        open={
          isCommentOpen
        }
        postId={postId}
        onClose={() =>
          setIsCommentOpen(
            false
          )
        }
        onCommentCountChange={
          setCommentCount
        }
      />

      {/* 撮影 */}
      <FaceReactionCamera
        open={
          isFaceCameraOpen
        }
        onClose={() =>
          setIsFaceCameraOpen(
            false
          )
        }
        onCapture={async (
          file
        ) => {
          await saveFaceReaction(
            file
          );
        }}
      />
    </div>
  );
}