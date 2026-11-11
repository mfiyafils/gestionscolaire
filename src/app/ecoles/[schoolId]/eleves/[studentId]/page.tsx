import Link from "next/link";
import { requireSchoolPage } from "@/lib/auth";
import { notFound } from "next/navigation";
import { createPayment } from "@/actions/payments";
import { deleteStudent, updateStudent } from "@/actions/students";
import { ConfirmButton } from "@/components/client";
import { PaymentForm } from "@/components/PaymentForm";
import { StudentForm } from "@/components/StudentForm";
import { BackLink, Flash, LevelBadge, PageHeader, WhatsAppLink } from "@/components/ui";
import { LEVEL_INFO, schoolLevels } from "@/lib/constants";
import { getSchoolById, getStudent, listClasses, listPayments } from "@/lib/data";
import { buildReceiptMessage, formatDate, formatMoney, fullName, normalizePhone, whatsappUrl } from "@/lib/utils";

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string; studentId: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { schoolId: raw, studentId: rawStudent } = await params;
  const sp = await searchParams;
  const schoolId = Number(raw);
  const { school } = await requireSchoolPage(schoolId);
  const student = await getStudent(schoolId, Number(rawStudent));
  if (!student) notFound();
  const [classes, payments] = await Promise.all([listClasses(schoolId), listPayments({ schoolId, studentId: student.id })]);
  const base = `/ecoles/${schoolId}`;
  const here = `${base}/eleves/${student.id}`;
  const phone = normalizePhone(student.parentPhone, school.countryCode);
  const name = fullName(student);
  const info = LEVEL_INFO[student.level];

  return (
    <>
      <BackLink href={`${base}/eleves`}>Liste des élèves</BackLink>
      <PageHeader
        eyebrow="Fiche élève"
        title={name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <LevelBadge level={student.level} />
            <span className="font-medium text-slate-700">{student.className ?? "Sans classe"}</span>
            {student.status === "inactif" && <span className="badge bg-slate-200 text-slate-600">Inactif</span>}
          </span>
        }
        actions={
          <>
            {student.classId && (
              <Link href={`${base}/niveaux/${student.level}/classes/${student.classId}`} className="btn-secondary">
                {info.emoji} Liste de la classe
              </Link>
            )}
            {phone && (
              <WhatsAppLink
                href={whatsappUrl(phone, `Bonjour ${student.parentName ?? ""}, message de l'école ${school.name} concernant l'élève ${name} (N° officiel ${student.officialNumber}).`)}
              >
                💬 WhatsApp parent
              </WhatsAppLink>
            )}
          </>
        }
      />
      <Flash ok={sp.ok} erreur={sp.erreur} />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-6">
          <div className="chalkboard chalk-frame rounded-2xl p-6 text-cream shadow-lg">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber">Numéro officiel</p>
            <p className="mt-2 font-mono text-2xl font-extrabold tracking-wide">{student.officialNumber}</p>
            <p className="mt-2 text-xs text-white/70">
              Attribué le {formatDate(student.createdAt)} · n° {student.officialSeq} du registre de {school.name}
            </p>
            <Link href={`${base}/numeros-officiels`} className="mt-4 inline-block text-xs font-semibold underline">
              Voir le registre des numéros officiels →
            </Link>
          </div>

          <div className="card">
            <h2 className="font-display font-bold text-board">Informations</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Sexe", student.gender === "F" ? "Féminin" : "Masculin"],
                ["Né(e) le", student.birthDate ? `${formatDate(student.birthDate)}${student.birthPlace ? ` à ${student.birthPlace}` : ""}` : "—"],
                ["Parent / Tuteur", student.parentName ?? "—"],
                ["Téléphone", student.parentPhone ?? "—"],
                ["Adresse", student.address ?? "—"],
                ["Statut", student.status === "actif" ? "Actif" : "Inactif"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <form action={deleteStudent.bind(null, schoolId, student.id)} className="card border border-rose-100">
            <h3 className="font-bold text-rose-700">Retirer l&apos;élève</h3>
            <p className="mt-1 text-xs text-slate-500">
              L&apos;élève sera retiré de sa classe, de la liste générale et du registre des numéros officiels. Ses reçus seront supprimés.
            </p>
            <ConfirmButton message={`Retirer définitivement ${name} (${student.officialNumber}) ?`} className="btn-danger btn-sm mt-3">
              🗑️ Retirer l&apos;élève
            </ConfirmButton>
          </form>
        </aside>

        <div className="space-y-6">
          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-board">Paiements & reçus</h2>
              <Link href={`${base}/paiements`} className="text-sm font-semibold text-emerald-700 hover:underline">
                Tous les paiements →
              </Link>
            </div>
            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucun paiement enregistré pour cet élève.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Reçu</th>
                      <th>Motif</th>
                      <th>Montant</th>
                      <th>Date</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const message = buildReceiptMessage({
                        schoolName: school.name,
                        parentName: student.parentName,
                        studentName: name,
                        officialNumber: student.officialNumber,
                        className: student.className,
                        motif: p.motif,
                        period: p.period,
                        amount: p.amount,
                        currency: p.currency,
                        receiptNumber: p.receiptNumber,
                        paidAt: p.paidAt,
                        token: p.token,
                      });
                      return (
                        <tr key={p.id}>
                          <td className="font-mono text-xs font-bold text-indigo-700">{p.receiptNumber}</td>
                          <td>
                            {p.motif}
                            {p.period && <div className="text-xs text-slate-500">{p.period}</div>}
                          </td>
                          <td className="font-bold">{formatMoney(p.amount, p.currency)}</td>
                          <td className="whitespace-nowrap">{formatDate(p.paidAt, "short")}</td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <Link href={`${base}/paiements/${p.id}`} className="btn-secondary btn-sm">
                                Reçu A6
                              </Link>
                              <WhatsAppLink href={whatsappUrl(phone, message)} className="btn-whatsapp btn-sm">
                                💬
                              </WhatsAppLink>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <details className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <summary className="cursor-pointer font-semibold text-slate-800">🧾 Enregistrer un nouveau paiement</summary>
              <div className="mt-4">
                <PaymentForm
                  action={createPayment.bind(null, schoolId)}
                  fixedStudent={{ id: student.id, label: `${name} · ${student.officialNumber}`, parentName: student.parentName }}
                  redirectTo={here}
                />
              </div>
            </details>
          </section>

          <section className="card">
            <h2 className="font-display text-lg font-bold text-board">Modifier la fiche</h2>
            <p className="mt-1 text-sm text-slate-500">
              Toute modification est répercutée automatiquement dans la liste de la classe, la liste générale et le registre des numéros officiels.
            </p>
            <div className="mt-5">
              <StudentForm
                action={updateStudent.bind(null, schoolId, student.id)}
                classes={classes}
                allowedLevels={schoolLevels(school)}
                student={student}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
