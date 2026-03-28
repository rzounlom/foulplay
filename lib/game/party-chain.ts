/**
 * Party Never Ends — lightweight streak + squad continuity (per room chain).
 */

export type PartyChainMeta = {
  /** Completed games in this continuity (incremented when a game ends). */
  streakCount: number;
  /** User ids in the room when the last game ended (baseline for overlap). */
  priorCrewUserIds: string[];
  priorRoomCode: string;
  defendingChampionUserId: string | null;
  defendingChampionDisplayName: string;
  /** Set when spawning rematch lobby from prior room */
  returnedFromPriorCount?: number;
  priorCrewSize?: number;
};

export function parsePartyChainMeta(raw: unknown): PartyChainMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const streakCount = typeof o.streakCount === "number" ? o.streakCount : NaN;
  const priorCrewUserIds = Array.isArray(o.priorCrewUserIds)
    ? o.priorCrewUserIds.filter((x): x is string => typeof x === "string")
    : [];
  const priorRoomCode =
    typeof o.priorRoomCode === "string" ? o.priorRoomCode : "";
  const defendingChampionUserId =
    typeof o.defendingChampionUserId === "string"
      ? o.defendingChampionUserId
      : o.defendingChampionUserId === null
        ? null
        : null;
  const defendingChampionDisplayName =
    typeof o.defendingChampionDisplayName === "string"
      ? o.defendingChampionDisplayName
      : "";
  const returnedFromPriorCount =
    typeof o.returnedFromPriorCount === "number" &&
    Number.isFinite(o.returnedFromPriorCount)
      ? o.returnedFromPriorCount
      : undefined;
  const priorCrewSize =
    typeof o.priorCrewSize === "number" && Number.isFinite(o.priorCrewSize)
      ? o.priorCrewSize
      : undefined;
  if (!Number.isFinite(streakCount) || streakCount < 0) return null;
  return {
    streakCount,
    priorCrewUserIds,
    priorRoomCode,
    defendingChampionUserId,
    defendingChampionDisplayName,
    ...(returnedFromPriorCount !== undefined
      ? { returnedFromPriorCount }
      : {}),
    ...(priorCrewSize !== undefined ? { priorCrewSize } : {}),
  };
}

/** After a game ends: increment streak and snapshot crew + new champion. */
export function buildPartyMetaAfterGameEnd(input: {
  previousMeta: PartyChainMeta | null;
  roomCode: string;
  crewUserIds: string[];
  winnerUserId: string;
  winnerDisplayName: string;
}): PartyChainMeta {
  const streakCount = (input.previousMeta?.streakCount ?? 0) + 1;
  return {
    streakCount,
    priorCrewUserIds: [...input.crewUserIds],
    priorRoomCode: input.roomCode,
    defendingChampionUserId: input.winnerUserId,
    defendingChampionDisplayName: input.winnerDisplayName,
  };
}

const OVERLAP_CARRY_MIN = 0.5;

/** New rematch lobby: carry streak if ≥ half the old crew returns; else reset to 0. */
export function buildPartyChainMetaForRematchLobby(input: {
  sourcePartyMeta: PartyChainMeta | null;
  lastGameEndResult: {
    winnerUserId?: string;
    winnerName: string;
    winnerNickname: string | null;
  } | null;
  newParticipantUserIds: string[];
  sourceRoomCode: string;
}): PartyChainMeta {
  const oldCrew = input.sourcePartyMeta?.priorCrewUserIds?.length
    ? [...input.sourcePartyMeta.priorCrewUserIds]
    : [];
  const oldSize = oldCrew.length;
  const newSet = new Set(input.newParticipantUserIds);
  const returned = oldCrew.filter((id) => newSet.has(id)).length;
  const overlap = oldSize > 0 ? returned / oldSize : 1;
  const carried =
    overlap >= OVERLAP_CARRY_MIN ? input.sourcePartyMeta?.streakCount ?? 0 : 0;

  const wr = input.lastGameEndResult;
  const defendingName =
    wr?.winnerNickname?.trim() || wr?.winnerName || "Champion";

  return {
    streakCount: carried,
    priorCrewUserIds: [...input.newParticipantUserIds],
    priorRoomCode: input.sourceRoomCode,
    defendingChampionUserId: wr?.winnerUserId ?? null,
    defendingChampionDisplayName: defendingName,
    returnedFromPriorCount: oldSize > 0 ? returned : undefined,
    priorCrewSize: oldSize > 0 ? oldSize : undefined,
  };
}

export function getPartyStreakCosmeticTitle(streakCount: number): string | null {
  if (streakCount >= 7) return "Unstoppable 🐐";
  if (streakCount >= 5) return "Chaos Agent 😈";
  if (streakCount >= 3) return "Hot Streak 🔥";
  return null;
}

export type PartyMomentumBand = "low" | "mid" | "high";

export function getPartyMomentumBand(
  streakCount: number,
): PartyMomentumBand {
  if (streakCount >= 5) return "high";
  if (streakCount >= 3) return "mid";
  return "low";
}

const MOMENTUM_BY_BAND: Record<PartyMomentumBand, string[]> = {
  low: [
    "That was just a warmup 😏",
    "Easy energy — run it back 🔁",
    "Still warming up the room 🔥",
  ],
  mid: [
    "Now it’s getting competitive 👀",
    "The squad’s locking in…",
    "Things are heating up ⚡",
  ],
  high: [
    "This is getting dangerous 😈",
    "No one’s tapping out 😤",
    "Absolute scenes out here 🔥",
  ],
};

export function pickMomentumMessage(
  streakCount: number,
  rotationIndex: number,
): string {
  const band = getPartyMomentumBand(streakCount);
  const lines = MOMENTUM_BY_BAND[band];
  return lines[rotationIndex % lines.length] ?? lines[0] ?? "";
}
