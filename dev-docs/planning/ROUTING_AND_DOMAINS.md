# Routing and Domain Structure

FoulPlay uses host-based routing to serve different content based on the domain.

## Domain Structure

| Domain | Purpose |
|--------|---------|
| **foulplay.io** | Marketing landing page |
| **app.foulplay.io** | The game (create room, join, play) |
| **api.foulplay.io** | Backend (reserved for future use) |

## How It Works

1. **Middleware** (`proxy.ts`) checks the `Host` header.
2. **App routes** (`/create`, `/join`, `/game/*`, `/games`, `/profile`, `/sign-in`, `/sign-up`) are only accessible on `app.*`. On marketing domain, requests to these paths redirect to `app.foulplay.io`.
3. **Root page** (`/`) renders different content:
   - **foulplay.io** → Marketing landing (links to app, app stores)
   - **app.foulplay.io** → App home (Create Room, Join Room)

## Local Development

- **localhost:3000** is treated as the **app** domain (full game UI).
- To test marketing locally, add to `/etc/hosts`:
  ```
  127.0.0.1 marketing.localhost
  ```
  Then visit `http://marketing.localhost:3000`.

## Environment Variables

**Production (Vercel):** Set `NEXT_PUBLIC_APP_URL=https://app.foulplay.io` so the middleware redirects correctly when users on marketing try to access app routes.

Optional overrides for custom deployments:

- `NEXT_PUBLIC_APP_URL` — App URL (default: `https://app.foulplay.io`)
- `NEXT_PUBLIC_MARKETING_URL` — Marketing URL (default: `https://foulplay.io`)
