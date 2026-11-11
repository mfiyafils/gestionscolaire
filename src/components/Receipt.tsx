import type { Payment, Student, Subscriber } from "@/db/schema";
import { APP_BRAND, APP_NAME, APP_URL, LEVEL_INFO } from "@/lib/constants";
import { amountInWords, formatDate, formatMoney, fullName, receiptUrl } from "@/lib/utils";

/** Reçu de paiement au format A6 (105 × 148 mm) — style Scolaria. */
export function Receipt({
  payment,
  student,
  school,
  className,
}: {
  payment: Payment;
  student: Student;
  school: Subscriber;
  className: string | null;
}) {
  return (
    <div
      className="receipt-sheet mx-auto flex w-[105mm] max-w-full flex-col bg-white text-ink shadow-xl ring-1 ring-line print:shadow-none print:ring-0"
      style={{ minHeight: "148mm", fontSize: "10.5px", lineHeight: 1.35 }}
    >
      <div className="h-[3mm] w-full" style={{ background: "linear-gradient(90deg,#0f3325 0 60%,#f0a52b 60%)" }} />
      <div className="flex flex-1 flex-col p-[6mm] pt-[4mm]">
        <header className="flex items-start justify-between gap-2 border-b-2 border-board pb-2">
          <div>
            <p className="font-display text-[13px] font-black uppercase leading-tight text-board">{school.name}</p>
            {school.address && <p className="text-[9px] text-inkmut">{school.address}</p>}
            <p className="text-[9px] text-inkmut">
              {school.phone ? `Tél. ${school.phone}` : null}
              {school.phone && school.email ? " · " : null}
              {school.email}
            </p>
          </div>
          <span className="stamp-badge mt-1 shrink-0 border-ok text-ok">Payé</span>
        </header>

        <div className="mt-2 flex items-center justify-between">
          <p className="font-display text-[13px] font-black uppercase tracking-wide text-board">Reçu de paiement</p>
          <p className="rounded-md border-[1.5px] border-board px-1.5 py-0.5 font-mono text-[10px] font-bold text-board">
            {payment.receiptNumber}
          </p>
        </div>
        <p className="text-[9px] text-inkmut">
          Date : <b className="text-ink">{formatDate(payment.paidAt)}</b> · Mode : {payment.method}
        </p>

        <dl className="ledger-divider mt-2 grid grid-cols-[30mm_1fr] gap-x-2 gap-y-1 pt-2">
          <dt className="text-inkmut">Reçu de</dt>
          <dd className="font-semibold">{payment.payerName || student.parentName || "—"}</dd>
          <dt className="text-inkmut">Pour l&apos;élève</dt>
          <dd className="font-semibold uppercase">{fullName(student)}</dd>
          <dt className="text-inkmut">N° officiel</dt>
          <dd className="font-mono font-bold text-board">{student.officialNumber}</dd>
          <dt className="text-inkmut">Classe</dt>
          <dd>
            {className ?? "—"} · {LEVEL_INFO[student.level].label}
          </dd>
          <dt className="text-inkmut">Motif</dt>
          <dd>
            {payment.motif}
            {payment.period ? ` — ${payment.period}` : ""}
          </dd>
          {payment.note && (
            <>
              <dt className="text-inkmut">Note</dt>
              <dd>{payment.note}</dd>
            </>
          )}
        </dl>

        <div className="chalkboard mt-3 rounded-lg px-3 py-2 text-cream">
          <p className="text-[8px] uppercase tracking-[0.2em] text-amber">Montant payé</p>
          <p className="font-display text-[19px] font-black leading-tight">{formatMoney(payment.amount, payment.currency)}</p>
        </div>
        <p className="mt-1.5 text-[9px] italic text-inkmut">
          Arrêté le présent reçu à la somme de : <b className="text-ink">{amountInWords(payment.amount, payment.currency)}</b>.
        </p>

        <div className="mt-auto grid grid-cols-2 gap-4 pt-5 text-[9px]">
          <div>
            <p className="text-inkmut">Le parent / payeur</p>
            <div className="mt-6 border-t border-dashed border-line" />
          </div>
          <div className="text-right">
            <p className="text-inkmut">Caissier(ère) · cachet de l&apos;école</p>
            <div className="mt-6 border-t border-dashed border-line" />
          </div>
        </div>

        <footer className="ledger-divider mt-3 pt-1.5 text-center text-[7.5px] text-inkmut">
          <p>Reçu électronique vérifiable : {receiptUrl(payment.token)}</p>
          <p>
            {APP_NAME} · {APP_BRAND} · {APP_URL.replace(/^https?:\/\//, "")} · Format A6
          </p>
        </footer>
      </div>
    </div>
  );
}
