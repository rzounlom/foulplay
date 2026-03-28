/** Session payload for lobby “Round 2” UX after Run it back (same tab). */

export const REMATCH_ENTRY_STORAGE_KEY = "foulplay-rematch-entry";

export type RematchEntryPayload = {
  v: 1;
  targetRoomCode: string;
  sourceRoomCode: string;
  round: number;
  previousWinnerUserId: string | null;
  previousWinnerDisplayName: string;
  /** User ids carried into the new lobby from rematch */
  crewUserIds: string[];
};

export function writeRematchEntry(payload: RematchEntryPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(REMATCH_ENTRY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readRematchEntryForRoom(roomCode: string): RematchEntryPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(REMATCH_ENTRY_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as RematchEntryPayload;
    if (
      p?.v !== 1 ||
      typeof p.targetRoomCode !== "string" ||
      p.targetRoomCode.toUpperCase() !== roomCode.toUpperCase()
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearRematchEntry(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(REMATCH_ENTRY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
