/**
 * Stripe webhook: entitlements + idempotency
 */

jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    body: string;
    headers: { get: (name: string) => string | null };
    constructor(_url: string, init?: { body?: string; headers?: Record<string, string> }) {
      this.body = init?.body ?? "";
      const headers = init?.headers ?? {};
      this.headers = {
        get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null,
      };
    }
    async text() {
      return this.body;
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => Promise.resolve(data),
      status: init?.status ?? 200,
    }),
  },
}));

const mockConstructEvent = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();

jest.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }),
}));

jest.mock("@/lib/stripe/webhook-idempotency", () => ({
  claimStripeWebhookEvent: jest.fn(),
  releaseStripeWebhookEvent: jest.fn(),
}));

jest.mock("@/lib/stripe/grant-from-checkout", () => ({
  grantCheckoutPlan: jest.fn(),
}));

jest.mock("@/lib/subscription/sync-from-stripe", () => ({
  syncUserSubscriptionFromStripe: jest.fn(),
  clearUserSubscription: jest.fn(),
}));

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findFirst: jest.fn() },
  },
}));

import { NextRequest } from "next/server";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import {
  claimStripeWebhookEvent,
  releaseStripeWebhookEvent,
} from "@/lib/stripe/webhook-idempotency";
import { grantCheckoutPlan } from "@/lib/stripe/grant-from-checkout";
import {
  syncUserSubscriptionFromStripe,
  clearUserSubscription,
} from "@/lib/subscription/sync-from-stripe";

const mockClaim = claimStripeWebhookEvent as jest.Mock;
const mockGrant = grantCheckoutPlan as jest.Mock;
const mockSync = syncUserSubscriptionFromStripe as jest.Mock;
const mockClear = clearUserSubscription as jest.Mock;

function makeRequest() {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    body: "{}",
    headers: { "stripe-signature": "sig" },
  } as never);
}

describe("POST /api/stripe/webhook", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockClaim.mockResolvedValue(true);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it("grants 24h Game Night on checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_gn_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          mode: "payment",
          metadata: { userId: "user_1", plan: "game_night", trigger: "player_limit" },
          customer: "cus_1",
        },
      },
    });
    const response = await webhook(makeRequest());
    expect(response.status).toBe(200);
    expect(mockGrant).toHaveBeenCalledWith("user_1", "game_night");
  });

  it("does not grant again when the same webhook event is replayed", async () => {
    mockClaim.mockResolvedValue(false);
    mockConstructEvent.mockReturnValue({
      id: "evt_gn_1",
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { userId: "user_1", plan: "game_night" },
        },
      },
    });
    const response = await webhook(makeRequest());
    const data = await response.json();
    expect(data.duplicate).toBe(true);
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it("grants lifetime access from a lifetime checkout", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_lt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { userId: "user_1", plan: "lifetime" },
        },
      },
    });
    await webhook(makeRequest());
    expect(mockGrant).toHaveBeenCalledWith("user_1", "lifetime");
  });

  it("syncs monthly subscriptions from checkout.session.completed", async () => {
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_1",
      status: "active",
      metadata: { userId: "user_1" },
    });
    mockConstructEvent.mockReturnValue({
      id: "evt_sub_1",
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          subscription: "sub_1",
          metadata: { userId: "user_1", plan: "monthly" },
        },
      },
    });
    await webhook(makeRequest());
    expect(mockSync).toHaveBeenCalled();
    expect(mockGrant).not.toHaveBeenCalled();
  });

  it("clears subscription on customer.subscription.deleted", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_del_1",
      type: "customer.subscription.deleted",
      data: {
        object: { customer: "cus_1" },
      },
    });
    await webhook(makeRequest());
    expect(mockClear).toHaveBeenCalledWith("cus_1");
  });

  it("releases the event claim when the handler throws so Stripe can retry", async () => {
    mockGrant.mockRejectedValue(new Error("db down"));
    mockConstructEvent.mockReturnValue({
      id: "evt_fail",
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { userId: "user_1", plan: "game_night" },
        },
      },
    });
    const response = await webhook(makeRequest());
    expect(response.status).toBe(500);
    expect(releaseStripeWebhookEvent).toHaveBeenCalledWith("evt_fail");
  });
});
