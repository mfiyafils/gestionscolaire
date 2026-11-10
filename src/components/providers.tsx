"use client";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { AppProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AppProvider>{children}</AppProvider>
    </I18nProvider>
  );
}