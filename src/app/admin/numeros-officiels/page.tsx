import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PrintButton } from "@/components/client";
import { RegistryTable } from "@/components/StudentsTable";
import { PageHeader } from "@/components/ui";
import { LEVELS, LEVEL_INFO, isLevel } from "@/lib/constants";
import { listStudents, listSubscribers } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function AdminRegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ ecole?: string; niveau?: string; q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const schoolId = Number(sp.ecole) || undefined;
  const level = isLevel(sp.niveau) ? sp.niveau : undefined;
  const q = sp.q?.trim() || undefined;
  const [rows, schools] = await Promise.all([listStudents({ schoolId, level, q, order: "numero" }), listSubscribers()]);
  const selectedSchool = schools.find((s) => s.id === schoolId);

  return (
    <>
      <PageHeader
        eyebrow="Registre central"
        title="Liste des numéros officiels"
        subtitle={
          <>
            {rows.length} numéro(s) officiel(s) · <b>synchronisé automatiquement</b> avec la liste des élèves : tout ajout,
            modification ou retrait d&apos;un élève se répercute instantanément ici.
          </>
        }
        actions={
          <>
            <Link href="/admin/eleves" className="btn-secondary">
              🧑‍🎓 Liste générale des élèves
            </Link>
            <PrintButton className="btn-primary">🖨️ Imprimer le registre</PrintButton>
          </>
        }
      />

      <form className="card mb-6 grid gap-3 no-print sm:grid-cols-[1fr_1fr_1fr_auto]">
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
        <input name="q" defaultValue={q ?? ""} placeholder="Nom ou numéro officiel…" className="input" />
        <button type="submit" className="btn-primary">
          Filtrer
        </button>
      </form>

      <div className="mb-3 hidden print:block">
        <h2 className="text-lg font-bold">Registre des numéros officiels{selectedSchool ? ` — ${selectedSchool.name}` : ""}</h2>
        <p className="text-xs text-slate-500">Édité le {formatDate(new Date())}</p>
      </div>

      <RegistryTable rows={rows} showSchool={!selectedSchool} />
    </>
  );
}
