"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    if (!password) {
      setErrorMessage("パスワードを入力してください。");
      return;
    }

    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      console.log(
        "管理者ログインエラー:",
        error.message
      );

      setErrorMessage(
        "メールアドレスまたはパスワードが正しくありません。"
      );

      setIsLoggingIn(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 py-10 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/event"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← イベントへ戻る
        </Link>

        <div className="mt-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#394536] text-3xl text-white">
            🔐
          </div>

          <p className="mt-7 text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            CAMPBOOK ADMIN
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            管理者ログイン
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#777c73]">
            合宿の予定や持ち物、お知らせなどを編集する管理者用ページです。
          </p>
        </div>

        <section className="mt-8 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <div>
            <label className="text-xs font-bold text-[#7b8475]">
              メールアドレス
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
              }}
              placeholder="example@email.com"
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold text-[#7b8475]">
              パスワード
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleLogin();
                }
              }}
              placeholder="パスワード"
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
            />
          </div>

          {errorMessage && (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            {isLoggingIn
              ? "ログインしています…"
              : "ログイン"}
          </button>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-[#92958e]">
          このページは運営・管理者専用です。
        </p>
      </div>
    </main>
  );
}