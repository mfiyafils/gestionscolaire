import Link from "next/link";
import { logout } from "@/actions/auth";
import { AdminLoginForm, SchoolLoginForm } from "@/components/LoginForms";
import { getSession } from "@/lib/auth";
import {
  APP_BRAND,
  APP_CITY,
  APP_NAME,
  APP_PHONE,
  APP_TAGLINE,
  APP_URL,
  DEFAULT_CLASSES,
  LEVELS,
  LEVEL_INFO,
  ADMIN_WHATSAPP,
  PAYMENT_HOLDER,
  PAYMENT_NUMBERS,
  PLANS,
} from "@/lib/constants";
import { formatNumber, whatsappUrl } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  connexion: "Veuillez vous connecter pour accéder à cet espace.",
};

const FEATURES = [
  {
    title: "Inscription automatisée",
    text: "Numéro officiel MAT-2026-001 attribué instantanément, registre + liste de classe alimentés en temps réel.",
    color: "#173f2f",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",
  },
  {
    title: "WhatsApp & reçus A6",
    text: "Confirmation au parent par WhatsApp avec le lien du reçu A6 joint, imprimable ou enregistrable en PDF.",
    color: "#2E9E6B",
    icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  },
  {
    title: "Numéros officiels synchronisés",
    text: "Le registre des numéros officiels et la liste générale des élèves partagent la même source : zéro écart.",
    color: "#2E5FE8",
    icon: "M4 6h16M4 12h16M4 18h7M15 18l2 2 4-4",
  },
  {
    title: "Isolation multi-tenant",
    text: "Aucune école ne voit une autre école. La Direction Générale gère les abonnements : ajouter, suspendre, réadmettre, retirer.",
    color: "#C4327E",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; info?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const notice = sp.erreur ? (ERROR_MESSAGES[sp.erreur] ?? sp.erreur) : sp.info;

  return (
    <main className="min-h-screen">
      {/* En-tête fixe */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-board text-amber shadow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-5 w-5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
            </svg>
          </span>
          <div className="mr-2">
            <p className="font-display text-lg font-black leading-none text-board">{APP_NAME}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-2">{APP_BRAND}</p>
          </div>
          <nav className="ml-4 hidden items-center gap-5 text-sm font-semibold text-inkmut md:flex">
            <a href="#structure" className="transition-colors hover:text-board">
              Une architecture par blocs
            </a>
            <a href="#pricing" className="transition-colors hover:text-board">
              Abonnement {APP_NAME}
            </a>
            <a href="#payment" className="transition-colors hover:text-board">
              Numéros de paiement
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-board/8 p-0.5" title="Français / English">
              <span className="rounded-[9px] bg-amber px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-board-2 shadow">fr</span>
              <span className="px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-inkmut">en</span>
            </div>
            <a href="#login" className="btn-primary btn-sm">
              Connexion
            </a>
          </div>
        </div>
      </header>

      {/* Héros + connexion */}
      <section className="relative px-4 pb-14 pt-28 lg:px-6 lg:pt-32">
        <svg className="anim-float pointer-events-none absolute left-[6%] top-28 h-10 w-10 text-amber/50" style={{ ["--rot" as string]: "-12deg" }} viewBox="0 0 24 24" fill="currentColor">
          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
        </svg>
        <svg className="anim-float pointer-events-none absolute right-[8%] top-24 h-9 w-9 text-coral/50" style={{ ["--rot" as string]: "18deg", animationDelay: "1.2s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
        </svg>
        <svg className="anim-float pointer-events-none absolute bottom-10 left-[45%] h-9 w-9 text-board/30" style={{ ["--rot" as string]: "8deg", animationDelay: "0.6s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
        </svg>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="anim-in">
            <span className="chip border border-board/15 bg-board/8 text-board">📍 {APP_TAGLINE}</span>
            <h1 className="mt-4 font-display text-[2.5rem] font-black leading-[1.05] text-board sm:text-6xl">
              Votre école, pilotée
              <br />
              <span className="relative inline-block text-coral">
                à la craie et au cloud.
                <svg className="absolute -bottom-1 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
                  <path d="M2 7 Q75 1 150 6 T298 4" fill="none" stroke="#E9A23B" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-inkmut sm:text-lg">
              Inscriptions, numéros officiels, tranches de scolarité, caisse et reçus A6 envoyés par WhatsApp — chaque
              établissement dans son coffre-fort isolé.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/inscription" className="btn-school px-6 py-3.5 text-base">
                ✅ Valider la demande &amp; préparer l&apos;envoi WhatsApp
              </Link>
              <a href="#structure" className="btn-secondary px-6 py-3.5 text-base">
                Une architecture par blocs
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="chip bg-ok/12 text-ok">🔒 Isolation multi-tenant</span>
              <span className="chip bg-cblue/10 text-cblue">🔢 Numéros officiels</span>
              <span className="chip bg-amber/15 text-amber-2">🧾 Reçus A6</span>
              <span className="chip bg-magenta/10 text-magenta">💬 WhatsApp</span>
            </div>

            {notice && (
              <div className="mt-6 rounded-xl border border-amber/50 bg-amber/15 px-4 py-3 text-sm font-semibold text-amber-2">
                ⚠️ {notice}
              </div>
            )}
            {session && (
              <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-sm text-ink">
                  Connecté en tant que <b>{session.role === "admin" ? "Administrateur Principal" : "École abonnée"}</b>{" "}
                  <span className="text-inkmut">({session.email})</span>
                </p>
                <div className="flex gap-2">
                  <Link href={session.role === "admin" ? "/admin" : `/ecoles/${session.schoolId}`} className="btn-primary btn-sm">
                    Continuer vers mon espace →
                  </Link>
                  <form action={logout}>
                    <button type="submit" className="btn-secondary btn-sm">
                      Déconnexion
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          <div id="login" className="anim-in scroll-mt-24" style={{ animationDelay: "150ms" }}>
            <div className="chalkboard chalk-frame relative overflow-hidden rounded-3xl p-6 sm:p-8">
              <div className="absolute right-4 top-3 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-coral/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-ok/80" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber">Direction & écoles — connexion sécurisée</p>
              <h2 className="mt-1 font-display text-2xl font-black text-cream">Espace École</h2>
              <div className="mt-4">
                <SchoolLoginForm />
              </div>

              <details className="group mt-5 border-t border-white/10 pt-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10.5px] text-cream/45 hover:text-cream/80">
                  🛡️ Accès Direction Générale
                  <span className="text-cream/30 group-open:hidden">· connexion directe par e-mail</span>
                </summary>
                <div className="mt-3">
                  <AdminLoginForm />
                </div>
              </details>
              <p className="mt-4 flex items-center gap-1.5 text-[10px] text-cream/40">
                🔐 Sessions chiffrées · données isolées par école
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="px-4 py-12 lg:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card group p-5 transition-transform hover:-translate-y-1">
              <span
                className="inline-flex rounded-2xl p-3 transition-transform group-hover:rotate-6 group-hover:scale-110"
                style={{ background: `${f.color}18`, color: f.color }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path d={f.icon} />
                </svg>
              </span>
              <h3 className="mt-3 font-display font-bold text-board">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-inkmut">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture par blocs */}
      <section id="structure" className="scroll-mt-24 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-black text-board sm:text-4xl">Une architecture par blocs</h2>
            <p className="mt-2 text-inkmut">
              De la Petite Section à la Terminale — chaque élève est intégré dans la liste de sa classe et de son bloc.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {LEVELS.map((level) => {
              const info = LEVEL_INFO[level];
              return (
                <div key={level} className="card overflow-hidden p-0 transition-transform hover:-translate-y-1">
                  <div className="h-2" style={{ background: info.hex }} />
                  <div className="p-5">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-xl font-bold text-board">{info.label}</h3>
                      <span className="text-xs font-bold italic text-inkmut">{info.english}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {DEFAULT_CLASSES[level].map((name) => (
                        <span key={name} className="chip border" style={{ borderColor: `${info.hex}55`, color: "#22301f", background: `${info.hex}14` }}>
                          {name}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 flex items-center gap-1.5 text-[11px] text-inkmut">
                      {info.emoji} {info.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Abonnement */}
      <section id="pricing" className="scroll-mt-24 px-4 py-12 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-black text-board sm:text-4xl">Abonnement simple, sans surprise</h2>
            <p className="mt-2 text-inkmut">
              Cochez une ou plusieurs structures (Maternelle, Primaire, Secondaire) et choisissez votre durée — le tarif
              est multiplié automatiquement par le nombre de structures.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan, index) => (
              <div key={plan.code} className={`card relative overflow-hidden p-6 transition-transform hover:-translate-y-1 ${index === 2 ? "ring-2 ring-amber" : ""}`}>
                {index === 2 && <span className="chip absolute right-4 top-4 bg-amber text-board-2">Le plus avantageux</span>}
                <p className="text-xs font-extrabold uppercase tracking-wide text-inkmut">{plan.short}</p>
                <p className="mt-2 font-display text-3xl font-black text-board">{formatNumber(plan.price)} FCFA</p>
                <p className="text-sm text-inkmut">{plan.label} · par structure</p>
                <ul className="mt-4 space-y-1 text-sm text-ink">
                  <li>1 structure : <b>{formatNumber(plan.price)} FCFA</b></li>
                  <li>2 structures : <b>{formatNumber(plan.price * 2)} FCFA</b></li>
                  <li>3 structures : <b>{formatNumber(plan.price * 3)} FCFA</b></li>
                </ul>
                <Link href="/inscription" className={`${index === 2 ? "btn-school" : "btn-secondary"} mt-5 w-full`}>
                  Choisir cette durée
                </Link>
              </div>
            ))}
          </div>

          <div id="payment" className="mt-10 grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-bold text-board">Numéros de paiement</h3>
              {PAYMENT_NUMBERS.map((p) => (
                <div key={p.label} className="card flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-inkmut">{p.label}</p>
                    <p className="font-mono text-lg font-bold text-board">{p.number}</p>
                  </div>
                  <span className="chip bg-amber/15 text-amber-2">Au nom de {PAYMENT_HOLDER}</span>
                </div>
              ))}
            </div>
            <div className="card p-6">
              <h3 className="font-display text-xl font-bold text-board">Comment activer mon compte ?</h3>
              <ol className="mt-3 space-y-2 text-sm text-ink">
                <li>1. Créez votre compte abonné : nom, e-mail, mot de passe, WhatsApp, structures et durée.</li>
                <li>2. Payez le montant total affiché via Orange Money ou MTN Mobile Money.</li>
                <li>3. Envoyez la référence et la capture du paiement à l&apos;administrateur par WhatsApp (bouton pré-rempli).</li>
                <li>4. La Direction Générale valide votre demande : accès immédiat à vos structures payées.</li>
              </ol>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/inscription" className="btn-school">
                  Créer mon compte abonné
                </Link>
                <a href={whatsappUrl(ADMIN_WHATSAPP, `Bonjour, je souhaite souscrire un abonnement ${APP_NAME}.`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                  💬 Contacter l&apos;administrateur
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="border-t border-line px-4 py-10 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-display text-lg font-black text-board">{APP_NAME}</p>
            <p className="text-xs text-inkmut">
              {APP_NAME} — un produit {APP_BRAND} · {APP_CITY}
            </p>
          </div>
          <div className="text-xs text-inkmut">
            <p className="font-bold text-board">
              {APP_BRAND} · {APP_PHONE}
            </p>
            <p>
              Gestion scolaire bilingue, sécurisée & multi-établissements · © {new Date().getFullYear()} {APP_BRAND}
            </p>
            <a href={APP_URL} className="text-amber-2 hover:underline">
              {APP_URL.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
