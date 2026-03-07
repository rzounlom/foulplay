# FoulPlay PRD: Server-Authoritative Realtime Gameplay + Typed Ably Events + Durable Timers

## Objective

Refactor FoulPlay gameplay architecture so it is:

- server authoritative
- event driven
- smoother under multiplayer load
- durable even when users leave the room
- ready to scale significantly better without changing core stack

Current stack remains:

- Next.js App Router
- Prisma + Postgres (Neon)
- Ably
- Vercel
- Upstash QStash for delayed jobs

This PRD does NOT replace the full stack.
It improves how gameplay state changes are processed and propagated.

---

## Core Architectural Rules

### Rule 1 — Clients do not control game progression

Clients may only send commands.

Examples:

- submit card
- cast vote
- start game
- join room

Clients must never be responsible for:

- auto-accepting after timeout
- deciding canonical turn progression
- resolving authoritative room state

### Rule 2 — Server is the source of truth

All gameplay-changing actions must go through server API routes / server actions that:

1. validate input
2. validate room/player permissions
3. update DB transactionally
4. publish typed Ably events
5. return minimal response

### Rule 3 — Ably is a state notification layer, not the source of truth

Ably is used to notify clients about state changes after the database is updated.

Ably should not be treated as the canonical state source.

### Rule 4 — QStash is only for delayed / guaranteed gameplay actions

Use QStash for:

- auto-accept after 60 seconds
- future delayed transitions

Do not put immediate user actions into the queue.

---

## Problems in Current System

Current gameplay has these weaknesses:

1. Client polling is used to keep gameplay moving.
2. Auto-accept can fail when no one is in the room.
3. Some realtime updates likely force broad refetches instead of patching local state.
4. Room state propagation is too coarse and not versioned.
5. The system is more client-dependent than ideal.

This causes:

- stalled submissions
- delayed gameplay
- extra DB reads
- UI jitter / lack of snappiness
- weaker scalability

---

## Target Architecture

### Command path

Client -> API route -> Prisma transaction -> Ably typed event -> clients patch local state

### Delayed path

Client/API action -> enqueue QStash job -> QStash callback -> Prisma transaction -> Ably typed event

### Recovery path

Client fetches room snapshot on load or missed-version detection

---

## Required Changes

# Part 1 — Introduce typed room events

Create a shared type definition for room events.

Suggested file:
`lib/realtime/room-events.ts`

Define typed payloads similar to:

```ts
export type RoomEvent =
  | {
      type: "submission.created";
      roomId: string;
      version: number;
      submissionId: string;
      submittedByPlayerId: string;
      cardTitle: string;
      autoAcceptAt: string;
    }
  | {
      type: "submission.vote_cast";
      roomId: string;
      version: number;
      submissionId: string;
      voterPlayerId: string;
      approve: boolean;
      approvals: number;
      rejections: number;
    }
  | {
      type: "submission.accepted";
      roomId: string;
      version: number;
      submissionId: string;
      acceptedBy: "players" | "auto";
      pointsAwarded: number;
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
      reason: string;
    };

    Requirements:

keep payloads minimal

do not publish full room snapshots over Ably unless absolutely necessary

Part 2 — Add room versioning
Goal

Allow clients to detect missed events and resync safely.

Required DB change

Add a monotonically increasing integer version field to room or game state.

Recommended:

add version Int @default(0) to the room-level state model that represents authoritative room/game state

If room is best:

increment room.version whenever any gameplay-changing mutation happens

If game state model is better:

increment gameState.version

Required behavior

Every transaction that changes gameplay state must:

increment version

include new version in the Ably event payload

Pseudo example:

await prisma.$transaction(async (tx) => {
  const updatedRoom = await tx.room.update({
    where: { id: roomId },
    data: { version: { increment: 1 } },
    select: { version: true },
  });

  // perform actual mutation(s)
  // then publish using updatedRoom.version
});

If easier, do the mutation and version bump in same transaction and publish after commit.

Part 3 — Centralize Ably publishing

Create or update a helper such as:

lib/realtime/publish-room-event.ts

Example shape:

import type { RoomEvent } from "./room-events";

export async function publishRoomEvent(roomId: string, event: RoomEvent) {
  // publish to Ably channel `room:${roomId}`
}

Requirements:

one place to publish room events

consistent channel naming

easy to log / observe

keep payload shape standardized

Part 4 — Convert immediate gameplay endpoints into command handlers

Review gameplay endpoints/server actions such as:

submit card

vote

start game

draw replacements

join room

For each:

validate request

write authoritative state in DB transaction

increment version

publish typed room event

return minimal JSON

Do not rely on client polling to finish these actions.

Example: Submit card

After successful submission:

create submission row with pending status

enqueue QStash auto-accept for +60 seconds

increment room/game version

publish submission.created

Example: Vote

After successful vote:

update vote counts / status

if submission resolves now, resolve it immediately server-side

advance turn if required

replenish hand if required

increment version

publish one or more events:

submission.vote_cast

maybe submission.accepted

maybe turn.advanced

maybe hand.replenished

Part 5 — Keep delayed actions in QStash only

Use Upstash QStash for auto-accept timers.

Auto-accept flow

On submission creation:

enqueue delayed callback for 60 seconds

On callback:

verify request signature

fetch submission

if not found -> no-op

if not pending -> no-op

if still pending:

mark accepted

update points/state

advance turn if needed

replenish hand if needed

increment version

publish submission.accepted with acceptedBy: "auto"

publish any other required state events

Important:

callback must be idempotent

Part 6 — Client state model: snapshot + patching

Clients should no longer rely primarily on polling or broad refetches after every event.

Desired client flow

On room/game page load:

fetch authoritative room snapshot once

store locally in React state/store

subscribe to Ably channel for room

apply incoming typed events as local patches

When to refetch full snapshot

Only do a full resync when:

client detects version gap

websocket reconnect happened and event continuity is uncertain

explicit room.resync_required event received

manual refresh / fallback path

Do NOT refetch full room state for every event by default.

Part 7 — Client version handling

Client should track lastSeenVersion.

When an event arrives:

if event.version === lastSeenVersion + 1

apply patch

set lastSeenVersion = event.version

if event.version <= lastSeenVersion

ignore as stale/duplicate

if event.version > lastSeenVersion + 1

trigger full snapshot refetch

replace local state

set lastSeenVersion to snapshot version

This ensures robust realtime behavior even with reconnects or missed messages.

Part 8 — Reduce polling responsibility

Polling may remain as a light fallback for stale UI, but it must no longer be responsible for actual game progression.

Specifically:

client polling must not be the primary way auto-accept fires

client polling must not be required for turn advancement

client polling should be optional / low-frequency fallback only

If current game-board logic still triggers auto-accept from the client, remove that authority.

Part 9 — Suggested event patching behavior on client

Cursor should update client room/game state handling so these events patch state locally:

submission.created

add pending submission to local submission list

show submitter pending banner/countdown

show voter decision UI

submission.vote_cast

update approvals/rejections on that submission only

submission.accepted

mark submission accepted

remove/close pending UI

award points locally if available in payload or trigger targeted fetch of just score if easier

submission.rejected

mark submission rejected

clear pending state

turn.advanced

update current turn player id only

hand.replenished

update that player hand count or fetch only that player hand if hand contents must remain private and server-generated

player.joined / player.left

patch player list only

Avoid full-room refresh unless version gap or fallback condition.

Part 10 — Suggested API / transaction pattern

For gameplay routes, use this pattern:

Validate user/session

Validate room + player membership

Run Prisma transaction for state mutation(s)

Increment authoritative version inside transaction

After transaction success, publish typed event(s)

Return success response

Do not publish before the DB write is committed.

Part 11 — Files to create or update

Cursor should inspect the repo and update/create analogous files as needed.

Likely files:

lib/realtime/room-events.ts

lib/realtime/publish-room-event.ts

lib/queue/qstash.ts

app/api/qstash/auto-accept/route.ts

gameplay API routes (submit/vote/start/etc.)

client room/game hook or component that subscribes to Ably

room snapshot fetch logic

Prisma schema for version field

docs under dev-docs/

Part 12 — Tests to add

Add unit/integration coverage where possible.

Test categories
A. Idempotent auto-accept

pending submission -> auto-accept works

already accepted submission -> callback no-ops

already rejected submission -> callback no-ops

B. Version progression

each gameplay mutation increments version

published event includes correct version

C. Client patch logic

apply ordered events successfully

ignore stale version

refetch on version gap

D. Immediate actions

submit card publishes submission.created

vote publishes submission.vote_cast

resolving vote publishes accept/reject event(s)

Part 13 — Acceptance criteria

The task is complete when all of the following are true:

Immediate gameplay remains snappy:

submit/vote/turn actions happen synchronously through API routes

Auto-accept is durable:

it fires even when no users are online

Clients are no longer responsible for driving game progression

Ably messages are small and typed

Clients patch local state from events rather than broad refetches

Versioning detects missed events and triggers resync safely

Polling is no longer the primary gameplay engine

Part 14 — Explicit non-goals for this task

Do NOT:

move every gameplay action into QStash

introduce Kafka, RabbitMQ, or heavy queue infrastructure

split backend into a separate service

rewrite the entire app architecture unnecessarily

This task is a focused upgrade:

server-authoritative commands

durable delayed jobs

typed realtime events

versioned patching

Part 15 — Summary for implementation

Implement a hybrid architecture:

Immediate user actions

Client -> API -> DB -> Ably

Delayed actions

API -> QStash -> callback API -> DB -> Ably

Client sync

snapshot once -> patch by typed event -> resync on version gap

This is the desired production architecture for smooth, scalable FoulPlay gameplay.
```
