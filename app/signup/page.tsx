"use client";

import {
  FormEvent,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [userName, setUserName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) return;

    const name =
      userName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!name) {
      setErrorMessage(
        "表示名を入力してください。"
      );
      return;
    }

    if (!normalizedEmail) {
      setErrorMessage(
        "メールアドレスを入力してください。"
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "パスワードは6文字以上にしてください。"
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    // Supabase Authにアカウントを作成
    const {
      data,
      error: signupError,
    } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signupError) {
      console.log(
        "アカウント作成エラー:",
        signupError.message
      );

      setErrorMessage(
        "アカウントを作成できませんでした。"
      );

      setIsLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setErrorMessage(
        "ユーザー情報を取得できませんでした。"
      );

      setIsLoading(false);
      return;
    }

    // プロフィールを作成
    const {
      error: profileError,
    } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        user_name: name,
        avatar_url: null,
        bio: null,
      });

    if (profileError) {
      console.log(
        "プロフィール作成エラー:",
        profileError.message
      );

      setErrorMessage(
        "プロフィールを作成できませんでした。"
      );

      setIsLoading(false);
      return;
    }

    // 参加コードから来た場合は参加画面へ戻す
    const pendingJoinCode =
      localStorage.getItem(
        "campbook-pending-join-code"
      );

    if (pendingJoinCode) {
      localStorage.removeItem(
        "campbook-pending-join-code"
      );

      router.push(
        `/join?code=${encodeURIComponent(
          pendingJoinCode
        )}`
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
          <h1 className="text-3xl font-bold">
            アカウントを作る
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#777c73]">
            CampBookをはじめるための
            アカウントを作成します。
          </p>
        </div>

        <form
          onSubmit={handleSignup}
          className="mt-8 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]"
        >
          <label
            htmlFor="signup-name"
            className="text-sm font-bold text-[#394536]"
          >
            表示名
          </label>

          <input
            id="signup-name"
            type="text"
            value={userName}
            onChange={(event) => {
              setUserName(
                event.target.value
              );
              setErrorMessage("");
            }}
            placeholder="例：山田太郎"
            maxLength={20}
            autoComplete="nickname"
            disabled={isLoading}
            className="mt-2 w-full rounded-2xl border border-[#d9ddd5] bg-[#fafbf8] px-4 py-4 outline-none transition focus:border-[#5d6b56] focus:ring-4 focus:ring-[#5d6b56]/10 disabled:opacity-60"
          />

          <label
            htmlFor="signup-email"
            className="mt-5 block text-sm font-bold text-[#394536]"
          >
            メールアドレス
          </label>

          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value
              );
              setErrorMessage("");
            }}
            placeholder="example@email.com"
            autoComplete="email"
            inputMode="email"
            disabled={isLoading}
            className="mt-2 w-full rounded-2xl border border-[#d9ddd5] bg-[#fafbf8] px-4 py-4 outline-none transition focus:border-[#5d6b56] focus:ring-4 focus:ring-[#5d6b56]/10 disabled:opacity-60"
          />

          <label
            htmlFor="signup-password"
            className="mt-5 block text-sm font-bold text-[#394536]"
          >
            パスワード
          </label>

          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(
                event.target.value
              );
              setErrorMessage("");
            }}
            placeholder="6文字以上"
            autoComplete="new-password"
            minLength={6}
            disabled={isLoading}
            className="mt-2 w-full rounded-2xl border border-[#d9ddd5] bg-[#fafbf8] px-4 py-4 outline-none transition focus:border-[#5d6b56] focus:ring-4 focus:ring-[#5d6b56]/10 disabled:opacity-60"
          />

          {errorMessage && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "作成中…"
              : "アカウントを作る"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-[#777c73]">
            すでにアカウントを持っていますか？
          </p>

          <Link
            href="/login"
            className="mt-2 inline-block text-sm font-bold text-[#5d6b56]"
          >
            ログインする →
          </Link>
        </div>
      </div>
    </main>
  );
}