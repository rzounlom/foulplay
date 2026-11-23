import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getAppUrl } from "@/lib/host";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { getStripePriceIdForPlan, isPlanPriceConfigured } from "@/lib/stripe/prices";
import { getStripeEnvironmentLabel } from "@/lib/stripe/mode-guard";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import {
  parseBillingPlanId,
  type BillingPlanId,
  BILLING_CATALOG,
} from "@/lib/billing/plans";
import {
  isPaywallTrigger,
  type PaywallTrigger,
} from "@/lib/billing/hosting-limits";
import {
  sanitizeCheckoutReturnPath,
  withCheckoutQuery,
} from "@/lib/billing/checkout-return";
import { consumeRateLimit } from "@/lib/http/rate-limit";

function canPurchasePlan(
  plan: BillingPlanId,
  entitlements: ReturnType<typeof getUserEntitlements>,
): { ok: true } | { ok: false; error: string } {
  if (entitlements.hasLifetimeAccess) {
    return { ok: false, error: "You already have lifetime access" };
  }
  if (plan === "lifetime") {
    return { ok: true };
  }
  if (plan === "monthly") {
    if (entitlements.hasMonthlySubscription) {
      return { ok: false, error: "You already have an active subscription" };
    }
    return { ok: true };
  }
  // game_night: allow stacking even if a pass is already active
  if (entitlements.hasMonthlySubscription) {
    return { ok: false, error: "You already have FoulPlay+" };
  }
  return { ok: true };
}

/**
 * POST /api/stripe/checkout — start Stripe Checkout for a validated plan.
 * Body: { plan?: "game_night" | "monthly" | "lifetime", trigger?, returnPath? }
 * Missing plan defaults to monthly for existing clients.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Billing is not configured yet" },
        { status: 503 },
      );
    }

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = consumeRateLimit(`stripe-checkout:${user.id}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many checkout attempts" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
          },
        },
      );
    }

    let plan: BillingPlanId = "monthly";
    let trigger: PaywallTrigger = "upgrade_page";
    let returnPath = "/upgrade";

    try {
      const body = (await request.json()) as Record<string, unknown> | null;
      if (body && typeof body === "object") {
        if (body.priceId != null || body.price_id != null || body.stripePriceId != null) {
          return NextResponse.json(
            { error: "Invalid plan" },
            { status: 400 },
          );
        }
        if (body.plan != null) {
          const parsed = parseBillingPlanId(body.plan);
          if (!parsed) {
            return NextResponse.json(
              { error: "Invalid plan" },
              { status: 400 },
            );
          }
          plan = parsed;
        }
        if (body.trigger != null) {
          if (!isPaywallTrigger(body.trigger)) {
            return NextResponse.json(
              { error: "Invalid trigger" },
              { status: 400 },
            );
          }
          trigger = body.trigger;
        }
        returnPath = sanitizeCheckoutReturnPath(body.returnPath, "/upgrade");
      }
    } catch {
      // Empty body: default monthly (legacy clients)
    }

    if (!isPlanPriceConfigured(plan)) {
      return NextResponse.json(
        { error: `Billing is not configured for ${plan}` },
        { status: 503 },
      );
    }

    const entitlements = getUserEntitlements(user);
    const purchase = canPurchasePlan(plan, entitlements);
    if (!purchase.ok) {
      return NextResponse.json({ error: purchase.error }, { status: 400 });
    }

    const stripe = getStripe();
    const priceId = getStripePriceIdForPlan(plan);
    const appUrl = getAppUrl();
    const catalog = BILLING_CATALOG[plan];

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const clerkUser = await currentUser();
      const customer = await stripe.customers.create({
        email: clerkUser?.emailAddresses[0]?.emailAddress,
        name: user.name,
        metadata: {
          userId: user.id,
          clerkId: user.clerkId,
        },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const envLabel = getStripeEnvironmentLabel();
    const metadata = {
      userId: user.id,
      clerkId: user.clerkId,
      plan,
      trigger,
      env: envLabel,
    };

    const successPath = withCheckoutQuery(returnPath, {
      success: "1",
      plan,
      trigger,
    });
    const cancelPath = withCheckoutQuery(returnPath, {
      canceled: "1",
      plan,
      trigger,
    });

    const session = await stripe.checkout.sessions.create({
      mode: catalog.checkoutMode,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${successPath}`,
      cancel_url: `${appUrl}${cancelPath}`,
      metadata,
      ...(catalog.checkoutMode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                userId: user.id,
                clerkId: user.clerkId,
                plan,
                env: envLabel,
              },
            },
          }
        : {
            payment_intent_data: {
              metadata: {
                userId: user.id,
                clerkId: user.clerkId,
                plan,
                env: envLabel,
              },
            },
          }),
    });

    trackEventFireAndForget({
      name: "checkout_started",
      userId: user.id,
      props: { sessionId: session.id, plan, trigger },
    });
    trackEventFireAndForget({
      name: "subscription_checkout_started",
      userId: user.id,
      props: { sessionId: session.id, plan, trigger },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 },
    );
  }
}
