import { NextResponse } from "next/server";
import Ably from "ably";

/**
 * GET /api/ably/token
 * Issues short-lived Ably tokens for client authentication.
 * Use authUrl instead of exposing the API key to the client (recommended for production).
 *
 * Required env: ABLY_API_KEY (server-side, not NEXT_PUBLIC_)
 */
export async function GET() {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ABLY_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const client = new Ably.Rest(apiKey);
    const tokenRequest = await client.auth.createTokenRequest({
      clientId: `ably-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Failed to create Ably token:", error);
    return NextResponse.json(
      { error: "Failed to create Ably token" },
      { status: 500 }
    );
  }
}

// Prevent caching so tokens stay fresh
export const dynamic = "force-dynamic";
export const revalidate = 0;
