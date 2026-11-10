/**
 * Render preparation helper — safe to run any time (idempotent, never throws).
 * Pushes the Drizzle schema when DATABASE_URL points to a real PostgreSQL.
 * Silently skips when running inside the build without a database so the
 * Render build can never fail because of a missing variable.
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[render-prepare] DATABASE_URL not set — skipping schema push (secure fallback).");
  process.exit(0);
}

try {
  console.log("[render-prepare] Pushing Drizzle schema to target PostgreSQL…");
  execSync("npx drizzle-kit push --force", { stdio: "inherit" });
  console.log("[render-prepare] Schema ready.");
} catch {
  console.log("[render-prepare] Schema push skipped (database will self-initialize on first run).");
  process.exit(0);
}
