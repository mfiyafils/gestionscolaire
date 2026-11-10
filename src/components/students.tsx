"use client";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import {
  ageFrom, classLabel, fmtDate, money, todayISO, waLink, STRUCTURE, BLOCKS, BLOCK_COLORS, VARIANTS,
  SEX_COLORS, allowedBlocks, type Block,
} from "@/lib/core";
import { studentsHTML, receiptsHTML, receiptForStudent, receiptFromPayment, enrollMessage, reminderMessage, downloadWord } from "@/lib/docs";
import type { StudentRow } from "@/lib/types";
import { Icon, WaIcon, Modal, Drawer, Confirm, Field, Badge, EmptyState, DocPreview, Seg } from "@/components/ui";
import { BulletinModal } from "@/components/bulletin";

/* ═════════ Class creation modal ═════════ */
export function ClassCreateModal({ open, onClose, onCreated, defaultBlock }: { open: boolean; onClose: () => void; onCreated?: (classId: string) => void; defaultBlock?: Block }) {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const availBlocks = useMemo(
    () => (data && !data.tenant.isSandbox ? allowedBlocks(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure) : BLOCKS),
    [data]
  );
  const [block, setBlock] = useState<Block>(defaultBlock && availBlocks.includes(defaultBlock) ? defaultBlock : availBlocks[0] ?? "primary");
  const [level, setLevel] = useState("SIL");
  const [variant, setVariant] = useState("general");
  const [tuition, setTuition] = useState(25000);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultBlock && availBlocks.includes(defaultBlock)) setBlock(defaultBlock);
    else if (!availBlocks.includes(block)) setBlock(availBlocks[0] ?? "primary");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultBlock, availBlocks]);

  useEffect(() => { setLevel(STRUCTURE[block].levels[0].code); }, [block]);

  const submit = async () => {
    if (!availBlocks.includes(block)) { toast(t("blk.forbidden"), "error"); return; }
    setBusy(true);
    const res = await act("class.create", { block, levelCode: level, variant, tuition });
    setBusy(false);
    if (res.ok) {
      const label = classLabel({ block, levelCode: level, variant }, locale);
      toast(t("cls.created", { name: label }));
      if (res.result?.classId) onCreated?.(String(res.result.classId));
      onClose();
    } else toast(res.error === "exists" ? t("cls.exists") : res.error === "blockForbidden" ? t("blk.forbidden") : t("errorGeneric"), "error");
  };

  return (
    <Modal open={open} onClose={onClose} title={t("cls.add")}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || !availBlocks.includes(block)}><Icon name="plus" size={16} /> {t("cls.add")}</button>
      </>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("cls.block")}>
          <select className="input" value={block} onChange={(e) => setBlock(e.target.value as Block)}>
            {BLOCKS.map((b) => {
              const paid = availBlocks.includes(b);
              return (
                <option key={b} value={b} disabled={!paid}>
                  {locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}{!paid ? ` (${t("blk.unpaid")})` : ""}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label={t("cls.level")}>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            {STRUCTURE[block].levels.map((l) => <option key={l.code} value={l.code}>{locale === "fr" ? l.fr : `${l.en} (${l.fr})`}</option>)}
          </select>
        </Field>
        <Field label={t("cls.variant")}>
          <select className="input" value={variant} onChange={(e) => setVariant(e.target.value)}>
            {VARIANTS.map((v) => <option key={v.id} value={v.id}>{locale === "fr" ? v.fr : v.en}</option>)}
          </select>
        </Field>
        <Field label={t("cls.tuition")} hint={t("en.tuitionNotice")}>
          <input type="number" className="input tabular" min={0} step={500} value={tuition} onChange={(e) => setTuition(Number(e.target.value))} />
        </Field>
      </div>
      <p className="mt-4 text-xs text-inkmut flex items-center gap-1.5 bg-board/5 rounded-lg px-3 py-2">
        <Icon name="spark" size={14} className="text-amber-2" /> {t("cls.sheet")}
      </p>
    </Modal>
  );
}

/* ═════════ Payment modal ═════════ */
export function PaymentModal({ student, open, onClose }: { student: StudentRow | null; open: boolean; onClose: () => void }) {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const rest = student ? student.tuitionTotal - student.paid1 - student.paid2 : 0;
  const [tranche, setTranche] = useState<"1" | "2">("1");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (student && open) {
      const tr = student.paid1 >= Math.ceil(student.tuitionTotal / 2) ? "2" : "1";
      setTranche(tr);
      setAmount(Math.max(0, Math.min(rest, Math.ceil(student.tuitionTotal / 2 / 500) * 500)));
      setPaidAt(todayISO());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, open]);

  if (!student || !data) return null;
  const submit = async () => {
    if (amount <= 0) return;
    setBusy(true);
    const res = await act("payment.add", { studentId: student.id, amount, tranche: Number(tranche), method, paidAt });
    setBusy(false);
    if (res.ok) {
      toast(t("ca.paymentSaved", { amount: money(amount), no: String(res.result?.receiptNo ?? "") }));
      onClose();
    } else toast(t("errorGeneric"), "error");
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t("reg.collect")} — ${student.firstName} ${student.lastName}`}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t("cancel")}</button>
        <button className="btn btn-amber" onClick={submit} disabled={busy || amount <= 0}><Icon name="coins" size={16} /> {money(amount)}</button>
      </>}>
      <div className="rounded-xl bg-board/5 border border-line px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-xs font-bold text-inkmut uppercase tracking-wide">{t("reg.due")}</span>
        <span className={`font-display font-bold text-xl tabular ${rest > 0 ? "text-coral" : "text-ok"}`}>{money(rest)}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("ca.tranche")}>
          <Seg options={[{ id: "1", label: "T1" }, { id: "2", label: "T2" }]} value={tranche} onChange={setTranche} />
        </Field>
        <Field label={t("ca.amount")}>
          <input type="number" className="input tabular" min={0} step={500} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label={t("en.method")}>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">{t("en.cash")}</option>
            <option value="orange">Orange Money</option>
            <option value="momo">MTN Mobile Money</option>
          </select>
        </Field>
        <Field label={t("date")}>
          <input type="date" className="input" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 mt-3">
        {[0.25, 0.5, 1].map((f) => (
          <button key={f} className="btn btn-ghost btn-sm" onClick={() => setAmount(Math.round((rest * f) / 500) * 500)}>
            {f === 1 ? (locale === "fr" ? "Solder" : "Settle all") : `${f * 100}%`}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ═════════ Enrollment form ═════════ */
export function EnrollForm({ initial, onSaved, onCancel }: {
  initial?: StudentRow | null;
  onSaved: (studentId: string, isNew: boolean) => void;
  onCancel?: () => void;
}) {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [f, setF] = useState(() => ({
    lastName: initial?.lastName ?? "", firstName: initial?.firstName ?? "",
    sex: initial?.sex ?? "M", birthDate: initial?.birthDate ?? "", birthPlace: initial?.birthPlace ?? "",
    fatherName: initial?.fatherName ?? "", motherName: initial?.motherName ?? "", whatsapp: initial?.whatsapp ?? "",
    classId: initial?.classId ?? "", enrolledAt: initial?.enrolledAt ?? todayISO(),
    paid1: initial?.paid1 ?? 0, paid2: initial?.paid2 ?? 0, method: "cash",
  }));
  const [busy, setBusy] = useState(false);
  const [classModal, setClassModal] = useState(false);
  const set = (k: string, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const cls = data?.classes.find((c) => c.id === f.classId);
  const total = initial ? initial.tuitionTotal : (cls?.tuition ?? 0);
  const paid1 = Math.min(f.paid1, total);
  const paid2 = Math.min(f.paid2, Math.max(0, total - paid1));
  const rest = Math.max(0, total - paid1 - paid2);
  const age = f.birthDate ? ageFrom(f.birthDate) : null;

  const submit = async () => {
    if (!f.lastName.trim() || !f.firstName.trim() || !f.birthDate || !f.classId) {
      toast(t("en.required"), "error");
      return;
    }
    setBusy(true);
    const payload = { ...f, paid1, paid2, tuitionTotal: total };
    const res = initial
      ? await act("student.update", { id: initial.id, ...payload })
      : await act("student.create", payload);
    setBusy(false);
    if (res.ok) {
      onSaved(initial ? initial.id : String(res.result?.studentId ?? ""), !initial);
    } else toast(t("errorGeneric"), "error");
  };

  if (!data) return null;
  return (
    <div className="space-y-5">
      {/* Civil status */}
      <section className="card p-5 anim-in">
        <h3 className="font-display font-bold text-board flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-amber/20 text-amber-2 inline-flex items-center justify-center text-xs font-extrabold">1</span>
          {t("en.civil")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={`${t("en.lastName")} *`}><input className="input" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="NGONO" /></Field>
          <Field label={`${t("en.firstName")} *`}><input className="input" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Grâce" /></Field>
          <Field label={`${t("reg.sex")} *`}>
            <Seg options={[{ id: "M", label: t("boy") }, { id: "F", label: t("girl") }]} value={f.sex as "M"} onChange={(v) => set("sex", v)} />
          </Field>
          <Field label={`${t("en.birthDate")} *`}><input type="date" className="input" value={f.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></Field>
          <Field label={t("en.birthPlace")}><input className="input" value={f.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} placeholder="Douala" /></Field>
          <Field label={t("en.ageAuto")}>
            <div className="input bg-parch flex items-center gap-2 text-board font-bold tabular">
              <Icon name="spark" size={15} className="text-amber-2" />
              {age === null ? "—" : `${age} ${t("yearsOld")}`}
            </div>
          </Field>
        </div>
      </section>

      {/* Family */}
      <section className="card p-5 anim-in" style={{ animationDelay: "80ms" }}>
        <h3 className="font-display font-bold text-board flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-amber/20 text-amber-2 inline-flex items-center justify-center text-xs font-extrabold">2</span>
          {t("en.family")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t("en.fatherName")}><input className="input" value={f.fatherName} onChange={(e) => set("fatherName", e.target.value)} /></Field>
          <Field label={t("en.motherName")}><input className="input" value={f.motherName} onChange={(e) => set("motherName", e.target.value)} /></Field>
          <Field label={`${t("en.whatsapp")} *`} hint="+237 · 6XX XX XX XX">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1da851]"><WaIcon size={16} /></span>
              <input className="input pl-9 tabular" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="677 12 34 56" />
            </div>
          </Field>
        </div>
      </section>

      {/* Schooling */}
      <section className="card p-5 anim-in" style={{ animationDelay: "160ms" }}>
        <h3 className="font-display font-bold text-board flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-amber/20 text-amber-2 inline-flex items-center justify-center text-xs font-extrabold">3</span>
          {t("en.schooling")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={`${t("reg.class")} *`}>
            <div className="flex gap-2">
              <select className="input" value={f.classId} onChange={(e) => set("classId", e.target.value)}>
                <option value="">{t("en.chooseClass")}</option>
                {BLOCKS.map((b) => {
                  const paid = data.tenant.isSandbox || allowedBlocks(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure).includes(b);
                  const list = data.classes.filter((c) => c.block === b);
                  if (!list.length && paid) return null;
                  return (
                    <optgroup key={b} label={`${locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}${!paid ? ` — ${t("blk.unpaid")}` : ""}`}>
                      {list.length > 0 ? list.map((c) => (
                        <option key={c.id} value={c.id} disabled={!paid}>{classLabel(c, locale)}</option>
                      )) : (
                        <option value="" disabled>{t("blk.unpaid")}</option>
                      )}
                    </optgroup>
                  );
                })}
              </select>
              <button type="button" className="btn btn-ghost btn-sm shrink-0" title={t("cls.add")} onClick={() => setClassModal(true)}><Icon name="plus" size={15} /></button>
            </div>
          </Field>
          <Field label={t("en.enrollDate")}>
            <input type="date" className="input" value={f.enrolledAt} onChange={(e) => set("enrolledAt", e.target.value)} />
          </Field>
          <Field label={t("en.matriculeAuto")}>
            <div className="input bg-parch font-mono text-sm text-board flex items-center gap-2">
              <Icon name="key" size={14} className="text-amber-2" />
              {initial ? initial.matricule : "MAT-2026-•••"}
            </div>
          </Field>
        </div>

        {/* Director fee — mandatory visibility */}
        <div className="mt-4 rounded-xl border-2 border-amber/50 bg-amber/10 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="p-2 rounded-lg bg-amber/25 text-amber-2"><Icon name="shield" size={18} /></span>
          <div className="grow min-w-[180px]">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-2">{t("en.tuitionByDirector")}</p>
            <p className="text-[11px] text-inkmut">{t("en.tuitionNotice")}</p>
          </div>
          <span className="font-display font-black text-2xl text-board tabular">{cls || initial ? money(total) : "—"}</span>
        </div>

        {!initial && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Field label={t("en.tranche1")}>
              <input type="number" className="input tabular" min={0} max={total} step={500} value={f.paid1} onChange={(e) => set("paid1", Number(e.target.value))} />
            </Field>
            <Field label={t("en.tranche2")}>
              <input type="number" className="input tabular" min={0} max={Math.max(0, total - paid1)} step={500} value={f.paid2} onChange={(e) => set("paid2", Number(e.target.value))} />
            </Field>
            <Field label={t("en.method")}>
              <select className="input" value={f.method} onChange={(e) => set("method", e.target.value)}>
                <option value="cash">{t("en.cash")}</option>
                <option value="orange">Orange Money</option>
                <option value="momo">MTN Mobile Money</option>
              </select>
            </Field>
          </div>
        )}

        {/* live computation */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-board/5 border border-line px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-inkmut">{t("reg.tuition")}</p>
            <p className="font-bold text-board tabular text-sm sm:text-base">{money(total)}</p>
          </div>
          <div className="rounded-xl bg-ok/10 border border-ok/25 px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ok">{t("reg.paid")}</p>
            <p className="font-bold text-ok tabular text-sm sm:text-base">{money(paid1 + paid2)}</p>
          </div>
          <div className="rounded-xl bg-coral/10 border border-coral/25 px-3 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-coral">{t("reg.due")}</p>
            <p className="font-bold text-coral tabular text-sm sm:text-base">{money(rest)}</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-board/10 mt-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-ok to-teal rounded-full transition-all duration-500" style={{ width: `${total > 0 ? ((paid1 + paid2) / total) * 100 : 0}%` }} />
        </div>
      </section>

      <div className="flex flex-wrap gap-3 justify-end">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>{t("cancel")}</button>}
        <button type="button" className="btn btn-primary text-base px-6 py-3.5" onClick={submit} disabled={busy}>
          <Icon name={busy ? "refresh" : "check"} size={18} className={busy ? "spin" : ""} />
          {initial ? t("save") : t("en.submit")}
        </button>
      </div>
      <ClassCreateModal open={classModal} onClose={() => setClassModal(false)} onCreated={(cid) => set("classId", cid)} />
    </div>
  );
}

/* ═════════ Enrollment view + success ═════════ */
export function EnrollView({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const [formKey, setFormKey] = useState(0);
  const [success, setSuccess] = useState<StudentRow | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const handleSaved = (studentId: string, isNew: boolean) => {
    if (!isNew) return;
    setPendingStudent(studentId);
  };
  const [pendingStudent, setPendingStudent] = useState<string | null>(null);
  useEffect(() => {
    if (pendingStudent && data) {
      const stu = data.students.find((s) => s.id === pendingStudent) ?? null;
      if (stu) {
        setSuccess(stu);
        setPendingStudent(null);
        if (stu.whatsapp) window.open(waLink(stu.whatsapp, enrollMessage(data, stu, locale)), "_blank");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStudent, data]);

  if (!data) return null;
  const cls = success ? data.classes.find((c) => c.id === success.classId) : null;
  const receiptHtml = success ? receiptsHTML(data, [receiptForStudent(data, success, locale)], locale) : "";

  return (
    <div className="max-w-4xl mx-auto">
      <EnrollForm key={formKey} onSaved={handleSaved} />
      {data.classes.length === 0 && (
        <p className="mt-4 text-sm text-amber-2 bg-amber/10 border border-amber/40 rounded-xl px-4 py-3 flex items-center gap-2">
          <Icon name="alert" size={16} /> {t("en.createClassFirst")}
        </p>
      )}

      <Modal open={!!success} onClose={() => setSuccess(null)} title={t("en.successTitle")}
        footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => { setSuccess(null); setFormKey((k) => k + 1); }}>{t("en.newEnroll")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => onNavigate("register")}>{t("dash.viewRegister")}</button>
          <button type="button" className="btn btn-primary" onClick={() => setReceiptOpen(true)}><Icon name="printer" size={16} /> {t("en.printReceipt")}</button>
        </>}>
        {success && (
          <div>
            <div className="flex items-center gap-4">
              <span className="relative shrink-0">
                <span className="absolute -inset-2 rounded-full bg-ok/20 animate-ping" style={{ animationIterationCount: 3 }} />
                <span className="relative w-14 h-14 rounded-full bg-ok text-white inline-flex items-center justify-center"><Icon name="check" size={28} /></span>
              </span>
              <div>
                <p className="text-sm text-ink">{t("en.successMsg", { name: `${success.firstName} ${success.lastName.toUpperCase()}`, cls: cls ? classLabel(cls, locale) : "—", mat: success.matricule })}</p>
                <span className="stamp-badge text-coral mt-2">{success.matricule}</span>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-inkmut">{t("en.autoDispatch")}</p>
              {[t("en.auto1"), t("en.auto2", { cls: cls ? classLabel(cls, locale) : "—" }), t("en.auto3", { cls: cls ? classLabel(cls, locale) : "—" })].map((line, i) => (
                <p key={i} className="flex items-center gap-2.5 text-sm text-ink anim-in" style={{ animationDelay: `${i * 140}ms` }}>
                  <span className="w-5 h-5 rounded-full bg-ok/15 text-ok inline-flex items-center justify-center shrink-0"><Icon name="check" size={12} /></span>
                  {line}
                </p>
              ))}
            </div>
            {success.whatsapp && (
              <a className="btn btn-wa w-full mt-5" target="_blank" rel="noreferrer" href={waLink(success.whatsapp, enrollMessage(data, success, locale))}>
                <WaIcon size={17} /> {t("en.waOpen")} · {success.whatsapp}
              </a>
            )}
            <p className="text-[11px] text-inkmut mt-2 text-center">{t("en.waSent")}</p>
          </div>
        )}
      </Modal>
      {success && (
        <DocPreview open={receiptOpen} onClose={() => setReceiptOpen(false)} html={receiptHtml}
          filename={`recu-${success.matricule}`} title={`${t("ca.receipt")} — ${success.matricule}`}
          onWhatsApp={success.whatsapp ? () => window.open(waLink(success.whatsapp, enrollMessage(data, success, locale)), "_blank") : undefined} />
      )}
    </div>
  );
}

/* ═════════ Register view ═════════ */
type ViewChip = "all" | "unpaid" | "girls" | "boys" | "recent";

export function RegisterView({ onNavigate }: { onNavigate: (v: string) => void }) {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [blockFilter, setBlockFilter] = useState<"all" | Block>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [chip, setChip] = useState<ViewChip>("all");
  const [sort, setSort] = useState("recent");
  const [groupByClass, setGroupByClass] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<StudentRow | null>(null);
  const [editFor, setEditFor] = useState<StudentRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<StudentRow | null>(null);
  const [archiveFor, setArchiveFor] = useState<StudentRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [bulletinFor, setBulletinFor] = useState<string | null>(null);
  const [doc, setDoc] = useState<{ html: string; filename: string; title: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [classModal, setClassModal] = useState(false);

  const visibleBlocks = useMemo(
    () => (data && !data.tenant.isSandbox ? allowedBlocks(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure) : BLOCKS),
    [data]
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("scolaria_regview") ?? "{}");
      if (saved.blockFilter && (saved.blockFilter === "all" || BLOCKS.includes(saved.blockFilter))) setBlockFilter(saved.blockFilter);
      if (saved.classFilter) setClassFilter(saved.classFilter);
      if (saved.chip) setChip(saved.chip);
      if (saved.sort) setSort(saved.sort);
    } catch { /* ignore */ }
  }, []);

  // Validate filters against tenant's actual classes and allowed blocks
  useEffect(() => {
    if (!data) return;
    if (blockFilter !== "all" && !visibleBlocks.includes(blockFilter)) {
      setBlockFilter("all");
      setClassFilter("all");
      return;
    }
    if (classFilter !== "all") {
      const cls = data.classes.find((c) => c.id === classFilter);
      if (!cls || (blockFilter !== "all" && cls.block !== blockFilter)) {
        setClassFilter("all");
      }
    }
  }, [data, blockFilter, classFilter, visibleBlocks]);

  useEffect(() => {
    localStorage.setItem("scolaria_regview", JSON.stringify({ blockFilter, classFilter, chip, sort }));
  }, [blockFilter, classFilter, chip, sort]);

  const rows = useMemo(() => {
    if (!data) return [];
    const blockClassIds = blockFilter === "all"
      ? null
      : new Set(data.classes.filter((c) => c.block === blockFilter).map((c) => c.id));
    let list = [...data.students];
    if (blockClassIds) list = list.filter((s) => blockClassIds.has(s.classId));
    if (classFilter !== "all") list = list.filter((s) => s.classId === classFilter);
    if (chip === "unpaid") list = list.filter((s) => s.paid1 + s.paid2 < s.tuitionTotal);
    if (chip === "girls") list = list.filter((s) => s.sex === "F");
    if (chip === "boys") list = list.filter((s) => s.sex === "M");
    if (chip === "recent") list = list.filter((s) => Date.now() - new Date(s.enrolledAt + "T12:00:00").getTime() < 7 * 86400000);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((s) => (s.lastName + " " + s.firstName + " " + s.matricule).toLowerCase().includes(needle));
    }
    list.sort((a, b) => {
      if (sort === "name") return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
      if (sort === "due") return (b.tuitionTotal - b.paid1 - b.paid2) - (a.tuitionTotal - a.paid1 - a.paid2);
      if (sort === "age") return a.birthDate < b.birthDate ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return list;
  }, [data, blockFilter, classFilter, chip, q, sort]);

  if (!data) return null;
  const drawerStudent = drawerId ? data.students.find((s) => s.id === drawerId) ?? null : null;
  const totalPaid = rows.reduce((a, s) => a + s.paid1 + s.paid2, 0);
  const totalDue = rows.reduce((a, s) => a + s.tuitionTotal, 0);
  const clsOf = (s: StudentRow) => data.classes.find((c) => c.id === s.classId);

  const pickBlock = (b: "all" | Block) => {
    setBlockFilter(b);
    setSelected(new Set());
    if (b !== "all" && classFilter !== "all") {
      const cls = data.classes.find((c) => c.id === classFilter);
      if (!cls || cls.block !== b) setClassFilter("all");
    }
  };

  const exportList = (word: boolean) => {
    const cls = classFilter !== "all" ? data.classes.find((c) => c.id === classFilter) : undefined;
    const scope = cls
      ? classLabel(cls, locale)
      : blockFilter !== "all"
      ? (locale === "fr" ? STRUCTURE[blockFilter].fr : STRUCTURE[blockFilter].en)
      : undefined;
    const html = studentsHTML(data, rows, locale, scope);
    const fname = cls ? `liste-${cls.levelCode}` : blockFilter !== "all" ? `liste-${blockFilter}` : "liste-eleves";
    if (word) downloadWord(html, fname);
    else setDoc({ html, filename: fname, title: scope ? `${t("nav.register")} — ${scope}` : t("nav.register") });
  };
  const printSelectedReceipts = () => {
    const list = rows.filter((s) => selected.has(s.id));
    const receipts = list.map((s) => receiptForStudent(data, s, locale));
    setDoc({ html: receiptsHTML(data, receipts, locale), filename: "recus-A6", title: t("reg.printReceipts") });
  };
  const doDelete = async () => {
    if (!deleteFor) return;
    const name = `${deleteFor.firstName} ${deleteFor.lastName.toUpperCase()}`;
    const res = await act("student.delete", { id: deleteFor.id });
    setDeleteFor(null); setDrawerId(null);
    if (res.ok) {
      const bundle = res.result?.bundle as { student: StudentRow; payments: unknown[]; grades: unknown[] } | undefined;
      toast(t("reg.deleted", { name }), "info", bundle ? {
        label: t("undo"),
        run: () => { void act("student.restore", { ...bundle.student, payments: bundle.payments, grades: bundle.grades }); },
      } : undefined);
    } else toast(t("errorGeneric"), "error");
  };
  const toggleAll = () => {
    setSelected((prev) => prev.size === rows.length ? new Set() : new Set(rows.map((s) => s.id)));
  };

  const chips: { id: ViewChip; label: string }[] = [
    { id: "all", label: t("reg.view.all") }, { id: "unpaid", label: t("reg.view.unpaid") },
    { id: "girls", label: t("reg.view.girls") }, { id: "boys", label: t("reg.view.boys") }, { id: "recent", label: t("reg.view.recent") },
  ];

  // Grouped breakdown by class for automatic group counts & financial sums
  const grouped = useMemo(() => {
    const map = new Map<string, StudentRow[]>();
    for (const s of rows) {
      const arr = map.get(s.classId) ?? [];
      arr.push(s);
      map.set(s.classId, arr);
    }
    return [...map.entries()].map(([cid, list]) => {
      const c = data.classes.find((x) => x.id === cid);
      const paid = list.reduce((a, s) => a + s.paid1 + s.paid2, 0);
      const total = list.reduce((a, s) => a + s.tuitionTotal, 0);
      return { classId: cid, cls: c, list, paid, total, due: total - paid };
    });
  }, [rows, data.classes]);

  const doArchive = async () => {
    if (!archiveFor) return;
    const name = `${archiveFor.firstName} ${archiveFor.lastName.toUpperCase()}`;
    const res = await act("student.archive", { id: archiveFor.id, reason: archiveReason });
    setArchiveFor(null);
    setArchiveReason("");
    setDrawerId(null);
    toast(res.ok ? t("reg.archivedMsg", { name }) : t("errorGeneric"), res.ok ? "info" : "error");
  };

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="card p-4 space-y-3 anim-in">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="relative grow min-w-[200px]">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmut" />
            <input className="input pl-9" placeholder={t("reg.searchPh")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input w-auto min-w-[170px]" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">{t("ca.allClasses")}</option>
            {BLOCKS.map((b) => {
              const paid = visibleBlocks.includes(b);
              const cls = data.classes.filter((c) => c.block === b);
              if (!cls.length && paid) return null;
              return (
                <optgroup key={b} label={`${locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}${!paid ? ` (${t("blk.unpaid")})` : ""}`}>
                  {cls.map((c) => <option key={c.id} value={c.id} disabled={!paid}>{classLabel(c, locale)}</option>)}
                </optgroup>
              );
            })}
          </select>
          <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">{t("reg.sort.recent")}</option>
            <option value="name">{t("reg.sort.name")}</option>
            <option value="due">{t("reg.sort.due")}</option>
            <option value="age">{t("reg.sort.age")}</option>
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setClassModal(true)}><Icon name="plus" size={14} /> {t("cls.add")}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate("enroll")}><Icon name="userPlus" size={15} /> {t("nav.enroll")}</button>
        </div>

        {/* All structures always visible — unpaid blocks grayed out */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-inkmut mr-1 inline-flex items-center gap-1">
            <Icon name="filter" size={11} /> {t("cls.block")} :
          </span>
          <button type="button" onClick={() => pickBlock("all")}
            className={`chip transition-all cursor-pointer ${blockFilter === "all" ? "bg-board text-white shadow" : "bg-parch text-ink border border-line hover:border-board"}`}>
            {t("blk.all")}
          </button>
          {BLOCKS.map((b) => {
            const paid = visibleBlocks.includes(b);
            return (
              <button type="button" key={b} disabled={!paid} onClick={() => paid && pickBlock(blockFilter === b ? "all" : b)}
                title={!paid ? t("blk.forbidden") : undefined}
                className={`chip transition-all border ${!paid
                  ? "bg-gray-200/80 text-gray-500 border-gray-300 opacity-60 grayscale cursor-not-allowed"
                  : blockFilter === b
                  ? "text-white shadow cursor-pointer"
                  : "bg-white text-ink hover:border-board cursor-pointer"}`}
                style={paid && blockFilter === b ? { background: BLOCK_COLORS[b], borderColor: BLOCK_COLORS[b] } : paid ? { borderColor: BLOCK_COLORS[b] + "70" } : undefined}>
                <span className="w-2 h-2 rounded-full" style={{ background: !paid ? "#9ca3af" : blockFilter === b ? "#fff" : BLOCK_COLORS[b] }} />
                {locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}
                {!paid && <span className="ml-0.5 text-[9.5px] font-extrabold">🔒</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => setGroupByClass((g) => !g)}
            className={`ml-auto chip cursor-pointer border transition-all ${groupByClass ? "bg-amber text-board-2 border-amber shadow" : "bg-white text-inkmut border-line hover:border-board"}`}>
            <Icon name="dash" size={11} /> {t("reg.groupByClass")}
          </button>
        </div>

        {/* Primary bilingual class quick pills: SIL / CL1 .. CM2 / CL6 */}
        {(blockFilter === "all" || blockFilter === "primary") && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-inkmut mr-1">
              {STRUCTURE.primary.fr} :
            </span>
            {STRUCTURE.primary.levels.map((lv) => {
              const primaryPaid = visibleBlocks.includes("primary");
              const matching = data.classes.find((c) => c.block === "primary" && c.levelCode === lv.code);
              const count = matching ? data.students.filter((s) => s.classId === matching.id).length : 0;
              const active = matching && classFilter === matching.id;
              return (
                <button type="button" key={lv.code} disabled={!primaryPaid || !matching}
                  onClick={() => matching && primaryPaid && setClassFilter(active ? "all" : matching.id)}
                  className={`chip border text-[11px] transition-all ${!primaryPaid || !matching
                    ? "bg-gray-100 text-gray-400 border-gray-300 opacity-60 cursor-not-allowed"
                    : active
                    ? "bg-board text-white border-board shadow cursor-pointer"
                    : "bg-parch text-board border-line hover:border-board cursor-pointer"}`}>
                  {lv.fr} <span className="opacity-70 tabular">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button type="button" key={c.id} onClick={() => setChip(c.id)}
                className={`chip transition-all focus-ring cursor-pointer ${chip === c.id ? "bg-board text-white shadow" : "bg-parch text-inkmut border border-line hover:border-board"}`}>
                {c.label}
              </button>
            ))}
            {rows.length > 0 && (
              <button type="button" onClick={toggleAll}
                className="chip bg-white border border-line text-board hover:border-board cursor-pointer">
                <Icon name="check" size={11} /> {t("reg.selectAll")} ({rows.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" disabled={rows.length === 0} onClick={() => exportList(false)}><Icon name="printer" size={14} /> PDF</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={rows.length === 0} onClick={() => exportList(true)}><Icon name="fileText" size={14} /> Word</button>
            <button type="button" className="btn btn-amber btn-sm" disabled={selected.size === 0} onClick={printSelectedReceipts}>
              <Icon name="coins" size={14} /> {t("reg.printReceipts")} {selected.size > 0 && `(${selected.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Automatic per-group summary banner when grouped */}
      {groupByClass && grouped.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 anim-fade">
          {grouped.map((g) => (
            <div key={g.classId} className="card px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-board">{g.cls ? classLabel(g.cls, locale) : "—"} <span className="text-xs font-normal text-inkmut">({g.list.length})</span></p>
                <p className="text-[11px] text-inkmut tabular">{t("reg.paid")}: <b className="text-ok">{money(g.paid)}</b> · {t("reg.due")}: <b className="text-coral">{money(g.due)}</b></p>
              </div>
              <Badge tone={g.due <= 0 ? "green" : "amber"}>{g.total > 0 ? Math.round((g.paid / g.total) * 100) : 0}%</Badge>
            </div>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="anim-pop flex items-center gap-3 bg-board text-cream rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Icon name="check" size={16} className="text-amber" />
          {t("reg.selected", { n: selected.size })}
          <button className="ml-auto text-cream/70 hover:text-cream text-xs underline" onClick={() => setSelected(new Set())}>{t("reset")}</button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon="users" title={t("reg.empty")} hint={t("reg.emptyHint")}
          action={<button className="btn btn-primary" onClick={() => onNavigate("enroll")}><Icon name="userPlus" size={16} /> {t("nav.enroll")}</button>} /></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block anim-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-board text-cream/90 text-[11px] uppercase tracking-wider">
                    <th className="px-3 py-3 w-10"><input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} className="accent-amber w-4 h-4" /></th>
                    <th className="px-2 py-3 text-left">{t("reg.matricule")}</th>
                    <th className="px-3 py-3 text-left">{t("reg.fullName")}</th>
                    <th className="px-2 py-3">{t("reg.sex")}</th>
                    <th className="px-2 py-3">{t("reg.age")}</th>
                    <th className="px-3 py-3 text-left">{t("reg.class")}</th>
                    <th className="px-3 py-3 text-right">{t("reg.paid")}</th>
                    <th className="px-3 py-3 text-right">{t("reg.due")}</th>
                    <th className="px-3 py-3 text-right">{t("reg.tuition")}</th>
                    <th className="px-3 py-3 text-left">{t("reg.enrolledAt")}</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, i) => {
                    const paid = s.paid1 + s.paid2;
                    const rest = s.tuitionTotal - paid;
                    const c = clsOf(s);
                    return (
                      <tr key={s.id} className={`rowlink border-t border-line/70 ${i % 2 ? "bg-parch/60" : ""}`} onClick={() => setDrawerId(s.id)}>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(s.id)} className="accent-amber w-4 h-4"
                            onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })} />
                        </td>
                        <td className="px-2 py-2.5 font-mono text-xs text-board font-semibold">{s.matricule}</td>
                        <td className="px-3 py-2.5 font-semibold">{s.lastName.toUpperCase()} <span className="font-normal">{s.firstName}</span></td>
                        <td className="px-2 py-2.5 text-center"><span className="chip text-white" style={{ background: SEX_COLORS[s.sex as "M"] }}>{s.sex}</span></td>
                        <td className="px-2 py-2.5 text-center tabular">{ageFrom(s.birthDate)}</td>
                        <td className="px-3 py-2.5"><Badge tone="board">{c ? classLabel(c, locale) : "—"}</Badge></td>
                        <td className="px-3 py-2.5 text-right tabular font-semibold text-ok">{money(paid)}</td>
                        <td className={`px-3 py-2.5 text-right tabular font-semibold ${rest > 0 ? "text-coral" : "text-ok"}`}>{rest > 0 ? money(rest) : "✓"}</td>
                        <td className="px-3 py-2.5 text-right tabular">{money(s.tuitionTotal)}</td>
                        <td className="px-3 py-2.5 text-inkmut text-xs">{fmtDate(s.enrolledAt, locale)}</td>
                        <td className="px-2 py-2.5 text-inkmut"><Icon name="chevR" size={15} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-board/8 border-t-2 border-board/20 font-bold text-board">
                    <td colSpan={6} className="px-4 py-3">{rows.length} {t("students")}</td>
                    <td className="px-3 py-3 text-right tabular">{money(totalPaid)}</td>
                    <td className="px-3 py-3 text-right tabular text-coral">{money(totalDue - totalPaid)}</td>
                    <td className="px-3 py-3 text-right tabular">{money(totalDue)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {rows.map((s) => {
              const paid = s.paid1 + s.paid2;
              const rest = s.tuitionTotal - paid;
              const c = clsOf(s);
              const open = expanded === s.id;
              return (
                <div key={s.id} className="card overflow-hidden anim-in">
                  <div className="flex items-center">
                    <label className="pl-3.5 py-3 flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(s.id)} className="accent-amber w-4 h-4"
                        onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })} />
                    </label>
                    <button className="grow flex items-center gap-3 px-3 py-3 text-left min-w-0" onClick={() => setExpanded(open ? null : s.id)}>
                      <span className="w-9 h-9 rounded-full text-white text-xs font-extrabold inline-flex items-center justify-center shrink-0" style={{ background: SEX_COLORS[s.sex as "M"] }}>
                        {s.firstName[0]}{s.lastName[0]}
                      </span>
                    <span className="grow min-w-0">
                      <span className="block font-bold text-sm truncate">{s.lastName.toUpperCase()} {s.firstName}</span>
                      <span className="block text-[11px] text-inkmut font-mono">{s.matricule} · {c ? classLabel(c, locale) : "—"}</span>
                    </span>
                    <span className={`text-xs font-bold tabular ${rest > 0 ? "text-coral" : "text-ok"}`}>{rest > 0 ? money(rest) : "✓"}</span>
                    <Icon name="chevD" size={16} className={`text-inkmut transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  </div>
                  {open && (
                    <div className="px-4 pb-4 pt-1 border-t border-line/70 anim-fade">
                      <div className="grid grid-cols-3 gap-2 text-center my-3">
                        <div><p className="text-[10px] text-inkmut font-bold uppercase">{t("reg.paid")}</p><p className="text-xs font-bold text-ok tabular">{money(paid)}</p></div>
                        <div><p className="text-[10px] text-inkmut font-bold uppercase">{t("reg.tuition")}</p><p className="text-xs font-bold tabular">{money(s.tuitionTotal)}</p></div>
                        <div><p className="text-[10px] text-inkmut font-bold uppercase">{t("reg.age")}</p><p className="text-xs font-bold tabular">{ageFrom(s.birthDate)} {t("yearsOld")}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn btn-amber btn-sm grow" onClick={() => setPayFor(s)}><Icon name="coins" size={14} /> {t("reg.collect")}</button>
                        <button className="btn btn-ghost btn-sm grow" onClick={() => setDrawerId(s.id)}><Icon name="eye" size={14} /> {t("reg.details")}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="card px-4 py-3 flex justify-between text-sm font-bold text-board">
              <span>{rows.length} {t("students")}</span>
              <span className="tabular text-ok">{money(totalPaid)}</span>
              <span className="tabular text-coral">{money(totalDue - totalPaid)}</span>
            </div>
          </div>
        </>
      )}

      {/* Student drawer */}
      <Drawer open={!!drawerStudent} onClose={() => setDrawerId(null)} title={t("reg.details")}
        footer={drawerStudent ? <>
          <button type="button" className="btn btn-amber grow" onClick={() => setPayFor(drawerStudent)}><Icon name="coins" size={16} /> {t("reg.collect")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditFor(drawerStudent)} title={t("edit")}><Icon name="pen" size={15} /></button>
          <button type="button" className="btn btn-ghost" onClick={() => { setArchiveReason(""); setArchiveFor(drawerStudent); }} title={t("reg.archive")}><Icon name="clock" size={15} /></button>
          <button type="button" className="btn btn-danger" onClick={() => setDeleteFor(drawerStudent)} title={t("delete")}><Icon name="trash" size={15} /></button>
        </> : undefined}>
        {drawerStudent && <StudentSheet s={drawerStudent} onBulletin={() => setBulletinFor(drawerStudent.id)}
          onReceipt={(pid) => {
            const p = data.payments.find((x) => x.id === pid);
            const rec = p ? receiptFromPayment(data, p, locale) : receiptForStudent(data, drawerStudent, locale);
            if (rec) setDoc({ html: receiptsHTML(data, [rec], locale), filename: `recu-${rec.no}`, title: `${t("ca.receipt")} ${rec.no}` });
          }} />}
      </Drawer>

      {/* Edit modal */}
      <Modal open={!!editFor} onClose={() => setEditFor(null)} title={t("en.editTitle")} wide>
        {editFor && <EnrollForm initial={editFor} onSaved={() => { setEditFor(null); toast(t("savedOk")); }} onCancel={() => setEditFor(null)} />}
      </Modal>

      <PaymentModal student={payFor} open={!!payFor} onClose={() => setPayFor(null)} />
      <Modal open={!!archiveFor} onClose={() => setArchiveFor(null)} title={t("reg.archive")}
        footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setArchiveFor(null)}>{t("cancel")}</button>
          <button type="button" className="btn btn-primary" onClick={() => void doArchive()}><Icon name="clock" size={15} /> {t("reg.archive")}</button>
        </>}>
        <div className="space-y-3">
          <p className="text-sm text-ink">{archiveFor ? `${archiveFor.firstName} ${archiveFor.lastName.toUpperCase()} (${archiveFor.matricule})` : ""}</p>
          <Field label={t("arc.reason")}>
            <input className="input" value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} placeholder={t("arc.reasonPh")} />
          </Field>
        </div>
      </Modal>
      <Confirm open={!!deleteFor} onClose={() => setDeleteFor(null)} onConfirm={doDelete}
        title={t("delete")} confirmLabel={t("delete")}
        message={deleteFor ? t("reg.confirmDeleteMsg", { name: `${deleteFor.firstName} ${deleteFor.lastName.toUpperCase()}`, mat: deleteFor.matricule }) : ""} />
      <BulletinModal studentId={bulletinFor} open={!!bulletinFor} onClose={() => setBulletinFor(null)} />
      <ClassCreateModal open={classModal} onClose={() => setClassModal(false)} defaultBlock={blockFilter !== "all" ? blockFilter : undefined} />
      {doc && <DocPreview open={!!doc} onClose={() => setDoc(null)} html={doc.html} filename={doc.filename} title={doc.title} />}
    </div>
  );
}

/* ── Student detail sheet (drawer body) ── */
function StudentSheet({ s, onBulletin, onReceipt }: { s: StudentRow; onBulletin: () => void; onReceipt: (paymentId: string) => void }) {
  const { data } = useApp();
  const { t, locale } = useI18n();
  if (!data) return null;
  const cls = data.classes.find((c) => c.id === s.classId);
  const paid = s.paid1 + s.paid2;
  const rest = s.tuitionTotal - paid;
  const pays = data.payments.filter((p) => p.studentId === s.id);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="w-14 h-14 rounded-2xl text-white text-lg font-extrabold inline-flex items-center justify-center shrink-0" style={{ background: SEX_COLORS[s.sex as "M"] }}>
          {s.firstName[0]}{s.lastName[0]}
        </span>
        <div className="min-w-0">
          <p className="font-display font-bold text-xl text-board leading-tight">{s.firstName} {s.lastName.toUpperCase()}</p>
          <p className="text-xs text-inkmut font-mono mt-0.5">{s.matricule} · {cls ? classLabel(cls, locale) : "—"} · {ageFrom(s.birthDate)} {t("yearsOld")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <InfoLine k={t("reg.birth")} v={`${fmtDate(s.birthDate, locale)}${s.birthPlace ? " · " + s.birthPlace : ""}`} />
        <InfoLine k={t("reg.enrolledAt")} v={fmtDate(s.enrolledAt, locale)} />
        <InfoLine k={t("reg.father")} v={s.fatherName || "—"} />
        <InfoLine k={t("reg.mother")} v={s.motherName || "—"} />
        <InfoLine k="WhatsApp" v={s.whatsapp || "—"} />
        <InfoLine k={t("reg.sex")} v={s.sex === "F" ? t("girl") : t("boy")} />
      </div>

      <div className="rounded-xl border border-line bg-parch p-4">
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-inkmut">{t("reg.balance")}</p>
          <span className={`stamp-badge ${rest <= 0 ? "text-ok" : "text-coral"}`}>{rest <= 0 ? (locale === "fr" ? "SOLDÉ" : "PAID") : money(rest)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-board/10 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-gradient-to-r from-ok to-teal transition-all duration-500" style={{ width: `${s.tuitionTotal > 0 ? (paid / s.tuitionTotal) * 100 : 0}%` }} />
        </div>
        <div className="flex justify-between text-xs font-semibold tabular">
          <span className="text-ok">{money(paid)}</span>
          <span className="text-inkmut">T1: {money(s.paid1)} · T2: {money(s.paid2)}</span>
          <span className="text-board">{money(s.tuitionTotal)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="btn btn-ghost btn-sm grow" onClick={onBulletin}><Icon name="book" size={14} /> {t("reg.bulletin")}</button>
        {rest > 0 && s.whatsapp && (
          <a className="btn btn-wa btn-sm grow" target="_blank" rel="noreferrer" href={waLink(s.whatsapp, reminderMessage(data, s, locale))}>
            <WaIcon size={14} /> {t("reg.remind")}
          </a>
        )}
      </div>

      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-inkmut mb-2">{t("reg.paymentsHistory")}</p>
        {pays.length === 0 ? <p className="text-sm text-inkmut">{t("reg.noPayments")}</p> : (
          <ul className="space-y-2">
            {pays.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3 py-2.5">
                <span className={`p-1.5 rounded-lg ${p.method === "cash" ? "bg-board/10 text-board" : p.method === "orange" ? "bg-amber/20 text-amber-2" : "bg-warn/15 text-warn"}`}>
                  <Icon name={p.method === "cash" ? "coins" : "phone"} size={14} />
                </span>
                <div className="grow min-w-0">
                  <p className="text-xs font-bold font-mono">{p.receiptNo} <span className="chip bg-board/8 text-board ml-1">T{p.tranche}</span></p>
                  <p className="text-[11px] text-inkmut">{fmtDate(p.paidAt, locale)}</p>
                </div>
                <span className="font-bold text-sm tabular text-ok">{money(p.amount)}</span>
                <button className="p-1.5 rounded-lg hover:bg-board/10 text-inkmut" title={t("print")} onClick={() => onReceipt(p.id)}>
                  <Icon name="printer" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-inkmut">{k}</p>
      <p className="font-semibold text-ink truncate">{v}</p>
    </div>
  );
}