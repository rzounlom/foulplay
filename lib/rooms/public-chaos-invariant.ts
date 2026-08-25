/**
 * Public chaos (drop-in live) rooms must always allow joining during an active game.
 * Enforced in APIs, joins, matchmaking, and DB repair — not UI alone.
 */

export function roomAllowsMidGameJoin(room: {
  status: string;
  isPublicChaos?: boolean;
  allowJoinInProgress: boolean;
}): boolean {
  if (room.status === "lobby") return true;
  if (room.isPublicChaos) return true;
  return room.allowJoinInProgress;
}

/** Effective value for API responses (legacy rows may still have false in DB until repaired). */
export function effectiveAllowJoinInProgress(room: {
  isPublicChaos?: boolean;
  allowJoinInProgress: boolean;
}): boolean {
  return !!room.isPublicChaos || room.allowJoinInProgress;
}
