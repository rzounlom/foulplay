/**
 * Native Ably is disabled until token auth is wired (same as web
 * `/api/ably/token`). Do not ship EXPO_PUBLIC_ABLY_API_KEY.
 */
export function subscribeToRoom(
  roomCode: string,
  onGameStarted: () => void,
): () => void {
  void roomCode;
  void onGameStarted;
  return () => {};
}
