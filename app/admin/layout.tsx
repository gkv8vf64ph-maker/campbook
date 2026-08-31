
"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAdminLogin() {
      // 管理者ログイン画面自体は誰でも開ける
      if (pathname === "/admin/login") {
        setIsChecking(false);
        return;
      }

      // ログイン中ユーザーを取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      console.log("33621841-a807-4b40-974d-0854961d6e0d:", user?.id);

      if (userError || !user) {
        router.replace("/admin/login");
        return;
      }

      // admin_users に登録されているか確認
      const {
        data: adminUser,
        error: adminError,
      } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError || !adminUser) {
        router.replace("/event");
        return;
      }

      setIsChecking(false);
    }

    checkAdminLogin();
  }, [pathname, router]);

  if (
    isChecking &&
    pathname !== "/admin/login"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9]">
        <div className="text-center">
          <div className="text-3xl">🔐</div>

          <p className="mt-3 text-sm font-semibold text-[#777c73]">
            管理者を確認しています…
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}