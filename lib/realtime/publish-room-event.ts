/**
 * Centralized Ably publish helper for authoritative room state events.
 * Publish only after DB commit. Never publish full room snapshots.
 *
 * Channel: room:{roomCode}:state (Phase 3+; use roomCode when present).
 * Fallback: room:{roomId}:state for events without roomCode.
 */

import { getAblyClient } from "@/lib/ably/client";
import type { RoomEvent } from "./room-events";

const STATE_CHANNEL_SUFFIX = ":state";

/**
 * Publish an authoritative room state event to the room's state channel.
 * Uses roomCode when present (room:{roomCode}:state), else roomId.
 */
export async function publishRoomEvent(event: RoomEvent): Promise<void> {
  const channelId =
    "roomCode" in event && event.roomCode
      ? event.roomCode
      : event.roomId;
  const channelName = `room:${channelId}${STATE_CHANNEL_SUFFIX}`;
  const client = getAblyClient();
  const channel = client.channels.get(channelName);
  await channel.publish("event", event);
  if (process.env.NODE_ENV === "development") {
    console.debug("[publishRoomEvent]", event.type, channelName, "v" + event.version);
  }
}
