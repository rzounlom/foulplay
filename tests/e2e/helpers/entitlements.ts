import type { PrismaClient } from "@prisma/client";
import type { EntitlementSeed } from "./personas";

export function entitlementData(
  state: EntitlementSeed,
  now = new Date(),
): {
  subscriptionStatus: string;
  subscriptionCurrentPeriodEnd: Date | null;
  gameNightPassExpiresAt: Date | null;
  lifetimeAccess: boolean;
} {
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 60 * 60 * 1000);
  switch (state) {
    case "FREE":
    case "FREE_DAILY_LIMIT_EXHAUSTED":
      return {
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: null,
        lifetimeAccess: false,
      };
    case "GAME_NIGHT_ACTIVE":
      return {
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: future,
        lifetimeAccess: false,
      };
    case "GAME_NIGHT_EXPIRED":
      return {
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: past,
        lifetimeAccess: false,
      };
    case "MONTHLY_ACTIVE":
      return {
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: future,
        gameNightPassExpiresAt: null,
        lifetimeAccess: false,
      };
    case "MONTHLY_CANCELED_OR_EXPIRED":
      return {
        subscriptionStatus: "canceled",
        subscriptionCurrentPeriodEnd: past,
        gameNightPassExpiresAt: null,
        lifetimeAccess: false,
      };
    case "LIFETIME":
      return {
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: null,
        lifetimeAccess: true,
      };
  }
}

export async function seedUserEntitlements(
  prisma: PrismaClient,
  userId: string,
  state: EntitlementSeed,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...entitlementData(state),
      is21Plus: true,
      ageConfirmedAt: new Date(),
      skipTour: true,
    },
  });
}

export async function seedDailyHostedGames(
  prisma: PrismaClient,
  hostUserId: string,
  count: number,
): Promise<void> {
  const { generateRoomCode } = await import("../../../lib/rooms/utils");
  for (let i = 0; i < count; i++) {
    let code = generateRoomCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const clash = await prisma.room.findUnique({ where: { code } });
      if (!clash) break;
      code = generateRoomCode();
    }
    await prisma.room.create({
      data: {
        code,
        hostId: hostUserId,
        status: "ended",
        mode: "non-drinking",
        sport: "football",
        isPublicChaos: false,
        players: {
          create: { userId: hostUserId, isHost: true, points: 0 },
        },
      },
    });
  }
}
