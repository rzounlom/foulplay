import Ably from "ably";

let client: Ably.Realtime | null = null;

function getClient(): Ably.Realtime | null {
  const key = process.env.EXPO_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  if (!client) client = new Ably.Realtime({ key });
  return client;
}

/**
 * Subscribe to room channel. Returns unsubscribe function.
 * If Ably key is not set, returns a no-op unsubscribe.
 */
export function subscribeToRoom(
  roomCode: string,
  onGameStarted: () => void
): () => void {
  const c = getClient();
  if (!c) return () => {};
  const channel = c.channels.get(`room:${roomCode}`);
  const handler = () => onGameStarted();
  channel.subscribe("game_started", handler);
  return () => {
    channel.unsubscribe("game_started", handler);
  };
}
