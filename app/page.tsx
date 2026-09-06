"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
const [isLoggedIn, setIsLoggedIn] =
  useState(false);

useEffect(() => {
  async function checkLogin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setIsLoggedIn(!!user);
  }

  checkLogin();
}, []);
  const [tripCode, setTripCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedCode =
      tripCode.trim().toUpperCase();

    if (!normalizedCode) {
      setError(
        "旅行コードを入力してください"
      );
      return;
    }

    setError("");
    setIsLoading(true);

    // Supabaseで本当に存在するコードか確認
    const { data, error: searchError } =
      await supabase
        .from("events")
        .select("id, join_code")
        .ilike(
          "join_code",
          normalizedCode
        )
        .maybeSingle();

    if (searchError) {
      console.log(
        "旅行コード検索エラー:",
        searchError.message
      );

      setError(
        "旅行コードを確認できませんでした"
      );
      setIsLoading(false);
      return;
    }

    if (!data) {
      setError(
        "旅行コードが見つかりません"
      );
      setIsLoading(false);
      return;
    }

    // ログイン状態を確認
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  // ログイン後に戻れるよう旅行コードを保存
  localStorage.setItem(
    "campbook-pending-join-code",
    normalizedCode
  );

  router.push("/login");
  return;
}

// ログイン済みならそのまま参加画面へ
router.push(
  `/join?code=${encodeURIComponent(
    normalizedCode
  )}`
);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f4ed] text-[#252720]">
      <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#dce8cf] blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#f0d9bd] blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-12">
        <header>
          <div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#384334] text-xl font-bold text-white shadow-sm">
              C
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                CampBook
              </h1>

              <p className="text-xs text-[#73776d]">
                思い出をしおりに
              </p>
                </div>
  </div>

  {isLoggedIn ? (
  <Link
    href="/account"
    className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#394536] shadow-sm"
  >
    アカウント
  </Link>
) : (
  <Link
    href="/login"
    className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#394536] shadow-sm"
  >
    ログイン
  </Link>
)}
</div>
</header>

        <section className="flex flex-1 flex-col justify-center py-14">
          <div className="mb-8">

            <h2 className="text-4xl font-bold leading-tight tracking-[-0.04em]">
              しおりに参加
            </h2>

            <p className="mt-4 max-w-sm text-[15px] leading-7 text-[#686c63]">
              旅行コードを入力して、しおりに参加できます。
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_20px_60px_rgba(62,68,54,0.12)] backdrop-blur"
          >
            <label
              htmlFor="tripCode"
              className="mb-2 block text-sm font-semibold"
            >
              旅行コード
            </label>

            <input
              id="tripCode"
              type="text"
              value={tripCode}
              onChange={(event) => {
                setTripCode(
                  event.target.value.toUpperCase()
                );
                setError("");
              }}
              placeholder="例：CAMPBOOK"
              maxLength={20}
              autoComplete="off"
              className="h-16 w-full rounded-2xl border border-[#dedfd9] bg-[#fafaf7] px-5 text-center text-xl font-bold uppercase tracking-[0.18em] outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-[#697b60] focus:ring-4 focus:ring-[#697b60]/10"
            />

            {error && (
              <p className="mt-2 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-[#384334] text-base font-bold text-white shadow-sm transition hover:bg-[#2d372a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading
                ? "確認中…"
                : "しおりに参加する"}

              {!isLoading && (
                <span
                  className="ml-2"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-start gap-3 px-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e3eadc] text-xs">
              🔒
            </div>

            <p className="text-xs leading-5 text-[#777b72]">
              旅行コードは参加者だけで共有してください。
            </p>
          </div>
        </section>

        <footer>
  <Link
    href="/history"
    className="flex w-full items-center justify-between rounded-2xl border border-[#dedfd8] bg-white/50 px-5 py-4 text-left transition hover:bg-white/80"
  >
    <span>
      <span className="block text-sm font-semibold">
        過去のしおりを見る
      </span>

      <span className="mt-1 block text-xs text-[#7a7e75]">
        参加済みの旅行を振り返る
      </span>
    </span>

    <span
      className="text-xl text-[#71766d]"
      aria-hidden="true"
    >
      ›
    </span>
  </Link>

          <p className="mt-6 text-center text-[11px] text-[#95988f]">
            CampBook 
          </p>
        </footer>
      </div>
    </main>
  );
}