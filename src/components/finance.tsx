"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { classLabel, fmtDate, money, todayISO, waLink, STRUCTURE, BLOCKS, BLOCK_COLORS, allowedBlocks, type Block } from "@/lib/core";
import { cashHTML, receiptsHTML, receiptFromPayment, downloadWord } from "@/lib/docs";
import type { StudentRow } from "@/lib/types";
import { Icon, WaIcon, Modal, StatCard, EmptyState, DocPreview, Field } from "@/components/ui";
import { PaymentModal } from "@/components/students";

export function CashView() {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [blockFilter, setBlockFilter] = useState<"all" | Block>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [method, setMethod] = useState("all");
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [payFor, setPayFor] = useState<StudentRow | null>(null);
  const [doc, setDoc] = useState<{ html: string; filename: string; title: string; landscape?: boolean } | null>(null);

  const visibleBlocks = useMemo(
    () => (data && !data.tenant.isSandbox ? allowedBlocks(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure) : BLOCKS),
    [data]
  );

  const rows = useMemo(() => {
    if (!data) return [];
    let list = [...data.payments].sort((a, b) => (b.paidAt + b.createdAt).localeCompare(a.paidAt + a.createdAt));
    if (from) list = list.filter((p) => p.paidAt >= from);
    if (to) list = list.filter((p) => p.paidAt <= to);
    if (method !== "all") list = list.filter((p) => p.method === method);
    if (blockFilter !== "all") {
      const clsIds = new Set(data.classes.filter((c) => c.block === blockFilter).map((c) => c.id));
      const stuIds = new Set(data.students.filter((s) => clsIds.has(s.classId)).map((s) => s.id));
      list = list.filter((p) => stuIds.has(p.studentId));
    }
    if (classFilter !== "all") {
      const ids = new Set(data.students.filter((s) => s.classId === classFilter).map((s) => s.id));
      list = list.filter((p) => ids.has(p.studentId));
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) => {
        const s = data.students.find((x) => x.id === p.studentId);
        return s && (s.lastName + " " + s.firstName + " " + s.matricule + " " + p.receiptNo).toLowerCase().includes(needle);
      });
    }
    return list;
  }, [data, from, to, method, blockFilter, classFilter, q]);

  if (!data) return null;
  const totalAll = data.payments.reduce((a, p) => a + p.amount, 0);
  const totalToday = data.payments.filter((p) => p.paidAt === todayISO()).reduce((a, p) => a + p.amount, 0);
  const expected = data.students.reduce((a, s) => a + s.tuitionTotal, 0);
  const unpaid = expected - totalAll;
  const rate = expected > 0 ? (totalAll / expected) * 100 : 0;
  const filteredTotal = rows.reduce((a, p) => a + p.amount, 0);
  const byMethod = (m: string) => data.payments.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0);
  const stuOf = (id: string) => data.students.find((s) => s.id === id);
  const clsOf = (s: StudentRow | undefined) => (s ? data.classes.find((c) => c.id === s.classId) : undefined);

  const exportRegister = (word: boolean) => {
    const html = cashHTML(data, rows, locale);
    if (word) downloadWord(html, "registre-caisse");
    else setDoc({ html, filename: "registre-caisse", title: t("ca.exportRegister"), landscape: true });
  };
  const printReceipts = () => {
    const recs = rows.map((p) => receiptFromPayment(data, p, locale)).filter((r): r is NonNullable<typeof r> => r !== null);
    setDoc({ html: receiptsHTML(data, recs, locale), filename: "recus-A6", title: t("reg.printReceipts") });
  };
  const oneReceipt = (pid: string) => {
    const p = data.payments.find((x) => x.id === pid);
    if (!p) return;
    const rec = receiptFromPayment(data, p, locale);
    if (rec) setDoc({ html: receiptsHTML(data, [rec], locale), filename: `recu-${rec.no}`, title: `${t("ca.receipt")} ${rec.no}` });
  };

  const pickerRows = data.students
    .filter((s) => (pickerQ ? (s.lastName + s.firstName + s.matricule).toLowerCase().includes(pickerQ.toLowerCase()) : true))
    .sort((a, b) => (b.tuitionTotal - b.paid1 - b.paid2) - (a.tuitionTotal - a.paid1 - a.paid2))
    .slice(0, 30);

  const methodIcon = (m: string) => (m === "cash" ? "coins" : "phone");
  const methodName = (m: string) => (m === "cash" ? t("en.cash") : m === "orange" ? "Orange Money" : "MTN MoMo");

  return (
    <div className="space-y-4">
      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <StatCard icon="wallet" label={t("ca.balance")} value={money(totalAll)} tone="#2E9E6B"
          sub={<span>{data.payments.length} {locale === "fr" ? "opérations" : "transactions"}</span>} />
        <StatCard icon="calendar" label={t("dash.today")} value={money(totalToday)} tone="#E9A23B" />
        <StatCard icon="spark" label={t("dash.rate")} value={`${Math.round(rate)}%`} tone="#2E5FE8"
          sub={<span className="block h-1.5 rounded-full bg-board/10 mt-1 overflow-hidden"><span className="block h-full bg-cblue rounded-full" style={{ width: `${rate}%` }} /></span>} />
        <StatCard icon="alert" label={t("dash.remaining")} value={money(unpaid)} tone="#E4572E" />
      </div>

      {/* method breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[{ m: "cash", c: "#173f2f" }, { m: "orange", c: "#E9A23B" }, { m: "momo", c: "#D98E04" }].map(({ m, c }) => (
          <div key={m} className="card px-3.5 py-3 flex items-center gap-2.5">
            <span className="p-2 rounded-lg shrink-0" style={{ background: c + "1c", color: c }}><Icon name={methodIcon(m)} size={15} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-inkmut truncate">{methodName(m)}</p>
              <p className="text-sm font-bold tabular truncate">{money(byMethod(m))}</p>
            </div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="card p-4 anim-in">
        <div className="flex flex-wrap gap-2.5 items-end">
          <Field label={t("ca.from")}><input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label={t("ca.to")}><input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label={t("reg.class")}>
            <select className="input w-auto" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="all">{t("ca.allClasses")}</option>
              {(blockFilter === "all" ? visibleBlocks : [blockFilter]).map((b) => {
                const cls = data.classes.filter((c) => c.block === b);
                if (!cls.length) return null;
                return (
                  <optgroup key={b} label={locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}>
                    {cls.map((c) => <option key={c.id} value={c.id}>{classLabel(c, locale)}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </Field>
          <Field label={t("ca.method")}>
            <select className="input w-auto" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="all">{t("ca.allMethods")}</option>
              <option value="cash">{t("en.cash")}</option>
              <option value="orange">Orange Money</option>
              <option value="momo">MTN MoMo</option>
            </select>
          </Field>
          <div className="relative grow min-w-[160px]">
            <label className="label">{t("search")}</label>
            <Icon name="search" size={15} className="absolute left-3 bottom-3 text-inkmut" />
            <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("reg.searchPh")} />
          </div>
          {(from || to || blockFilter !== "all" || classFilter !== "all" || method !== "all" || q) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFrom(""); setTo(""); setBlockFilter("all"); setClassFilter("all"); setMethod("all"); setQ(""); }}>
              <Icon name="x" size={13} /> {t("reset")}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-line/60">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-inkmut mr-1 inline-flex items-center gap-1">
            <Icon name="filter" size={11} /> {t("cls.block")} :
          </span>
          <button type="button" onClick={() => { setBlockFilter("all"); setClassFilter("all"); }}
            className={`chip transition-all cursor-pointer ${blockFilter === "all" ? "bg-board text-white shadow" : "bg-parch text-ink border border-line hover:border-board"}`}>
            {t("blk.all")}
          </button>
          {BLOCKS.map((b) => {
            const paid = visibleBlocks.includes(b);
            return (
              <button type="button" key={b} disabled={!paid} onClick={() => {
                if (!paid) return;
                const next = blockFilter === b ? "all" : b;
                setBlockFilter(next);
                if (next !== "all" && classFilter !== "all") {
                  const cls = data.classes.find((c) => c.id === classFilter);
                  if (!cls || cls.block !== next) setClassFilter("all");
                }
              }}
                title={!paid ? t("blk.forbidden") : undefined}
                className={`chip transition-all border ${!paid
                  ? "bg-gray-200/80 text-gray-500 border-gray-300 opacity-60 grayscale cursor-not-allowed"
                  : blockFilter === b
                  ? "text-white shadow cursor-pointer"
                  : "bg-white text-ink hover:border-board cursor-pointer"}`}
                style={paid && blockFilter === b ? { background: BLOCK_COLORS[b], borderColor: BLOCK_COLORS[b] } : paid ? { borderColor: BLOCK_COLORS[b] + "70" } : undefined}>
                <span className="w-2 h-2 rounded-full" style={{ background: !paid ? "#9ca3af" : blockFilter === b ? "#fff" : BLOCK_COLORS[b] }} />
                {locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}
                {!paid && <span className="ml-0.5 text-[9.5px]">🔒</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-line/70">
          <button type="button" className="btn btn-amber btn-sm" onClick={() => setPicker(true)}><Icon name="plus" size={15} /> {t("ca.newPayment")}</button>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportRegister(false)} disabled={!rows.length}><Icon name="printer" size={14} /> PDF</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportRegister(true)} disabled={!rows.length}><Icon name="fileText" size={14} /> Word</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={printReceipts} disabled={!rows.length}><Icon name="coins" size={14} /> {t("reg.printReceipts")}</button>
          </div>
        </div>
      </div>

      {/* journal */}
      {rows.length === 0 ? (
        <div className="card"><EmptyState icon="wallet" title={t("ca.empty")} hint={t("ca.emptyHint")}
          action={<button className="btn btn-amber" onClick={() => setPicker(true)}><Icon name="plus" size={16} /> {t("ca.newPayment")}</button>} /></div>
      ) : (
        <>
          <div className="card overflow-hidden hidden md:block anim-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-board text-cream/90 text-[11px] uppercase tracking-wider">
                    <th className="px-3 py-3 text-left">{t("date")}</th>
                    <th className="px-3 py-3 text-left">{t("ca.receiptNo")}</th>
                    <th className="px-3 py-3 text-left">{t("student")}</th>
                    <th className="px-3 py-3 text-left">{t("reg.class")}</th>
                    <th className="px-2 py-3">{t("ca.tranche")}</th>
                    <th className="px-3 py-3 text-left">{t("ca.method")}</th>
                    <th className="px-3 py-3 text-right">{t("ca.amount")}</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => {
                    const s = stuOf(p.studentId);
                    const c = clsOf(s);
                    return (
                      <tr key={p.id} className={`border-t border-line/70 ${i % 2 ? "bg-parch/60" : ""}`}>
                        <td className="px-3 py-2.5 text-xs text-inkmut whitespace-nowrap">{fmtDate(p.paidAt, locale)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-board">{p.receiptNo}</td>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{s ? `${s.lastName.toUpperCase()} ${s.firstName}` : "—"}<span className="block font-mono text-[10px] font-normal text-inkmut">{s?.matricule}</span></td>
                        <td className="px-3 py-2.5 text-xs">{c ? classLabel(c, locale) : "—"}</td>
                        <td className="px-2 py-2.5 text-center"><span className="chip bg-board/8 text-board">T{p.tranche}</span></td>
                        <td className="px-3 py-2.5 text-xs"><span className="inline-flex items-center gap-1.5"><Icon name={methodIcon(p.method)} size={13} className="text-amber-2" /> {methodName(p.method)}</span></td>
                        <td className="px-3 py-2.5 text-right font-bold tabular text-ok">{money(p.amount)}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <button className="p-1.5 rounded-lg hover:bg-board/10 text-board" title={t("print")} onClick={() => oneReceipt(p.id)}><Icon name="printer" size={15} /></button>
                            {s?.whatsapp && (
                              <a className="p-1.5 rounded-lg hover:bg-ok/10 text-[#1da851]" target="_blank" rel="noreferrer" title="WhatsApp"
                                href={waLink(s.whatsapp, `🧾 ${data.tenant.name}\n${t("ca.receipt")} ${p.receiptNo}\n${s.lastName.toUpperCase()} ${s.firstName} (${s.matricule})\n${t("ca.amount")}: ${money(p.amount)} — T${p.tranche}\n${t("reg.due")}: ${money(s.tuitionTotal - s.paid1 - s.paid2)}`)}>
                                <WaIcon size={15} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-board/8 border-t-2 border-board/20 font-bold text-board">
                    <td colSpan={6} className="px-4 py-3">{rows.length} {locale === "fr" ? "opérations" : "transactions"}</td>
                    <td className="px-3 py-3 text-right tabular">{money(filteredTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* mobile cards */}
          <div className="md:hidden space-y-2">
            {rows.map((p) => {
              const s = stuOf(p.studentId);
              const c = clsOf(s);
              return (
                <div key={p.id} className="card px-4 py-3 flex items-center gap-3 anim-in">
                  <span className="p-2 rounded-xl bg-ok/10 text-ok shrink-0"><Icon name={methodIcon(p.method)} size={16} /></span>
                  <div className="grow min-w-0">
                    <p className="text-sm font-bold truncate">{s ? `${s.lastName.toUpperCase()} ${s.firstName}` : "—"}</p>
                    <p className="text-[11px] text-inkmut font-mono">{p.receiptNo} · {fmtDate(p.paidAt, locale)} · {c ? classLabel(c, locale) : ""} · T{p.tranche}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-ok tabular text-sm">{money(p.amount)}</p>
                    <button className="text-[11px] text-board underline" onClick={() => oneReceipt(p.id)}>{t("ca.receipt")}</button>
                  </div>
                </div>
              );
            })}
            <div className="card px-4 py-3 flex justify-between font-bold text-board text-sm">
              <span>{rows.length} op.</span><span className="tabular">{money(filteredTotal)}</span>
            </div>
          </div>
        </>
      )}

      {/* student picker */}
      <Modal open={picker} onClose={() => setPicker(false)} title={`${t("ca.newPayment")} — ${t("ca.chooseStudent")}`}>
        <div className="relative mb-3">
          <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmut" />
          <input autoFocus className="input pl-9" placeholder={t("reg.searchPh")} value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} />
        </div>
        <ul className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
          {pickerRows.map((s) => {
            const rest = s.tuitionTotal - s.paid1 - s.paid2;
            const c = clsOf(s);
            return (
              <li key={s.id}>
                <button className="w-full flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 hover:border-board hover:bg-amber/8 transition-colors text-left"
                  onClick={() => { setPicker(false); setPayFor(s); }}>
                  <div className="grow min-w-0">
                    <p className="text-sm font-bold truncate">{s.lastName.toUpperCase()} {s.firstName}</p>
                    <p className="text-[11px] text-inkmut font-mono">{s.matricule} · {c ? classLabel(c, locale) : ""}</p>
                  </div>
                  <span className={`text-xs font-bold tabular ${rest > 0 ? "text-coral" : "text-ok"}`}>{rest > 0 ? money(rest) : "✓"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>

      <PaymentModal student={payFor} open={!!payFor} onClose={() => setPayFor(null)} />
      {doc && <DocPreview open={!!doc} onClose={() => setDoc(null)} html={doc.html} filename={doc.filename} title={doc.title} landscape={doc.landscape} />}
    </div>
  );
}