import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { approveSubscriptionRequest, rejectSubscriptionRequest, setSubscriberStatus } from "@/actions/subscribers";
import { ConfirmButton } from "@/components/client";
import { StudentsTable } from "@/components/StudentsTable";
import { FormulaBadges, PageHeader, StatCard, StatusBadge, WhatsAppLink } from "@/components/ui";
import { LEVELS, LEVEL_INFO, formulaLabel, getPlan } from "@/lib/constants";
import { getAdminStats, listStudents, listSubscribers } from "@/lib/data";
import { formatDate, formatMoney, formatNumber, normalizePhone, whatsappUrl } from "@/lib/utils";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [stats, subscribers, recentStudents] = await Promise.all([
    getAdminStats(),
    listSubscribers(),
    listStudents({ order: "recent", limit: 8 }),
  ]);
  const pending = subscribers.filter((s) => s.status === "en_attente");
  const recentSubscribers = subscribers.filter((s) => s.status !== "en_attente").slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Direction Générale"
        title="Tableau de bord"
        subtitle="Compte Administrateur Principal reconnu automatiquement (connexion directe par e-mail, sans mot de passe)."
        actions={
          <>
            <Link href="/admin/abonnes?nouveau=1" className="btn-primary">
              ➕ Ajouter une école abonnée
            </Link>
            <Link href="/admin/numeros-officiels" className="btn-secondary">
              🔢 Numéros officiels
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🏫" tone="indigo" label="Écoles abonnées" value={stats.subs.total} hint={`${stats.subs.actifs} actives · ${stats.subs.enAttente} en attente · ${stats.subs.suspendus} suspendues · ${stats.subs.retires} retirées`} />
        <StatCard icon="🧑‍🎓" tone="emerald" label="Élèves enregistrés" value={stats.studentsTotal} hint="= numéros officiels attribués" />
        <StatCard
          icon="🧩"
          tone="amber"
          label="Répartition par bloc"
          value={
            <span className="text-base font-semibold">
              {LEVELS.map((l) => `${LEVEL_INFO[l].short} ${stats.byLevel[l]}`).join(" · ")}
            </span>
          }
          hint="Maternelle · Primaire · Secondaire"
        />
        <StatCard
          icon="🧾"
          tone="sky"
          label="Paiements encaissés"
          value={
            stats.pays.length === 0 ? (
              "0"
            ) : (
              <span className="text-lg">{stats.pays.map((p) => formatMoney(p.total, p.currency)).join(" + ")}</span>
            )
          }
          hint={`${stats.pays.reduce((a, p) => a + p.n, 0)} reçus émis`}
        />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-board">Demandes d&apos;abonnement en attente</h2>
          <span className={`chip ${pending.length ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"}`}>
            {pending.length} en attente
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="card text-sm text-inkmut">
            Aucune demande en attente. Les écoles qui créent leur compte abonné apparaissent ici avec leurs structures, leur
            durée, le montant total et leur référence de paiement.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((s) => {
              const plan = getPlan(s.plan);
              const phone = normalizePhone(s.phone, s.countryCode);
              return (
                <div key={s.id} className="card border-l-4 border-l-sky-500 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wide text-inkmut">
                        Demande n° {s.id} · {formatDate(s.createdAt)}
                      </p>
                      <h3 className="font-display text-lg font-bold text-board">{s.name}</h3>
                      <p className="text-sm text-inkmut">
                        {s.email}
                        {s.phone ? ` · WhatsApp ${s.phone}` : ""}
                        {s.directorName ? ` · ${s.directorName}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="label">Structures</dt>
                      <dd>
                        <FormulaBadges school={s} showLocked={false} />
                      </dd>
                    </div>
                    <div>
                      <dt className="label">Durée</dt>
                      <dd className="font-semibold text-ink">{plan?.label ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="label">Montant total</dt>
                      <dd className="font-display text-xl font-black text-board">{formatNumber(s.amountDue ?? 0)} FCFA</dd>
                    </div>
                    <div>
                      <dt className="label">Paiement</dt>
                      <dd className="font-semibold text-ink">
                        {s.paymentMethod ?? "—"}
                        <span className="block font-mono text-xs font-normal text-inkmut">{s.paymentReference ?? "référence non fournie"}</span>
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={approveSubscriptionRequest.bind(null, s.id)}>
                      <input type="hidden" name="redirectTo" value="/admin" />
                      <ConfirmButton message={`Valider et activer immédiatement « ${s.name} » (${formulaLabel(s)}) ?`} className="btn-school">
                        ✅ Valider / Admettre
                      </ConfirmButton>
                    </form>
                    {phone && (
                      <WhatsAppLink
                        href={whatsappUrl(phone, `Bonjour, Direction Générale Scolaria : nous avons bien reçu la demande d'abonnement de ${s.name} (${formulaLabel(s)}, ${formatNumber(s.amountDue ?? 0)} FCFA).`)}
                        className="btn-whatsapp"
                      >
                        💬 Contacter
                      </WhatsAppLink>
                    )}
                    <Link href={`/admin/abonnes/${s.id}`} className="btn-secondary">
                      Détails
                    </Link>
                    <form action={rejectSubscriptionRequest.bind(null, s.id)}>
                      <input type="hidden" name="redirectTo" value="/admin" />
                      <ConfirmButton message={`Refuser et supprimer la demande de « ${s.name} » ?`} className="btn-danger">
                        Refuser
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-board">Abonnés récents</h2>
          <Link href="/admin/abonnes" className="text-sm font-semibold text-indigo-700 hover:underline">
            Gérer tous les abonnés →
          </Link>
        </div>
        {recentSubscribers.length === 0 ? (
          <div className="card text-sm text-slate-600">
            Aucune école abonnée pour le moment.{" "}
            <Link href="/admin/abonnes?nouveau=1" className="font-semibold text-indigo-700 hover:underline">
              Ajoutez la première école
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="tbl">
              <thead>
                <tr>
                  <th>École</th>
                  <th>Formule</th>
                  <th>Élèves</th>
                  <th>Statut</th>
                  <th>Depuis</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentSubscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td>
                      <Link href={`/admin/abonnes/${s.id}`} className="font-semibold text-slate-900 hover:underline">
                        {s.name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {s.email} · <span className="font-mono">{s.code}</span>
                      </div>
                    </td>
                    <td>
                      <FormulaBadges school={s} />
                    </td>
                    <td className="font-semibold">{s.studentCount}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="whitespace-nowrap">{formatDate(s.createdAt, "short")}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/ecoles/${s.id}`} className="btn-secondary btn-sm">
                          Ouvrir
                        </Link>
                        {s.status === "en_attente" ? (
                          <form action={approveSubscriptionRequest.bind(null, s.id)}>
                            <input type="hidden" name="redirectTo" value="/admin" />
                            <ConfirmButton message={`Valider et activer « ${s.name} » ?`} className="btn-school btn-sm">
                              Valider / Admettre
                            </ConfirmButton>
                          </form>
                        ) : s.status === "actif" ? (
                          <form action={setSubscriberStatus.bind(null, s.id, "suspendu")}>
                            <input type="hidden" name="redirectTo" value="/admin" />
                            <ConfirmButton message={`Suspendre l'accès de « ${s.name} » ?`} className="btn-warning btn-sm">
                              Suspendre
                            </ConfirmButton>
                          </form>
                        ) : (
                          <form action={setSubscriberStatus.bind(null, s.id, "actif")}>
                            <input type="hidden" name="redirectTo" value="/admin" />
                            <ConfirmButton message={`Réadmettre « ${s.name} » ?`} className="btn-school btn-sm">
                              Réadmettre
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
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-board">Derniers élèves enregistrés</h2>
          <Link href="/admin/eleves" className="text-sm font-semibold text-indigo-700 hover:underline">
            Voir tous les élèves →
          </Link>
        </div>
        <StudentsTable rows={recentStudents} showSchool />
      </section>
    </>
  );
}
