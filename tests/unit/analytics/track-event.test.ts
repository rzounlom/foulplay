jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    analyticsEvent: {
      create: jest.fn(),
    },
  },
}));

jest.unmock("@/lib/analytics/track-event");

import { prisma } from "@/lib/db/prisma";
import { trackEvent } from "@/lib/analytics/track-event";

const mockCreate = prisma.analyticsEvent.create as jest.Mock;

describe("trackEvent", () => {
  const originalWebhook = process.env.ANALYTICS_WEBHOOK_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ANALYTICS_WEBHOOK_URL;
    delete process.env.PUBLIC_CHAOS_ANALYTICS_WEBHOOK_URL;
    mockCreate.mockResolvedValue({ id: "evt_1" });
  });

  afterEach(() => {
    if (originalWebhook === undefined) {
      delete process.env.ANALYTICS_WEBHOOK_URL;
    } else {
      process.env.ANALYTICS_WEBHOOK_URL = originalWebhook;
    }
  });

  it("persists analytics events to the database", async () => {
    await trackEvent({
      name: "room_created",
      userId: "user_1",
      roomId: "room_1",
      props: { roomCode: "ABC123" },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "room_created",
        userId: "user_1",
        roomId: "room_1",
        props: { roomCode: "ABC123" },
      },
    });
  });

  it("does not throw when persistence fails", async () => {
    mockCreate.mockRejectedValue(new Error("db down"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      trackEvent({ name: "game_started", userId: "user_1" }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
