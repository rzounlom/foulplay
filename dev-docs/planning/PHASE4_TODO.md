# Phase 4 — Client Realtime Refactor — Todo & Resume Guide

**Source:** `MASTER_GAMEPLAY_REFACTOR_PRD.md`  
**Goal:** Refactor client gameplay state to use snapshot + typed Ably events + local patching instead of broad refetches/polling.

**Status: COMPLETE ✓**

---

## Implemented ✓

| Item | Location | Notes |
|------|----------|-------|
| Snapshot endpoint | `app/api/rooms/[code]/snapshot/route.ts` | Returns version, players, submissions (with autoAcceptAt), hand |
| applyRoomEvent | `lib/realtime/apply-room-event.ts` | Patches submission.accepted/rejected, submission.created, turn.advanced, etc. |
| resyncRoomSnapshot | `lib/hooks/useRoomState.ts` | Fetches snapshot on version gap |
| useRoomState | `lib/hooks/useRoomState.ts` | Snapshot + Ably subscription + version-aware patching |
| useRoomStateChannel | `lib/ably/useRoomStateChannel.ts` | Subscribes to `room:{roomCode}:state` |
| game-board migration | `components/game/game-board.tsx` | Uses useRoomState, snapshotToRoom; no fetchRoom |
| Countdown UI | `components/game/voting-panel.tsx` | Uses autoAcceptAt from submission |
| Polling fallback | `components/game/game-board.tsx` | Only when state channel disconnected; uses resyncRoomSnapshot |
| Tests | `tests/unit/realtime/apply-room-event.test.ts`, `version-gap-recovery.test.ts` | Event patching + version gap |

---

## Key Files Reference

```
app/api/rooms/[code]/snapshot/route.ts   # Snapshot API
lib/realtime/apply-room-event.ts        # Event patching
lib/realtime/room-events.ts             # Event types
lib/hooks/useRoomState.ts               # Main hook
lib/ably/useRoomStateChannel.ts         # Ably subscription
components/game/game-board.tsx          # Main migration target
components/game/voting-panel.tsx        # Countdown
app/(game)/game/[code]/page.tsx         # Game page
```

---

## Phase 4 — When Done Summary

### 1. Files changed
- `components/game/game-board.tsx` – Switched to `useRoomState`, removed `fetchRoom`/`fetchHand`/`fetchSubmissions`, added `snapshotToRoom`, uses `resyncRoomSnapshot` for polling fallback
- `lib/hooks/useRoomState.ts` – Version-aware event handling, targeted refetch for `hand.replenished`/`submission.created`/`submission.vote_cast` when events lack full data
- `lib/realtime/apply-room-event.ts` – Patches `submission.created` with `submittedBy`, `submission.vote_cast` bumps version
- `app/api/game/submit/route.ts` – Publishes `submission.created` to state channel

### 2. New files created
- `dev-docs/planning/PHASE4_TODO.md` – Resume guide
- `tests/unit/realtime/apply-room-event.test.ts` – Event patching tests
- `tests/unit/realtime/version-gap-recovery.test.ts` – Version gap recovery tests

### 3. Polling / refetch behavior
- **Removed:** `fetchRoom` as primary sync; broad refetch after actions
- **Reduced:** Polling only when state channel disconnected (2s grace, 3s interval). Uses `resyncRoomSnapshot` (snapshot API), not legacy room fetch
- **Kept:** Targeted refetch for `hand.replenished` (our hand), `submission.created`/`submission.vote_cast` (submissions full data), `player.joined`/`player.left` (resync)

### 4. Version gap recovery
- `useRoomState` tracks `lastSeenVersion`
- `event.version === lastSeenVersion + 1` → apply patch, update `lastSeenVersion`
- `event.version <= lastSeenVersion` → ignore (stale/duplicate)
- `event.version > lastSeenVersion + 1` → call `resyncRoomSnapshot()`, replace state
- `room.resync_required` → `applyRoomEvent` returns null → caller triggers full resync

### 5. Assumptions and risks
- Snapshot shape matches `RoomSnapshot`; `applyRoomEvent` expects `submittedBy` in `submission.created` for display
- Server must publish `submission.created` on submit (done)
- `useRoomChannel` is still used for legacy events (game_ended, message_sent, card_approved, etc.) that are not on the state channel
- Targeted refetches for hand/submissions are acceptable when events lack full data

### 6. Manual flows to test
1. Submit cards → local state updates without full reload
2. Cast vote → vote counts update (via targeted submissions refetch)
3. Accepted/rejected → pending UI clears locally
4. Turn advanced → current turn updates locally
5. Hand replenished → hand updates correctly
6. Simulate version gap (e.g. reconnect) → snapshot refetch and recovery
7. Countdown → shows correct time until `autoAcceptAt`

---

## Constraints (Do Not)
- Phase 5
- QStash / server route semantics
- Prisma schema
- Card tier logic
