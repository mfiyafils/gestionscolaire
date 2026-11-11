import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState, LevelBadge, WhatsAppLink } from "@/components/ui";
import type { StudentRow } from "@/lib/data";
import { formatDate, fullName, normalizePhone, whatsappUrl } from "@/lib/utils";

export function StudentsTable({
  rows,
  showSchool = false,
  emptyAction,
}: {
  rows: StudentRow[];
  showSchool?: boolean;
  emptyAction?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="🧑‍🎓"
        title="Aucun élève trouvé"
        text="Les élèves enregistrés apparaissent ici avec leur numéro officiel et leur classe."
        action={emptyAction}
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="tbl">
        <thead>
          <tr>
            <th>N° officiel</th>
            <th>Élève</th>
            {showSchool && <th>École</th>}
            <th>Classe</th>
            <th>Parent / Tuteur</th>
            <th>Inscrit le</th>
            <th>Statut</th>
            <th className="no-print text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const phone = normalizePhone(s.parentPhone, s.schoolCountryCode);
            const href = `/ecoles/${s.schoolId}/eleves/${s.id}`;
            return (
              <tr key={s.id} className="hover:bg-slate-50/70">
                <td>
                  <Link href={href} className="font-mono text-xs font-bold text-indigo-700 hover:underline">
                    {s.officialNumber}
                  </Link>
                </td>
                <td>
                  <Link href={href} className="font-semibold text-slate-900 hover:underline">
                    {fullName(s)}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {s.gender === "F" ? "Fille" : "Garçon"}
                    {s.birthDate ? ` · né(e) le ${formatDate(s.birthDate, "short")}` : ""}
                  </div>
                </td>
                {showSchool && (
                  <td>
                    <Link href={`/ecoles/${s.schoolId}`} className="text-slate-700 hover:underline">
                      {s.schoolName}
                    </Link>
                    <div className="font-mono text-[11px] text-slate-400">{s.schoolCode}</div>
                  </td>
                )}
                <td>
                  <div className="font-medium text-slate-800">{s.className ?? "Sans classe"}</div>
                  <div className="mt-1">
                    <LevelBadge level={s.level} />
                  </div>
                </td>
                <td>
                  <div className="text-slate-800">{s.parentName ?? "—"}</div>
                  <div className="text-xs text-slate-500">{s.parentPhone ?? ""}</div>
                </td>
                <td className="whitespace-nowrap text-slate-600">{formatDate(s.createdAt, "short")}</td>
                <td>
                  {s.status === "actif" ? (
                    <span className="badge bg-emerald-100 text-emerald-700">Actif</span>
                  ) : (
                    <span className="badge bg-slate-200 text-slate-600">Inactif</span>
                  )}
                </td>
                <td className="no-print">
                  <div className="flex justify-end gap-2">
                    {phone && (
                      <WhatsAppLink
                        href={whatsappUrl(phone, `Bonjour ${s.parentName ?? ""}, message de l'école ${s.schoolName} concernant l'élève ${fullName(s)} (N° ${s.officialNumber}).`)}
                        className="btn-whatsapp btn-sm"
                      >
                        💬
                      </WhatsAppLink>
                    )}
                    <Link href={href} className="btn-secondary btn-sm">
                      Fiche
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Registre des numéros officiels : vue synchronisée (même source) de la liste des élèves. */
export function RegistryTable({ rows, showSchool = false }: { rows: StudentRow[]; showSchool?: boolean }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="🔢"
        title="Aucun numéro officiel attribué"
        text="Chaque élève enregistré reçoit automatiquement un numéro officiel qui apparaît ici."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
      <table className="tbl">
        <thead>
          <tr>
            <th>N°</th>
            <th>Numéro officiel</th>
            <th>Nom complet de l&apos;élève</th>
            <th>Sexe</th>
            {showSchool && <th>École</th>}
            <th>Classe</th>
            <th>Niveau</th>
            <th>Date d&apos;attribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, index) => (
            <tr key={s.id}>
              <td className="text-slate-400">{index + 1}</td>
              <td>
                <Link href={`/ecoles/${s.schoolId}/eleves/${s.id}`} className="font-mono text-sm font-bold text-indigo-700 hover:underline">
                  {s.officialNumber}
                </Link>
              </td>
              <td className="font-semibold text-slate-900">{fullName(s)}</td>
              <td>{s.gender}</td>
              {showSchool && <td>{s.schoolName}</td>}
              <td>{s.className ?? "Sans classe"}</td>
              <td>
                <LevelBadge level={s.level} />
              </td>
              <td className="whitespace-nowrap">{formatDate(s.createdAt, "short")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
