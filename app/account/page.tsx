"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  useEffect(() => {
    async function fetchAccount() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("user_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.log(
          "プロフィール取得エラー:",
          profileError.message
        );
      }

      setUserName(
        profile?.user_name ?? "ユーザー"
      );

      setIsLoading(false);
    }

    fetchAccount();
  }, [router]);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.log(
        "ログアウトエラー:",
        error.message
      );

      setIsLoggingOut(false);
      return;
    }

    localStorage.removeItem(
      "campbook-current-user"
    );

    router.replace("/");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm text-[#777c73]">
          アカウントを読み込んでいます…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 pb-12 pt-8 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← トップへ戻る
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            ACCOUNT
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            アカウント
          </h1>
        </div>

        <section className="mt-7 rounded-[28px] bg-[#394536] p-6 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">
            {userName.charAt(0)}
          </div>

          <h2 className="mt-5 text-2xl font-bold">
            {userName}
          </h2>

          <p className="mt-1 text-sm text-white/60">
            {email}
          </p>
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
          <Link
            href="/history"
            className="flex items-center justify-between border-b border-[#eeeee9] p-5"
          >
            <div>
              <p className="font-bold text-[#394536]">
                過去のしおり
              </p>

              <p className="mt-1 text-xs text-[#858980]">
                参加した合宿を振り返る
              </p>
            </div>

            <span className="text-xl text-[#a1a69d]">
              ›
            </span>
          </Link>

          <div className="p-5">
            <p className="font-bold text-[#394536]">
              アカウントについて
            </p>

            <p className="mt-2 text-xs leading-5 text-[#858980]">
              このアカウントでログインすれば、
              機種変更後も参加した合宿と思い出を
              引き継ぐことができます。
            </p>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-7 w-full rounded-2xl border border-[#d7dbd3] bg-white py-4 font-bold text-[#5d6b56] disabled:opacity-60"
        >
          {isLoggingOut
            ? "ログアウトしています…"
            : "ログアウト"}
        </button>
      </div>
    </main>
  );
}