import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { createPayment } from "@/actions/payments";
import { PaymentForm } from "@/components/PaymentForm";
import { EmptyState, Flash, PageHeader, StatCard, WhatsAppLink } from "@/components/ui";
import { getSchoolById, listPayments, listStudents } from "@/lib/data";
import { buildReceiptMessage, formatDate, formatMoney, fullName, normalizePhone, whatsappUrl } from "@/lib/utils";

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string; nouveau?: string }>;
}) {
  const { schoolId: raw } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  const { school } = await requireSchoolPage(schoolId);
  const [rows, students] = await Promise.all([listPayments({ schoolId }), listStudents({ schoolId, order: "nom" })]);
  const base = `/ecoles/${schoolId}`;
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.currency, (totals.get(r.currency) ?? 0) + Number(r.amount));

  return (
    <>
      <PageHeader
        eyebrow="Caisse"
        title="Paiements & reçus"
        subtitle="Chaque paiement génère un reçu au format A6 dont le lien est joint au message WhatsApp envoyé au parent."
        actions={
          <a href="#nouveau-paiement" className="btn-school">
            🧾 Nouveau paiement
          </a>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="🧾" tone="emerald" label="Reçus émis" value={rows.length} />
        {[...totals.entries()].map(([currency, total]) => (
          <StatCard key={currency} icon="💰" tone="sky" label={`Total encaissé (${currency})`} value={formatMoney(total, currency)} />
        ))}
      </div>

      <details id="nouveau-paiement" open={sp.nouveau === "1" || Boolean(sp.erreur)} className="card my-8 group">
        <summary className="cursor-pointer select-none text-base font-bold text-slate-900">
          🧾 Enregistrer un paiement
          <span className="ml-2 text-xs font-normal text-slate-500 group-open:hidden">— cliquer pour ouvrir le formulaire</span>
        </summary>
        <div className="mt-5">
          {students.length === 0 ? (
            <p className="text-sm text-slate-500">
              Enregistrez d&apos;abord un élève pour pouvoir encaisser un paiement.{" "}
              <Link href={`${base}/eleves/nouveau`} className="font-semibold text-emerald-700 hover:underline">
                Nouvel élève →
              </Link>
            </p>
          ) : (
            <PaymentForm
              action={createPayment.bind(null, schoolId)}
              students={students.map((s) => ({
                id: s.id,
                label: `${fullName(s)} · ${s.officialNumber} · ${s.className ?? "Sans classe"}`,
                parentName: s.parentName,
              }))}
              redirectTo={`${base}/paiements?nouveau=1`}
            />
          )}
        </div>
      </details>

      {rows.length === 0 ? (
        <EmptyState icon="🧾" title="Aucun paiement enregistré" text="Les reçus apparaîtront ici avec leurs actions d'impression et d'envoi WhatsApp." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="tbl">
            <thead>
              <tr>
                <th>Reçu N°</th>
                <th>Élève</th>
                <th>Motif</th>
                <th>Montant</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const studentName = [p.studentLastName, p.studentMiddleName, p.studentFirstName].filter(Boolean).join(" ");
                const phone = normalizePhone(p.parentPhone, school.countryCode);
                const message = buildReceiptMessage({
                  schoolName: school.name,
                  parentName: p.parentName,
                  studentName,
                  officialNumber: p.officialNumber,
                  className: p.className,
                  motif: p.motif,
                  period: p.period,
                  amount: p.amount,
                  currency: p.currency,
                  receiptNumber: p.receiptNumber,
                  paidAt: p.paidAt,
                  token: p.token,
                });
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td>
                      <Link href={`${base}/paiements/${p.id}`} className="font-mono text-xs font-bold text-indigo-700 hover:underline">
                        {p.receiptNumber}
                      </Link>
                    </td>
                    <td>
                      <Link href={`${base}/eleves/${p.studentId}`} className="font-semibold text-slate-900 hover:underline">
                        {studentName}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {p.officialNumber} · {p.className ?? "—"}
                      </div>
                    </td>
                    <td>
                      {p.motif}
                      {p.period && <div className="text-xs text-slate-500">{p.period}</div>}
                      <div className="text-xs text-slate-400">{p.method}</div>
                    </td>
                    <td className="font-display font-bold text-board">{formatMoney(p.amount, p.currency)}</td>
                    <td className="whitespace-nowrap">{formatDate(p.paidAt, "short")}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`${base}/paiements/${p.id}`} className="btn-secondary btn-sm">
                          🖨️ Reçu A6
                        </Link>
                        <WhatsAppLink href={whatsappUrl(phone, message)} className="btn-whatsapp btn-sm">
                          💬 WhatsApp
                        </WhatsAppLink>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
