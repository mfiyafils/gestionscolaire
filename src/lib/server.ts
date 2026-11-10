import { db } from "@/db";
import { tenants, classes, students, payments, subjects, grades, staff, waLogs, updates, subRequests } from "@/db/schema";
import { parseStructures } from "@/lib/core";
import { and, desc, eq } from "drizzle-orm";

/** Full isolated snapshot for one tenant. Never leaks another tenant's rows. */
export async function getTenantData(tenantId: string) {
  const [t, cls, allStu, pay, sub, gr, stf, logs, upd] = await Promise.all([
    db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1),
    db.select().from(classes).where(eq(classes.tenantId, tenantId)).orderBy(classes.createdAt),
    db.select().from(students).where(eq(students.tenantId, tenantId)).orderBy(students.createdAt),
    db.select().from(payments).where(eq(payments.tenantId, tenantId)).orderBy(desc(payments.createdAt)),
    db.select().from(subjects).where(eq(subjects.tenantId, tenantId)).orderBy(subjects.position),
    db.select().from(grades).where(eq(grades.tenantId, tenantId)),
    db.select().from(staff).where(eq(staff.tenantId, tenantId)).orderBy(desc(staff.createdAt)),
    db.select().from(waLogs).where(eq(waLogs.tenantId, tenantId)).orderBy(desc(waLogs.createdAt)).limit(100),
    db.select().from(updates).where(eq(updates.status, "deployed")).orderBy(desc(updates.deployedAt)).limit(1),
  ]);
  const tenant = t[0];
  if (!tenant) return null;
  const activeStudents = allStu.filter((s) => !s.archived);
  const archivedStudents = allStu.filter((s) => s.archived);
  const structures = parseStructures(tenant.structures || tenant.structure);
  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
      plan: tenant.plan,
      structure: tenant.structure,
      structures,
      createdByAdmin: tenant.createdByAdmin,
      isSandbox: tenant.isSandbox,
      seenVersion: tenant.seenVersion,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      createdAt: tenant.createdAt,
    },
    classes: cls,
    students: activeStudents,
    archivedStudents,
    payments: pay,
    subjects: sub,
    grades: gr,
    staff: stf,
    waLogs: logs,
    latestUpdate: upd[0] ?? null,
  };
}

/** Admin console data: subscription metadata ONLY — no student/grade/payment/staff rows. */
export async function getAdminData() {
  const [ts, reqs, upds] = await Promise.all([
    db.select().from(tenants).where(eq(tenants.isSandbox, false)).orderBy(desc(tenants.createdAt)),
    db.select().from(subRequests).orderBy(desc(subRequests.createdAt)),
    db.select().from(updates).orderBy(desc(updates.createdAt)),
  ]);
  return {
    tenants: ts.map(({ passwordHash: _ph, ...rest }) => ({
      ...rest,
      structures: parseStructures(rest.structures || rest.structure),
    })),
    requests: reqs,
    updates: upds,
  };
}

export async function nextMatricule(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db
    .select({ matricule: students.matricule })
    .from(students)
    .where(eq(students.tenantId, tenantId));
  const prefix = `MAT-${year}-`;
  let max = 0;
  for (const r of rows) {
    if (r.matricule.startsWith(prefix)) {
      const n = parseInt(r.matricule.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function nextReceiptNo(tenantId: string, offset = 0): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db
    .select({ receiptNo: payments.receiptNo })
    .from(payments)
    .where(eq(payments.tenantId, tenantId));
  const prefix = `REC-${year}-`;
  let max = 0;
  for (const r of rows) {
    if (r.receiptNo.startsWith(prefix)) {
      const n = parseInt(r.receiptNo.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1 + offset).padStart(3, "0")}`;
}

export async function studentWithClass(tenantId: string, studentId: string) {
  const rows = await db
    .select()
    .from(students)
    .where(and(eq(students.tenantId, tenantId), eq(students.id, studentId)))
    .limit(1);
  return rows[0] ?? null;
}