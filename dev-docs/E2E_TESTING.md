# E2E and multi-user testing

Playwright covers real browser flows. Artillery covers higher concurrency without launching hundreds of Chromiums. The existing Jest unit/integration suite is unchanged.

E2E always runs against a **dedicated test database** and `APP_ENV=test`. It never uses `NODE_ENV` as the switch (`next start` sets that to `production`).

## Safety rules

- Destructive reset/seed helpers refuse to run unless `APP_ENV=test`.
- They also refuse `VERCEL_ENV=production`, `APP_ENV=production`, or an E2E URL that matches `PRODUCTION_DATABASE_URL`.
- `DATABASE_URL_E2E` must contain `e2e` (database or branch name), or you must set `E2E_ALLOW_DB=true` for a dedicated local DB.
- HTTP helpers under `/api/e2e/*` return **404** unless both `APP_ENV=test` **and** `E2E_TEST_TOKEN` (16+ chars) match.
- Timer overrides (`AUTO_ACCEPT_SECONDS_E2E`, `INTERMISSION_SECONDS_E2E`) are ignored unless `APP_ENV=test`.
- Load tests refuse `*.foulplay.io` and production env flags.
- Do not point Playwright or Artillery at production.

## Required env vars

Add these to `.env` (or export them in the shell). Keep them off production deploys.

```
APP_ENV=test
DATABASE_URL_E2E=postgresql://.../foulplay_e2e
DIRECT_DATABASE_URL_E2E=postgresql://.../foulplay_e2e   # optional if same as DATABASE_URL_E2E
E2E_BASE_URL=http://localhost:3100
E2E_CLERK_PASSWORD=a-long-shared-password
E2E_TEST_TOKEN=at-least-16-chars-secret
E2E_ALLOW_DB=true   # only if your local DB name does not contain "e2e"

# Already required by the app
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
ABLY_API_KEY=...
NEXT_PUBLIC_ABLY_API_KEY=...
```

Optional:

```
AUTO_ACCEPT_SECONDS_E2E=5
INTERMISSION_SECONDS_E2E=8
PRODUCTION_DATABASE_URL=postgresql://...   # extra guard; E2E URL must not match
E2E_LOAD_CLERK_IDS=user_xxx,user_yyy
E2E_LOAD_ROOM_CODE=ABC123
RUN_STRIPE_E2E=true
```

The Playwright web server sets `DATABASE_URL` from `DATABASE_URL_E2E` and `NEXT_PUBLIC_APP_URL=http://localhost:3100`. Your everyday `npm run dev` on :3000 is left alone.

## Create / reset the test database

1. Create an empty Postgres database whose name or branch includes `e2e` (Neon branch, local `foulplay_e2e`, etc.).
2. Put the URL in `DATABASE_URL_E2E`.
3. Reset, migrate, and wipe gameplay rows:

```
npm run e2e:db:reset
```

If the cards table is empty, seed cards against the E2E URL:

```
APP_ENV=test DATABASE_URL="$DATABASE_URL_E2E" npm run db:seed
```

`npm run test:e2e:ci` migrates and seeds cards automatically when the table is empty.

## Clerk test users

Auth is **real Clerk**, not a production bypass.

1. Use a Clerk **test** instance.
2. Enable email/password (or keep password on users created via the Backend API).
3. Add `http://localhost:3100` as an allowed origin / redirect.
4. Turn off bot protection / CAPTCHA for the test instance if ticket sign-in is blocked.
5. Set `E2E_CLERK_PASSWORD` (used when creating users and as the password-form fallback).

Setup uses Clerk `signInTokens.createSignInToken` and opens `/sign-in?__clerk_ticket=...`. That is a supported Clerk testing mechanism. If the ticket does not complete, the helper fills the password form.

Personas (emails are `*@e2e.foulplay.test`):

| Key | Default entitlement |
| --- | --- |
| `host_free` | FREE |
| `host_game_night` | GAME_NIGHT_ACTIVE |
| `host_monthly` | MONTHLY_ACTIVE |
| `host_lifetime` | LIFETIME |
| `player_1` … `player_5` | FREE |
| `public_player_1`, `public_player_2` | FREE |

Each seeded user gets `is21Plus=true` and `skipTour=true` so create/join is not blocked by the age gate or first-run tour.

## Storage state

```
npm run dev:e2e          # optional, if you want a long-lived app
npm run e2e:auth:setup
```

Or just run Playwright — the `setup` project logs users in once and writes:

```
tests/e2e/.auth/host_free.json
tests/e2e/.auth/player_1.json
...
tests/e2e/.auth/personas.json   # clerkId + Prisma userId
```

Those JSON files are gitignored. Tests launch **isolated browser contexts** so sessions do not leak.

## Commands

```
npm run test:e2e           # headless Chromium
npm run test:e2e:headed    # watch the browsers
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:debug     # step through
npm run test:e2e:ci        # safety + migrate + seed + Playwright
npm run test:e2e:stripe    # only with RUN_STRIPE_E2E=true
npm run test:load          # Artillery public smoke
npm run test:load:matchmaking
npm run test:load:gameplay
```

Install browsers once:

```
npx playwright install chromium
```

## Stripe true-E2E (optional)

Regular billing tests **seed entitlements** in the E2E DB. They do not call Stripe.

For real Checkout (test mode only):

1. Use `sk_test_` / `pk_test_` keys.
2. Forward webhooks to the E2E app:

```
stripe listen --forward-to localhost:3100/api/stripe/webhook
```

3. Put the CLI `whsec_...` in `STRIPE_WEBHOOK_SECRET`.
4. Run:

```
RUN_STRIPE_E2E=true npm run test:e2e:stripe
```

This suite is **not** included in `npm run test:e2e`.

## Load tests

Artillery hits localhost. Matchmaking/rematch scenarios use `/api/e2e/load/*` (404 in production).

```
APP_ENV=test E2E_TEST_TOKEN=... E2E_LOAD_CLERK_IDS=user_1,user_2 \
  npm run test:load:matchmaking
```

Collect error rate, p50/p95/p99, and throughput from the Artillery summary. Compare `created: true` vs join responses to spot empty-room storms.

## Inspecting failures

On failure Playwright keeps:

- screenshot (`test-results/`)
- video
- trace on the first retry

Open the last HTML report:

```
npx playwright show-report
```

Or a trace:

```
npx playwright show-trace test-results/.../trace.zip
```

Helpers also log `{ roomCode, persona, entitlement, test }` to stdout. Console errors and 5xx responses from extra contexts are logged as `[e2e]`.

## Timing overrides

With `APP_ENV=test` only:

- `AUTO_ACCEPT_SECONDS_E2E` (default 5 in the Playwright web server)
- `INTERMISSION_SECONDS_E2E` (default 8)

Production constants stay 30s auto-accept and 5-minute intermission.

## CI

Default `.github/workflows/ci.yml` still runs lint, typecheck, Jest, and build only.

`.github/workflows/e2e.yml` runs Playwright when you dispatch it, or on `main` if the repo variable `RUN_E2E=true` is set. Required secrets: `DATABASE_URL_E2E`, Clerk keys, `E2E_CLERK_PASSWORD`, `E2E_TEST_TOKEN`, Ably keys.

## Test-only HTTP surface

These routes exist so load tests and optional tooling can seed state. They are 404 unless `APP_ENV=test` and `E2E_TEST_TOKEN` match:

- `POST /api/e2e/entitlements`
- `POST /api/e2e/rooms`
- `GET /api/e2e/health`
- `POST /api/e2e/load/drop-in`
- `GET /api/e2e/load/snapshot`
- `POST /api/e2e/load/rematch-ready`

Prefer the Prisma helpers in `tests/e2e/helpers/` for Playwright.

## Multi-user helper

```ts
const game = await createMultiUserGame(browser, {
  host: "host_free",
  players: ["player_1", "player_2", "player_3"],
});
// game.hostPage, game.playerPages, game.roomCode
await game.close();
```
