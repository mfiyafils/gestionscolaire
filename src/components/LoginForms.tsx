"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminLogin, schoolLogin, type LoginState } from "@/actions/auth";
import { SubmitButton } from "@/components/client";

const initialState: LoginState = {};
const chalkInput = "input !border-white/20 !bg-white/10 !text-cream placeholder:!text-cream/30 focus:!border-amber";
const chalkLabel = "label !text-cream/70";

/** Champ discret : l'administrateur saisit lui-même son e-mail (jamais affiché), accès instantané sans mot de passe. */
export function AdminLoginForm() {
  const [state, action] = useActionState(adminLogin, initialState);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="admin-email" className="sr-only">
        E-mail de la direction
      </label>
      <div className="flex gap-2">
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="E-mail de la direction"
          className={`${chalkInput} !py-2 !text-xs`}
        />
        <SubmitButton
          className="shrink-0 rounded-xl border-2 border-amber/70 bg-amber/15 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-amber transition-all hover:bg-amber hover:text-board-2 disabled:opacity-60"
          pendingText="…"
        >
          Connexion directe
        </SubmitButton>
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl border border-coral/50 bg-coral/15 px-3 py-2 text-xs font-semibold text-[#ffd9cf]">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function SchoolLoginForm() {
  const [state, action] = useActionState(schoolLogin, initialState);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="school-email" className={chalkLabel}>
          E-mail
        </label>
        <input
          id="school-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="direction@monecole.cm"
          className={chalkInput}
        />
      </div>
      <div>
        <label htmlFor="school-password" className={chalkLabel}>
          Mot de passe
        </label>
        <input
          id="school-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={chalkInput}
        />
        <p className="mt-1 text-[10px] text-cream/40">Laissez vide si votre compte a été créé par la Direction sans mot de passe.</p>
      </div>
      {state.error && (
        <div role="alert" className="rounded-xl border border-coral/50 bg-coral/15 px-3 py-2 text-xs font-semibold text-[#ffd9cf]">
          {state.error}
          {state.pendingToken && (
            <Link href={`/inscription/${state.pendingToken}`} className="mt-1 block font-extrabold text-amber underline underline-offset-4">
              Ouvrir ma page de suivi et envoyer la référence par WhatsApp →
            </Link>
          )}
        </div>
      )}
      <SubmitButton className="btn-school w-full py-3.5 text-base" pendingText="Connexion…">
        🏫 Connexion
      </SubmitButton>
      <Link href="/inscription" className="block w-full text-center text-xs font-bold text-amber underline underline-offset-4 hover:text-white">
        Pas encore de compte ? Créez-en un
      </Link>
    </form>
  );
}
