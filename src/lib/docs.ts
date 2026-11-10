import {
  classLabel, money, fmtDate, ageFrom, schoolYear, computeResults, mention, ordinal,
  PLATFORM, type Locale,
} from "@/lib/core";
import type { TenantData, StudentRow, PaymentRow, ReceiptInfo, StaffRow } from "@/lib/types";

const esc = (s: string | number) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const GREEN = "#173F2F";
const AMBER = "#B97D1E";

function css(orientation: "portrait" | "landscape"): string {
  const w = orientation === "portrait" ? "210mm" : "297mm";
  const h = orientation === "portrait" ? "296mm" : "209mm";
  return `
  @page { size: A4 ${orientation}; margin: 0; }
  @page WordSection1 { size: ${orientation === "portrait" ? "595.3pt 841.9pt" : "841.9pt 595.3pt"}; margin: 1.0cm; mso-page-orientation: ${orientation}; }
  div.WordSection1 { page: WordSection1; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #e8e4d8; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1d241f; font-size: 10.5pt; }
  .sheet { width: ${w}; min-height: ${h}; padding: 11mm 12mm; margin: 0 auto; background: #fff; page-break-after: always; position: relative; }
  @media print { html, body { background: #fff; } .sheet { margin: 0; box-shadow: none; } }
  @media screen { .sheet { box-shadow: 0 2px 14px rgba(0,0,0,.18); margin: 8px auto; } }
  .doc-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double ${GREEN}; padding-bottom: 8px; margin-bottom: 12px; }
  .school { font-size: 15pt; font-weight: bold; color: ${GREEN}; letter-spacing: .3px; }
  .school small { display: block; font-size: 8.5pt; font-weight: normal; color: #5a6357; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title b { display: block; font-size: 12.5pt; color: ${GREEN}; text-transform: uppercase; letter-spacing: 1px; }
  .doc-title span { font-size: 9pt; color: ${AMBER}; font-style: italic; }
  .sub { font-size: 9.5pt; color: #47504a; margin: 6px 0 10px; }
  table.grid { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  table.grid th { background: ${GREEN}; color: #fff; padding: 5px 6px; text-align: left; font-size: 8.5pt; letter-spacing: .4px; border: 1px solid ${GREEN}; }
  table.grid td { border: 1px solid #b9bfae; padding: 4.5px 6px; }
  table.grid tr:nth-child(even) td { background: #f4f2e8; }
  .r { text-align: right; } .c { text-align: center; }
  .mono { font-family: 'Courier New', monospace; font-size: 9pt; }
  .totals { margin-top: 10px; display: flex; gap: 10px; }
  .totbox { border: 1.5px solid ${GREEN}; padding: 6px 12px; font-size: 10pt; }
  .totbox b { color: ${GREEN}; }
  .foot { position: absolute; bottom: 8mm; left: 12mm; right: 12mm; display: flex; justify-content: space-between; font-size: 8pt; color: #7d8478; border-top: 1px solid #cfd3c4; padding-top: 4px; }
  .signs { display: flex; justify-content: space-between; margin-top: 26px; font-size: 9.5pt; }
  .signs div { width: 30%; text-align: center; }
  .signs .line { border-top: 1px solid #444; margin-top: 46px; padding-top: 4px; }
  /* Receipts A6 x4 */
  .rgrid { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 139mm; gap: 0; }
  .receipt { border: 1.6px dashed #8b917f; margin: 2mm; padding: 6mm 6mm 4mm; position: relative; font-size: 9pt; overflow: hidden; }
  .receipt .rhead { text-align: center; border-bottom: 2px solid ${GREEN}; padding-bottom: 4px; margin-bottom: 6px; }
  .receipt .rhead b { color: ${GREEN}; font-size: 11pt; display: block; }
  .receipt .rhead span { font-size: 7.5pt; color: ${AMBER}; letter-spacing: 1.5px; text-transform: uppercase; }
  .receipt table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .receipt td { padding: 2.6px 2px; vertical-align: top; }
  .receipt td.k { color: #5a6357; width: 44%; font-size: 8.2pt; }
  .receipt .amount { background: ${GREEN}; color: #fff; text-align: center; padding: 5px; font-size: 12pt; font-weight: bold; margin: 6px 0 4px; }
  .receipt .rest { display: flex; justify-content: space-between; font-size: 8.5pt; padding: 3px 2px; border-bottom: 1px dotted #aab09d; }
  .receipt .sig { position: absolute; bottom: 5mm; right: 6mm; font-size: 7.5pt; color: #5a6357; text-align: center; }
  .receipt .sig i { display: block; width: 30mm; border-top: 1px solid #777; margin-top: 9mm; }
  .receipt .wm { position: absolute; bottom: 4mm; left: 6mm; font-size: 7pt; color: #9aa08e; }
  .stamp { position: absolute; top: 14mm; right: 8mm; width: 20mm; height: 20mm; border: 2px solid rgba(228,87,46,.55); border-radius: 50%; transform: rotate(-14deg); color: rgba(228,87,46,.75); font-size: 6.5pt; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; letter-spacing: .5px; }
  .bull-meta { display: flex; flex-wrap: wrap; gap: 4px 22px; font-size: 10pt; margin-bottom: 10px; }
  .bull-meta b { color: ${GREEN}; }
  .bull-sum { margin-top: 12px; display: flex; gap: 10px; }
  .bull-sum .b { flex: 1; border: 2px solid ${GREEN}; text-align: center; padding: 8px 4px; }
  .bull-sum .b em { display: block; font-style: normal; font-size: 8pt; color: #5a6357; text-transform: uppercase; letter-spacing: 1px; }
  .bull-sum .b strong { font-size: 16pt; color: ${GREEN}; }
  .bull-sum .b.gold { background: #FBF3DF; border-color: ${AMBER}; }
  .bull-sum .b.gold strong { color: ${AMBER}; }
  `;
}

function shell(title: string, body: string, orientation: "portrait" | "landscape"): string {
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css(orientation)}</style></head><body><div class="WordSection1">${body}</div></body></html>`;
}

function head(data: TenantData, titleFr: string, titleEn: string, locale: Locale, sub?: string): string {
  return `<div class="doc-head">
    <div class="school">${esc(data.tenant.name)}<small>${locale === "fr" ? "Année scolaire" : "Academic year"} ${schoolYear()} · Cameroun / Cameroon</small></div>
    <div class="doc-title"><b>${esc(locale === "fr" ? titleFr : titleEn)}</b><span>${esc(locale === "fr" ? titleEn : titleFr)}</span></div>
  </div>${sub ? `<div class="sub">${sub}</div>` : ""}`;
}

function foot(locale: Locale): string {
  return `<div class="foot"><span>${esc(PLATFORM.brand)} · ${locale === "fr" ? "Édité le" : "Printed on"} ${fmtDate(new Date(), locale)}</span><span>${locale === "fr" ? "Document officiel de l'établissement" : "Official school document"}</span></div>`;
}

const methodLabel = (m: string, l: Locale) =>
  m === "cash" ? (l === "fr" ? "Espèces" : "Cash") : m === "orange" ? "Orange Money" : "MTN Mobile Money";

/* ── Student list (A4 portrait) ────────────────────────────── */
export function studentsHTML(data: TenantData, rows: StudentRow[], locale: Locale, scopeLabel?: string): string {
  const L = (fr: string, en: string) => (locale === "fr" ? fr : en);
  const body = rows.map((s, i) => {
    const cls = data.classes.find((c) => c.id === s.classId);
    const paid = s.paid1 + s.paid2;
    return `<tr>
      <td class="c">${i + 1}</td><td class="mono">${esc(s.matricule)}</td>
      <td><b>${esc(s.lastName.toUpperCase())}</b> ${esc(s.firstName)}</td>
      <td class="c">${s.sex}</td><td class="c">${ageFrom(s.birthDate)}</td>
      <td>${esc(cls ? classLabel(cls, locale) : "—")}</td>
      <td class="r">${money(paid)}</td><td class="r">${money(s.tuitionTotal - paid)}</td><td class="r"><b>${money(s.tuitionTotal)}</b></td>
    </tr>`;
  }).join("");
  const tp = rows.reduce((a, s) => a + s.paid1 + s.paid2, 0);
  const tt = rows.reduce((a, s) => a + s.tuitionTotal, 0);
  return shell("Liste", `<div class="sheet">${head(data, "Liste des élèves", "Student list", locale, scopeLabel ? esc(scopeLabel) + " · " : "")}
    <table class="grid"><thead><tr>
      <th>N°</th><th>${L("Matricule", "Student ID")}</th><th>${L("Nom & Prénom", "Full name")}</th><th>${L("Sexe", "Sex")}</th><th>${L("Âge", "Age")}</th><th>${L("Classe", "Class")}</th><th>${L("Payé", "Paid")}</th><th>${L("Reste", "Balance")}</th><th>${L("Total", "Total")}</th>
    </tr></thead><tbody>${body}</tbody></table>
    <div class="totals"><div class="totbox">${L("Effectif", "Enrollment")}: <b>${rows.length}</b></div>
    <div class="totbox">${L("Encaissé", "Collected")}: <b>${money(tp)}</b></div>
    <div class="totbox">${L("Reste à verser", "Outstanding")}: <b>${money(tt - tp)}</b></div></div>${foot(locale)}</div>`, "portrait");
}

/* ── Receipts (A6 ×4 per A4 portrait) ──────────────────────── */
export function receiptFromPayment(data: TenantData, p: PaymentRow, locale: Locale): ReceiptInfo | null {
  const s = data.students.find((x) => x.id === p.studentId);
  if (!s) return null;
  const cls = data.classes.find((c) => c.id === s.classId);
  const paid = s.paid1 + s.paid2;
  return {
    no: p.receiptNo, date: p.paidAt, studentName: `${s.lastName.toUpperCase()} ${s.firstName}`,
    matricule: s.matricule, className: cls ? classLabel(cls, locale) : "—",
    tranche: p.tranche, amount: p.amount, method: methodLabel(p.method, locale),
    total: s.tuitionTotal, paid, rest: s.tuitionTotal - paid,
  };
}

export function receiptForStudent(data: TenantData, s: StudentRow, locale: Locale): ReceiptInfo {
  const cls = data.classes.find((c) => c.id === s.classId);
  const pays = data.payments.filter((p) => p.studentId === s.id);
  const last = pays[0];
  const paid = s.paid1 + s.paid2;
  return {
    no: last?.receiptNo ?? `MAT/${s.matricule}`, date: last?.paidAt ?? s.enrolledAt,
    studentName: `${s.lastName.toUpperCase()} ${s.firstName}`, matricule: s.matricule,
    className: cls ? classLabel(cls, locale) : "—", tranche: s.paid2 > 0 ? 2 : 1,
    amount: paid, method: last ? methodLabel(last.method, locale) : "—",
    total: s.tuitionTotal, paid, rest: s.tuitionTotal - paid,
  };
}

function receiptCard(data: TenantData, r: ReceiptInfo, locale: Locale): string {
  const L = (fr: string, en: string) => (locale === "fr" ? fr : en);
  return `<div class="receipt">
    <div class="stamp">${r.rest <= 0 ? (L("SOLDÉ", "PAID")) : (L("REÇU", "RECEIPT"))}</div>
    <div class="rhead"><b>${esc(data.tenant.name)}</b><span>${L("Reçu de paiement", "Payment receipt")} · ${L("Paiement", "Payment receipt")}</span></div>
    <table>
      <tr><td class="k">${L("N° reçu", "Receipt no.")}</td><td class="mono"><b>${esc(r.no)}</b></td></tr>
      <tr><td class="k">${L("Date", "Date")}</td><td>${fmtDate(r.date, locale)}</td></tr>
      <tr><td class="k">${L("Élève", "Student")}</td><td><b>${esc(r.studentName)}</b></td></tr>
      <tr><td class="k">${L("Matricule", "Student ID")}</td><td class="mono">${esc(r.matricule)}</td></tr>
      <tr><td class="k">${L("Classe", "Class")}</td><td>${esc(r.className)}</td></tr>
      <tr><td class="k">${L("Tranche", "Installment")} · ${L("Mode", "Method")}</td><td>${r.tranche === 1 ? L("1ère tranche", "1st installment") : L("2ème tranche", "2nd installment")} · ${esc(r.method)}</td></tr>
    </table>
    <div class="amount">${money(r.amount)}</div>
    <div class="rest"><span>${L("Scolarité totale", "Total tuition")}</span><b>${money(r.total)}</b></div>
    <div class="rest"><span>${L("Total payé", "Total paid")}</span><b>${money(r.paid)}</b></div>
    <div class="rest"><span>${L("Reste à verser", "Balance due")}</span><b style="color:${r.rest > 0 ? "#B3402A" : "#2E7D4F"}">${money(r.rest)}</b></div>
    <div class="sig"><i></i>${L("Signature & cachet", "Signature & stamp")}</div>
    <div class="wm">${esc(PLATFORM.brand)} · ${schoolYear()}</div>
  </div>`;
}

export function receiptsHTML(data: TenantData, receipts: ReceiptInfo[], locale: Locale): string {
  const chunks: ReceiptInfo[][] = [];
  for (let i = 0; i < receipts.length; i += 4) chunks.push(receipts.slice(i, i + 4));
  if (chunks.length === 0) chunks.push([]);
  const sheets = chunks.map((ch) => `<div class="sheet" style="padding:3mm"><div class="rgrid">${ch.map((r) => receiptCard(data, r, locale)).join("")}</div></div>`).join("");
  return shell("Reçus", sheets, "portrait");
}

/* ── Report card (A4 portrait) ─────────────────────────────── */
export function bulletinHTML(data: TenantData, studentId: string, term: number, locale: Locale): string {
  const L = (fr: string, en: string) => (locale === "fr" ? fr : en);
  const s = data.students.find((x) => x.id === studentId)!;
  const cls = data.classes.find((c) => c.id === s.classId)!;
  const subs = data.subjects.filter((x) => x.classId === s.classId).sort((a, b) => a.position - b.position);
  const classmates = data.students.filter((x) => x.classId === s.classId);
  const results = computeResults(classmates.map((x) => x.id), subs, data.grades, term);
  const mine = results.get(s.id)!;
  const gmap = new Map(data.grades.filter((g) => g.term === term && g.studentId === s.id).map((g) => [g.subjectId, g.value]));
  const appr = (v: number | undefined) => {
    if (v === undefined) return "—";
    return v >= 16 ? (L("Excellent", "Excellent")) : v >= 14 ? (L("Très bien", "Very good")) : v >= 12 ? (L("Bien", "Good")) : v >= 10 ? (L("Assez bien", "Fair")) : v >= 8 ? (L("Passable", "Passable")) : (L("Insuffisant", "Weak"));
  };
  const rows = subs.map((sub) => {
    const v = gmap.get(sub.id);
    return `<tr><td>${esc(locale === "fr" ? sub.nameFr : sub.nameEn)}</td>
      <td class="c"><b>${v === undefined ? "—" : v.toFixed(2)}</b></td><td class="c">${sub.coefficient}</td>
      <td class="c">${v === undefined ? "—" : (v * sub.coefficient).toFixed(2)}</td><td>${appr(v)}</td></tr>`;
  }).join("");
  const termLabel = locale === "fr" ? `${term === 1 ? "1er" : term + "ème"} trimestre` : `${ordinal(term, "en")} term`;
  return shell("Bulletin", `<div class="sheet">
    ${head(data, "Bulletin de notes", "Report card", locale, `${termLabel} · ${L("Année scolaire", "Academic year")} ${schoolYear()}`)}
    <div class="bull-meta">
      <span>${L("Élève", "Student")}: <b>${esc(s.lastName.toUpperCase())} ${esc(s.firstName)}</b></span>
      <span>${L("Matricule", "ID")}: <b class="mono">${esc(s.matricule)}</b></span>
      <span>${L("Classe", "Class")}: <b>${esc(classLabel(cls, locale))}</b></span>
      <span>${L("Sexe", "Sex")}: <b>${s.sex}</b></span>
      <span>${L("Âge", "Age")}: <b>${ageFrom(s.birthDate)} ${L("ans", "yrs")}</b></span>
      <span>${L("Effectif", "Class size")}: <b>${classmates.length}</b></span>
    </div>
    <table class="grid"><thead><tr><th>${L("Matière", "Subject")}</th><th class="c">${L("Note /20", "Grade /20")}</th><th class="c">${L("Coef.", "Coef.")}</th><th class="c">${L("Note × Coef", "Weighted")}</th><th>${L("Appréciation", "Comment")}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="c">—</td></tr>`}</tbody></table>
    <div class="bull-sum">
      <div class="b"><em>${L("Total points", "Total points")}</em><strong>${mine.total.toFixed(1)}</strong> / ${mine.coefSum * 20}</div>
      <div class="b"><em>${L("Moyenne générale", "Overall average")}</em><strong>${mine.avg === null ? "—" : mine.avg.toFixed(2)}</strong> / 20</div>
      <div class="b gold"><em>${L("Rang", "Rank")}</em><strong>${mine.rank ? ordinal(mine.rank, locale) : "—"}</strong> / ${classmates.length}</div>
      <div class="b"><em>${L("Mention", "Honors")}</em><strong style="font-size:11pt">${mention(mine.avg, locale)}</strong></div>
    </div>
    <div class="signs"><div><div class="line">${L("L'Enseignant(e)", "Teacher")}</div></div><div><div class="line">${L("Le Parent / Tuteur", "Parent / Guardian")}</div></div><div><div class="line">${L("Le Directeur / The Director", "The Director")}</div></div></div>
    ${foot(locale)}
  </div>`, "portrait");
}

/* ── Cash register (A4 landscape) ──────────────────────────── */
export function cashHTML(data: TenantData, rows: PaymentRow[], locale: Locale): string {
  const L = (fr: string, en: string) => (locale === "fr" ? fr : en);
  const body = rows.map((p, i) => {
    const s = data.students.find((x) => x.id === p.studentId);
    const cls = s && data.classes.find((c) => c.id === s.classId);
    return `<tr><td class="c">${i + 1}</td><td>${fmtDate(p.paidAt, locale)}</td><td class="mono">${esc(p.receiptNo)}</td>
      <td class="mono">${esc(s?.matricule ?? "—")}</td><td><b>${esc(s ? s.lastName.toUpperCase() + " " + s.firstName : "—")}</b></td>
      <td>${esc(cls ? classLabel(cls, locale) : "—")}</td><td class="c">${p.tranche === 1 ? "T1" : "T2"}</td>
      <td>${esc(methodLabel(p.method, locale))}</td><td class="r"><b>${money(p.amount)}</b></td></tr>`;
  }).join("");
  const total = rows.reduce((a, p) => a + p.amount, 0);
  return shell("Caisse", `<div class="sheet">
    ${head(data, "Registre de caisse", "Cash register", locale, `${rows.length} ${L("opérations", "transactions")}`)}
    <table class="grid"><thead><tr><th>N°</th><th>${L("Date", "Date")}</th><th>${L("N° reçu", "Receipt")}</th><th>${L("Matricule", "ID")}</th><th>${L("Élève", "Student")}</th><th>${L("Classe", "Class")}</th><th>${L("Tranche", "Inst.")}</th><th>${L("Mode", "Method")}</th><th>${L("Montant", "Amount")}</th></tr></thead>
    <tbody>${body}</tbody></table>
    <div class="totals"><div class="totbox">${L("Solde total encaissé", "Total collected")}: <b>${money(total)}</b></div></div>
    ${foot(locale)}
  </div>`, "landscape");
}

/* ── Grade sheet (A4 landscape) ────────────────────────────── */
export function gradesHTML(data: TenantData, classId: string, term: number, locale: Locale): string {
  const L = (fr: string, en: string) => (locale === "fr" ? fr : en);
  const cls = data.classes.find((c) => c.id === classId)!;
  const subs = data.subjects.filter((x) => x.classId === classId).sort((a, b) => a.position - b.position);
  const rows = data.students.filter((s) => s.classId === classId).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const results = computeResults(rows.map((s) => s.id), subs, data.grades, term);
  const gmap = new Map(data.grades.filter((g) => g.term === term).map((g) => [g.studentId + "|" + g.subjectId, g.value]));
  const body = rows.map((s, i) => {
    const r = results.get(s.id)!;
    return `<tr><td class="c">${i + 1}</td><td class="mono">${esc(s.matricule)}</td>
      <td><b>${esc(s.lastName.toUpperCase())}</b> ${esc(s.firstName)}</td><td class="c">${s.sex}</td>
      ${subs.map((sub) => `<td class="c">${gmap.get(s.id + "|" + sub.id)?.toFixed(2) ?? ""}</td>`).join("")}
      <td class="c"><b>${r.avg === null ? "—" : r.avg.toFixed(2)}</b></td><td class="c">${r.rank || "—"}</td></tr>`;
  }).join("");
  const termLabel = locale === "fr" ? `${term === 1 ? "1er" : term + "ème"} trimestre` : `${ordinal(term, "en")} term`;
  return shell("Notes", `<div class="sheet">
    ${head(data, "Feuille de notes", "Grade sheet", locale, `${esc(classLabel(cls, locale))} · ${termLabel} · ${rows.length} ${L("élèves", "students")}`)}
    <table class="grid"><thead><tr><th>N°</th><th>${L("Matricule", "ID")}</th><th>${L("Nom & Prénom", "Full name")}</th><th>${L("Sexe", "Sex")}</th>
    ${subs.map((s) => `<th class="c">${esc(locale === "fr" ? s.nameFr : s.nameEn)}<br>(${L("coéf.", "coef.")} ${s.coefficient})</th>`).join("")}
    <th class="c">${L("Moy.", "Avg.")}</th><th class="c">${L("Rang", "Rank")}</th></tr></thead><tbody>${body}</tbody></table>
    ${foot(locale)}
  </div>`, "landscape");
}

/* ── Output helpers ────────────────────────────────────────── */
export function printHTML(html: string): void {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(frame);
  frame.srcdoc = html;
  frame.onload = () => {
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        const w = window.open("", "_blank");
        if (w) {
          w.document.open();
          w.document.write(html);
          w.document.close();
          w.focus();
          w.print();
        }
      }
      setTimeout(() => frame.remove(), 60000);
    }, 150);
  };
}

export function downloadWord(html: string, filename: string): void {
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : filename + ".doc";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ── WhatsApp messages ─────────────────────────────────────── */
export function enrollMessage(data: TenantData, s: StudentRow, locale: Locale): string {
  const cls = data.classes.find((c) => c.id === s.classId);
  const paid = s.paid1 + s.paid2;
  const rec = data.payments.find((p) => p.studentId === s.id);
  if (locale === "fr") {
    return `🎓 *${data.tenant.name}*\n✅ Confirmation d'inscription\n\n👤 Élève : ${s.lastName.toUpperCase()} ${s.firstName}\n🔖 Matricule : ${s.matricule}\n🏫 Classe : ${cls ? classLabel(cls, "fr") : "—"}\n📅 Date : ${fmtDate(s.enrolledAt, "fr")}\n\n💰 Scolarité totale : ${money(s.tuitionTotal)}\n• 1ère tranche : ${money(s.paid1)}\n• 2ème tranche : ${money(s.paid2)}\n✅ Total payé : ${money(paid)}\n⏳ Reste à verser : ${money(s.tuitionTotal - paid)}\n\n🧾 Reçu ${rec ? rec.receiptNo : "(à venir)"} joint à ce message.\nMerci de votre confiance ! — ${PLATFORM.brand}`;
  }
  return `🎓 *${data.tenant.name}*\n✅ Enrollment confirmation\n\n👤 Student: ${s.lastName.toUpperCase()} ${s.firstName}\n🔖 Student ID: ${s.matricule}\n🏫 Class: ${cls ? classLabel(cls, "en") : "—"}\n📅 Date: ${fmtDate(s.enrolledAt, "en")}\n\n💰 Total tuition: ${money(s.tuitionTotal)}\n• 1st installment: ${money(s.paid1)}\n• 2nd installment: ${money(s.paid2)}\n✅ Total paid: ${money(paid)}\n⏳ Balance due: ${money(s.tuitionTotal - paid)}\n\n🧾 Receipt ${rec ? rec.receiptNo : "(pending)"} attached to this message.\nThank you for your trust! — ${PLATFORM.brand}`;
}

export function reminderMessage(data: TenantData, s: StudentRow, locale: Locale): string {
  const rest = s.tuitionTotal - s.paid1 - s.paid2;
  const cls = data.classes.find((c) => c.id === s.classId);
  return locale === "fr"
    ? `🔔 *${data.tenant.name}*\nRappel de scolarité — ${s.lastName.toUpperCase()} ${s.firstName} (${s.matricule}), ${cls ? classLabel(cls, "fr") : ""}.\n\n⏳ Reste à verser : *${money(rest)}* sur ${money(s.tuitionTotal)}.\nMerci de régulariser auprès de la Direction. 🙏`
    : `🔔 *${data.tenant.name}*\nTuition reminder — ${s.lastName.toUpperCase()} ${s.firstName} (${s.matricule}), ${cls ? classLabel(cls, "en") : ""}.\n\n⏳ Balance due: *${money(rest)}* of ${money(s.tuitionTotal)}.\nPlease settle with the Head Office. 🙏`;
}

export function bulletinMessage(data: TenantData, s: StudentRow, term: number, locale: Locale): string {
  const cls = data.classes.find((c) => c.id === s.classId)!;
  const subs = data.subjects.filter((x) => x.classId === s.classId);
  const mates = data.students.filter((x) => x.classId === s.classId);
  const r = computeResults(mates.map((x) => x.id), subs, data.grades, term).get(s.id)!;
  return locale === "fr"
    ? `📚 *${data.tenant.name}* — Bulletin T${term}\n👤 ${s.lastName.toUpperCase()} ${s.firstName} (${classLabel(cls, "fr")})\n📊 Moyenne : ${r.avg === null ? "—" : r.avg.toFixed(2) + "/20"}\n🏅 Rang : ${r.rank ? ordinal(r.rank, "fr") : "—"} / ${mates.length}\n🎖 Mention : ${mention(r.avg, "fr")}\n\nLe bulletin détaillé est disponible à l'école.`
    : `📚 *${data.tenant.name}* — Term ${term} report\n👤 ${s.lastName.toUpperCase()} ${s.firstName} (${classLabel(cls, "en")})\n📊 Average: ${r.avg === null ? "—" : r.avg.toFixed(2) + "/20"}\n🏅 Rank: ${r.rank ? ordinal(r.rank, "en") : "—"} / ${mates.length}\n🎖 Honors: ${mention(r.avg, "en")}\n\nThe detailed report card is available at school.`;
}

/* ── Staff directory (A4 portrait) ─────────────────────────── */
export function staffHTML(data: TenantData, rows: StaffRow[], locale: Locale): string {
  const L = (fr: string, en: string) => (locale === "fr" ? fr : en);
  const roleName = (r: string) => {
    const map: Record<string, [string, string]> = {
      director: ["Directeur / Principal", "Director / Principal"],
      teacher: ["Enseignant(e)", "Teacher"],
      bursar: ["Économe / Caisse", "Bursar / Cashier"],
      secretary: ["Secrétaire", "Secretary"],
      supervisor: ["Surveillant(e)", "Supervisor"],
    };
    return (map[r] ?? [r, r])[locale === "fr" ? 0 : 1];
  };
  const body = rows.map((m, i) => `<tr>
    <td class="c">${i + 1}</td>
    <td><b>${esc(m.fullName)}</b></td>
    <td>${esc(roleName(m.role))}</td>
    <td>${esc(m.block === "all" ? L("Complexe", "All blocks") : m.block)}</td>
    <td class="mono">${esc(m.phone || "—")}</td>
    <td class="r">${money(m.salary)}</td>
    <td class="c">${m.status === "active" ? L("Actif", "Active") : L("En congé", "On leave")}</td>
  </tr>`).join("");
  const payroll = rows.reduce((a, m) => a + (m.salary || 0), 0);
  return shell("Personnel", `<div class="sheet">${head(data, "Annuaire du personnel", "Staff directory", locale, `${rows.length} ${L("membres", "members")}`)}
    <table class="grid"><thead><tr>
      <th>N°</th><th>${L("Nom complet", "Full name")}</th><th>${L("Fonction", "Role")}</th><th>${L("Bloc", "Block")}</th><th>${L("Téléphone", "Phone")}</th><th>${L("Salaire", "Salary")}</th><th>${L("Statut", "Status")}</th>
    </tr></thead><tbody>${body}</tbody></table>
    <div class="totals"><div class="totbox">${L("Effectif personnel", "Total staff")}: <b>${rows.length}</b></div>
    <div class="totbox">${L("Masse salariale", "Monthly payroll")}: <b>${money(payroll)}</b></div></div>
    ${foot(locale)}</div>`, "portrait");
}

/* ── Archives list (A4 portrait) ───────────────────────────── */
export function archivesHTML(data: TenantData, rows: StudentRow[], locale: Locale): string {
  const L = (fr: string, en: string) => (locale === "fr" ? fr : en);
  const body = rows.map((s, i) => {
    const cls = data.classes.find((c) => c.id === s.classId);
    const paid = s.paid1 + s.paid2;
    return `<tr>
      <td class="c">${i + 1}</td><td class="mono">${esc(s.matricule)}</td>
      <td><b>${esc(s.lastName.toUpperCase())}</b> ${esc(s.firstName)}</td>
      <td>${esc(cls ? classLabel(cls, locale) : "—")}</td>
      <td>${esc(s.archiveReason || "—")}</td>
      <td class="r">${money(paid)}</td><td class="r">${money(s.tuitionTotal)}</td>
    </tr>`;
  }).join("");
  return shell("Archives", `<div class="sheet">${head(data, "Archives des élèves", "Archived students", locale, `${rows.length} ${L("dossiers", "records")}`)}
    <table class="grid"><thead><tr>
      <th>N°</th><th>${L("Matricule", "ID")}</th><th>${L("Nom & Prénom", "Full name")}</th><th>${L("Classe", "Class")}</th><th>${L("Motif", "Reason")}</th><th>${L("Payé", "Paid")}</th><th>${L("Scolarité", "Tuition")}</th>
    </tr></thead><tbody>${body}</tbody></table>${foot(locale)}</div>`, "portrait");
}