import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { createStudent, deleteClass } from "@/actions/students";
import { ConfirmButton, PrintButton } from "@/components/client";
import { StudentForm } from "@/components/StudentForm";
import { StudentsTable } from "@/components/StudentsTable";
import { BackLink, Flash, PageHeader } from "@/components/ui";
import { LEVEL_INFO, hasLevel, isLevel, schoolLevels } from "@/lib/constants";
import { getClass, getSchoolById, listClasses, listStudents } from "@/lib/data";

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string; level: string; classId: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { schoolId: raw, level, classId: rawClass } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  if (!isLevel(level)) notFound();
  const { school } = await requireSchoolPage(schoolId);
  const cls = await getClass(schoolId, Number(rawClass));
  if (!cls) notFound();
  if (cls.level !== level) redirect(`/ecoles/${schoolId}/niveaux/${cls.level}/classes/${cls.id}`);
  const base = `/ecoles/${schoolId}`;
  if (!hasLevel(school, level)) redirect(`${base}/niveaux/${level}`);

  const [students, classes] = await Promise.all([listStudents({ schoolId, classId: cls.id, order: "nom" }), listClasses(schoolId)]);
  const here = `${base}/niveaux/${level}/classes/${cls.id}`;
  const info = LEVEL_INFO[level];

  return (
    <>
      <BackLink href={`${base}/niveaux/${level}`}>Bloc {info.label}</BackLink>
      <PageHeader
        eyebrow={`${info.emoji} Bloc ${info.label}`}
        title={cls.name}
        subtitle={`${students.length} élève(s) inscrit(s) · chaque élève dispose de son numéro officiel.`}
        actions={
          <>
            <PrintButton>🖨️ Imprimer la liste</PrintButton>
            <Link href={`${base}/numeros-officiels?classe=${cls.id}`} className="btn-secondary">
              🔢 Numéros officiels
            </Link>
            <a href="#ajouter" className="btn-school">
              ➕ Ajouter un élève
            </a>
          </>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <div className="mb-3 hidden print:block">
        <h2 className="text-lg font-bold">
          {school.name} — Liste des élèves · {cls.name} ({info.label})
        </h2>
      </div>

      <StudentsTable rows={students} />

      <section id="ajouter" className="card mt-8">
        <h2 className="font-display text-lg font-bold text-board">Ajouter un élève dans {cls.name}</h2>
        <p className="mt-1 text-sm text-slate-500">
          L&apos;élève sera intégré à cette classe, au bloc {info.label}, à la liste générale et au registre des numéros officiels.
        </p>
        <div className="mt-5">
          <StudentForm
            action={createStudent.bind(null, schoolId)}
            classes={classes}
            allowedLevels={schoolLevels(school)}
            defaultClassId={cls.id}
            lockClass
            redirectTo={here}
          />
        </div>
      </section>

      {students.length === 0 && (
        <form action={deleteClass.bind(null, schoolId, cls.id)} className="mt-6 flex justify-end no-print">
          <input type="hidden" name="redirectTo" value={here} />
          <ConfirmButton message={`Supprimer la classe « ${cls.name} » ?`} className="btn-danger btn-sm">
            🗑️ Supprimer cette classe vide
          </ConfirmButton>
        </form>
      )}
    </>
  );
}
