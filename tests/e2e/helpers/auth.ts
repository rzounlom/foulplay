import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClerkClient } from "@clerk/backend";
import type { Page } from "@playwright/test";
import {
  E2E_PERSONAS,
  e2ePassword,
  type E2ePersonaKey,
} from "./personas";

export function authStatePath(persona: E2ePersonaKey): string {
  return join(process.cwd(), "tests/e2e/.auth", `${persona}.json`);
}

export function personasMapPath(): string {
  return join(process.cwd(), "tests/e2e/.auth", "personas.json");
}

export type PersonaIdentity = {
  key: E2ePersonaKey;
  email: string;
  clerkId: string;
  userId?: string;
};

export function getClerk(): ReturnType<typeof createClerkClient> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required for E2E auth setup");
  }
  return createClerkClient({ secretKey });
}

export async function ensureClerkUser(persona: E2ePersonaKey): Promise<{
  clerkId: string;
  email: string;
}> {
  const clerk = getClerk();
  const def = E2E_PERSONAS[persona];
  const existing = await clerk.users.getUserList({
    emailAddress: [def.email],
    limit: 1,
  });
  if (existing.data[0]) {
    return { clerkId: existing.data[0].id, email: def.email };
  }

  const created = await clerk.users.createUser({
    emailAddress: [def.email],
    password: e2ePassword(),
    firstName: def.displayName.split(" ")[0],
    lastName: def.displayName.split(" ").slice(1).join(" ") || "E2E",
    skipPasswordChecks: true,
    skipPasswordRequirement: false,
  });
  return { clerkId: created.id, email: def.email };
}

/**
 * Sign in through Clerk using a one-time sign-in token (not an auth bypass).
 * Falls back to password form if ticket URL does not complete.
 */
export async function signInPersona(page: Page, persona: E2ePersonaKey): Promise<void> {
  const { clerkId, email } = await ensureClerkUser(persona);
  const clerk = getClerk();
  const token = await clerk.signInTokens.createSignInToken({
    userId: clerkId,
    expiresInSeconds: 60 * 10,
  });

  const base = page.context().pages()[0]
    ? new URL(page.url() || "http://localhost:3100").origin
    : process.env.E2E_BASE_URL || "http://localhost:3100";

  await page.goto(`${base}/sign-in?__clerk_ticket=${encodeURIComponent(token.token)}`, {
    waitUntil: "domcontentloaded",
  });

  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
      timeout: 15_000,
    });
    return;
  } catch {
    /* fall through to password UI */
  }

  await page.goto(`${base}/sign-in`, { waitUntil: "domcontentloaded" });
  const emailBox = page.getByRole("textbox").first();
  await emailBox.fill(email);
  await emailBox.press("Enter");
  const passwordBox = page.locator('input[type="password"]').first();
  await passwordBox.waitFor({ timeout: 10_000 });
  await passwordBox.fill(e2ePassword());
  await passwordBox.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 20_000,
  });
}

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}
