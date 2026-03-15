/**
 * Map room snapshot to game-board Room + hand + submissions format.
 */

import type { RoomSnapshot } from "./apply-room-event";

export interface Room {
  id: string;
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  showPoints: boolean;
  allowJoinInProgress?: boolean;
  handSize: number;
  allowQuarterClearing: boolean;
  currentQuarter: string | null;
  quarterIntermissionEndsAt: string | Date | null;
  pendingQuarterDiscardSelections?: Record<string, string[]> | null;
  quarterDiscardDonePlayerIds?: string[] | null;
  suggestEndRoundPlayerIds?: string[] | null;
  canTurnInCards?: boolean;
  players: Array<{
    id: string;
    user: { id: string; name: string };
    isHost: boolean;
    points: number;
    nickname?: string | null;
  }>;
  gameState: {
    currentTurnPlayerId: string;
    currentTurnPlayer: { id: string; user: { id: string; name: string } };
    activeCardInstanceId: string | null;
    activeCardInstance: unknown | null;
  } | null;
}

export function snapshotToRoom(snapshot: RoomSnapshot): Room {
  const currentTurnPlayer = snapshot.currentTurnPlayerId
    ? snapshot.players.find((p) => p.id === snapshot.currentTurnPlayerId)
    : null;
  const activeCard = snapshot.activeCardInstance as { id?: string } | null;
  return {
    id: snapshot.roomId,
    code: snapshot.roomCode,
    status: snapshot.status,
    mode: snapshot.mode,
    sport: snapshot.sport,
    showPoints: snapshot.showPoints,
    allowJoinInProgress: snapshot.allowJoinInProgress,
    handSize: snapshot.handSize,
    allowQuarterClearing: snapshot.allowQuarterClearing,
    canTurnInCards: snapshot.canTurnInCards,
    currentQuarter: snapshot.currentQuarter,
    quarterIntermissionEndsAt: snapshot.quarterIntermissionEndsAt,
    pendingQuarterDiscardSelections: snapshot.pendingQuarterDiscardSelections,
    quarterDiscardDonePlayerIds: snapshot.quarterDiscardDonePlayerIds,
    suggestEndRoundPlayerIds: snapshot.suggestEndRoundPlayerIds,
    players: snapshot.players,
    gameState: snapshot.currentTurnPlayerId && currentTurnPlayer
      ? {
          currentTurnPlayerId: snapshot.currentTurnPlayerId,
          currentTurnPlayer: {
            id: currentTurnPlayer.id,
            user: currentTurnPlayer.user,
          },
          activeCardInstanceId: activeCard?.id ?? null,
          activeCardInstance: snapshot.activeCardInstance,
        }
      : null,
  };
}
