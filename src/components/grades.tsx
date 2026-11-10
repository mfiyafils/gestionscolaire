"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { classLabel, computeResults, SUBJECT_CATALOG, STRUCTURE, BLOCKS, BLOCK_COLORS, SEX_COLORS, mention, allowedBlocks, type Block } from "@/lib/core";
import { gradesHTML, downloadWord } from "@/lib/docs";
import { Icon, Badge, EmptyState, DocPreview, Seg, Confirm, Field } from "@/components/ui";
import { BulletinModal } from "@/components/bulletin";
import { ClassCreateModal } from "@/components/students";

export function GradesView() {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [blockFilter, setBlockFilter] = useState<"all" | Block>("all");
  const [classId, setClassId] = useState<string>("");
  const [term, setTerm] = useState<"1" | "2" | "3">("1");
  const [catalogPick, setCatalogPick] = useState("");
  const [coef, setCoef] = useState(2);
  const [customName, setCustomName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftsRef = useRef<Record<string, string>>({});
  const [hasDirty, setHasDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removeSub, setRemoveSub] = useState<{ id: string; name: string } | null>(null);
  const [bulletinFor, setBulletinFor] = useState<string | null>(null);
  const [doc, setDoc] = useState<{ html: string; filename: string } | null>(null);
  const [classModal, setClassModal] = useState(false);
  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleBlocks = useMemo(
    () => (data && !data.tenant.isSandbox ? allowedBlocks(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure) : BLOCKS),
    [data]
  );

  const visibleClasses = useMemo(() => {
    if (!data) return [];
    const paidOnly = data.classes.filter((c) => visibleBlocks.includes(c.block as Block));
    return blockFilter === "all" ? paidOnly : paidOnly.filter((c) => c.block === blockFilter);
  }, [data, blockFilter, visibleBlocks]);

  // Keep classId valid within data.classes & blockFilter
  useEffect(() => {
    if (!data) return;
    if (visibleClasses.length === 0) {
      if (classId !== "") setClassId("");
      return;
    }
    if (!visibleClasses.some((c) => c.id === classId)) {
      const withStudents = visibleClasses.find((c) => data.students.some((s) => s.classId === c.id));
      setClassId(withStudents?.id ?? visibleClasses[0].id);
    }
  }, [data, visibleClasses, classId]);

  const subs = useMemo(
    () => (data ? data.subjects.filter((s) => s.classId === classId).sort((a, b) => a.position - b.position) : []),
    [data, classId]
  );
  const pupils = useMemo(
    () => (data ? data.students.filter((s) => s.classId === classId).sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName)) : []),
    [data, classId]
  );

  // keep drafts synced from server without wiping pending unsaved cells
  const initKey = classId + "|" + term;
  const lastInit = useRef("");
  useEffect(() => {
    if (!data || !classId) return;
    const switched = lastInit.current !== initKey;
    if (switched) {
      dirty.current.clear();
      setHasDirty(false);
    }
    const next: Record<string, string> = switched ? {} : { ...draftsRef.current };
    const serverKeys = new Set<string>();
    for (const g of data.grades) {
      if (g.term === Number(term)) {
        const k = g.studentId + "|" + g.subjectId;
        serverKeys.add(k);
        if (switched || !dirty.current.has(k)) next[k] = String(g.value);
      }
    }
    if (!switched) {
      for (const k of Object.keys(next)) {
        if (!serverKeys.has(k) && !dirty.current.has(k)) delete next[k];
      }
    }
    draftsRef.current = next;
    setDrafts(next);
    lastInit.current = initKey;
  }, [initKey, data, classId, term]);

  // live merged grades for computation
  const merged = useMemo(() => {
    if (!data) return [];
    const base = data.grades.filter((g) => g.term === Number(term) && !dirty.current.has(g.studentId + "|" + g.subjectId));
    const extra: { studentId: string; subjectId: string; term: number; value: number }[] = [];
    for (const [key, val] of Object.entries(drafts)) {
      const n = parseFloat(val);
      if (val !== "" && !isNaN(n) && n >= 0 && n <= 20) {
        const [sid, subid] = key.split("|");
        extra.push({ studentId: sid, subjectId: subid, term: Number(term), value: n });
      }
    }
    const seen = new Set(base.map((g) => g.studentId + "|" + g.subjectId));
    return [...base, ...extra.filter((g) => !seen.has(g.studentId + "|" + g.subjectId))];
  }, [data, drafts, term]);

  const results = useMemo(
    () => computeResults(pupils.map((p) => p.id), subs, merged, Number(term)),
    [pupils, subs, merged, term]
  );

  const flush = async (targetTerm = Number(term)) => {
    if (dirty.current.size === 0) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const entries = [...dirty.current].map((key) => {
      const [studentId, subjectId] = key.split("|");
      const raw = draftsRef.current[key] ?? "";
      const n = parseFloat(raw);
      return { studentId, subjectId, term: targetTerm, value: raw === "" || isNaN(n) ? null : Math.max(0, Math.min(20, n)) };
    });
    dirty.current.clear();
    setHasDirty(false);
    setSaving(true);
    const res = await act("grades.save", { entries });
    setSaving(false);
    if (res.ok) toast(t("gr.saved"));
    else toast(t("errorGeneric"), "error");
  };

  const switchClass = (nextId: string) => {
    if (dirty.current.size > 0) void flush(Number(term));
    setClassId(nextId);
  };
  const switchTerm = (nextTerm: "1" | "2" | "3") => {
    if (dirty.current.size > 0) void flush(Number(term));
    setTerm(nextTerm);
  };

  const onCell = (sid: string, subid: string, val: string) => {
    const key = sid + "|" + subid;
    const next = { ...draftsRef.current, [key]: val };
    draftsRef.current = next;
    setDrafts(next);
    dirty.current.add(key);
    setHasDirty(true);
    if (timer.current) clearTimeout(timer.current);
    const activeTerm = Number(term);
    timer.current = setTimeout(() => { void flush(activeTerm); }, 1100);
  };

  const addSubject = async (nameFr: string, nameEn: string, c: number) => {
    if (!nameFr || !classId) return;
    const res = await act("subject.add", { classId, nameFr, nameEn, coefficient: c });
    if (res.ok) { toast(t("gr.subjectAdded")); setCatalogPick(""); setCustomName(""); }
    else toast(t("errorGeneric"), "error");
  };

  if (!data) return null;
  if (data.classes.length === 0) {
    return <div className="card"><EmptyState icon="book" title={t("en.createClassFirst")}
      action={<button className="btn btn-primary" onClick={() => setClassModal(true)}><Icon name="plus" size={16} /> {t("cls.add")}</button>} />
      <ClassCreateModal open={classModal} onClose={() => setClassModal(false)} /></div>;
  }

  const cls = data.classes.find((c) => c.id === classId);
  const avgs = pupils.map((p) => results.get(p.id)?.avg).filter((a): a is number => a !== null && a !== undefined);
  const classAvg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
  const passRate = avgs.length ? (avgs.filter((a) => a >= 10).length / avgs.length) * 100 : null;
  const enteredCount = merged.filter((g) => pupils.some((p) => p.id === g.studentId) && subs.some((s) => s.id === g.subjectId)).length;
  const availableCatalog = SUBJECT_CATALOG.filter((c) => !subs.some((s) => s.nameFr === c.fr));

  const exportSheet = (word: boolean) => {
    if (!cls) return;
    const html = gradesHTML(data, classId, Number(term), locale);
    if (word) downloadWord(html, `notes-${classLabel(cls, "fr")}-T${term}`);
    else setDoc({ html, filename: `notes-T${term}` });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-4 space-y-3 anim-in">
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-line/60">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-inkmut mr-1 inline-flex items-center gap-1">
            <Icon name="filter" size={11} /> {t("cls.block")} :
          </span>
          <button type="button" onClick={() => { if (dirty.current.size > 0) void flush(Number(term)); setBlockFilter("all"); }}
            className={`chip transition-all cursor-pointer ${blockFilter === "all" ? "bg-board text-white shadow" : "bg-parch text-ink border border-line hover:border-board"}`}>
            {t("blk.all")}
          </button>
          {BLOCKS.map((b) => {
            const paid = visibleBlocks.includes(b);
            return (
              <button type="button" key={b} disabled={!paid}
                onClick={() => { if (!paid) return; if (dirty.current.size > 0) void flush(Number(term)); setBlockFilter(blockFilter === b ? "all" : b); }}
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
        <div className="flex flex-wrap gap-2.5 items-center">
          <select className="input w-auto min-w-[170px]" value={classId} onChange={(e) => switchClass(e.target.value)}>
            {(blockFilter === "all" ? BLOCKS : [blockFilter]).map((b) => {
              const paid = visibleBlocks.includes(b);
              const cls = data.classes.filter((c) => c.block === b);
              if (!cls.length && paid) return null;
              return (
                <optgroup key={b} label={`${locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}${!paid ? ` (${t("blk.unpaid")})` : ""}`}>
                  {cls.map((c) => (
                    <option key={c.id} value={c.id} disabled={!paid}>{classLabel(c, locale)} · {data.students.filter((s) => s.classId === c.id).length}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <Seg options={[{ id: "1", label: t("gr.term1") }, { id: "2", label: t("gr.term2") }, { id: "3", label: t("gr.term3") }]} value={term} onChange={switchTerm} />
          <span className={`chip ${saving || hasDirty ? "bg-warn/15 text-warn" : "bg-ok/12 text-ok"}`}>
            <Icon name={saving ? "refresh" : hasDirty ? "clock" : "check"} size={12} className={saving ? "spin" : ""} />
            {saving ? t("syncing") : hasDirty ? t("gr.unsaved") : t("gr.saved")}
          </span>
          {hasDirty && (
            <button type="button" className="btn btn-amber btn-sm" onClick={() => void flush()} disabled={saving}>
              <Icon name="check" size={14} /> {t("gr.saveNow")}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportSheet(false)} disabled={!subs.length || !pupils.length}><Icon name="printer" size={14} /> PDF</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportSheet(true)} disabled={!subs.length || !pupils.length}><Icon name="fileText" size={14} /> Word</button>
          </div>
        </div>

        {/* Subject alignment */}
        <div className="flex flex-wrap gap-2 items-end pt-1 border-t border-line/70">
          <Field label={t("gr.addSubject")} className="grow min-w-[190px] max-w-xs">
            <select className="input" value={catalogPick} onChange={(e) => {
              setCatalogPick(e.target.value);
              const cat = SUBJECT_CATALOG.find((c) => c.fr === e.target.value);
              if (cat) setCoef(cat.coef);
            }}>
              <option value="">{t("gr.pickSubject")}</option>
              {availableCatalog.map((c) => <option key={c.fr} value={c.fr}>{locale === "fr" ? c.fr : c.en}</option>)}
            </select>
          </Field>
          <Field label={t("gr.coef")}>
            <input type="number" className="input w-20 tabular" min={1} max={10} value={coef} onChange={(e) => setCoef(Number(e.target.value))} />
          </Field>
          <button type="button" className="btn btn-primary btn-sm mb-0.5" disabled={!catalogPick || !classId}
            onClick={() => { const cat = SUBJECT_CATALOG.find((c) => c.fr === catalogPick); if (cat) void addSubject(cat.fr, cat.en, coef); }}>
            <Icon name="plus" size={14} /> {t("add")}
          </button>
          <span className="text-inkmut text-xs pb-2.5 hidden sm:inline">·</span>
          <Field label={t("gr.custom")} className="grow min-w-[160px] max-w-[220px]">
            <input className="input" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={t("gr.customName")} />
          </Field>
          <button type="button" className="btn btn-ghost btn-sm mb-0.5" disabled={!customName.trim() || !classId} onClick={() => void addSubject(customName.trim(), customName.trim(), coef)}>
            <Icon name="plus" size={14} />
          </button>
        </div>

        {subs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subs.map((s) => (
              <span key={s.id} className="chip bg-board/8 text-board border border-board/15">
                {locale === "fr" ? s.nameFr : s.nameEn} <b className="text-amber-2">×{s.coefficient}</b>
                <button className="ml-0.5 hover:text-danger" onClick={() => setRemoveSub({ id: s.id, name: locale === "fr" ? s.nameFr : s.nameEn })}>
                  <Icon name="x" size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-inkmut flex items-center gap-1.5 px-1"><Icon name="info" size={13} /> {t("gr.editHint")}</p>

      {visibleClasses.length === 0 ? (
        <div className="card"><EmptyState icon="book" title={t("en.createClassFirst")}
          action={<button type="button" className="btn btn-primary" onClick={() => setClassModal(true)}><Icon name="plus" size={16} /> {t("cls.add")}</button>} /></div>
      ) : pupils.length === 0 ? (
        <div className="card"><EmptyState icon="users" title={t("reg.empty")} hint={t("en.auto3", { cls: cls ? classLabel(cls, locale) : "—" })} /></div>
      ) : subs.length === 0 ? (
        <div className="card"><EmptyState icon="book" title={t("gr.noSubjects")} hint={t("gr.noSubjectsHint")} /></div>
      ) : (
        <div className="card overflow-hidden anim-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-board text-cream/90 text-[11px] uppercase tracking-wider">
                  <th className="px-2.5 py-3">{t("gr.order")}</th>
                  <th className="px-2 py-3 text-left">{t("reg.matricule")}</th>
                  <th className="px-3 py-3 text-left sticky-col">{t("reg.fullName")}</th>
                  <th className="px-2 py-3">{t("reg.sex")}</th>
                  {subs.map((s) => (
                    <th key={s.id} className="px-2 py-3 min-w-[86px]">
                      {locale === "fr" ? s.nameFr : s.nameEn}<span className="block text-amber font-normal normal-case">×{s.coefficient}</span>
                    </th>
                  ))}
                  <th className="px-2 py-3 bg-board-3">{t("gr.average")}</th>
                  <th className="px-2 py-3 bg-board-3">{t("gr.rank")}</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pupils.map((p, i) => {
                  const r = results.get(p.id)!;
                  return (
                    <tr key={p.id} className={`border-t border-line/70 ${i % 2 ? "bg-parch/60" : ""}`}>
                      <td className="px-2.5 py-1.5 text-center text-inkmut tabular">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-board font-semibold whitespace-nowrap">{p.matricule}</td>
                      <td className="px-3 py-1.5 font-semibold whitespace-nowrap">{p.lastName.toUpperCase()} <span className="font-normal">{p.firstName}</span></td>
                      <td className="px-2 py-1.5 text-center"><span className="chip text-white" style={{ background: SEX_COLORS[p.sex as "M"] }}>{p.sex}</span></td>
                      {subs.map((s) => {
                        const key = p.id + "|" + s.id;
                        const val = drafts[key] ?? "";
                        const n = parseFloat(val);
                        const bad = val !== "" && (isNaN(n) || n < 0 || n > 20);
                        return (
                          <td key={s.id} className="px-1.5 py-1.5 text-center">
                            <input
                              inputMode="decimal"
                              className={`w-[64px] text-center rounded-lg border px-1 py-1.5 text-sm font-semibold tabular transition-colors focus:outline-none focus:ring-2 focus:ring-amber/50
                                ${bad ? "border-danger bg-danger/10 text-danger" : val !== "" && !isNaN(n) ? (n >= 10 ? "border-ok/40 bg-ok/8 text-board" : "border-coral/40 bg-coral/8 text-coral") : "border-line bg-white"}`}
                              value={val}
                              placeholder="—"
                              onChange={(e) => onCell(p.id, s.id, e.target.value.replace(",", "."))}
                              onBlur={() => { if (timer.current) clearTimeout(timer.current); void flush(); }}
                            />
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-bold tabular text-board bg-board/5">{r.avg === null ? "—" : r.avg.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-center bg-board/5">
                        {r.rank ? <span className={`chip ${r.rank === 1 ? "bg-amber text-board-2" : r.rank <= 3 ? "bg-amber/20 text-amber-2" : "bg-board/8 text-inkmut"}`}>{r.rank}</span> : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button className="p-1.5 rounded-lg hover:bg-board/10 text-board" title={t("reg.bulletin")} onClick={() => setBulletinFor(p.id)}>
                          <Icon name="fileText" size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center px-4 py-3 bg-board/8 border-t-2 border-board/15 text-sm">
            <span className="font-bold text-board">{pupils.length} {t("students")}</span>
            <span className="text-inkmut">{t("gr.classAvg")}: <b className="text-board tabular">{classAvg === null ? "—" : classAvg.toFixed(2) + "/20"}</b></span>
            <span className="text-inkmut">{t("gr.passRate")}: <b className="text-ok tabular">{passRate === null ? "—" : Math.round(passRate) + "%"}</b></span>
            <span className="text-inkmut ml-auto tabular text-xs">{enteredCount}/{pupils.length * subs.length} {t("gr.gradesOf")}</span>
            {classAvg !== null && <Badge tone={classAvg >= 10 ? "green" : "red"}>{mention(classAvg, locale)}</Badge>}
          </div>
        </div>
      )}

      <Confirm open={!!removeSub} onClose={() => setRemoveSub(null)} title={t("delete")} confirmLabel={t("delete")}
        message={removeSub ? t("gr.confirmRemoveSubject", { name: removeSub.name }) : ""}
        onConfirm={async () => { if (removeSub) { await act("subject.remove", { id: removeSub.id }); setRemoveSub(null); } }} />
      <BulletinModal studentId={bulletinFor} open={!!bulletinFor} onClose={() => setBulletinFor(null)} initialTerm={Number(term)} />
      {doc && <DocPreview open={!!doc} onClose={() => setDoc(null)} html={doc.html} filename={doc.filename} title={t("gr.exportSheet")} landscape />}
      <ClassCreateModal open={classModal} onClose={() => setClassModal(false)} defaultBlock={blockFilter !== "all" ? blockFilter : undefined} onCreated={(cid) => setClassId(cid)} />
    </div>
  );
}