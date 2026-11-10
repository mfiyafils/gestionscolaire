import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type HostTarget = "vercel" | "netlify";
type Category = "patch" | "feature" | "db" | "config" | "api";

interface GeneratedBundle {
  version: string;
  titleFr: string;
  titleEn: string;
  notesFr: string;
  notesEn: string;
  filePath: string;
  code: string;
  hostConfigFile: string;
  hostConfigCode: string;
  deployCmd: string;
  envChecklist: string[];
  mode: "ai" | "engine";
}

function buildHostConfig(host: HostTarget) {
  if (host === "netlify") {
    return {
      hostConfigFile: "netlify.toml",
      hostConfigCode: `[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, no-cache, must-revalidate"`,
      deployCmd: `# 1. Installer la CLI Netlify et le plugin Next.js (si première fois)
npm install -D @netlify/plugin-nextjs
npm install -g netlify-cli

# 2. Pousser le code sur Git puis déployer en production
git add .
git commit -m "chore(release): deploy Scolaria update"
git push origin main

# 3. Ou déployer directement depuis le terminal
netlify login
netlify env:set DATABASE_URL "postgresql://..."
netlify deploy --build --prod`,
    };
  }
  return {
    hostConfigFile: "vercel.json",
    hostConfigCode: `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate" }
      ]
    }
  ]
}`,
    deployCmd: `# 1. Installer la CLI Vercel (si première fois)
npm install -g vercel

# 2. Lier le projet, synchroniser la base et déployer en production
vercel link
vercel env add DATABASE_URL production
git add .
git commit -m "chore(release): deploy Scolaria update"
git push origin main

# 3. Ou déploiement direct en 1 commande
vercel --prod`,
  };
}

function deterministicCode(prompt: string, host: HostTarget, category: Category, version: string): GeneratedBundle {
  const cleanPrompt = prompt.trim() || "Mise à jour de synchronisation et performance multi-plateforme";
  const hostInfo = buildHostConfig(host);
  const safeSlug = cleanPrompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32) || "update";

  let filePath = "src/lib/core.ts";
  let code = "";
  let titleFr = `Mise à jour v${version}`;
  let titleEn = `Update v${version}`;
  let notesFr = `${cleanPrompt}. Synchronisation automatique active sur ordinateur et téléphone.`;
  let notesEn = `${cleanPrompt}. Automatic propagation active on desktop and mobile.`;

  if (category === "db") {
    filePath = "src/db/schema.ts";
    titleFr = `Évolution schéma DB (${version})`;
    titleEn = `DB schema upgrade (${version})`;
    code = `// Extension Drizzle ORM générée pour v${version} — ${cleanPrompt}
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  action: text("action").notNull(), // ex: "${safeSlug}"
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Appliquer après transfert sur ${host.toUpperCase()} :
// npx drizzle-kit push --force`;
  } else if (category === "config") {
    filePath = hostInfo.hostConfigFile;
    titleFr = `Configuration ${host === "vercel" ? "Vercel" : "Netlify"} (${version})`;
    titleEn = `${host === "vercel" ? "Vercel" : "Netlify"} config (${version})`;
    code = hostInfo.hostConfigCode;
  } else if (category === "api") {
    filePath = "src/app/api/updates/route.ts";
    titleFr = `Endpoint API & propagation v${version}`;
    titleEn = `API endpoint & propagation v${version}`;
    code = `// Extrait prêt à copier — Publication de mise à jour (${host.toUpperCase()})
export async function triggerRemoteUpdate(baseUrl: string) {
  const res = await fetch(\`\${baseUrl}/api/updates\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "${version}",
      titleFr: "${titleFr.replace(/"/g, '\\"')}",
      titleEn: "${titleEn.replace(/"/g, '\\"')}",
      notesFr: "${cleanPrompt.replace(/"/g, '\\"')}",
      notesEn: "${cleanPrompt.replace(/"/g, '\\"')}",
      status: "deployed",
    }),
  });
  return res.json();
}`;
  } else if (category === "feature") {
    filePath = "src/components/feature-patch.tsx";
    titleFr = `Nouvelle fonctionnalité (${version})`;
    titleEn = `New feature (${version})`;
    code = `"use client";
// Module généré par l'Agent IA Scolaria (v${version})
// Objet : ${cleanPrompt}
import { useI18n } from "@/lib/i18n";

export function FeatureBanner({ version = "${version}" }: { version?: string }) {
  const { locale } = useI18n();
  return (
    <div className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-2.5 text-xs font-semibold text-board">
      {locale === "fr"
        ? \`Version \${version} active : ${cleanPrompt.replace(/`/g, "'")}\`
        : \`Version \${version} active: ${cleanPrompt.replace(/`/g, "'")}\`}
    </div>
  );
}`;
  } else {
    filePath = "src/lib/patch-notes.ts";
    titleFr = `Correctif & amélioration v${version}`;
    titleEn = `Fix & improvement v${version}`;
    code = `// Correctif Scolaria v${version} — cible : ${host.toUpperCase()}
// Demande : ${cleanPrompt}
export const RELEASE_PATCH_${version.replace(/\W+/g, "_")} = {
  version: "${version}",
  targetHost: "${host}",
  slug: "${safeSlug}",
  summaryFr: "${cleanPrompt.replace(/"/g, '\\"')}",
  summaryEn: "${cleanPrompt.replace(/"/g, '\\"')}",
  propagate: ["desktop", "mobile", "pwa"],
  appliedAt: "${new Date().toISOString()}",
} as const;`;
  }

  return {
    version,
    titleFr,
    titleEn,
    notesFr,
    notesEn,
    filePath,
    code,
    ...hostInfo,
    envChecklist: [
      "DATABASE_URL=postgresql://...",
      "ADMIN_PASSWORD=...",
    ],
    mode: "engine",
  };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt ?? "").trim().slice(0, 1200);
  const host: HostTarget = body.host === "netlify" ? "netlify" : "vercel";
  const category: Category = ["patch", "feature", "db", "config", "api"].includes(String(body.category))
    ? (String(body.category) as Category)
    : "patch";
  const version = String(body.version ?? "2.6.0").trim().slice(0, 20) || "2.6.0";

  const fallback = deterministicCode(prompt, host, category, version);

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey && prompt.length > 3) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an expert Next.js 16 + TypeScript + Drizzle ORM PostgreSQL + Tailwind CSS v4 engineer helping deploy updates for Scolaria to Vercel or Netlify. Reply strictly as JSON with keys: titleFr, titleEn, notesFr, notesEn, filePath, code.",
            },
            {
              role: "user",
              content: `Host: ${host}, Category: ${category}, Version: ${version}, Request: ${prompt}`,
            },
          ],
          temperature: 0.2,
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
        if (parsed.code && parsed.titleFr) {
          return Response.json({
            ok: true,
            bundle: {
              ...fallback,
              titleFr: String(parsed.titleFr).slice(0, 120),
              titleEn: String(parsed.titleEn || parsed.titleFr).slice(0, 120),
              notesFr: String(parsed.notesFr || fallback.notesFr).slice(0, 800),
              notesEn: String(parsed.notesEn || fallback.notesEn).slice(0, 800),
              filePath: String(parsed.filePath || fallback.filePath).slice(0, 120),
              code: String(parsed.code),
              mode: "ai",
            },
          });
        }
      }
    } catch {
      /* fallback cleanly to deterministic engine */
    }
  }

  return Response.json({ ok: true, bundle: fallback });
}
