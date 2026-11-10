"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import {
  BLOCKS, BLOCK_COLORS, STRUCTURE, classLabel, fmtDate, money, waLink, type Block,
} from "@/lib/core";
import {
  studentsHTML, cashHTML, gradesHTML, receiptsHTML, receiptForStudent,
  staffHTML, archivesHTML, enrollMessage, reminderMessage, downloadWord,
} from "@/lib/docs";
import type { StaffRow, StudentRow } from "@/lib/types";
import { Icon, WaIcon, Badge, StatCard, EmptyState, Modal, Confirm, Field, DocPreview } from "@/components/ui";

/* ═══════════════════════════════════════════════════════════════
   1. PARENTS WHATSAPP HUB
   ═══════════════════════════════════════════════════════════════ */
export function ParentsWhatsappView() {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [blockFilter, setBlockFilter] = useState<"all" | Block>("all");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [tpl, setTpl] = useState<"enroll" | "remind" | "meeting" | "custom">("remind");
  const [customMsg, setCustomMsg] = useState("");

  const list = useMemo(() => {
    if (!data) return [];
    const clsIds = blockFilter === "all"
      ? null
      : new Set(data.classes.filter((c) => c.block === blockFilter).map((c) => c.id));
    return data.students.filter((s) => {
      if (clsIds && !clsIds.has(s.classId)) return false;
      if (unpaidOnly && s.paid1 + s.paid2 >= s.tuitionTotal) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        return `${s.lastName} ${s.firstName} ${s.matricule} ${s.whatsapp}`.toLowerCase().includes(needle);
      }
      return true;
    });
  }, [data, q, blockFilter, unpaidOnly]);

  if (!data) return null;

  const picked = data.students.find((s) => s.id === selectedId) ?? list[0] ?? null;

  const buildMsg = (stu: StudentRow): string => {
    if (tpl === "enroll") return enrollMessage(data, stu, locale);
    if (tpl === "remind") return reminderMessage(data, stu, locale);
    if (tpl === "meeting") {
      const cls = data.classes.find((c) => c.id === stu.classId);
      return locale === "fr"
        ? `🏫 *${data.tenant.name}*\nBonjour parent de *${stu.lastName.toUpperCase()} ${stu.firstName}* (${cls ? classLabel(cls, "fr") : ""}),\nVous êtes convié(e) à une rencontre avec la Direction / l'Enseignant(e) cette semaine. Merci de confirmer votre disponibilité.`
        : `🏫 *${data.tenant.name}*\nHello parent of *${stu.lastName.toUpperCase()} ${stu.firstName}* (${cls ? classLabel(cls, "en") : ""}),\nYou are invited to a meeting with the Head Office / Teacher this week. Please confirm your availability.`;
    }
    return customMsg.trim() || reminderMessage(data, stu, locale);
  };

  const sendAndLog = async (stu: StudentRow, msg: string, kind: "enroll" | "reminder" | "custom") => {
    if (!stu.whatsapp) {
      toast(locale === "fr" ? "Numéro WhatsApp parent manquant" : "Missing parent WhatsApp number", "error");
      return;
    }
    window.open(waLink(stu.whatsapp, msg), "_blank");
    await act("wa.log", {
      studentId: stu.id,
      recipientName: `${stu.lastName.toUpperCase()} ${stu.firstName}`,
      phone: stu.whatsapp,
      kind,
      message: msg,
    });
    toast(t("en.waSent"));
  };

  const activeMsg = picked ? buildMsg(picked) : customMsg;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="phone" label={t("nav.whatsapp")} value={data.students.filter((s) => !!s.whatsapp).length} tone="#149645" />
        <StatCard icon="alert" label={t("reg.view.unpaid")} value={data.students.filter((s) => s.paid1 + s.paid2 < s.tuitionTotal).length} tone="#d8431b" />
        <StatCard icon="send" label={locale === "fr" ? "Messages journalisés" : "Logged messages"} value={data.waLogs.length} tone="#1b4fd6" />
        <StatCard icon="users" label={t("dash.effectif")} value={data.students.length} tone="#0f3325" />
      </div>

      {/* Composer */}
      <div className="card p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-board text-lg flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#149645]/15 text-[#149645]"><WaIcon size={18} /></span>
            {t("wa.compose")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {(["remind", "enroll", "meeting", "custom"] as const).map((k) => (
              <button type="button" key={k} onClick={() => setTpl(k)}
                className={`chip cursor-pointer transition-all ${tpl === k ? "bg-board text-white shadow" : "bg-parch text-inkmut border border-line hover:border-board"}`}>
                {k === "remind" ? t("wa.tplRemind") : k === "enroll" ? t("wa.tplEnroll") : k === "meeting" ? t("wa.tplMeeting") : t("wa.compose")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3.5 items-start">
          <Field label={t("wa.chooseParent")}>
            <select className="input font-semibold" value={picked?.id ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
              {data.students.map((s) => (
                <option key={s.id} value={s.id}>{s.lastName.toUpperCase()} {s.firstName} — {s.whatsapp || "—"}</option>
              ))}
            </select>
          </Field>
          <Field label={t("wa.msgText")}>
            <textarea
              className="input min-h-[96px] font-sans text-sm"
              value={tpl === "custom" ? customMsg : activeMsg}
              onChange={(e) => { setTpl("custom"); setCustomMsg(e.target.value); }}
              placeholder={locale === "fr" ? "Saisissez votre message…" : "Write your message…"}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="button" className="btn btn-wa" disabled={!picked || !picked.whatsapp}
            onClick={() => picked && void sendAndLog(picked, tpl === "custom" ? customMsg : activeMsg, tpl === "enroll" ? "enroll" : tpl === "remind" ? "reminder" : "custom")}>
            <WaIcon size={17} /> {t("wa.sendAndLog")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4 items-start">
        {/* Parents directory */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative grow min-w-[180px]">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmut" />
              <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("reg.searchPh")} />
            </div>
            <select className="input w-auto" value={blockFilter} onChange={(e) => setBlockFilter(e.target.value as "all" | Block)}>
              <option value="all">{t("blk.all")}</option>
              {BLOCKS.map((b) => <option key={b} value={b}>{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</option>)}
            </select>
            <button type="button" onClick={() => setUnpaidOnly((v) => !v)}
              className={`chip cursor-pointer border ${unpaidOnly ? "bg-coral text-white border-coral" : "bg-white text-inkmut border-line"}`}>
              {t("wa.unpaidOnly")}
            </button>
          </div>
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {list.map((s) => {
              const cls = data.classes.find((c) => c.id === s.classId);
              const rest = s.tuitionTotal - s.paid1 - s.paid2;
              return (
                <div key={s.id} className="rounded-xl border border-line bg-parch/60 px-3.5 py-2.5 flex flex-wrap items-center gap-3">
                  <div className="grow min-w-[180px]">
                    <p className="font-bold text-sm text-board">{s.lastName.toUpperCase()} {s.firstName} <span className="font-mono text-xs text-inkmut">({s.matricule})</span></p>
                    <p className="text-xs text-inkmut">
                      {cls ? classLabel(cls, locale) : "—"} · 📱 <b className="tabular text-ink">{s.whatsapp || "—"}</b>
                      {rest > 0 && <span className="ml-2 text-coral font-bold tabular">· {t("reg.due")}: {money(rest)}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={!s.whatsapp}
                      onClick={() => void sendAndLog(s, enrollMessage(data, s, locale), "enroll")}>
                      <Icon name="check" size={13} /> {locale === "fr" ? "Confirm." : "Confirm"}
                    </button>
                    <button type="button" className="btn btn-wa btn-sm" disabled={!s.whatsapp}
                      onClick={() => void sendAndLog(s, reminderMessage(data, s, locale), "reminder")}>
                      <WaIcon size={14} /> {locale === "fr" ? "Relance" : "Remind"}
                    </button>
                  </div>
                </div>
              );
            })}
            {list.length === 0 && <EmptyState icon="phone" title={t("reg.empty")} />}
          </div>
        </div>

        {/* History log */}
        <div className="card p-4 space-y-3">
          <h3 className="font-display font-bold text-board text-base flex items-center gap-2">
            <Icon name="clock" size={16} className="text-amber-2" /> {t("wa.history")}
          </h3>
          {data.waLogs.length === 0 ? (
            <p className="text-sm text-inkmut py-8 text-center">{t("wa.noLogs")}</p>
          ) : (
            <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {data.waLogs.map((l) => (
                <li key={l.id} className="rounded-xl border border-line bg-white p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={l.kind === "enroll" ? "green" : l.kind === "reminder" ? "amber" : "blue"}>{l.kind}</Badge>
                    <b className="text-xs text-board">{l.recipientName}</b>
                    <span className="text-[11px] font-mono text-inkmut tabular">{l.phone}</span>
                    <span className="ml-auto text-[10.5px] text-inkmut">{fmtDate(l.createdAt, locale)}</span>
                  </div>
                  <p className="text-xs text-inkmut line-clamp-2">{l.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. REPORTS & EXPORTS HUB
   ═══════════════════════════════════════════════════════════════ */
export function ReportsView() {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const [blockFilter, setBlockFilter] = useState<"all" | Block>("all");
  const [classId, setClassId] = useState<string>("all");
  const [term, setTerm] = useState<number>(1);
  const [doc, setDoc] = useState<{ html: string; filename: string; title: string; landscape?: boolean } | null>(null);

  if (!data) return null;
  const scopedClasses = blockFilter === "all" ? data.classes : data.classes.filter((c) => c.block === blockFilter);
  const activeClassIds = new Set((classId === "all" ? scopedClasses : scopedClasses.filter((c) => c.id === classId)).map((c) => c.id));
  const scopedStudents = data.students.filter((s) => activeClassIds.has(s.classId));
  const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));
  const scopedPayments = data.payments.filter((p) => scopedStudentIds.has(p.studentId));

  const targetGradeClass = (classId !== "all" ? data.classes.find((c) => c.id === classId) : scopedClasses[0]) ?? null;

  const cards = [
    {
      id: "students", icon: "users", tone: "#0f3325",
      title: t("rep.studentsList"), desc: t("rep.studentsDesc"),
      disabled: scopedStudents.length === 0,
      runPdf: () => setDoc({ html: studentsHTML(data, scopedStudents, locale), filename: "liste-eleves", title: t("rep.studentsList") }),
      runWord: () => downloadWord(studentsHTML(data, scopedStudents, locale), "liste-eleves"),
    },
    {
      id: "cash", icon: "wallet", tone: "#1b8654",
      title: t("rep.cashReg"), desc: t("rep.cashDesc"),
      disabled: scopedPayments.length === 0,
      runPdf: () => setDoc({ html: cashHTML(data, scopedPayments, locale), filename: "registre-caisse", title: t("rep.cashReg"), landscape: true }),
      runWord: () => downloadWord(cashHTML(data, scopedPayments, locale), "registre-caisse"),
    },
    {
      id: "grades", icon: "book", tone: "#1b4fd6",
      title: t("rep.gradeSheet"), desc: t("rep.gradeDesc"),
      disabled: !targetGradeClass,
      runPdf: () => targetGradeClass && setDoc({ html: gradesHTML(data, targetGradeClass.id, term, locale), filename: `notes-${targetGradeClass.levelCode}-T${term}`, title: t("rep.gradeSheet"), landscape: true }),
      runWord: () => targetGradeClass && downloadWord(gradesHTML(data, targetGradeClass.id, term, locale), `notes-${targetGradeClass.levelCode}-T${term}`),
    },
    {
      id: "receipts", icon: "coins", tone: "#996208",
      title: t("rep.receiptsBatch"), desc: t("rep.receiptsDesc"),
      disabled: scopedStudents.length === 0,
      runPdf: () => setDoc({ html: receiptsHTML(data, scopedStudents.map((s) => receiptForStudent(data, s, locale)), locale), filename: "recus-A6", title: t("rep.receiptsBatch") }),
      runWord: () => downloadWord(receiptsHTML(data, scopedStudents.map((s) => receiptForStudent(data, s, locale)), locale), "recus-A6"),
    },
    {
      id: "staff", icon: "building", tone: "#ad1e67",
      title: t("rep.staffList"), desc: t("rep.staffDesc"),
      disabled: data.staff.length === 0,
      runPdf: () => setDoc({ html: staffHTML(data, data.staff, locale), filename: "annuaire-personnel", title: t("rep.staffList") }),
      runWord: () => downloadWord(staffHTML(data, data.staff, locale), "annuaire-personnel"),
    },
    {
      id: "archives", icon: "clock", tone: "#d8431b",
      title: t("nav.archives"), desc: t("arc.subtitle"),
      disabled: data.archivedStudents.length === 0,
      runPdf: () => setDoc({ html: archivesHTML(data, data.archivedStudents, locale), filename: "archives-eleves", title: t("nav.archives") }),
      runWord: () => downloadWord(archivesHTML(data, data.archivedStudents, locale), "archives-eleves"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <Field label={t("cls.block")}>
          <select className="input w-auto" value={blockFilter} onChange={(e) => { setBlockFilter(e.target.value as "all" | Block); setClassId("all"); }}>
            <option value="all">{t("blk.all")}</option>
            {BLOCKS.map((b) => <option key={b} value={b}>{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</option>)}
          </select>
        </Field>
        <Field label={t("reg.class")}>
          <select className="input w-auto min-w-[170px]" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="all">{t("ca.allClasses")}</option>
            {scopedClasses.map((c) => <option key={c.id} value={c.id}>{classLabel(c, locale)}</option>)}
          </select>
        </Field>
        <Field label={t("gr.term")}>
          <select className="input w-auto" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
            <option value={1}>{t("gr.term1")}</option>
            <option value={2}>{t("gr.term2")}</option>
            <option value={3}>{t("gr.term3")}</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.id} className="card p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="p-3 rounded-xl shrink-0" style={{ background: c.tone + "18", color: c.tone }}>
                <Icon name={c.icon} size={20} />
              </span>
              <div>
                <h3 className="font-display font-bold text-board text-base">{c.title}</h3>
                <p className="text-xs text-inkmut mt-1 leading-relaxed">{c.desc}</p>
              </div>
            </div>
            <div className="mt-auto pt-3 border-t border-line flex gap-2">
              <button type="button" className="btn btn-primary btn-sm grow" disabled={c.disabled} onClick={c.runPdf}>
                <Icon name="printer" size={14} /> PDF (A4)
              </button>
              <button type="button" className="btn btn-ghost btn-sm grow" disabled={c.disabled} onClick={c.runWord}>
                <Icon name="fileText" size={14} /> Word
              </button>
            </div>
          </div>
        ))}
      </div>

      {doc && <DocPreview open={!!doc} onClose={() => setDoc(null)} html={doc.html} filename={doc.filename} title={doc.title} landscape={doc.landscape} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. ARCHIVES VIEW
   ═══════════════════════════════════════════════════════════════ */
export function ArchivesView() {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [delFor, setDelFor] = useState<StudentRow | null>(null);
  const [docOpen, setDocOpen] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.archivedStudents.filter((s) =>
      !needle || `${s.lastName} ${s.firstName} ${s.matricule} ${s.archiveReason}`.toLowerCase().includes(needle)
    );
  }, [data, q]);

  if (!data) return null;

  const restore = async (s: StudentRow) => {
    const res = await act("student.unarchive", { id: s.id });
    if (res.ok) toast(t("arc.restored", { name: `${s.firstName} ${s.lastName.toUpperCase()}` }));
    else toast(t("errorGeneric"), "error");
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-2.5 items-center">
        <div className="relative grow min-w-[200px]">
          <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmut" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("reg.searchPh")} />
        </div>
        <Badge tone="board">{rows.length} {locale === "fr" ? "dossiers" : "records"}</Badge>
        <button type="button" className="btn btn-ghost btn-sm" disabled={rows.length === 0} onClick={() => setDocOpen(true)}>
          <Icon name="printer" size={14} /> PDF / Word
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon="clock" title={t("arc.empty")} hint={t("arc.emptyHint")} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((s) => {
            const cls = data.classes.find((c) => c.id === s.classId);
            const paid = s.paid1 + s.paid2;
            return (
              <div key={s.id} className="card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-board">{s.lastName.toUpperCase()} {s.firstName}</p>
                    <p className="text-xs font-mono text-inkmut">{s.matricule} · {cls ? classLabel(cls, locale) : "—"}</p>
                  </div>
                  <Badge tone="amber">{fmtDate(s.archivedAt, locale)}</Badge>
                </div>
                <p className="text-xs text-inkmut bg-parch rounded-lg px-2.5 py-1.5">{s.archiveReason || "—"}</p>
                <div className="flex justify-between text-xs font-semibold tabular">
                  <span className="text-ok">{t("reg.paid")}: {money(paid)}</span>
                  <span className="text-board">{t("reg.tuition")}: {money(s.tuitionTotal)}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" className="btn btn-primary btn-sm grow" onClick={() => void restore(s)}>
                    <Icon name="refresh" size={13} /> {t("arc.restore")}
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDelFor(s)} title={t("arc.deletePerm")}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Confirm
        open={!!delFor}
        onClose={() => setDelFor(null)}
        title={t("arc.deletePerm")}
        confirmLabel={t("delete")}
        message={delFor ? t("reg.confirmDeleteMsg", { name: `${delFor.firstName} ${delFor.lastName.toUpperCase()}`, mat: delFor.matricule }) : ""}
        onConfirm={async () => {
          if (!delFor) return;
          const res = await act("student.deletePermanent", { id: delFor.id });
          setDelFor(null);
          toast(res.ok ? t("savedOk") : t("errorGeneric"), res.ok ? "success" : "error");
        }}
      />
      <DocPreview open={docOpen} onClose={() => setDocOpen(false)} html={docOpen ? archivesHTML(data, rows, locale) : ""} filename="archives-eleves" title={t("nav.archives")} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. PERSONNEL / STAFF VIEW
   ═══════════════════════════════════════════════════════════════ */
export function StaffView() {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [blockFilter, setBlockFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<StaffRow | null>(null);
  const [delRow, setDelRow] = useState<StaffRow | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [f, setF] = useState({ fullName: "", role: "teacher", block: "primary", phone: "", email: "", salary: 90000, status: "active" });
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.staff.filter((m) => {
      if (blockFilter !== "all" && m.block !== blockFilter && m.block !== "all") return false;
      if (needle && !`${m.fullName} ${m.phone} ${m.email} ${m.role}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data, q, blockFilter]);

  if (!data) return null;

  const payroll = data.staff.filter((m) => m.status === "active").reduce((a, m) => a + m.salary, 0);
  const roleLabel = (r: string) =>
    r === "director" ? t("stf.rDirector") : r === "bursar" ? t("stf.rBursar") : r === "secretary" ? t("stf.rSecretary") : r === "supervisor" ? t("stf.rSupervisor") : t("stf.rTeacher");

  const openNew = () => {
    setEditRow(null);
    setF({ fullName: "", role: "teacher", block: "primary", phone: "", email: "", salary: 90000, status: "active" });
    setModalOpen(true);
  };
  const openEdit = (m: StaffRow) => {
    setEditRow(m);
    setF({ fullName: m.fullName, role: m.role, block: m.block, phone: m.phone, email: m.email, salary: m.salary, status: m.status });
    setModalOpen(true);
  };
  const submit = async () => {
    if (!f.fullName.trim()) { toast(t("en.required"), "error"); return; }
    setBusy(true);
    const res = editRow
      ? await act("staff.update", { id: editRow.id, ...f })
      : await act("staff.create", f);
    setBusy(false);
    if (res.ok) {
      toast(t("savedOk"));
      setModalOpen(false);
    } else toast(t("errorGeneric"), "error");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon="users" label={t("nav.staff")} value={data.staff.length} tone="#0f3325" />
        <StatCard icon="check" label={t("active")} value={data.staff.filter((m) => m.status === "active").length} tone="#1b8654" />
        <StatCard icon="coins" label={t("stf.payroll")} value={money(payroll)} tone="#996208" />
      </div>

      <div className="card p-4 flex flex-wrap gap-2.5 items-center">
        <div className="relative grow min-w-[200px]">
          <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-inkmut" />
          <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search") + "…"} />
        </div>
        <select className="input w-auto" value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
          <option value="all">{t("blk.all")}</option>
          {BLOCKS.map((b) => <option key={b} value={b}>{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</option>)}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" disabled={rows.length === 0} onClick={() => setDocOpen(true)}>
          <Icon name="printer" size={14} /> PDF / Word
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
          <Icon name="plus" size={15} /> {t("stf.add")}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card"><EmptyState icon="users" title={t("stf.empty")} action={<button type="button" className="btn btn-primary" onClick={openNew}><Icon name="plus" size={15} /> {t("stf.add")}</button>} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((m) => (
            <div key={m.id} className="card p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-board">{m.fullName}</p>
                  <p className="text-xs font-semibold text-inkmut">{roleLabel(m.role)}</p>
                </div>
                <Badge tone={m.status === "active" ? "green" : "amber"}>{m.status === "active" ? t("active") : t("stf.onLeave")}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-inkmut">
                <span className="chip bg-parch text-board border border-line" style={m.block !== "all" ? { borderColor: BLOCK_COLORS[m.block as Block] } : undefined}>
                  {m.block === "all" ? t("blk.all") : (locale === "fr" ? STRUCTURE[m.block as Block]?.fr : STRUCTURE[m.block as Block]?.en)}
                </span>
                <span className="font-bold text-board tabular">{money(m.salary)}</span>
              </div>
              <p className="text-xs text-inkmut font-mono">{m.phone || "—"} {m.email ? `· ${m.email}` : ""}</p>
              <div className="flex gap-1.5 pt-1">
                {m.phone && (
                  <a className="btn btn-wa btn-sm" target="_blank" rel="noreferrer" href={waLink(m.phone, `${data.tenant.name} — ${m.fullName}`)}>
                    <WaIcon size={13} />
                  </a>
                )}
                <button type="button" className="btn btn-ghost btn-sm grow" onClick={() => openEdit(m)}><Icon name="pen" size={13} /> {t("edit")}</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDelRow(m)}><Icon name="trash" size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editRow ? t("stf.edit") : t("stf.add")}
        footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>{t("cancel")}</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}><Icon name="check" size={15} /> {t("save")}</button>
        </>}>
        <div className="space-y-3.5">
          <Field label={`${t("stf.fullName")} *`}><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label={t("stf.role")}>
              <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                <option value="teacher">{t("stf.rTeacher")}</option>
                <option value="director">{t("stf.rDirector")}</option>
                <option value="bursar">{t("stf.rBursar")}</option>
                <option value="secretary">{t("stf.rSecretary")}</option>
                <option value="supervisor">{t("stf.rSupervisor")}</option>
              </select>
            </Field>
            <Field label={t("cls.block")}>
              <select className="input" value={f.block} onChange={(e) => setF({ ...f, block: e.target.value })}>
                <option value="all">{t("blk.all")}</option>
                {BLOCKS.map((b) => <option key={b} value={b}>{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</option>)}
              </select>
            </Field>
            <Field label={t("phone")}><input className="input tabular" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label={t("email")}><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label={t("stf.salary")}><input type="number" className="input tabular" min={0} step={5000} value={f.salary} onChange={(e) => setF({ ...f, salary: Number(e.target.value) })} /></Field>
            <Field label={t("status")}>
              <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                <option value="active">{t("active")}</option>
                <option value="on_leave">{t("stf.onLeave")}</option>
              </select>
            </Field>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!delRow}
        onClose={() => setDelRow(null)}
        title={t("delete")}
        confirmLabel={t("delete")}
        message={delRow ? delRow.fullName : ""}
        onConfirm={async () => {
          if (!delRow) return;
          const res = await act("staff.delete", { id: delRow.id });
          setDelRow(null);
          toast(res.ok ? t("savedOk") : t("errorGeneric"), res.ok ? "success" : "error");
        }}
      />
      <DocPreview open={docOpen} onClose={() => setDocOpen(false)} html={docOpen ? staffHTML(data, rows, locale) : ""} filename="annuaire-personnel" title={t("nav.staff")} />
    </div>
  );
}
