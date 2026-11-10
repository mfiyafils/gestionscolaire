/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Scolaria — production server entry (Render / Docker / any PaaS).
 *
 * RENDER COMPATIBILITY RULES
 *  - Listen on 0.0.0.0 (all interfaces) — never on localhost only.
 *  - Use the DYNAMIC port injected by the platform: process.env.PORT || 10000.
 *    (A hard-coded port would trigger Render's "Port scan timeout reached".)
 *  - Never block the boot on the database: the schema and the principal
 *    administrator are created lazily on the first request.
 */
const http = require("http");
const next = require("next");

/** Optional CLI flags (`--port 3000`, `--hostname 0.0.0.0`) used by some
 *  preview platforms; the PORT environment variable (Render) always wins. */
function cliFlag(name) {
  const argv = process.argv.slice(2);
  const i = argv.findIndex((a) => a === `--${name}` || a === `-${name[0]}`);
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.split("=")[1] : undefined;
}

const HOST = process.env.HOST || cliFlag("hostname") || "0.0.0.0";
const PORT =
  Number.parseInt(process.env.PORT || "", 10) ||
  Number.parseInt(cliFlag("port") || "", 10) ||
  10000;
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      // Keep-alive friendly, no buffering surprises behind Render's proxy.
      res.setHeader("X-Powered-By", "Scolaria");
      handle(req, res);
    });

    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;

    server.listen(PORT, HOST, () => {
      console.info(`[scolaria] ▲ ready on http://${HOST}:${PORT} (${dev ? "development" : "production"})`);
      console.info(
        "[scolaria] principal administrator (etsmfiyafils@gmail.com) guaranteed in memory — instant direct sign-in enabled"
      );
    });

    const shutdown = (signal) => {
      console.info(`[scolaria] ${signal} received — shutting down gracefully`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("[scolaria] fatal boot error:", err);
    process.exit(1);
  });
