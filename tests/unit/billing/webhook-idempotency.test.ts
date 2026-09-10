import { claimStripeWebhookEvent } from "@/lib/stripe/webhook-idempotency";
import { prisma } from "@/lib/db/prisma";

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    stripeWebhookEvent: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe("claimStripeWebhookEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns true for a new event", async () => {
    (prisma.stripeWebhookEvent.create as jest.Mock).mockResolvedValue({});
    await expect(claimStripeWebhookEvent("evt_1", "checkout.session.completed")).resolves.toBe(
      true,
    );
  });

  it("returns false when the event id already exists", async () => {
    (prisma.stripeWebhookEvent.create as jest.Mock).mockRejectedValue({
      code: "P2002",
    });
    await expect(claimStripeWebhookEvent("evt_1", "checkout.session.completed")).resolves.toBe(
      false,
    );
  });
});
