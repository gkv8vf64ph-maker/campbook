"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Frame = {
  id: number;
  name: string;
  rarity: "N" | "R" | "SR" | "SSR";
   image_url: string | null;
};

type UserFrame = {
  frame_id: number;
};

export default function FramesPage() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [ownedFrameIds, setOwnedFrameIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchFrames() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "コレクションを見るにはログインしてください。"
        );
        setIsLoading(false);
        return;
      }

      // 全フレーム
      const {
        data: frameData,
        error: frameError,
      } = await supabase
        .from("frames")
        .select("id, name, rarity, image_url")
        .order("id", { ascending: true });

      if (frameError) {
        console.error("フレーム取得エラー:", frameError);
        setErrorMessage(
          "フレームを読み込めませんでした。"
        );
        setIsLoading(false);
        return;
      }

      // 自分が持っているフレーム
      const {
        data: ownedData,
        error: ownedError,
      } = await supabase
        .from("user_frames")
        .select("frame_id")
        .eq("user_id", user.id);

      if (ownedError) {
        console.error(
          "所持フレーム取得エラー:",
          ownedError
        );
        setErrorMessage(
          "所持フレームを読み込めませんでした。"
        );
        setIsLoading(false);
        return;
      }

      setFrames((frameData ?? []) as Frame[]);

      setOwnedFrameIds(
        ((ownedData ?? []) as UserFrame[]).map(
          (item) => item.frame_id
        )
      );

      setIsLoading(false);
    }

    fetchFrames();
  }, []);

  function rarityLabel(rarity: Frame["rarity"]) {
    if (rarity === "SSR") return "SSR";
    if (rarity === "SR") return "SR";
    if (rarity === "R") return "R";
    return "N";
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm font-bold text-[#687562]">
          コレクションを読み込んでいます…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 py-10 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/gacha"
          className="text-sm font-bold text-[#5d6b56]"
        >
          ← ガチャへ戻る
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold tracking-[0.18em] text-[#7b8475]">
            MY FRAMES
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            フレームコレクション
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#777c73]">
            ガチャで手に入れたフレームを集めよう。
          </p>
        </div>

        <section className="mt-7 rounded-[26px] bg-[#394536] p-5 text-white">
          <p className="text-xs font-bold tracking-[0.14em] text-white/60">
            COLLECTION
          </p>

          <p className="mt-2 text-3xl font-bold">
            {ownedFrameIds.length}
            <span className="mx-2 text-lg text-white/50">
              /
            </span>
            {frames.length}
          </p>

          <p className="mt-1 text-xs text-white/60">
            フレーム獲得
          </p>
        </section>

        {errorMessage && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-7 grid grid-cols-2 gap-4">
          {frames.map((frame) => {
            const owned =
              ownedFrameIds.includes(frame.id);

            return (
              <div
                key={frame.id}
                className={`relative overflow-hidden rounded-[24px] p-4 shadow-sm ${
                  owned
                    ? "bg-white"
                    : "bg-[#e9e7e0]"
                }`}
              >
                <div
                  className={`flex aspect-square items-center justify-center rounded-[18px] ${
                    owned
                      ? "bg-[#f5f3ee]"
                      : "bg-[#deddd7]"
                  }`}
                >
                  {owned && frame.image_url ? (
  <img
    src={frame.image_url}
    alt={`${frame.name}のフレーム`}
    className="h-full w-full object-contain"
  />
) : (
  <span
    className={`text-5xl ${
      owned ? "" : "grayscale opacity-30"
    }`}
  >
    {owned ? "🖼️" : "🔒"}
  </span>
)}

                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold tracking-[0.12em] text-[#8a8e85]">
                    {rarityLabel(frame.rarity)}
                  </p>

                  <p
                    className={`mt-1 font-bold ${
                      owned
                        ? "text-[#394536]"
                        : "text-[#999]"
                    }`}
                  >
                    {owned
                      ? frame.name
                      : "？？？？"}
                  </p>
                </div>

                {!owned && (
                  <div className="absolute inset-0 bg-white/10" />
                )}
              </div>
            );
          })}
        </div>

        <Link
          href="/gacha"
          className="mt-8 block w-full rounded-2xl bg-[#5d6b56] py-4 text-center font-bold text-white"
        >
          フレームガチャを回す
        </Link>
      </div>
    </main>
  );
}