"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { money, structureLabel } from "@/lib/core";
import type { SubRequestRow } from "@/lib/types";
import { Icon, Field, CopyBtn, Badge } from "@/components/ui";

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

function downloadSnippet(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.split("/").pop() || "snippet.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const PRESETS = [
  {
    id: "patch",
    fr: "Correctif & synchro mobile/desktop",
    en: "Mobile/desktop sync & hotfix",
    promptFr: "Optimiser la synchronisation temps réel entre ordinateur et téléphone et corriger la mise en page A6",
  },
  {
    id: "feature",
    fr: "Nouvelle bannière / fonctionnalité",
    en: "New banner / feature",
    promptFr: "Ajouter un indicateur de mise à jour déployée et une nouvelle carte statistique",
  },
  {
    id: "config",
    fr: "Config Vercel / Netlify",
    en: "Vercel / Netlify config",
    promptFr: "Générer la configuration de déploiement production sans cache API pour Vercel ou Netlify",
  },
  {
    id: "db",
    fr: "Évolution schéma PostgreSQL",
    en: "PostgreSQL schema migration",
    promptFr: "Ajouter une table d'audit Drizzle ORM PostgreSQL pour suivre les mises à jour",
  },
];

export function AiCodeAssistant({
  pendingRequests,
  onApproveRequest,
  onApproveAll,
  onPrefillRelease,
  onPublishDirect,
}: {
  pendingRequests: SubRequestRow[];
  onApproveRequest: (r: SubRequestRow) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onPrefillRelease: (v: { version: string; titleFr: string; titleEn: string; notesFr: string; notesEn: string }) => void;
  onPublishDirect: (v: { version: string; titleFr: string; titleEn: string; notesFr: string; notesEn: string }) => Promise<void>;
}) {
  const { toast } = useApp();
  const { t, locale } = useI18n();
  const [host, setHost] = useState<"vercel" | "netlify">("vercel");
  const [category, setCategory] = useState<"patch" | "feature" | "db" | "config" | "api">("patch");
  const [version, setVersion] = useState("2.6.0");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState<GeneratedBundle | null>(null);

  const generate = async (customPrompt?: string, customCat?: typeof category) => {
    const usedPrompt = (customPrompt ?? prompt).trim() || PRESETS[0].promptFr;
    const usedCat = customCat ?? category;
    setBusy(true);
    try {
      const res = await fetch("/api/ai-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: usedPrompt, host, category: usedCat, version: version.trim() || "2.6.0" }),
      });
      const json = await res.json();
      if (json.ok && json.bundle) {
        setBundle(json.bundle);
        onPrefillRelease({
          version: json.bundle.version,
          titleFr: json.bundle.titleFr,
          titleEn: json.bundle.titleEn,
          notesFr: json.bundle.notesFr,
          notesEn: json.bundle.notesEn,
        });
      } else {
        toast(t("errorGeneric"), "error");
      }
    } catch {
      toast(t("errorGeneric"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 border-2 border-amber/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-board text-lg flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber/25 text-amber-2"><Icon name="spark" size={18} /></span>
            {t("ad.aiTitle")}
          </h2>
          <p className="text-xs text-inkmut mt-1 leading-relaxed">{t("ad.aiSub")}</p>
        </div>
        <Badge tone="green">
          <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
          {t("ad.aiPropagated")}
        </Badge>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => {
              const cat = p.id as typeof category;
              setCategory(cat);
              setPrompt(p.promptFr);
              void generate(p.promptFr, cat);
            }}
            className="chip bg-board/8 text-board hover:bg-amber hover:text-board-2 transition-colors cursor-pointer"
          >
            <Icon name="spark" size={11} /> {locale === "fr" ? p.fr : p.en}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label={t("ad.aiHost")}>
          <select className="input font-semibold" value={host} onChange={(e) => setHost(e.target.value as "vercel" | "netlify")}>
            <option value="vercel">Vercel (Next.js App Router)</option>
            <option value="netlify">Netlify (@netlify/plugin-nextjs)</option>
          </select>
        </Field>
        <Field label={t("ad.aiCategory")}>
          <select className="input font-semibold" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            <option value="patch">{locale === "fr" ? "Correctif / Patch" : "Hotfix / Patch"}</option>
            <option value="feature">{locale === "fr" ? "Nouvelle fonctionnalité" : "New feature"}</option>
            <option value="config">{locale === "fr" ? "Config Vercel / Netlify" : "Vercel / Netlify config"}</option>
            <option value="db">{locale === "fr" ? "Schéma PostgreSQL (Drizzle)" : "PostgreSQL schema (Drizzle)"}</option>
            <option value="api">{locale === "fr" ? "Webhook API / Propagation" : "API Webhook / Propagation"}</option>
          </select>
        </Field>
        <Field label={t("ad.version")}>
          <input className="input font-mono" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.6.0" />
        </Field>
      </div>

      <Field label={t("ad.aiPrompt")}>
        <textarea
          className="input min-h-[76px]"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("ad.aiPromptPh")}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-amber" disabled={busy} onClick={() => void generate()}>
          <Icon name={busy ? "refresh" : "spark"} size={16} className={busy ? "spin" : ""} /> {t("ad.aiGenerate")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void onPublishDirect(bundle ? {
            version: bundle.version,
            titleFr: bundle.titleFr,
            titleEn: bundle.titleEn,
            notesFr: bundle.notesFr,
            notesEn: bundle.notesEn,
          } : {
            version: version.trim() || "2.6.0",
            titleFr: prompt.trim() || `Mise à jour v${version.trim() || "2.6.0"}`,
            titleEn: prompt.trim() || `Update v${version.trim() || "2.6.0"}`,
            notesFr: prompt.trim() || "Mise à jour publiée et synchronisée sur tous les appareils.",
            notesEn: prompt.trim() || "Update published and synchronized across all devices.",
          })}
        >
          <Icon name="rocket" size={16} /> {t("ad.publish")}
        </button>
      </div>

      {/* 1-click validation & publishing of pending subscription requests right inside AI Agent tab */}
      {pendingRequests.length > 0 && (
        <div className="rounded-2xl border-2 border-ok/35 bg-parch p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold text-board text-sm flex items-center gap-2">
              <Icon name="check" size={16} className="text-ok" /> {t("ad.pendingInAi")} ({pendingRequests.length})
            </h3>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void onApproveAll()}>
              <Icon name="rocket" size={14} /> {t("ad.validateAll", { n: pendingRequests.length })}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingRequests.map((r) => {
              const price = money((r.plan === "annual" ? 45000 : r.plan === "quarterly" ? 22000 : 10000) * Math.max(1, r.structure === "all" ? 3 : r.structure.split(",").filter(Boolean).length));
              return (
                <div key={r.id} className="rounded-xl border border-line bg-white p-3 flex flex-wrap items-center gap-2.5">
                  <div className="grow min-w-[160px]">
                    <p className="font-bold text-sm text-board">{r.schoolName}</p>
                    <p className="text-[11px] text-inkmut">{structureLabel(r.structure, locale)} · <b className="text-board">{price}</b></p>
                    {r.paymentRef && <p className="text-[11px] font-mono text-ink">🔖 {r.paymentRef}</p>}
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void onApproveRequest(r)}>
                    <Icon name="check" size={13} /> {t("ad.approve")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bundle && (
        <div className="space-y-3 pt-3 border-t border-line anim-fade">
          {/* Code snippet */}
          <div className="rounded-xl border border-line bg-white p-3.5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="board">{t("ad.aiCodeSnippet")}</Badge>
              <span className="font-mono text-xs font-bold text-board">{bundle.filePath}</span>
              <div className="ml-auto flex gap-1.5">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadSnippet(bundle.filePath, bundle.code)}>
                  <Icon name="download" size={13} /> {t("ad.aiDownload")}
                </button>
                <CopyBtn text={bundle.code} />
              </div>
            </div>
            <pre className="rounded-xl chalkboard text-cream/90 p-3 font-mono text-[11px] overflow-x-auto leading-relaxed">{bundle.code}</pre>
          </div>

          {/* Host config */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone="blue">{t("ad.aiHostConfig")}</Badge>
                <span className="font-mono text-xs font-bold text-board">{bundle.hostConfigFile}</span>
                <div className="ml-auto flex gap-1">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadSnippet(bundle.hostConfigFile, bundle.hostConfigCode)}>
                    <Icon name="download" size={13} />
                  </button>
                  <CopyBtn text={bundle.hostConfigCode} />
                </div>
              </div>
              <pre className="rounded-xl chalkboard text-cream/90 p-3 font-mono text-[11px] overflow-x-auto leading-relaxed">{bundle.hostConfigCode}</pre>
            </div>

            <div className="rounded-xl border border-line bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone="amber">{t("ad.aiDeployCmds")}</Badge>
                <div className="ml-auto">
                  <CopyBtn text={bundle.deployCmd} />
                </div>
              </div>
              <pre className="rounded-xl chalkboard text-cream/90 p-3 font-mono text-[11px] overflow-x-auto leading-relaxed">{bundle.deployCmd}</pre>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {bundle.envChecklist.map((e) => (
                  <span key={e} className="chip bg-board/8 text-board font-mono text-[10px]">{e}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
