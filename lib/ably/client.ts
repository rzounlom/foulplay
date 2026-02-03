import Ably from "ably";

let ablyClient: Ably.Realtime | null = null;

/**
 * Get or create Ably client instance
 * For server-side usage (API routes)
 */
export function getAblyClient(): Ably.Realtime {
  if (!ablyClient) {
    // Try ABLY_API_KEY first (server-only), fallback to NEXT_PUBLIC_ABLY_API_KEY
    const apiKey = process.env.ABLY_API_KEY || process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ABLY_API_KEY or NEXT_PUBLIC_ABLY_API_KEY environment variable must be set"
      );
    }
    ablyClient = new Ably.Realtime({ key: apiKey });
  }
  return ablyClient;
}

/**
 * Get Ably channel for a room
 */
export function getRoomChannel(roomCode: string): Ably.RealtimeChannel {
  const client = getAblyClient();
  return client.channels.get(`room:${roomCode}`);
}
