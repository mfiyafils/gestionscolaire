"use client";
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { printHTML, downloadWord } from "@/lib/docs";

/* ── Icons (stroke, lucide-style) ──────────────────────────── */
const PATHS: Record<string, ReactNode> = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  userPlus: <><path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /><path d="M9 7h7M9 11h5" /></>,
  wallet: <><path d="M20 7H4a2 2 0 0 1 0-4h14v4" /><path d="M4 7v12a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1" /><circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  chevD: <path d="m6 9 6 6 6-6" />,
  chevR: <path d="m9 6 6 6-6 6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6 9 17l-5-5" />,
  printer: <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></>,
  fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  pen: <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></>,
  trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
  alert: <><path d="m10.29 3.86-8.18 14.14A2 2 0 0 0 3.84 21h16.32a2 2 0 0 0 1.73-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  star: <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />,
  send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  coins: <><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  spark: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  building: <><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" /></>,
  key: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />,
  pause: <path d="M10 4H6v16h4zM18 4h-4v16h4z" />,
  play: <path d="m6 3 14 9-14 9z" />,
  flask: <><path d="M10 2v7L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V2" /><path d="M8.5 2h7M7 16h10" /></>,
  rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
  arrowL: <path d="M19 12H5m7 7-7-7 7-7" />,
};

export function Icon({ name, size = 18, className = "", style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      {PATHS[name] ?? PATHS.info}
    </svg>
  );
}

export function WaIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

export function Logo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill={light ? "#e9a23b" : "#173f2f"} />
      <path d="M32 14 8 26l24 12 20-10v12h4V26L32 14z" fill={light ? "#173f2f" : "#e9a23b"} />
      <path d="M18 36v10c0 4 6 8 14 8s14-4 14-8V36l-14 7-14-7z" fill={light ? "#173f2f" : "#fbf8ef"} />
    </svg>
  );
}

/* ── Modal / Drawer ────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, wide = false }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center anim-fade" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-board-2/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${wide ? "sm:max-w-4xl" : "sm:max-w-lg"} max-h-[92dvh] sm:max-h-[86dvh] flex flex-col bg-cream rounded-t-2xl sm:rounded-2xl border border-line shadow-2xl anim-sheet sm:anim-pop`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <h3 className="font-display font-bold text-lg text-board leading-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-board/10 text-inkmut focus-ring" aria-label="close"><Icon name="x" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 grow">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line flex flex-wrap gap-2 justify-end shrink-0 bg-parch rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-board-2/60 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className="absolute right-0 bottom-0 left-0 sm:left-auto sm:top-0 h-[90dvh] sm:h-full sm:w-[460px] bg-cream border-t sm:border-t-0 sm:border-l border-line shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none anim-sheet sm:anim-drawer">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <h3 className="font-display font-bold text-lg text-board">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-board/10 text-inkmut focus-ring" aria-label="close"><Icon name="x" /></button>
        </div>
        <div className="overflow-y-auto grow px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line bg-parch flex flex-wrap gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel, danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel: string; danger?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
      </>}>
      <div className="flex gap-3 items-start">
        <span className={`p-2.5 rounded-xl ${danger ? "bg-danger/10 text-danger" : "bg-board/10 text-board"}`}><Icon name="alert" size={22} /></span>
        <p className="text-sm text-ink leading-relaxed pt-1.5">{message}</p>
      </div>
    </Modal>
  );
}

/* ── Small pieces ──────────────────────────────────────────── */
export function Field({ label, children, hint, className = "" }: { label: ReactNode; children: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-inkmut mt-1">{hint}</p>}
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange, dark = false }: {
  options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; dark?: boolean;
}) {
  return (
    <div className={`inline-flex rounded-xl p-1 gap-0.5 ${dark ? "bg-board-2/60" : "bg-board/8 border border-line"}`}>
      {options.map((o) => (
        <button type="button" key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-ring ${value === o.id ? (dark ? "bg-amber text-board-2 shadow" : "bg-board text-cream shadow") : dark ? "text-cream/60 hover:text-cream" : "text-inkmut hover:text-board"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LangToggle({ dark = false }: { dark?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={`inline-flex items-center rounded-xl p-0.5 gap-0.5 ${dark ? "bg-white/10" : "bg-board/8 border border-line"}`} title="Français / English">
      <Icon name="globe" size={14} className={`ml-1.5 ${dark ? "text-amber" : "text-board"}`} />
      {(["fr", "en"] as const).map((l) => (
        <button type="button" key={l} onClick={() => setLocale(l)}
          className={`px-2 py-1 rounded-[9px] text-[11px] font-extrabold uppercase tracking-wide transition-all focus-ring ${locale === l ? "bg-amber text-board-2 shadow" : dark ? "text-cream/60 hover:text-cream" : "text-inkmut hover:text-board"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function RefreshButton({ compact = false }: { compact?: boolean }) {
  const { refresh, syncing, lastSync } = useApp();
  const { t, locale } = useI18n();
  return (
    <button type="button" onClick={() => refresh()} disabled={syncing}
      title={`${t("lastSync")}: ${lastSync ? lastSync.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-GB") : "—"}`}
      className={`btn ${compact ? "btn-ghost btn-sm" : "btn-amber btn-sm"} focus-ring`}>
      <Icon name="refresh" size={15} className={syncing ? "spin" : ""} />
      <span className="hidden md:inline">{syncing ? t("syncing") : t("refresh")}</span>
    </button>
  );
}

const TONES: Record<string, string> = {
  green: "bg-ok/12 text-ok",
  amber: "bg-amber/15 text-amber-2",
  red: "bg-danger/10 text-danger",
  blue: "bg-cblue/10 text-cblue",
  magenta: "bg-magenta/10 text-magenta",
  board: "bg-board/10 text-board",
  gray: "bg-inkmut/10 text-inkmut",
};

export function Badge({ tone = "board", children }: { tone?: string; children: ReactNode }) {
  return <span className={`chip ${TONES[tone] ?? TONES.board}`}>{children}</span>;
}

export function StatCard({ icon, label, value, sub, tone = "#173f2f" }: {
  icon: string; label: string; value: ReactNode; sub?: ReactNode; tone?: string;
}) {
  return (
    <div className="card p-4 relative overflow-hidden group hover:-translate-y-0.5 transition-transform">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-inkmut">{label}</p>
          <p className="font-display font-bold text-[1.55rem] leading-tight text-ink mt-1 tabular truncate">{value}</p>
          {sub && <div className="text-[11.5px] text-inkmut mt-1">{sub}</div>}
        </div>
        <span className="p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3" style={{ background: tone + "1c", color: tone }}>
          <Icon name={icon} size={20} />
        </span>
      </div>
    </div>
  );
}

export function EmptyState({ icon = "book", title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 anim-fade">
      <div className="relative">
        <span className="absolute -inset-3 rounded-full bg-amber/15 animate-pulse" />
        <span className="relative inline-flex p-4 rounded-2xl bg-board/8 text-board"><Icon name={icon} size={30} /></span>
      </div>
      <p className="font-display font-bold text-board text-lg mt-4">{title}</p>
      {hint && <p className="text-sm text-inkmut mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Toasts ────────────────────────────────────────────────── */
export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  const { t } = useI18n();
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className={`pointer-events-auto anim-pop flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold
          ${toast.kind === "error" ? "bg-[#3d1512] border-danger/50 text-[#ffd9d2]" : toast.kind === "info" ? "bg-board-2 border-board-3 text-cream" : "bg-board-2 border-ok/50 text-cream"}`}>
          <span className={toast.kind === "error" ? "text-danger" : toast.kind === "info" ? "text-amber" : "text-ok"}>
            <Icon name={toast.kind === "error" ? "alert" : toast.kind === "info" ? "refresh" : "check"} size={17} />
          </span>
          <span className="grow">
            {toast.msg === "__synced__"
              ? t("synced")
              : toast.msg.startsWith("__auto_updated__:")
              ? t("ad.autoUpdated", { v: toast.msg.split(":")[1] ?? "" })
              : toast.msg}
          </span>
          {toast.action && (
            <button className="btn btn-amber btn-sm shrink-0" onClick={() => { toast.action!.run(); dismissToast(toast.id); }}>
              {toast.action.label}
            </button>
          )}
          <button onClick={() => dismissToast(toast.id)} className="opacity-60 hover:opacity-100 shrink-0"><Icon name="x" size={14} /></button>
        </div>
      ))}
    </div>
  );
}

/* ── Document preview modal (PDF print / Word / WhatsApp) ──── */
export function DocPreview({ open, onClose, html, filename, title, onWhatsApp, landscape = false, extra }: {
  open: boolean; onClose: () => void; html: string; filename: string; title: string; onWhatsApp?: () => void; landscape?: boolean; extra?: ReactNode;
}) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const w = wrapRef.current?.clientWidth ?? 600;
      if (w > 0) setScale(Math.min(1, w / (landscape ? 1140 : 812)));
    };
    compute();
    const ro = wrapRef.current ? new ResizeObserver(compute) : null;
    if (ro && wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", compute);
    return () => { ro?.disconnect(); window.removeEventListener("resize", compute); };
  }, [open, landscape]);
  const frameW = landscape ? 1140 : 812;
  const frameH = landscape ? 812 : 1148;
  return (
    <Modal open={open} onClose={onClose} title={title} wide
      footer={<>
        {onWhatsApp && <button type="button" className="btn btn-wa" onClick={onWhatsApp}><WaIcon size={16} /> WhatsApp</button>}
        <button type="button" className="btn btn-ghost" onClick={() => downloadWord(html, filename)}><Icon name="fileText" size={16} /> {t("exportWord")}</button>
        <button type="button" className="btn btn-primary" onClick={() => printHTML(html)}><Icon name="printer" size={16} /> {t("exportPdf")}</button>
      </>}>
      {extra && <div className="mb-3 flex flex-wrap items-center gap-2">{extra}</div>}
      <div ref={wrapRef} className="w-full overflow-hidden rounded-xl border border-line bg-[#e8e4d8]" style={{ height: Math.min(560, frameH * scale + 8) }}>
        <iframe title={title} srcDoc={html} className="doc-frame" style={{ width: frameW, height: frameH, transform: `scale(${scale})`, transformOrigin: "top left" }} />
      </div>
      <p className="text-[11px] text-inkmut mt-2 flex items-center gap-1.5"><Icon name="info" size={13} /> {t("preview")} · A4 {landscape ? "paysage / landscape" : "portrait"}</p>
    </Modal>
  );
}

export function CopyBtn({ text }: { text: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch { /* fallback below */ }
      if (!ok) {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.cssText = "position:fixed;left:-9999px;top:0;";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        } catch { /* noop */ }
      }
      setDone(true); setTimeout(() => setDone(false), 1600);
    }}>
      <Icon name={done ? "check" : "copy"} size={14} /> {done ? t("copied") : t("copy")}
    </button>
  );
}
