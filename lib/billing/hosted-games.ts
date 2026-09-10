import { prisma } from "@/lib/db/prisma";
import { getUserEntitlements, type EntitlementFields } from "@/lib/billing/entitlements";
import {
  FREE_HOSTED_GAMES_PER_DAY,
  PAYWALL_ERROR_CODE,
  paywallResponseBody,
  type PaywallApiBody,
  type PaywallTrigger,
} from "@/lib/billing/hosting-limits";

export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Count private rooms this user hosted since the start of the UTC day.
 * Public / matchmaking rooms are excluded so Join Live Game spawn does not
 * consume the free hosting allowance.
 */
export async function countPrivateHostedGamesToday(
  hostUserId: string,
  now: Date = new Date(),
): Promise<number> {
  return prisma.room.count({
    where: {
      hostId: hostUserId,
      isPublicChaos: false,
      createdAt: { gte: startOfUtcDay(now) },
    },
  });
}

export async function getRemainingFreeHostedGames(
  hostUserId: string,
  now: Date = new Date(),
): Promise<number> {
  const used = await countPrivateHostedGamesToday(hostUserId, now);
  return Math.max(0, FREE_HOSTED_GAMES_PER_DAY - used);
}

export type HostGameGateResult =
  | { ok: true }
  | { ok: false; status: number; body: PaywallApiBody };

/**
 * Gate for creating a new hosted private game (including rematch).
 * Public hosting is a separate premium gate.
 */
export async function assertCanHostPrivateGame(
  user: EntitlementFields & { id: string },
  options?: { trigger?: PaywallTrigger; now?: Date },
): Promise<HostGameGateResult> {
  const entitlements = getUserEntitlements(user, options?.now);
  if (entitlements.canHostUnlimitedGames) {
    return { ok: true };
  }

  const remaining = await getRemainingFreeHostedGames(user.id, options?.now);
  if (remaining > 0) {
    return { ok: true };
  }

  const trigger = options?.trigger ?? "daily_game_limit";
  return {
    ok: false,
    status: 403,
    body: paywallResponseBody(
      PAYWALL_ERROR_CODE.DAILY_HOST_LIMIT,
      trigger,
      `You've used today's ${FREE_HOSTED_GAMES_PER_DAY} free hosted games.`,
    ),
  };
}

export function assertCanHostPublicGame(
  user: EntitlementFields,
  now: Date = new Date(),
): HostGameGateResult {
  const entitlements = getUserEntitlements(user, now);
  if (entitlements.canHostPublicGames) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    body: paywallResponseBody(
      PAYWALL_ERROR_CODE.PUBLIC_HOSTING_PREMIUM,
      "public_hosting",
      "Unlock public hosting with FoulPlay+ or a Game Night Pass.",
    ),
  };
}
