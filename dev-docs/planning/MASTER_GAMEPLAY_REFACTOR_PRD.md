FoulPlay Master Gameplay Refactor PRD
Durable Timers + Server Authority + Typed Realtime + Scalable Architecture
Objective

Refactor the FoulPlay gameplay engine to achieve:

• Durable gameplay timers (auto-accept works even when no users are online)
• Server authoritative game progression
• Snappy realtime multiplayer updates
• Elimination of polling-driven gameplay logic
• Scalable architecture capable of supporting tens of thousands of concurrent players

This refactor introduces:

Upstash QStash for delayed gameplay actions

Typed Ably realtime events for state updates

Versioned authoritative game state

Client snapshot + patch architecture

Separated Ably channels for state vs presence

Smart card tier system and draw logic

High-Level Architecture
Immediate gameplay actions
Client
→ API route / server action
→ Prisma transaction
→ increment version
→ publish Ably room state event
→ clients patch local state
Delayed gameplay actions
API route
→ enqueue QStash job
→ QStash delay
→ callback endpoint
→ Prisma transaction
→ increment version
→ publish Ably state event
→ clients patch state
Client sync
Client loads room
→ fetch snapshot
→ subscribe to Ably room state channel
→ patch local state from events
→ resync on version gap
Required Environment Variables
QSTASH_URL=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

APP_URL=https://foulplay.io
Required Dependencies
npm install @upstash/qstash
PHASE 1 — Card Engine & Tier System

Goal: Improve gameplay pacing and card distribution.

Add card tier property

Update card interface:

export type Tier = "hf" | "common" | "rare";

export interface CardDefinition {
sport: Sport;
title: string;
description: string;
severity: Severity;
type: CardType;
points: number;
tier: Tier;
}
Tier meanings
Tier Meaning
hf high frequency / always visible
common normal gameplay events
rare unusual or big moments
Target tier distribution
Hand size 4-6
hf 55%
common 35%
rare 10%
Hand size 7-9
hf 45%
common 40%
rare 15%
Hand size 10-12
hf 40%
common 40%
rare 20%
Severe card caps (unchanged)

Casual

max 1 severe

Party

4-6 hand: max 1
7+ hand: max 2

Lit

no cap
Smart draw algorithm

When drawing cards:

determine target tier counts

inspect current hand composition

draw cards from missing tiers

enforce severe cap

ensure hand size restored

Works for:

initial deal
replacement draw
PHASE 2 — Realtime Infrastructure

Goal: Build scalable realtime architecture before touching gameplay logic.

Add authoritative versioning

Update Prisma schema:

Room {
id String
version Int @default(0)
}

Migration required.

Every gameplay mutation must increment this version.

Create RoomEvent contract

Create file:

lib/realtime/room-events.ts

Example structure:

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
};
Create Ably publish helper
lib/realtime/publish-room-event.ts
export async function publishRoomEvent(event: RoomEvent) {
const channelName = `room:${event.roomId}:state`;
await ably.channels.get(channelName).publish("event", event);
}

Rules:

• only publish after DB commit
• never publish full room snapshots

PHASE 3 — Ably Channel Architecture

Goal: Improve scalability and reduce realtime noise.

Instead of one room channel, separate concerns.

Gameplay state channel
room:{roomId}:state

Used for:

submission.created
vote_cast
submission.accepted
submission.rejected
turn.advanced
hand.replenished
player.joined
player.left

Server publishes.
Clients subscribe.

Presence channel
room:{roomId}:presence

Used for:

who is online
active players
presence indicators

Gameplay logic must not depend on presence.

Presence is UI only.

Optional future channels
room:{roomId}:chat
room:{roomId}:ephemeral

These are optional.

PHASE 4 — QStash Durable Timers

Goal: Replace fragile client timers.

QStash helper

Create:

lib/queue/qstash.ts
import { Client } from "@upstash/qstash";

export const qstash = new Client({
token: process.env.QSTASH_TOKEN!,
});
Update submit-card route

When submission created:

autoAcceptAt = now + 60 seconds

Schedule job:

await qstash.publishJSON({
url: `${process.env.APP_URL}/api/qstash/auto-accept`,
body: { submissionId },
delay: "60s",
});

Publish event:

submission.created
Create QStash callback route
/api/qstash/auto-accept/route.ts

Logic:

verify signature
load submission
if already resolved -> exit
if pending -> auto accept
advance game
increment version
publish events

Important rule:

idempotent execution

Example:

if (submission.status !== "pending") return ok()
PHASE 5 — Server Gameplay Routes

Goal: Ensure all gameplay events are server authoritative.

Submit card

Flow:

transaction
increment version
publish submission.created
Vote route

Flow:

persist vote
increment version
publish vote_cast

If vote resolves:

submission.accepted
or
submission.rejected

If accepted:

turn.advanced
hand.replenished
Auto-accept callback

Flow:

if submission pending
accept
advance turn
replenish hand
increment version
publish events
PHASE 6 — Snapshot Endpoint

Goal: Authoritative state bootstrap.

Create:

GET /api/rooms/[roomId]/snapshot

Returns:

roomId
version
players
scores
currentTurn
pending submissions
player hand

Clients load this once.

PHASE 7 — Client Realtime Refactor

Goal: Remove heavy refetch behavior.

Snapshot load
fetch snapshot
set state
set lastSeenVersion
subscribe to Ably state channel
Version tracking
if event.version == lastSeenVersion + 1
patch

if event.version <= lastSeenVersion
ignore

if event.version > lastSeenVersion + 1
refetch snapshot
Local state patching

Example behaviors:

submission.created

add pending submission
start countdown

vote_cast

update vote counts

submission.accepted

remove pending state
update score

turn.advanced

update turn player

hand.replenished

update player hand
Countdown logic

Countdown UI derived from:

autoAcceptAt

Client displays timer.

Server decides resolution.

PHASE 8 — Cleanup

Remove:

client-driven auto accept
polling as gameplay authority
broad router.refresh patterns
full room reloads

Polling may remain as fallback only.

PHASE 9 — Testing

Server tests:

auto accept works
idempotency works
version increments
event publishing works

Client verification:

submission flow
voting flow
auto accept
turn changes
hand refill

Multiplayer test:

3-5 players
players leave room
game continues
Final Architecture Summary

Immediate gameplay

Client
→ API
→ DB
→ Ably state event

Delayed gameplay

API
→ QStash delay
→ callback
→ DB
→ Ably event

Client sync

Snapshot
→ realtime patching
→ resync on version gap
Result

FoulPlay becomes:

Durable

Timers survive disconnects.

Snappy

Clients patch local state instead of refetching.

Scalable

Architecture supports thousands of rooms.

Maintainable

Clear separation of:

state events
presence
delayed jobs
client state

# Cursor Execution Addendum — Chunked Implementation Plan

## Purpose

The remaining phases of this refactor are too large for Cursor to complete reliably in one pass.

From this point forward, Cursor must implement the plan in **small, isolated chunks**.

### Global execution rules for Cursor

For every chunk below:

1. Implement **only that chunk**
2. Do **not** start the next chunk automatically
3. Keep changes as small and safe as possible
4. Do not refactor unrelated files
5. Prefer editing existing files over introducing new abstractions unless clearly needed
6. If the task feels too large, stop after completing the smallest coherent subset and summarize what remains instead of continuing

### Required stop-and-summarize format after every chunk

After each chunk, Cursor must stop and provide:

- files changed
- new files created
- tests added/updated
- manual steps to run
- assumptions
- risks
- what remains for the next chunk

---

# Remaining Implementation Roadmap

---

# Phase 4 — Client Realtime Refactor (Chunked)

## Phase 4A — Snapshot Bootstrapping Only

### Goal

Initialize client room/game state from the authoritative snapshot endpoint.

### Scope

Implement only:

- fetch `GET /api/rooms/[code]/snapshot` on room/game load
- initialize local room/game state from snapshot
- initialize `lastSeenVersion = snapshot.version`

### Do not do yet

- no Ably event patching
- no subscription refactor
- no polling cleanup
- no router.refresh cleanup
- no version-gap recovery yet

### Acceptance criteria

- game page successfully loads from snapshot
- local state is initialized from snapshot
- `lastSeenVersion` is stored
- current UI still works

### Cursor prompt for this chunk

Implement **Phase 4A — Snapshot Bootstrapping Only** from this PRD.

Do only the following:

1. Fetch `GET /api/rooms/[code]/snapshot` when the game/room page loads
2. Initialize local room/game state from the snapshot
3. Initialize `lastSeenVersion` from `snapshot.version`

Do not:

- subscribe to new Ably channels yet
- patch state from events yet
- remove polling yet
- remove refresh/refetch behavior yet

Stop when complete and summarize.

---

## Phase 4B — Ably State Channel Subscription Only

### Goal

Wire the client to the new authoritative gameplay channel.

### Scope

Implement only:

- subscribe to `room:{roomCode}:state`
- add one event handler entry point for future patching
- optionally log/store raw events temporarily for debugging

### Do not do yet

- no local patching of room state
- no polling cleanup
- no old channel removal unless absolutely necessary

### Acceptance criteria

- client subscribes successfully to `room:{roomCode}:state`
- state events are received
- there is a clean entry point for future patch logic

### Cursor prompt for this chunk

Implement **Phase 4B — Ably State Channel Subscription Only** from this PRD.

Do only the following:

1. Subscribe the client to `room:{roomCode}:state`
2. Add a single event handler entry point for typed room events
3. It is okay to log or temporarily store raw events for debugging

Do not:

- patch local state from events yet
- remove old subscriptions yet
- remove polling yet

Stop when complete and summarize.

---

## Phase 4C — Local Event Patching for Submission Events Only

### Goal

Patch local state from submission-related events only.

### Events to support

- `submission.created`
- `submission.vote_cast`
- `submission.accepted`
- `submission.rejected`

### Scope

Implement only:

- a patch helper if useful (`applyRoomEvent`)
- local state updates for submission events
- local pending state / countdown state updates for submitter and voters

### Do not do yet

- no turn patching
- no hand patching
- no version-gap recovery
- no polling cleanup except trivial redundancy if obviously safe

### Acceptance criteria

- pending submissions update locally without full room reload
- vote counts update locally
- accepted/rejected clears pending state locally
- submitter and voters both see correct submission state

### Cursor prompt for this chunk

Implement **Phase 4C — Local Event Patching for Submission Events Only** from this PRD.

Do only the following:

1. Add local patching for:
   - `submission.created`
   - `submission.vote_cast`
   - `submission.accepted`
   - `submission.rejected`
2. Use a reusable patch helper if useful
3. Ensure submitter and voters both see local pending/countdown state updates

Do not:

- patch turn state yet
- patch hand state yet
- remove polling yet unless clearly redundant for submission UI only

Stop when complete and summarize.

---

## Phase 4D — Version Gap Recovery Only

### Goal

Make the client robust to missed or out-of-order events.

### Scope

Implement only:

- `lastSeenVersion` comparison logic
- stale/duplicate ignore logic
- gap detection
- snapshot resync on version gap

### Acceptance criteria

- stale events are ignored
- exact-next-version events are applied
- version gaps trigger snapshot refetch and state replacement

### Cursor prompt for this chunk

Implement **Phase 4D — Version Gap Recovery Only** from this PRD.

Do only the following:

1. Track `lastSeenVersion`
2. When an event arrives:
   - apply if `event.version === lastSeenVersion + 1`
   - ignore if `event.version <= lastSeenVersion`
   - refetch snapshot if `event.version > lastSeenVersion + 1`
3. Replace local state with snapshot on resync

Do not:

- patch new event types beyond what already exists
- remove polling yet
- change server code

Stop when complete and summarize.

---

## Phase 4E — Turn and Hand Event Patching

### Goal

Patch local state for turn progression and hand updates.

### Events to support

- `turn.advanced`
- `hand.replenished`
- optionally `player.joined`
- optionally `player.left`

### Scope

Implement only:

- turn state patching
- hand state / hand count patching
- optional player list patching if safe

### Do not do yet

- no polling cleanup unless clearly trivial
- no broad refetch cleanup yet

### Acceptance criteria

- current turn updates locally
- hand updates locally
- player list updates locally if implemented

### Cursor prompt for this chunk

Implement **Phase 4E — Turn and Hand Event Patching** from this PRD.

Do only the following:

1. Patch local state for:
   - `turn.advanced`
   - `hand.replenished`
2. If safe and already represented in local state, also patch:
   - `player.joined`
   - `player.left`

Do not:

- remove polling yet unless clearly trivial
- refactor unrelated UI

Stop when complete and summarize.

---

## Phase 4F — Polling and Refresh Cleanup

### Goal

Remove or reduce broad refetch/polling patterns now that local patching exists.

### Scope

Implement only:

- reduce/remove `router.refresh()` usage for gameplay sync
- reduce/remove broad room refetches after normal gameplay events
- keep fallback resync if needed
- keep polling only as fallback if still necessary

### Acceptance criteria

- gameplay no longer relies on polling as primary sync
- broad refresh behavior is reduced or removed
- fallback safety remains where appropriate

### Cursor prompt for this chunk

Implement **Phase 4F — Polling and Refresh Cleanup** from this PRD.

Do only the following:

1. Identify polling / broad refresh behavior that still drives gameplay sync
2. Remove or reduce it where event patching now covers the same updates
3. Keep a fallback resync path if clearly needed

Do not:

- redesign server behavior
- touch card logic

Stop when complete and summarize.

---

# Phase 5 — Server Event Coverage (Chunked)

## Phase 5A — Submit/Vote Route Event Consistency

### Goal

Ensure submit/vote flows consistently emit the expected typed state events.

### Scope

Implement only:

- verify/update submit route event emission
- verify/update vote route event emission
- verify/update resolution event emission
- verify/update turn/hand follow-up event emission where already appropriate

### Acceptance criteria

- submit emits `submission.created`
- vote emits `submission.vote_cast`
- resolution emits accepted/rejected
- turn/hand events emitted where appropriate

### Cursor prompt for this chunk

Implement **Phase 5A — Submit/Vote Route Event Consistency** from this PRD.

Do only the following:

1. Verify/update submit route event emission
2. Verify/update vote route event emission
3. Verify/update accepted/rejected event emission
4. Verify/update turn/hand follow-up event emission if already part of resolution flow

Do not:

- touch client refactor
- add new gameplay semantics

Stop when complete and summarize.

---

## Phase 5B — Join/Leave + Presence Cleanup

### Goal

Cleanly separate gameplay state events from presence behavior.

### Scope

Implement only:

- verify join/leave event publishing if backed by authoritative state
- keep presence on `room:{roomCode}:presence`
- ensure gameplay correctness does not depend on presence

### Acceptance criteria

- state events and presence concerns are separated
- gameplay authority does not depend on online presence

### Cursor prompt for this chunk

Implement **Phase 5B — Join/Leave + Presence Cleanup** from this PRD.

Do only the following:

1. Verify/update player join/leave room events if backed by DB state
2. Keep presence separate on `room:{roomCode}:presence`
3. Ensure gameplay correctness does not depend on presence

Do not:

- redesign gameplay logic
- touch card logic

Stop when complete and summarize.

---

# Phase 6 — Testing and Verification (Chunked)

## Phase 6A — Server Test Cleanup

### Goal

Strengthen server-side coverage for the new architecture.

### Scope

Implement only:

- event emission tests
- version increment tests
- QStash idempotency tests
- snapshot endpoint tests if needed

### Cursor prompt for this chunk

Implement **Phase 6A — Server Test Cleanup** from this PRD.

Do only the following:

1. Add/update server-side tests for:
   - event emission
   - version behavior
   - QStash idempotency
   - snapshot endpoint coverage where needed

Do not:

- change production behavior unless required to make tests correct

Stop when complete and summarize.

---

## Phase 6B — Client Verification / Support Tests

### Goal

Add practical verification coverage for client realtime behavior.

### Scope

Implement only:

- client tests if the repo supports them
- otherwise add small verification helpers/comments/manual flow notes
- verify snapshot + event patch + version resync flows

### Cursor prompt for this chunk

Implement **Phase 6B — Client Verification / Support Tests** from this PRD.

Do only the following:

1. Add/update client-side tests if practical
2. If client tests are not practical, add small verification helpers and/or clear manual verification notes
3. Cover:
   - submission patching
   - turn/hand patching
   - version-gap recovery

Do not:

- redesign architecture
- change server behavior without cause

Stop when complete and summarize.

---

# Phase 7 — Cleanup and Documentation

## Phase 7A — Docs + Dead-Code Cleanup

### Goal

Finalize the refactor cleanly.

### Scope

Implement only:

- remove obsolete comments/docs related to polling-driven authority
- clean up dead code paths no longer needed
- update docs for:
  - QStash setup
  - room state channel
  - snapshot bootstrap
  - version-gap recovery
  - gameplay channel vs presence channel

### Cursor prompt for this chunk

Implement **Phase 7A — Docs + Dead-Code Cleanup** from this PRD.

Do only the following:

1. Remove obsolete dead code / comments where clearly safe
2. Update docs for:
   - QStash
   - room state channel
   - snapshot bootstrap
   - version recovery
   - state vs presence channels

Do not:

- make new architectural changes
- refactor unrelated code

Stop when complete and summarize.

---

# Final sequencing rule

Cursor must follow this exact order unless explicitly told otherwise:

1. Phase 4A
2. Phase 4B
3. Phase 4C
4. Phase 4D
5. Phase 4E
6. Phase 4F
7. Phase 5A
8. Phase 5B
9. Phase 6A
10. Phase 6B
11. Phase 7A

Cursor must not skip ahead.

---

# Final implementation note

If any chunk appears too large during execution, Cursor should:

- complete the smallest coherent subset
- stop
- summarize what remains
- wait for the next instruction
