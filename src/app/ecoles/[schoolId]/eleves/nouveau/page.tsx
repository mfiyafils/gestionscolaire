import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { createStudent } from "@/actions/students";
import { StudentForm } from "@/components/StudentForm";
import { BackLink, EmptyState, Flash, PageHeader } from "@/components/ui";
import { LEVEL_INFO, isLevel, schoolLevels } from "@/lib/constants";
import { getSchoolById, listClasses } from "@/lib/data";

export default async function NewStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ niveau?: string; classe?: string; retour?: string; ok?: string; erreur?: string }>;
}) {
  const { schoolId: raw } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  const { school } = await requireSchoolPage(schoolId);
  const classes = await listClasses(schoolId);
  const allowed = schoolLevels(school);
  const base = `/ecoles/${schoolId}`;
  const level = isLevel(sp.niveau) && allowed.includes(sp.niveau) ? sp.niveau : undefined;
  const requestedClass = Number(sp.classe) || undefined;
  const defaultClassId = requestedClass ?? (level ? classes.find((c) => c.level === level)?.id : undefined);
  const retour = sp.retour && sp.retour.startsWith(base) ? sp.retour : undefined;
  const selfPath = `${base}/eleves/nouveau${level ? `?niveau=${level}` : ""}`;

  return (
    <>
      <BackLink href={retour ?? `${base}/eleves`}>Retour</BackLink>
      <PageHeader
        eyebrow="Inscription"
        title="Nouvel élève"
        subtitle={
          <>
            L&apos;élève sera intégré dans la liste de sa classe et de son bloc{level ? ` (${LEVEL_INFO[level].label})` : ""}, dans la
            liste générale et recevra automatiquement son <b>numéro officiel</b>.
          </>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      {allowed.length === 0 || classes.length === 0 ? (
        <EmptyState
          icon="🔒"
          title="Aucun module actif"
          text="Votre formule ne comporte aucun bloc actif. Contactez la Direction Générale."
          action={
            <Link href={base} className="btn-secondary">
              Retour à l&apos;accueil
            </Link>
          }
        />
      ) : (
        <div className="card">
          <StudentForm
            action={createStudent.bind(null, schoolId)}
            classes={classes}
            allowedLevels={allowed}
            defaultClassId={defaultClassId}
            redirectTo={retour ?? selfPath}
            errorTo={`${selfPath}${selfPath.includes("?") ? "&" : "?"}${retour ? `retour=${encodeURIComponent(retour)}` : ""}`}
          />
        </div>
      )}
    </>
  );
}
