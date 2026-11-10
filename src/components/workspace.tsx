"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PLANS, BLOCKS, parseStructures, STRUCTURE, type Block } from "@/lib/core";
import { Icon, Logo, LangToggle, RefreshButton, ToastHost } from "@/components/ui";
import { DashboardView } from "@/components/dashboard";
import { RegisterView, EnrollView } from "@/components/students";
import { GradesView } from "@/components/grades";
import { CashView } from "@/components/finance";
import { SettingsView } from "@/components/settings";
import { ParentsWhatsappView, ReportsView, ArchivesView, StaffView } from "@/components/modules";

export type ViewId =
  | "dashboard"
  | "register"
  | "enroll"
  | "grades"
  | "cash"
  | "whatsapp"
  | "reports"
  | "archives"
  | "staff"
  | "settings";

const NAV: { id: ViewId; icon: string; key: string }[] = [
  { id: "dashboard", icon: "dash", key: "nav.dashboard" },
  { id: "register", icon: "users", key: "nav.register" },
  { id: "enroll", icon: "userPlus", key: "nav.enroll" },
  { id: "grades", icon: "book", key: "nav.grades" },
  { id: "cash", icon: "wallet", key: "nav.cash" },
  { id: "whatsapp", icon: "phone", key: "nav.whatsapp" },
  { id: "reports", icon: "fileText", key: "nav.reports" },
  { id: "archives", icon: "clock", key: "nav.archives" },
  { id: "staff", icon: "building", key: "nav.staff" },
  { id: "settings", icon: "gear", key: "nav.settings" },
];

const SUBTITLES: Record<ViewId, string> = {
  dashboard: "dash.subtitle",
  register: "reg.subtitle",
  enroll: "en.subtitle",
  grades: "gr.subtitle",
  cash: "ca.subtitle",
  whatsapp: "wa.subtitle",
  reports: "rep.subtitle",
  archives: "arc.subtitle",
  staff: "stf.subtitle",
  settings: "se.subtitle",
};

export function Workspace({ embedded = false }: { embedded?: boolean }) {
  const { data, logout, syncing, lastSync } = useApp();
  const { t, locale } = useI18n();
  const [view, setView] = useState<ViewId>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusBlock, setFocusBlock] = useState<Block | null>(null);

  /* Targeted redirect: after login the school may land with ?block=<subsystem> */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const b = params.get("block");
      if (b && (BLOCKS as string[]).includes(b)) setFocusBlock(b as Block);
    } catch { /* no-op */ }
  }, []);

  if (!data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-board">
        <Logo size={52} />
        <Icon name="refresh" size={22} className="spin text-amber-2" />
        <p className="text-sm font-semibold text-inkmut">{t("loading")}</p>
      </div>
    );
  }

  const sandbox = data.tenant.isSandbox;
  const plan = PLANS.find((p) => p.id === data.tenant.plan) ?? PLANS[0];
  const purchasedBlocks: Block[] = sandbox
    ? [...BLOCKS]
    : parseStructures(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure);

  /* A requested block that is not purchased is silently dropped. */
  useEffect(() => {
    if (focusBlock && !sandbox && !purchasedBlocks.includes(focusBlock)) setFocusBlock(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, focusBlock]);

  const nav = (v: string, block: Block | null = null) => {
    setView(v as ViewId);
    setFocusBlock(v === "dashboard" ? block : null);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openSubsystem = (b: Block) => {
    if (!purchasedBlocks.includes(b)) return;
    nav("dashboard", b);
  };

  const SubsystemLinks = ({ dark, onPick }: { dark?: boolean; onPick?: () => void }) => (
    <div className="pt-3 mt-3 border-t border-white/10">
      <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-cream/40 px-3.5 pb-1.5">{t("nav.subsystems")}</p>
      <div className="space-y-1">
        {BLOCKS.map((b) => {
          const unlocked = purchasedBlocks.includes(b);
          return (
            <button
              key={b}
              type="button"
              disabled={!unlocked}
              onClick={() => { if (unlocked) { openSubsystem(b); onPick?.(); } }}
              title={unlocked ? undefined : t("nav.moduleLocked")}
              aria-disabled={!unlocked}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all
                ${!unlocked
                  ? "text-cream/35 cursor-not-allowed opacity-70 grayscale"
                  : focusBlock === b && view === "dashboard"
                  ? "bg-amber/25 text-cream"
                  : dark ? "text-cream/75 hover:bg-white/8 hover:text-cream" : "text-inkmut hover:bg-board/8 hover:text-board"}`}>
              <Icon name={unlocked ? "building" : "lock"} size={15} />
              <span className="grow text-left">{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</span>
              {!unlocked && <span className="text-[9px] font-bold uppercase tracking-wide">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  const NavLinks = ({ dark, onPick }: { dark?: boolean; onPick?: () => void }) => (
    <nav className="space-y-1">
      {NAV.map((n) => (
        <button key={n.id} onClick={() => { nav(n.id); onPick?.(); }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all focus-ring
            ${view === n.id
              ? "bg-amber text-board-2 shadow-lg shadow-black/20"
              : dark ? "text-cream/75 hover:bg-white/8 hover:text-cream" : "text-ink hover:bg-board/8"}`}>
          <Icon name={n.icon} size={17} />
          <span className="grow text-left">{t(n.key)}</span>
          {view === n.id && <Icon name="chevR" size={14} />}
        </button>
      ))}
    </nav>
  );

  return (
    <div className={embedded ? "" : "min-h-dvh lg:pl-[264px]"}>
      {/* ── Desktop sidebar ── */}
      {!embedded && (
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[264px] chalkboard chalk-frame flex-col z-40">
          <div className="px-5 pt-6 pb-4 flex items-center gap-3">
            <Logo size={40} />
            <div>
              <p className="font-display font-black text-cream text-xl leading-none">Scolaria</p>
              <p className="text-[10px] text-amber font-bold tracking-[0.18em] uppercase mt-1">MFIYA & Fils</p>
            </div>
          </div>
          <div className="mx-4 mb-4 rounded-xl bg-white/6 border border-white/10 px-3.5 py-3">
            <p className="text-[10px] uppercase tracking-widest text-cream/50 font-bold">{t("nav.school")}</p>
            <p className="text-sm font-bold text-cream leading-snug mt-0.5 line-clamp-2">{data.tenant.name}</p>
          </div>
          <div className="px-3 grow overflow-y-auto dark-scroll">
            <NavLinks dark />
            <SubsystemLinks dark />
          </div>
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="chip bg-amber/20 text-amber">{locale === "fr" ? plan.shortFr : plan.shortEn}</span>
              <span className="text-cream/50 tabular">{lastSync ? lastSync.toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
            </div>
            <button onClick={() => void logout()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-cream/70 hover:text-coral hover:bg-white/6 transition-colors">
              <Icon name="logout" size={16} /> {t("logout")}
            </button>
          </div>
        </aside>
      )}

      {/* ── Simulation ribbon ── */}
      {sandbox && (
        <div className={`${embedded ? "" : "sticky top-0 z-50"} bg-gradient-to-r from-coral via-amber to-coral text-board-2 text-center text-[11px] font-extrabold tracking-[0.2em] uppercase py-1.5`}>
          ⚗ {t("ad.simulation")} — {t("ad.sandboxMsg")}
        </div>
      )}

      {/* ── Header ── */}
      <header className={`${embedded ? "relative" : `sticky ${sandbox ? "top-[26px]" : "top-0"}`} z-40 bg-paper/90 backdrop-blur border-b border-line`}>
        <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
          {!embedded && (
            <button className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-board/8 text-board" onClick={() => setMenuOpen(true)} aria-label="menu">
              <Icon name="menu" size={22} />
            </button>
          )}
          {!embedded && <span className="lg:hidden"><Logo size={30} /></span>}
          <div className="min-w-0">
            <h1 className="font-display font-bold text-board text-lg leading-tight truncate">{t(NAV.find((n) => n.id === view)!.key)}</h1>
            <p className="hidden md:block text-[11px] text-inkmut truncate">{t(SUBTITLES[view])}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`hidden sm:flex items-center gap-1.5 text-[10.5px] font-bold ${syncing ? "text-warn" : "text-ok"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncing ? "bg-warn animate-ping" : "bg-ok"}`} />
              {syncing ? t("syncing") : "API"}
            </span>
            <LangToggle />
            <RefreshButton />
            {view !== "settings" && (
              <button className="inline-flex p-2.5 rounded-xl border border-line text-board hover:bg-board/8" onClick={() => nav("settings")} title={t("nav.settings")}>
                <Icon name="gear" size={16} />
              </button>
            )}
          </div>
        </div>
        {/* Mobile horizontal tabs (keeps Caisse, Parents WhatsApp, Rapports, Archives, Personnel always visible) */}
        <div className={`${embedded ? "flex" : "flex lg:hidden"} px-4 lg:px-8 pb-2.5 gap-1.5 overflow-x-auto`}>
          {NAV.map((n) => (
            <button type="button" key={n.id} onClick={() => nav(n.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer
                ${view === n.id ? "bg-board text-white shadow-md" : "bg-white border border-line text-ink hover:border-board"}`}>
              <Icon name={n.icon} size={13} /> {t(n.key)}
            </button>
          ))}
        </div>
      </header>

      {/* ── Mobile slide-over menu ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-board-2/70 backdrop-blur-[2px] anim-fade" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[290px] chalkboard chalk-frame flex flex-col anim-drawer" style={{ animationName: "fadeIn" }}>
            <div className="px-5 pt-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Logo size={34} />
                <p className="font-display font-black text-cream text-lg">Scolaria</p>
              </div>
              <button className="p-2 text-cream/70 hover:text-cream" onClick={() => setMenuOpen(false)}><Icon name="x" size={20} /></button>
            </div>
            <div className="mx-4 mb-3 rounded-xl bg-white/6 border border-white/10 px-3.5 py-2.5">
              <p className="text-sm font-bold text-cream leading-snug">{data.tenant.name}</p>
              <p className="text-[10px] text-amber font-bold mt-0.5">{locale === "fr" ? plan.shortFr : plan.shortEn} · {t("active")}</p>
            </div>
            <div className="px-3 grow overflow-y-auto dark-scroll">
              <NavLinks dark onPick={() => setMenuOpen(false)} />
              <SubsystemLinks dark onPick={() => setMenuOpen(false)} />
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={() => void logout()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-cream/70 hover:text-coral">
                <Icon name="logout" size={16} /> {t("logout")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <main className={`px-4 lg:px-8 py-5 ${embedded ? "pb-10" : "pb-28 lg:pb-10"} max-w-[1500px] mx-auto`}>
        <div key={view + (focusBlock ?? "")} className="anim-fade">
          {view === "dashboard" && <DashboardView onNavigate={nav} initialBlock={focusBlock} />}
          {view === "register" && <RegisterView onNavigate={nav} initialBlock={focusBlock} />}
          {view === "enroll" && <EnrollView onNavigate={nav} />}
          {view === "grades" && <GradesView initialBlock={focusBlock} />}
          {view === "cash" && <CashView initialBlock={focusBlock} />}
          {view === "whatsapp" && <ParentsWhatsappView />}
          {view === "reports" && <ReportsView />}
          {view === "archives" && <ArchivesView />}
          {view === "staff" && <StaffView />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>

      {/* ── Mobile bottom nav (thumb zone) ── */}
      {!embedded && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-board-2/97 backdrop-blur border-t border-board-3 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
          <div className="grid grid-cols-5 items-end max-w-md mx-auto">
            {(["dashboard", "register", "enroll", "grades", "cash"] as ViewId[]).map((id) => {
              const n = NAV.find((x) => x.id === id)!;
              if (id === "enroll") {
                return (
                  <button key={id} onClick={() => nav(id)} className="flex flex-col items-center -mt-6" aria-label={t(n.key)}>
                    <span className={`w-13 h-13 p-3.5 rounded-full shadow-xl shadow-black/40 border-4 border-paper transition-transform active:scale-95 ${view === id ? "bg-coral text-white" : "bg-amber text-board-2"}`}>
                      <Icon name="userPlus" size={22} />
                    </span>
                  </button>
                );
              }
              return (
                <button key={id} onClick={() => nav(id)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[9.5px] font-bold transition-colors ${view === id ? "text-amber" : "text-cream/55"}`}>
                  <Icon name={n.icon} size={19} />
                  {t(n.key).split(" ")[0]}
                </button>
              );
            })}
          </div>
        </nav>
      )}
      <ToastHost />
    </div>
  );
}