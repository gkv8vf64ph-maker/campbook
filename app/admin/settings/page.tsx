"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCurrentEventId } from "@/lib/currentEvent";

type EventSettings = {
  id: number;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  join_code: string | null;

  show_timeline: boolean;
  show_checklist: boolean;
  show_room: boolean;
  show_meeting_place: boolean;
  show_caution: boolean;
  show_members: boolean;
  show_news: boolean;
};

export default function AdminSettingsPage() {
  const [currentEventId, setCurrentEventId] =
    useState<number | null>(null);

  const [settings, setSettings] =
    useState<EventSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const savedEventId = getCurrentEventId();

    if (savedEventId) {
      setCurrentEventId(savedEventId);
    } else {
      setIsLoading(false);
      setErrorMessage(
        "編集するイベントが選択されていません。"
      );
    }
  }, []);

  useEffect(() => {
    if (!currentEventId) return;

    async function fetchSettings() {
      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("events")
        .select(`
  id,
  title,
  location,
  start_date,
  end_date,
  join_code,
  show_timeline,
  show_checklist,
  show_room,
  show_meeting_place,
  show_caution,
  show_members,
  show_news
`)
        .eq("id", currentEventId)
        .maybeSingle();

      if (error) {
        console.log(
          "イベント設定取得エラー:",
          error.message
        );

        setErrorMessage(
          "イベント設定を読み込めませんでした。"
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

      setSettings(data);
      setIsLoading(false);
    }

    fetchSettings();
  }, [currentEventId]);

  function toggleSetting(
    key:
      | "show_timeline"
      | "show_checklist"
      | "show_room"
      | "show_meeting_place"
      | "show_caution"
      | "show_members"
      | "show_news"
  ) {
    setSettings((current) => {
      if (!current) return current;

      return {
        ...current,
        [key]: !current[key],
      };
    });

    setSuccessMessage("");
  }

  async function handleSave() {
    if (!currentEventId || !settings) return;

    if (isSaving) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("events")
      .update({
        title: settings.title.trim(),
location: settings.location?.trim() || null,
start_date: settings.start_date,
end_date: settings.end_date,
join_code: settings.join_code?.trim().toUpperCase() || null,
        show_timeline: settings.show_timeline,
        show_checklist: settings.show_checklist,
        show_room: settings.show_room,
        show_meeting_place:
          settings.show_meeting_place,
        show_caution: settings.show_caution,
        show_members: settings.show_members,
        show_news: settings.show_news,
      })
      .eq("id", currentEventId);

    if (error) {
      console.log(
        "イベント設定保存エラー:",
        error.message
      );

      setErrorMessage(
        "イベント設定を保存できませんでした。"
      );

      setIsSaving(false);
      return;
    }

    setSuccessMessage(
      "イベント設定を保存しました。"
    );

    setIsSaving(false);
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
        <Link
          href="/admin"
          className="text-sm font-semibold text-[#5d6b56]"
        >
          ← 管理画面へ戻る
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold tracking-[0.16em] text-[#7b8475]">
            ADMIN / SETTINGS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            イベント設定
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#777c73]">
            参加者に表示する機能を切り替えられます。
          </p>
        </div>

        {errorMessage && (
          <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        {settings && (
          <>
            <section className="mt-7 rounded-[28px] bg-[#394536] p-6 text-white">
              <p className="text-xs font-bold tracking-[0.14em] text-white/60">
                EDITING EVENT
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {settings.title}
              </h2>
            </section>
<section className="mt-7 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
  <p className="text-xs font-bold tracking-[0.14em] text-[#7b8475]">
    BASIC INFORMATION
  </p>

  <h2 className="mt-1 text-xl font-bold">
    基本情報
  </h2>

  <div className="mt-5">
    <label className="text-sm font-bold">
      合宿名
    </label>

    <input
      value={settings.title}
      onChange={(event) =>
        setSettings({
          ...settings,
          title: event.target.value,
        })
      }
      className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
    />
  </div>

  <div className="mt-5">
    <label className="text-sm font-bold">
      場所
    </label>

    <input
      value={settings.location ?? ""}
      onChange={(event) =>
        setSettings({
          ...settings,
          location: event.target.value,
        })
      }
      placeholder="例：長野県・白馬"
      className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 outline-none focus:border-[#5d6b56]"
    />
  </div>

  <div className="mt-5 grid grid-cols-2 gap-3">
    <div>
      <label className="text-sm font-bold">
        開始日
      </label>

      <input
        type="date"
        value={settings.start_date}
        onChange={(event) =>
          setSettings({
            ...settings,
            start_date: event.target.value,
          })
        }
        className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-3 py-3 outline-none focus:border-[#5d6b56]"
      />
    </div>

    <div>
      <label className="text-sm font-bold">
        終了日
      </label>

      <input
        type="date"
        value={settings.end_date}
        onChange={(event) =>
          setSettings({
            ...settings,
            end_date: event.target.value,
          })
        }
        className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-3 py-3 outline-none focus:border-[#5d6b56]"
      />
    </div>
  </div>

  <div className="mt-5">
    <label className="text-sm font-bold">
      参加コード
    </label>

    <input
      value={settings.join_code ?? ""}
      onChange={(event) =>
        setSettings({
          ...settings,
          join_code: event.target.value.toUpperCase(),
        })
      }
      className="mt-2 w-full rounded-2xl border border-[#dedfd9] px-4 py-3 font-bold uppercase tracking-[0.12em] outline-none focus:border-[#5d6b56]"
    />
  </div>
</section>
            <section className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(57,69,54,0.06)]">
              <SettingRow
                emoji="◷"
                title="タイムライン"
                description="予定と投稿を表示"
                enabled={settings.show_timeline}
                onToggle={() =>
                  toggleSetting("show_timeline")
                }
              />

              <SettingRow
                emoji="🎒"
                title="持ち物"
                description="持ち物チェックを表示"
                enabled={settings.show_checklist}
                onToggle={() =>
                  toggleSetting("show_checklist")
                }
              />

              <SettingRow
                emoji="🏠"
                title="部屋割り"
                description="部屋割りページを表示"
                enabled={settings.show_room}
                onToggle={() =>
                  toggleSetting("show_room")
                }
              />

              <SettingRow
                emoji="📍"
                title="集合場所"
                description="集合場所ページを表示"
                enabled={
                  settings.show_meeting_place
                }
                onToggle={() =>
                  toggleSetting(
                    "show_meeting_place"
                  )
                }
              />

              <SettingRow
                emoji="⚠️"
                title="注意事項"
                description="注意事項ページを表示"
                enabled={settings.show_caution}
                onToggle={() =>
                  toggleSetting("show_caution")
                }
              />

              <SettingRow
                emoji="👥"
                title="メンバー"
                description="参加者一覧を表示"
                enabled={settings.show_members}
                onToggle={() =>
                  toggleSetting("show_members")
                }
              />

              <SettingRow
                emoji="📢"
                title="お知らせ"
                description="お知らせページを表示"
                enabled={settings.show_news}
                onToggle={() =>
                  toggleSetting("show_news")
                }
              />
            </section>

            {successMessage && (
              <p className="mt-5 rounded-2xl bg-[#eef2e9] p-4 text-sm font-bold text-[#52644b]">
                ✓ {successMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="mt-6 w-full rounded-2xl bg-[#394536] py-4 font-bold text-white disabled:opacity-60"
            >
              {isSaving
                ? "保存しています…"
                : "設定を保存"}
            </button>

            <Link
              href="/event"
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl border border-[#d7dbd3] bg-white text-sm font-bold text-[#5d6b56]"
            >
              参加者画面を確認する
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

function SettingRow({
  emoji,
  title,
  description,
  enabled,
  onToggle,
}: {
  emoji: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-4 border-b border-[#eeeee9] p-5 text-left last:border-b-0"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef2e9] text-xl">
        {emoji}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#394536]">
          {title}
        </p>

        <p className="mt-1 text-xs text-[#858980]">
          {description}
        </p>
      </div>

      <div
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled
            ? "bg-[#5d6b56]"
            : "bg-[#d7d9d4]"
        }`}
      >
        <div
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </div>
    </button>
  );
}