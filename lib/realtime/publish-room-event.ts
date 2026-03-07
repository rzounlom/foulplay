/**
 * Centralized Ably publish helper for authoritative room state events.
 * Publish only after DB commit. Never publish full room snapshots.
 *
 * Channel: room:{roomId}:state (separate from presence/other channels).
 */

import { getAblyClient } from "@/lib/ably/client";
import type { RoomEvent } from "./room-events";

const STATE_CHANNEL_SUFFIX = ":state";

/**
 * Publish an authoritative room state event to the room's state channel.
 * Uses roomId (Room.id) for the channel name per PRD.
 */
export async function publishRoomEvent(event: RoomEvent): Promise<void> {
  const channelName = `room:${event.roomId}${STATE_CHANNEL_SUFFIX}`;
  const client = getAblyClient();
  const channel = client.channels.get(channelName);
  await channel.publish("event", event);
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console -- dev logging for realtime events
    console.debug("[publishRoomEvent]", event.type, channelName, "v" + event.version);
  }
}
