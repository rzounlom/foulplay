/**
 * Integration tests for QStash auto-accept callback
 */

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
import { autoAcceptHandler } from "@/app/api/qstash/auto-accept/route";
import { prisma } from "@/lib/db/prisma";
import { publishRoomEvent } from "@/lib/realtime/publish-room-event";

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    cardSubmission: {
      findUnique: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/realtime/publish-room-event", () => ({
  publishRoomEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/game/auto-accept", () => ({
  processAutoAccept: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockPublishRoomEvent = publishRoomEvent as jest.MockedFunction<
  typeof publishRoomEvent
>;
const { processAutoAccept } = jest.requireMock("@/lib/game/auto-accept");

describe("QStash auto-accept callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves pending submission and publishes submission.accepted", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "pending",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);
    mockPrisma.room.update.mockResolvedValue({
      id: "room_123",
      version: 2,
    } as never);

    (processAutoAccept as jest.Mock).mockResolvedValue({
      ok: true,
      noop: false,
      approvedCount: 2,
      rejectedCount: 0,
      room: { id: "room_123", code: "ABC123", version: 1 },
    });

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(false);
    expect(data.approvedCount).toBe(2);

    expect(mockPublishRoomEvent).toHaveBeenCalledWith({
      type: "submission.accepted",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_123",
      acceptedBy: "auto",
    });
  });

  it("no-ops when submission already accepted", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "approved",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(true);

    expect(processAutoAccept).not.toHaveBeenCalled();
    expect(mockPublishRoomEvent).not.toHaveBeenCalled();
  });

  it("no-ops when submission already rejected", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "rejected",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(true);

    expect(processAutoAccept).not.toHaveBeenCalled();
    expect(mockPublishRoomEvent).not.toHaveBeenCalled();
  });

  it("no-ops when submission not found", async () => {
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_nonexistent" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(true);

    expect(processAutoAccept).not.toHaveBeenCalled();
    expect(mockPublishRoomEvent).not.toHaveBeenCalled();
  });

  it("does not publish when processAutoAccept returns noop (race resolved)", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "pending",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);

    (processAutoAccept as jest.Mock).mockResolvedValue({
      ok: true,
      noop: true,
    });

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(true);

    expect(mockPublishRoomEvent).not.toHaveBeenCalled();
  });

  it("callback remains idempotent: second call with same submission no-ops when already resolved", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "approved",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response1 = await autoAcceptHandler(request);
    const response2 = await autoAcceptHandler(request);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(processAutoAccept).not.toHaveBeenCalled();
    expect(mockPublishRoomEvent).not.toHaveBeenCalled();
  });

  it("publishes submission.accepted when pending cards are auto-accepted", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "pending",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);
    mockPrisma.room.update.mockResolvedValue({
      id: "room_123",
      version: 2,
    } as never);

    (processAutoAccept as jest.Mock).mockResolvedValue({
      ok: true,
      noop: false,
      approvedCount: 2,
      rejectedCount: 0,
      room: { id: "room_123", code: "ABC123", version: 1 },
    });

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(false);
    expect(data.approvedCount).toBe(2);

    expect(mockPublishRoomEvent).toHaveBeenCalledWith({
      type: "submission.accepted",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_123",
      acceptedBy: "auto",
    });
  });

  it("publishes submission.rejected when all cards in batch were rejected by votes", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "pending",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);
    mockPrisma.room.update.mockResolvedValue({
      id: "room_123",
      version: 2,
    } as never);

    (processAutoAccept as jest.Mock).mockResolvedValue({
      ok: true,
      noop: false,
      approvedCount: 0,
      rejectedCount: 2,
      room: { id: "room_123", code: "ABC123", version: 1 },
    });

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(false);
    expect(data.approvedCount).toBe(0);
    expect(data.rejectedCount).toBe(2);

    expect(mockPublishRoomEvent).toHaveBeenCalledWith({
      type: "submission.rejected",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_123",
    });
  });

  it("does not publish turn.advanced when auto-accept resolves (turn not advanced in current flow)", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "pending",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);
    mockPrisma.room.update.mockResolvedValue({
      id: "room_123",
      version: 2,
    } as never);

    (processAutoAccept as jest.Mock).mockResolvedValue({
      ok: true,
      noop: false,
      approvedCount: 2,
      rejectedCount: 0,
      replenishedPlayerId: "player_123",
      replenishedCount: 2,
      room: { id: "room_123", code: "ABC123", version: 1 },
    });

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    expect(response.status).toBe(200);

    const turnAdvancedCall = mockPublishRoomEvent.mock.calls.find(
      (c: [unknown]) => (c[0] as { type?: string })?.type === "turn.advanced"
    );
    expect(turnAdvancedCall).toBeUndefined();
  });

  it("publishes hand.replenished when auto-accept replenishes hand", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "pending",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);
    mockPrisma.room.update.mockResolvedValue({
      id: "room_123",
      version: 2,
    } as never);

    (processAutoAccept as jest.Mock).mockResolvedValue({
      ok: true,
      noop: false,
      approvedCount: 2,
      rejectedCount: 0,
      replenishedPlayerId: "player_123",
      replenishedCount: 2,
      room: { id: "room_123", code: "ABC123", version: 1 },
    });

    const request = new NextRequest("http://localhost/api/qstash/auto-accept", {
      method: "POST",
      body: JSON.stringify({ submissionId: "sub_123" }),
    });

    const response = await autoAcceptHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.noop).toBe(false);

    expect(mockPublishRoomEvent).toHaveBeenCalledWith({
      type: "submission.accepted",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_123",
      acceptedBy: "auto",
    });
    expect(mockPublishRoomEvent).toHaveBeenCalledWith({
      type: "hand.replenished",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      playerId: "player_123",
      cardCount: 2,
    });
  });
});
