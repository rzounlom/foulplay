jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    nextUrl: URL;

    constructor(url: string) {
      this.url = url;
      this.nextUrl = new URL(url);
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => Promise.resolve(data),
      status: init?.status ?? 200,
    }),
  },
}));

jest.mock("@/lib/admin/is-admin", () => ({
  getAdminUserFromRequest: jest.fn(),
}));

jest.mock("@/lib/admin/metrics", () => ({
  getAdminMetrics: jest.fn(),
  parseMetricsRange: jest.fn((value: string | null) => {
    if (value === "24h" || value === "30d") return value;
    return "7d";
  }),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/metrics/route";
import { getAdminUserFromRequest } from "@/lib/admin/is-admin";
import { getAdminMetrics } from "@/lib/admin/metrics";
import { mockUser } from "@/tests/helpers/mocks";

const mockGetAdminUserFromRequest =
  getAdminUserFromRequest as jest.MockedFunction<typeof getAdminUserFromRequest>;
const mockGetAdminMetrics =
  getAdminMetrics as jest.MockedFunction<typeof getAdminMetrics>;

describe("GET /api/admin/metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 403 for non-admin users", async () => {
    mockGetAdminUserFromRequest.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/admin/metrics");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: "Forbidden" });
    expect(mockGetAdminMetrics).not.toHaveBeenCalled();
  });

  it("returns metrics for admin users", async () => {
    mockGetAdminUserFromRequest.mockResolvedValue(mockUser);
    mockGetAdminMetrics.mockResolvedValue({
      range: "7d",
      generatedAt: "2026-01-01T00:00:00.000Z",
      overview: {
        signupsToday: 1,
        signupsPeriod: 5,
        totalUsers: 10,
        activeUsersPeriod: 4,
        liveGames: 2,
        livePlayers: 6,
        gamesStartedPeriod: 3,
        gamesEndedPeriod: 2,
        completionRate: 67,
        roomsCreatedPeriod: 4,
        roomsJoinedPeriod: 8,
        submissionsPeriod: 12,
        dropInPeriod: 1,
        ageGateCompleted: 7,
        is21PlusCount: 6,
      },
      signupsByDay: [],
      gamesByDay: [],
      eventCounts: [],
      liveRooms: [],
      productMix: {
        modes: {},
        sports: {},
        publicVsPrivate: { public: 0, private: 0 },
      },
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/metrics?range=7d",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overview.signupsPeriod).toBe(5);
    expect(mockGetAdminMetrics).toHaveBeenCalledWith("7d");
  });
});
