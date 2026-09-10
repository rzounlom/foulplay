import {
  getSubscriptionDisplayStatus,
  isPremiumSubscription,
} from "@/lib/subscription/is-premium";

describe("isPremiumSubscription", () => {
  it("returns false for free users", () => {
    expect(isPremiumSubscription({ subscriptionStatus: "free" })).toBe(false);
    expect(isPremiumSubscription({ subscriptionStatus: null })).toBe(false);
  });

  it("returns true for active and trialing with valid period", () => {
    const future = new Date(Date.now() + 86400000);
    expect(
      isPremiumSubscription({
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: future,
      }),
    ).toBe(true);
    expect(
      isPremiumSubscription({
        subscriptionStatus: "trialing",
        subscriptionCurrentPeriodEnd: future,
      }),
    ).toBe(true);
  });

  it("returns false when period ended", () => {
    expect(
      isPremiumSubscription({
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: new Date(Date.now() - 1000),
      }),
    ).toBe(false);
  });

  it("returns false for canceled", () => {
    expect(isPremiumSubscription({ subscriptionStatus: "canceled" })).toBe(
      false,
    );
  });
});

describe("getSubscriptionDisplayStatus", () => {
  it("labels premium correctly", () => {
    expect(
      getSubscriptionDisplayStatus({
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 86400000),
      }),
    ).toBe("premium");
    expect(getSubscriptionDisplayStatus({ subscriptionStatus: "free" })).toBe(
      "free",
    );
  });
});
