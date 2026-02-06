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
import { POST as createRoom } from "@/app/api/rooms/route";
import { POST as joinRoom } from "@/app/api/rooms/join/route";
import { mockUser, mockPlayer, mockRoom } from "@/tests/helpers/mocks";

// Mock dependencies
jest.mock("@/lib/auth/clerk", () => ({
  getCurrentUser: jest.fn(),
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
      },
      player: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    },
  };
});

jest.mock("@/lib/rooms/utils", () => ({
  generateRoomCode: jest.fn(() => "ABC123"),
}));

import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Room API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
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

    it("should return 401 when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

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
          handSize: 15, // Invalid: exceeds max of 10
        }),
      });

      const response = await createRoom(request, { params: Promise.resolve({ code: "" }) });
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/rooms/join", () => {
    it("should join a room successfully", async () => {
      const roomWithPlayers = {
        ...mockRoom,
        players: [mockPlayer],
      };
      
      mockPrisma.room.findUnique = jest
        .fn()
        .mockResolvedValueOnce({
          ...mockRoom,
          players: [],
        })
        .mockResolvedValueOnce(roomWithPlayers);
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
  });
});
