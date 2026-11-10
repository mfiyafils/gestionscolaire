/**
 * Idempotent schema bootstrap.
 * Executed at runtime on the first request so the app works on:
 *  - a Render PostgreSQL instance (DATABASE_URL),
 *  - a brand-new empty database,
 *  - the embedded PGlite fallback when DATABASE_URL is missing.
 * This removes any need for a build-time database connection.
 */
export const BOOTSTRAP_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS platform_admins (
    email text PRIMARY KEY,
    label text NOT NULL DEFAULT 'Principal',
    is_principal boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text NOT NULL DEFAULT '',
    password_hash text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    plan text NOT NULL DEFAULT 'monthly',
    structure text NOT NULL DEFAULT 'all',
    structures text NOT NULL DEFAULT 'nursery,primary,secondary',
    created_by_admin boolean NOT NULL DEFAULT false,
    is_sandbox boolean NOT NULL DEFAULT false,
    seen_version text NOT NULL DEFAULT '',
    subscription_ends_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token text PRIMARY KEY,
    role text NOT NULL,
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    block text NOT NULL,
    level_code text NOT NULL,
    variant text NOT NULL DEFAULT 'general',
    tuition integer NOT NULL DEFAULT 25000,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT classes_tenant_level_variant UNIQUE (tenant_id, level_code, variant)
  )`,
  `CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    matricule text NOT NULL,
    last_name text NOT NULL,
    first_name text NOT NULL,
    sex text NOT NULL,
    birth_date date NOT NULL,
    birth_place text NOT NULL DEFAULT '',
    father_name text NOT NULL DEFAULT '',
    mother_name text NOT NULL DEFAULT '',
    whatsapp text NOT NULL DEFAULT '',
    enrolled_at date NOT NULL,
    tuition_total integer NOT NULL DEFAULT 25000,
    paid1 integer NOT NULL DEFAULT 0,
    paid2 integer NOT NULL DEFAULT 0,
    archived boolean NOT NULL DEFAULT false,
    archive_reason text NOT NULL DEFAULT '',
    archived_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT students_tenant_matricule UNIQUE (tenant_id, matricule)
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    receipt_no text NOT NULL,
    amount integer NOT NULL,
    tranche integer NOT NULL DEFAULT 1,
    method text NOT NULL DEFAULT 'cash',
    paid_at date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT payments_tenant_receipt UNIQUE (tenant_id, receipt_no)
  )`,
  `CREATE TABLE IF NOT EXISTS subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name_fr text NOT NULL,
    name_en text NOT NULL,
    coefficient integer NOT NULL DEFAULT 1,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    term integer NOT NULL DEFAULT 1,
    value double precision NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT grades_student_subject_term UNIQUE (student_id, subject_id, term)
  )`,
  `CREATE TABLE IF NOT EXISTS staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    role text NOT NULL DEFAULT 'teacher',
    block text NOT NULL DEFAULT 'primary',
    class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
    phone text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    salary integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active',
    hired_at date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS wa_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id uuid,
    recipient_name text NOT NULL,
    phone text NOT NULL,
    kind text NOT NULL DEFAULT 'custom',
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version text NOT NULL,
    title_fr text NOT NULL,
    title_en text NOT NULL,
    notes_fr text NOT NULL DEFAULT '',
    notes_en text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'deployed',
    deployed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sub_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    plan text NOT NULL DEFAULT 'monthly',
    structure text NOT NULL DEFAULT 'all',
    payment_method text NOT NULL DEFAULT 'orange',
    payment_ref text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  /* ── Forward-compatible column upgrades for existing databases ── */
  `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS structures text NOT NULL DEFAULT 'nursery,primary,secondary'`,
  `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by_admin boolean NOT NULL DEFAULT false`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS archive_reason text NOT NULL DEFAULT ''`,
  `ALTER TABLE students ADD COLUMN IF NOT EXISTS archived_at timestamptz`,
  `ALTER TABLE sub_requests ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'orange'`,
  `ALTER TABLE sub_requests ADD COLUMN IF NOT EXISTS payment_ref text NOT NULL DEFAULT ''`,
];
