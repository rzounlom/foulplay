import type { Prisma } from "@prisma/client";

export type E2eEntitlementState =
  | "FREE"
  | "GAME_NIGHT_ACTIVE"
  | "GAME_NIGHT_EXPIRED"
  | "MONTHLY_ACTIVE"
  | "MONTHLY_CANCELED_OR_EXPIRED"
  | "LIFETIME"
  | "FREE_DAILY_LIMIT_EXHAUSTED";

export function e2eEntitlementPatch(
  state: E2eEntitlementState,
  now = new Date(),
): Prisma.UserUpdateInput {
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 60 * 60 * 1000);
  const base = {
    is21Plus: true,
    ageConfirmedAt: now,
    skipTour: true,
  };
  switch (state) {
    case "FREE":
    case "FREE_DAILY_LIMIT_EXHAUSTED":
      return {
        ...base,
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: null,
        lifetimeAccess: false,
      };
    case "GAME_NIGHT_ACTIVE":
      return {
        ...base,
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: future,
        lifetimeAccess: false,
      };
    case "GAME_NIGHT_EXPIRED":
      return {
        ...base,
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: past,
        lifetimeAccess: false,
      };
    case "MONTHLY_ACTIVE":
      return {
        ...base,
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: future,
        gameNightPassExpiresAt: null,
        lifetimeAccess: false,
      };
    case "MONTHLY_CANCELED_OR_EXPIRED":
      return {
        ...base,
        subscriptionStatus: "canceled",
        subscriptionCurrentPeriodEnd: past,
        gameNightPassExpiresAt: null,
        lifetimeAccess: false,
      };
    case "LIFETIME":
      return {
        ...base,
        subscriptionStatus: "free",
        subscriptionCurrentPeriodEnd: null,
        gameNightPassExpiresAt: null,
        lifetimeAccess: true,
      };
  }
}
