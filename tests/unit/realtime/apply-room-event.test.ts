/**
 * Unit tests for applyRoomEvent patch helper
 */

import { applyRoomEvent, type RoomSnapshot } from "@/lib/realtime/apply-room-event";
import type { RoomEvent } from "@/lib/realtime/room-events";

const baseSnapshot: RoomSnapshot = {
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
  currentTurnPlayerId: "p1",
  activeCardInstance: null,
  submissions: [],
  hand: [],
};

describe("applyRoomEvent", () => {
  const currentUserId = "u1";

  it("submission.accepted removes submission from list", () => {
    const prev: RoomSnapshot = {
      ...baseSnapshot,
      submissions: [
        { id: "sub_1", status: "pending", submittedByPlayerId: "p2", autoAcceptAt: "2025-01-01T00:01:00Z" },
      ],
    };
    const event: RoomEvent = {
      type: "submission.accepted",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_1",
      acceptedBy: "auto",
    };
    const result = applyRoomEvent(prev, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.submissions).toHaveLength(0);
    expect(result!.version).toBe(2);
  });

  it("submission.rejected removes submission from list", () => {
    const prev: RoomSnapshot = {
      ...baseSnapshot,
      submissions: [
        { id: "sub_1", status: "pending", submittedByPlayerId: "p2", autoAcceptAt: "2025-01-01T00:01:00Z" },
      ],
    };
    const event: RoomEvent = {
      type: "submission.rejected",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_1",
    };
    const result = applyRoomEvent(prev, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.submissions).toHaveLength(0);
    expect(result!.version).toBe(2);
  });

  it("submission.created adds new submission", () => {
    const event: RoomEvent = {
      type: "submission.created",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_new",
      submittedByPlayerId: "p2",
      autoAcceptAt: "2025-01-01T00:01:30Z",
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.submissions).toHaveLength(1);
    expect(result!.submissions[0]).toMatchObject({
      id: "sub_new",
      status: "pending",
      submittedByPlayerId: "p2",
      autoAcceptAt: "2025-01-01T00:01:30Z",
    });
    expect(result!.version).toBe(2);
  });

  it("turn.advanced updates currentTurnPlayerId", () => {
    const event: RoomEvent = {
      type: "turn.advanced",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      currentTurnPlayerId: "p2",
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.currentTurnPlayerId).toBe("p2");
    expect(result!.version).toBe(2);
  });

  it("submission.vote_cast bumps version only", () => {
    const event: RoomEvent = {
      type: "submission.vote_cast",
      roomId: "room_123",
      version: 2,
      submissionId: "sub_1",
      voterPlayerId: "p2",
      approve: true,
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(2);
  });

  it("room.resync_required returns null", () => {
    const event: RoomEvent = {
      type: "room.resync_required",
      roomId: "room_123",
      version: 2,
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).toBeNull();
  });

  it("hand.replenished bumps version", () => {
    const event: RoomEvent = {
      type: "hand.replenished",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      playerId: "p1",
      cardCount: 2,
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(2);
  });

  it("player.joined bumps version", () => {
    const event: RoomEvent = {
      type: "player.joined",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      playerId: "p3",
      displayName: "Player 3",
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(2);
  });

  it("player.left bumps version", () => {
    const event: RoomEvent = {
      type: "player.left",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      playerId: "p2",
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(2);
  });

  it("does not mutate previous state", () => {
    const prev: RoomSnapshot = { ...baseSnapshot, submissions: [] };
    const event: RoomEvent = {
      type: "submission.created",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 2,
      submissionId: "sub_new",
      submittedByPlayerId: "p2",
      autoAcceptAt: "2025-01-01T00:01:30Z",
    };
    const result = applyRoomEvent(prev, event, currentUserId);
    expect(prev.submissions).toHaveLength(0);
    expect(result!.submissions).toHaveLength(1);
  });
});
