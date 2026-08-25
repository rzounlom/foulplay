/**
 * Integration tests for age confirmation API
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
      update: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { POST as confirmAge } from "@/app/api/user/age-confirm/route";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { mockUser } from "@/tests/helpers/mocks";

const mockGetCurrentUserFromRequest = getCurrentUserFromRequest as jest.MockedFunction<
  typeof getCurrentUserFromRequest
>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Age confirm API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserFromRequest.mockResolvedValue(mockUser);
  });

  it("saves 21+ confirmation", async () => {
    const confirmedAt = new Date("2026-08-25T09:00:00.000Z");
    mockPrisma.user.update = jest.fn().mockResolvedValue({
      id: mockUser.id,
      is21Plus: true,
      ageConfirmedAt: confirmedAt,
    });

    const request = new NextRequest("http://localhost:3000/api/user/age-confirm", {
      method: "POST",
      body: JSON.stringify({ is21Plus: true }),
    });

    const response = await confirmAge(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.is21Plus).toBe(true);
    expect(data.profile.ageConfirmedAt).toBe(confirmedAt.toISOString());
  });

  it("saves under-21 confirmation", async () => {
    mockPrisma.user.update = jest.fn().mockResolvedValue({
      id: mockUser.id,
      is21Plus: false,
      ageConfirmedAt: new Date("2026-08-25T09:00:00.000Z"),
    });

    const request = new NextRequest("http://localhost:3000/api/user/age-confirm", {
      method: "POST",
      body: JSON.stringify({ is21Plus: false }),
    });

    const response = await confirmAge(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.is21Plus).toBe(false);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserFromRequest.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/user/age-confirm", {
      method: "POST",
      body: JSON.stringify({ is21Plus: true }),
    });

    const response = await confirmAge(request);
    expect(response.status).toBe(401);
  });
});
