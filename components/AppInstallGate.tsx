"use client";

import { useEffect, useState } from "react";

type AppInstallGateProps = {
  children: React.ReactNode;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export default function AppInstallGate({
  children,
}: AppInstallGateProps) {
  const [mode, setMode] = useState<
    "checking" | "app" | "desktop" | "ios" | "android"
  >("checking");

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();

    const isIOS =
      /iphone|ipad|ipod/.test(userAgent);

    const isAndroid =
      /android/.test(userAgent);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean })
          .standalone === true);

    if (isStandalone) {
      setMode("app");
      return;
    }

    if (isIOS) {
      setMode("ios");
      return;
    }

    if (isAndroid) {
      setMode("android");
      return;
    }

    setMode("desktop");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  useEffect(() => {
    if (mode !== "android") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [mode]);

  async function installAndroid() {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  if (mode === "checking") {
    return <div className="min-h-screen bg-[#f7f4ed]" />;
  }

  if (mode === "app" || mode === "desktop") {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-[#f7f4ed] px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-sm text-center">

        <img
          src="/icon-192.png"
          alt="CampBook"
          className="mx-auto h-24 w-24 rounded-[24px] shadow-md"
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#384334]">
          CampBook
        </h1>

        <p className="mt-2 text-sm text-[#777d73]">
          思い出を、しおりに。
        </p>

        <div className="mt-9 rounded-[28px] bg-white p-6 text-left shadow-sm">
          <h2 className="text-xl font-bold text-[#384334]">
            CampBookをはじめよう
          </h2>

          {mode === "ios" ? (
            <>
              <p className="mt-3 text-sm leading-7 text-[#6f756b]">
                CampBookはホーム画面から利用できます。
                最初にアプリを追加してください。
              </p>

              <div className="mt-6 space-y-4">
                <Step number="1">
                  Safari下部の
                  <strong> 共有ボタン「□↑」</strong>
                  をタップ
                </Step>

                <Step number="2">
                  <strong>「ホーム画面に追加」</strong>
                  を選択
                </Step>

                <Step number="3">
                  右上の
                  <strong>「追加」</strong>
                  をタップ
                </Step>
              </div>

              <div className="mt-6 rounded-2xl bg-[#f7f4ed] p-4 text-center text-sm font-medium text-[#384334]">
                追加後、ホーム画面の
                <br />
                CampBookを開いてください
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-7 text-[#6f756b]">
                CampBookをホーム画面に追加すると、
                アプリとして利用できます。
              </p>

              {installPrompt ? (
                <button
                  type="button"
                  onClick={installAndroid}
                  className="mt-6 w-full rounded-2xl bg-[#384334] px-5 py-4 font-bold text-white"
                >
                  CampBookをインストール
                </button>
              ) : (
                <div className="mt-6 rounded-2xl bg-[#f7f4ed] p-4 text-sm leading-6 text-[#6f756b]">
                  ブラウザのメニューから
                  <strong className="text-[#384334]">
                    「ホーム画面に追加」
                  </strong>
                  を選択してください。
                </div>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-xs leading-5 text-[#999d96]">
          CampBookはホーム画面からご利用ください
        </p>
      </div>
    </main>
  );
}

function Step({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#384334] text-xs font-bold text-white">
        {number}
      </div>

      <p className="pt-1 text-sm leading-6 text-[#555d52]">
        {children}
      </p>
    </div>
  );
}