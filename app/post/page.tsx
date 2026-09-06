"use client";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function PostPage() {
  const router = useRouter();

  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [comment, setComment] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [currentUser, setCurrentUser] =
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
    }
  }, []);

  // ログイン中のユーザー名を取得
  useEffect(() => {
    async function fetchCurrentUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "投稿するにはログインしてください。"
        );
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("user_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.log(
          "プロフィール取得エラー:",
          profileError?.message
        );

        setErrorMessage(
          "プロフィールを取得できませんでした。"
        );
        return;
      }

      setCurrentUser(profile.user_name);
    }

    fetchCurrentUser();
  }, []);

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "画像ファイルを選択してください。"
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage(
        "10MB以下の写真を選択してください。"
      );

      event.target.value = "";
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(previewUrl);
    setErrorMessage("");
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    const trimmedComment =
      comment.trim();

    if (!currentEventId) {
      setErrorMessage(
        "参加中のイベントが見つかりません。"
      );
      return;
    }

    if (!selectedFile) {
      setErrorMessage(
        "写真を選択してください。"
      );
      return;
    }

    if (!trimmedComment) {
      setErrorMessage(
        "コメントを入力してください。"
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "投稿するにはログインしてください。"
      );

      setIsSubmitting(false);
      return;
    }

    if (!currentUser) {
      setErrorMessage(
        "プロフィールを取得できませんでした。"
      );

      setIsSubmitting(false);
      return;
    }

    const fileNameParts =
      selectedFile.name.split(".");

    const extension =
      fileNameParts.length > 1
        ? fileNameParts
            .pop()
            ?.toLowerCase() || "jpg"
        : "jpg";

    const filePath =
      `event-${currentEventId}/${user.id}/${crypto.randomUUID()}.${extension}`;

    // 写真をアップロード
    const { error: uploadError } =
      await supabase.storage
        .from("photo")
        .upload(
          filePath,
          selectedFile,
          {
            contentType:
              selectedFile.type,
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        "写真アップロードエラー:",
        uploadError.message
      );

      setErrorMessage(
        "写真を保存できませんでした。"
      );

      setIsSubmitting(false);
      return;
    }

    // 公開URLを取得
    const { data: publicUrlData } =
      supabase.storage
        .from("photo")
        .getPublicUrl(filePath);

    const imageUrl =
      publicUrlData.publicUrl;

    // 投稿を保存
    const { error: insertError } =
      await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          user_name: currentUser,
          comment: trimmedComment,
          image_url: imageUrl,
          event_id: currentEventId,
        });

    if (insertError) {
      console.error(
        "投稿保存エラー:",
        insertError.message
      );

      // 投稿保存に失敗した場合は画像を削除
      const { error: removeError } =
        await supabase.storage
          .from("photo")
          .remove([filePath]);

      if (removeError) {
        console.error(
          "画像削除エラー:",
          removeError.message
        );
      }

      setErrorMessage(
        "投稿できませんでした。もう一度お試しください。"
      );

      setIsSubmitting(false);
      return;
    }

    router.push("/timeline");
  }

  // プレビューURLを解放
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <main className="min-h-screen bg-[#f7f5ef] p-6 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/timeline"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← タイムラインへ戻る
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold">
            新しい投稿
          </h1>

          <p className="mt-2 text-sm text-[#777c73]">
            写真とコメントを投稿できます。
          </p>
        </div>

        {currentUser && (
          <div className="mt-5 rounded-2xl bg-[#eef2e9] px-4 py-3 text-sm text-[#52644b]">
            <span className="font-bold">
              {currentUser}
            </span>
            として投稿
          </div>
        )}

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          {/* 写真 */}
          <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#d9ddd5] bg-[#fafbf8] transition active:scale-[0.99]">
            {preview ? (
              <img
                src={preview}
                alt="選択した写真"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="px-4 text-center">
                <span className="text-6xl">
                  📷
                </span>

                <p className="mt-3 text-sm font-bold text-[#5f645b]">
                  写真を選ぶ
                </p>

                <p className="mt-1 text-xs text-[#92958e]">
                  タップして写真を追加
                </p>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={isSubmitting}
            />
          </label>

          {selectedFile && (
            <p className="mt-2 truncate text-xs text-[#858980]">
              {selectedFile.name}
            </p>
          )}

          {/* コメント */}
          <label
            htmlFor="post-comment"
            className="mt-6 block text-sm font-bold text-[#394536]"
          >
            コメント
          </label>

          <textarea
            id="post-comment"
            value={comment}
            onChange={(event) => {
              setComment(
                event.target.value
              );
              setErrorMessage("");
            }}
            className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-[#d9ddd5] bg-[#fafbf8] p-4 outline-none transition focus:border-[#5d6b56] focus:ring-4 focus:ring-[#5d6b56]/10"
            placeholder="コメントを書く"
            maxLength={300}
            disabled={isSubmitting}
          />

          <div className="mt-1 text-right text-xs text-[#92958e]">
            {comment.length}/300
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !currentEventId ||
              !currentUser
            }
            className="mt-6 w-full rounded-2xl bg-[#5d6b56] py-4 font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "投稿中…"
              : "投稿する"}
          </button>
        </div>
      </div>
    </main>
  );
}