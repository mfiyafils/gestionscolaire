"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, type Gender, type Level, type StudentStatus } from "@/db/schema";
import { requireSchoolAccess } from "@/lib/auth";
import { LEVEL_INFO, hasLevel } from "@/lib/constants";
import { getClass, getSchoolById } from "@/lib/data";
import { capitalizeWords, formatOfficialNumber, optional, str } from "@/lib/utils";

function bust() {
  revalidatePath("/admin", "layout");
  revalidatePath("/ecoles", "layout");
}

function flash(path: string, kind: "ok" | "erreur", message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${kind}=${encodeURIComponent(message)}`;
}

function parseStudentForm(formData: FormData) {
  const gender: Gender = str(formData, "gender") === "F" ? "F" : "M";
  const status: StudentStatus = str(formData, "status") === "inactif" ? "inactif" : "actif";
  const classId = Number(str(formData, "classId")) || 0;
  const middle = optional(formData, "middleName");
  return {
    classId,
    fields: {
      lastName: str(formData, "lastName").toUpperCase(),
      middleName: middle ? middle.toUpperCase() : null,
      firstName: capitalizeWords(str(formData, "firstName")),
      gender,
      birthDate: optional(formData, "birthDate"),
      birthPlace: optional(formData, "birthPlace"),
      parentName: optional(formData, "parentName"),
      parentPhone: optional(formData, "parentPhone"),
      address: optional(formData, "address"),
      status,
    },
  };
}

/* ---------------- Classes ---------------- */

export async function createClass(schoolId: number, level: Level, formData: FormData): Promise<void> {
  await requireSchoolAccess(schoolId);
  const school = await getSchoolById(schoolId);
  if (!school) notFound();
  const back = `/ecoles/${schoolId}/niveaux/${level}`;
  if (!hasLevel(school, level)) redirect(flash(back, "erreur", "Ce module n'est pas inclus dans votre formule."));
  const name = str(formData, "name");
  if (!name) redirect(flash(back, "erreur", "Indiquez le nom de la classe."));
  const [m] = await db
    .select({ max: sql<number>`coalesce(max(${classes.sortOrder}), 0)`.mapWith(Number) })
    .from(classes)
    .where(and(eq(classes.schoolId, schoolId), eq(classes.level, level)));
  await db.insert(classes).values({ schoolId, level, name, sortOrder: m.max + 1 });
  bust();
  redirect(flash(back, "ok", `La classe « ${name} » a été créée.`));
}

export async function deleteClass(schoolId: number, classId: number, formData: FormData): Promise<void> {
  await requireSchoolAccess(schoolId);
  const cls = await getClass(schoolId, classId);
  if (!cls) notFound();
  const back = str(formData, "redirectTo") || `/ecoles/${schoolId}/niveaux/${cls.level}`;
  const [c] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(students)
    .where(eq(students.classId, classId));
  if (c.n > 0) {
    redirect(flash(back, "erreur", "Impossible de supprimer une classe qui contient encore des élèves."));
  }
  await db.delete(classes).where(eq(classes.id, classId));
  bust();
  redirect(flash(`/ecoles/${schoolId}/niveaux/${cls.level}`, "ok", `La classe « ${cls.name} » a été supprimée.`));
}

/* ---------------- Élèves ---------------- */

export async function createStudent(schoolId: number, formData: FormData): Promise<void> {
  await requireSchoolAccess(schoolId);
  const school = await getSchoolById(schoolId);
  if (!school) notFound();
  const redirectTo = str(formData, "redirectTo");
  const back = str(formData, "errorTo") || redirectTo || `/ecoles/${schoolId}/eleves/nouveau`;
  const data = parseStudentForm(formData);
  if (!data.fields.lastName || !data.fields.firstName) {
    redirect(flash(back, "erreur", "Le nom et le prénom de l'élève sont obligatoires."));
  }
  if (!data.classId) redirect(flash(back, "erreur", "Veuillez choisir la classe de l'élève."));
  const cls = await getClass(schoolId, data.classId);
  if (!cls) redirect(flash(back, "erreur", "Classe introuvable pour cet établissement."));
  if (!hasLevel(school, cls.level)) {
    redirect(flash(back, "erreur", `Le module ${LEVEL_INFO[cls.level].label} n'est pas inclus dans la formule de l'école.`));
  }

  const year = new Date().getFullYear();
  const created = await db.transaction(async (tx) => {
    // Verrou par établissement : numéro officiel séquentiel garanti sans doublon.
    await tx.execute(sql`select pg_advisory_xact_lock(${schoolId}::bigint)`);
    const [m] = await tx
      .select({ max: sql<number>`coalesce(max(${students.officialSeq}), 0)`.mapWith(Number) })
      .from(students)
      .where(eq(students.schoolId, schoolId));
    const seq = m.max + 1;
    const [row] = await tx
      .insert(students)
      .values({
        schoolId,
        classId: cls.id,
        level: cls.level,
        officialSeq: seq,
        officialNumber: formatOfficialNumber(school.code, year, seq),
        ...data.fields,
      })
      .returning({ id: students.id, officialNumber: students.officialNumber });
    return row;
  });
  bust();
  const destination = redirectTo && !redirectTo.includes("/nouveau") ? redirectTo : `/ecoles/${schoolId}/eleves/${created.id}`;
  redirect(flash(destination, "ok", `Élève enregistré avec le numéro officiel ${created.officialNumber}.`));
}

export async function updateStudent(schoolId: number, studentId: number, formData: FormData): Promise<void> {
  await requireSchoolAccess(schoolId);
  const school = await getSchoolById(schoolId);
  if (!school) notFound();
  const back = `/ecoles/${schoolId}/eleves/${studentId}`;
  const data = parseStudentForm(formData);
  if (!data.fields.lastName || !data.fields.firstName) {
    redirect(flash(back, "erreur", "Le nom et le prénom de l'élève sont obligatoires."));
  }
  if (!data.classId) redirect(flash(back, "erreur", "Veuillez choisir la classe de l'élève."));
  const cls = await getClass(schoolId, data.classId);
  if (!cls) redirect(flash(back, "erreur", "Classe introuvable pour cet établissement."));
  if (!hasLevel(school, cls.level)) {
    redirect(flash(back, "erreur", `Le module ${LEVEL_INFO[cls.level].label} n'est pas inclus dans la formule de l'école.`));
  }
  await db
    .update(students)
    .set({ ...data.fields, classId: cls.id, level: cls.level, updatedAt: new Date() })
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));
  bust();
  redirect(flash(back, "ok", "La fiche de l'élève a été mise à jour (numéro officiel conservé)."));
}

export async function deleteStudent(schoolId: number, studentId: number, _formData: FormData): Promise<void> {
  await requireSchoolAccess(schoolId);
  const [row] = await db
    .select({ officialNumber: students.officialNumber, lastName: students.lastName, firstName: students.firstName })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);
  if (!row) notFound();
  await db.delete(students).where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)));
  bust();
  redirect(
    flash(
      `/ecoles/${schoolId}/eleves`,
      "ok",
      `L'élève ${row.lastName} ${row.firstName} (${row.officialNumber}) a été retiré de la liste et du registre des numéros officiels.`,
    ),
  );
}
