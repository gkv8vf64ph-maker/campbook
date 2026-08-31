"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type MeetingPlace = {
  id: number;
  event_id: number;
  name: string;
  address: string | null;
  description: string | null;
};

export default function MeetingPlacePage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [meetingPlace, setMeetingPlace] =
    useState<MeetingPlace | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    } else {
      setIsLoading(false);
      setErrorMessage(
        "参加中のイベントが見つかりません。"
      );
    }
  }, []);

  useEffect(() => {
    if (!currentEventId) return;

    async function fetchMeetingPlace() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("meeting_places")
        .select(
          "id, event_id, name, address, description"
        )
        .eq("event_id", currentEventId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log(
          "集合場所取得エラー:",
          error.message
        );

        setErrorMessage(
          "集合場所を読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      setMeetingPlace(data ?? null);
      setIsLoading(false);
    }

    fetchMeetingPlace();
  }, [currentEventId]);

  const mapQuery =
    meetingPlace?.address ||
    meetingPlace?.name ||
    "";

  const mapUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      mapQuery
    )}`;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm font-semibold text-[#73776f]">
          集合場所を読み込んでいます…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-6 pb-12 pt-8 text-[#252720]">
      <div className="mx-auto max-w-md">
        <Link
          href="/event"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← ホームへ戻る
        </Link>

        <section className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-[0_16px_40px_rgba(57,69,54,0.10)]">
          <div className="bg-[#394536] p-6 text-white">
            <p className="text-xs font-bold tracking-[0.14em] text-white/60">
              MEETING PLACE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              集合場所
            </h1>

            <p className="mt-2 text-sm text-white/70">
              出発前に場所を確認しよう。
            </p>
          </div>

          <div className="p-6">
            {errorMessage && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
                {errorMessage}
              </p>
            )}

            {!errorMessage && !meetingPlace && (
              <div className="rounded-2xl bg-[#f4f5f0] p-5 text-center">
                <p className="text-sm text-[#73776f]">
                  集合場所はまだ設定されていません。
                </p>
              </div>
            )}

            {meetingPlace && (
              <>
                <div className="rounded-2xl bg-[#f4f5f0] p-5">
                  <p className="text-sm font-bold text-[#697561]">
                    集合場所
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    {meetingPlace.name}
                  </h2>

                  {meetingPlace.address && (
                    <p className="mt-2 text-sm text-[#6f746c]">
                      {meetingPlace.address}
                    </p>
                  )}

                  {meetingPlace.description && (
                    <p className="mt-3 text-sm leading-6 text-[#73776f]">
                      {meetingPlace.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-bold text-amber-900">
                    遅れる場合
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    遅刻しそうな場合は、分かった時点で運営へ連絡してください。
                  </p>
                </div>

                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-[#394536] font-bold text-white transition hover:bg-[#2f392d]"
                >
                  Googleマップで開く
                </a>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}