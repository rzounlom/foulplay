/**
 * Rematch start paywall: ready flow is not touched; start is gated.
 */

jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    body: unknown;
    constructor(_url: string, init?: { body?: string }) {
      this.body = init?.body ? JSON.parse(init.body) : null;
    }
    async json() {
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

jest.mock("@/lib/auth/clerk", () => ({
  getCurrentUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    room: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/ably/client", () => ({
  getRoomChannel: jest.fn(() => ({ publish: jest.fn() })),
}));

jest.mock("@/lib/rooms/create-rematch-lobby", () => ({
  createRematchLobbyFromEndedRoom: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST as rematchStart } from "@/app/api/rooms/rematch/start/route";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { createRematchLobbyFromEndedRoom } from "@/lib/rooms/create-rematch-lobby";
import { mockUser } from "@/tests/helpers/mocks";

const mockGetUser = getCurrentUserFromRequest as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateRematch = createRematchLobbyFromEndedRoom as jest.Mock;

describe("POST /api/rooms/rematch/start paywall", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue(mockUser);
  });

  it("returns a run-it-back paywall without creating a lobby when the free host is out of games", async () => {
    mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
      id: "room_1",
      code: "ABC123",
      status: "ended",
      hostId: mockUser.id,
      isPublicChaos: false,
      rematchReadyUserIds: [mockUser.id, "user_b"],
      players: [
        { userId: mockUser.id, createdAt: new Date() },
        { userId: "user_b", createdAt: new Date() },
      ],
      lastGameEndResult: null,
      partyChainMeta: null,
    });
    mockPrisma.room.count = jest.fn().mockResolvedValue(2);

    const request = new NextRequest("http://localhost/api/rooms/rematch/start", {
      body: JSON.stringify({ roomCode: "ABC123" }),
    } as never);
    const response = await rematchStart(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe("DAILY_HOST_LIMIT");
    expect(data.paywall.trigger).toBe("run_it_back");
    expect(mockCreateRematch).not.toHaveBeenCalled();
  });

  it("still starts a rematch for a premium host", async () => {
    mockGetUser.mockResolvedValue({ ...mockUser, lifetimeAccess: true });
    mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
      id: "room_1",
      code: "ABC123",
      status: "ended",
      hostId: mockUser.id,
      isPublicChaos: false,
      rematchReadyUserIds: [mockUser.id],
      players: [{ userId: mockUser.id, createdAt: new Date() }],
      lastGameEndResult: null,
      partyChainMeta: null,
    });
    mockCreateRematch.mockResolvedValue({
      code: "XYZ789",
      memberUserIds: [mockUser.id],
    });

    const request = new NextRequest("http://localhost/api/rooms/rematch/start", {
      body: JSON.stringify({ roomCode: "ABC123" }),
    } as never);
    const response = await rematchStart(request);
    expect(response.status).toBe(200);
    expect(mockCreateRematch).toHaveBeenCalled();
  });
});
