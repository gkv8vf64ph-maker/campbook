"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveCurrentEventId } from "@/lib/currentEvent";

export default function NotificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const eventIdText = searchParams.get("eventId");
    const to = searchParams.get("to");

    if (!eventIdText) {
      router.replace("/");
      return;
    }

    const eventId = Number(eventIdText);

    if (!Number.isFinite(eventId)) {
      router.replace("/");
      return;
    }

    saveCurrentEventId(eventId);

    // CampBook内部のページだけ許可
    const destination =
      to && to.startsWith("/") && !to.startsWith("//")
        ? to
        : "/event";

    router.replace(destination);
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f4f1e9]">
      <p className="text-sm text-gray-500">
        しおりを開いています...
      </p>
    </main>
  );
}