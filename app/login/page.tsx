"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleLogin() {
     
  const normalizedEmail =
    email.trim().toLowerCase();

  if (!normalizedEmail) {
    setErrorMessage("メールアドレスを入力してください。");
    return;
  }

  if (!password) {
    setErrorMessage("パスワードを入力してください。");
    return;
  }

  if (isLoading) return;

  setIsLoading(true);
  setErrorMessage("");

  const { data, error: loginError } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (loginError) {
    setErrorMessage(
      "メールアドレスまたはパスワードが違います。"
    );
    setIsLoading(false);
    return;
  }

  const user = data.user;

  if (!user) {
    setErrorMessage("ユーザー情報を取得できませんでした。");
    setIsLoading(false);
    return;
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("user_name")
      .eq("user_id", user.id)
      .maybeSingle();

  if (profileError || !profile) {
    setErrorMessage(
      "プロフィールを読み込めませんでした。"
    );
    setIsLoading(false);
    return;
  }

  const pendingJoinCode = localStorage.getItem(
    "campbook-pending-join-code"
  );

  if (pendingJoinCode) {
    localStorage.removeItem(
      "campbook-pending-join-code"
    );

    router.push(
      `/join?code=${encodeURIComponent(pendingJoinCode)}`
    );
    return;
  }

  router.push("/");
  router.refresh();
}

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 py-10 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← 戻る
        </Link>

        <div className="mt-10">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            WELCOME BACK
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            ログイン
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#777c73]">
            あなたのCampBookに戻ろう。
          </p>
        </div>

        <form
  className="mt-8 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]"
>
          <label className="text-sm font-bold text-[#394536]">
            メールアドレス
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-[#d9ddd5] bg-[#fafbf8] px-4 py-4 outline-none focus:border-[#5d6b56] focus:ring-4 focus:ring-[#5d6b56]/10"
          />

          <label className="mt-5 block text-sm font-bold text-[#394536]">
            パスワード
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrorMessage("");
            }}
            autoComplete="current-password"
            className="mt-2 w-full rounded-2xl border border-[#d9ddd5] bg-[#fafbf8] px-4 py-4 outline-none focus:border-[#5d6b56] focus:ring-4 focus:ring-[#5d6b56]/10"
          />

          {errorMessage && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}
<button
  type="button"
  onClick={handleLogin}
  disabled={isLoading}
  className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white transition disabled:opacity-60"
>
  {isLoading
    ? "ログインしています…"
    : "ログイン"}
</button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-[#777c73]">
            アカウントを持っていない？
          </p>

          <Link
            href="/signup"
            className="mt-2 inline-block text-sm font-bold text-[#5d6b56]"
          >
            新しく作る →
          </Link>
        </div>
      </div>
    </main>
  );
}