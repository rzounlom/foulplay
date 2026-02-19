# Ably Production Setup

## Why Ably may fail in production

1. **API key not exposed**: `NEXT_PUBLIC_ABLY_API_KEY` must be set in your hosting provider's environment variables (e.g. Vercel) so the client can connect.
2. **Token auth (recommended)**: In production builds, the app uses token auth (`authUrl: /api/ably/token`) instead of the raw API key. Set **`ABLY_API_KEY`** (server-side, no `NEXT_PUBLIC_` prefix) in Vercel. The client will fetch short-lived tokens from our API.
3. **Connection drops**: Proxies/firewalls may close idle WebSocket connections after ~30s. We've increased `realtimeRequestTimeout` and `disconnectedRetryTimeout` to improve resilience.

## Required environment variables

### Development (local)
- `NEXT_PUBLIC_ABLY_API_KEY` — Your Ably API key (from [Ably Dashboard](https://ably.com/dashboard))

### Production (Vercel / etc.)
- **`ABLY_API_KEY`** — Same key, server-side only. Used by `/api/ably/token` to issue tokens.
- Optional: `NEXT_PUBLIC_ABLY_USE_TOKEN=true` — Force token auth in development too.

## Verifying it works

### Quick checks (single browser)

1. Open the game room in production.
2. Open DevTools → **Network**. Filter by "WS" or search for `realtime.ably.io`. You should see a WebSocket connection.
3. Check **Console** for `[Ably]` errors. None = good.
4. If you see "Transport.onIdleTimerExpire" or "No activity seen", the connection is being dropped by a proxy. Token auth + increased timeouts should help.

### Full event validation (two browsers/devices)

Use two different browsers (or one normal + one incognito) with two different accounts to confirm events flow end-to-end:

| Action (Browser A) | Expected result (Browser B) |
|-------------------|----------------------------|
| **Lobby:** Player B joins room | Player list updates automatically (no refresh) |
| **Lobby:** Host starts game | Browser B redirects to game board |
| **Game:** Player A submits a card | Pending submissions count updates; card appears in voting |
| **Game:** Player A votes on a card | Vote count updates for other voters |
| **Game:** Host approves/rejects card | Submission resolves; points update; turn advances |
| **Game:** Host changes settings (show points, etc.) | Settings reflect immediately |
| **Game:** Host resets points | All players' points show 0 |
| **Game:** Host ends game | All players see end-game screen |
| **Chat:** Send a message | Message appears for all players in real time |

If any of these fail, check:
- Browser console for `[Ably]` errors
- Network tab for WebSocket status (green = connected)
- Vercel/server logs for "Failed to publish Ably event"

### Ably Dashboard

1. Go to [Ably Dashboard](https://ably.com/dashboard) → your app.
2. **Stats** → Message counts: you should see traffic when events occur.
3. **Channels** → Find `room:XXXXXX` (your room code). Use the channel inspector to see recent messages.
4. **Logs** → Check for auth or publish errors.

### Token auth check (production)

In production, the client uses token auth. Verify:

1. Open DevTools → **Network**.
2. Look for a request to `/api/ably/token`. It should return `200` with a token.
3. If it returns `401` or `500`, `ABLY_API_KEY` is missing or invalid in your hosting env.

### Why 3 connections when only 2 players?

In the Ably Dashboard **Connections** tab, you may see 3 connections for a room with 2 players. One connection often has no **Client ID** (shows `-`). This is expected:

- **2 connections** = the two players' browsers (each has a client ID like `ably-1771495021588-hb8o9ha`)
- **1 connection (no client ID)** = the **server** connection. The API uses `Ably.Realtime` to publish events (game_started, message_sent, card_submitted, etc.). That server client maintains a connection to Ably and does not set a client ID, so it appears as `-` in the dashboard.

### Where are chat messages in the dashboard?

Chat messages use **Ably Pub/Sub**, not Ably Chat. The flow:

1. Client POSTs to `/api/chat/message` → message is saved to the database
2. API publishes a `message_sent` event to the room channel via `channel.publish("message_sent", {...})`
3. All subscribed clients (including the sender) receive the event and display the message

In the Ably Dashboard:

- Go to **Channels** → select `room:XXXXXX`
- Open the **Messages** tab to see recent events (including `message_sent`)
- Use the channel inspector or debug console to inspect message payloads

If the Messages tab is empty, no events have been published to that channel recently (e.g. no one has sent a chat message or triggered other events).
