"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type Event = {
  id: number;
  title: string;
  location: string | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchEvent() {
      const eventId = getCurrentEventId();

      if (!eventId) {
        setErrorMessage(
          "編集するイベントが選択されていません。"
        );
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("id, title, location")
        .eq("id", eventId)
        .maybeSingle();

      if (error) {
        console.log(
          "イベント取得エラー:",
          error.message
        );

        setErrorMessage(
          "イベントを読み込めませんでした。"
        );

        setIsLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage(
          "イベントが見つかりませんでした。"
        );

        setIsLoading(false);
        return;
      }

      setEvent(data);
      setIsLoading(false);
    }

    fetchEvent();
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log(
        "ログアウトエラー:",
        error.message
      );

      setErrorMessage(
        "ログアウトできませんでした。"
      );

      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <p className="text-sm text-[#777c73]">
          読み込んでいます…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] px-5 pb-12 pt-8 text-[#252720]">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <Link
            href="/event"
            className="text-sm font-semibold text-[#5d6b56]"
          >
            ← イベントへ戻る
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#5d6b56] shadow-sm"
          >
            ログアウト
          </button>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            ADMIN
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            合宿を編集
          </h1>


          <p className="mt-2 text-sm text-[#777c73]">
            参加者に表示する内容を管理できます。
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
  <Link
    href="/admin/events"
    className="flex h-12 items-center justify-center rounded-2xl border border-[#d5d9d1] bg-white text-sm font-bold text-[#5d6b56]"
  >
    合宿を切り替える
  </Link>

  <Link
    href="/admin/events/new"
    className="flex h-12 items-center justify-center rounded-2xl bg-[#394536] text-sm font-bold text-white"
  >
    ＋ 新しい合宿
  </Link>
</div>

        {errorMessage && (
          <div className="mt-7 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        {event && (
          <>
            <section className="mt-7 rounded-[28px] bg-[#394536] p-6 text-white">
              <p className="text-xs font-bold tracking-[0.14em] text-white/60">
                EDITING EVENT
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {event.title}
              </h2>

              {event.location && (
                <p className="mt-2 text-sm text-white/70">
                  📍 {event.location}
                </p>
              )}
            </section>

            <section className="mt-7">
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-[#7b8475]">
                CONTENT
              </p>

              <div className="space-y-3">
                <AdminLink
                  href="/admin/schedules"
                  emoji="🗓️"
                  title="予定"
                  description="時間・予定・説明を編集"
                />

                <AdminLink
                  href="/admin/meeting-place"
                  emoji="📍"
                  title="集合場所"
                  description="集合場所や案内を編集"
                />

                <AdminLink
                  href="/admin/cautions"
                  emoji="⚠️"
                  title="注意事項"
                  description="注意事項を追加・編集"
                />

                <AdminLink
                  href="/admin/checklist"
                  emoji="🎒"
                  title="持ち物"
                  description="必要な持ち物を管理"
                />

                <AdminLink
                  href="/admin/rooms"
                  emoji="🏠"
                  title="部屋割り"
                  description="部屋とメンバーを管理"
                />

                <AdminLink
                  href="/admin/news"
                  emoji="📢"
                  title="お知らせ"
                  description="参加者へのお知らせを管理"
                />

                <AdminLink
                  href="/admin/settings"
                  emoji="⚙️"
                  title="イベント設定"
                  description="表示する機能などを設定"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function AdminLink({
  href,
  emoji,
  title,
  description,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(57,69,54,0.06)] transition active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef2e9] text-xl">
        {emoji}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#394536]">
          {title}
        </p>

        <p className="mt-1 text-sm text-[#858980]">
          {description}
        </p>
      </div>

      <span className="text-xl text-[#a1a69d]">
        ›
      </span>
    </Link>
  );
}