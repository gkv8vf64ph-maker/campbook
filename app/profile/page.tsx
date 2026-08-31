"use client";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

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
    errorMessage,
    setErrorMessage,
  ] = useState("");

  

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

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, user_name, avatar_url, bio"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "プロフィール取得エラー:",
        error
      );

      setErrorMessage(
        "プロフィールの取得に失敗しました。"
      );

      setIsLoading(false);
      return;
    }

    setProfile(data ?? null);
    setIsLoading(false);
  }

  fetchProfile();
}, []);

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
    setErrorMessage("");
    setIsEditing(true);
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith("image/")
    ) {
      setErrorMessage(
        "画像ファイルを選択してください。"
      );
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setEditProfileImage(previewUrl);
    setErrorMessage("");
  }

  async function saveProfile() {
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

    let avatarUrl =
      profile?.avatar_url ?? null;

    // 新しい写真が選ばれていたらアップロード
    if (selectedFile) {
      const extension =
        selectedFile.name
          .split(".")
          .pop() ?? "jpg";

      const filePath =
        `profiles/${crypto.randomUUID()}.${extension}`;

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
          "プロフィール画像保存エラー:",
          uploadError
        );

        setErrorMessage(
          `画像の保存に失敗しました：${uploadError.message}`
        );

        setIsSaving(false);
        return;
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("photo")
        .getPublicUrl(filePath);

      avatarUrl =
        publicUrlData.publicUrl;
    }

    if (profile) {
      // 既存プロフィールを更新
      const { data, error } =
        await supabase
          .from("profiles")
          .update({
            user_name:
              trimmedName,
            avatar_url:
              avatarUrl,
            bio:
              editBio.trim() ||
              null,
          })
          .eq("id", profile.id)
          .select(
            "id, user_name, avatar_url, bio"
          )
          .single();

      if (error) {
        console.error(
          "プロフィール更新エラー:",
          error
        );

        setErrorMessage(
          `プロフィール更新に失敗しました：${error.message}`
        );

        setIsSaving(false);
        return;
      }

      setProfile(data);
    } else {
      // プロフィールがまだなければ作成
      const { data, error } =
        await supabase
          .from("profiles")
          .insert({
  user_id: user.id,
  user_name: trimmedName,
  avatar_url: avatarUrl,
  bio: editBio.trim() || null,
})
          .select(
            "id, user_name, avatar_url, bio"
          )
          .single();

      if (error) {
        console.error(
          "プロフィール作成エラー:",
          error
        );

        setErrorMessage(
          `プロフィール作成に失敗しました：${error.message}`
        );

        setIsSaving(false);
        return;
      }

      setProfile(data);
    }

    // この端末のユーザー名も更新
    

    setSelectedFile(null);
    setIsSaving(false);
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f4f1e9] p-6">
        <p className="text-center text-[#73776f]">
          プロフィールを読み込んでいます…
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

              <p className="mt-2 text-center text-sm text-[#73776f]">
                {profile?.bio ||
                  "ひとこと未設定"}
              </p>

              <button
                type="button"
                onClick={
                  startEditing
                }
                className="mt-8 h-12 w-full rounded-2xl bg-[#394536] font-bold text-white"
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
                  />
                </label>
              </div>

              <div className="mt-7">
                <label className="text-sm font-bold">
                  名前
                </label>

                <input
                  value={editName}
                  onChange={(
                    event
                  ) =>
                    setEditName(
                      event.target.value
                    )
                  }
                  placeholder="名前を入力"
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dedfd9] bg-[#faf9f5] px-4 outline-none focus:border-[#687562]"
                  maxLength={20}
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold">
                  ひとこと
                </label>

                <input
                  value={editBio}
                  onChange={(
                    event
                  ) =>
                    setEditBio(
                      event.target.value
                    )
                  }
                  placeholder="ひとことを入力"
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dedfd9] bg-[#faf9f5] px-4 outline-none focus:border-[#687562]"
                  maxLength={50}
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
                onClick={
                  saveProfile
                }
                disabled={
                  isSaving
                }
                className="mt-6 h-12 w-full rounded-2xl bg-[#394536] font-bold text-white disabled:opacity-50"
              >
                {isSaving
                  ? "保存中…"
                  : "保存する"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setIsEditing(
                    false
                  )
                }
                disabled={
                  isSaving
                }
                className="mt-3 h-12 w-full rounded-2xl bg-[#f1f1ed] font-bold text-[#555]"
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