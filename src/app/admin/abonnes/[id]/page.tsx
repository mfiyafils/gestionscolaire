import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { approveSubscriptionRequest, deleteSubscriber, rejectSubscriptionRequest, setSubscriberStatus, updateSubscriber } from "@/actions/subscribers";
import { ConfirmButton, SubmitButton } from "@/components/client";
import { BackLink, Field, Flash, FormulaBadges, PageHeader, StatCard, StatusBadge, WhatsAppLink } from "@/components/ui";
import { LEVELS, LEVEL_INFO, formulaLabel, getPlan, hasLevel } from "@/lib/constants";
import { getSchoolById, getSchoolStats } from "@/lib/data";
import { cn, formatDate, formatMoney, formatNumber, normalizePhone, whatsappUrl } from "@/lib/utils";

export default async function SubscriberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  await requireAdmin();
  const { id: rawId } = await params;
  const sp = await searchParams;
  const id = Number(rawId);
  const school = await getSchoolById(id);
  if (!school) notFound();
  const stats = await getSchoolStats(id);
  const here = `/admin/abonnes/${id}`;
  const plan = getPlan(school.plan);
  const phone = normalizePhone(school.phone, school.countryCode);

  return (
    <>
      <BackLink href="/admin/abonnes">Tous les abonnés</BackLink>
      <PageHeader
        eyebrow={`Abonné · code ${school.code}`}
        title={school.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={school.status} />
            <FormulaBadges school={school} />
            <span className="text-slate-400">· abonné depuis le {formatDate(school.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <Link href={`/ecoles/${id}`} className="btn-school">
              🏫 Ouvrir la plateforme de l&apos;école
            </Link>
            {school.status === "en_attente" && (
              <form action={approveSubscriptionRequest.bind(null, id)}>
                <input type="hidden" name="redirectTo" value={here} />
                <ConfirmButton message={`Valider et activer immédiatement « ${school.name} » (${formulaLabel(school)}) ?`} className="btn-school">
                  ✅ Valider / Admettre
                </ConfirmButton>
              </form>
            )}
            {school.status === "en_attente" && (
              <form action={rejectSubscriptionRequest.bind(null, id)}>
                <input type="hidden" name="redirectTo" value="/admin/abonnes" />
                <ConfirmButton message={`Refuser et supprimer la demande de « ${school.name} » ?`} className="btn-danger">
                  Refuser la demande
                </ConfirmButton>
              </form>
            )}
            {school.status === "actif" && (
              <form action={setSubscriberStatus.bind(null, id, "suspendu")}>
                <input type="hidden" name="redirectTo" value={here} />
                <ConfirmButton message={`Suspendre l'accès de « ${school.name} » ?`} className="btn-warning">
                  ⏸ Suspendre
                </ConfirmButton>
              </form>
            )}
            {(school.status === "suspendu" || school.status === "retire") && (
              <form action={setSubscriberStatus.bind(null, id, "actif")}>
                <input type="hidden" name="redirectTo" value={here} />
                <ConfirmButton message={`Réadmettre « ${school.name} » ?`} className="btn-school">
                  ✅ Réadmettre
                </ConfirmButton>
              </form>
            )}
            {(school.status === "actif" || school.status === "suspendu") && (
              <form action={setSubscriberStatus.bind(null, id, "retire")}>
                <input type="hidden" name="redirectTo" value={here} />
                <ConfirmButton message={`Retirer « ${school.name} » des abonnés ? Les données sont conservées.`} className="btn-danger">
                  ⛔ Retirer
                </ConfirmButton>
              </form>
            )}
          </>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🧑‍🎓" tone="emerald" label="Élèves / numéros officiels" value={stats.total} hint={`${stats.classes} classes`} />
        {LEVELS.map((level) => (
          <StatCard
            key={level}
            icon={LEVEL_INFO[level].emoji}
            tone={level === "maternel" ? "rose" : level === "primaire" ? "amber" : "sky"}
            label={`Bloc ${LEVEL_INFO[level].label}`}
            value={hasLevel(school, level) ? stats.byLevel[level] : "🔒"}
            hint={hasLevel(school, level) ? "module actif" : "non inclus dans la formule"}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="card">
          <h2 className="font-display text-lg font-bold text-board">Informations & formule</h2>
          <form action={updateSubscriber.bind(null, id)} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom de l'école *">
                <input name="name" required defaultValue={school.name} className="input" />
              </Field>
              <Field label="E-mail de connexion *">
                <input name="email" type="email" required defaultValue={school.email} className="input" />
              </Field>
              <Field
                label="Nouveau mot de passe (optionnel)"
                hint={school.passwordHash ? "Un mot de passe est défini : laissez vide pour le conserver." : "Aucun mot de passe : l'école se connecte avec son e-mail seul."}
              >
                <input name="password" type="password" minLength={6} autoComplete="new-password" placeholder="6 caractères minimum" className="input" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Directeur / Promoteur">
                <input name="directorName" defaultValue={school.directorName ?? ""} className="input" />
              </Field>
              <Field label="Téléphone">
                <input name="phone" defaultValue={school.phone ?? ""} className="input" />
              </Field>
              <Field label="Indicatif pays">
                <input name="countryCode" defaultValue={school.countryCode} className="input" />
              </Field>
              <Field label="Code établissement" hint="Les numéros déjà attribués ne changent pas.">
                <input name="code" defaultValue={school.code} maxLength={8} className="input uppercase" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Adresse">
                <input name="address" defaultValue={school.address ?? ""} className="input" />
              </Field>
              <Field label="Fin d'abonnement">
                <input name="subscriptionEnd" type="date" defaultValue={school.subscriptionEnd ?? ""} className="input" />
              </Field>
            </div>
            <div>
              <p className="label">Formule payée (modules accessibles)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {LEVELS.map((level) => (
                  <label key={level} className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1", LEVEL_INFO[level].soft, LEVEL_INFO[level].ring)}>
                    <input type="checkbox" name="levels" value={level} defaultChecked={hasLevel(school, level)} className="mt-1 h-4 w-4" />
                    <span>
                      <span className="block font-semibold text-slate-900">
                        {LEVEL_INFO[level].emoji} {LEVEL_INFO[level].label}
                      </span>
                      <span className="block text-xs text-slate-600">{LEVEL_INFO[level].description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <Field label="Notes internes">
              <textarea name="notes" rows={3} defaultValue={school.notes ?? ""} className="input" />
            </Field>
            <SubmitButton className="btn-primary" pendingText="Enregistrement…">
              💾 Enregistrer les modifications
            </SubmitButton>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="card">
            <h3 className="font-display font-bold text-board">Abonnement & paiement</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-inkmut">Durée</dt>
                <dd className="text-right font-semibold text-ink">{plan ? plan.label : "Définie par la Direction"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-inkmut">Montant</dt>
                <dd className="text-right font-semibold text-ink">{school.amountDue !== null ? `${formatNumber(school.amountDue)} FCFA` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-inkmut">Moyen de paiement</dt>
                <dd className="text-right font-semibold text-ink">{school.paymentMethod ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-inkmut">Référence</dt>
                <dd className="text-right font-mono text-xs font-semibold text-ink">{school.paymentReference ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-inkmut">Période</dt>
                <dd className="text-right font-semibold text-ink">
                  {school.subscriptionStart ? formatDate(school.subscriptionStart, "short") : "—"} → {school.subscriptionEnd ? formatDate(school.subscriptionEnd, "short") : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-inkmut">Mot de passe</dt>
                <dd className="text-right font-semibold text-ink">{school.passwordHash ? "Défini" : "Aucun (e-mail seul)"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {phone && (
                <WhatsAppLink href={whatsappUrl(phone, `Bonjour, Direction Générale Scolaria au sujet de l'abonnement de ${school.name}.`)} className="btn-whatsapp btn-sm">
                  💬 WhatsApp
                </WhatsAppLink>
              )}
              {school.requestToken && (
                <Link href={`/inscription/${school.requestToken}`} className="btn-secondary btn-sm">
                  Page de suivi de la demande
                </Link>
              )}
            </div>
          </section>

          <section className="card">
            <h3 className="font-display font-bold text-board">Encaissements de l&apos;école</h3>
            {stats.pays.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Aucun paiement enregistré.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {stats.pays.map((p) => (
                  <li key={p.currency} className="flex justify-between">
                    <span className="text-slate-600">{p.n} reçu(s)</span>
                    <b>{formatMoney(p.total, p.currency)}</b>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <Link href={`/ecoles/${id}/eleves`} className="btn-secondary btn-sm">
                Liste des élèves
              </Link>
              <Link href={`/ecoles/${id}/numeros-officiels`} className="btn-secondary btn-sm">
                Numéros officiels
              </Link>
              <Link href={`/ecoles/${id}/paiements`} className="btn-secondary btn-sm">
                Paiements & reçus
              </Link>
            </div>
          </section>

          <section className="card border border-rose-100">
            <h3 className="font-bold text-rose-700">Zone sensible</h3>
            <p className="mt-1 text-xs text-slate-500">
              La suppression définitive efface l&apos;école, ses classes, ses élèves et ses reçus. Elle n&apos;est possible que pour un abonné déjà retiré.
            </p>
            <form action={deleteSubscriber.bind(null, id)} className="mt-3">
              <ConfirmButton
                message={`Supprimer DÉFINITIVEMENT « ${school.name} » et toutes ses données ? Cette action est irréversible.`}
                className="btn-danger btn-sm w-full"
                disabled={school.status !== "retire"}
              >
                🗑️ Supprimer définitivement
              </ConfirmButton>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
