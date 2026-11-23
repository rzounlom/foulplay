import { NextRequest, NextResponse } from "next/server";
import Ably from "ably";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import {
  ablySubscribeCapability,
  findRoomAccess,
  normalizeRoomCode,
} from "@/lib/ably/token-auth";
import { consumeRateLimit } from "@/lib/http/rate-limit";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const TOKEN_LIMIT_PER_MINUTE = 30;

/**
 * GET /api/ably/token?roomCode=XXXXXX
 * Issues a short-lived, subscribe-only Ably token for a room the caller belongs to.
 * Never returns the root API key.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = consumeRateLimit(
    `ably-token:${user.id}`,
    TOKEN_LIMIT_PER_MINUTE,
    60_000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many token requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
        },
      },
    );
  }

  const roomCode = normalizeRoomCode(
    request.nextUrl.searchParams.get("roomCode"),
  );
  if (!roomCode) {
    return NextResponse.json(
      { error: "roomCode is required" },
      { status: 400 },
    );
  }

  const access = await findRoomAccess(user.id, roomCode);
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ABLY_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const client = new Ably.Rest(apiKey);
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: user.clerkId,
      capability: JSON.stringify(ablySubscribeCapability(roomCode)),
      ttl: TOKEN_TTL_MS,
    });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Failed to create Ably token:", error);
    return NextResponse.json(
      { error: "Failed to create Ably token" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
