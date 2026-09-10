import { isPremiumSubscription } from "@/lib/subscription/is-premium";
import { FREE_MAX_PLAYERS, GAME_NIGHT_DURATION_MS } from "@/lib/billing/hosting-limits";
import { PUBLIC_CHAOS_MAX_PLAYERS } from "@/lib/game/constants";

export type EntitlementFields = {
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  gameNightPassExpiresAt?: Date | null;
  lifetimeAccess?: boolean | null;
};

export type EntitlementPlan = "free" | "game_night" | "monthly" | "lifetime";

export type UserEntitlements = {
  isPremium: boolean;
  hasActiveGameNightPass: boolean;
  hasMonthlySubscription: boolean;
  hasLifetimeAccess: boolean;
  isAdFree: boolean;
  canHostUnlimitedGames: boolean;
  canHostLargeRooms: boolean;
  canHostPublicGames: boolean;
  gameNightPassExpiresAt: Date | null;
  plan: EntitlementPlan;
};

/**
 * Single source of truth for what a user can do.
 * Do not sprinkle Stripe subscription checks across the app.
 */
export function getUserEntitlements(
  user: EntitlementFields,
  now: Date = new Date(),
): UserEntitlements {
  const hasLifetimeAccess = user.lifetimeAccess === true;
  const hasMonthlySubscription = isPremiumSubscription({
    subscriptionStatus: user.subscriptionStatus,
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
  });
  const passExpiry = user.gameNightPassExpiresAt ?? null;
  const hasActiveGameNightPass = Boolean(
    passExpiry && passExpiry.getTime() > now.getTime(),
  );

  const isPremium =
    hasLifetimeAccess || hasMonthlySubscription || hasActiveGameNightPass;

  let plan: EntitlementPlan = "free";
  if (hasLifetimeAccess) {
    plan = "lifetime";
  } else if (hasMonthlySubscription) {
    plan = "monthly";
  } else if (hasActiveGameNightPass) {
    plan = "game_night";
  }

  return {
    isPremium,
    hasActiveGameNightPass,
    hasMonthlySubscription,
    hasLifetimeAccess,
    isAdFree: isPremium,
    canHostUnlimitedGames: isPremium,
    canHostLargeRooms: isPremium,
    canHostPublicGames: isPremium,
    gameNightPassExpiresAt: hasActiveGameNightPass ? passExpiry : null,
    plan,
  };
}

export function serializeEntitlements(
  entitlements: UserEntitlements,
): Omit<UserEntitlements, "gameNightPassExpiresAt"> & {
  gameNightPassExpiresAt: string | null;
} {
  return {
    ...entitlements,
    gameNightPassExpiresAt:
      entitlements.gameNightPassExpiresAt?.toISOString() ?? null,
  };
}

/**
 * Private rooms: free hosts cap at FREE_MAX_PLAYERS; premium is uncapped.
 * Public chaos always uses PUBLIC_CHAOS_MAX_PLAYERS (join remains free).
 */
export function getHostMaxPlayers(
  entitlements: UserEntitlements,
  isPublicChaos: boolean,
): number | null {
  if (isPublicChaos) {
    return PUBLIC_CHAOS_MAX_PLAYERS;
  }
  if (entitlements.canHostLargeRooms) {
    return null;
  }
  return FREE_MAX_PLAYERS;
}

export function isHostAtPlayerLimit(
  entitlements: UserEntitlements,
  isPublicChaos: boolean,
  playerCount: number,
): boolean {
  const max = getHostMaxPlayers(entitlements, isPublicChaos);
  if (max == null) return false;
  return playerCount >= max;
}

/** Stack Game Night: extend from the later of current expiry or now. */
export function nextGameNightExpiry(
  currentExpiry: Date | null | undefined,
  now: Date = new Date(),
): Date {
  const current = currentExpiry ?? null;
  const base =
    current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + GAME_NIGHT_DURATION_MS);
}
