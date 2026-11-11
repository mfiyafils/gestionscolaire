import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/client";
import { Receipt } from "@/components/Receipt";
import { APP_NAME } from "@/lib/constants";
import { getPaymentFull } from "@/lib/data";
import { formatMoney, fullName } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getPaymentFull({ token });
  if (!data) return { title: `Reçu introuvable — ${APP_NAME}` };
  return {
    title: `Reçu ${data.payment.receiptNumber} — ${data.school.name}`,
    description: `Reçu de paiement de ${formatMoney(data.payment.amount, data.payment.currency)} pour ${fullName(data.student)} (${data.student.officialNumber}).`,
  };
}

/** Reçu public (lien envoyé au parent par WhatsApp) — format A6 imprimable. */
export default async function PublicReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPaymentFull({ token });
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-slate-200 px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A6 portrait; margin: 0; }`}</style>
      <div className="no-print mx-auto mb-4 flex w-[105mm] max-w-full flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reçu officiel · format A6</p>
          <p className="text-sm font-bold text-slate-800">{data.school.name}</p>
        </div>
        <PrintButton className="btn-primary btn-sm">🖨️ Imprimer / PDF</PrintButton>
      </div>

      <Receipt payment={data.payment} student={data.student} school={data.school} className={data.className} />

      <p className="no-print mx-auto mt-6 max-w-md text-center text-xs text-slate-500">
        Ce reçu est émis par <b>{data.school.name}</b> via{" "}
        <Link href="/" className="font-semibold text-slate-700 hover:underline">
          {APP_NAME}
        </Link>
        . Pour toute question, contactez l&apos;école{data.school.phone ? ` au ${data.school.phone}` : ""}.
      </p>
    </main>
  );
}
