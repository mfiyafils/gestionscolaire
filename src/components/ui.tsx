import Link from "next/link";
import type { ReactNode } from "react";
import type { Level, SubscriberStatus } from "@/db/schema";
import { LEVEL_INFO, STATUS_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";

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

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: "slate" | "indigo" | "emerald" | "amber" | "rose" | "sky";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="card flex items-start gap-4">
      {icon && <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl", tones[tone])}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 truncate font-display text-2xl font-black text-board">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
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

export function EmptyState({ icon = "📭", title, text, action }: { icon?: string; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-display text-base font-bold text-board">{title}</h3>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>}
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
