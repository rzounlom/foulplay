# Realtime & QStash Architecture

Operational reference for the authoritative gameplay state, snapshot bootstrap, and QStash integration.

---

## 1. QStash setup

### Environment variables

| Variable | Purpose |
|----------|---------|
| `QSTASH_URL` | Upstash QStash API URL |
| `QSTASH_TOKEN` | QStash API token |
| `QSTASH_CURRENT_SIGNING_KEY` | Verifies incoming callback signatures |
| `QSTASH_NEXT_SIGNING_KEY` | Key rotation support |
| `APP_URL` | Base URL for callback endpoints (e.g. `https://foulplay.io`) |

### Submit flow

- When a player submits cards, the server creates a pending submission and **enqueues a QStash delayed job** for auto-accept.
- **Callback endpoint:** `POST ${APP_URL}/api/qstash/auto-accept`
- Clients **do not** authoritatively trigger auto-accept anymore; the server (via QStash) does.

---

## 2. Authoritative gameplay state channel

- **Channel name:** `room:{roomCode}:state` (e.g. `room:ABC123:state`)
- **Server** publishes typed `RoomEvent` payloads there (submission.created, vote_cast, submission.accepted, etc.).
- **Client** subscribes to this channel for authoritative gameplay updates.
- Event name: `event`.

---

## 3. Snapshot bootstrap

- **Endpoint:** `GET /api/rooms/[code]/snapshot` (e.g. `/api/rooms/ABC123/snapshot`)
- **Auth:** Required (Clerk).
- **Returns:** Snapshot state including `version`, `players`, `submissions` (with `autoAcceptAt`), viewer's `hand`, `currentTurnPlayerId`, etc.
- **Client flow:** Load snapshot once on room/game load, initialize local state from it, then subscribe to the state channel for patches.

---

## 4. Version-gap recovery

| Condition | Action |
|-----------|--------|
| `event.version <= lastSeenVersion` | Ignore (stale or duplicate) |
| `event.version === lastSeenVersion + 1` | Apply patch to local state |
| `event.version > lastSeenVersion + 1` | Refetch snapshot, replace state |

---

## 5. State vs presence

- **Authoritative gameplay state** lives on `room:{roomCode}:state`.
- **Presence** (who is online) should live on `room:{roomCode}:presence` if added.
- Presence must remain **UI-only** and must not affect gameplay correctness.

---

## 6. Legacy generic room channel

- `room:{roomCode}` still exists for backward-compatible UI and legacy events (e.g. `game_started`, `message_sent`, `card_submitted`).
- It is **not** the authoritative gameplay state channel.
- Do not remove it casually without verifying all consumers.
