# Production web runbook — FoulPlay

**Status:** Preparation only. Do **not** apply production migrations, enable live Stripe, or promote a production deploy until the owner explicitly approves.

Secrets must never be pasted into git, chat logs, or this file.

---

## 1. Hosting and DNS

Expected split (`lib/host.ts`, `proxy.ts`):

| Host | Role |
|------|------|
| `foulplay.io` | Marketing landing |
| `app.foulplay.io` | Authenticated app |

**Owner checks:**

- [ ] Vercel project exists and is linked to this GitHub repo
- [ ] Production domain `app.foulplay.io` assigned
- [ ] Marketing domain `foulplay.io` assigned (or redirects)
- [ ] Preview deployments work with Clerk allowed origins
- [ ] `proxy.ts` runs (Clerk session + marketing→app redirects)

There is **no** `vercel.json` in-repo. Vercel uses Next.js defaults. Prisma generate runs in `npm run build`. **Migrations are not automatic.**

---

## 2. Environment variables (production)

Run locally against a loaded production env file you keep off-git:

```bash
npx tsx scripts/check-env.ts
```

The script prints SET/MISSING names only.

**Must be set before traffic:**

- `DATABASE_URL`, `DIRECT_DATABASE_URL`
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production instance)
- `NEXT_PUBLIC_APP_URL=https://app.foulplay.io`
- `NEXT_PUBLIC_MARKETING_URL=https://foulplay.io`
- `APP_URL=https://app.foulplay.io` (QStash callbacks)
- `ABLY_API_KEY` (server-only)
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`

**Must NOT be set in production:**

- `APP_ENV=test`
- `NEXT_PUBLIC_ABLY_API_KEY`
- `E2E_TEST_TOKEN`, `DATABASE_URL_E2E`, `E2E_ALLOW_DB`

**Stripe live (after explicit approval only):**

- `STRIPE_SECRET_KEY` (`sk_live_…`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`)
- `STRIPE_WEBHOOK_SECRET` (live endpoint)
- `STRIPE_PRICE_GAME_NIGHT` / `MONTHLY` / `LIFETIME`
- `STRIPE_ALLOW_LIVE_KEYS=true`

Until those are approved, keep Stripe in test mode or omit live keys. `lib/stripe/mode-guard.ts` **blocks live keys** unless `STRIPE_ALLOW_LIVE_KEYS=true`.

---

## 3. Production database and Prisma

1. Identify the Neon **production** branch in the dashboard. Do not guess from local `.env`.
2. Confirm `DATABASE_URL` in Vercel Production is that branch (pooled) and `DIRECT_DATABASE_URL` is the direct host.
3. From a trusted machine, with production `DIRECT_DATABASE_URL` loaded:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

Use the direct URL for migrate (see `prisma.config.ts` and `dev-docs/planning/MIGRATION_LOCK_FIX.md`).

**Rollback:** Prisma migrate deploy is forward-only. Rollback means a previous app deployment plus a carefully reviewed SQL reverse if a new migration was applied. Prefer expanding-contract schema changes. **Do not** `migrate reset` production.

Current migrations end at `20260828180000_user_entitlements`. Stage B added **no** schema migrations.

---

## 4. Clerk production

- [ ] Production Clerk application (not development)
- [ ] Allowed origins include `https://app.foulplay.io` and Vercel preview URLs if used
- [ ] Sign-in/up redirect URLs
- [ ] Webhooks unused unless you added Clerk webhooks (none required for launch)

---

## 5. Ably

- [ ] Production Ably app API key stored as **`ABLY_API_KEY` only**
- [ ] `NEXT_PUBLIC_ABLY_API_KEY` **unset** in production
- [ ] Clients call `GET /api/ably/token?roomCode=XXXXXX` while signed in
- [ ] Token is subscribe-only for `room:{code}` and `room:{code}:state`
- [ ] Unauthenticated token requests return 401
- [ ] Non-members return 403

Smoke: two browsers, same private room, submit/vote appears without refresh.

---

## 6. QStash auto-accept

- [ ] `APP_URL` is `https://app.foulplay.io` (not marketing, not localhost)
- [ ] Signing keys match the QStash project
- [ ] Destination `POST https://app.foulplay.io/api/qstash/auto-accept` is allowed
- [ ] Submit a card in a 2-player room, do not vote, wait **30 seconds**, card auto-accepts once

If QStash cannot reach production, auto-accept will not run. The in-process `setTimeout` fallback is **E2E-only** (`APP_ENV=test`).

---

## 7. Stripe webhook and entitlements (live enablement plan)

Do **not** use live keys until this list is green:

1. Privacy and terms published and **owner-reviewed** (draft banners removed or accepted).
2. Test-mode Checkout + webhook already proven on staging/preview.
3. Live products/prices exist at $2.99 / $7.99 / $79.99.
4. Live webhook endpoint: `https://app.foulplay.io/api/stripe/webhook`
5. Events: `checkout.session.completed`, subscription updated/deleted, invoice events used by `app/api/stripe/webhook/route.ts`
6. `STRIPE_ALLOW_LIVE_KEYS=true` only on the production Vercel env
7. After a **real** (or live-mode approved) purchase: user entitlements update, player limit and daily host cap lift, portal opens
8. Webhook returns 200; duplicates are idempotent (`StripeWebhookEvent`)

Never use Stripe test cards against live Checkout.

---

## 8. Error logging

There is **no Sentry** in-repo. Production errors go to Vercel function logs and `console.error`. [OWNER] Add an error product later (P2).

---

## 9. Rollback of an app deploy

1. In Vercel, Instant Rollback to the previous production deployment.
2. If a migration was applied in the bad release, **do not** roll the app back blindly — check schema compatibility first.
3. Disable `STRIPE_ALLOW_LIVE_KEYS` if billing misbehaves.

---

## 9b. iPhone PWA smoke (required; TestFlight is not)

On a physical iPhone:

1. Open `https://app.foulplay.io` in **Safari**.
2. Share → Add to Home Screen.
3. Launch from the icon (standalone).
4. Sign in (do this from the Home Screen icon if the Safari session did not carry over).
5. Create or join a private room, submit, vote, confirm live score updates.

There is no service worker. Fail this smoke if Add to Home Screen has no icon, if Clerk cannot sign in from standalone, or if Ably/votes do not update.

TestFlight remains blocked until Expo + Apple Developer Program accounts exist. See `dev-docs/MOBILE_ACCOUNT_SETUP.md`.

---

## 10. Go / no-go (web)

Fail closed if any of these are true:

- Authentication broken
- Ably tokens issued without Clerk auth or without room membership
- `NEXT_PUBLIC_ABLY_API_KEY` set in production
- QStash auto-accept fails
- Production DB is the wrong Neon branch
- `/api/e2e` is reachable
- `APP_ENV=test` in production
- Core private-room gameplay fails (create, join, submit, vote, score, end, Run It Back)
- iPhone Home Screen PWA cannot sign in, join, or receive live updates
- Live billing enabled but webhook/entitlements fail
- Privacy/terms missing or still unpublished draft if you required legal sign-off
