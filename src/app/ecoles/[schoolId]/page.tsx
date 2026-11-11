import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { StudentsTable } from "@/components/StudentsTable";
import { Flash, PageHeader, StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { LEVELS, LEVEL_INFO, hasLevel, schoolLevels } from "@/lib/constants";
import { getSchoolById, getSchoolStats, listClasses, listPayments, listStudents } from "@/lib/data";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export default async function SchoolHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { schoolId: raw } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  const { school } = await requireSchoolPage(schoolId);
  const [stats, classes, recentStudents, recentPayments, session] = await Promise.all([
    getSchoolStats(schoolId),
    listClasses(schoolId),
    listStudents({ schoolId, order: "recent", limit: 6 }),
    listPayments({ schoolId, limit: 5 }),
    getSession(),
  ]);
  const base = `/ecoles/${schoolId}`;
  const active = schoolLevels(school);

  return (
    <>
      <PageHeader
        eyebrow="Plateforme de l'école"
        title={`Bienvenue, ${school.name}`}
        subtitle={
          <>
            Formule active : <b>{active.map((l) => LEVEL_INFO[l].label).join(" + ") || "aucune"}</b>. Les modules non souscrits
            restent visibles mais verrouillés.
          </>
        }
        actions={
          <>
            <Link href={`${base}/eleves/nouveau`} className="btn-school">
              ➕ Nouvel élève
            </Link>
            <Link href={`${base}/paiements`} className="btn-secondary">
              🧾 Nouveau paiement
            </Link>
          </>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="🧑‍🎓" tone="emerald" label="Élèves inscrits" value={stats.total} hint="= numéros officiels attribués" />
        <StatCard icon="🏷️" tone="indigo" label="Classes" value={stats.classes} hint="réparties dans vos blocs actifs" />
        <StatCard
          icon="🧾"
          tone="sky"
          label="Encaissements"
          value={stats.pays.length ? <span className="text-lg">{stats.pays.map((p) => formatMoney(p.total, p.currency)).join(" + ")}</span> : "0"}
          hint={`${stats.pays.reduce((a, p) => a + p.n, 0)} reçu(s) émis`}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-board">Blocs pédagogiques</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {LEVELS.map((level) => {
            const info = LEVEL_INFO[level];
            const unlocked = hasLevel(school, level);
            const levelClasses = classes.filter((c) => c.level === level);
            return (
              <div
                key={level}
                className={cn(
                  "relative flex flex-col rounded-2xl p-6 ring-1 transition",
                  unlocked ? `bg-white shadow-sm ${info.ring} hover:shadow-md` : "bg-slate-100 ring-slate-200 grayscale",
                )}
              >
                {!unlocked && (
                  <span className="absolute right-4 top-4 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white">
                    🔒 Verrouillé
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-12 w-12 place-items-center rounded-2xl text-2xl text-white", unlocked ? info.accent : "bg-slate-400")}>
                    {info.emoji}
                  </span>
                  <div>
                    <h3 className={cn("text-lg font-bold", unlocked ? "text-slate-900" : "text-slate-500")}>Bloc {info.label}</h3>
                    <p className="text-xs text-slate-500">{info.description}</p>
                  </div>
                </div>

                <div className={cn("mt-5 grid grid-cols-2 gap-3 text-center", !unlocked && "opacity-60")}>
                  <div className={cn("rounded-xl p-3", unlocked ? info.soft : "bg-slate-200/60")}>
                    <p className="text-2xl font-extrabold text-slate-900">{unlocked ? stats.byLevel[level] : "—"}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Élèves</p>
                  </div>
                  <div className={cn("rounded-xl p-3", unlocked ? info.soft : "bg-slate-200/60")}>
                    <p className="text-2xl font-extrabold text-slate-900">{unlocked ? levelClasses.length : "—"}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Classes</p>
                  </div>
                </div>

                {unlocked ? (
                  <>
                    <ul className="mt-4 space-y-1 text-sm">
                      {levelClasses.slice(0, 6).map((c) => (
                        <li key={c.id} className="flex items-center justify-between">
                          <Link href={`${base}/niveaux/${level}/classes/${c.id}`} className="text-slate-700 hover:underline">
                            {c.name}
                          </Link>
                          <span className="text-xs font-semibold text-slate-500">{c.studentCount} élève(s)</span>
                        </li>
                      ))}
                      {levelClasses.length > 6 && <li className="text-xs text-slate-400">+ {levelClasses.length - 6} autres classes</li>}
                    </ul>
                    <Link href={`${base}/niveaux/${level}`} className="btn-school mt-5">
                      Ouvrir le bloc {info.label} →
                    </Link>
                  </>
                ) : (
                  <div className="mt-5 flex flex-1 flex-col justify-end">
                    <p className="text-xs text-slate-500">
                      Module non inclus dans votre formule. Contactez la Direction Générale pour l&apos;activer.
                    </p>
                    {session?.role === "admin" ? (
                      <Link href={`/admin/abonnes/${schoolId}`} className="btn-secondary mt-3">
                        Activer ce module (formule)
                      </Link>
                    ) : (
                      <Link href={`${base}/niveaux/${level}`} className="btn-secondary mt-3 cursor-not-allowed opacity-70">
                        🔒 Aperçu du module
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-board">Derniers élèves enregistrés</h2>
            <Link href={`${base}/eleves`} className="text-sm font-semibold text-emerald-700 hover:underline">
              Liste complète →
            </Link>
          </div>
          <StudentsTable
            rows={recentStudents}
            emptyAction={
              <Link href={`${base}/eleves/nouveau`} className="btn-school">
                ➕ Enregistrer le premier élève
              </Link>
            }
          />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-board">Derniers paiements</h2>
            <Link href={`${base}/paiements`} className="text-sm font-semibold text-emerald-700 hover:underline">
              Tous les reçus →
            </Link>
          </div>
          <div className="card divide-y divide-slate-100 p-0">
            {recentPayments.length === 0 && <p className="p-6 text-sm text-slate-500">Aucun paiement enregistré.</p>}
            {recentPayments.map((p) => (
              <Link key={p.id} href={`${base}/paiements/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {p.studentLastName} {p.studentFirstName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {p.receiptNumber} · {p.motif} · {formatDate(p.paidAt, "short")}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-slate-900">{formatMoney(p.amount, p.currency)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
