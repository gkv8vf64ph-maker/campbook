"use client";

import FaceReactionCamera from "@/components/FaceReactionCamera";
import CommentModal from "@/components/CommentModal";
import { useEffect, useState } from "react";
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

const reactionTypes = ["♡", "😂", "🔥"];

export default function PostCard({
  postId,
  postUserId,
  user,
  time,
  comment,
  emoji,
  image,
}: PostCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const [isFaceCameraOpen, setIsFaceCameraOpen] = useState(false);
  const [faceReactions, setFaceReactions] = useState<FaceReaction[]>([]);
  const [isFaceUploading, setIsFaceUploading] = useState(false);

  const [selectedFaceReaction, setSelectedFaceReaction] =
    useState<FaceReaction | null>(null);

  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionLoading, setReactionLoading] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] =
  useState<string | null>(null);

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  useEffect(() => {
  async function fetchProfile() {
    if (!postUserId) {
      setCurrentProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_name, avatar_url"
      )
      .eq("user_id", postUserId)
      .maybeSingle();

    if (error) {
      console.error(
        "投稿者プロフィール取得エラー:",
        error
      );
      return;
    }

    setCurrentProfile(data ?? null);
  }

  fetchProfile();
}, [postUserId]);
useEffect(() => {
  async function fetchCurrentUser() {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return;
    }

    setCurrentUserId(authUser.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_name")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (profile?.user_name) {
      setCurrentUser(profile.user_name);
    }
  }

  fetchCurrentUser();
}, []);
  // コメント件数を取得
  useEffect(() => {
    async function fetchCommentCount() {
      const { count, error } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      if (error) {
        console.error(error);
        return;
      }

      setCommentCount(count ?? 0);
    }

    fetchCommentCount();
  }, [postId]);

  // 普通のリアクションを取得
  useEffect(() => {
    async function fetchReactions() {
      const { data, error } = await supabase
        .from("reactions")
        .select("id, user_id, reaction_type, user_name")
        .eq("post_id", postId);

      if (error) {
        console.error(error);
        return;
      }

      setReactions(data ?? []);
    }

    fetchReactions();
  }, [postId]);

  // 顔リアクションを取得
  useEffect(() => {
    async function fetchFaceReactions() {
      const { data, error } = await supabase
        .from("face_reactions")
        .select("id, user_id, user_name, image_url")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("顔リアクション取得エラー:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      setFaceReactions(data ?? []);
    }

    fetchFaceReactions();
  }, [postId]);

  async function toggleReaction(reactionType: string) {
    if (reactionLoading) return;

    setReactionLoading(reactionType);

    const existingReaction = reactions.find(
  (reaction) =>
    reaction.user_id === currentUserId &&
    reaction.reaction_type === reactionType
);

    if (existingReaction) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (error) {
        console.error(error);
        setReactionLoading(null);
        return;
      }

      setReactions((current) =>
        current.filter(
          (reaction) => reaction.id !== existingReaction.id
        )
      );

      setReactionLoading(null);
      return;
    }

    const { data, error } = await supabase
  .from("reactions")
  .insert({
    post_id: postId,
    user_id: currentUserId,
    user_name: currentUser,
    reaction_type: reactionType,
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

    setReactions((current) => [...current, data]);
    setReactionLoading(null);
  }

  function getReactionCount(reactionType: string) {
    return reactions.filter(
      (reaction) => reaction.reaction_type === reactionType
    ).length;
  }

  function hasReacted(reactionType: string) {
  return reactions.some(
    (reaction) =>
      reaction.user_id === currentUserId &&
      reaction.reaction_type === reactionType
  );
}
  async function saveFaceReaction(file: File) {
    if (isFaceUploading) return;

    setIsFaceUploading(true);

    const extension = file.name.split(".").pop() ?? "jpg";

    const filePath =
      `face-reactions/${postId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("photo")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("顔写真アップロード失敗:", {
        message: uploadError.message,
        name: uploadError.name,
      });

      setIsFaceUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("photo")
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const { data, error: insertError } = await supabase
  .from("face_reactions")
  .insert({
    post_id: postId,
    user_id: currentUserId,
    user_name: currentUser,
    image_url: imageUrl,
  })
  .select(
    "id, user_id, user_name, image_url"
  )
  .single();

    if (insertError) {
      console.error("顔リアクションDB保存失敗:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });

      await supabase.storage.from("photo").remove([filePath]);

      setIsFaceUploading(false);
      return;
    }

    setFaceReactions((current) => [...current, data]);
    setIsFaceUploading(false);
  }
  async function handleDeletePost() {
  const shouldDelete = window.confirm(
    "この投稿を削除しますか？"
  );

  if (!shouldDelete) return;

  // 投稿写真のStorageパスを作る
  let postImagePath: string | null = null;

  if (image) {
    const marker = "/storage/v1/object/public/photo/";
    const markerIndex = image.indexOf(marker);

    if (markerIndex !== -1) {
      postImagePath = decodeURIComponent(
        image.slice(markerIndex + marker.length)
      );
    }
  }

  // 顔リアクション画像のパスも取得
  const faceImagePaths = faceReactions
    .map((reaction) => {
      const marker = "/storage/v1/object/public/photo/";
      const markerIndex =
        reaction.image_url.indexOf(marker);

      if (markerIndex === -1) {
        return null;
      }

      return decodeURIComponent(
        reaction.image_url.slice(
          markerIndex + marker.length
        )
      );
    })
    .filter(
      (path): path is string =>
        path !== null
    );

  // コメント削除
  await supabase
    .from("comments")
    .delete()
    .eq("post_id", postId);

  // リアクション削除
  await supabase
    .from("reactions")
    .delete()
    .eq("post_id", postId);

  // 顔リアクション削除
  await supabase
    .from("face_reactions")
    .delete()
    .eq("post_id", postId);

  // 投稿本体を削除
  const { error: postDeleteError } =
    await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

  if (postDeleteError) {
    console.error(
      "投稿削除エラー:",
      postDeleteError
    );
    return;
  }

  // Storageの投稿写真を削除
  if (postImagePath) {
    const { error: imageDeleteError } =
      await supabase.storage
        .from("photo")
        .remove([postImagePath]);

    if (imageDeleteError) {
      console.error(
        "投稿写真削除エラー:",
        imageDeleteError
      );
    }
  }

  // Storageの顔リアクション画像を削除
  if (faceImagePaths.length > 0) {
    const { error: faceImageDeleteError } =
      await supabase.storage
        .from("photo")
        .remove(faceImagePaths);

    if (faceImageDeleteError) {
      console.error(
        "顔リアクション画像削除エラー:",
        faceImageDeleteError
      );
    }
  }

  window.location.reload();
}
  async function handleDeleteFaceReaction(
  reaction: FaceReaction
) {
  const shouldDelete = window.confirm(
    "この顔リアクションを削除しますか？"
  );

  if (!shouldDelete) return;

  const { error } = await supabase
    .from("face_reactions")
    .delete()
    .eq("id", reaction.id);

  if (error) {
    console.error(
      "顔リアクション削除エラー:",
      error
    );
    return;
  }

  setFaceReactions((current) =>
    current.filter(
      (item) => item.id !== reaction.id
    )
  );

  setSelectedFaceReaction(null);
}

  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[#f4f1e9] bg-white text-lg shadow-sm">
        {emoji}
      </div>

      <article className="flex-1 overflow-hidden rounded-[26px] bg-white shadow-[0_10px_30px_rgba(57,69,54,0.07)]">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
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
          <div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[#e8ede4]">
      {currentProfile?.avatar_url ? (
        <Image
          src={currentProfile.avatar_url}
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
      {currentProfile?.user_name ?? user}
    </p>
  </div>

  <p className="text-xs text-[#92958e]">
    {time}
  </p>
</div>

          <p className="mt-2 text-sm leading-6 text-[#656961]">
            {comment}
          </p>
{postUserId === currentUserId && (
  <button
    type="button"
    onClick={handleDeletePost}
    className="mt-3 text-xs font-bold text-red-500"
  >
    投稿を削除
  </button>
)}
        

          <div className="mt-4 flex flex-wrap gap-2">
            {reactionTypes.map((reactionType) => {
              const active = hasReacted(reactionType);
              const count = getReactionCount(reactionType);

              return (
                <button
                  key={reactionType}
                  type="button"
                  onClick={() => toggleReaction(reactionType)}
                  disabled={reactionLoading !== null}
                  className={`rounded-full px-3 py-2 text-sm transition active:scale-95 ${
                    active
                      ? "bg-[#dfe8d8] font-bold text-[#394536]"
                      : "bg-[#f5f3ee] text-[#555]"
                  }`}
                >
                  {reactionType} {count}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsFaceCameraOpen(true)}
              className="text-sm font-semibold text-[#687562]"
            >
              📸 顔リアクション
            </button>

            <button
              type="button"
              onClick={() => setIsCommentOpen(true)}
              className="text-sm font-semibold text-[#687562]"
            >
              コメント {commentCount}件
            </button>
          </div>

          {faceReactions.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-[#7b8475]">
                顔リアクション
              </p>

              <div className="flex -space-x-2">
  {faceReactions.slice(0, 5).map((reaction, index) => (
    <button
      key={reaction.id}
      type="button"
      onClick={() => {
        console.log("顔をクリック:", reaction);
        setSelectedFaceReaction(reaction);
      }}
      className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-white ring-1 ring-[#dfe8d8] transition active:scale-95"
      style={{ zIndex: index + 1 }}
    >
      <Image
        src={reaction.image_url}
        alt={`${reaction.user_name}の顔リアクション`}
        fill
        unoptimized
        className="pointer-events-none object-cover"
      />
    </button>
  ))}

                {faceReactions.length > 5 && (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#eef2e9] text-xs font-bold text-[#52644b]">
                    +{faceReactions.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* 投稿写真拡大 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative h-[80vh] w-[90vw]"
            onClick={(event) => event.stopPropagation()}
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
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
        </div>
      )}

      {/* 顔リアクション拡大 */}
{selectedFaceReaction && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 px-6"
    onClick={() => setSelectedFaceReaction(null)}
  >
    <div
      className="relative w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setSelectedFaceReaction(null)}
        className="absolute right-5 top-4 z-10 text-3xl text-[#777]"
        aria-label="閉じる"
      >
        ×
      </button>

      <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
        FACE REACTION
      </p>

      <div className="relative mx-auto mt-6 h-64 w-64 overflow-hidden rounded-full ring-4 ring-[#dfe8d8]">
        <Image
          src={selectedFaceReaction.image_url}
          alt={`${selectedFaceReaction.user_name}の顔リアクション`}
          fill
          unoptimized
          className="object-cover"
        />
      </div>

      <p className="mt-6 text-xl font-bold text-[#394536]">
        {selectedFaceReaction.user_name}
      </p>

      <p className="mt-1 text-sm text-[#8a8e85]">
        顔リアクション
      </p>
      {selectedFaceReaction.user_id === currentUserId && (
  <button
    type="button"
    onClick={() =>
      handleDeleteFaceReaction(
        selectedFaceReaction
      )
    }
    className="mt-5 rounded-2xl bg-red-50 px-5 py-3 text-sm font-bold text-red-600"
  >
    この顔リアクションを削除
  </button>
)}
    </div>
  </div>
)}

      <CommentModal
        open={isCommentOpen}
        postId={postId}
        onClose={() => setIsCommentOpen(false)}
        onCommentCountChange={setCommentCount}
      />

      <FaceReactionCamera
        open={isFaceCameraOpen}
        onClose={() => setIsFaceCameraOpen(false)}
        onCapture={async (file) => {
          await saveFaceReaction(file);
        }}
      />
    </div>
  );
}