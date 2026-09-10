import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";

export async function syncUserSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user && subscription.metadata.userId) {
    user = await prisma.user.findUnique({
      where: { id: subscription.metadata.userId },
    });
  }

  if (!user) {
    console.warn(
      "[stripe] no user for subscription",
      subscription.id,
      customerId,
    );
    return;
  }

  const periodEndUnix = (
    subscription as Stripe.Subscription & { current_period_end?: number }
  ).current_period_end;
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000)
    : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: periodEnd,
    },
  });
}

export async function clearUserSubscription(customerId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: null,
      subscriptionStatus: "canceled",
      subscriptionCurrentPeriodEnd: null,
    },
  });
}
