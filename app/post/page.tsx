"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

export default function PostPage() {
  const router = useRouter();

  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [comment, setComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  // 現在参加中のイベントを取得
  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    }
  }, []);

  // ログイン中ユーザーのプロフィールを取得
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
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(previewUrl);
    setErrorMessage("");
  }

  async function handleSubmit() {
    const trimmedComment = comment.trim();

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

    if (!currentUser) {
      setErrorMessage(
        "プロフィール情報を取得できませんでした。"
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const extension =
      selectedFile.name.split(".").pop() ?? "jpg";

    const filePath =
      `event-${currentEventId}/${crypto.randomUUID()}.${extension}`;

    // ① 写真をStorageへアップロード
    const { error: uploadError } =
      await supabase.storage
        .from("photo")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "写真アップロードエラー:",
        uploadError
      );

      setErrorMessage(
        `写真の保存に失敗しました：${uploadError.message}`
      );

      setIsSubmitting(false);
      return;
    }

    // ② 公開URLを取得
    const { data: publicUrlData } =
      supabase.storage
        .from("photo")
        .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    // ③ postsへ投稿を保存
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
        insertError
      );

      // DB保存に失敗したらアップロード画像も削除
      await supabase.storage
        .from("photo")
        .remove([filePath]);

      setErrorMessage(
        `投稿に失敗しました：${insertError.message}`
      );

      setIsSubmitting(false);
      return;
    }

    router.push("/timeline");
  }

  // プレビューURLを後片付け
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

        <h1 className="mt-6 text-3xl font-bold">
          新しい投稿
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          この時間の思い出を残そう。
        </p>

        <div className="mt-4 rounded-2xl bg-[#eef2e9] px-4 py-3 text-sm text-[#52644b]">
          <span className="font-bold">
            {currentUser || "名前未設定"}
          </span>
          として投稿します
        </div>

        <div className="mt-6 rounded-3xl bg-white p-6 shadow">
          {/* 写真選択 */}
          <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50">
            {preview ? (
              <img
                src={preview}
                alt="選択した写真のプレビュー"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center">
                <span className="text-6xl">
                  📷
                </span>

                <p className="mt-3 text-sm font-semibold text-gray-600">
                  写真を選択
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  クリックして画像を追加
                </p>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>

          {selectedFile && (
            <p className="mt-2 truncate text-xs text-gray-500">
              選択中：{selectedFile.name}
            </p>
          )}

          {/* コメント */}
          <textarea
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setErrorMessage("");
            }}
            className="mt-6 min-h-28 w-full resize-none rounded-xl border border-gray-200 p-3 outline-none transition focus:border-[#5d6b56] focus:ring-4 focus:ring-[#5d6b56]/10"
            placeholder="今日の思い出を書こう！"
            maxLength={300}
          />

          <div className="mt-1 text-right text-xs text-gray-400">
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
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-[#5d6b56] py-4 font-bold text-white transition hover:bg-[#4d5a47] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "投稿しています…"
              : "投稿する"}
          </button>
        </div>
      </div>
    </main>
  );
}