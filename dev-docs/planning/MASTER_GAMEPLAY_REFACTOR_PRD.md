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
