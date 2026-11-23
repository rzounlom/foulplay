jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    method: string;
    body: unknown;
    constructor(url: string, init?: { method?: string; body?: string }) {
      this.url = url;
      this.method = init?.method || "GET";
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
      return Promise.resolve(this.body);
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => Promise.resolve(data),
      status: init?.status || 200,
    }),
  },
}));

import { NextRequest } from "next/server";
import { POST as refreshHand } from "@/app/api/game/refresh-hand/route";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { publishRoomEvent } from "@/lib/realtime/publish-room-event";
import { mockCard, mockPlayer, mockRoom, mockUser } from "@/tests/helpers/mocks";
import { REFRESH_HAND_COOLDOWN_MS } from "@/lib/game/launch-scope";

jest.mock("@/lib/auth/clerk", () => ({
  getCurrentUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    card: {
      findMany: jest.fn(),
    },
    cardInstance: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
    },
    cardSubmission: {
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/ably/client", () => ({
  getRoomChannel: jest.fn(() => ({
    publish: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@/lib/realtime/publish-room-event", () => ({
  publishRoomEvent: jest.fn().mockResolvedValue(undefined),
}));

const mockGetCurrentUserFromRequest =
  getCurrentUserFromRequest as jest.MockedFunction<
    typeof getCurrentUserFromRequest
  >;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockPublishRoomEvent = publishRoomEvent as jest.MockedFunction<
  typeof publishRoomEvent
>;

const joinedAt = new Date(Date.now() - REFRESH_HAND_COOLDOWN_MS - 1_000);
const oldHand = Array.from({ length: 6 }, (_, i) => ({
  id: `ci_${i}`,
  createdAt: joinedAt,
  submissionId: null,
}));
const eligiblePlayer = { ...mockPlayer, userId: mockUser.id, createdAt: joinedAt };

describe("POST /api/game/refresh-hand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserFromRequest.mockResolvedValue(mockUser);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: mockPlayer.id }]);
    mockPrisma.card.findMany = jest.fn().mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        ...mockCard,
        id: `card_${i}`,
        title: `Card ${i}`,
        severity: "mild",
        tier: "common",
      })),
    );
  });

  it("replaces drawn unsubmitted cards and does not touch a pending submission", async () => {
    mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
      ...mockRoom,
      status: "active",
      sport: "football",
      handSize: 6,
      quarterIntermissionEndsAt: null,
      players: [eligiblePlayer],
      gameState: { id: "gs" },
    });
    mockPrisma.cardSubmission.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.cardInstance.findMany = jest
      .fn()
      .mockResolvedValueOnce(oldHand)
      .mockResolvedValueOnce([]);
    mockPrisma.cardInstance.updateMany = jest.fn().mockResolvedValue({ count: 6 });
    mockPrisma.cardInstance.count = jest.fn().mockResolvedValue(0);
    mockPrisma.cardInstance.createMany = jest.fn().mockResolvedValue({ count: 6 });
    mockPrisma.room.update = jest.fn().mockResolvedValue({ version: 4 });

    const response = await refreshHand(
      new NextRequest("http://localhost:3000/api/game/refresh-hand", {
        method: "POST",
        body: JSON.stringify({ roomCode: "ABC123" }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.cardCount).toBe(6);
    expect(mockPrisma.cardInstance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "discarded" },
        where: expect.objectContaining({
          status: "drawn",
          submissionId: null,
        }),
      }),
    );
    expect(mockPublishRoomEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "hand.replenished",
        playerId: mockPlayer.id,
        cardCount: 6,
      }),
    );
  });

  it("refuses to refresh while the player has a pending vote", async () => {
    mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
      ...mockRoom,
      status: "active",
      sport: "football",
      handSize: 6,
      quarterIntermissionEndsAt: null,
      players: [eligiblePlayer],
      gameState: { id: "gs" },
    });
    mockPrisma.cardSubmission.findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: "sub_pending" })
      .mockResolvedValueOnce({ createdAt: oldHand[0].createdAt });
    mockPrisma.cardInstance.findMany = jest.fn().mockResolvedValue(oldHand);

    const response = await refreshHand(
      new NextRequest("http://localhost:3000/api/game/refresh-hand", {
        method: "POST",
        body: JSON.stringify({ roomCode: "ABC123" }),
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.reason).toBe("pending");
    expect(mockPrisma.cardInstance.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.cardInstance.createMany).not.toHaveBeenCalled();
    expect(mockPublishRoomEvent).not.toHaveBeenCalled();
  });
});
