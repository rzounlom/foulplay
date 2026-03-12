/**
 * Apply a typed room event to local state.
 * Returns a new state object; does not mutate.
 */

import type { RoomEvent } from "./room-events";

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  version: number;
  status: string;
  mode: string | null;
  sport: string | null;
  handSize: number;
  showPoints: boolean;
  allowJoinInProgress?: boolean;
  allowQuarterClearing: boolean;
  canTurnInCards?: boolean;
  currentQuarter: string | null;
  quarterIntermissionEndsAt: string | Date | null;
  pendingQuarterDiscardSelections?: Record<string, string[]> | null;
  quarterDiscardDonePlayerIds?: string[] | null;
  suggestEndRoundPlayerIds?: string[] | null;
  players: Array<{
    id: string;
    userId: string;
    points: number;
    isHost: boolean;
    nickname?: string | null;
    user: { id: string; name: string };
  }>;
  currentTurnPlayerId: string | null;
  activeCardInstance: unknown | null;
  submissions: Array<{
    id: string;
    status: string;
    submittedByPlayerId?: string;
    submittedBy?: { id: string; user: { id: string; name: string }; nickname?: string | null };
    cardInstances?: unknown[];
    votes?: unknown[];
    autoAcceptAt?: string;
    createdAt?: string;
  }>;
  hand: Array<{ id: string; card: unknown; status: string }>;
}

/**
 * Apply a room event to the snapshot. Returns a new snapshot; does not mutate.
 * Events that require a full refetch (e.g. room.resync_required) return null.
 */
export function applyRoomEvent(
  prev: RoomSnapshot,
  event: RoomEvent,
  currentUserId: string
): RoomSnapshot | null {
  switch (event.type) {
    case "submission.accepted":
    case "submission.rejected": {
      const nextSubmissions = prev.submissions.filter(
        (s) => s.id !== event.submissionId
      );
      return {
        ...prev,
        version: event.version,
        submissions: nextSubmissions,
      };
    }

    case "submission.created": {
      const submitter = prev.players.find((p) => p.id === event.submittedByPlayerId);
      const newSubmission = {
        id: event.submissionId,
        status: "pending",
        submittedByPlayerId: event.submittedByPlayerId,
        submittedBy: submitter
          ? { id: submitter.id, user: submitter.user, nickname: submitter.nickname ?? null }
          : undefined,
        autoAcceptAt: event.autoAcceptAt,
        createdAt: new Date(Date.now() - 1000).toISOString(), // approximate for countdown fallback
        cardInstances: [],
        votes: [],
      };
      return {
        ...prev,
        version: event.version,
        submissions: [newSubmission, ...prev.submissions],
      };
    }

    case "submission.vote_cast": {
      // Vote cast: we'd need submission/card data to patch. For now, mark that we need a refresh.
      // The event doesn't include full vote counts, so we can't patch precisely.
      return {
        ...prev,
        version: event.version,
      };
    }

    case "turn.advanced": {
      return {
        ...prev,
        version: event.version,
        currentTurnPlayerId: event.currentTurnPlayerId,
      };
    }

    case "hand.replenished": {
      // Hand replenished for a player - if it's us, we need to refetch hand
      if (event.playerId && prev.players.some((p) => p.id === event.playerId)) {
        const currentPlayer = prev.players.find((p) => p.userId === currentUserId);
        if (currentPlayer?.id === event.playerId) {
          // Our hand changed - return state with version bump; caller should refetch hand
          return { ...prev, version: event.version };
        }
      }
      return { ...prev, version: event.version };
    }

    case "player.joined":
    case "player.left": {
      // Player list changed - need full refetch for accurate player data
      return { ...prev, version: event.version };
    }

    case "room.resync_required": {
      return null;
    }

    default:
      return { ...prev, version: (event as { version?: number }).version ?? prev.version };
  }
}
