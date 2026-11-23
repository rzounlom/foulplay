jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    url: string;
    nextUrl: { searchParams: URLSearchParams };
    constructor(url: string) {
      this.url = url;
      this.nextUrl = { searchParams: new URL(url).searchParams };
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      json: async () => data,
      status: init?.status ?? 200,
      headers: init?.headers,
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
    },
  },
}));

const mockCreateTokenRequest = jest.fn();

jest.mock("ably", () => ({
  Rest: jest.fn().mockImplementation(() => ({
    auth: {
      createTokenRequest: mockCreateTokenRequest,
    },
  })),
}));

import { NextRequest } from "next/server";
import { GET as issueToken } from "@/app/api/ably/token/route";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { mockUser } from "@/tests/helpers/mocks";
import { resetRateLimitBuckets } from "@/lib/http/rate-limit";

const mockGetUser = getCurrentUserFromRequest as jest.MockedFunction<
  typeof getCurrentUserFromRequest
>;

describe("GET /api/ably/token", () => {
  const originalKey = process.env.ABLY_API_KEY;
  const originalNamespace = process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;

  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitBuckets();
    process.env.ABLY_API_KEY = "ably-test-key";
    delete process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    mockCreateTokenRequest.mockResolvedValue({
      keyName: "key",
      timestamp: 1,
      nonce: "n",
      mac: "m",
    });
  });

  afterAll(() => {
    process.env.ABLY_API_KEY = originalKey;
    if (originalNamespace === undefined) {
      delete process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    } else {
      process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE = originalNamespace;
    }
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/ably/token?roomCode=ABC123");
    const response = await issueToken(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 without a room code", async () => {
    mockGetUser.mockResolvedValue(mockUser as never);
    const request = new NextRequest("http://localhost/api/ably/token");
    const response = await issueToken(request);
    expect(response.status).toBe(400);
  });

  it("returns 403 when the user is not in the room", async () => {
    mockGetUser.mockResolvedValue(mockUser as never);
    (prisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: "room_123",
      hostId: "someone_else",
      players: [],
    });
    const request = new NextRequest("http://localhost/api/ably/token?roomCode=ABC123");
    const response = await issueToken(request);
    expect(response.status).toBe(403);
    expect(mockCreateTokenRequest).not.toHaveBeenCalled();
  });

  it("issues a subscribe-only token for a room member", async () => {
    mockGetUser.mockResolvedValue(mockUser as never);
    (prisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: "room_123",
      hostId: mockUser.id,
      players: [{ userId: mockUser.id }],
    });
    const request = new NextRequest("http://localhost/api/ably/token?roomCode=abc123");
    const response = await issueToken(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.keyName).toBe("key");
    expect(mockCreateTokenRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: mockUser.clerkId,
        capability: JSON.stringify({
          "room:ABC123": ["subscribe"],
          "room:ABC123:state": ["subscribe"],
        }),
      }),
    );
  });

  it("issues namespaced capabilities when a preview namespace is set", async () => {
    process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE = "preview";
    mockGetUser.mockResolvedValue(mockUser as never);
    (prisma.room.findUnique as jest.Mock).mockResolvedValue({
      id: "room_123",
      hostId: mockUser.id,
      players: [{ userId: mockUser.id }],
    });
    const request = new NextRequest("http://localhost/api/ably/token?roomCode=ABC123");
    const response = await issueToken(request);
    expect(response.status).toBe(200);
    expect(mockCreateTokenRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: JSON.stringify({
          "room:preview:ABC123": ["subscribe"],
          "room:preview:ABC123:state": ["subscribe"],
        }),
      }),
    );
  });
});
