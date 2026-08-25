/**
 * Browser-only session helpers for public chaos abandoned analytics.
 */

const ACTIVE_KEY_PREFIX = "foulplay-public-chaos-active:";
const VISIT_KEY_PREFIX = "foulplay-public-chaos-visits:";

function upperCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export type PublicChaosActiveSession = {
  startedAt: number;
  visitOrdinal: number;
};

export function markPublicChaosActiveSession(roomCode: string): void {
  if (typeof window === "undefined") return;
  const code = upperCode(roomCode);
  const activeKey = `${ACTIVE_KEY_PREFIX}${code}`;
  if (sessionStorage.getItem(activeKey)) return;

  const visitKey = `${VISIT_KEY_PREFIX}${code}`;
  const prev = Number(window.localStorage.getItem(visitKey) || "0");
  const visitOrdinal = prev + 1;
  window.localStorage.setItem(visitKey, String(visitOrdinal));

  sessionStorage.setItem(
    activeKey,
    JSON.stringify({ startedAt: Date.now(), visitOrdinal } satisfies PublicChaosActiveSession),
  );
}

export function getPublicChaosActiveSession(
  roomCode: string,
): PublicChaosActiveSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${ACTIVE_KEY_PREFIX}${upperCode(roomCode)}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PublicChaosActiveSession;
    if (
      typeof parsed.startedAt === "number" &&
      typeof parsed.visitOrdinal === "number"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPublicChaosActiveSession(roomCode: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${ACTIVE_KEY_PREFIX}${upperCode(roomCode)}`);
}

/**
 * Best-effort abandoned event (navigation away / Home). Uses keepalive fetch for tab close.
 */
export function reportPublicChaosAbandoned(args: {
  roomCode: string;
  playerCount?: number;
}): void {
  if (typeof window === "undefined") return;
  const code = upperCode(args.roomCode);
  const meta = getPublicChaosActiveSession(code);
  if (!meta) return;

  const durationMs = Math.max(0, Date.now() - meta.startedAt);
  const repeatVisit = meta.visitOrdinal > 1;

  const body = JSON.stringify({
    event: "public_room_abandoned" as const,
    roomCode: code,
    durationMs,
    playerCount: args.playerCount,
    repeatVisit,
    sessionVisitOrdinal: meta.visitOrdinal,
  });

  clearPublicChaosActiveSession(code);

  void fetch("/api/analytics/public-chaos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "include",
  }).catch(() => {});
}
