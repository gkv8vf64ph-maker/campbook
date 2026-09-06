"use client";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

type Profile = {
  id: number;
  user_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [isEditing, setIsEditing] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [editName, setEditName] =
    useState("");

  const [editBio, setEditBio] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [
    editProfileImage,
    setEditProfileImage,
  ] = useState<string | null>(null);

  const [
    previewObjectUrl,
    setPreviewObjectUrl,
  ] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  // ログイン中の本人プロフィールを取得
  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "プロフィールを見るにはログインしてください。"
        );

        setIsLoading(false);
        return;
      }

      const { data, error } =
        await supabase
          .from("profiles")
          .select(
            "id, user_name, avatar_url, bio"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (error) {
        console.error(
          "プロフィール取得エラー:",
          error.message
        );

        setErrorMessage(
          "プロフィールを読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      setProfile(
        (data as Profile | null) ?? null
      );

      setIsLoading(false);
    }

    fetchProfile();
  }, []);

  // プレビューURLを解放
  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(
          previewObjectUrl
        );
      }
    };
  }, [previewObjectUrl]);

  function startEditing() {
    setEditName(
      profile?.user_name ?? ""
    );

    setEditBio(
      profile?.bio ?? ""
    );

    setEditProfileImage(
      profile?.avatar_url ?? null
    );

    setSelectedFile(null);
    setPreviewObjectUrl(null);
    setErrorMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setSelectedFile(null);
    setPreviewObjectUrl(null);
    setErrorMessage("");
    setIsEditing(false);
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

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
        "10MB以下の画像を選択してください。"
      );

      event.target.value = "";
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewObjectUrl(previewUrl);
    setEditProfileImage(previewUrl);
    setErrorMessage("");
  }

  async function saveProfile() {
    if (isSaving) return;

    const trimmedName =
      editName.trim();

    if (!trimmedName) {
      setErrorMessage(
        "名前を入力してください。"
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "ログイン情報を取得できませんでした。"
      );

      setIsSaving(false);
      return;
    }

    let avatarUrl =
      profile?.avatar_url ?? null;

    let uploadedFilePath:
      | string
      | null = null;

    // 新しい画像が選ばれている場合
    if (selectedFile) {
      const fileNameParts =
        selectedFile.name.split(".");

      const extension =
        fileNameParts.length > 1
          ? fileNameParts
              .pop()
              ?.toLowerCase() || "jpg"
          : "jpg";

      uploadedFilePath =
        `profiles/${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("photo")
          .upload(
            uploadedFilePath,
            selectedFile,
            {
              contentType:
                selectedFile.type,
              upsert: false,
            }
          );

      if (uploadError) {
        console.error(
          "プロフィール画像保存エラー:",
          uploadError.message
        );

        setErrorMessage(
          "画像を保存できませんでした。"
        );

        setIsSaving(false);
        return;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("photo")
          .getPublicUrl(
            uploadedFilePath
          );

      avatarUrl =
        publicUrlData.publicUrl;
    }

    const profileValues = {
      user_name: trimmedName,
      avatar_url: avatarUrl,
      bio: editBio.trim() || null,
    };

    if (profile) {
      // 既存プロフィールを更新
      const { data, error } =
        await supabase
          .from("profiles")
          .update(profileValues)
          .eq("id", profile.id)
          .eq("user_id", user.id)
          .select(
            "id, user_name, avatar_url, bio"
          )
          .single();

      if (error) {
        console.error(
          "プロフィール更新エラー:",
          error.message
        );

        // DB更新失敗時は、
        // 今回アップロードした画像を削除
        if (uploadedFilePath) {
          const { error: removeError } =
            await supabase.storage
              .from("photo")
              .remove([
                uploadedFilePath,
              ]);

          if (removeError) {
            console.error(
              "画像削除エラー:",
              removeError.message
            );
          }
        }

        setErrorMessage(
          "プロフィールを保存できませんでした。"
        );

        setIsSaving(false);
        return;
      }

      setProfile(data as Profile);
    } else {
      // プロフィールがない場合は作成
      const { data, error } =
        await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            ...profileValues,
          })
          .select(
            "id, user_name, avatar_url, bio"
          )
          .single();

      if (error) {
        console.error(
          "プロフィール作成エラー:",
          error.message
        );

        if (uploadedFilePath) {
          const { error: removeError } =
            await supabase.storage
              .from("photo")
              .remove([
                uploadedFilePath,
              ]);

          if (removeError) {
            console.error(
              "画像削除エラー:",
              removeError.message
            );
          }
        }

        setErrorMessage(
          "プロフィールを保存できませんでした。"
        );

        setIsSaving(false);
        return;
      }

      setProfile(data as Profile);
    }

    setSelectedFile(null);
    setPreviewObjectUrl(null);
    setEditProfileImage(
      avatarUrl
    );

    setIsSaving(false);
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9] p-6">
        <p className="text-sm font-semibold text-[#73776f]">
          読み込み中…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 pb-28 pt-10 text-[#252720]">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">
          プロフィール
        </h1>

        {errorMessage &&
          !isEditing && (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

        <div className="mt-8 rounded-[30px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.07)]">
          {!isEditing ? (
            <>
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-[#e8ede4]">
                {profile?.avatar_url ? (
                  <img
                    src={
                      profile.avatar_url
                    }
                    alt="プロフィール画像"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl">
                    👤
                  </div>
                )}
              </div>

              <h2 className="mt-5 text-center text-2xl font-bold">
                {profile?.user_name ||
                  "プロフィール未設定"}
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-center text-sm leading-6 text-[#73776f]">
                {profile?.bio ||
                  "ひとこと未設定"}
              </p>

              <button
                type="button"
                onClick={startEditing}
                className="mt-8 h-12 w-full rounded-2xl bg-[#394536] font-bold text-white transition active:scale-[0.99]"
              >
                プロフィールを編集
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">
                プロフィールを編集
              </h2>

              <div className="mt-6 text-center">
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-[#e8ede4]">
                  {editProfileImage ? (
                    <img
                      src={
                        editProfileImage
                      }
                      alt="プロフィール画像のプレビュー"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">
                      👤
                    </div>
                  )}
                </div>

                <label className="mt-3 inline-block cursor-pointer text-sm font-bold text-[#687562]">
                  写真を変更

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      handleImageChange
                    }
                    disabled={isSaving}
                  />
                </label>
              </div>

              <div className="mt-7">
                <label
                  htmlFor="profile-name"
                  className="text-sm font-bold"
                >
                  名前
                </label>

                <input
                  id="profile-name"
                  value={editName}
                  onChange={(event) => {
                    setEditName(
                      event.target.value
                    );

                    setErrorMessage("");
                  }}
                  placeholder="名前を入力"
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dedfd9] bg-[#faf9f5] px-4 outline-none transition focus:border-[#687562] focus:ring-4 focus:ring-[#687562]/10"
                  maxLength={20}
                  disabled={isSaving}
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="profile-bio"
                  className="text-sm font-bold"
                >
                  ひとこと
                </label>

                <input
                  id="profile-bio"
                  value={editBio}
                  onChange={(event) => {
                    setEditBio(
                      event.target.value
                    );

                    setErrorMessage("");
                  }}
                  placeholder="ひとことを入力"
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dedfd9] bg-[#faf9f5] px-4 outline-none transition focus:border-[#687562] focus:ring-4 focus:ring-[#687562]/10"
                  maxLength={50}
                  disabled={isSaving}
                />

                <p className="mt-2 text-right text-xs text-[#999]">
                  {editBio.length}/50
                </p>
              </div>

              {errorMessage && (
                <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                onClick={saveProfile}
                disabled={isSaving}
                className="mt-6 h-12 w-full rounded-2xl bg-[#394536] font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "保存中…"
                  : "保存する"}
              </button>

              <button
                type="button"
                onClick={
                  cancelEditing
                }
                disabled={isSaving}
                className="mt-3 h-12 w-full rounded-2xl bg-[#f1f1ed] font-bold text-[#555] transition active:scale-[0.99] disabled:opacity-50"
              >
                キャンセル
              </button>
            </>
          )}
        </div>
      </div>

      <BottomNav current="profile" />
    </main>
  );
}