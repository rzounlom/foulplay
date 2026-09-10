/** Subscription statuses that grant ad-free / premium access */
const PREMIUM_STATUSES = new Set(["active", "trialing"]);

export type SubscriptionFields = {
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: Date | null;
};

export function isPremiumSubscription(fields: SubscriptionFields): boolean {
  const status = fields.subscriptionStatus ?? "free";
  if (!PREMIUM_STATUSES.has(status)) {
    return false;
  }
  const end = fields.subscriptionCurrentPeriodEnd;
  if (!end) {
    return true;
  }
  return end.getTime() > Date.now();
}

export function getSubscriptionDisplayStatus(
  fields: SubscriptionFields,
): "free" | "premium" | "expired" {
  if (isPremiumSubscription(fields)) {
    return "premium";
  }
  const status = fields.subscriptionStatus ?? "free";
  if (status !== "free" && status !== "canceled") {
    return "expired";
  }
  return "free";
}
