/**
 * CI entry: verify E2E DB safety, migrate, seed cards if needed, run Playwright.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { assertSafeE2eEnvironment } from "../lib/e2e/safety";
import { createE2ePrisma } from "../tests/e2e/helpers/prisma";

async function main() {
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

  console.log("[e2e:ci] migrating test DB…");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });

  const prisma = createE2ePrisma();
  try {
    const cards = await prisma.card.count();
    if (cards === 0) {
      console.log("[e2e:ci] seeding cards…");
      execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
    }
  } finally {
    await prisma.$disconnect();
  }

  execSync("npx tsx scripts/e2e-db-reset.ts", {
    stdio: "inherit",
    env: process.env,
  });

  console.log("[e2e:ci] running Playwright…");
  execSync("npx playwright test --project=setup --project=e2e", {
    stdio: "inherit",
    env: { ...process.env, CI: process.env.CI || "1" },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
