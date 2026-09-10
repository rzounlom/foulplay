import {
  BILLING_CATALOG,
  parseBillingPlanId,
  isBillingPlanId,
} from "@/lib/billing/plans";
import { getStripePriceIdForPlan, isPlanPriceConfigured } from "@/lib/stripe/prices";
import { getStripeKeySafetyError } from "@/lib/stripe/mode-guard";
import {
  sanitizeCheckoutReturnPath,
  withCheckoutQuery,
} from "@/lib/billing/checkout-return";

describe("billing plan identifiers", () => {
  it("accepts only internal plan ids", () => {
    expect(parseBillingPlanId("game_night")).toBe("game_night");
    expect(parseBillingPlanId("monthly")).toBe("monthly");
    expect(parseBillingPlanId("lifetime")).toBe("lifetime");
    expect(isBillingPlanId("game_night")).toBe(true);
  });

  it("rejects arbitrary Stripe price IDs", () => {
    expect(parseBillingPlanId("price_123")).toBeNull();
    expect(parseBillingPlanId("price_1ABC")).toBeNull();
    expect(isBillingPlanId("price_live_abc")).toBe(false);
  });

  it("maps plans to the correct Stripe Checkout mode", () => {
    expect(BILLING_CATALOG.game_night.checkoutMode).toBe("payment");
    expect(BILLING_CATALOG.monthly.checkoutMode).toBe("subscription");
    expect(BILLING_CATALOG.lifetime.checkoutMode).toBe("payment");
  });
});

describe("Stripe price env mapping", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("reads dedicated price env vars and never uses a client-supplied id", () => {
    process.env.STRIPE_PRICE_GAME_NIGHT = "price_gn";
    process.env.STRIPE_PRICE_MONTHLY = "price_mo";
    process.env.STRIPE_PRICE_LIFETIME = "price_lt";
    expect(getStripePriceIdForPlan("game_night")).toBe("price_gn");
    expect(getStripePriceIdForPlan("monthly")).toBe("price_mo");
    expect(getStripePriceIdForPlan("lifetime")).toBe("price_lt");
  });

  it("falls back to STRIPE_PRICE_ID for monthly only", () => {
    delete process.env.STRIPE_PRICE_MONTHLY;
    process.env.STRIPE_PRICE_ID = "price_legacy";
    expect(isPlanPriceConfigured("monthly")).toBe(true);
    expect(getStripePriceIdForPlan("monthly")).toBe("price_legacy");
  });
});

describe("Stripe key mode safety", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("flags mixed test/live keys", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_abc";
    expect(getStripeKeySafetyError()).toMatch(/mismatch/);
  });

  it("blocks live keys unless explicitly allowed", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_abc";
    delete process.env.STRIPE_ALLOW_LIVE_KEYS;
    expect(getStripeKeySafetyError()).toMatch(/Live Stripe keys are blocked/);
  });

  it("allows matching test keys", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_abc";
    expect(getStripeKeySafetyError()).toBeNull();
  });
});

describe("checkout return path", () => {
  it("rejects open redirects", () => {
    expect(sanitizeCheckoutReturnPath("https://evil.com")).toBe("/upgrade");
    expect(sanitizeCheckoutReturnPath("//evil.com")).toBe("/upgrade");
    expect(sanitizeCheckoutReturnPath("/game/ABC123")).toBe("/game/ABC123");
  });

  it("appends success query params", () => {
    expect(withCheckoutQuery("/upgrade", { success: "1", plan: "monthly" })).toBe(
      "/upgrade?success=1&plan=monthly",
    );
  });
});
