import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";
import { APP_BRAND, APP_NAME, APP_PHONE, LEVELS, LEVEL_INFO, PLANS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const metadata = {
  title: `Créer mon compte abonné — ${APP_NAME}`,
};

export default function SignupPage() {
  return (
    <main className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-board text-amber shadow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-5 w-5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-lg font-black leading-none text-board">{APP_NAME}</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-amber-2">{APP_BRAND}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/#login" className="btn-secondary btn-sm">
              J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 pb-16 pt-28 lg:px-6 lg:pt-32">
        <div className="mx-auto max-w-6xl">
          <div className="anim-in max-w-2xl">
            <span className="chip border border-board/15 bg-board/8 text-board">🏫 Espace abonné</span>
            <h1 className="mt-4 font-display text-4xl font-black leading-tight text-board sm:text-5xl">Créer mon compte abonné</h1>
            <p className="mt-3 text-base text-inkmut sm:text-lg">
              Renseignez votre établissement, cochez vos structures, choisissez la durée : le montant total s&apos;affiche
              automatiquement. Après paiement mobile, envoyez la référence et la capture à l&apos;administrateur par WhatsApp.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="card anim-in p-6 sm:p-8" style={{ animationDelay: "100ms" }}>
              <SignupForm />
            </div>

            <aside className="space-y-5">
              <div className="chalkboard chalk-frame rounded-3xl p-6 text-cream">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber">Grille tarifaire officielle</p>
                <ul className="mt-3 space-y-2">
                  {PLANS.map((p) => (
                    <li key={p.code} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
                      <span className="text-sm font-semibold">{p.label}</span>
                      <span className="font-display text-lg font-black text-amber">{formatNumber(p.price)} FCFA</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-cream/60">Prix par structure, multiplié par le nombre de structures cochées.</p>
              </div>

              <div className="card p-5">
                <h2 className="font-display font-bold text-board">Les structures</h2>
                <ul className="mt-3 space-y-2">
                  {LEVELS.map((level) => (
                    <li key={level} className="flex items-start gap-3">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: LEVEL_INFO[level].hex }} />
                      <span>
                        <span className="block text-sm font-bold text-ink">
                          {LEVEL_INFO[level].label} <span className="font-normal italic text-inkmut">· {LEVEL_INFO[level].english}</span>
                        </span>
                        <span className="block text-xs text-inkmut">{LEVEL_INFO[level].description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-5">
                <h2 className="font-display font-bold text-board">Comment ça marche ?</h2>
                <ol className="mt-3 space-y-2 text-sm text-ink">
                  <li>1. Vous validez ce formulaire : votre demande est enregistrée « en attente ».</li>
                  <li>2. Vous payez le total via Orange Money ou MTN Mobile Money.</li>
                  <li>3. Vous envoyez la référence + la capture par WhatsApp (bouton pré-rempli).</li>
                  <li>4. La Direction Générale valide : vous vous connectez avec votre e-mail et mot de passe.</li>
                </ol>
                <p className="mt-3 text-xs text-inkmut">
                  Besoin d&apos;aide ? {APP_BRAND} · {APP_PHONE}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
