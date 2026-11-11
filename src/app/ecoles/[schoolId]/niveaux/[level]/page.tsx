import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { createClass } from "@/actions/students";
import { SubmitButton } from "@/components/client";
import { EmptyState, Flash, PageHeader, StatCard } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { DEFAULT_CLASSES, LEVEL_INFO, hasLevel, isLevel } from "@/lib/constants";
import { getSchoolById, listClasses, listStudents } from "@/lib/data";
import { cn, formatDate, fullName } from "@/lib/utils";

export default async function LevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string; level: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { schoolId: raw, level } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  if (!isLevel(level)) notFound();
  const { school } = await requireSchoolPage(schoolId);
  const info = LEVEL_INFO[level];
  const base = `/ecoles/${schoolId}`;
  const unlocked = hasLevel(school, level);

  if (!unlocked) {
    const session = await getSession();
    return (
      <>
        <PageHeader eyebrow="Module verrouillé" title={`Bloc ${info.label}`} subtitle={info.description} />
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <div className="pointer-events-none select-none grayscale opacity-50" aria-hidden>
            <div className="grid gap-4 bg-white p-6 md:grid-cols-3">
              {DEFAULT_CLASSES[level].map((name) => (
                <div key={name} className="rounded-xl bg-slate-100 p-4">
                  <p className="font-semibold text-slate-700">{name}</p>
                  <p className="text-xs text-slate-500">Liste des élèves · numéros officiels · reçus</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center bg-slate-900/40 backdrop-blur-[2px]">
            <div className="card max-w-md text-center">
              <div className="text-4xl">🔒</div>
              <h2 className="mt-3 font-display text-lg font-bold text-board">Module {info.label} non inclus dans votre formule</h2>
              <p className="mt-2 text-sm text-slate-600">
                Ce bloc est visible mais verrouillé. Pour l&apos;activer, contactez la Direction Générale afin de compléter
                votre abonnement.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href={base} className="btn-secondary">
                  ← Retour à l&apos;accueil
                </Link>
                {session?.role === "admin" && (
                  <Link href={`/admin/abonnes/${schoolId}`} className="btn-primary">
                    Activer ce module (formule)
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const [classes, students] = await Promise.all([listClasses(schoolId, level), listStudents({ schoolId, level, order: "nom" })]);
  const boys = students.filter((s) => s.gender === "M").length;

  return (
    <>
      <PageHeader
        eyebrow="Bloc pédagogique"
        title={`${info.emoji} Bloc ${info.label}`}
        subtitle={info.description}
        actions={
          <>
            <Link href={`${base}/eleves/nouveau?niveau=${level}&retour=${encodeURIComponent(`${base}/niveaux/${level}`)}`} className="btn-school">
              ➕ Nouvel élève ({info.label})
            </Link>
            <Link href={`${base}/numeros-officiels?niveau=${level}`} className="btn-secondary">
              🔢 Numéros officiels
            </Link>
          </>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={info.emoji} tone={level === "maternel" ? "rose" : level === "primaire" ? "amber" : "sky"} label={`Élèves au ${info.label}`} value={students.length} hint={`${boys} garçons · ${students.length - boys} filles`} />
        <StatCard icon="🏷️" tone="indigo" label="Classes" value={classes.length} />
        <StatCard icon="🔢" tone="emerald" label="Numéros officiels" value={students.length} hint="synchronisés avec la liste" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-board">Classes du bloc</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`${base}/niveaux/${level}/classes/${c.id}`}
              className={cn("flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 transition hover:shadow-md", info.ring)}
            >
              <div>
                <p className="font-display font-bold text-board">{c.name}</p>
                <p className="text-xs text-slate-500">{c.studentCount} élève(s) · ouvrir la liste</p>
              </div>
              <span className={cn("grid h-10 w-10 place-items-center rounded-xl text-lg font-extrabold text-white", info.accent)}>{c.studentCount}</span>
            </Link>
          ))}
          <form action={createClass.bind(null, schoolId, level)} className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-4">
            <input name="name" required placeholder={`Nouvelle classe (ex. ${DEFAULT_CLASSES[level][0]} B)`} className="input" />
            <SubmitButton className="btn-secondary shrink-0" pendingText="…">
              ➕
            </SubmitButton>
          </form>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-board">Élèves par classe</h2>
        {students.length === 0 ? (
          <EmptyState
            icon={info.emoji}
            title={`Aucun élève au ${info.label} pour le moment`}
            text="Enregistrez un élève : il sera automatiquement intégré à la liste de sa classe et recevra son numéro officiel."
            action={
              <Link href={`${base}/eleves/nouveau?niveau=${level}`} className="btn-school">
                ➕ Enregistrer un élève
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {classes
              .filter((c) => students.some((s) => s.classId === c.id))
              .map((c) => (
                <div key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                  <div className={cn("flex items-center justify-between px-5 py-3", info.soft)}>
                    <h3 className="font-display font-bold text-board">
                      {c.name} <span className="text-sm font-normal text-slate-500">· {c.studentCount} élève(s)</span>
                    </h3>
                    <Link href={`${base}/niveaux/${level}/classes/${c.id}`} className="text-sm font-semibold text-slate-700 hover:underline">
                      Ouvrir la classe →
                    </Link>
                  </div>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>N° officiel</th>
                        <th>Élève</th>
                        <th>Sexe</th>
                        <th>Parent</th>
                        <th>Inscrit le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter((s) => s.classId === c.id)
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70">
                            <td className="font-mono text-xs font-bold text-indigo-700">{s.officialNumber}</td>
                            <td>
                              <Link href={`${base}/eleves/${s.id}`} className="font-semibold text-slate-900 hover:underline">
                                {fullName(s)}
                              </Link>
                            </td>
                            <td>{s.gender}</td>
                            <td>
                              {s.parentName ?? "—"} <span className="text-xs text-slate-500">{s.parentPhone ?? ""}</span>
                            </td>
                            <td className="whitespace-nowrap">{formatDate(s.createdAt, "short")}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
            {students.some((s) => !s.classId) && (
              <p className="text-xs text-slate-500">
                {students.filter((s) => !s.classId).length} élève(s) sans classe attribuée (classe supprimée) — modifiez leur fiche pour les réaffecter.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
