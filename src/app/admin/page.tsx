"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PLANS, PLATFORM, money, fmtDate, waLink, STRUCTURE, BLOCKS, BLOCK_COLORS, classLabel, parseStructures, subscriptionPrice, structureLabel, type Block } from "@/lib/core";
import type { AdminTenant, SubRequestRow } from "@/lib/types";
import { Icon, WaIcon, Logo, LangToggle, RefreshButton, ToastHost, Modal, Confirm, Field, Badge, StatCard, EmptyState, CopyBtn } from "@/components/ui";
import { Workspace } from "@/components/workspace";
import { AiCodeAssistant } from "@/components/ai-updater";

type Tab = "tenants" | "requests" | "updates" | "sandbox";

export default function AdminPage() {
  const { ready, role, admin, data, act, toast, login, logout, refresh, syncing } = useApp();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tenants");
  const [addOpen, setAddOpen] = useState(false);
  const [editFor, setEditFor] = useState<AdminTenant | null>(null);
  const [deleteFor, setDeleteFor] = useState<AdminTenant | null>(null);
  const [creds, setCreds] = useState<{ email: string; password?: string; phone?: string; schoolName?: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (role === "tenant") router.replace("/app");
  }, [ready, role, router]);

  const stats = useMemo(() => {
    if (!admin) return null;
    const active = admin.tenants.filter((x) => x.status === "active");
    const revenue = active.reduce((a, x) => a + subscriptionPrice(x.plan, x.structures?.length ? x.structures : x.structure), 0);
    return {
      total: admin.tenants.length,
      active: active.length,
      pending: admin.requests.filter((r) => r.status === "pending").length,
      revenue,
    };
  }, [admin]);

  if (!ready || role === "tenant") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <Logo size={56} />
        <Icon name="refresh" size={20} className="spin text-amber-2" />
      </div>
    );
  }

  if (role !== "admin") {
    return <AdminLoginGate onLogin={login} />;
  }

  if (!admin || !stats) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <Logo size={56} />
        <Icon name="refresh" size={20} className="spin text-amber-2" />
      </div>
    );
  }

  const setStatus = async (tenant: AdminTenant, status: string) => {
    setBusyId(tenant.id);
    const res = await act("admin.tenant.update", { id: tenant.id, status });
    setBusyId(null);
    toast(res.ok ? t("savedOk") : t("errorGeneric"), res.ok ? "success" : "error");
  };
  const approve = async (r: SubRequestRow, decision: "approved" | "rejected") => {
    setBusyId(r.id);
    const res = await act("admin.request", { id: r.id, decision });
    setBusyId(null);
    if (res.ok) {
      if (decision === "approved" && res.result?.password) {
        setCreds({ email: String(res.result.email), password: String(res.result.password), phone: String(res.result.phone ?? r.phone), schoolName: r.schoolName });
      } else toast(decision === "approved" ? t("savedOk") : t("savedOk"));
    } else toast(t("errorGeneric"), "error");
  };

  const statusBadge = (s: string) =>
    s === "active" ? <Badge tone="green">{t("active")}</Badge> : s === "suspended" ? <Badge tone="amber">{t("suspended")}</Badge> : <Badge tone="red">{t("revoked")}</Badge>;

  const TABS: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: "tenants", icon: "building", label: t("ad.tenants") },
    { id: "requests", icon: "mail", label: t("ad.requests"), badge: stats.pending },
    { id: "updates", icon: "rocket", label: t("ad.updates") },
    { id: "sandbox", icon: "flask", label: t("ad.sandbox") },
  ];

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-40 chalkboard chalk-frame">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 px-4 lg:px-8 h-16">
          <Logo size={34} light />
          <div className="min-w-0">
            <h1 className="font-display font-black text-cream text-lg leading-none truncate">{t("ad.title")}</h1>
            <p className="text-[10px] text-amber font-bold tracking-wider truncate mt-0.5">{t("ad.protectedBadge")}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle dark />
            <RefreshButton />
            <button type="button" onClick={() => { setCreds(null); void logout(); }} className="p-2.5 rounded-xl text-cream/70 hover:text-coral hover:bg-white/8" title={t("logout")}>
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pb-2.5 flex gap-1.5 overflow-x-auto dark-scroll">
          {TABS.map((x) => (
            <button type="button" key={x.id} onClick={() => setTab(x.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all
                ${tab === x.id ? "bg-amber text-board-2 shadow" : "bg-white/8 text-cream/70 hover:text-cream"}`}>
              <Icon name={x.icon} size={13} /> {x.label}
              {!!x.badge && <span className="ml-0.5 bg-coral text-white rounded-full px-1.5 text-[10px]">{x.badge}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          <StatCard icon="building" label={t("ad.tenants")} value={stats.total} tone="#173f2f" />
          <StatCard icon="check" label={t("ad.activeTenants")} value={stats.active} tone="#2E9E6B" />
          <StatCard icon="mail" label={t("ad.pendingReq")} value={stats.pending} tone="#E9A23B" />
          <StatCard icon="coins" label={t("ad.mrr")} value={money(stats.revenue)} tone="#2E5FE8" />
        </div>

        {/* Privacy + Global Sync bar */}
        <div className="rounded-2xl border border-ok/30 bg-ok/6 px-4 py-3 flex flex-wrap items-center gap-3 anim-in">
          <span className="p-2 rounded-xl bg-ok/15 text-ok shrink-0"><Icon name="shield" size={18} /></span>
          <div className="grow min-w-[220px]">
            <p className="text-sm font-bold text-board">{t("ad.privacyTitle")}</p>
            <p className="text-xs text-inkmut mt-0.5 leading-relaxed">{t("ad.privacyMsg")}</p>
          </div>
          <button type="button" className="btn btn-amber btn-sm shrink-0" onClick={() => void refresh()} disabled={syncing}>
            <Icon name="refresh" size={15} className={syncing ? "spin" : ""} /> {syncing ? t("syncing") : t("refresh")}
          </button>
        </div>

        {/* ── TENANTS ── */}
        {tab === "tenants" && (
          <div className="space-y-3 anim-fade">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-display font-bold text-board text-xl">{t("ad.tenants")}</h2>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Icon name="plus" size={15} /> {t("ad.addTenant")}</button>
            </div>
            {admin.tenants.length === 0 ? (
              <div className="card"><EmptyState icon="building" title={t("ad.noTenants")} /></div>
            ) : (
              <>
                <div className="card overflow-hidden hidden lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-board text-cream/90 text-[11px] uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">{t("se.schoolName")}</th>
                        <th className="px-3 py-3 text-left">{t("email")} / {t("phone")}</th>
                        <th className="px-3 py-3">{t("se.plan")}</th>
                        <th className="px-3 py-3">{t("status")}</th>
                        <th className="px-3 py-3 text-left">{t("ad.subEnds")}</th>
                        <th className="px-3 py-3 text-right">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.tenants.map((x, i) => {
                        const list = parseStructures(x.structures?.length ? x.structures : x.structure);
                        const price = subscriptionPrice(x.plan, list);
                        return (
                          <tr key={x.id} className={`border-t border-line/70 ${i % 2 ? "bg-parch/60" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-board">{x.name}</p>
                                <Badge tone={x.createdByAdmin ? "board" : "gray"}>
                                  {x.createdByAdmin ? t("ad.createdBadge") : t("ad.autoBadge")}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-inkmut mt-0.5">{t("ad.createdAt")} {fmtDate(x.createdAt, locale)}</p>
                            </td>
                            <td className="px-3 py-3 text-xs"><p className="font-semibold">{x.email}</p><p className="text-inkmut tabular">{x.phone || "—"}</p></td>
                            <td className="px-3 py-3 text-center">
                              <Badge tone="blue">{locale === "fr" ? PLANS.find((p) => p.id === x.plan)?.shortFr : PLANS.find((p) => p.id === x.plan)?.shortEn} · {money(price)}</Badge>
                              <div className="flex flex-wrap gap-1 justify-center mt-1">
                                {BLOCKS.map((b) => {
                                  const paid = list.includes(b);
                                  return (
                                    <span key={b} className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${paid ? "bg-ok/15 text-ok" : "bg-gray-100 text-gray-400 line-through"}`}>
                                      {locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">{statusBadge(x.status)}</td>
                            <td className="px-3 py-3 text-xs font-medium">{fmtDate(x.subscriptionEndsAt, locale)}</td>
                            <td className="px-3 py-3">
                              <TenantActions x={x} busy={busyId === x.id} onStatus={setStatus} onEdit={() => setEditFor(x)} onDelete={() => setDeleteFor(x)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="lg:hidden space-y-2.5">
                  {admin.tenants.map((x) => {
                    const list = parseStructures(x.structures?.length ? x.structures : x.structure);
                    const price = subscriptionPrice(x.plan, list);
                    return (
                      <div key={x.id} className="card p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-board">{x.name}</p>
                              <Badge tone={x.createdByAdmin ? "board" : "gray"}>{x.createdByAdmin ? t("ad.createdBadge") : t("ad.autoBadge")}</Badge>
                            </div>
                            <p className="text-[11px] text-inkmut">{x.email} · {x.phone || "—"}</p>
                          </div>
                          {statusBadge(x.status)}
                        </div>
                        <p className="text-[11.5px] text-inkmut">{t("se.plan")}: <b className="text-board">{locale === "fr" ? PLANS.find((p) => p.id === x.plan)?.shortFr : PLANS.find((p) => p.id === x.plan)?.shortEn} · {money(price)}</b> ({structureLabel(list, locale)}) · {t("ad.subEnds")}: {fmtDate(x.subscriptionEndsAt, locale)}</p>
                        <TenantActions x={x} busy={busyId === x.id} onStatus={setStatus} onEdit={() => setEditFor(x)} onDelete={() => setDeleteFor(x)} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── REQUESTS ── */}
        {tab === "requests" && (
          <div className="space-y-3 anim-fade">
            <h2 className="font-display font-bold text-board text-xl">{t("ad.requests")}</h2>
            {admin.requests.length === 0 ? (
              <div className="card"><EmptyState icon="mail" title={t("ad.noRequests")} /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {admin.requests.map((r) => {
                  const plan = PLANS.find((p) => p.id === r.plan);
                  return (
                    <div key={r.id} className={`card p-4 space-y-2.5 ${r.status === "pending" ? "border-amber/50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{r.schoolName}</p>
                          <p className="text-[11px] text-inkmut">{r.email} · {r.phone}</p>
                        </div>
                        {r.status === "pending" ? <Badge tone="amber">{t("pending")}</Badge> : r.status === "approved" ? <Badge tone="green">{t("approved")}</Badge> : <Badge tone="red">{t("rejected")}</Badge>}
                      </div>
                      <p className="text-xs text-inkmut">
                        {plan && <b className="text-board">{locale === "fr" ? plan.fr : plan.en} · {money(subscriptionPrice(r.plan, r.structure))}</b>} · {structureLabel(r.structure, locale)} · {fmtDate(r.createdAt, locale)}
                      </p>
                      <div className="rounded-xl bg-parch border border-line/80 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone={r.paymentMethod === "momo" ? "amber" : "coral"}>
                          {r.paymentMethod === "momo" ? "MTN MoMo" : "Orange Money"}
                        </Badge>
                        <span className="text-inkmut">{t("ad.payRef")}:</span>
                        <span className="font-mono font-bold text-board grow truncate">
                          {r.paymentRef ? r.paymentRef : t("ad.noRef")}
                        </span>
                        {r.paymentRef && <CopyBtn text={r.paymentRef} />}
                      </div>
                      {r.status === "pending" && (
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-primary btn-sm grow" disabled={busyId === r.id} onClick={() => approve(r, "approved")}>
                            <Icon name="check" size={14} /> {t("ad.approve")}
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" disabled={busyId === r.id} onClick={() => approve(r, "rejected")}>
                            <Icon name="x" size={14} /> {t("ad.reject")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── UPDATES & AI AGENT ── */}
        {tab === "updates" && <UpdatesTab onApproveRequest={(r) => approve(r, "approved")} />}

        {/* ── SANDBOX ── */}
        {tab === "sandbox" && (
          <div className="space-y-4 anim-fade">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BLOCKS.map((b) => {
                const cls = data?.classes.filter((c) => c.block === b) ?? [];
                const count = data?.students.filter((s) => cls.some((c) => c.id === s.classId)).length ?? 0;
                return (
                  <div key={b} className="card p-4 border-t-4" style={{ borderTopColor: BLOCK_COLORS[b] }}>
                    <p className="font-display font-bold text-board">{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</p>
                    <p className="text-[11px] text-inkmut mt-0.5">{cls.length} {locale === "fr" ? "classes" : "classes"} · {count} {t("students")}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cls.slice(0, 8).map((c) => <span key={c.id} className="chip bg-board/6 text-inkmut">{classLabel(c, locale)}</span>)}
                      {cls.length > 8 && <span className="chip bg-board/6 text-inkmut">+{cls.length - 8}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border-2 border-dashed border-coral/40 bg-coral/5 px-4 py-3 text-sm text-ink flex items-center gap-2.5">
              <Icon name="flask" size={18} className="text-coral shrink-0" />
              <span><b>{t("ad.sandboxTitle")}</b> — {t("ad.sandboxMsg")}</span>
            </div>
            <div className="card overflow-hidden">
              <Workspace embedded />
            </div>
          </div>
        )}
      </main>

      <AddTenantModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={(c) => { setAddOpen(false); setCreds(c); }} />
      <EditTenantModal x={editFor} onClose={() => setEditFor(null)} onResetPassword={(c) => { setEditFor(null); setCreds(c); }} />
      <Confirm open={!!deleteFor} onClose={() => setDeleteFor(null)} title={t("ad.deleteTenant")} confirmLabel={t("delete")}
        message={deleteFor ? t("ad.confirmDeleteTenant", { name: deleteFor.name }) : ""}
        onConfirm={async () => {
          if (!deleteFor) return;
          const res = await act("admin.tenant.delete", { id: deleteFor.id });
          setDeleteFor(null);
          toast(res.ok ? t("savedOk") : t("errorGeneric"), res.ok ? "success" : "error");
        }} />
      <CredsModal creds={creds} onClose={() => setCreds(null)} />
      <ToastHost />
      {syncing && <div className="fixed top-0 inset-x-0 h-0.5 bg-amber z-[80] animate-pulse" />}
    </div>
  );
}

/* ── Dedicated strict empty Admin login gate ── */
function AdminLoginGate({ onLogin }: { onLogin: (email: string, password: string) => Promise<"tenant" | "admin" | null> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  // Guarantee blank fields on every render/mount
  useEffect(() => {
    setEmail("");
    setPassword("");
    setErr(false);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only the e-mail is mandatory: the principal administrator can sign in
    // directly by e-mail without a password.
    if (!email.trim()) { setErr(true); return; }
    setBusy(true);
    setErr(false);
    const r = await onLogin(email, password);
    setBusy(false);
    if (r === "admin") {
      setEmail("");
      setPassword("");
    } else if (r === "tenant") {
      setEmail("");
      setPassword("");
      router.replace("/app");
    } else {
      setPassword("");
      setErr(true);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-paper">
      <header className="px-4 lg:px-8 h-16 flex items-center justify-between border-b border-line bg-paper/85 backdrop-blur">
        <button type="button" onClick={() => router.push("/")} className="btn btn-ghost btn-sm">
          <Icon name="arrowL" size={15} /> {t("pub.backHome")}
        </button>
        <LangToggle />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md chalkboard chalk-frame rounded-3xl p-6 sm:p-8 shadow-2xl anim-in">
          <div className="flex items-center gap-3 mb-4">
            <Logo size={40} light />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber">{t("ad.protectedBadge")}</p>
              <h1 className="font-display font-black text-cream text-2xl leading-tight">{t("ad.loginTitle")}</h1>
            </div>
          </div>
          <p className="text-xs text-cream/70 mb-5">{t("ad.loginSub")}</p>
          <form onSubmit={submit} autoComplete="off" className="space-y-4">
            <div>
              <label className="label !text-cream/65">{t("email")}</label>
              <input
                type="email"
                name="sa_ident_manual"
                className="input !bg-white/10 !border-white/20 !text-cream placeholder:!text-cream/30"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(false); }}
                placeholder="admin@exemple.com"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                spellCheck={false}
                required
              />
            </div>
            <div>
              <label className="label !text-cream/65">{t("ad.pwdOptional")}</label>
              <input
                type="password"
                name="sa_secret_manual"
                className="input !bg-white/10 !border-white/20 !text-cream placeholder:!text-cream/30"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErr(false); }}
                placeholder="••••••••"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
              />
            </div>
            {err && (
              <p className="text-coral text-xs font-bold flex items-center gap-1.5 anim-pop">
                <Icon name="alert" size={14} /> {t("ad.invalid")}
              </p>
            )}
            <button type="submit" className="btn btn-amber w-full text-base py-3.5" disabled={busy}>
              <Icon name={busy ? "refresh" : "shield"} size={17} className={busy ? "spin" : ""} /> {t("login")}
            </button>
          </form>
          <p className="mt-4 text-[11px] text-cream/55 flex items-start gap-2 leading-relaxed">
            <Icon name="shield" size={13} className="shrink-0 mt-0.5 text-amber" />
            <span>{t("ad.loginHint")}</span>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ── Row actions ── */
function TenantActions({ x, busy, onStatus, onEdit, onDelete }: {
  x: AdminTenant; busy: boolean;
  onStatus: (x: AdminTenant, s: string) => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5 lg:justify-end">
      {x.status === "active" && (
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onStatus(x, "suspended")} title={t("ad.suspend")}>
          <Icon name="pause" size={13} /> <span className="hidden xl:inline">{t("ad.suspend")}</span>
        </button>
      )}
      {x.status === "suspended" && (
        <button className="btn btn-amber btn-sm" disabled={busy} onClick={() => onStatus(x, "active")}>
          <Icon name="play" size={13} /> {t("ad.activate")}
        </button>
      )}
      {x.status === "revoked" && (
        <button className="btn btn-amber btn-sm" disabled={busy} onClick={() => onStatus(x, "active")}>
          <Icon name="play" size={13} /> {t("ad.readmit")}
        </button>
      )}
      {(x.status === "active" || x.status === "suspended") && (
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onStatus(x, "revoked")} title={t("ad.revoke")}>
          <Icon name="x" size={13} /> <span className="hidden xl:inline">{t("ad.revoke")}</span>
        </button>
      )}
      <button className="btn btn-ghost btn-sm" onClick={onEdit} title={t("ad.editContact")}><Icon name="pen" size={13} /></button>
      <button className="btn btn-danger btn-sm" onClick={onDelete} title={t("ad.deleteTenant")}><Icon name="trash" size={13} /></button>
    </div>
  );
}

/* ── Multi-structure picker helper ── */
function StructureCheckboxes({ value, onChange, locale }: { value: Block[]; onChange: (v: Block[]) => void; locale: "fr" | "en" }) {
  const toggle = (b: Block) => {
    if (value.includes(b)) {
      if (value.length > 1) onChange(value.filter((x) => x !== b));
    } else {
      onChange(BLOCKS.filter((x) => value.includes(x) || x === b));
    }
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {BLOCKS.map((b) => {
        const on = value.includes(b);
        return (
          <button type="button" key={b} onClick={() => toggle(b)}
            className={`rounded-xl border-2 px-2.5 py-2 text-left text-xs font-bold transition-all cursor-pointer ${on ? "border-board bg-board text-white shadow" : "border-line bg-parch text-inkmut hover:border-board"}`}>
            <div className="flex items-center justify-between gap-1">
              <span>{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</span>
              <span>{on ? "✓" : "+"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Add tenant ── */
function AddTenantModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void;
  onCreated: (c: { email: string; password?: string; phone?: string; schoolName?: string }) => void;
}) {
  const { act, toast } = useApp();
  const { t, locale } = useI18n();
  const [f, setF] = useState({ name: "", email: "", phone: "", plan: "monthly" });
  const [structures, setStructures] = useState<Block[]>(["nursery", "primary", "secondary"]);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name.trim() || !f.email.trim()) { toast(t("en.required"), "error"); return; }
    setBusy(true);
    const res = await act("admin.tenant.create", { ...f, structures });
    setBusy(false);
    if (res.ok) {
      toast(t("ad.tenantCreated"));
      onCreated({ email: f.email, password: String(res.result?.password ?? ""), phone: f.phone, schoolName: f.name });
      setF({ name: "", email: "", phone: "", plan: "monthly" });
      setStructures(["nursery", "primary", "secondary"]);
    } else toast(res.error === "emailTaken" ? "E-mail déjà utilisé / Email already used" : t("errorGeneric"), "error");
  };
  return (
    <Modal open={open} onClose={onClose} title={t("ad.addTenant")}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}><Icon name="plus" size={15} /> {t("add")}</button>
      </>}>
      <div className="space-y-3.5">
        <Field label={t("se.schoolName")}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label={t("email")}><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label={t("phone")}><input className="input tabular" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label={t("pub.chooseStructure")}>
          <StructureCheckboxes value={structures} onChange={setStructures} locale={locale} />
        </Field>
        <Field label={t("se.plan")}>
          <select className="input" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}>
            {PLANS.map((p) => <option key={p.id} value={p.id}>{locale === "fr" ? p.fr : p.en} — {money(subscriptionPrice(p.id, structures))}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

/* ── Edit contacts & credentials (contact details editable only for admin-created subscribers) ── */
function EditTenantModal({ x, onClose, onResetPassword }: {
  x: AdminTenant | null; onClose: () => void;
  onResetPassword: (c: { email: string; password?: string; phone?: string; schoolName?: string }) => void;
}) {
  const { act, toast } = useApp();
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("monthly");
  const [structures, setStructures] = useState<Block[]>(["nursery", "primary", "secondary"]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (x) {
      setName(x.name);
      setPhone(x.phone);
      setEmail(x.email);
      setPlan(x.plan);
      setStructures(parseStructures(x.structures?.length ? x.structures : x.structure));
    }
  }, [x]);

  const canEditContacts = !!x?.createdByAdmin;

  const submit = async () => {
    if (!x) return;
    setBusy(true);
    const payload = canEditContacts
      ? { id: x.id, name, phone, email, plan, structures }
      : { id: x.id, plan, structures };
    const res = await act("admin.tenant.update", payload);
    setBusy(false);
    if (res.ok) { toast(t("ad.contactSaved")); onClose(); }
    else toast(t("errorGeneric"), "error");
  };
  const resetPw = async () => {
    if (!x) return;
    setBusy(true);
    const res = await act("admin.tenant.update", { id: x.id, resetPassword: true });
    setBusy(false);
    if (res.ok && res.result?.password) {
      onResetPassword({
        email: String(res.result.email), password: String(res.result.password),
        phone: String(res.result.phone ?? phone), schoolName: String(res.result.schoolName ?? name),
      });
    } else toast(t("errorGeneric"), "error");
  };
  return (
    <Modal open={!!x} onClose={onClose} title={`${t("ad.editContact")} — ${x?.name ?? ""}`}
      footer={<>
        <button type="button" className="btn btn-amber btn-sm mr-auto" onClick={resetPw} disabled={busy}><Icon name="key" size={14} /> {t("ad.resetPw")}</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}><Icon name="check" size={15} /> {t("save")}</button>
      </>}>
      <div className="space-y-3.5">
        {!canEditContacts && (
          <p className="text-xs text-amber-2 bg-amber/12 border border-amber/35 rounded-xl px-3 py-2 flex items-center gap-2">
            <Icon name="shield" size={14} className="shrink-0" /> {t("ad.autonomousNote")}
          </p>
        )}
        <Field label={t("se.schoolName")}><input className="input" value={name} disabled={!canEditContacts} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t("phone")}><input className="input tabular" value={phone} disabled={!canEditContacts} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label={t("email")}><input className="input" value={email} disabled={!canEditContacts} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t("pub.chooseStructure")}>
          <StructureCheckboxes value={structures} onChange={setStructures} locale={locale} />
        </Field>
        <Field label={t("se.plan")}>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
            {PLANS.map((p) => <option key={p.id} value={p.id}>{locale === "fr" ? p.fr : p.en} — {money(subscriptionPrice(p.id, structures))}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

/* ── Generated credentials ── */
function CredsModal({ creds, onClose }: { creds: { email: string; password?: string; phone?: string; schoolName?: string } | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  if (!creds) return null;
  const msg = locale === "fr"
    ? `🎓 *Scolaria — ${PLATFORM.company}*\nVotre espace école est prêt${creds.schoolName ? ` pour ${creds.schoolName}` : ""} !\n\n🔗 Connexion : ${typeof window !== "undefined" ? window.location.origin : ""}\n📧 E-mail : ${creds.email}\n🔑 Mot de passe : ${creds.password}\n\nBienvenue ! Changez vos coordonnées dans Paramètres.`
    : `🎓 *Scolaria — ${PLATFORM.company}*\nYour school space is ready${creds.schoolName ? ` for ${creds.schoolName}` : ""}!\n\n🔗 Sign-in: ${typeof window !== "undefined" ? window.location.origin : ""}\n📧 Email: ${creds.email}\n🔑 Password: ${creds.password}\n\nWelcome! Update your details in Settings.`;
  return (
    <Modal open={!!creds} onClose={onClose} title={t("ad.generatedCreds")}
      footer={<button className="btn btn-primary" onClick={onClose}>{t("close")}</button>}>
      <div className="rounded-xl chalkboard text-cream p-4 font-mono text-sm space-y-2">
        <p className="flex items-center justify-between gap-2"><span>📧 {creds.email}</span><CopyBtn text={creds.email} /></p>
        {creds.password && <p className="flex items-center justify-between gap-2"><span>🔑 {creds.password}</span><CopyBtn text={creds.password} /></p>}
      </div>
      {creds.phone && (
        <a className="btn btn-wa w-full mt-4" target="_blank" rel="noreferrer" href={waLink(creds.phone, msg)}>
          <WaIcon size={16} /> {t("ad.sendCreds")}
        </a>
      )}
    </Modal>
  );
}

/* ── Updates publication & AI Code Agent ── */
function UpdatesTab({ onApproveRequest }: { onApproveRequest: (r: SubRequestRow) => Promise<void> }) {
  const { admin, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [f, setF] = useState({ version: "", titleFr: "", titleEn: "", notesFr: "", notesEn: "" });
  const [busy, setBusy] = useState(false);
  if (!admin) return null;
  const pendingRequests = admin.requests.filter((r) => r.status === "pending");

  const publish = async (status: "deployed" | "draft", payload = f) => {
    if (!payload.version.trim() || !payload.titleFr.trim()) { toast(t("en.required"), "error"); return; }
    setBusy(true);
    const res = await act("admin.publish", { ...payload, status });
    setBusy(false);
    if (res.ok) {
      if (status === "deployed") toast(t("ad.published", { v: payload.version }));
      else toast(t("savedOk"));
      setF({ version: "", titleFr: "", titleEn: "", notesFr: "", notesEn: "" });
    } else toast(t("errorGeneric"), "error");
  };
  const deployDraft = async (id: string, version: string) => {
    setBusy(true);
    const res = await act("admin.publish.deploy", { id });
    setBusy(false);
    toast(res.ok ? t("ad.published", { v: version }) : t("errorGeneric"), res.ok ? "success" : "error");
  };
  const approveAll = async () => {
    setBusy(true);
    const res = await act("admin.requests.approveAll");
    setBusy(false);
    toast(res.ok ? t("savedOk") : t("errorGeneric"), res.ok ? "success" : "error");
  };

  return (
    <div className="space-y-4 anim-fade">
      <AiCodeAssistant
        pendingRequests={pendingRequests}
        onApproveRequest={onApproveRequest}
        onApproveAll={approveAll}
        onPrefillRelease={(v) => setF(v)}
        onPublishDirect={(v) => publish("deployed", v)}
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      <div className="card p-5">
        <h2 className="font-display font-bold text-board text-lg flex items-center gap-2"><Icon name="rocket" size={18} className="text-coral" /> {t("ad.publish")}</h2>
        <div className="space-y-3.5 mt-4">
          <Field label={t("ad.version")}><input className="input font-mono" placeholder="2.6.0" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label={t("ad.titleFr")}><input className="input" value={f.titleFr} onChange={(e) => setF({ ...f, titleFr: e.target.value })} /></Field>
            <Field label={t("ad.titleEn")}><input className="input" value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} /></Field>
          </div>
          <Field label={t("ad.notesFr")}><textarea className="input min-h-[70px]" value={f.notesFr} onChange={(e) => setF({ ...f, notesFr: e.target.value })} /></Field>
          <Field label={t("ad.notesEn")}><textarea className="input min-h-[70px]" value={f.notesEn} onChange={(e) => setF({ ...f, notesEn: e.target.value })} /></Field>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => publish("draft")}>{t("ad.draft")}</button>
            <button type="button" className="btn btn-primary grow" disabled={busy} onClick={() => publish("deployed")}>
              <Icon name={busy ? "refresh" : "rocket"} size={16} className={busy ? "spin" : ""} /> {t("ad.publish")}
            </button>
          </div>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="font-display font-bold text-board text-lg mb-4">{t("ad.updateHistory")}</h2>
        <ul className="space-y-3">
          {admin.updates.map((u) => (
            <li key={u.id} className="rounded-xl border border-line bg-white p-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-board">v{u.version}</span>
                {u.status === "deployed" ? <Badge tone="green">{t("ad.deployed")}</Badge> : <Badge tone="gray">{t("ad.draft")}</Badge>}
                <span className="text-[10.5px] text-inkmut ml-auto">{fmtDate(u.deployedAt ?? u.createdAt, locale)}</span>
              </div>
              <p className="text-sm font-semibold mt-1">{locale === "fr" ? u.titleFr : u.titleEn}</p>
              <p className="text-xs text-inkmut mt-0.5">{locale === "fr" ? u.notesFr : u.notesEn}</p>
              {u.status === "draft" && (
                <button className="btn btn-amber btn-sm mt-2.5" disabled={busy} onClick={() => deployDraft(u.id, u.version)}>
                  <Icon name="rocket" size={13} /> {t("ad.deployNow")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      </div>
    </div>
  );
}