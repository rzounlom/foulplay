/**
 * Public chaos analytics — persists via trackEvent + optional webhook (legacy export).
 */

import type { PublicChaosJoinSource } from "@/lib/analytics/events";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";

export type PublicChaosEventName =
  | "public_room_created"
  | "public_room_joined"
  | "public_room_game_started"
  | "public_room_run_it_back"
  | "public_room_abandoned";

export type { PublicChaosJoinSource };

export function emitPublicChaosEvent(
  name: PublicChaosEventName,
  payload: Record<string, unknown>,
): void {
  const userId =
    typeof payload.userId === "string"
      ? payload.userId
      : typeof payload.hostUserId === "string"
        ? payload.hostUserId
        : null;
  const roomId = typeof payload.roomId === "string" ? payload.roomId : null;

  trackEventFireAndForget({
    name,
    userId,
    roomId,
    props: payload,
  });
}
