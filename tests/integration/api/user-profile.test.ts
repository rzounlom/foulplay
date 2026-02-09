/**
 * Integration tests for user profile API routes
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

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { GET as getProfile, PATCH as updateProfile } from "@/app/api/user/profile/route";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { mockUser } from "@/tests/helpers/mocks";

const mockGetCurrentUserFromRequest = getCurrentUserFromRequest as jest.MockedFunction<typeof getCurrentUserFromRequest>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockProfile = {
  id: mockUser.id,
  name: mockUser.name,
  defaultNickname: null as string | null,
  gamesPlayed: 0,
  gamesWon: 0,
  totalPoints: 0,
  skipTour: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("User Profile API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserFromRequest.mockResolvedValue(mockUser);
  });

  describe("GET /api/user/profile", () => {
    it("should return profile when authenticated", async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockProfile);

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await getProfile(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("profile");
      expect(data.profile).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        defaultNickname: null,
        gamesPlayed: 0,
        gamesWon: 0,
        totalPoints: 0,
        skipTour: false,
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await getProfile(request);
      expect(response.status).toBe(401);
    });

    it("should return 404 when user not found in DB", async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await getProfile(request);
      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/user/profile", () => {
    it("should update defaultNickname and skipTour", async () => {
      const updated = {
        ...mockProfile,
        defaultNickname: "PlayerOne",
        skipTour: true,
        updatedAt: new Date(),
      };
      mockPrisma.user.update = jest.fn().mockResolvedValue(updated);

      const request = new Request("http://localhost:3000/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultNickname: "PlayerOne", skipTour: true }),
      });

      const response = await updateProfile(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.defaultNickname).toBe("PlayerOne");
      expect(data.profile.skipTour).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      mockGetCurrentUserFromRequest.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipTour: true }),
      });

      const response = await updateProfile(request);
      expect(response.status).toBe(401);
    });
  });
});
