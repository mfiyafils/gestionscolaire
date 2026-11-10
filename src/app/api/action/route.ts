import { db } from "@/db";
import { tenants, classes, students, payments, subjects, grades, staff, waLogs, updates, subRequests } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSession, tenantScope, hashPassword, genPassword } from "@/lib/auth";
import { getAdminData, getTenantData, nextMatricule, nextReceiptNo, studentWithClass } from "@/lib/server";
import { ensureSeed } from "@/lib/seed";
import { PLANS, BLOCKS, STRUCTURE, allowedBlocks, parseStructures, serializeStructures, todayISO, type Block } from "@/lib/core";

export const dynamic = "force-dynamic";

const TENANT_ACTIONS = new Set([
  "student.create", "student.update", "student.delete", "student.restore",
  "student.archive", "student.unarchive", "student.deletePermanent",
  "payment.add", "class.create", "class.update", "classes.initStandard", "subject.add", "subject.remove",
  "grades.save", "staff.create", "staff.update", "staff.delete", "wa.log",
  "profile.update", "seen.update", "sandbox.reset",
]);
const ADMIN_ACTIONS = new Set([
  "admin.tenant.create", "admin.tenant.update", "admin.tenant.delete",
  "admin.request", "admin.requests.approveAll",
  "admin.publish", "admin.publish.deploy",
]);

function normalizeStructures(rawStructures: unknown, rawLegacy?: unknown): string {
  const input = rawStructures !== undefined ? rawStructures : rawLegacy;
  const list = parseStructures(Array.isArray(input) ? (input as string[]) : String(input ?? ""));
  return serializeStructures(list);
}
function summaryStructure(csv: string): string {
  const list = parseStructures(csv);
  return list.length === BLOCKS.length ? "all" : list[0];
}

const clampInt = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
};
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

function planEnd(planId: string): Date {
  const p = PLANS.find((x) => x.id === planId) ?? PLANS[0];
  return new Date(Date.now() + p.months * 30 * 86400000);
}

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const p = (body.payload ?? {}) as Record<string, unknown>;
    /* ── Public ── */
    if (action === "public.subscribe") {
      const schoolName = str(p.schoolName);
      const phone = str(p.phone, 30);
      const email = str(p.email);
      if (!schoolName || !phone) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const csv = normalizeStructures(p.structures, p.structure);
      const paymentMethod = p.paymentMethod === "momo" ? "momo" : "orange";
      const paymentRef = str(p.paymentRef, 80);
      const [created] = await db.insert(subRequests).values({
        schoolName, phone, email,
        plan: PLANS.some((x) => x.id === p.plan) ? String(p.plan) : "monthly",
        structure: csv,
        paymentMethod,
        paymentRef,
      }).returning({ id: subRequests.id });
      return Response.json({ ok: true, result: { requestId: created?.id ?? "", structures: parseStructures(csv) } });
    }

    if (action === "public.subscribe.proof") {
      const id = str(p.requestId, 40);
      const paymentMethod = p.paymentMethod === "momo" ? "momo" : "orange";
      const paymentRef = str(p.paymentRef, 80);
      if (!id) return Response.json({ ok: false, error: "missing" }, { status: 400 });
      const rows = await db.select().from(subRequests).where(eq(subRequests.id, id)).limit(1);
      if (!rows[0] || rows[0].status !== "pending") {
        return Response.json({ ok: false, error: "notfound" }, { status: 404 });
      }
      await db.update(subRequests).set({ paymentMethod, paymentRef }).where(eq(subRequests.id, id));
      return Response.json({ ok: true, result: { paymentMethod, paymentRef } });
    }

    /* ── Admin-only ── */
    if (ADMIN_ACTIONS.has(action)) {
      const session = await getSession();
      if (!session || session.role !== "admin") return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
      let result: Record<string, unknown> = {};

      if (action === "admin.tenant.create") {
        const email = str(p.email).toLowerCase();
        const name = str(p.name);
        if (!email || !name) return Response.json({ ok: false, error: "missing" }, { status: 400 });
        const exists = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.email, email)).limit(1);
        if (exists[0]) return Response.json({ ok: false, error: "emailTaken" }, { status: 400 });
        const password = genPassword();
        const plan = PLANS.some((x) => x.id === p.plan) ? String(p.plan) : "monthly";
        const csv = normalizeStructures(p.structures, p.structure);
        await db.insert(tenants).values({
          name, email, phone: str(p.phone, 30), passwordHash: hashPassword(password),
          plan, structure: summaryStructure(csv), structures: csv, createdByAdmin: true,
          status: "active", subscriptionEndsAt: planEnd(plan),
        });
        result = { password, email };
      }

      if (action === "admin.tenant.update") {
        const id = str(p.id, 40);
        const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
        if (!rows[0] || rows[0].isSandbox) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        const patch: Record<string, unknown> = {};
        if (p.status && ["active", "suspended", "revoked"].includes(String(p.status))) {
          patch.status = String(p.status);
          if (p.status === "active") patch.subscriptionEndsAt = planEnd(String(p.plan ?? rows[0].plan));
        }
        // Admin can edit contact details only for subscribers created by the admin
        const wantsContactEdit =
          (p.name !== undefined && str(p.name) !== rows[0].name) ||
          (p.phone !== undefined && str(p.phone, 30) !== rows[0].phone) ||
          (p.email !== undefined && str(p.email).toLowerCase() !== rows[0].email);
        if (wantsContactEdit) {
          if (!rows[0].createdByAdmin) {
            return Response.json({ ok: false, error: "autonomousTenant" }, { status: 403 });
          }
          if (p.name !== undefined && str(p.name)) patch.name = str(p.name, 120);
          if (p.phone !== undefined) patch.phone = str(p.phone, 30);
          if (p.email !== undefined && str(p.email)) patch.email = str(p.email).toLowerCase();
        }
        if (p.plan !== undefined && PLANS.some((x) => x.id === p.plan)) {
          patch.plan = String(p.plan);
          patch.subscriptionEndsAt = planEnd(String(p.plan));
        }
        if (p.structures !== undefined || p.structure !== undefined) {
          const csv = normalizeStructures(p.structures, p.structure);
          patch.structures = csv;
          patch.structure = summaryStructure(csv);
        }
        if (p.resetPassword === true) {
          const password = genPassword();
          patch.passwordHash = hashPassword(password);
          result = { password, email: (patch.email as string) ?? rows[0].email, phone: (patch.phone as string) ?? rows[0].phone, schoolName: (patch.name as string) ?? rows[0].name };
        }
        if (Object.keys(patch).length) await db.update(tenants).set(patch).where(eq(tenants.id, id));
      }

      if (action === "admin.tenant.delete") {
        const id = str(p.id, 40);
        const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
        if (!rows[0] || rows[0].isSandbox) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        await db.delete(tenants).where(eq(tenants.id, id));
      }

      const approveRequest = async (rq: typeof subRequests.$inferSelect) => {
        const email = rq.email.toLowerCase() || `ecole${Date.now()}${Math.floor(Math.random() * 90 + 10)}@scolaria.cm`;
        const csv = normalizeStructures(undefined, rq.structure);
        const exists = await db.select({ id: tenants.id, structures: tenants.structures }).from(tenants).where(eq(tenants.email, email)).limit(1);
        if (!exists[0]) {
          const password = genPassword();
          await db.insert(tenants).values({
            name: rq.schoolName, email, phone: rq.phone, passwordHash: hashPassword(password),
            plan: rq.plan, structure: summaryStructure(csv), structures: csv, createdByAdmin: false,
            status: "active", subscriptionEndsAt: planEnd(rq.plan),
          });
          return { password, email, phone: rq.phone, schoolName: rq.schoolName };
        }
        const merged = serializeStructures([...new Set([...parseStructures(exists[0].structures), ...parseStructures(csv)])]);
        await db.update(tenants).set({
          status: "active", plan: rq.plan, structure: summaryStructure(merged), structures: merged, subscriptionEndsAt: planEnd(rq.plan),
        }).where(eq(tenants.email, email));
        return { email, existing: true };
      };

      if (action === "admin.request") {
        const id = str(p.id, 40);
        const rows = await db.select().from(subRequests).where(eq(subRequests.id, id)).limit(1);
        const rq = rows[0];
        if (!rq) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        const decision = p.decision === "approved" ? "approved" : "rejected";
        await db.update(subRequests).set({ status: decision }).where(eq(subRequests.id, id));
        if (decision === "approved") result = await approveRequest(rq);
      }

      if (action === "admin.requests.approveAll") {
        const pendings = await db.select().from(subRequests).where(eq(subRequests.status, "pending"));
        const approvedList: Record<string, unknown>[] = [];
        for (const rq of pendings) {
          await db.update(subRequests).set({ status: "approved" }).where(eq(subRequests.id, rq.id));
          approvedList.push(await approveRequest(rq));
        }
        result = { count: approvedList.length, approved: approvedList };
      }

      if (action === "admin.publish") {
        const version = str(p.version, 20);
        const titleFr = str(p.titleFr);
        if (!version || !titleFr) return Response.json({ ok: false, error: "missing" }, { status: 400 });
        const status = p.status === "draft" ? "draft" : "deployed";
        await db.insert(updates).values({
          version, titleFr, titleEn: str(p.titleEn) || titleFr,
          notesFr: str(p.notesFr, 2000), notesEn: str(p.notesEn, 2000),
          status, deployedAt: status === "deployed" ? new Date() : null,
        });
        result = { version };
      }

      if (action === "admin.publish.deploy") {
        const id = str(p.id, 40);
        const rows = await db.select().from(updates).where(eq(updates.id, id)).limit(1);
        if (!rows[0]) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        await db.update(updates).set({ status: "deployed", deployedAt: new Date() }).where(eq(updates.id, id));
        result = { version: rows[0].version };
      }

      return Response.json({ ok: true, admin: await getAdminData(), result });
    }

    /* ── Tenant-scoped (admin confined to sandbox) ── */
    if (TENANT_ACTIONS.has(action)) {
      const scope = await tenantScope();
      if (!scope) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      const tid = scope.tenantId;
      let result: Record<string, unknown> = {};

      if (action === "student.create" || action === "student.restore") {
        const clsRows = await db.select().from(classes).where(and(eq(classes.id, str(p.classId, 40)), eq(classes.tenantId, tid))).limit(1);
        const cls = clsRows[0];
        if (!cls) return Response.json({ ok: false, error: "classNotFound" }, { status: 400 });
        const [tRow] = await db.select({ structures: tenants.structures, structure: tenants.structure, isSandbox: tenants.isSandbox }).from(tenants).where(eq(tenants.id, tid)).limit(1);
        const allowed = tRow && !tRow.isSandbox ? allowedBlocks(tRow.structures || tRow.structure) : allowedBlocks("all");
        if (!allowed.includes(cls.block as Block)) {
          return Response.json({ ok: false, error: "blockForbidden" }, { status: 403 });
        }
        const matricule = action === "student.restore" && p.matricule ? str(p.matricule, 30) : await nextMatricule(tid);
        const tuitionTotal = clampInt(p.tuitionTotal ?? cls.tuition, 0, 100000000);
        const paid1 = clampInt(p.paid1, 0, tuitionTotal);
        const paid2 = clampInt(p.paid2, 0, tuitionTotal - paid1);
        const enrolledAt = /^\d{4}-\d{2}-\d{2}$/.test(String(p.enrolledAt)) ? String(p.enrolledAt) : todayISO();
        const [stu] = await db.insert(students).values({
          tenantId: tid, classId: cls.id, matricule,
          lastName: str(p.lastName, 80), firstName: str(p.firstName, 80),
          sex: p.sex === "F" ? "F" : "M",
          birthDate: /^\d{4}-\d{2}-\d{2}$/.test(String(p.birthDate)) ? String(p.birthDate) : "2015-01-01",
          birthPlace: str(p.birthPlace, 80), fatherName: str(p.fatherName, 120), motherName: str(p.motherName, 120),
          whatsapp: str(p.whatsapp, 30), enrolledAt, tuitionTotal, paid1, paid2,
        }).returning();
        const method = ["cash", "orange", "momo"].includes(String(p.method)) ? String(p.method) : "cash";
        if (paid1 > 0) {
          await db.insert(payments).values({ tenantId: tid, studentId: stu.id, receiptNo: await nextReceiptNo(tid), amount: paid1, tranche: 1, method, paidAt: enrolledAt });
        }
        if (paid2 > 0) {
          await db.insert(payments).values({ tenantId: tid, studentId: stu.id, receiptNo: await nextReceiptNo(tid), amount: paid2, tranche: 2, method, paidAt: enrolledAt });
        }
        if (action === "student.restore" && Array.isArray(p.payments)) {
          // restore original payment ledger (undo delete) — replace the synthetic rows
          await db.delete(payments).where(and(eq(payments.tenantId, tid), eq(payments.studentId, stu.id)));
          for (const pay of p.payments as Record<string, unknown>[]) {
            await db.insert(payments).values({
              tenantId: tid, studentId: stu.id, receiptNo: str(pay.receiptNo, 30),
              amount: clampInt(pay.amount, 0, 100000000), tranche: clampInt(pay.tranche, 1, 2),
              method: str(pay.method, 10) || "cash", paidAt: str(pay.paidAt, 10) || enrolledAt,
            });
          }
        }
        if (action === "student.restore" && Array.isArray(p.grades)) {
          for (const gr of p.grades as Record<string, unknown>[]) {
            const subOk = await db.select({ id: subjects.id, classId: subjects.classId }).from(subjects)
              .where(and(eq(subjects.id, str(gr.subjectId, 40)), eq(subjects.tenantId, tid))).limit(1);
            if (subOk[0] && subOk[0].classId === cls.id) {
              await db.insert(grades).values({ tenantId: tid, studentId: stu.id, subjectId: subOk[0].id, term: clampInt(gr.term, 1, 3), value: Number(gr.value) || 0 })
                .catch(() => {});
            }
          }
        }
        if (action === "student.create" && stu.whatsapp) {
          await db.insert(waLogs).values({
            tenantId: tid,
            studentId: stu.id,
            recipientName: `${stu.lastName.toUpperCase()} ${stu.firstName}`,
            phone: stu.whatsapp,
            kind: "enroll",
            message: `Inscription confirmée — ${stu.matricule} (${cls.levelCode})`,
          });
        }
        result = { studentId: stu.id, matricule };
      }

      if (action === "student.update") {
        const id = str(p.id, 40);
        const stu = await studentWithClass(tid, id);
        if (!stu) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        const clsRows = await db.select().from(classes).where(and(eq(classes.id, str(p.classId, 40)), eq(classes.tenantId, tid))).limit(1);
        const tuitionTotal = clampInt(p.tuitionTotal ?? stu.tuitionTotal, 0, 100000000);
        await db.update(students).set({
          classId: clsRows[0]?.id ?? stu.classId,
          lastName: str(p.lastName, 80) || stu.lastName,
          firstName: str(p.firstName, 80) || stu.firstName,
          sex: p.sex === "F" ? "F" : "M",
          birthDate: /^\d{4}-\d{2}-\d{2}$/.test(String(p.birthDate)) ? String(p.birthDate) : stu.birthDate,
          birthPlace: str(p.birthPlace, 80), fatherName: str(p.fatherName, 120), motherName: str(p.motherName, 120),
          whatsapp: str(p.whatsapp, 30),
          enrolledAt: /^\d{4}-\d{2}-\d{2}$/.test(String(p.enrolledAt)) ? String(p.enrolledAt) : stu.enrolledAt,
          tuitionTotal,
        }).where(and(eq(students.id, id), eq(students.tenantId, tid)));
      }

      if (action === "student.delete") {
        const id = str(p.id, 40);
        const stu = await studentWithClass(tid, id);
        if (!stu) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        const pays = await db.select().from(payments).where(and(eq(payments.tenantId, tid), eq(payments.studentId, id)));
        const grs = await db.select().from(grades).where(and(eq(grades.tenantId, tid), eq(grades.studentId, id)));
        await db.delete(students).where(and(eq(students.id, id), eq(students.tenantId, tid)));
        result = { bundle: { student: stu, payments: pays, grades: grs } };
      }

      if (action === "payment.add") {
        const id = str(p.studentId, 40);
        const stu = await studentWithClass(tid, id);
        if (!stu) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        const amount = clampInt(p.amount, 1, 100000000);
        const tranche = clampInt(p.tranche, 1, 2);
        const method = ["cash", "orange", "momo"].includes(String(p.method)) ? String(p.method) : "cash";
        const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(String(p.paidAt)) ? String(p.paidAt) : todayISO();
        const receiptNo = await nextReceiptNo(tid);
        await db.insert(payments).values({ tenantId: tid, studentId: id, receiptNo, amount, tranche, method, paidAt });
        await db.update(students).set(
          tranche === 1 ? { paid1: stu.paid1 + amount } : { paid2: stu.paid2 + amount }
        ).where(and(eq(students.id, id), eq(students.tenantId, tid)));
        result = { receiptNo, amount };
      }

      if (action === "student.archive") {
        const id = str(p.id, 40);
        const stu = await studentWithClass(tid, id);
        if (!stu) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        await db.update(students).set({
          archived: true,
          archiveReason: str(p.reason, 160) || "Archivé",
          archivedAt: new Date(),
        }).where(and(eq(students.id, id), eq(students.tenantId, tid)));
      }

      if (action === "student.unarchive") {
        const id = str(p.id, 40);
        const stu = await studentWithClass(tid, id);
        if (!stu) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        await db.update(students).set({ archived: false, archiveReason: "", archivedAt: null })
          .where(and(eq(students.id, id), eq(students.tenantId, tid)));
      }

      if (action === "student.deletePermanent") {
        const id = str(p.id, 40);
        const stu = await studentWithClass(tid, id);
        if (!stu) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        await db.delete(students).where(and(eq(students.id, id), eq(students.tenantId, tid)));
      }

      if (action === "class.create") {
        const [tRow] = await db.select({ structures: tenants.structures, structure: tenants.structure, isSandbox: tenants.isSandbox }).from(tenants).where(eq(tenants.id, tid)).limit(1);
        const allowed = tRow && !tRow.isSandbox ? allowedBlocks(tRow.structures || tRow.structure) : allowedBlocks("all");
        const block = (["nursery", "primary", "secondary"].includes(String(p.block)) ? String(p.block) : "primary") as Block;
        if (!allowed.includes(block)) return Response.json({ ok: false, error: "blockForbidden" }, { status: 403 });
        const levelCode = str(p.levelCode, 10);
        if (!STRUCTURE[block].levels.some((l) => l.code === levelCode)) {
          return Response.json({ ok: false, error: "invalidLevel" }, { status: 400 });
        }
        const variant = ["general", "technical", "bilingual"].includes(String(p.variant)) ? String(p.variant) : "general";
        const dup = await db.select({ id: classes.id }).from(classes)
          .where(and(eq(classes.tenantId, tid), eq(classes.levelCode, levelCode), eq(classes.variant, variant))).limit(1);
        if (dup[0]) return Response.json({ ok: false, error: "exists" }, { status: 400 });
        const [row] = await db.insert(classes).values({ tenantId: tid, block, levelCode, variant, tuition: clampInt(p.tuition ?? 25000, 0, 100000000) }).returning();
        result = { classId: row.id };
      }

      if (action === "class.update") {
        const id = str(p.id, 40);
        await db.update(classes).set({ tuition: clampInt(p.tuition, 0, 100000000) })
          .where(and(eq(classes.id, id), eq(classes.tenantId, tid)));
      }

      if (action === "classes.initStandard") {
        const [tRow] = await db.select({ structures: tenants.structures, structure: tenants.structure, isSandbox: tenants.isSandbox }).from(tenants).where(eq(tenants.id, tid)).limit(1);
        const allowed = tRow && !tRow.isSandbox ? allowedBlocks(tRow.structures || tRow.structure) : allowedBlocks("all");
        const existing = await db.select({ levelCode: classes.levelCode, variant: classes.variant }).from(classes).where(eq(classes.tenantId, tid));
        const seen = new Set(existing.map((c) => `${c.levelCode}:${c.variant}`));
        for (const b of allowed) {
          const tuition = b === "nursery" ? 20000 : b === "primary" ? 25000 : 35000;
          for (const lv of STRUCTURE[b].levels) {
            if (!seen.has(`${lv.code}:general`)) {
              await db.insert(classes).values({ tenantId: tid, block: b, levelCode: lv.code, variant: "general", tuition });
            }
          }
        }
      }

      if (action === "subject.add") {
        const clsRows = await db.select().from(classes).where(and(eq(classes.id, str(p.classId, 40)), eq(classes.tenantId, tid))).limit(1);
        if (!clsRows[0]) return Response.json({ ok: false, error: "notfound" }, { status: 404 });
        const existing = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.tenantId, tid), eq(subjects.classId, clsRows[0].id)));
        const nameFr = str(p.nameFr, 80);
        if (!nameFr) return Response.json({ ok: false, error: "missing" }, { status: 400 });
        await db.insert(subjects).values({
          tenantId: tid, classId: clsRows[0].id, nameFr, nameEn: str(p.nameEn, 80) || nameFr,
          coefficient: clampInt(p.coefficient ?? 1, 1, 10), position: existing.length + 1,
        });
      }

      if (action === "subject.remove") {
        await db.delete(subjects).where(and(eq(subjects.id, str(p.id, 40)), eq(subjects.tenantId, tid)));
      }

      if (action === "grades.save") {
        const entries = Array.isArray(p.entries) ? (p.entries as Record<string, unknown>[]) : [];
        for (const e of entries.slice(0, 400)) {
          const stu = await studentWithClass(tid, str(e.studentId, 40));
          const sub = await db.select().from(subjects).where(and(eq(subjects.id, str(e.subjectId, 40)), eq(subjects.tenantId, tid))).limit(1);
          // Strict class & block isolation: student and subject must belong to the same class in the same tenant
          if (!stu || !sub[0] || stu.classId !== sub[0].classId) continue;
          const term = clampInt(e.term, 1, 3);
          if (e.value === null || e.value === "" || e.value === undefined) {
            await db.delete(grades).where(and(eq(grades.tenantId, tid), eq(grades.studentId, stu.id), eq(grades.subjectId, sub[0].id), eq(grades.term, term)));
          } else {
            const value = Math.max(0, Math.min(20, Number(e.value)));
            if (isNaN(value)) continue;
            await db.insert(grades).values({ tenantId: tid, studentId: stu.id, subjectId: sub[0].id, term, value })
              .onConflictDoUpdate({ target: [grades.studentId, grades.subjectId, grades.term], set: { value, updatedAt: new Date() } });
          }
        }
      }

      if (action === "profile.update") {
        const patch: Record<string, unknown> = {};
        if (p.name !== undefined) patch.name = str(p.name, 120);
        if (p.phone !== undefined) patch.phone = str(p.phone, 30);
        if (p.email !== undefined && scope.role === "tenant") patch.email = str(p.email, 120).toLowerCase();
        if (Object.keys(patch).length) await db.update(tenants).set(patch).where(eq(tenants.id, tid));
      }

      if (action === "seen.update") {
        const latest = await db.select().from(updates).where(eq(updates.status, "deployed")).orderBy(desc(updates.deployedAt)).limit(1);
        await db.update(tenants).set({ seenVersion: latest[0]?.version ?? "" }).where(eq(tenants.id, tid));
      }

      if (action === "staff.create") {
        const fullName = str(p.fullName, 120);
        if (!fullName) return Response.json({ ok: false, error: "missing" }, { status: 400 });
        const role = ["director", "teacher", "bursar", "secretary", "supervisor"].includes(String(p.role)) ? String(p.role) : "teacher";
        const block = ["all", "nursery", "primary", "secondary"].includes(String(p.block)) ? String(p.block) : "primary";
        const classId = p.classId ? str(p.classId, 40) : null;
        if (classId) {
          const clsOk = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.tenantId, tid))).limit(1);
          if (!clsOk[0]) return Response.json({ ok: false, error: "classNotFound" }, { status: 400 });
        }
        await db.insert(staff).values({
          tenantId: tid,
          fullName,
          role,
          block,
          classId,
          phone: str(p.phone, 30),
          email: str(p.email, 120),
          salary: clampInt(p.salary, 0, 100000000),
          status: p.status === "on_leave" ? "on_leave" : "active",
          hiredAt: /^\d{4}-\d{2}-\d{2}$/.test(String(p.hiredAt)) ? String(p.hiredAt) : todayISO(),
        });
      }

      if (action === "staff.update") {
        const id = str(p.id, 40);
        const patch: Record<string, unknown> = {};
        if (p.fullName !== undefined && str(p.fullName)) patch.fullName = str(p.fullName, 120);
        if (p.role && ["director", "teacher", "bursar", "secretary", "supervisor"].includes(String(p.role))) patch.role = String(p.role);
        if (p.block && ["all", "nursery", "primary", "secondary"].includes(String(p.block))) patch.block = String(p.block);
        if (p.phone !== undefined) patch.phone = str(p.phone, 30);
        if (p.email !== undefined) patch.email = str(p.email, 120);
        if (p.salary !== undefined) patch.salary = clampInt(p.salary, 0, 100000000);
        if (p.status === "active" || p.status === "on_leave") patch.status = p.status;
        if (Object.keys(patch).length) {
          await db.update(staff).set(patch).where(and(eq(staff.id, id), eq(staff.tenantId, tid)));
        }
      }

      if (action === "staff.delete") {
        const id = str(p.id, 40);
        await db.delete(staff).where(and(eq(staff.id, id), eq(staff.tenantId, tid)));
      }

      if (action === "wa.log") {
        const phone = str(p.phone, 30);
        const message = str(p.message, 2000);
        const recipientName = str(p.recipientName, 120) || "Parent";
        const kind = ["enroll", "reminder", "bulletin", "custom"].includes(String(p.kind)) ? String(p.kind) : "custom";
        if (phone && message) {
          await db.insert(waLogs).values({
            tenantId: tid,
            studentId: p.studentId ? str(p.studentId, 40) : null,
            recipientName,
            phone,
            kind,
            message,
          });
        }
      }

      if (action === "sandbox.reset") {
        if (scope.role !== "admin") return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        await db.delete(students).where(eq(students.tenantId, tid));
        await db.delete(subjects).where(eq(subjects.tenantId, tid));
        await db.delete(staff).where(eq(staff.tenantId, tid));
        await db.delete(waLogs).where(eq(waLogs.tenantId, tid));
      }

      return Response.json({ ok: true, data: await getTenantData(tid), result });
    }

    return Response.json({ ok: false, error: "unknown" }, { status: 400 });
  } catch (err) {
    console.error("action error", err);
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
}