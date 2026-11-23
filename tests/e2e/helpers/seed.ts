import { existsSync, readFileSync } from "node:fs";
import { createE2ePrisma } from "./prisma";
import { seedDailyHostedGames, seedUserEntitlements } from "./entitlements";
import { E2E_PERSONAS, type E2ePersonaKey, type EntitlementSeed } from "./personas";
import { personasMapPath, type PersonaIdentity } from "./auth";

export function readPersonaMap(): Partial<Record<E2ePersonaKey, PersonaIdentity>> {
  const path = personasMapPath();
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Partial<
    Record<E2ePersonaKey, PersonaIdentity>
  >;
}

export function personaUserId(persona: E2ePersonaKey): string | undefined {
  return readPersonaMap()[persona]?.userId;
}

export function personaClerkId(persona: E2ePersonaKey): string | undefined {
  return readPersonaMap()[persona]?.clerkId;
}

export async function applyPersonaEntitlement(
  persona: E2ePersonaKey,
  state?: EntitlementSeed,
): Promise<void> {
  const map = readPersonaMap();
  const identity = map[persona];
  if (!identity?.userId) {
    throw new Error(
      `No Prisma userId for ${persona}. Run npm run e2e:auth:setup first.`,
    );
  }
  const prisma = createE2ePrisma();
  try {
    const seed = state ?? E2E_PERSONAS[persona].defaultEntitlement;
    await seedUserEntitlements(prisma, identity.userId, seed);
    if (seed === "FREE_DAILY_LIMIT_EXHAUSTED") {
      await seedDailyHostedGames(prisma, identity.userId, 2);
    }
  } finally {
    await prisma.$disconnect();
  }
}

export async function seedEndedRematchRoom(options: {
  host: E2ePersonaKey;
  players: E2ePersonaKey[];
}): Promise<{ code: string; roomId: string }> {
  const hostId = personaUserId(options.host);
  const playerIds = options.players
    .map((key) => personaUserId(key))
    .filter((id): id is string => Boolean(id));
  if (!hostId || playerIds.length !== options.players.length) {
    throw new Error("Missing persona user IDs. Run npm run e2e:auth:setup first.");
  }
  const prisma = createE2ePrisma();
  try {
    const { seedRoom } = await import("./rooms");
    return seedRoom(prisma, {
      hostUserId: hostId,
      playerUserIds: playerIds,
      kind: "private_lobby",
      ended: true,
    });
  } finally {
    await prisma.$disconnect();
  }
}
