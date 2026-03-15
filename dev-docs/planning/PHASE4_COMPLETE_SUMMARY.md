# Phase 4 — Client Realtime Refactor — Completion Summary

**Source:** `MASTER_GAMEPLAY_REFACTOR_PRD.md`  
**Status:** Complete

---

## 1. Files Changed

| File | Changes |
|------|---------|
| `components/game/game-board.tsx` | Uses `useRoomState` for snapshot; derives `room`, `hand`, `submissions` from snapshot; `snapshotToRoom` helper; removed `fetchRoom`; polling uses `resyncRoomSnapshot` when state channel disconnected; keeps `useRoomChannel` for `game_ended`, `message_sent`, popups (card_approved, card_rejected), and legacy events that trigger `resyncRoomSnapshot` |
| `lib/hooks/useRoomState.ts` | Snapshot fetch + `room:{roomCode}:state` subscription; version-aware event handling; targeted refetch for `hand.replenished` (our hand), `submission.created`, `submission.vote_cast`; full resync for `player.joined`/`player.left` and version gap |
| `lib/realtime/apply-room-event.ts` | Patches `submission.accepted`, `submission.rejected`, `submission.created`, `turn.advanced`, `hand.replenished`, `player.joined`, `player.left`; returns `null` for `room.resync_required` |
| `lib/ably/useRoomStateChannel.ts` | Subscribes to `room:{roomCode}:state`, publishes events with name `"event"` |
| `app/api/rooms/[code]/snapshot/route.ts` | Authoritative snapshot: version, players, submissions (with `autoAcceptAt`), hand |
| `app/api/game/submit/route.ts` | Publishes `submission.created` to state channel with `autoAcceptAt` |
| `components/game/voting-panel.tsx` | Countdown from `autoAcceptAt` when present, else `createdAt` + `AUTO_ACCEPT_SECONDS` |

---

## 2. New Files Created

| File | Purpose |
|------|---------|
| `dev-docs/planning/PHASE4_TODO.md` | Resume guide for Phase 4 |
| `dev-docs/planning/PHASE4_COMPLETE_SUMMARY.md` | This summary |
| `tests/unit/realtime/apply-room-event.test.ts` | Unit tests for `applyRoomEvent` |
| `tests/unit/realtime/version-gap-recovery.test.ts` | Tests for version gap / sequential events |

---

## 3. Polling / Refetch Behavior

- **Removed:** `fetchRoom` as primary sync; broad refetch after every vote/submit
- **Reduced:** Polling only when `isStateChannelConnected` is false (fallback); 2s grace, then every 3s
- **Replaced with:** Event patching via `applyRoomEvent`; snapshot refetch on version gap; targeted refetch for hand (on `hand.replenished` for our player) and submissions (on `submission.created`, `submission.vote_cast`); full resync on `player.joined`, `player.left`, `room.resync_required`
- **Legacy events:** `game_started`, `quarter_advanced`, etc. still trigger `resyncRoomSnapshot` (these are not yet on state channel)

---

## 4. Version Gap Recovery

- `useRoomState` tracks `lastSeenVersion`
- **`event.version === lastSeenVersion + 1`:** Apply patch, set `lastSeenVersion = event.version`
- **`event.version <= lastSeenVersion`:** Ignore (stale/duplicate)
- **`event.version > lastSeenVersion + 1`:** Call `resyncRoomSnapshot()`, replace state with snapshot
- **`room.resync_required`:** `applyRoomEvent` returns `null` → caller triggers `resyncRoomSnapshot()`

---

## 5. Assumptions and Risks

- **Dual channels:** `useRoomChannel` (`room:{roomCode}`) kept for `game_ended`, chat, popups, and events not yet on state channel. State channel (`room:{roomCode}:state`) is authoritative for gameplay state.
- **Targeted refetches:** `hand.replenished` and `submission.created`/`vote_cast` trigger targeted API calls because events don't include full card/vote data. This is acceptable per PRD.
- **Initial load:** Game page passes `initialRoom` from server for first paint; `useRoomState` fetches snapshot on mount and replaces. Avoids loading flash.
- **game_ended:** Only on legacy channel; no `game_ended` on state channel yet.

---

## 6. Manual Flows to Test

1. **Submit cards** → New submission appears without full reload; countdown shows
2. **Cast vote** → Vote counts update (via submission refetch or patch)
3. **Submission accepted/rejected** → Pending UI clears locally
4. **Turn advanced** → Current turn updates
5. **Hand replenished** → Hand updates (targeted hand refetch)
6. **Version gap** → Disconnect/reconnect or miss events → snapshot refetch recovers
7. **Countdown** → Displays correct time until `autoAcceptAt`
8. **Polling fallback** → Disconnect Ably → after 2s, polling every 3s resumes
