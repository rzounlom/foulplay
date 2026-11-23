/**
 * Create Clerk test users, sign them in once, save Playwright storageState.
 *
 * Requires a running E2E app (npm run test:e2e starts one) OR set E2E_BASE_URL.
 */
import "dotenv/config";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { E2E_PERSONA_KEYS, E2E_PERSONAS } from "../tests/e2e/helpers/personas";
import {
  authStatePath,
  ensureClerkUser,
  personasMapPath,
  signInPersona,
  writeJson,
  type PersonaIdentity,
} from "../tests/e2e/helpers/auth";
import { e2eBaseUrl } from "../tests/e2e/helpers/safety";
import { createE2ePrisma } from "../tests/e2e/helpers/prisma";
import { seedUserEntitlements } from "../tests/e2e/helpers/entitlements";

async function main() {
  if (process.env.APP_ENV !== "test") {
    throw new Error("Set APP_ENV=test before generating auth storage");
  }

  const baseURL = e2eBaseUrl();
  mkdirSync(join(process.cwd(), "tests/e2e/.auth"), { recursive: true });

  const browser = await chromium.launch({ headless: process.env.E2E_HEADED !== "1" });
  const map: Partial<Record<string, PersonaIdentity>> = {};

  for (const key of E2E_PERSONA_KEYS) {
    const { clerkId, email } = await ensureClerkUser(key);
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await signInPersona(page, key);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await context.storageState({ path: authStatePath(key) });
    await context.close();

    let userId: string | undefined;
    try {
      const prisma = createE2ePrisma();
      try {
        const user = await prisma.user.findUnique({ where: { clerkId } });
        userId = user?.id;
        if (user) {
          await seedUserEntitlements(
            prisma,
            user.id,
            E2E_PERSONAS[key].defaultEntitlement,
          );
        }
      } finally {
        await prisma.$disconnect();
      }
    } catch (error) {
      console.warn(`[e2e] could not seed DB for ${key}:`, error);
    }

    map[key] = { key, email, clerkId, userId };
    console.log(`[e2e] saved storageState for ${key} (${email})`);
  }

  writeJson(personasMapPath(), map);
  await browser.close();
  console.log("[e2e] auth setup complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
