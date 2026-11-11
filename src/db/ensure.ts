import { pool } from "@/db";

/**
 * Initialisation idempotente du schéma (CREATE ... IF NOT EXISTS).
 * Garantit un premier déploiement sans erreur sur Vercel / Render, sans jamais
 * supprimer ni altérer des données existantes. Le SQL reflète exactement
 * `src/db/schema.ts` (mêmes noms de contraintes et d'index que drizzle-kit).
 */
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "scolaria_subscribers" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "code" text NOT NULL,
    "email" text NOT NULL,
    "phone" text,
    "address" text,
    "director_name" text,
    "country_code" text DEFAULT '237' NOT NULL,
    "has_maternel" boolean DEFAULT false NOT NULL,
    "has_primaire" boolean DEFAULT false NOT NULL,
    "has_secondaire" boolean DEFAULT false NOT NULL,
    "status" text DEFAULT 'actif' NOT NULL,
    "subscription_end" text,
    "notes" text,
    "password_hash" text,
    "plan" text,
    "plan_months" integer,
    "amount_due" integer,
    "payment_method" text,
    "payment_reference" text,
    "request_token" text,
    "subscription_start" text,
    "validated_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  // Mise à niveau des déploiements existants (colonnes additives, jamais de suppression)
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "password_hash" text`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "plan" text`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "plan_months" integer`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "amount_due" integer`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "payment_method" text`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "payment_reference" text`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "request_token" text`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "subscription_start" text`,
  `ALTER TABLE "scolaria_subscribers" ADD COLUMN IF NOT EXISTS "validated_at" timestamp`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_idx" ON "scolaria_subscribers" ("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_code_idx" ON "scolaria_subscribers" ("code")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_request_token_idx" ON "scolaria_subscribers" ("request_token")`,
  `CREATE TABLE IF NOT EXISTS "scolaria_classes" (
    "id" serial PRIMARY KEY NOT NULL,
    "school_id" integer NOT NULL,
    "level" text NOT NULL,
    "name" text NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "scolaria_classes_school_id_scolaria_subscribers_id_fk" FOREIGN KEY ("school_id") REFERENCES "scolaria_subscribers"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "classes_school_idx" ON "scolaria_classes" ("school_id")`,
  `CREATE TABLE IF NOT EXISTS "scolaria_students" (
    "id" serial PRIMARY KEY NOT NULL,
    "school_id" integer NOT NULL,
    "class_id" integer,
    "level" text NOT NULL,
    "official_seq" integer NOT NULL,
    "official_number" text NOT NULL,
    "last_name" text NOT NULL,
    "middle_name" text,
    "first_name" text NOT NULL,
    "gender" text DEFAULT 'M' NOT NULL,
    "birth_date" text,
    "birth_place" text,
    "parent_name" text,
    "parent_phone" text,
    "address" text,
    "status" text DEFAULT 'actif' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "scolaria_students_school_id_scolaria_subscribers_id_fk" FOREIGN KEY ("school_id") REFERENCES "scolaria_subscribers"("id") ON DELETE CASCADE,
    CONSTRAINT "scolaria_students_class_id_scolaria_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "scolaria_classes"("id") ON DELETE SET NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "students_official_number_idx" ON "scolaria_students" ("school_id", "official_number")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "students_school_seq_idx" ON "scolaria_students" ("school_id", "official_seq")`,
  `CREATE INDEX IF NOT EXISTS "students_class_idx" ON "scolaria_students" ("class_id")`,
  `CREATE INDEX IF NOT EXISTS "students_school_idx" ON "scolaria_students" ("school_id")`,
  `CREATE TABLE IF NOT EXISTS "scolaria_payments" (
    "id" serial PRIMARY KEY NOT NULL,
    "school_id" integer NOT NULL,
    "student_id" integer NOT NULL,
    "receipt_seq" integer NOT NULL,
    "receipt_number" text NOT NULL,
    "token" text NOT NULL,
    "amount" numeric(14, 2) NOT NULL,
    "currency" text DEFAULT 'XAF' NOT NULL,
    "motif" text NOT NULL,
    "period" text,
    "payer_name" text,
    "method" text DEFAULT 'Espèces' NOT NULL,
    "paid_at" text NOT NULL,
    "note" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "scolaria_payments_school_id_scolaria_subscribers_id_fk" FOREIGN KEY ("school_id") REFERENCES "scolaria_subscribers"("id") ON DELETE CASCADE,
    CONSTRAINT "scolaria_payments_student_id_scolaria_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "scolaria_students"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "payments_token_idx" ON "scolaria_payments" ("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "payments_school_receipt_idx" ON "scolaria_payments" ("school_id", "receipt_seq")`,
  `CREATE INDEX IF NOT EXISTS "payments_student_idx" ON "scolaria_payments" ("student_id")`,
];

const g = globalThis as typeof globalThis & { __gestionScolaireSchemaReady?: Promise<void> };

export function ensureSchema(): Promise<void> {
  // Pas d'accès base pendant `next build` (la base peut être inaccessible côté Vercel).
  if (process.env.NEXT_PHASE === "phase-production-build") return Promise.resolve();
  if (!g.__gestionScolaireSchemaReady) {
    g.__gestionScolaireSchemaReady = (async () => {
      const client = await pool.connect();
      try {
        for (const statement of STATEMENTS) {
          await client.query(statement);
        }
      } finally {
        client.release();
      }
    })().catch((error) => {
      console.error("[ensureSchema] initialisation du schéma impossible :", error);
      g.__gestionScolaireSchemaReady = undefined;
    });
  }
  return g.__gestionScolaireSchemaReady;
}
