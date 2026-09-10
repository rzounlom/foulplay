import type { BillingPlanId } from "@/lib/billing/plans";

/**
 * Map an internal plan id to a configured Stripe Price ID.
 * The client must never send Stripe price IDs.
 *
 * STRIPE_PRICE_ID remains a fallback for the monthly plan so existing
 * test-mode setups keep working during the transition.
 */
export function getStripePriceIdForPlan(plan: BillingPlanId): string {
  const priceId = resolvePriceId(plan);
  if (!priceId) {
    throw new Error(`Stripe price is not configured for plan: ${plan}`);
  }
  return priceId;
}

export function isPlanPriceConfigured(plan: BillingPlanId): boolean {
  return Boolean(resolvePriceId(plan));
}

function resolvePriceId(plan: BillingPlanId): string | undefined {
  switch (plan) {
    case "game_night":
      return process.env.STRIPE_PRICE_GAME_NIGHT?.trim() || undefined;
    case "monthly":
      return (
        process.env.STRIPE_PRICE_MONTHLY?.trim() ||
        process.env.STRIPE_PRICE_ID?.trim() ||
        undefined
      );
    case "lifetime":
      return process.env.STRIPE_PRICE_LIFETIME?.trim() || undefined;
  }
}

export function hasAnyStripePriceConfigured(): boolean {
  return (
    isPlanPriceConfigured("game_night") ||
    isPlanPriceConfigured("monthly") ||
    isPlanPriceConfigured("lifetime")
  );
}
