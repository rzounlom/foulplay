/**
 * Integration tests for multi-card submission batch auto-accept behavior.
 * Verifies: accepted stays accepted, rejected stays rejected, only pending auto-accept.
 */

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    room: { findUnique: jest.fn() },
    cardSubmission: { findUnique: jest.fn(), update: jest.fn() },
    cardVote: { upsert: jest.fn() },
    cardInstance: {
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    player: { update: jest.fn() },
    card: { findMany: jest.fn() },
  },
}));

import { processAutoAccept } from "@/lib/game/auto-accept";
import { prisma } from "@/lib/db/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockCard = {
  id: "card_1",
  title: "Test Card",
  description: "Desc",
  severity: "mild",
  type: "foul",
  points: 1,
};

function cardInstance(id: string, votes: Array<{ vote: boolean; voterPlayerId: string }>) {
  return {
    id,
    card: mockCard,
    votes: votes.map((v) => ({ ...v, submissionId: "sub_123" })),
  };
}

describe("processAutoAccept multi-card batch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("auto-accepts only pending cards; accepted and rejected stay as-is", async () => {
    // 4 players, 3 eligible voters. Card A: 2 approve (accepted). Card B: 2 reject (rejected).
    // Card C: 0 votes (pending). Card D: 1 approve 1 reject (pending).
    const room = {
      id: "room_123",
      code: "ABC123",
      version: 1,
      quarterIntermissionEndsAt: null,
      handSize: 6,
      mode: null,
      sport: "football",
      players: [
        { id: "p1", userId: "u1" },
        { id: "p2", userId: "u2" },
        { id: "p3", userId: "u3" },
        { id: "p4", userId: "u4" },
      ],
      gameState: { id: "gs1" },
    };

    const submission = {
      id: "sub_123",
      roomId: "room_123",
      submittedById: "p1",
      status: "pending",
      createdAt: new Date(Date.now() - 35000),
      cardInstances: [
        cardInstance("ci_a", [
          { vote: true, voterPlayerId: "p2" },
          { vote: true, voterPlayerId: "p3" },
        ]),
        cardInstance("ci_b", [
          { vote: false, voterPlayerId: "p2" },
          { vote: false, voterPlayerId: "p3" },
        ]),
        cardInstance("ci_c", []),
        cardInstance("ci_d", [
          { vote: true, voterPlayerId: "p2" },
          { vote: false, voterPlayerId: "p3" },
        ]),
      ],
      submittedBy: { id: "p1", user: { name: "Player 1" }, nickname: null },
    };

    mockPrisma.room.findUnique.mockResolvedValue(room as never);
    mockPrisma.cardSubmission.findUnique
      .mockResolvedValueOnce(submission as never)
      .mockResolvedValueOnce(submission as never);
    mockPrisma.cardVote.upsert.mockResolvedValue({} as never);
    mockPrisma.cardInstance.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.cardSubmission.update.mockResolvedValue({} as never);
    mockPrisma.player.update.mockResolvedValue({} as never);
    mockPrisma.cardInstance.count.mockResolvedValue(0);
    mockPrisma.card.findMany.mockResolvedValue([]);
    mockPrisma.cardInstance.findMany.mockResolvedValue([]);
    mockPrisma.cardInstance.create.mockResolvedValue({} as never);

    const result = await processAutoAccept("sub_123", "ABC123", {
      skipElapsedCheck: true,
    });

    expect(result).toMatchObject({ ok: true, noop: false });

    // Should have approved: A (by votes) + C and D (auto-accepted from pending)
    // Rejected: B (stays rejected)
    const updateManyCalls = mockPrisma.cardInstance.updateMany.mock.calls;
    expect(updateManyCalls.length).toBeGreaterThanOrEqual(1);

    // First call: approved cards (resolved, submissionId null)
    const approvedCall = updateManyCalls.find(
      (c) => c[0].data.status === "resolved"
    );
    expect(approvedCall).toBeDefined();
    const approvedIds = (approvedCall![0].where as { id: { in: string[] } }).id
      .in;
    expect(approvedIds).toContain("ci_a");
    expect(approvedIds).toContain("ci_c");
    expect(approvedIds).toContain("ci_d");
    expect(approvedIds).not.toContain("ci_b");

    // Second call: rejected cards (drawn, submissionId null)
    const rejectedCall = updateManyCalls.find(
      (c) => c[0].data.status === "drawn"
    );
    expect(rejectedCall).toBeDefined();
    const rejectedIds = (rejectedCall![0].where as { id: { in: string[] } }).id
      .in;
    expect(rejectedIds).toContain("ci_b");
    expect(rejectedIds).not.toContain("ci_a");
    expect(rejectedIds).not.toContain("ci_c");
    expect(rejectedIds).not.toContain("ci_d");
  });

  it("only affects cards in the current submission batch", async () => {
    // Single card in batch, pending (0 votes)
    const room = {
      id: "room_123",
      code: "ABC123",
      version: 1,
      quarterIntermissionEndsAt: null,
      handSize: 6,
      mode: null,
      sport: "football",
      players: [
        { id: "p1", userId: "u1" },
        { id: "p2", userId: "u2" },
      ],
      gameState: { id: "gs1" },
    };

    const submission = {
      id: "sub_456",
      roomId: "room_123",
      submittedById: "p1",
      status: "pending",
      createdAt: new Date(Date.now() - 35000),
      cardInstances: [cardInstance("ci_only", [])],
      submittedBy: { id: "p1", user: { name: "Player 1" }, nickname: null },
    };

    mockPrisma.room.findUnique.mockResolvedValue(room as never);
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);
    mockPrisma.cardVote.upsert.mockResolvedValue({} as never);
    mockPrisma.cardInstance.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.cardSubmission.update.mockResolvedValue({} as never);
    mockPrisma.player.update.mockResolvedValue({} as never);
    mockPrisma.cardInstance.count.mockResolvedValue(0);
    mockPrisma.card.findMany.mockResolvedValue([]);
    mockPrisma.cardInstance.findMany.mockResolvedValue([]);
    mockPrisma.cardInstance.create.mockResolvedValue({} as never);

    const result = await processAutoAccept("sub_456", "ABC123", {
      skipElapsedCheck: true,
    });

    expect(result).toMatchObject({ ok: true, noop: false });
    const approvedCall = mockPrisma.cardInstance.updateMany.mock.calls.find(
      (c) => c[0].data.status === "resolved"
    );
    expect(approvedCall).toBeDefined();
    const approvedIds = (approvedCall![0].where as { id: { in: string[] } }).id
      .in;
    expect(approvedIds).toEqual(["ci_only"]);
  });

  it("no-ops when submission already resolved", async () => {
    const submission = {
      id: "sub_123",
      roomId: "room_123",
      status: "approved",
      room: { id: "room_123", code: "ABC123" },
    };
    mockPrisma.cardSubmission.findUnique.mockResolvedValue(submission as never);

    const result = await processAutoAccept("sub_123", "ABC123", {
      skipElapsedCheck: true,
    });

    expect(result).toMatchObject({ ok: true, noop: true });
    expect(mockPrisma.cardInstance.updateMany).not.toHaveBeenCalled();
  });
});
