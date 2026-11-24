/**
 * Integration tests for room API routes
 * These tests mock the database and auth to test API logic
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
import { GET as getRoom, PATCH as updateRoom } from "@/app/api/rooms/[code]/route";
import { GET as getSnapshot } from "@/app/api/rooms/[code]/snapshot/route";
import { POST as createRoom } from "@/app/api/rooms/route";
import { POST as joinRoom } from "@/app/api/rooms/join/route";
import { mockUser, mockPlayer, mockRoom } from "@/tests/helpers/mocks";

// Mock dependencies
jest.mock("@/lib/auth/clerk", () => ({
  getCurrentUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/db/prisma", () => {
  const mockTransactionPrisma = {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    player: {
      create: jest.fn(),
    },
  };

  return {
    prisma: {
      $transaction: jest.fn(async (callback) => {
        return callback(mockTransactionPrisma);
      }),
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      room: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      player: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      cardSubmission: {
        findMany: jest.fn(),
      },
      cardInstance: {
        findMany: jest.fn(),
      },
    },
  };
});

jest.mock("@/lib/rooms/utils", () => ({
  generateRoomCode: jest.fn(() => "ABC123"),
}));

jest.mock("@/lib/ably/client", () => ({
  getRoomChannel: jest.fn(() => ({
    publish: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@/lib/realtime/publish-room-event", () => ({
  publishRoomEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/analytics/public-chaos-events", () => ({
  emitPublicChaosEvent: jest.fn(),
}));

import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { emitPublicChaosEvent } from "@/lib/analytics/public-chaos-events";
import { prisma } from "@/lib/db/prisma";
import { publishRoomEvent } from "@/lib/realtime/publish-room-event";

const mockGetCurrentUserFromRequest = getCurrentUserFromRequest as jest.MockedFunction<typeof getCurrentUserFromRequest>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockPublishRoomEvent = publishRoomEvent as jest.MockedFunction<typeof publishRoomEvent>;
const mockEmitPublicChaos = emitPublicChaosEvent as jest.MockedFunction<typeof emitPublicChaosEvent>;

describe("Room API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserFromRequest.mockResolvedValue(mockUser);
    mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
      is21Plus: true,
      ageConfirmedAt: new Date(),
      subscriptionStatus: "free",
      lifetimeAccess: false,
      gameNightPassExpiresAt: null,
    });
    mockPrisma.room.count = jest.fn().mockResolvedValue(0);
  });

  describe("POST /api/rooms", () => {
    it("should create a room successfully", async () => {
      // Mock room.findUnique for checking if code exists (should return null)
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(null);
      
      // Mock transaction callback
      const mockTransactionPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          upsert: jest.fn().mockResolvedValue(mockUser),
        },
        room: {
          create: jest.fn().mockResolvedValue(mockRoom),
        },
        player: {
          create: jest.fn().mockResolvedValue(mockPlayer),
        },
      };

      mockPrisma.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransactionPrisma);
      });

      // Mock the second findUnique call to get room with players
      mockPrisma.room.findUnique = jest
        .fn()
        .mockResolvedValueOnce(null) // First call: check if code exists
        .mockResolvedValueOnce({ // Second call: get room with players
          ...mockRoom,
          players: [mockPlayer],
        });

      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "casual",
          sport: "football",
          handSize: 5,
        }),
      });

      const response = await createRoom(request, { params: Promise.resolve({ code: "" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("code");
      expect(data).toHaveProperty("mode", "casual");
      expect(data).toHaveProperty("sport", "football");
    });

    it("should persist isPublicChaos when public game is requested", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue({
        ...mockUser,
        lifetimeAccess: true,
      });
      const mockTransactionPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          upsert: jest.fn().mockResolvedValue(mockUser),
        },
        room: {
          create: jest.fn().mockResolvedValue({
            ...mockRoom,
            isPublicChaos: true,
          }),
        },
        player: {
          create: jest.fn().mockResolvedValue(mockPlayer),
        },
      };

      mockPrisma.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransactionPrisma);
      });

      mockPrisma.room.findUnique = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...mockRoom,
          isPublicChaos: true,
          players: [mockPlayer],
        });

      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "party",
          sport: "football",
          handSize: 6,
          isPublicChaos: true,
        }),
      });

      const response = await createRoom(request, {
        params: Promise.resolve({ code: "" }),
      });
      expect(response.status).toBe(201);
      expect(mockTransactionPrisma.room.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isPublicChaos: true,
          allowJoinInProgress: true,
        }),
      });
      expect(mockEmitPublicChaos).toHaveBeenCalledWith(
        "public_room_created",
        expect.objectContaining({
          createdVia: "host_create",
          playerCount: 1,
        }),
      );
    });

    it("ignores allowQuarterClearing true on create while launch hides round controls", async () => {
      const mockTransactionPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          upsert: jest.fn().mockResolvedValue(mockUser),
        },
        room: {
          create: jest.fn().mockResolvedValue(mockRoom),
        },
        player: {
          create: jest.fn().mockResolvedValue(mockPlayer),
        },
      };

      mockPrisma.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransactionPrisma);
      });

      mockPrisma.room.findUnique = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...mockRoom,
          players: [mockPlayer],
        });

      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "party",
          sport: "football",
          handSize: 6,
          allowQuarterClearing: true,
        }),
      });

      const response = await createRoom(request, {
        params: Promise.resolve({ code: "" }),
      });
      expect(response.status).toBe(201);
      expect(mockTransactionPrisma.room.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          allowQuarterClearing: false,
        }),
      });
    });

    it("rejects public hosting for free users with a paywall payload", async () => {
      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "party",
          sport: "football",
          handSize: 6,
          isPublicChaos: true,
        }),
      });
      const response = await createRoom(request, {
        params: Promise.resolve({ code: "" }),
      });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.code).toBe("PUBLIC_HOSTING_PREMIUM");
      expect(data.paywall.trigger).toBe("public_hosting");
    });

    it("rejects a third private hosted game for a free user", async () => {
      mockPrisma.room.count = jest.fn().mockResolvedValue(2);
      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "casual",
          sport: "football",
          handSize: 6,
        }),
      });
      const response = await createRoom(request, {
        params: Promise.resolve({ code: "" }),
      });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.code).toBe("DAILY_HOST_LIMIT");
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "casual",
          sport: "football",
        }),
      });

      const response = await createRoom(request, { params: Promise.resolve({ code: "" }) });
      expect(response.status).toBe(401);
    });

    it("should validate request body", async () => {
      // The schema allows all fields to be optional, so empty body is valid
      // Let's test with invalid data instead
      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          handSize: 15, // Invalid: exceeds max of 12
        }),
      });

      const response = await createRoom(request, { params: Promise.resolve({ code: "" }) });
      expect(response.status).toBe(400);
    });

    it("should accept valid modes", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue(mockUser);
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.room.create = jest.fn().mockResolvedValue({
        ...mockRoom,
        mode: "lit",
        sport: "football",
      });
      (mockPrisma as { $transaction: jest.Mock }).$transaction = jest.fn(
        async (cb: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const tx = {
          room: { create: jest.fn().mockResolvedValue({ ...mockRoom, mode: "lit", sport: "football" }) },
          player: { create: jest.fn().mockResolvedValue(mockPlayer) },
        };
        return cb(tx);
        }
      );

      for (const mode of ["casual", "party", "lit", "anything_goes", "non-drinking"]) {
        const request = new NextRequest("http://localhost:3000/api/rooms", {
          method: "POST",
          body: JSON.stringify({ mode, sport: "football", handSize: 6 }),
        });
        const response = await createRoom(request, { params: Promise.resolve({ code: "" }) });
        expect(response.status).toBe(201);
      }
    });

    it("should reject drinking modes when user confirmed under 21", async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue({
        is21Plus: false,
        ageConfirmedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "party",
          sport: "football",
          handSize: 6,
        }),
      });

      const response = await createRoom(request, { params: Promise.resolve({ code: "" }) });
      expect(response.status).toBe(403);
    });

    it("should reject invalid mode on create", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          mode: "invalid_mode",
          sport: "football",
          handSize: 6,
        }),
      });

      const response = await createRoom(request, { params: Promise.resolve({ code: "" }) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid request body");
    });
  });

  describe("POST /api/rooms/join", () => {
    it("should join a room successfully", async () => {
      const roomWithPlayers = {
        ...mockRoom,
        players: [mockPlayer],
      };
      const emptyLobby = {
        ...mockRoom,
        status: "lobby",
        gameState: null,
        players: [],
      };

      mockPrisma.room.findUnique = jest
        .fn()
        .mockResolvedValueOnce(emptyLobby)
        .mockResolvedValueOnce({ ...mockRoom, players: [mockPlayer] })
        .mockResolvedValueOnce(roomWithPlayers);
      mockPrisma.room.update = jest.fn().mockResolvedValue({ version: 1 });
      mockPrisma.player.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.player.create = jest.fn().mockResolvedValue(mockPlayer);

      const request = new NextRequest("http://localhost:3000/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({
          code: "ABC123",
          nickname: "TestNick",
        }),
      });

      const response = await joinRoom(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // The API returns the room object directly, not wrapped in { room, player }
      expect(data).toHaveProperty("code", "ABC123");
      expect(data).toHaveProperty("players");
      expect(mockPublishRoomEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "player.joined",
          roomId: mockRoom.id,
          roomCode: "ABC123",
          playerId: mockPlayer.id,
          displayName: "TestNick",
        })
      );
    });

    it("does not emit player.joined when user already in room", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [mockPlayer],
      });
      mockPrisma.player.findUnique = jest.fn().mockResolvedValue(mockPlayer);

      const request = new NextRequest("http://localhost:3000/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: "ABC123" }),
      });

      const response = await joinRoom(request);
      expect(response.status).toBe(200);
      expect(mockPublishRoomEvent).not.toHaveBeenCalled();
    });

    it("should return 404 when room does not exist", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({
          code: "INVALI", // 6 characters, passes validation
        }),
      });

      const response = await joinRoom(request);
      expect(response.status).toBe(404);
    });

    it("should return 400 when code is invalid", async () => {
      const request = new NextRequest("http://localhost:3000/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({
          code: "AB", // Too short
        }),
      });

      const response = await joinRoom(request);
      expect(response.status).toBe(400);
    });

    it("lets a free user join a private room under the host player cap", async () => {
      const emptyLobby = {
        ...mockRoom,
        status: "lobby",
        gameState: null,
        players: [mockPlayer],
        isPublicChaos: false,
      };
      mockPrisma.room.findUnique = jest
        .fn()
        .mockResolvedValueOnce(emptyLobby)
        .mockResolvedValueOnce({ ...mockRoom, players: [mockPlayer, { ...mockPlayer, id: "p2" }] })
        .mockResolvedValueOnce({ ...mockRoom, players: [mockPlayer, { ...mockPlayer, id: "p2" }] });
      mockPrisma.room.update = jest.fn().mockResolvedValue({ version: 1 });
      mockPrisma.player.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.player.create = jest.fn().mockResolvedValue({
        ...mockPlayer,
        id: "player_joiner",
        isHost: false,
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: "ABC123" }),
      });
      const response = await joinRoom(request);
      expect(response.status).toBe(200);
    });

    it("does not require the joining player to pay when the host is at the free player cap", async () => {
      const fourPlayers = [0, 1, 2, 3].map((i) => ({
        ...mockPlayer,
        id: `player_${i}`,
        userId: `user_${i}`,
      }));
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        status: "lobby",
        gameState: null,
        isPublicChaos: false,
        players: fourPlayers,
      });
      mockPrisma.player.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.room.update = jest.fn().mockResolvedValue({ playerLimitWaiters: [] });

      const request = new NextRequest("http://localhost:3000/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: "ABC123" }),
      });
      const response = await joinRoom(request);
      const data = await response.json();
      expect(response.status).toBe(409);
      expect(data.code).toBe("HOST_PLAYER_LIMIT");
      expect(data.waiting).toBe(true);
      expect(data.paywall.trigger).toBe("player_limit");
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it("lets anyone join a public live game without paying", async () => {
      const publicLobby = {
        ...mockRoom,
        isPublicChaos: true,
        status: "lobby",
        gameState: null,
        players: [mockPlayer],
      };
      mockPrisma.room.findUnique = jest
        .fn()
        .mockResolvedValueOnce(publicLobby)
        .mockResolvedValueOnce({ ...publicLobby, players: [mockPlayer] })
        .mockResolvedValueOnce({ ...publicLobby, players: [mockPlayer] });
      mockPrisma.room.update = jest.fn().mockResolvedValue({ version: 1 });
      mockPrisma.player.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.player.create = jest.fn().mockResolvedValue({
        ...mockPlayer,
        id: "dropin",
        isHost: false,
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: "ABC123" }),
      });
      const response = await joinRoom(request);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/rooms/[code]", () => {
    it("should return room data", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        gameState: null,
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123");
      const response = await getRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("code", "ABC123");
    });

    it("should return 404 when room does not exist", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/rooms/INVALID");
      const response = await getRoom(request, {
        params: Promise.resolve({ code: "INVALID" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/rooms/[code]/snapshot", () => {
    it("should return snapshot with version, players, and hand", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        version: 1,
        gameState: null,
      });
      mockPrisma.cardSubmission.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.cardInstance.findMany = jest.fn().mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123/snapshot");
      const response = await getSnapshot(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("roomId", "room_123");
      expect(data).toHaveProperty("roomCode", "ABC123");
      expect(data).toHaveProperty("version", 1);
      expect(data).toHaveProperty("mode", "casual");
      expect(data).toHaveProperty("players");
      expect(data).toHaveProperty("submissions");
      expect(data).toHaveProperty("hand");
    });

    it("should return 404 when room does not exist", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/rooms/INVALID/snapshot");
      const response = await getSnapshot(request, {
        params: Promise.resolve({ code: "INVALID" }),
      });

      expect(response.status).toBe(404);
    });

    it("should return 403 when the caller is not in the room", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        hostId: "other_host",
        players: [],
        gameState: null,
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123/snapshot");
      const response = await getSnapshot(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /api/rooms/[code]", () => {
    it("should update room settings as host", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [mockPlayer],
      });
      mockPrisma.room.update = jest.fn().mockResolvedValue({
        ...mockRoom,
        mode: "party",
        sport: "basketball",
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({
          mode: "party",
          sport: "basketball",
        }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mode).toBe("party");
      expect(data.sport).toBe("basketball");
    });

    it("does not persist allowQuarterClearing true while launch hides round controls", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [mockPlayer],
      });
      mockPrisma.room.update = jest.fn().mockResolvedValue({
        ...mockRoom,
        allowQuarterClearing: false,
        players: [mockPlayer],
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({
          allowQuarterClearing: true,
        }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.room.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            allowQuarterClearing: false,
          }),
        }),
      );
    });

    it("should return 403 when user is not host", async () => {
      // The PATCH route queries players with where: { userId: user.id, isHost: true }
      // So if user is not host, players array will be empty
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [], // Empty array means no host player found
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({
          mode: "party",
        }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(403);
    });

    it("should reject invalid mode on PATCH", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [mockPlayer],
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({
          mode: "freeform_invalid",
        }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid request body");
    });

    it("should allow PATCH without mode (optional)", async () => {
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        players: [mockPlayer],
      });
      mockPrisma.room.update = jest.fn().mockResolvedValue({
        ...mockRoom,
        handSize: 8,
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({
          handSize: 8,
        }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(200);
    });

    it("forces allowJoinInProgress true when patching a public chaos room", async () => {
      let updateData: Record<string, unknown> = {};
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        isPublicChaos: true,
        allowJoinInProgress: false,
        players: [mockPlayer],
      });
      mockPrisma.room.update = jest.fn().mockImplementation(({ data }) => {
        updateData = data;
        return Promise.resolve({
          ...mockRoom,
          isPublicChaos: true,
          allowJoinInProgress: true,
          players: [mockPlayer],
          ...data,
        });
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({ allowJoinInProgress: false }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(200);
      expect(updateData.allowJoinInProgress).toBe(true);
      const data = await response.json();
      expect(data.allowJoinInProgress).toBe(true);
    });

    it("allows private room host to set allowJoinInProgress false", async () => {
      let updateData: Record<string, unknown> = {};
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        isPublicChaos: false,
        allowJoinInProgress: true,
        players: [mockPlayer],
      });
      mockPrisma.room.update = jest.fn().mockImplementation(({ data }) => {
        updateData = data;
        return Promise.resolve({
          ...mockRoom,
          isPublicChaos: false,
          allowJoinInProgress: false,
          players: [mockPlayer],
          ...data,
        });
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({ allowJoinInProgress: false }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(200);
      expect(updateData.allowJoinInProgress).toBe(false);
      const data = await response.json();
      expect(data.allowJoinInProgress).toBe(false);
    });

    it("includes allowJoinInProgress true on any public chaos PATCH (e.g. handSize only)", async () => {
      let updateData: Record<string, unknown> = {};
      mockPrisma.room.findUnique = jest.fn().mockResolvedValue({
        ...mockRoom,
        isPublicChaos: true,
        allowJoinInProgress: false,
        players: [mockPlayer],
      });
      mockPrisma.room.update = jest.fn().mockImplementation(({ data }) => {
        updateData = data;
        return Promise.resolve({
          ...mockRoom,
          isPublicChaos: true,
          handSize: 8,
          allowJoinInProgress: true,
          players: [mockPlayer],
          ...data,
        });
      });

      const request = new NextRequest("http://localhost:3000/api/rooms/ABC123", {
        method: "PATCH",
        body: JSON.stringify({ handSize: 8 }),
      });

      const response = await updateRoom(request, {
        params: Promise.resolve({ code: "ABC123" }),
      });

      expect(response.status).toBe(200);
      expect(updateData.allowJoinInProgress).toBe(true);
      expect(updateData.handSize).toBe(8);
    });
  });
});
