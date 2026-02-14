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

1. Open the game room in production.
2. Open DevTools → Network. Look for WebSocket connection to `realtime.ably.io`.
3. Check Console for `[Ably]` errors.
4. If you see "Transport.onIdleTimerExpire" or "No activity seen", the connection is being dropped by a proxy. Token auth + increased timeouts should help.
