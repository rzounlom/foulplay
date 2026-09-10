import Stripe from "stripe";
import { assertStripeModeSafe, getStripeKeySafetyError } from "@/lib/stripe/mode-guard";
import { hasAnyStripePriceConfigured } from "@/lib/stripe/prices";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  assertStripeModeSafe();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

/** @deprecated Use getStripePriceIdForPlan("monthly") */
export function getStripePriceId(): string {
  const priceId =
    process.env.STRIPE_PRICE_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_ID?.trim();
  if (!priceId) {
    throw new Error("STRIPE_PRICE_MONTHLY (or STRIPE_PRICE_ID) is not set");
  }
  return priceId;
}

export function isStripeConfigured(): boolean {
  if (getStripeKeySafetyError()) {
    return false;
  }
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      hasAnyStripePriceConfigured(),
  );
}
