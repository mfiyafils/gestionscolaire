import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/client";
import { RegistryTable } from "@/components/StudentsTable";
import { PageHeader, StatCard } from "@/components/ui";
import { LEVELS, LEVEL_INFO, hasLevel, isLevel } from "@/lib/constants";
import { getSchoolById, getSchoolStats, listClasses, listStudents } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function SchoolRegistryPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ niveau?: string; classe?: string; q?: string }>;
}) {
  const { schoolId: raw } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  const { school } = await requireSchoolPage(schoolId);
  const level = isLevel(sp.niveau) ? sp.niveau : undefined;
  const classId = Number(sp.classe) || undefined;
  const q = sp.q?.trim() || undefined;
  const [rows, classes, stats] = await Promise.all([
    listStudents({ schoolId, level, classId, q, order: "numero" }),
    listClasses(schoolId),
    getSchoolStats(schoolId),
  ]);
  const base = `/ecoles/${schoolId}`;
  const lastNumber = rows.length ? rows[rows.length - 1].officialNumber : "—";

  return (
    <>
      <PageHeader
        eyebrow={`Registre officiel · code ${school.code}`}
        title="Liste des numéros officiels"
        subtitle={
          <>
            Registre de <b>{school.name}</b> : chaque élève enregistré y figure automatiquement avec son numéro officiel. Toute
            modification ou ajout dans la liste des élèves est répercuté ici instantanément.
          </>
        }
        actions={
          <>
            <Link href={`${base}/eleves`} className="btn-secondary">
              🧑‍🎓 Liste générale des élèves
            </Link>
            <Link href={`${base}/eleves/nouveau`} className="btn-school">
              ➕ Nouvel élève
            </Link>
            <PrintButton className="btn-primary">🖨️ Imprimer le registre</PrintButton>
          </>
        }
      />

      <div className="grid gap-4 no-print sm:grid-cols-3">
        <StatCard icon="🔢" tone="indigo" label="Numéros attribués" value={stats.total} hint="= élèves enregistrés (synchronisé)" />
        <StatCard icon="🧾" tone="emerald" label="Dernier numéro" value={<span className="font-mono text-lg">{stats.total ? lastNumber : "—"}</span>} hint={`Format : ${school.code}-ANNÉE-0001`} />
        <StatCard
          icon="🧩"
          tone="amber"
          label="Par bloc"
          value={<span className="text-base font-semibold">{LEVELS.filter((l) => hasLevel(school, l)).map((l) => `${LEVEL_INFO[l].short} ${stats.byLevel[l]}`).join(" · ")}</span>}
        />
      </div>

      <form className="card my-6 grid gap-3 no-print sm:grid-cols-[1fr_1fr_1fr_auto]">
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
        <input name="q" defaultValue={q ?? ""} placeholder="Nom ou numéro officiel…" className="input" />
        <button type="submit" className="btn-school">
          Filtrer
        </button>
      </form>

      <div className="mb-3 hidden print:block">
        <h2 className="text-lg font-bold">{school.name} — Registre des numéros officiels</h2>
        <p className="text-xs text-slate-500">
          {rows.length} numéro(s) · édité le {formatDate(new Date())}
        </p>
      </div>

      <RegistryTable rows={rows} />
    </>
  );
}
