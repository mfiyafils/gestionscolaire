"use client";

import { useActionState, useState } from "react";
import { createSubscriptionRequest, type SignupState } from "@/actions/signup";
import { SubmitButton } from "@/components/client";
import type { Level, PlanCode } from "@/db/schema";
import { LEVELS, LEVEL_INFO, PAYMENT_HOLDER, PAYMENT_NUMBERS, PLANS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

const initialState: SignupState = {};

export function SignupForm() {
  const [state, action] = useActionState(createSubscriptionRequest, initialState);
  const [levels, setLevels] = useState<Level[]>(["primaire"]);
  const [plan, setPlan] = useState<PlanCode>("annuel");
  const selectedPlan = PLANS.find((p) => p.code === plan) ?? PLANS[2];
  const total = selectedPlan.price * levels.length;

  function toggle(level: Level) {
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  }

  return (
    <form action={action} className="space-y-7">
      {/* 1. Identité */}
      <section>
        <p className="label">1 · Votre établissement</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="su-name">
              Nom de votre établissement *
            </label>
            <input id="su-name" name="name" required placeholder="Complexe Scolaire Bilingue…" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="su-email">
              E-mail *
            </label>
            <input id="su-email" name="email" type="email" required autoComplete="email" placeholder="direction@monecole.cm" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="su-password">
              Mot de passe *
            </label>
            <input id="su-password" name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="6 caractères minimum" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="su-whatsapp">
              Votre numéro WhatsApp *
            </label>
            <input id="su-whatsapp" name="whatsapp" required inputMode="tel" placeholder="6XX XX XX XX" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="su-director">
              Responsable (optionnel)
            </label>
            <input id="su-director" name="directorName" placeholder="Nom du promoteur / directeur" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="su-address">
              Ville / adresse (optionnel)
            </label>
            <input id="su-address" name="address" placeholder="Douala, Akwa…" className="input" />
          </div>
        </div>
      </section>

      {/* 2. Structures */}
      <section>
        <div className="flex items-baseline justify-between">
          <p className="label">2 · Structures incluses (1 à 3)</p>
          <p className="text-xs font-bold text-inkmut">
            Tarif multiplié par {levels.length || 0} structure{levels.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => {
            const info = LEVEL_INFO[level];
            const checked = levels.includes(level);
            return (
              <label
                key={level}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] bg-white p-4 transition hover:-translate-y-0.5"
                style={{
                  borderColor: checked ? info.hex : "#c7bda2",
                  background: checked ? `${info.hex}14` : "#fff",
                  boxShadow: checked ? `0 0 0 3px ${info.hex}22` : undefined,
                }}
              >
                <input type="checkbox" name="levels" value={level} checked={checked} onChange={() => toggle(level)} className="mt-1 h-4 w-4 accent-[#0f3325]" />
                <span>
                  <span className="block font-display font-bold text-board">
                    {info.emoji} {info.label}
                  </span>
                  <span className="block text-[11px] italic text-inkmut">{info.english}</span>
                  <span className="mt-1 block text-xs text-inkmut">{info.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* 3. Durée */}
      <section>
        <p className="label">3 · Durée de l&apos;abonnement</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => {
            const active = plan === p.code;
            return (
              <label
                key={p.code}
                className={`flex cursor-pointer flex-col rounded-2xl border-[1.5px] p-4 transition hover:-translate-y-0.5 ${active ? "border-board bg-board text-cream shadow-lg" : "border-line bg-white text-ink"}`}
              >
                <span className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold uppercase tracking-wide ${active ? "text-amber" : "text-inkmut"}`}>{p.short}</span>
                  <input type="radio" name="plan" value={p.code} checked={active} onChange={() => setPlan(p.code)} className="h-4 w-4 accent-[#f0a52b]" />
                </span>
                <span className="mt-2 font-display text-2xl font-black">{formatNumber(p.price)} FCFA</span>
                <span className={`text-xs ${active ? "text-cream/70" : "text-inkmut"}`}>{p.label} · par structure</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Total dynamique */}
      <div className="chalkboard chalk-frame rounded-2xl p-5 text-cream">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber">Montant total à payer</p>
        <p className="mt-1 font-display text-4xl font-black">{formatNumber(total)} FCFA</p>
        <p className="mt-1 text-sm text-cream/75">
          {levels.length === 0 ? (
            "Cochez au moins une structure."
          ) : (
            <>
              {formatNumber(selectedPlan.price)} FCFA × {levels.length} structure{levels.length > 1 ? "s" : ""} ({levels.map((l) => LEVEL_INFO[l].label).join(" + ")}) · {selectedPlan.label}
            </>
          )}
        </p>
      </div>

      {/* 4. Paiement */}
      <section>
        <p className="label">4 · Paiement mobile</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAYMENT_NUMBERS.map((p) => (
            <div key={p.label} className="rounded-2xl border-[1.5px] border-line bg-parch p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-inkmut">{p.label}</p>
              <p className="font-mono text-xl font-bold text-board">{p.number}</p>
              <p className="text-[11px] text-inkmut">Au nom de {PAYMENT_HOLDER}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="su-method">
              Moyen de paiement utilisé
            </label>
            <select id="su-method" name="paymentMethod" defaultValue={PAYMENT_NUMBERS[0].label} className="input">
              {PAYMENT_NUMBERS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="su-ref">
              Référence du paiement (ID transaction)
            </label>
            <input id="su-ref" name="paymentReference" placeholder="Facultatif maintenant, à envoyer par WhatsApp" className="input" />
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-inkmut">
          Effectuez le paiement de <b className="text-board">{formatNumber(total)} FCFA</b>, faites une capture d&apos;écran de la
          transaction et conservez la référence : après validation de ce formulaire, un bouton WhatsApp pré-rempli vous
          permettra de les envoyer à l&apos;administrateur.
        </p>
      </section>

      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-rose-50 px-4 py-3 text-sm font-semibold text-danger">
          ⚠️ {state.error}
        </p>
      )}

      <SubmitButton className="btn-school w-full py-3.5 text-base" pendingText="Enregistrement de la demande…">
        ✅ Valider la demande & préparer l&apos;envoi WhatsApp
      </SubmitButton>
      <p className="text-center text-[11px] text-inkmut">
        Votre compte sera activé par la Direction Générale dès réception du paiement. Vous accéderez alors uniquement aux
        structures payées ; les autres resteront visibles mais verrouillées.
      </p>
    </form>
  );
}
