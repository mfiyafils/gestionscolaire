import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { EmptyState, LevelBadge, PageHeader, WhatsAppLink } from "@/components/ui";
import { listPayments } from "@/lib/data";
import { buildReceiptMessage, formatDate, formatMoney, normalizePhone, whatsappUrl } from "@/lib/utils";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const rows = await listPayments({ limit: 300 });
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.currency, (totals.get(r.currency) ?? 0) + Number(r.amount));

  return (
    <>
      <PageHeader
        eyebrow="Vue Direction Générale"
        title="Paiements & reçus"
        subtitle={
          rows.length
            ? `${rows.length} reçu(s) · ${[...totals.entries()].map(([c, t]) => formatMoney(t, c)).join(" + ")}`
            : "Aucun paiement enregistré pour le moment."
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon="🧾" title="Aucun reçu émis" text="Les paiements enregistrés par les écoles apparaissent ici avec leur reçu A6." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="tbl">
            <thead>
              <tr>
                <th>Reçu</th>
                <th>École</th>
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
                const phone = normalizePhone(p.parentPhone, p.schoolCountryCode);
                const message = buildReceiptMessage({
                  schoolName: p.schoolName,
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
                    <td className="font-mono text-xs font-bold text-indigo-700">{p.receiptNumber}</td>
                    <td>
                      <Link href={`/ecoles/${p.schoolId}`} className="hover:underline">
                        {p.schoolName}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/ecoles/${p.schoolId}/eleves/${p.studentId}`} className="font-semibold text-slate-900 hover:underline">
                        {studentName}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {p.officialNumber} · {p.className ?? "—"}
                      </div>
                      <div className="mt-1">
                        <LevelBadge level={p.level} />
                      </div>
                    </td>
                    <td>
                      {p.motif}
                      {p.period && <div className="text-xs text-slate-500">{p.period}</div>}
                    </td>
                    <td className="font-display font-bold text-board">{formatMoney(p.amount, p.currency)}</td>
                    <td className="whitespace-nowrap">{formatDate(p.paidAt, "short")}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/ecoles/${p.schoolId}/paiements/${p.id}`} className="btn-secondary btn-sm">
                          Reçu A6
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
