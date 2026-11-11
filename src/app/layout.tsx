import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ensureSchema } from "@/db/ensure";
import { ToastHost } from "@/components/ui";
import { APP_BRAND, APP_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} — Gestion scolaire bilingue · ${APP_BRAND}`,
  description:
    "Inscriptions, numéros officiels, blocs Maternelle · Primaire · Secondaire, caisse et reçus A6 envoyés par WhatsApp — chaque établissement dans son coffre-fort isolé.",
};

export const dynamic = "force-dynamic";

const GOOGLE_FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,900&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Initialisation idempotente du schéma : déploiement propre sur Vercel / Render.
  await ensureSchema();
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS} rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
