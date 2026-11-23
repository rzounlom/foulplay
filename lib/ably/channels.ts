/**
 * Ably channel names. Production keeps historical `room:{code}` names.
 * Preview/dev prefix so inherited room codes cannot collide with production.
 *
 * Client and server must use the same NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE.
 * Leave it unset in production.
 */
export function getAblyChannelNamespace(): string | null {
  const ns = process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE?.trim();
  return ns ? ns : null;
}

export function ablyRoomChannelName(roomCode: string): string {
  const ns = getAblyChannelNamespace();
  return ns ? `room:${ns}:${roomCode}` : `room:${roomCode}`;
}

export function ablyStateChannelName(roomCode: string): string {
  return `${ablyRoomChannelName(roomCode)}:state`;
}
