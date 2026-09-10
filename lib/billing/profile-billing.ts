import { getUserEntitlements, serializeEntitlements } from "@/lib/billing/entitlements";

export const PROFILE_BILLING_SELECT = {
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
  gameNightPassExpiresAt: true,
  lifetimeAccess: true,
  stripeCustomerId: true,
} as const;

type ProfileBillingRow = {
  subscriptionStatus: string;
  subscriptionCurrentPeriodEnd: Date | null;
  gameNightPassExpiresAt: Date | null;
  lifetimeAccess: boolean;
  stripeCustomerId?: string | null;
};

export function withProfileBilling(profile: ProfileBillingRow) {
  const entitlements = getUserEntitlements(profile);
  return {
    subscriptionStatus: profile.subscriptionStatus,
    subscriptionCurrentPeriodEnd:
      profile.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
    gameNightPassExpiresAt:
      entitlements.gameNightPassExpiresAt?.toISOString() ?? null,
    lifetimeAccess: profile.lifetimeAccess,
    isPremium: entitlements.isPremium,
    entitlements: serializeEntitlements(entitlements),
    hasStripeCustomer: Boolean(profile.stripeCustomerId),
  };
}
