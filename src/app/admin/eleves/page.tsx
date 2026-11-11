import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { StudentsTable } from "@/components/StudentsTable";
import { PageHeader } from "@/components/ui";
import { LEVELS, LEVEL_INFO, isLevel } from "@/lib/constants";
import { listStudents, listSubscribers } from "@/lib/data";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ ecole?: string; niveau?: string; q?: string; tri?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const schoolId = Number(sp.ecole) || undefined;
  const level = isLevel(sp.niveau) ? sp.niveau : undefined;
  const q = sp.q?.trim() || undefined;
  const order = sp.tri === "nom" ? "nom" : sp.tri === "recent" ? "recent" : "numero";
  const [rows, schools] = await Promise.all([listStudents({ schoolId, level, q, order }), listSubscribers()]);

  return (
    <>
      <PageHeader
        eyebrow="Vue Direction Générale"
        title="Tous les élèves"
        subtitle={`${rows.length} élève(s) · chaque élève est lié à son école, sa classe, son bloc et son numéro officiel.`}
        actions={
          <Link href="/admin/numeros-officiels" className="btn-secondary">
            🔢 Registre des numéros officiels
          </Link>
        }
      />

      <form className="card mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <select name="ecole" defaultValue={schoolId ?? ""} className="input">
          <option value="">Toutes les écoles</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        <select name="niveau" defaultValue={level ?? ""} className="input">
          <option value="">Tous les blocs</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_INFO[l].label}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q ?? ""} placeholder="Nom, numéro officiel, parent…" className="input" />
        <select name="tri" defaultValue={order} className="input">
          <option value="numero">Tri : numéro officiel</option>
          <option value="nom">Tri : nom</option>
          <option value="recent">Tri : plus récents</option>
        </select>
        <button type="submit" className="btn-primary">
          Filtrer
        </button>
      </form>

      <StudentsTable rows={rows} showSchool />
    </>
  );
}
