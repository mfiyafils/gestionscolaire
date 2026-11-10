"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Workspace } from "@/components/workspace";
import { Logo, Icon } from "@/components/ui";

export default function SchoolAppPage() {
  const { ready, role } = useApp();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (role === null) router.replace("/");
    if (role === "admin") router.replace("/admin");
  }, [ready, role, router]);

  if (!ready || role !== "tenant") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <Logo size={56} />
        <div className="flex items-center gap-2 text-board font-semibold text-sm">
          <Icon name="refresh" size={16} className="spin text-amber-2" /> {t("loading")}
        </div>
      </div>
    );
  }
  return <Workspace />;
}