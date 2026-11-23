import type * as Ably from "ably";

/**
 * Browser Ably options. Always uses short-lived tokens from /api/ably/token.
 * Never embed ABLY_API_KEY or NEXT_PUBLIC_ABLY_API_KEY in the client bundle.
 */
export function getBrowserAblyOptions(roomCode: string): Ably.ClientOptions {
  return {
    authUrl: "/api/ably/token",
    authMethod: "GET",
    authParams: { roomCode: roomCode.toUpperCase() },
    realtimeRequestTimeout: 60000,
    disconnectedRetryTimeout: 10000,
  };
}
