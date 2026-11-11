import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRequestReference } from "@/actions/signup";
import { CopyButton, SubmitButton } from "@/components/client";
import { FormulaBadges, StatusBadge, WhatsAppLink } from "@/components/ui";
import {
  ADMIN_WHATSAPP,
  APP_BRAND,
  APP_NAME,
  APP_PHONE,
  LEVEL_INFO,
  PAYMENT_HOLDER,
  PAYMENT_NUMBERS,
  getPlan,
  schoolLevels,
} from "@/lib/constants";
import { getSchoolByRequestToken } from "@/lib/data";
import { buildSubscriptionMessage, formatDate, formatNumber, whatsappUrl } from "@/lib/utils";

export default async function SubscriptionRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const school = await getSchoolByRequestToken(token);
  if (!school) notFound();
  const plan = getPlan(school.plan);
  const levels = schoolLevels(school);
  const message = buildSubscriptionMessage(school);
  const waHref = whatsappUrl(ADMIN_WHATSAPP, message);
  const pending = school.status === "en_attente";

  return (
    <main className="min-h-screen px-4 py-10 lg:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2">
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

        {sp.ok && (
          <div className="mt-6 rounded-xl border border-ok/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-ok">
            ✅ Votre référence de paiement a été enregistrée. Pensez à l&apos;envoyer avec la capture par WhatsApp.
          </div>
        )}

        <div className="anim-in mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-2">Demande d&apos;abonnement n° {school.id}</p>
                <h1 className="mt-1 font-display text-2xl font-black text-board sm:text-3xl">{school.name}</h1>
              </div>
              <StatusBadge status={school.status} />
            </div>

            <dl className="ledger-divider mt-5 grid gap-x-6 gap-y-3 pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="label">E-mail de connexion</dt>
                <dd className="font-semibold text-ink">{school.email}</dd>
              </div>
              <div>
                <dt className="label">WhatsApp</dt>
                <dd className="font-semibold text-ink">{school.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="label">Structures choisies</dt>
                <dd>
                  <FormulaBadges school={school} showLocked={false} />
                </dd>
              </div>
              <div>
                <dt className="label">Durée</dt>
                <dd className="font-semibold text-ink">{plan?.label ?? "—"}</dd>
              </div>
              <div>
                <dt className="label">Moyen de paiement</dt>
                <dd className="font-semibold text-ink">{school.paymentMethod ?? "—"}</dd>
              </div>
              <div>
                <dt className="label">Référence du paiement</dt>
                <dd className="font-mono font-semibold text-ink">{school.paymentReference ?? "à compléter"}</dd>
              </div>
            </dl>

            <div className="chalkboard chalk-frame mt-5 rounded-2xl p-5 text-cream">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber">Montant total</p>
              <p className="mt-1 font-display text-4xl font-black">{formatNumber(school.amountDue ?? 0)} FCFA</p>
              {plan && (
                <p className="mt-1 text-sm text-cream/75">
                  {formatNumber(plan.price)} FCFA × {levels.length} structure{levels.length > 1 ? "s" : ""} ({levels.map((l) => LEVEL_INFO[l].label).join(" + ")}) · {plan.label}
                </p>
              )}
            </div>

            {pending ? (
              <>
                <h2 className="mt-6 font-display text-lg font-bold text-board">Payer puis envoyer la preuve</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {PAYMENT_NUMBERS.map((p) => (
                    <div key={p.label} className="rounded-2xl border-[1.5px] border-line bg-parch p-4">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-inkmut">{p.label}</p>
                      <p className="font-mono text-xl font-bold text-board">{p.number}</p>
                      <p className="text-[11px] text-inkmut">Au nom de {PAYMENT_HOLDER}</p>
                      <CopyButton text={p.number} className="btn-secondary btn-sm mt-2" label="Copier le numéro" />
                    </div>
                  ))}
                </div>
                <WhatsAppLink href={waHref} className="btn-whatsapp mt-5 w-full py-3.5 text-base">
                  💬 Envoyer la référence et la capture de paiement par WhatsApp
                </WhatsAppLink>
                <p className="mt-2 text-center text-[11px] text-inkmut">
                  Ouvre WhatsApp vers le numéro officiel de l&apos;administrateur (+{ADMIN_WHATSAPP}) avec votre récapitulatif
                  pré-rempli : joignez-y la capture d&apos;écran de la transaction.
                </p>
              </>
            ) : school.status === "actif" ? (
              <div className="mt-6 rounded-2xl border border-ok/30 bg-emerald-50 p-5">
                <p className="font-display text-lg font-bold text-ok">🎉 Votre compte est activé !</p>
                <p className="mt-1 text-sm text-ink">
                  Abonnement valable jusqu&apos;au <b>{formatDate(school.subscriptionEnd)}</b>. Connectez-vous avec votre e-mail et votre
                  mot de passe : vous accédez à vos structures payées, les autres restent visibles mais verrouillées.
                </p>
                <Link href="/#login" className="btn-school mt-4">
                  🏫 Me connecter à ma plateforme
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-amber/40 bg-amber-50 p-5 text-sm text-ink">
                Ce compte est actuellement <b>{school.status === "suspendu" ? "suspendu" : "retiré"}</b>. Contactez la Direction Générale
                ({APP_PHONE}).
              </div>
            )}
          </div>

          <aside className="space-y-5">
            {pending && (
              <form action={updateRequestReference.bind(null, token)} className="card p-5">
                <h2 className="font-display font-bold text-board">Compléter ma référence de paiement</h2>
                <p className="mt-1 text-xs text-inkmut">Après le paiement mobile, indiquez l&apos;ID de transaction reçu par SMS.</p>
                <label className="label mt-4" htmlFor="rq-method">
                  Moyen de paiement
                </label>
                <select id="rq-method" name="paymentMethod" defaultValue={school.paymentMethod ?? PAYMENT_NUMBERS[0].label} className="input">
                  {PAYMENT_NUMBERS.map((p) => (
                    <option key={p.label} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <label className="label mt-3" htmlFor="rq-ref">
                  Référence (ID transaction)
                </label>
                <input id="rq-ref" name="paymentReference" defaultValue={school.paymentReference ?? ""} placeholder="Ex. MP240115.1234.A56789" className="input" />
                <SubmitButton className="btn-primary mt-4 w-full" pendingText="Enregistrement…">
                  Enregistrer la référence
                </SubmitButton>
              </form>
            )}

            <div className="card p-5">
              <h2 className="font-display font-bold text-board">Aperçu du message WhatsApp</h2>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-[#e7ffdb] px-4 py-3 text-xs text-ink ring-1 ring-emerald-200">{message}</pre>
              <CopyButton text={message} className="btn-secondary btn-sm mt-3" label="Copier le message" />
            </div>

            <div className="card p-5 text-xs text-inkmut">
              <p className="font-bold text-board">Conservez cette page</p>
              <p className="mt-1">
                Elle vous permet de suivre l&apos;état de votre demande. Statut actuel : <b>{school.status === "en_attente" ? "en attente de validation" : school.status}</b>.
                Déposée le {formatDate(school.createdAt)}.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
