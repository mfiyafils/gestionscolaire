import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/actions/auth";
import { Shell } from "@/components/Shell";
import { requireSchoolAccess } from "@/lib/auth";
import { LEVELS, LEVEL_INFO, STATUS_INFO, formulaLabel, hasLevel } from "@/lib/constants";
import { getSchoolById } from "@/lib/data";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId: raw } = await params;
  const schoolId = Number(raw);
  if (!Number.isInteger(schoolId) || schoolId <= 0) notFound();
  const session = await requireSchoolAccess(schoolId);
  const school = await getSchoolById(schoolId);
  if (!school) notFound();
  const isAdmin = session.role === "admin";

  if (!isAdmin && school.status !== "actif") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="card max-w-lg text-center">
          <div className="text-5xl">⛔</div>
          <h1 className="mt-4 font-display text-xl font-bold text-board">Accès {STATUS_INFO[school.status].label.toLowerCase()}</h1>
          <p className="mt-2 text-sm text-slate-600">
            L&apos;abonnement de <b>{school.name}</b> est actuellement <b>{STATUS_INFO[school.status].label.toLowerCase()}</b>.
            Vos données sont conservées. Contactez la Direction Générale pour votre réadmission.
          </p>
          <form action={logout} className="mt-6">
            <button type="submit" className="btn-secondary">
              Retour à l&apos;accueil
            </button>
          </form>
        </div>
      </main>
    );
  }

  const base = `/ecoles/${schoolId}`;

  return (
    <Shell
      theme="school"
      title={school.name}
      subtitle={formulaLabel(school)}
      roleLabel={isAdmin ? "Vue Direction Générale" : "École abonnée"}
      userLabel={session.email}
      back={isAdmin ? { href: "/admin/abonnes", label: "← Retour à la Direction Générale" } : undefined}
      sections={[
        {
          items: [
            { href: base, label: "Accueil", icon: "🏠", exact: true },
            { href: `${base}/eleves`, label: "Liste des élèves", icon: "🧑‍🎓" },
            { href: `${base}/numeros-officiels`, label: "Numéros officiels", icon: "🔢" },
            { href: `${base}/paiements`, label: "Paiements & reçus", icon: "🧾" },
          ],
        },
        {
          title: "Blocs pédagogiques",
          items: LEVELS.map((level) => ({
            href: `${base}/niveaux/${level}`,
            label: `Bloc ${LEVEL_INFO[level].label}`,
            icon: LEVEL_INFO[level].emoji,
            locked: !hasLevel(school, level),
          })),
        },
      ]}
    >
      {isAdmin && school.status !== "actif" && (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 no-print">
          ⚠️ Cet abonnement est <b>{STATUS_INFO[school.status].label.toLowerCase()}</b> : l&apos;école ne peut pas se connecter tant
          qu&apos;elle n&apos;est pas réadmise.{" "}
          <Link href={`/admin/abonnes/${schoolId}`} className="font-semibold underline">
            Gérer l&apos;abonné
          </Link>
        </div>
      )}
      {children}
    </Shell>
  );
}
