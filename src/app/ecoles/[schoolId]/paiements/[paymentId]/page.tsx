import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { deletePayment } from "@/actions/payments";
import { ConfirmButton, CopyButton, PrintButton } from "@/components/client";
import { Receipt } from "@/components/Receipt";
import { BackLink, Flash, PageHeader, WhatsAppLink } from "@/components/ui";
import { getPaymentFull, getSchoolById } from "@/lib/data";
import { buildReceiptMessage, fullName, normalizePhone, receiptUrl, whatsappUrl } from "@/lib/utils";

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string; paymentId: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { schoolId: raw, paymentId: rawPayment } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  const { school } = await requireSchoolPage(schoolId);
  const data = await getPaymentFull({ id: Number(rawPayment), schoolId });
  if (!data) notFound();
  const { payment, student, className } = data;
  const base = `/ecoles/${schoolId}`;
  const phone = normalizePhone(student.parentPhone, school.countryCode);
  const link = receiptUrl(payment.token);
  const message = buildReceiptMessage({
    schoolName: school.name,
    parentName: student.parentName,
    studentName: fullName(student),
    officialNumber: student.officialNumber,
    className,
    motif: payment.motif,
    period: payment.period,
    amount: payment.amount,
    currency: payment.currency,
    receiptNumber: payment.receiptNumber,
    paidAt: payment.paidAt,
    token: payment.token,
  });

  return (
    <>
      <style>{`@page { size: A6 portrait; margin: 0; }`}</style>
      <div className="no-print">
      <BackLink href={`${base}/paiements`}>Paiements & reçus</BackLink>
      <PageHeader
        eyebrow="Reçu de paiement · format A6"
        title={payment.receiptNumber}
        subtitle={
          <>
            Élève <b>{fullName(student)}</b> · N° officiel <span className="font-mono">{student.officialNumber}</span>
          </>
        }
        actions={
          <>
            <PrintButton className="btn-primary">🖨️ Imprimer / PDF (A6)</PrintButton>
            <WhatsAppLink href={whatsappUrl(phone, message)}>💬 Envoyer au parent par WhatsApp</WhatsAppLink>
          </>
        }
      />
      </div>
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
        <div className="overflow-x-auto">
          <Receipt payment={payment} student={student} school={school} className={className} />
        </div>

        <div className="space-y-6 no-print">
          <section className="card">
            <h2 className="font-display font-bold text-board">Envoi au parent</h2>
            <p className="mt-1 text-sm text-slate-600">
              {phone ? (
                <>
                  Le message WhatsApp sera envoyé au <b>+{phone}</b> ({student.parentName ?? "parent"}) avec le lien du reçu A6 joint.
                </>
              ) : (
                <>
                  Aucun numéro de téléphone n&apos;est enregistré pour le parent : WhatsApp s&apos;ouvrira pour choisir le contact manuellement.{" "}
                  <Link href={`${base}/eleves/${student.id}`} className="font-semibold text-emerald-700 hover:underline">
                    Ajouter le numéro
                  </Link>
                </>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <WhatsAppLink href={whatsappUrl(phone, message)}>💬 Envoyer par WhatsApp</WhatsAppLink>
              <CopyButton text={link} />
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                🔗 Ouvrir le lien public
              </a>
            </div>
            <div className="mt-4">
              <p className="label">Lien du reçu (format A6)</p>
              <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">{link}</p>
            </div>
            <div className="mt-4">
              <p className="label">Aperçu du message</p>
              <pre className="whitespace-pre-wrap rounded-lg bg-[#e7ffdb] px-4 py-3 text-xs text-slate-800 ring-1 ring-emerald-200">{message}</pre>
            </div>
          </section>

          <section className="card">
            <h2 className="font-display font-bold text-board">Raccourcis</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`${base}/eleves/${student.id}`} className="btn-secondary btn-sm">
                Fiche de l&apos;élève
              </Link>
              <Link href={`${base}/paiements?nouveau=1`} className="btn-secondary btn-sm">
                Nouveau paiement
              </Link>
              <Link href={`${base}/numeros-officiels`} className="btn-secondary btn-sm">
                Numéros officiels
              </Link>
            </div>
            <form action={deletePayment.bind(null, schoolId, payment.id)} className="mt-5 border-t border-slate-100 pt-4">
              <input type="hidden" name="redirectTo" value={`${base}/paiements`} />
              <ConfirmButton message={`Annuler le paiement ${payment.receiptNumber} ? Le reçu ne sera plus accessible.`} className="btn-danger btn-sm">
                🗑️ Annuler ce paiement
              </ConfirmButton>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
