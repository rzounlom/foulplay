/** Local re-engagement when someone bails mid-streak (same browser). */

const KEY = "foulplay-streak-nudge";

export type StreakNudgePayload = {
  streakCount: number;
  endedRoomCode: string;
  at: number;
};

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function recordStreakNudge(
  streakCount: number,
  endedRoomCode: string,
): void {
  if (streakCount < 2 || typeof window === "undefined") return;
  try {
    const p: StreakNudgePayload = {
      streakCount,
      endedRoomCode: endedRoomCode.toUpperCase(),
      at: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function clearStreakNudge(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function readStreakNudge(): StreakNudgePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StreakNudgePayload;
    if (
      typeof p.streakCount !== "number" ||
      typeof p.endedRoomCode !== "string" ||
      typeof p.at !== "number"
    ) {
      return null;
    }
    if (Date.now() - p.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return {
      streakCount: p.streakCount,
      endedRoomCode: p.endedRoomCode.toUpperCase(),
      at: p.at,
    };
  } catch {
    return null;
  }
}
