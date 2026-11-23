/**
 * Centralized Ably publish helper for authoritative room state events.
 * Publish only after DB commit. Never publish full room snapshots.
 *
 * Channel: room:{namespace?}{roomCode}:state. Production is unprefixed.
 */

import { getAblyClient } from "@/lib/ably/client";
import { ablyStateChannelName } from "@/lib/ably/channels";
import type { RoomEvent } from "./room-events";

/**
 * Publish an authoritative room state event to the room's state channel.
 * Uses roomCode when present (room:{roomCode}:state), else roomId.
 */
export async function publishRoomEvent(event: RoomEvent): Promise<void> {
  const channelId =
    "roomCode" in event && event.roomCode
      ? event.roomCode
      : event.roomId;
  const channelName = ablyStateChannelName(channelId);
  const client = getAblyClient();
  const channel = client.channels.get(channelName);
  await channel.publish("event", event);
  if (process.env.NODE_ENV === "development") {
    console.debug("[publishRoomEvent]", event.type, channelName, "v" + event.version);
  }
}
