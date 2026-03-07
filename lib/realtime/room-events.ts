/**
 * Typed room events for authoritative realtime updates.
 * Payloads are small and patch-friendly. No full room snapshots or private hand data.
 *
 * Channel: room:{roomId}:state (roomId = Room.id, CUID)
 */

export type RoomEvent =
  | {
      type: "submission.created";
      roomId: string;
      version: number;
      submissionId: string;
      submittedByPlayerId: string;
      autoAcceptAt: string;
    }
  | {
      type: "submission.vote_cast";
      roomId: string;
      version: number;
      submissionId: string;
      voterPlayerId: string;
      approve: boolean;
    }
  | {
      type: "submission.accepted";
      roomId: string;
      version: number;
      submissionId: string;
      acceptedBy: "players" | "auto";
    }
  | {
      type: "submission.rejected";
      roomId: string;
      version: number;
      submissionId: string;
    }
  | {
      type: "turn.advanced";
      roomId: string;
      version: number;
      currentTurnPlayerId: string;
    }
  | {
      type: "hand.replenished";
      roomId: string;
      version: number;
      playerId: string;
      cardCount: number;
    }
  | {
      type: "player.joined";
      roomId: string;
      version: number;
      playerId: string;
      displayName: string;
    }
  | {
      type: "player.left";
      roomId: string;
      version: number;
      playerId: string;
    }
  | {
      type: "room.resync_required";
      roomId: string;
      version: number;
    };
