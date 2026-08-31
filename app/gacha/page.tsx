"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Frame = {
  id: number;
  name: string;
  rarity: "N" | "R" | "SR" | "SSR";
};

export default function GachaPage() {
  const [points, setPoints] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const [result, setResult] = useState<Frame | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ログイン中ユーザーとポイントを取得
  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "ガチャを利用するにはログインしてください。"
        );
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("points")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setErrorMessage(
          "ポイントを取得できませんでした。"
        );
        setIsLoading(false);
        return;
      }

      setPoints(profile.points ?? 0);
      setIsLoading(false);
    }

    fetchUser();
  }, []);

  function drawRarity(): Frame["rarity"] {
    const random = Math.random() * 100;

    if (random < 3) {
      return "SSR";
    }

    if (random < 15) {
      return "SR";
    }

    if (random < 40) {
      return "R";
    }

    return "N";
  }

  async function handleGacha() {
    if (!userId || isDrawing) return;

    if (points < 50) {
      setErrorMessage(
        "ポイントが足りません。ガチャには50pt必要です。"
      );
      return;
    }

    setIsDrawing(true);
    setErrorMessage("");
    setResult(null);

    const rarity = drawRarity();

    // 当たったレア度のフレーム一覧
    const {
      data: frames,
      error: frameError,
    } = await supabase
      .from("frames")
      .select("id, name, rarity")
      .eq("rarity", rarity);

    if (frameError) {
  console.error("フレーム取得エラー:", {
    message: frameError.message,
    details: frameError.details,
    hint: frameError.hint,
    code: frameError.code,
  });

  setErrorMessage(
    `ガチャの読み込みに失敗しました：${frameError.message}`
  );

  setIsDrawing(false);
  return;
}

if (!frames || frames.length === 0) {
  console.error("該当レア度のフレームがありません:", rarity);

  setErrorMessage(
    `${rarity}のフレームが登録されていません。`
  );

  setIsDrawing(false);
  return;
}

    // 同レア度からランダムで1つ
    const selectedFrame =
      frames[
        Math.floor(Math.random() * frames.length)
      ] as Frame;

    // 所持済みか確認
    const {
      data: ownedFrame,
      error: ownedError,
    } = await supabase
      .from("user_frames")
      .select("id")
      .eq("user_id", userId)
      .eq("frame_id", selectedFrame.id)
      .maybeSingle();

    if (ownedError) {
      setErrorMessage(
        "所持フレームを確認できませんでした。"
      );
      setIsDrawing(false);
      return;
    }

    // 未所持ならコレクションへ追加
    if (!ownedFrame) {
      const { error: insertError } =
        await supabase
          .from("user_frames")
          .insert({
            user_id: userId,
            frame_id: selectedFrame.id,
          });

      if (insertError) {
        setErrorMessage(
          "フレームを保存できませんでした。"
        );
        setIsDrawing(false);
        return;
      }
    }

    const newPoints = points - 50;

    // 50pt消費
    const { error: pointError } =
      await supabase
        .from("profiles")
        .update({
          points: newPoints,
        })
        .eq("user_id", userId);

    if (pointError) {
      setErrorMessage(
        "ポイントの更新に失敗しました。"
      );
      setIsDrawing(false);
      return;
    }

    setPoints(newPoints);
    setResult(selectedFrame);
    setIsDrawing(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm font-bold text-[#687562]">
          ガチャを準備しています…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 py-10 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/event"
          className="text-sm font-bold text-[#5d6b56]"
        >
          ← ホームへ戻る
        </Link>

        <div className="mt-8 text-center">
          <p className="text-xs font-bold tracking-[0.18em] text-[#7b8475]">
            CAMP GACHA
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            フレームガチャ
          </h1>

          <p className="mt-3 text-sm text-[#777c73]">
            思い出を残して、特別なフレームを集めよう。
          </p>
        </div>

        <section className="mt-8 rounded-[28px] bg-[#394536] p-6 text-white shadow-lg">
          <p className="text-xs font-bold tracking-[0.14em] text-white/60">
            CAMP POINT
          </p>

          <div className="mt-2 flex items-end justify-between">
            <p className="text-4xl font-bold">
              {points}
              <span className="ml-1 text-lg">
                pt
              </span>
            </p>

            <p className="text-xs text-white/60">
              1回 50pt
            </p>
          </div>
        </section>

        {result && (
          <section className="mt-6 rounded-[28px] bg-white p-7 text-center shadow-sm">
            <p className="text-sm font-bold text-[#7b8475]">
              GET!
            </p>

            <div className="mt-5 text-6xl">
              🖼️
            </div>

            <p className="mt-5 text-sm font-bold text-[#9a7b48]">
              {result.rarity}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#394536]">
              {result.name}
            </h2>

            <p className="mt-3 text-sm text-[#777c73]">
              コレクションに追加されました！
            </p>
          </section>
        )}

        {errorMessage && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleGacha}
          disabled={
            isDrawing ||
            points < 50 ||
            !userId
          }
          className="mt-7 w-full rounded-2xl bg-[#5d6b56] py-5 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDrawing
            ? "抽選中…"
            : "50ptでガチャを回す"}
        </button>

        <div className="mt-6 rounded-2xl bg-[#e8ede4] p-4">
          <p className="text-sm font-bold text-[#52644b]">
            排出率
          </p>

          <p className="mt-2 text-sm leading-7 text-[#687562]">
            N：60%　R：25%
            <br />
            SR：12%　SSR：3%
          </p>
        </div>
      </div>
    </main>
  );
}