import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";
import { getStripe } from "@/lib/stripe/client";
import {
  clearUserSubscription,
  syncUserSubscriptionFromStripe,
} from "@/lib/subscription/sync-from-stripe";
import {
  claimStripeWebhookEvent,
  releaseStripeWebhookEvent,
} from "@/lib/stripe/webhook-idempotency";
import { grantCheckoutPlan } from "@/lib/stripe/grant-from-checkout";
import { parseBillingPlanId, type BillingPlanId } from "@/lib/billing/plans";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function planFromSession(
  session: Stripe.Checkout.Session,
): BillingPlanId | null {
  return parseBillingPlanId(session.metadata?.plan);
}

async function resolveUserIdFromSession(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  if (session.metadata?.userId) {
    return session.metadata.userId;
  }
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!customerId) return null;
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * POST /api/stripe/webhook — Stripe subscription + one-time purchase events.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("stripe webhook signature error:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const claimed = await claimStripeWebhookEvent(event.id, event.type);
  if (!claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = planFromSession(session);

        if (session.mode === "subscription") {
          if (
            session.subscription &&
            typeof session.subscription === "string"
          ) {
            const stripe = getStripe();
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription,
            );
            await syncUserSubscriptionFromStripe(subscription);
            const userId =
              session.metadata?.userId ?? subscription.metadata.userId;
            if (userId) {
              trackEventFireAndForget({
                name: "subscription_activated",
                userId,
                props: {
                  subscriptionId: subscription.id,
                  status: subscription.status,
                  plan: plan ?? "monthly",
                },
              });
              trackEventFireAndForget({
                name: "checkout_completed",
                userId,
                props: {
                  plan: plan ?? "monthly",
                  trigger: session.metadata?.trigger ?? null,
                  mode: "subscription",
                },
              });
            }
          }
          break;
        }

        if (session.mode === "payment" && (plan === "game_night" || plan === "lifetime")) {
          const userId = await resolveUserIdFromSession(session);
          if (!userId) {
            console.warn("[stripe] checkout.session.completed: no user", session.id);
            break;
          }
          await grantCheckoutPlan(userId, plan);
          trackEventFireAndForget({
            name: "checkout_completed",
            userId,
            props: {
              plan,
              trigger: session.metadata?.trigger ?? null,
              mode: "payment",
            },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncUserSubscriptionFromStripe(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        await clearUserSubscription(customerId);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    await releaseStripeWebhookEvent(event.id);
    console.error("stripe webhook handler error:", event.type, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
