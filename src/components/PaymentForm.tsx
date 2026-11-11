import { SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { CURRENCIES, MOTIFS, PAYMENT_METHODS } from "@/lib/constants";
import { todayISO } from "@/lib/utils";

export type PaymentStudentOption = { id: number; label: string; parentName?: string | null };

export function PaymentForm({
  action,
  students,
  fixedStudent,
  redirectTo,
}: {
  action: (formData: FormData) => Promise<void>;
  students?: PaymentStudentOption[];
  fixedStudent?: PaymentStudentOption;
  redirectTo?: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {fixedStudent ? (
        <div>
          <input type="hidden" name="studentId" value={fixedStudent.id} />
          <p className="label">Élève</p>
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
            {fixedStudent.label}
          </p>
        </div>
      ) : (
        <Field label="Élève *">
          <select name="studentId" required defaultValue="" className="input">
            <option value="" disabled>
              Rechercher l&apos;élève (nom ou numéro officiel)…
            </option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Montant *">
          <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className="input" />
        </Field>
        <Field label="Devise">
          <select name="currency" defaultValue="USD" className="input">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date du paiement">
          <input name="paidAt" type="date" defaultValue={todayISO()} className="input" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Motif *">
          <select name="motif" defaultValue={MOTIFS[0]} className="input">
            {MOTIFS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Précision (si « Autre »)">
          <input name="motifAutre" placeholder="Ex. Frais de sortie scolaire" className="input" />
        </Field>
        <Field label="Période / Tranche">
          <input name="period" placeholder="Ex. 1er trimestre 2025-2026" className="input" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mode de paiement">
          <select name="method" defaultValue={PAYMENT_METHODS[0]} className="input">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reçu de (payeur)" hint="Par défaut : le parent / tuteur de l'élève">
          <input name="payerName" defaultValue={fixedStudent?.parentName ?? ""} placeholder="Nom du payeur" className="input" />
        </Field>
        <Field label="Note">
          <input name="note" placeholder="Observation éventuelle" className="input" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <SubmitButton className="btn-school" pendingText="Génération du reçu…">
          🧾 Enregistrer et générer le reçu A6
        </SubmitButton>
        <p className="text-xs text-slate-500">Le reçu pourra être imprimé ou envoyé au parent par WhatsApp avec son lien.</p>
      </div>
    </form>
  );
}
