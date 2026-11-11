"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore, useState, type ReactNode } from "react";
import type { Level, SubscriberStatus } from "@/db/schema";
import { Icon, isIconName, WaIcon } from "@/components/ui-icons";
import { LEVEL_INFO, STATUS_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Icônes et marque : module pur, utilisable côté serveur comme côté client.
export * from "./ui-icons";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-2">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-board sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-600">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function Flash({ ok, erreur }: { ok?: string; erreur?: string }) {
  if (!ok && !erreur) return null;
  return (
    <div className="mb-6 space-y-2 no-print">
      {ok && (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <span>✅</span>
          <span>{ok}</span>
        </div>
      )}
      {erreur && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          <span>⚠️</span>
          <span>{erreur}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Carte de statistique. Signature étendue : `tone` accepte un ton nommé
 * ("slate", "indigo", "emerald", "amber", "rose", "sky") ou une couleur
 * hexadécimale affichée en barre supérieure ; `sub` est un alias de `hint` ;
 * `icon` accepte un emoji ou un nom d'icône ("book", "users", …).
 */
export function StatCard({
  label,
  value,
  hint,
  sub,
  icon,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  sub?: ReactNode;
  icon?: string;
  tone?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
  };
  const hex = tone?.startsWith("#") ? tone : undefined;
  const isNamedIcon = isIconName(icon);
  const namedIcon = isNamedIcon ? icon : undefined;
  const resolvedTone = hex ? "slate" : tone in tones ? tone : "slate";
  return (
    <div className="card relative flex items-start gap-4 overflow-hidden">
      {hex && <span className="absolute inset-x-0 top-0 h-1" style={{ background: hex }} />}
      {icon && (
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tones[resolvedTone])}>
          {namedIcon ? <Icon name={namedIcon} size={20} /> : <span className="text-xl leading-none">{icon}</span>}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 truncate font-display text-2xl font-black text-board">{value}</p>
        {(hint ?? sub) && <p className="mt-1 text-xs text-slate-500">{hint ?? sub}</p>}
      </div>
    </div>
  );
}

/** Tons du composant Badge — identiques au module UI d'origine. */
const BADGE_TONES = {
  green: "bg-ok/12 text-ok",
  amber: "bg-amber/15 text-amber-2",
  red: "bg-danger/10 text-danger",
  blue: "bg-cblue/10 text-cblue",
  magenta: "bg-magenta/10 text-magenta",
  board: "bg-board/10 text-board",
  gray: "bg-inkmut/10 text-inkmut",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

/**
 * Pastille de statut. Même signature que le composant d'origine :
 * <Badge tone="green">Actif</Badge> — ton par défaut "board", ton inconnu → "board".
 */
export function Badge({
  tone = "board",
  children,
  className,
}: {
  tone?: BadgeTone | (string & Record<never, never>);
  children?: ReactNode;
  className?: string;
}) {
  const toneClass = (BADGE_TONES as Record<string, string>)[tone] ?? BADGE_TONES.board;
  return <span className={cn("chip", toneClass, className)}>{children}</span>;
}

export function LevelBadge({ level }: { level: Level }) {
  const info = LEVEL_INFO[level];
  return (
    <span className={cn("badge", info.badge)}>
      {info.emoji} {info.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: SubscriberStatus }) {
  const info = STATUS_INFO[status];
  return (
    <span className={cn("badge", info.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", info.dot)} />
      {info.label}
    </span>
  );
}

export function FormulaBadges({
  school,
  showLocked = true,
}: {
  school: { hasMaternel: boolean; hasPrimaire: boolean; hasSecondaire: boolean };
  showLocked?: boolean;
}) {
  const entries: Array<[Level, boolean]> = [
    ["maternel", school.hasMaternel],
    ["primaire", school.hasPrimaire],
    ["secondaire", school.hasSecondaire],
  ];
  return (
    <span className="inline-flex flex-wrap gap-1">
      {entries.map(([level, active]) =>
        active ? (
          <span key={level} className={cn("badge", LEVEL_INFO[level].badge)}>
            {LEVEL_INFO[level].label}
          </span>
        ) : showLocked ? (
          <span key={level} className="badge bg-slate-100 text-slate-400 line-through" title="Non inclus dans la formule">
            {LEVEL_INFO[level].label}
          </span>
        ) : null,
      )}
    </span>
  );
}

/** État vide. Accepte un emoji ou un nom d'icône ; `hint` est un alias de `text`. */
export function EmptyState({
  icon = "📭",
  title,
  text,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  text?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  const named = isIconName(icon) ? icon : undefined;
  const message = text ?? hint;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <div className="relative">
        {named && <span className="absolute -inset-3 rounded-full bg-amber/15" />}
        <span
          className={cn(
            "relative inline-flex place-items-center rounded-2xl bg-board/8 text-board",
            named ? "p-4" : "text-4xl",
          )}
        >
          {named ? <Icon name={named} size={30} /> : icon}
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-board">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-inkmut">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function WhatsAppLink({ href, className, children }: { href: string; className?: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? "btn-whatsapp"}>
      {children ?? "💬 Envoyer par WhatsApp"}
    </a>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 no-print">
      ← {children}
    </Link>
  );
}

/** Contrôle segmenté (fr/en, vues, tris…). */
export function Seg({
  options,
  value,
  onChange,
  dark = false,
}: {
  options: Array<{ id: string; label: ReactNode }>;
  value: string;
  onChange: (id: string) => void;
  dark?: boolean;
}) {
  return (
    <div className={`inline-flex gap-0.5 rounded-xl p-1 ${dark ? "bg-board-2/60" : "border border-line bg-board/8"}`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus:outline-none ${
            value === option.id
              ? dark
                ? "bg-amber text-board-2 shadow"
                : "bg-board text-cream shadow"
              : dark
                ? "text-cream/60 hover:text-cream"
                : "text-inkmut hover:text-board"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Surcouche overlay partagée (verrouille le défilement + touche Échap)
 * ------------------------------------------------------------------ */
function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="absolute inset-0 bg-board-2/60 backdrop-blur-[2px] anim-fade" onClick={onClose} />;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[65] grid place-items-center p-4" role="dialog" aria-modal>
      <Backdrop onClose={onClose} />
      <div
        className={`anim-pop relative w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-hidden rounded-2xl border-[1.5px] border-line bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line bg-parch px-5 py-3">
          <h2 className="font-display text-lg font-bold text-board">{title}</h2>
          <button type="button" onClick={onClose} className="text-inkmut transition hover:text-danger" aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-parch px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal>
      <Backdrop onClose={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-parch px-5 py-3">
          <h2 className="font-display text-lg font-bold text-board">{title}</h2>
          <button type="button" onClick={onClose} className="text-inkmut transition hover:text-danger" aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="grow overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap gap-2 border-t border-line bg-parch px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Boîte de dialogue de confirmation (bouton rouge par défaut, comme la version d'origine). */
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmer",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${danger ? "bg-danger/10 text-danger" : "bg-board/10 text-board"}`}>
          <Icon name={danger ? "alert" : "info"} size={18} />
        </span>
        <p className="text-sm leading-relaxed text-ink">{message}</p>
      </div>
    </Modal>
  );
}

/** Bouton « copier dans le presse-papiers » (avec repli exécutable). */
export function CopyBtn({ text, label = "Copier" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      onClick={async () => {
        let done = false;
        try {
          await navigator.clipboard.writeText(text);
          done = true;
        } catch {
          /* ignoré */
        }
        if (!done) {
          try {
            const area = document.createElement("textarea");
            area.value = text;
            area.style.cssText = "position:fixed;left:-9999px;top:0;";
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
          } catch {
            /* ignoré */
          }
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "✅ Copié" : label}
    </button>
  );
}

/** Bouton d'actualisation des données serveur. */
export function RefreshButton({ compact = false, label = "Actualiser" }: { compact?: boolean; label?: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  return (
    <button
      type="button"
      disabled={syncing}
      title={lastSync ? `Dernière actualisation : ${lastSync.toLocaleTimeString("fr-FR")}` : undefined}
      className={`${compact ? "btn-secondary btn-sm" : "btn-school btn-sm"}`}
      onClick={async () => {
        setSyncing(true);
        try {
          router.refresh();
        } finally {
          setTimeout(() => {
            setLastSync(new Date());
            setSyncing(false);
          }, 450);
        }
      }}
    >
      <Icon name="refresh" size={15} className={syncing ? "animate-spin" : undefined} />
      <span className={compact ? "hidden md:inline" : undefined}>{syncing ? "Actualisation…" : label}</span>
    </button>
  );
}

/* ------------------------ Basculer la langue ------------------------ */
const LANG_KEY = "gs_lang";

export function LangToggle({ dark = false }: { dark?: boolean }) {
  const [locale, setLocale] = useState("fr");
  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_KEY);
    if (stored === "fr" || stored === "en") setLocale(stored);
  }, []);
  const change = (next: string) => {
    setLocale(next);
    window.localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
  };
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-xl p-0.5 ${dark ? "bg-white/10" : "border border-line bg-board/8"}`}
      title="Français / English"
    >
      <Icon name="globe" size={14} className={`ml-1.5 ${dark ? "text-amber" : "text-board"}`} />
      {["fr", "en"].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => change(code)}
          className={`rounded-[9px] px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide transition-all ${
            locale === code ? "bg-amber text-board-2 shadow" : dark ? "text-cream/60 hover:text-cream" : "text-inkmut hover:text-board"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Toasts ------------------------------ */
type Toast = { id: number; kind: "info" | "error" | "success"; message: string };
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let seq = 1;

function emit() {
  listeners.forEach((listener) => listener());
}

export function pushToast(message: string, kind: Toast["kind"] = "info") {
  const id = seq++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => dismissToast(id), 4200);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Affiche les notifications globales (aucun rendu s'il n'y en a pas). */
export function ToastHost() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => [] as Toast[],
  );
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[90] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2 md:bottom-6">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={`anim-pop pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${
            toast.kind === "error"
              ? "border-danger/40 bg-[#3d1512] text-[#ffd9cf]"
              : toast.kind === "success"
                ? "border-ok/40 bg-[#0f2a1c] text-[#c9f3d9]"
                : "border-line bg-board text-cream"
          }`}
        >
          <Icon name={toast.kind === "error" ? "error" : toast.kind === "success" ? "check" : "info"} size={16} />
          <span className="grow">{toast.message}</span>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Fermer" className="opacity-70 hover:opacity-100">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* --------------------- Aperçu de document (reçu, bulletin) --------------------- */
export function DocPreview({
  open,
  onClose,
  html,
  filename,
  title,
  onWhatsApp,
  landscape = false,
  extra,
}: {
  open: boolean;
  onClose: () => void;
  html: string;
  filename?: string;
  title?: ReactNode;
  onWhatsApp?: { href: string; label?: string };
  landscape?: boolean;
  extra?: ReactNode;
}) {
  const holder = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const resize = () => {
      const width = node.clientWidth || 600;
      node.style.setProperty("--zoom", String(Math.min(1, width / (landscape ? 1140 : 812))));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [landscape]);
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal>
      <Backdrop onClose={onClose} />
      <div className="absolute inset-x-2 bottom-2 top-10 flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-line bg-parch shadow-2xl md:inset-x-8 md:bottom-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-parch px-4 py-2.5">
          <h2 className="font-display text-base font-bold text-board">{title ?? "Aperçu du document"}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {extra}
            {onWhatsApp && (
              <a href={onWhatsApp.href} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">
                <WaIcon size={15} /> {onWhatsApp.label ?? "WhatsApp"}
              </a>
            )}
            <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}>
              <Icon name="printer" size={15} /> Imprimer
            </button>
            <button type="button" onClick={onClose} className="btn-secondary btn-sm" aria-label="Fermer">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
        <div ref={holder} className="grow overflow-auto p-4">
          <iframe
            title={typeof title === "string" ? title : "Aperçu"}
            srcDoc={html}
            className="mx-auto block h-full w-full rounded-lg border-0 bg-white"
            style={{ maxWidth: landscape ? "1140px" : "812px" }}
          />
        </div>
        {filename && <p className="border-t border-line bg-parch px-4 py-1.5 text-[11px] text-inkmut">Fichier : {filename}</p>}
      </div>
    </div>
  );
}
