"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Comment = {
  id: number;
  created_at: string;
  post_id: number;
  user_id: string | null;
  user_name: string;
  comment: string;
};

type Profile = {
  user_id: string | null;
  user_name: string;
  avatar_url: string | null;
};

type Props = {
  open: boolean;
  postId: number;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
};

export default function CommentModal({
  open,
  postId,
  onClose,
  onCommentCountChange,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [deletingCommentId, setDeletingCommentId] =
    useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [currentUser, setCurrentUser] = useState("");
  const [currentUserId, setCurrentUserId] =
  useState<string | null>(null);

  // この端末に保存されているユーザー名を取得
useEffect(() => {
  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.user_name) {
      setCurrentUser(profile.user_name);
    }
  }

  fetchCurrentUser();
}, []);

  // コメントとプロフィールを取得
  useEffect(() => {
    if (!open) return;

    async function fetchComments() {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: commentData,
        error: commentError,
      } = await supabase
        .from("comments")
        .select(
  "id, created_at, post_id, user_id, user_name, comment"
)
        .eq("post_id", postId)
        .order("created_at", {
          ascending: true,
        });

      if (commentError) {
        setErrorMessage(
          `コメントの取得に失敗しました：${commentError.message}`
        );

        setIsLoading(false);
        return;
      }

      const loadedComments =
        commentData ?? [];

      setComments(loadedComments);

      onCommentCountChange?.(
        loadedComments.length
      );

      // プロフィール一覧を取得
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
  "user_id, user_name, avatar_url"
);
      if (profileError) {
        console.error(
          "プロフィール一覧取得エラー:",
          profileError
        );
      } else {
        setProfiles(profileData ?? []);
      }

      setIsLoading(false);
    }

    fetchComments();
  }, [
    open,
    postId,
    onCommentCountChange,
  ]);

  function getProfile(
  userId: string | null
) {
  return profiles.find(
    (profile) =>
      profile.user_id === userId
  );
}

  // コメント送信
  async function handleSend() {
    const text = newComment.trim();

    if (!text || isSending) return;

    setIsSending(true);
    setErrorMessage("");
    const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  setErrorMessage(
    "ログイン情報を確認できませんでした。"
  );
  setIsSending(false);
  return;
}

    const { data, error } =
      await supabase
        .from("comments")
        .insert({
  post_id: postId,
  user_id: user.id,
  user_name: currentUser,
  comment: text,
})
.select(
  "id, created_at, post_id, user_id, user_name, comment"
)
        .single();

    if (error) {
      setErrorMessage(
        `コメントの送信に失敗しました：${error.message}`
      );

      setIsSending(false);
      return;
    }

    const updatedComments = [
      ...comments,
      data,
    ];

    setComments(updatedComments);
    setNewComment("");

    onCommentCountChange?.(
      updatedComments.length
    );
    try {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    const response = await fetch(
      "/api/push/comment",
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
          commentId: data.id,
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      console.error(
        "コメント通知エラー:",
        result
      );
    }
  }
} catch (error) {
  console.error(
    "コメント通知送信エラー:",
    error
  );
}

    setIsSending(false);
  }

  // コメント削除
  async function handleDeleteComment(
    commentId: number
  ) {
    const shouldDelete =
      window.confirm(
        "このコメントを削除しますか？"
      );

    if (!shouldDelete) return;

    if (deletingCommentId !== null) {
      return;
    }

    setDeletingCommentId(commentId);
    setErrorMessage("");

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error(
        "コメント削除エラー:",
        error
      );

      setErrorMessage(
        `コメントを削除できませんでした：${error.message}`
      );

      setDeletingCommentId(null);
      return;
    }

    const updatedComments =
      comments.filter(
        (item) =>
          item.id !== commentId
      );

    setComments(updatedComments);

    onCommentCountChange?.(
      updatedComments.length
    );

    setDeletingCommentId(null);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 mx-auto max-h-[75vh] max-w-md rounded-t-3xl bg-white p-6"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#252720]">
            コメント
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-[#777]"
          >
            ×
          </button>
        </div>

        <div className="mt-6 max-h-[40vh] space-y-5 overflow-y-auto">
          {isLoading && (
            <p className="text-sm text-gray-500">
              読み込んでいます…
            </p>
          )}

          {!isLoading &&
            comments.length === 0 && (
              <p className="text-sm text-gray-500">
                まだコメントはありません。
              </p>
            )}

          {comments.map((item) => {
            const profile =
  getProfile(
    item.user_id
  );

const isOwnComment =
  item.user_id ===
  currentUserId;

            return (
              <div
                key={item.id}
                className="flex items-start gap-3"
              >
                {/* プロフィール画像 */}
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#e8ede4]">
                  {profile?.avatar_url ? (
                    <img
                      src={
                        profile.avatar_url
                      }
                      alt={`${item.user_name}のプロフィール画像`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      👤
                    </div>
                  )}
                </div>

                {/* コメント */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-[#394536]">
                      {item.user_name}
                    </p>

                    {isOwnComment && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteComment(
                            item.id
                          )
                        }
                        disabled={
                          deletingCommentId ===
                          item.id
                        }
                        className="text-xs font-bold text-red-500 disabled:opacity-50"
                      >
                        {deletingCommentId ===
                        item.id
                          ? "削除中…"
                          : "削除"}
                      </button>
                    )}
                  </div>

                  <p className="mt-1 break-words text-sm leading-6 text-[#555]">
                    {item.comment}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <p className="mt-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex gap-2 border-t pt-4">
          <input
            value={newComment}
            onChange={(event) =>
              setNewComment(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                handleSend();
              }
            }}
            placeholder="コメントを書く..."
            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-[#252720] outline-none focus:border-[#5d6b56]"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="rounded-xl bg-[#5d6b56] px-5 font-bold text-white disabled:opacity-60"
          >
            {isSending
              ? "送信中"
              : "送信"}
          </button>
        </div>
      </div>
    </div>
  );
}