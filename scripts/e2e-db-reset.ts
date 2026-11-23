/**
 * Reset the dedicated E2E database: migrate, wipe rooms/gameplay rows,
 * keep cards, re-seed entitlements for known Clerk users.
 *
 *   APP_ENV=test DATABASE_URL_E2E=... npm run e2e:db:reset
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { assertSafeE2eEnvironment } from "../lib/e2e/safety";
import { createE2ePrisma } from "../tests/e2e/helpers/prisma";
import { seedUserEntitlements } from "../tests/e2e/helpers/entitlements";
import { E2E_PERSONAS, type E2ePersonaKey } from "../tests/e2e/helpers/personas";
import { personasMapPath, type PersonaIdentity } from "../tests/e2e/helpers/auth";

async function main() {
  const url = assertSafeE2eEnvironment();
  process.env.DATABASE_URL = url;
  process.env.DIRECT_DATABASE_URL = process.env.DIRECT_DATABASE_URL_E2E || url;

  console.log("[e2e] migrating test DB…");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });

  const prisma = createE2ePrisma();
  try {
    console.log("[e2e] clearing rooms and gameplay data…");
    await prisma.cardVote.deleteMany({});
    await prisma.cardSubmission.deleteMany({});
    await prisma.cardInstance.deleteMany({});
    await prisma.gameState.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.room.deleteMany({});
    await prisma.analyticsEvent.deleteMany({});
    await prisma.stripeWebhookEvent.deleteMany({});

    const cardCount = await prisma.card.count();
    if (cardCount === 0) {
      console.log("[e2e] cards table empty — run npm run db:seed against DATABASE_URL_E2E");
    }

    if (existsSync(personasMapPath())) {
      const map = JSON.parse(readFileSync(personasMapPath(), "utf8")) as Partial<
        Record<E2ePersonaKey, PersonaIdentity>
      >;
      for (const [key, identity] of Object.entries(map)) {
        if (!identity?.userId) continue;
        const persona = E2E_PERSONAS[key as E2ePersonaKey];
        if (!persona) continue;
        await seedUserEntitlements(
          prisma,
          identity.userId,
          persona.defaultEntitlement,
        );
        console.log(`[e2e] reset entitlements for ${key}`);
      }
    } else {
      console.log("[e2e] no personas.json yet — run npm run e2e:auth:setup after Clerk users exist");
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[e2e] DB reset complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
