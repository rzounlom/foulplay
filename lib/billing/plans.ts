/**
 * Internal billing plan identifiers. The client may only send these —
 * never Stripe price IDs.
 */

export const BILLING_PLAN_IDS = ["game_night", "monthly", "lifetime"] as const;

export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export type StripeCheckoutMode = "payment" | "subscription";

export type BillingPlanCatalogEntry = {
  id: BillingPlanId;
  name: string;
  /** Display-only; actual charge amount comes from Stripe Price objects. */
  displayPrice: string;
  cadence: string;
  checkoutMode: StripeCheckoutMode;
  headline: string;
  position: string;
  cta: string;
  includes: string[];
};

export const BILLING_CATALOG: Record<BillingPlanId, BillingPlanCatalogEntry> = {
  game_night: {
    id: "game_night",
    name: "Game Night",
    displayPrice: "$2.99",
    cadence: "24 hours",
    checkoutMode: "payment",
    headline: "Tonight's watch party",
    position: "Low-commitment unlock",
    cta: "Unlock Game Night",
    includes: [
      "larger rooms",
      "unlimited games for 24 hours",
      "public hosting",
      "ad-free lobbies",
      "everyone else joins free",
    ],
  },
  monthly: {
    id: "monthly",
    name: "FoulPlay+",
    displayPrice: "$7.99",
    cadence: "/month",
    checkoutMode: "subscription",
    headline: "Best for regular hosts",
    position: "Recurring host plan",
    cta: "Get FoulPlay+",
    includes: [
      "unlimited hosting",
      "larger rooms",
      "public hosting",
      "ad-free lobbies",
      "future premium host features",
    ],
  },
  lifetime: {
    id: "lifetime",
    name: "Lifetime",
    displayPrice: "$79.99",
    cadence: "once",
    checkoutMode: "payment",
    headline: "Early supporter",
    position: "Pay once, keep premium hosting",
    cta: "Get Lifetime",
    includes: [
      "unlimited hosting",
      "larger rooms",
      "public hosting",
      "ad-free lobbies",
      "future premium host features",
    ],
  },
};

export function isBillingPlanId(value: unknown): value is BillingPlanId {
  return (
    typeof value === "string" &&
    (BILLING_PLAN_IDS as readonly string[]).includes(value)
  );
}

export function parseBillingPlanId(value: unknown): BillingPlanId | null {
  return isBillingPlanId(value) ? value : null;
}
