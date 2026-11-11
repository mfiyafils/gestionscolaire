import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/client";
import { StudentsTable } from "@/components/StudentsTable";
import { Flash, PageHeader } from "@/components/ui";
import { LEVELS, LEVEL_INFO, hasLevel, isLevel } from "@/lib/constants";
import { getSchoolById, listClasses, listStudents } from "@/lib/data";

export default async function SchoolStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ niveau?: string; classe?: string; q?: string; tri?: string; ok?: string; erreur?: string }>;
}) {
  const { schoolId: raw } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  const { school } = await requireSchoolPage(schoolId);
  const level = isLevel(sp.niveau) ? sp.niveau : undefined;
  const classId = Number(sp.classe) || undefined;
  const q = sp.q?.trim() || undefined;
  const order = sp.tri === "nom" ? "nom" : sp.tri === "recent" ? "recent" : "numero";
  const [rows, classes] = await Promise.all([listStudents({ schoolId, level, classId, q, order }), listClasses(schoolId)]);
  const base = `/ecoles/${schoolId}`;

  return (
    <>
      <PageHeader
        eyebrow="Liste générale"
        title="Liste des élèves"
        subtitle={
          <>
            {rows.length} élève(s) · chaque élève a son <b>numéro officiel</b> associé ; la liste des numéros officiels est
            synchronisée automatiquement.
          </>
        }
        actions={
          <>
            <PrintButton>🖨️ Imprimer</PrintButton>
            <Link href={`${base}/numeros-officiels`} className="btn-secondary">
              🔢 Numéros officiels
            </Link>
            <Link href={`${base}/eleves/nouveau`} className="btn-school">
              ➕ Nouvel élève
            </Link>
          </>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <form className="card mb-6 grid gap-3 no-print sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <select name="niveau" defaultValue={level ?? ""} className="input">
          <option value="">Tous les blocs</option>
          {LEVELS.map((l) => (
            <option key={l} value={l} disabled={!hasLevel(school, l)}>
              {LEVEL_INFO[l].label}
              {!hasLevel(school, l) ? " (verrouillé)" : ""}
            </option>
          ))}
        </select>
        <select name="classe" defaultValue={classId ?? ""} className="input">
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({LEVEL_INFO[c.level].short})
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q ?? ""} placeholder="Nom, numéro officiel, parent, téléphone…" className="input" />
        <select name="tri" defaultValue={order} className="input">
          <option value="numero">Tri : numéro officiel</option>
          <option value="nom">Tri : nom</option>
          <option value="recent">Tri : plus récents</option>
        </select>
        <button type="submit" className="btn-school">
          Filtrer
        </button>
      </form>

      <div className="mb-3 hidden print:block">
        <h2 className="text-lg font-bold">{school.name} — Liste des élèves</h2>
      </div>

      <StudentsTable
        rows={rows}
        emptyAction={
          <Link href={`${base}/eleves/nouveau`} className="btn-school">
            ➕ Enregistrer un élève
          </Link>
        }
      />
    </>
  );
}
