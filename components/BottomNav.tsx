import Link from "next/link";

type BottomNavProps = {
  current: "home" | "timeline" | "memories" | "profile";
};

export default function BottomNav({ current }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-[#f7f5ef]/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-md items-center justify-around px-3">
        <Link
          href="/event"
          className="flex flex-col items-center gap-1 px-3"
        >
          <span
            className={`text-xl ${
              current === "home" ? "" : "opacity-55"
            }`}
          >
            ⌂
          </span>

          <span
            className={`text-[10px] ${
              current === "home"
                ? "font-bold text-[#46543f]"
                : "font-semibold text-[#8b8e87]"
            }`}
          >
            ホーム
          </span>
        </Link>

        <Link
          href="/timeline"
          className="flex flex-col items-center gap-1 px-3"
        >
          <span
            className={`text-xl ${
              current === "timeline" ? "" : "opacity-55"
            }`}
          >
            ◷
          </span>

          <span
            className={`text-[10px] ${
              current === "timeline"
                ? "font-bold text-[#46543f]"
                : "font-semibold text-[#8b8e87]"
            }`}
          >
            予定
          </span>
        </Link>

        <Link
          href="/memories"
          className="flex flex-col items-center gap-1 px-3"
        >
          <span
            className={`text-xl ${
              current === "memories" ? "" : "opacity-55"
            }`}
          >
            ♡
          </span>

          <span
            className={`text-[10px] ${
              current === "memories"
                ? "font-bold text-[#46543f]"
                : "font-semibold text-[#8b8e87]"
            }`}
          >
            思い出
          </span>
        </Link>

        <Link
          href="/profile"
          className="flex flex-col items-center gap-1 px-3"
        >
          <span
            className={`text-xl ${
              current === "profile" ? "" : "opacity-55"
            }`}
          >
            ♙
          </span>

          <span
            className={`text-[10px] ${
              current === "profile"
                ? "font-bold text-[#46543f]"
                : "font-semibold text-[#8b8e87]"
            }`}
          >
            プロフィール
          </span>
        </Link>
      </div>
    </nav>
  );
}