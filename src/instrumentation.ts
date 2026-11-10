/**
 * Next.js instrumentation — executed on EVERY server start (Node runtime),
 * including cold starts where an ephemeral / in-memory database is reset.
 *
 * IMPORTANT: instrumentation is bundled in its OWN realm, separate from the
 * app code. It must therefore NEVER import the application database module
 * (doing so would create a second PGlite/Postgres instance on the same
 * storage directory and corrupt the fallback database).
 *
 * The principal administrator guarantee (etsmfiyafils@gmail.com,
 * administrator / director rights) is therefore enforced in two app-realm
 * layers that run on every start and on every request:
 *   1. `guaranteePrincipalAdmin()` inside `ensureSeed()` — executed by every
 *      API route (the very first request after a cold start, including the
 *      Render health check, re-creates the admin row on a fresh database).
 *   2. `guaranteePrincipalAdmin()` at the top of the login action, plus the
 *      hardcoded `PRINCIPAL_ADMIN_EMAIL` check in `verifyAdmin()` which does
 *      not depend on the database at all — access is guaranteed even if the
 *      database is completely missing.
 *
 * This file only records the boot so operators can confirm the guarantee
 * chain is armed.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    (globalThis as Record<string, unknown>).__SCOLARIA_BOOT_AT = new Date().toISOString();
    console.info(
      "[instrumentation] server boot — principal administrator guarantee armed " +
        "(auto-recreated on first request if the database was reset)"
    );
  }
}
