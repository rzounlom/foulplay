/**
 * Integration tests for POST /api/stripe/checkout
 */

jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    body: unknown;
    constructor(_url: string, init?: { method?: string; body?: string }) {
      if (init?.body) {
        try {
          this.body = JSON.parse(init.body);
        } catch {
          this.body = init.body;
        }
      } else {
        this.body = null;
      }
    }
    async json() {
      if (this.body == null) throw new Error("empty body");
      return Promise.resolve(this.body);
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => Promise.resolve(data),
      status: init?.status ?? 200,
    }),
  },
}));

jest.mock("@/lib/auth/clerk", () => ({
  getCurrentUserFromRequest: jest.fn(),
}));

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn().mockResolvedValue({
    emailAddresses: [{ emailAddress: "t@example.com" }],
  }),
}));

const mockSessionsCreate = jest.fn();
const mockCustomersCreate = jest.fn();

jest.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockSessionsCreate } },
    customers: { create: mockCustomersCreate },
  }),
  isStripeConfigured: jest.fn(() => true),
}));

jest.mock("@/lib/stripe/prices", () => ({
  getStripePriceIdForPlan: jest.fn((plan: string) => `price_${plan}`),
  isPlanPriceConfigured: jest.fn(() => true),
}));

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { update: jest.fn() },
  },
}));

jest.mock("@/lib/host", () => ({
  getAppUrl: () => "https://app.foulplay.io",
}));

import { NextRequest } from "next/server";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { mockUser } from "@/tests/helpers/mocks";
import { BILLING_CATALOG } from "@/lib/billing/plans";

const mockGetUser = getCurrentUserFromRequest as jest.MockedFunction<
  typeof getCurrentUserFromRequest
>;

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      ...mockUser,
      stripeCustomerId: "cus_existing",
    } as never);
    mockSessionsCreate.mockResolvedValue({
      id: "cs_test",
      url: "https://checkout.stripe.com/test",
    });
  });

  it("rejects arbitrary Stripe price IDs from the client", async () => {
    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly", priceId: "price_hacked" }),
    });
    const response = await checkout(request);
    expect(response.status).toBe(400);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it("rejects unknown plan ids", async () => {
    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "annual" }),
    });
    const response = await checkout(request);
    expect(response.status).toBe(400);
  });

  it("creates Game Night Checkout in payment mode", async () => {
    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "game_night", trigger: "player_limit" }),
    });
    const response = await checkout(request);
    expect(response.status).toBe(200);
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: BILLING_CATALOG.game_night.checkoutMode,
        line_items: [{ price: "price_game_night", quantity: 1 }],
        metadata: expect.objectContaining({
          plan: "game_night",
          userId: mockUser.id,
        }),
      }),
    );
  });

  it("creates monthly Checkout in subscription mode", async () => {
    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    });
    await checkout(request);
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        line_items: [{ price: "price_monthly", quantity: 1 }],
      }),
    );
  });

  it("creates lifetime Checkout in payment mode", async () => {
    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "lifetime" }),
    });
    await checkout(request);
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        line_items: [{ price: "price_lifetime", quantity: 1 }],
      }),
    );
  });

  it("blocks monthly checkout when a monthly subscription is already active", async () => {
    mockGetUser.mockResolvedValue({
      ...mockUser,
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: new Date(Date.now() + 86_400_000),
    } as never);
    const request = new NextRequest("http://localhost/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "monthly" }),
    });
    const response = await checkout(request);
    expect(response.status).toBe(400);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });
});
