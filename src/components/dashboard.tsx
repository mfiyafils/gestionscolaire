"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { classLabel, money, fmtDate, todayISO, ageFrom, STRUCTURE, BLOCKS, BLOCK_COLORS, SEX_COLORS, CHART, allowedBlocks, type Block } from "@/lib/core";
import { studentsHTML } from "@/lib/docs";
import { Icon, StatCard, Badge, RefreshButton, DocPreview } from "@/components/ui";
import { StackedBars, Donut, Sparkline, HBar } from "@/components/charts";

export function DashboardView({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { data, act, refresh, syncing } = useApp();
  const { t, locale } = useI18n();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [blockFilter, setBlockFilter] = useState<"all" | Block>("all");

  const paidBlocks = useMemo(
    () => (data && !data.tenant.isSandbox ? allowedBlocks(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure) : BLOCKS),
    [data]
  );
  const isPaidBlock = (b: Block) => paidBlocks.includes(b);

  const scoped = useMemo(() => {
    if (!data) return null;
    const classes = blockFilter === "all" ? data.classes : data.classes.filter((c) => c.block === blockFilter);
    const classIds = new Set(classes.map((c) => c.id));
    const students = blockFilter === "all" ? data.students : data.students.filter((s) => classIds.has(s.classId));
    const stuIds = new Set(students.map((s) => s.id));
    const payments = blockFilter === "all" ? data.payments : data.payments.filter((p) => stuIds.has(p.studentId));
    return { classes, students, payments };
  }, [data, blockFilter]);

  const stats = useMemo(() => {
    if (!scoped) return null;
    const { students, payments } = scoped;
    const girls = students.filter((s) => s.sex === "F").length;
    const expected = students.reduce((a, s) => a + s.tuitionTotal, 0);
    const collected = payments.reduce((a, p) => a + p.amount, 0);
    const today = payments.filter((p) => p.paidAt === todayISO()).reduce((a, p) => a + p.amount, 0);
    return { total: students.length, girls, boys: students.length - girls, expected, collected, unpaid: Math.max(0, expected - collected), rate: expected > 0 ? (collected / expected) * 100 : 0, today };
  }, [scoped]);

  const spark = useMemo(() => {
    if (!scoped) return { points: [] as number[], labels: [] as string[] };
    const points: number[] = [], labels: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      points.push(scoped.payments.filter((p) => p.paidAt === iso).reduce((a, p) => a + p.amount, 0));
      labels.push(fmtDate(iso, locale));
    }
    return { points, labels };
  }, [scoped, locale]);

  if (!data || !scoped || !stats) return null;
  const upd = data.latestUpdate;
  const hasUpdate = upd && upd.version !== data.tenant.seenVersion;

  const classItems = scoped.classes
    .map((c) => ({
      label: classLabel(c, locale).replace(" Bil.", "ᴮ").replace(" Tech.", "ᵀ"),
      a: scoped.students.filter((s) => s.classId === c.id && s.sex === "M").length,
      b: scoped.students.filter((s) => s.classId === c.id && s.sex === "F").length,
    }))
    .filter((c) => c.a + c.b > 0);

  const blockSlices = BLOCKS.map((b) => ({
    label: locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en,
    value: data.students.filter((s) => data.classes.find((c) => c.id === s.classId)?.block === b).length,
    color: BLOCK_COLORS[b as Block],
  }));

  const recent = [...scoped.students].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const blockScopeLabel = blockFilter === "all" ? undefined : (locale === "fr" ? STRUCTURE[blockFilter].fr : STRUCTURE[blockFilter].en);

  const applyUpdate = async () => {
    await refresh(true);
    await act("seen.update");
  };

  // Auto-acknowledge freshly propagated updates smoothly when user is already on the latest sync
  useEffect(() => {
    if (hasUpdate && upd?.version) {
      const timer = setTimeout(() => { void act("seen.update"); }, 12000);
      return () => clearTimeout(timer);
    }
  }, [hasUpdate, upd?.version, act]);

  return (
    <div className="space-y-5">
      {/* Update banner */}
      {hasUpdate ? (
        <div className="anim-in rounded-2xl border-2 border-amber/60 bg-gradient-to-r from-amber/20 via-amber/10 to-coral/10 px-4 py-3.5 flex flex-wrap items-center gap-3">
          <span className="p-2 rounded-xl bg-amber text-board-2 shrink-0"><Icon name="rocket" size={19} /></span>
          <div className="grow min-w-[200px]">
            <p className="text-sm font-bold text-board">
              {t("dash.updateAvailable", { v: upd.version, t: locale === "fr" ? upd.titleFr : upd.titleEn })}
            </p>
            <p className="text-xs text-inkmut mt-0.5">{locale === "fr" ? upd.notesFr : upd.notesEn}</p>
          </div>
          <button className="btn btn-amber btn-sm" onClick={applyUpdate} disabled={syncing}>
            <Icon name="refresh" size={14} className={syncing ? "spin" : ""} /> {t("dash.applyUpdate")}
          </button>
        </div>
      ) : (
        upd && (
          <div className="flex items-center gap-2 text-xs text-inkmut px-1 anim-fade">
            <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
            {t("dash.upToDate")} · v{upd.version}
          </div>
        )
      )}

      {/* Structures bar + Global refresh */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3 anim-fade">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-inkmut mr-1 inline-flex items-center gap-1">
            <Icon name="filter" size={12} /> {t("cls.block")} :
          </span>
          <button type="button" onClick={() => setBlockFilter("all")}
            className={`chip transition-all cursor-pointer ${blockFilter === "all" ? "bg-board text-white shadow" : "bg-parch text-ink border border-line hover:border-board"}`}>
            {t("blk.all")}
          </button>
          {BLOCKS.map((b) => {
            const paid = isPaidBlock(b);
            return (
              <div key={b} className="inline-flex items-center gap-1">
                <button type="button" disabled={!paid} onClick={() => paid && setBlockFilter(blockFilter === b ? "all" : b)}
                  title={!paid ? t("blk.forbidden") : undefined}
                  className={`chip transition-all border ${!paid
                    ? "bg-gray-200/80 text-gray-500 border-gray-300 opacity-60 grayscale cursor-not-allowed"
                    : blockFilter === b
                    ? "text-white shadow cursor-pointer"
                    : "bg-white text-ink hover:border-board cursor-pointer"}`}
                  style={paid && blockFilter === b ? { background: BLOCK_COLORS[b], borderColor: BLOCK_COLORS[b] } : paid ? { borderColor: BLOCK_COLORS[b] + "70" } : undefined}>
                  <span className="w-2 h-2 rounded-full" style={{ background: !paid ? "#9ca3af" : blockFilter === b ? "#fff" : BLOCK_COLORS[b] }} />
                  {locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}
                  {!paid && <span className="ml-1 text-[9.5px] uppercase font-extrabold">🔒</span>}
                </button>
                {!paid && (
                  <button type="button" onClick={() => onNavigate("settings")} className="text-[10.5px] font-bold text-amber-2 underline hover:text-board cursor-pointer">
                    {t("blk.unlock")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <RefreshButton />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 stagger">
        <StatCard icon="users" label={t("dash.effectif")} value={stats.total} tone="#173f2f"
          sub={<span><b style={{ color: SEX_COLORS.F }}>{stats.girls} {t("girls")}</b> · <b style={{ color: SEX_COLORS.M }}>{stats.boys} {t("boys")}</b></span>} />
        <StatCard icon="wallet" label={t("dash.collected")} value={money(stats.collected)} tone={CHART.green} />
        <StatCard icon="alert" label={t("dash.remaining")} value={money(stats.unpaid)} tone={CHART.coral} />
        <StatCard icon="spark" label={t("dash.rate")} value={`${Math.round(stats.rate)}%`} tone={CHART.blue}
          sub={<span className="block h-1.5 rounded-full bg-board/10 mt-1 overflow-hidden"><span className="block h-full rounded-full transition-all duration-700" style={{ width: `${stats.rate}%`, background: "linear-gradient(90deg,#2E5FE8,#1F8A70)" }} /></span>} />
        <StatCard icon="calendar" label={t("dash.today")} value={money(stats.today)} tone={CHART.amber} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2 anim-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-board">{t("dash.byClass")}</h3>
            <Badge tone="board">{scoped.classes.length} {locale === "fr" ? "classes" : "classes"}</Badge>
          </div>
          {classItems.length ? (
            <StackedBars items={classItems} colorA={SEX_COLORS.M} colorB={SEX_COLORS.F} labelA={t("boys")} labelB={t("girls")} />
          ) : (
            <button className="w-full py-10 text-sm text-inkmut hover:text-board" onClick={() => onNavigate("enroll")}>
              {t("dash.noRecent")} — {t("nav.enroll")} →
            </button>
          )}
        </div>
        <div className="card p-5 anim-in" style={{ animationDelay: "90ms" }}>
          <h3 className="font-display font-bold text-board mb-4">{t("dash.byBlock")}</h3>
          <Donut slices={blockSlices} centerLabel={t("students")} centerValue={String(stats.total)} />
          <div className="ledger-divider mt-4 pt-3 space-y-1.5">
            {BLOCKS.map((b) => {
              const paid = isPaidBlock(b);
              const count = data.classes.filter((c) => c.block === b).length;
              const active = blockFilter === b;
              return (
                <button type="button" key={b} disabled={!paid} onClick={() => paid && setBlockFilter(active ? "all" : b)}
                  className={`w-full flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 transition-colors ${!paid
                    ? "bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed"
                    : active
                    ? "bg-board text-white cursor-pointer"
                    : "hover:bg-parch cursor-pointer"}`}>
                  <span className="font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: !paid ? "#9ca3af" : active ? "#f0a52b" : BLOCK_COLORS[b] }} />
                    {locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}
                    {!paid && <span className="text-[10px] font-bold uppercase text-gray-500">({t("blk.unpaid")})</span>}
                  </span>
                  <span className="tabular font-bold">{count} {locale === "fr" ? "classes" : "classes"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Finance + recent */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 anim-in">
          <h3 className="font-display font-bold text-board mb-4">{t("dash.finance")}</h3>
          <div className="space-y-4">
            <HBar label={t("dash.collected")} value={stats.collected} max={Math.max(1, stats.expected)} color={CHART.green} right={money(stats.collected)} />
            <HBar label={t("dash.remaining")} value={stats.unpaid} max={Math.max(1, stats.expected)} color={CHART.coral} right={money(stats.unpaid)} />
            <HBar label={t("dash.expected")} value={stats.expected} max={Math.max(1, stats.expected)} color={CHART.blue} right={money(stats.expected)} />
          </div>
          <div className="ledger-divider mt-5 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-inkmut mb-2">{t("dash.cash14")}</p>
            <Sparkline points={spark.points} labels={spark.labels} format={money} />
          </div>
        </div>

        <div className="card p-5 anim-in" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-board">{t("dash.recent")}</h3>
            <button className="text-xs font-bold text-board underline decoration-amber decoration-2 underline-offset-2" onClick={() => onNavigate("register")}>{t("dash.viewRegister")}</button>
          </div>
          {recent.length === 0 ? <p className="text-sm text-inkmut py-6 text-center">{t("dash.noRecent")}</p> : (
            <ul className="space-y-2.5">
              {recent.map((s) => {
                const c = data.classes.find((x) => x.id === s.classId);
                return (
                  <li key={s.id}>
                    <button className="w-full flex items-center gap-3 text-left rounded-xl px-2 py-1.5 hover:bg-amber/10 transition-colors" onClick={() => onNavigate("register")}>
                      <span className="w-8 h-8 rounded-full text-white text-[10px] font-extrabold inline-flex items-center justify-center shrink-0" style={{ background: SEX_COLORS[s.sex as "M"] }}>
                        {s.firstName[0]}{s.lastName[0]}
                      </span>
                      <span className="grow min-w-0">
                        <span className="block text-sm font-semibold truncate">{s.firstName} {s.lastName.toUpperCase()}</span>
                        <span className="block text-[10.5px] text-inkmut font-mono">{s.matricule} · {c ? classLabel(c, locale) : ""} · {ageFrom(s.birthDate)} {t("yearsOld")}</span>
                      </span>
                      <span className="text-[10.5px] text-inkmut shrink-0">{fmtDate(s.enrolledAt, locale)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5 anim-in" style={{ animationDelay: "160ms" }}>
          <h3 className="font-display font-bold text-board mb-3">{t("dash.quick")}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: "userPlus", label: t("nav.enroll"), view: "enroll", tone: "#0f3325" },
              { icon: "book", label: t("nav.grades"), view: "grades", tone: "#7A5FD0" },
              { icon: "wallet", label: t("nav.cash"), view: "cash", tone: "#1b8654" },
              { icon: "phone", label: t("nav.whatsapp"), view: "whatsapp", tone: "#149645" },
              { icon: "fileText", label: t("nav.reports"), view: "reports", tone: "#1b4fd6" },
              { icon: "building", label: t("nav.staff"), view: "staff", tone: "#ad1e67" },
            ].map((a) => (
              <button type="button" key={a.view} onClick={() => onNavigate(a.view)}
                className="group rounded-xl border border-line bg-parch/40 px-3 py-3 flex flex-col items-center gap-1.5 hover:border-board hover:bg-white hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                <span className="p-2 rounded-xl transition-transform group-hover:scale-110 group-hover:-rotate-6" style={{ background: a.tone + "18", color: a.tone }}>
                  <Icon name={a.icon} size={18} />
                </span>
                <span className="text-xs font-bold text-ink text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost w-full mt-3" disabled={scoped.students.length === 0} onClick={() => setPreviewOpen(true)}>
            <Icon name="printer" size={15} /> {t("exportPdf")} — {t("nav.register")}{blockScopeLabel ? ` (${blockScopeLabel})` : ""}
          </button>
          <div className="mt-3 flex justify-center"><RefreshButton compact /></div>
        </div>
      </div>
      <DocPreview open={previewOpen} onClose={() => setPreviewOpen(false)}
        html={previewOpen ? studentsHTML(data, scoped.students, locale, blockScopeLabel) : ""}
        filename={blockFilter === "all" ? "registre-eleves" : `registre-${blockFilter}`} title={t("nav.register")} />
    </div>
  );
}