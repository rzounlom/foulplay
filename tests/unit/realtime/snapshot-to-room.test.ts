/**
 * Unit tests for snapshotToRoom helper
 */

import { snapshotToRoom } from "@/lib/realtime/snapshot-to-room";
import type { RoomSnapshot } from "@/lib/realtime/apply-room-event";

function minimalSnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  return {
    roomId: "room_123",
    roomCode: "ABC123",
    version: 1,
    status: "active",
    mode: "casual",
    sport: "football",
    handSize: 6,
    showPoints: true,
    allowQuarterClearing: true,
    currentQuarter: "Q1",
    quarterIntermissionEndsAt: null,
    players: [
      { id: "p1", userId: "u1", points: 0, isHost: true, user: { id: "u1", name: "Player 1" } },
      { id: "p2", userId: "u2", points: 0, isHost: false, user: { id: "u2", name: "Player 2" } },
    ],
    currentTurnPlayerId: null,
    activeCardInstance: null,
    submissions: [],
    hand: [],
    ...overrides,
  };
}

describe("snapshotToRoom", () => {
  describe("basic mapping", () => {
    it("maps key fields correctly", () => {
      const snapshot = minimalSnapshot({
        roomId: "room_456",
        roomCode: "XYZ789",
        status: "lobby",
        mode: "party",
        sport: "basketball",
        handSize: 5,
      });

      const room = snapshotToRoom(snapshot);

      expect(room.id).toBe("room_456");
      expect(room.code).toBe("XYZ789");
      expect(room.status).toBe("lobby");
      expect(room.mode).toBe("party");
      expect(room.sport).toBe("basketball");
      expect(room.handSize).toBe(5);
      expect(room.players).toHaveLength(2);
      expect(room.players[0]).toMatchObject({
        id: "p1",
        user: { id: "u1", name: "Player 1" },
        isHost: true,
        points: 0,
      });
    });
  });

  describe("current turn present", () => {
    it("populates gameState when currentTurnPlayerId exists and matches a player", () => {
      const snapshot = minimalSnapshot({
        currentTurnPlayerId: "p1",
      });

      const room = snapshotToRoom(snapshot);

      expect(room.gameState).not.toBeNull();
      expect(room.gameState!.currentTurnPlayerId).toBe("p1");
      expect(room.gameState!.currentTurnPlayer).toMatchObject({
        id: "p1",
        user: { id: "u1", name: "Player 1" },
      });
    });

    it("derives current turn player correctly when it matches second player", () => {
      const snapshot = minimalSnapshot({
        currentTurnPlayerId: "p2",
      });

      const room = snapshotToRoom(snapshot);

      expect(room.gameState).not.toBeNull();
      expect(room.gameState!.currentTurnPlayerId).toBe("p2");
      expect(room.gameState!.currentTurnPlayer).toMatchObject({
        id: "p2",
        user: { id: "u2", name: "Player 2" },
      });
    });
  });

  describe("no current turn", () => {
    it("returns gameState null when currentTurnPlayerId is null", () => {
      const snapshot = minimalSnapshot({ currentTurnPlayerId: null });

      const room = snapshotToRoom(snapshot);

      expect(room.gameState).toBeNull();
    });

    it("returns gameState null when currentTurnPlayerId does not match any player", () => {
      const snapshot = minimalSnapshot({
        currentTurnPlayerId: "p_nonexistent",
      });

      const room = snapshotToRoom(snapshot);

      expect(room.gameState).toBeNull();
    });
  });

  describe("active card instance", () => {
    it("maps activeCardInstance when present and includes id in activeCardInstanceId", () => {
      const activeCard = { id: "ci_123", card: { title: "Test Card" } };
      const snapshot = minimalSnapshot({
        currentTurnPlayerId: "p1",
        activeCardInstance: activeCard,
      });

      const room = snapshotToRoom(snapshot);

      expect(room.gameState).not.toBeNull();
      expect(room.gameState!.activeCardInstanceId).toBe("ci_123");
      expect(room.gameState!.activeCardInstance).toBe(activeCard);
    });

    it("sets activeCardInstanceId to null when activeCardInstance has no id", () => {
      const activeCard = { card: { title: "Test Card" } };
      const snapshot = minimalSnapshot({
        currentTurnPlayerId: "p1",
        activeCardInstance: activeCard,
      });

      const room = snapshotToRoom(snapshot);

      expect(room.gameState).not.toBeNull();
      expect(room.gameState!.activeCardInstanceId).toBeNull();
      expect(room.gameState!.activeCardInstance).toBe(activeCard);
    });

    it("sets activeCardInstanceId to null when activeCardInstance is null", () => {
      const snapshot = minimalSnapshot({
        currentTurnPlayerId: "p1",
        activeCardInstance: null,
      });

      const room = snapshotToRoom(snapshot);

      expect(room.gameState).not.toBeNull();
      expect(room.gameState!.activeCardInstanceId).toBeNull();
      expect(room.gameState!.activeCardInstance).toBeNull();
    });
  });
});
