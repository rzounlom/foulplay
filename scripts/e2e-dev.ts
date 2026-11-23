/**
 * Start Next on :3100 against DATABASE_URL_E2E only.
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { assertSafeE2eEnvironment } from "../lib/e2e/safety";

const url = assertSafeE2eEnvironment();
process.env.APP_ENV = "test";
process.env.DATABASE_URL = url;
process.env.DIRECT_DATABASE_URL = process.env.DIRECT_DATABASE_URL_E2E || url;
process.env.NEXT_PUBLIC_APP_URL =
  process.env.E2E_BASE_URL || "http://localhost:3100";
process.env.AUTO_ACCEPT_SECONDS_E2E =
  process.env.AUTO_ACCEPT_SECONDS_E2E || "5";
process.env.INTERMISSION_SECONDS_E2E =
  process.env.INTERMISSION_SECONDS_E2E || "8";
process.env.NEXT_PRIVATE_SKIP_TURBO = "1";

const child = spawn("npx", ["next", "dev", "-p", "3100"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
