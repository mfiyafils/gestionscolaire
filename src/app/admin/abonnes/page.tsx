import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { approveSubscriptionRequest, createSubscriber, rejectSubscriptionRequest, setSubscriberStatus } from "@/actions/subscribers";
import { ConfirmButton, SubmitButton } from "@/components/client";
import { EmptyState, Field, Flash, FormulaBadges, PageHeader, StatusBadge } from "@/components/ui";
import type { SubscriberStatus } from "@/db/schema";
import { LEVELS, LEVEL_INFO, STATUS_INFO, getPlan } from "@/lib/constants";
import { listSubscribers } from "@/lib/data";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const FILTERS: Array<{ value: SubscriberStatus | "tous"; label: string }> = [
  { value: "tous", label: "Tous" },
  { value: "en_attente", label: "En attente" },
  { value: "actif", label: "Actifs" },
  { value: "suspendu", label: "Suspendus" },
  { value: "retire", label: "Retirés" },
];

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; ok?: string; erreur?: string; nouveau?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const statut = (["en_attente", "actif", "suspendu", "retire"].includes(sp.statut ?? "") ? sp.statut : "tous") as SubscriberStatus | "tous";
  const rows = await listSubscribers(statut === "tous" ? undefined : statut);
  const openForm = sp.nouveau === "1" || Boolean(sp.erreur);
  const currentPath = `/admin/abonnes${statut !== "tous" ? `?statut=${statut}` : ""}`;

  return (
    <>
      <PageHeader
        eyebrow="Gestion des abonnés"
        title="Écoles abonnées"
        subtitle="Ajouter, suspendre, réadmettre ou retirer une école. Chaque école accède uniquement aux modules de sa formule."
        actions={
          <Link href="/admin/abonnes?nouveau=1#nouvel-abonne" className="btn-primary">
            ➕ Ajouter une école
          </Link>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <details id="nouvel-abonne" open={openForm} className="card mb-8 group">
        <summary className="cursor-pointer select-none text-base font-bold text-slate-900">
          ➕ Nouvel abonné (école)
          <span className="ml-2 text-xs font-normal text-slate-500 group-open:hidden">— cliquer pour ouvrir le formulaire</span>
        </summary>
        <form action={createSubscriber} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'école *">
              <input name="name" required placeholder="Complexe Scolaire M'Fiya Fils" className="input" />
            </Field>
            <Field label="E-mail de connexion *" hint="L'école se connectera avec cet e-mail.">
              <input name="email" type="email" required placeholder="direction@monecole.cm" className="input" />
            </Field>
            <Field label="Mot de passe (optionnel)" hint="Si vide, l'école se connecte avec son e-mail seul.">
              <input name="password" type="password" minLength={6} autoComplete="new-password" placeholder="6 caractères minimum" className="input" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Directeur / Promoteur">
              <input name="directorName" placeholder="Nom du responsable" className="input" />
            </Field>
            <Field label="Téléphone">
              <input name="phone" placeholder="+243 ..." className="input" />
            </Field>
            <Field label="Indicatif pays (WhatsApp)">
              <input name="countryCode" defaultValue="243" className="input" />
            </Field>
            <Field label="Code établissement" hint="Préfixe des numéros officiels (auto si vide).">
              <input name="code" placeholder="Ex. MFF" maxLength={8} className="input uppercase" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adresse">
              <input name="address" placeholder="Avenue, commune, ville" className="input" />
            </Field>
            <Field label="Fin d'abonnement (optionnel)">
              <input name="subscriptionEnd" type="date" className="input" />
            </Field>
          </div>
          <div>
            <p className="label">Formule payée * (modules accessibles)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {LEVELS.map((level) => (
                <label
                  key={level}
                  className={cn("flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 transition hover:shadow", LEVEL_INFO[level].soft, LEVEL_INFO[level].ring)}
                >
                  <input type="checkbox" name="levels" value={level} className="mt-1 h-4 w-4" />
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
            <textarea name="notes" rows={2} placeholder="Observations, contrat, paiement de l'abonnement…" className="input" />
          </Field>
          <SubmitButton className="btn-primary" pendingText="Création…">
            Créer l&apos;abonné et ses classes par défaut
          </SubmitButton>
        </form>
      </details>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "tous" ? "/admin/abonnes" : `/admin/abonnes?statut=${f.value}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition",
              statut === f.value ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="Aucune école dans cette catégorie"
          text="Ajoutez une école abonnée pour lui donner accès à sa plateforme."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="tbl">
            <thead>
              <tr>
                <th>École</th>
                <th>Contact</th>
                <th>Formule</th>
                <th>Élèves</th>
                <th>Statut</th>
                <th>Abonné depuis</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={cn("hover:bg-slate-50/70", s.status === "retire" && "opacity-70")}>
                  <td>
                    <Link href={`/admin/abonnes/${s.id}`} className="font-semibold text-slate-900 hover:underline">
                      {s.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      Code <span className="font-mono font-semibold">{s.code}</span>
                      {s.directorName ? ` · ${s.directorName}` : ""}
                    </div>
                  </td>
                  <td>
                    <div className="text-slate-800">{s.email}</div>
                    <div className="text-xs text-slate-500">{s.phone ?? ""}</div>
                  </td>
                  <td>
                    <FormulaBadges school={s} />
                  </td>
                  <td className="font-semibold">{s.studentCount}</td>
                  <td>
                    <StatusBadge status={s.status} />
                    {s.plan && (
                      <div className="mt-1 text-[11px] text-slate-500">
                        {getPlan(s.plan)?.label} · {formatNumber(s.amountDue ?? 0)} FCFA
                      </div>
                    )}
                    {s.subscriptionEnd && <div className="mt-1 text-[11px] text-slate-500">Fin : {formatDate(s.subscriptionEnd, "short")}</div>}
                  </td>
                  <td className="whitespace-nowrap">{formatDate(s.createdAt, "short")}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link href={`/ecoles/${s.id}`} className="btn-secondary btn-sm" title="Ouvrir la plateforme de l'école">
                        Ouvrir
                      </Link>
                      <Link href={`/admin/abonnes/${s.id}`} className="btn-secondary btn-sm">
                        Modifier
                      </Link>
                      {s.status === "en_attente" && (
                        <form action={approveSubscriptionRequest.bind(null, s.id)}>
                          <input type="hidden" name="redirectTo" value={currentPath} />
                          <ConfirmButton message={`Valider et activer immédiatement « ${s.name} » ?`} className="btn-school btn-sm">
                            ✅ Valider / Admettre
                          </ConfirmButton>
                        </form>
                      )}
                      {s.status === "en_attente" && (
                        <form action={rejectSubscriptionRequest.bind(null, s.id)}>
                          <input type="hidden" name="redirectTo" value={currentPath} />
                          <ConfirmButton message={`Refuser et supprimer la demande de « ${s.name} » ?`} className="btn-danger btn-sm">
                            Refuser
                          </ConfirmButton>
                        </form>
                      )}
                      {s.status === "actif" && (
                        <form action={setSubscriberStatus.bind(null, s.id, "suspendu")}>
                          <input type="hidden" name="redirectTo" value={currentPath} />
                          <ConfirmButton message={`Suspendre l'accès de « ${s.name} » ? L'école ne pourra plus se connecter.`} className="btn-warning btn-sm">
                            Suspendre
                          </ConfirmButton>
                        </form>
                      )}
                      {(s.status === "suspendu" || s.status === "retire") && (
                        <form action={setSubscriberStatus.bind(null, s.id, "actif")}>
                          <input type="hidden" name="redirectTo" value={currentPath} />
                          <ConfirmButton message={`Réadmettre « ${s.name} » ? Son accès sera rétabli immédiatement.`} className="btn-school btn-sm">
                            Réadmettre
                          </ConfirmButton>
                        </form>
                      )}
                      {(s.status === "actif" || s.status === "suspendu") && (
                        <form action={setSubscriberStatus.bind(null, s.id, "retire")}>
                          <input type="hidden" name="redirectTo" value={currentPath} />
                          <ConfirmButton message={`Retirer « ${s.name} » de la liste des abonnés ? Les données sont conservées.`} className="btn-danger btn-sm">
                            Retirer
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Statuts : {Object.values(STATUS_INFO).map((s) => s.label).join(" · ")}. Un abonné retiré conserve ses données et peut être réadmis à tout moment.
      </p>
    </>
  );
}
