/**
 * Integration tests for game API routes
 */

// Mock NextRequest BEFORE any imports that use it
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
import { POST as startGame } from "@/app/api/game/start/route";
import { POST as drawCard } from "@/app/api/game/draw/route";
import { POST as submitCard } from "@/app/api/game/submit/route";
import { POST as castVote } from "@/app/api/game/vote/route";
import { GET as getHand } from "@/app/api/game/hand/route";
import { GET as getSubmissions } from "@/app/api/game/submissions/route";
import { mockUser, mockPlayer, mockRoom, mockCard, mockCardInstance } from "@/tests/helpers/mocks";

// Mock dependencies
jest.mock("@/lib/auth/clerk", () => ({
  getCurrentUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    player: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    card: {
      findMany: jest.fn(),
    },
    cardInstance: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    cardSubmission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    cardVote: {
      upsert: jest.fn(),
    },
    gameState: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/ably/client", () => ({
  getRoomChannel: jest.fn(() => ({
    publish: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";

const mockGetCurrentUserFromRequest = getCurrentUserFromRequest as jest.MockedFunction<typeof getCurrentUserFromRequest>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

/** Build mock cards with deterministic id order and severity mix: 50 mild (0-49), 30 moderate (50-79), 20 severe (80-99) */
function mockCardsWithSeverity(): Array<{ id: string; sport: string; title: string; description: string; severity: string; type: string; points: number; createdAt: Date }> {
  const severities: Array<"mild" | "moderate" | "severe"> = [
    ...Array(50).fill("mild"),
    ...Array(30).fill("moderate"),
    ...Array(20).fill("severe"),
  ];
  return severities.map((severity, i) => ({
    ...mockCard,
    id: `card_${String(i).padStart(2, "0")}`,
    sport: "football",
    severity,
    title: `Card ${i}`,
    points: severity === "mild" ? 1 : severity === "moderate" ? 3 : 6,
  }));
}

describe("Game API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserFromRequest.mockResolvedValue(mockUser);
  });

  describe("POST /api/game/start", () => {
    it("should start a game successfully", async () => {
      const gameState = {
        id: "gamestate_123",
        roomId: "room_123",
        currentTurnPlayerId: "player_123",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Need at least 2 players to start a game
      const mockPlayer2 = { ...mockPlayer, id: "player_456", userId: "user_456", isHost: false };
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "lobby",
        players: [mockPlayer, mockPlayer2],
        sport: "football",
        handSize: 5,
      });
      // Need to return enough cards for both players (handSize * 2 = 10 cards minimum)
      // But the deck generation uses all cards, so we need at least 100 cards for football
      const mockCards = Array(100).fill(null).map((_, i) => ({
        ...mockCard,
        id: `card_${i}`,
        sport: "football",
      }));
      mockPrisma.card.findMany = jest.fn().mockResolvedValue(mockCards);
      mockPrisma.gameState.create = jest.fn().mockResolvedValue(gameState);
      mockPrisma.cardInstance.createMany = jest.fn().mockResolvedValue({ count: 10 });
      mockPrisma.gameState.update = jest.fn().mockResolvedValue(gameState);
      mockPrisma.room.update = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
      });

      const request = new NextRequest("http://localhost:3000/api/game/start", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
        }),
      });

      const response = await startGame(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("gameState");
    });

    it("should return 404 when room does not exist", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/game/start", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "INVALI", // 6 characters to pass validation
        }),
      });

      const response = await startGame(request);
      expect(response.status).toBe(404);
    });

    it("should return 403 when user is not host", async () => {
      const nonHostPlayer = { ...mockPlayer, isHost: false };
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [nonHostPlayer],
      });

      const request = new NextRequest("http://localhost:3000/api/game/start", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
        }),
      });

      const response = await startGame(request);
      expect(response.status).toBe(403);
    });

    describe("mode-based severity distribution", () => {
      const cardsWithSeverity = mockCardsWithSeverity();
      const cardById = new Map(cardsWithSeverity.map((c) => [c.id, c]));
      const gameState = {
        id: "gamestate_123",
        roomId: "room_123",
        currentTurnPlayerId: "player_123",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockPlayer2 = { ...mockPlayer, id: "player_456", userId: "user_456", isHost: false };

      beforeEach(() => {
        mockPrisma.card.findMany = jest.fn().mockResolvedValue(cardsWithSeverity);
        mockPrisma.gameState.create = jest.fn().mockResolvedValue(gameState);
        mockPrisma.cardInstance.createMany = jest.fn().mockResolvedValue({ count: 10 });
        mockPrisma.room.update = jest.fn().mockResolvedValue({ ...mockRoom, status: "active" });
      });

      it("Casual mode: dealt cards should have predominantly mild (mode-based mix, then shuffled)", async () => {
        mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
          ...mockRoom,
          id: "room_123",
          status: "lobby",
          mode: "casual",
          sport: "football",
          handSize: 5,
          players: [mockPlayer, mockPlayer2],
        });

        const request = new NextRequest("http://localhost:3000/api/game/start", {
          method: "POST",
          body: JSON.stringify({ roomCode: "ABC123" }),
        });
        const response = await startGame(request);
        expect(response.status).toBe(200);

        const createManyCalls = (mockPrisma.cardInstance.createMany as jest.Mock).mock.calls;
        expect(createManyCalls.length).toBeGreaterThanOrEqual(1);
        const data = createManyCalls[0][0].data as Array<{ cardId: string }>;
        expect(data).toHaveLength(10);

        const severities = data.map((d) => cardById.get(d.cardId)?.severity);
        const mildCount = severities.filter((s) => s === "mild").length;
        expect(mildCount).toBeGreaterThanOrEqual(3);
      });

      it("Lit mode: dealt cards should include severe and moderate (mode-based mix, then shuffled)", async () => {
        mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
          ...mockRoom,
          id: "room_123",
          status: "lobby",
          mode: "lit",
          sport: "football",
          handSize: 5,
          players: [mockPlayer, mockPlayer2],
        });

        const request = new NextRequest("http://localhost:3000/api/game/start", {
          method: "POST",
          body: JSON.stringify({ roomCode: "ABC123" }),
        });
        const response = await startGame(request);
        expect(response.status).toBe(200);

        const createManyCalls = (mockPrisma.cardInstance.createMany as jest.Mock).mock.calls;
        expect(createManyCalls.length).toBeGreaterThanOrEqual(1);
        const data = createManyCalls[0][0].data as Array<{ cardId: string }>;
        expect(data).toHaveLength(10);

        const severities = data.map((d) => cardById.get(d.cardId)?.severity);
        const severeCount = severities.filter((s) => s === "severe").length;
        const moderateCount = severities.filter((s) => s === "moderate").length;
        expect(severeCount + moderateCount).toBeGreaterThanOrEqual(2);
      });

      it("Party mode: game starts and deals cards (shuffled mix)", async () => {
        mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
          ...mockRoom,
          id: "room_123",
          status: "lobby",
          mode: "party",
          sport: "football",
          handSize: 5,
          players: [mockPlayer, mockPlayer2],
        });

        const request = new NextRequest("http://localhost:3000/api/game/start", {
          method: "POST",
          body: JSON.stringify({ roomCode: "ABC123" }),
        });
        const response = await startGame(request);
        expect(response.status).toBe(200);

        const createManyCalls = (mockPrisma.cardInstance.createMany as jest.Mock).mock.calls;
        expect(createManyCalls.length).toBeGreaterThanOrEqual(1);
        const data = createManyCalls[0][0].data as Array<{ cardId: string }>;
        expect(data).toHaveLength(10);

        const severities = data.map((d) => cardById.get(d.cardId)?.severity);
        const mildCount = severities.filter((s) => s === "mild").length;
        const severeCount = severities.filter((s) => s === "severe").length;
        expect(mildCount + severeCount).toBeLessThanOrEqual(10);
        expect(severities.every((s) => ["mild", "moderate", "severe"].includes(s!))).toBe(true);
      });
    });
  });

  describe("POST /api/game/draw", () => {
    it("should draw a card successfully", async () => {
      const gameState = {
        id: "gamestate_123",
        roomId: "room_123",
        currentTurnPlayerId: "player_123",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCards = Array(100).fill(null).map((_, i) => ({ ...mockCard, id: `card_${i}`, sport: "football" }));
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        gameState,
        handSize: 5,
        players: [{ ...mockPlayer, userId: mockUser.id }],
      });
      mockPrisma.player.findFirst = jest.fn().mockResolvedValue(mockPlayer);
      mockPrisma.card.findMany = jest.fn().mockResolvedValue(mockCards);
      mockPrisma.cardInstance.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.cardInstance.count = jest.fn().mockResolvedValue(0);
      mockPrisma.cardInstance.create = jest.fn().mockResolvedValue(mockCardInstance);
      mockPrisma.gameState.update = jest.fn().mockResolvedValue(gameState);

      const request = new NextRequest("http://localhost:3000/api/game/draw", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
        }),
      });

      const response = await drawCard(request);
      expect(response.status).toBe(200);
    });

    it("should return 400 when hand is full", async () => {
      const gameState = {
        id: "gamestate_123",
        roomId: "room_123",
        currentTurnPlayerId: "player_123",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock 5 cards in hand (hand is full)
      const cardsInHand = Array(5).fill(mockCardInstance);

      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        gameState,
        handSize: 5,
      });
      mockPrisma.player.findFirst = jest.fn().mockResolvedValue(mockPlayer);
      mockPrisma.cardInstance.findMany = jest.fn().mockResolvedValue(cardsInHand);

      const request = new NextRequest("http://localhost:3000/api/game/draw", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
        }),
      });

      const response = await drawCard(request);
      expect(response.status).toBe(400);
    });

    it("should use room mode when rebuilding deck for draw (mode-based distribution)", async () => {
      const gameState = {
        id: "gamestate_123",
        roomId: "room_123",
        currentTurnPlayerId: "player_123",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCards = Array(100).fill(null).map((_, i) => ({ ...mockCard, id: `card_${i}`, sport: "football" }));
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        mode: "casual",
        sport: "football",
        gameState,
        handSize: 5,
        players: [{ ...mockPlayer, userId: mockUser.id }],
      });
      mockPrisma.player.findFirst = jest.fn().mockResolvedValue(mockPlayer);
      mockPrisma.card.findMany = jest.fn().mockResolvedValue(mockCards);
      mockPrisma.cardInstance.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.cardInstance.count = jest.fn().mockResolvedValue(0);
      mockPrisma.cardInstance.create = jest.fn().mockResolvedValue(mockCardInstance);
      mockPrisma.gameState.update = jest.fn().mockResolvedValue(gameState);

      const request = new NextRequest("http://localhost:3000/api/game/draw", {
        method: "POST",
        body: JSON.stringify({ roomCode: "ABC123" }),
      });

      const response = await drawCard(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("cardInstance");
      expect(data.cardInstance.card).toHaveProperty("severity");
    });
  });

  describe("POST /api/game/submit", () => {
    it("should submit cards successfully", async () => {
      const gameState = {
        id: "gamestate_123",
        roomId: "room_123",
        currentTurnPlayerId: "player_123",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const submission = {
        id: "submission_123",
        roomId: "room_123",
        submittedById: "player_123",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        gameState,
        handSize: 5,
        canTurnInCards: true,
        quarterIntermissionEndsAt: null,
        players: [{ ...mockPlayer, userId: mockUser.id }],
      });
      mockPrisma.player.findFirst = jest.fn().mockResolvedValue(mockPlayer);
      // Mock the queries for card instances
      mockPrisma.cardInstance.findMany = jest
        .fn()
        .mockResolvedValueOnce([{ ...mockCardInstance, status: "drawn" }]) // First call: get cards to submit (must have status "drawn")
        .mockResolvedValueOnce([]); // Second call: check for already submitted cards
      mockPrisma.cardSubmission.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.cardSubmission.create = jest.fn().mockResolvedValue(submission);
      mockPrisma.cardInstance.updateMany = jest.fn().mockResolvedValue({ count: 1 });

      const request = new NextRequest("http://localhost:3000/api/game/submit", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          cardInstanceIds: ["card_instance_123"],
        }),
      });

      const response = await submitCard(request);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/game/hand", () => {
    it("should return player's hand", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(mockRoom);
      mockPrisma.player.findFirst = jest.fn().mockResolvedValue(mockPlayer);
      mockPrisma.cardInstance.findMany = jest.fn().mockResolvedValue([mockCardInstance]);

      const request = new NextRequest("http://localhost:3000/api/game/hand?roomCode=ABC123");
      const response = await getHand(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("cards");
      expect(Array.isArray(data.cards)).toBe(true);
    });
  });

  describe("GET /api/game/submissions", () => {
    it("should return pending submissions", async () => {
      const submission = {
        id: "submission_123",
        roomId: "room_123",
        submittedById: "player_123",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        cardInstances: [mockCardInstance],
        submittedBy: mockPlayer,
        votes: [],
      };

      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [mockPlayer],
      });
      mockPrisma.cardSubmission.findMany = jest.fn().mockResolvedValue([submission]);

      const request = new NextRequest("http://localhost:3000/api/game/submissions?roomCode=ABC123");
      const response = await getSubmissions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("submissions");
      expect(Array.isArray(data.submissions)).toBe(true);
    });
  });

  describe("POST /api/game/vote", () => {
    const gameState = {
      id: "gamestate_123",
      roomId: "room_123",
      currentTurnPlayerId: "player_123",
      activeCardInstanceId: null,
      deckSeed: "test-seed",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const submitterPlayer = { ...mockPlayer, id: "player_123", userId: mockUser.id, isHost: true };
    const voterPlayer = { ...mockPlayer, id: "player_456", userId: "user_456", isHost: false };
    const thirdPlayer = { ...mockPlayer, id: "player_789", userId: "user_789", isHost: false };

    it("should cast a vote successfully (pending resolution)", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue({ ...mockUser, id: "user_456" });

      const submission = {
        id: "submission_123",
        roomId: "room_123",
        submittedById: "player_123",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        cardInstances: [
          {
            ...mockCardInstance,
            id: "ci_1",
            votes: [],
          },
        ],
        submittedBy: submitterPlayer,
      };
      const submissionAfterVote = {
        ...submission,
        cardInstances: [
          {
            ...mockCardInstance,
            id: "ci_1",
            votes: [{ vote: true }],
          },
        ],
      };

      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        gameState,
        quarterIntermissionEndsAt: null,
        players: [submitterPlayer, voterPlayer, thirdPlayer],
      });
      mockPrisma.cardSubmission.findUnique = jest
        .fn()
        .mockResolvedValueOnce(submission)
        .mockResolvedValueOnce(submissionAfterVote);
      mockPrisma.cardVote.upsert = jest.fn().mockResolvedValue({
        id: "vote_1",
        cardInstanceId: "ci_1",
        vote: true,
      });

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("submission");
      expect(data.submission.status).toBe("pending");
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(401);
    });

    it("should return 404 when room does not exist", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "INVALI",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(404);
    });

    it("should return 404 when submission does not exist", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        gameState: {},
        quarterIntermissionEndsAt: null,
        players: [submitterPlayer, voterPlayer],
      });
      mockPrisma.cardSubmission.findUnique = jest.fn().mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          submissionId: "submission_nonexistent",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(404);
    });

    it("should return 400 when game is not active", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "lobby",
        players: [submitterPlayer, voterPlayer],
      });

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(400);
    });

    it("should return 400 when voting on own submission", async () => {
      const submission = {
        id: "submission_123",
        roomId: "room_123",
        submittedById: "player_123",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        cardInstances: [{ ...mockCardInstance, id: "ci_1", votes: [] }],
        submittedBy: submitterPlayer,
      };
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        gameState: {},
        quarterIntermissionEndsAt: null,
        players: [submitterPlayer, voterPlayer],
      });
      mockPrisma.cardSubmission.findUnique = jest.fn().mockResolvedValue(submission);
      mockGetCurrentUserFromRequest.mockResolvedValue({ ...mockUser, id: mockUser.id });

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("own submission");
    });

    it("should return 403 when user is not a player in the room", async () => {
      const submission = {
        id: "submission_123",
        roomId: "room_123",
        submittedById: "player_123",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        cardInstances: [{ ...mockCardInstance, id: "ci_1", votes: [] }],
        submittedBy: submitterPlayer,
      };
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        gameState: {},
        quarterIntermissionEndsAt: null,
        players: [submitterPlayer, voterPlayer],
      });
      mockPrisma.cardSubmission.findUnique = jest.fn().mockResolvedValue(submission);
      mockGetCurrentUserFromRequest.mockResolvedValue({ ...mockUser, id: "user_other" });

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(403);
    });

    it("should return 400 when submission already resolved", async () => {
      const submission = {
        id: "submission_123",
        roomId: "room_123",
        submittedById: "player_123",
        status: "approved",
        createdAt: new Date(),
        updatedAt: new Date(),
        cardInstances: [{ ...mockCardInstance, id: "ci_1", votes: [] }],
        submittedBy: submitterPlayer,
      };
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "active",
        gameState: {},
        quarterIntermissionEndsAt: null,
        players: [submitterPlayer, voterPlayer],
      });
      mockPrisma.cardSubmission.findUnique = jest.fn().mockResolvedValue(submission);

      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC123",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("already been resolved");
    });

    it("should return 400 for invalid request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/game/vote", {
        method: "POST",
        body: JSON.stringify({
          roomCode: "ABC12",
          submissionId: "submission_123",
          cardInstanceIds: ["ci_1"],
          vote: true,
        }),
      });

      const response = await castVote(request);
      expect(response.status).toBe(400);
    });
  });
});
