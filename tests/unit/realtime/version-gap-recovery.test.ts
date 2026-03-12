/**
 * Tests for version gap recovery logic.
 * When event.version > lastSeenVersion + 1, we trigger full snapshot resync.
 */

import { applyRoomEvent, type RoomSnapshot } from "@/lib/realtime/apply-room-event";
import type { RoomEvent } from "@/lib/realtime/room-events";

const baseSnapshot: RoomSnapshot = {
  roomId: "room_123",
  roomCode: "ABC123",
  version: 5,
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

describe("Version gap recovery", () => {
  const currentUserId = "u1";

  it("applyRoomEvent applies event when version is lastSeenVersion + 1", () => {
    const event: RoomEvent = {
      type: "turn.advanced",
      roomId: "room_123",
      version: 6,
      currentTurnPlayerId: "p2",
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(6);
    expect(result!.currentTurnPlayerId).toBe("p2");
  });

  it("room.resync_required returns null (caller should trigger full resync)", () => {
    const event: RoomEvent = {
      type: "room.resync_required",
      roomId: "room_123",
      version: 10,
    };
    const result = applyRoomEvent(baseSnapshot, event, currentUserId);
    expect(result).toBeNull();
  });

  it("applyRoomEvent returns updated state for sequential events", () => {
    const event1: RoomEvent = {
      type: "submission.created",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 6,
      submissionId: "sub_1",
      submittedByPlayerId: "p2",
      autoAcceptAt: "2025-01-01T00:01:30Z",
    };
    const after1 = applyRoomEvent(baseSnapshot, event1, currentUserId);
    expect(after1).not.toBeNull();
    expect(after1!.version).toBe(6);

    const event2: RoomEvent = {
      type: "submission.accepted",
      roomId: "room_123",
      roomCode: "ABC123",
      version: 7,
      submissionId: "sub_1",
      acceptedBy: "auto",
    };
    const after2 = applyRoomEvent(after1!, event2, currentUserId);
    expect(after2).not.toBeNull();
    expect(after2!.version).toBe(7);
    expect(after2!.submissions).toHaveLength(0);
  });
});
