import { test as setup, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { E2E_PERSONA_KEYS, E2E_PERSONAS } from "../helpers/personas";
import {
  authStatePath,
  ensureClerkUser,
  personasMapPath,
  signInPersona,
  writeJson,
  type PersonaIdentity,
} from "../helpers/auth";
import { createE2ePrisma } from "../helpers/prisma";
import { seedUserEntitlements } from "../helpers/entitlements";

setup("generate Clerk storageState for E2E personas", async ({ browser }) => {
  const canAuth =
    Boolean(process.env.CLERK_SECRET_KEY) &&
    Boolean(process.env.E2E_CLERK_PASSWORD) &&
    Boolean(process.env.DATABASE_URL_E2E);

  setup.skip(
    !canAuth,
    "Set CLERK_SECRET_KEY, E2E_CLERK_PASSWORD, and DATABASE_URL_E2E to generate auth storage",
  );

  const map: Partial<Record<string, PersonaIdentity>> = {};

  for (const key of E2E_PERSONA_KEYS) {
    const { clerkId, email } = await ensureClerkUser(key);
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInPersona(page, key);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/sign-in/);
    await context.storageState({ path: authStatePath(key) });
    expect(existsSync(authStatePath(key))).toBeTruthy();
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
  }

  writeJson(personasMapPath(), map);
});
