# Stage A — Repository safety report

**Date:** 23 November 2026  
**Rule:** No database resets, seeds, or deploys were performed.

Legend: **VERIFIED** vs **NEEDS OWNER CONFIRMATION**.

---

## Git

| Item | Value |
|------|--------|
| Previous branch | `main` |
| Launch branch | `launch/web-ios-2026-11-25` |
| `main` vs origin | Ahead **1** (`d4d793d` Stripe billing, unpushed) |
| Other local branch | `chore/gameplay-refactor` (untouched) |

Uncommitted work on `main` was **E2E/Playwright/Artillery plus data-testids**, plus this audit/plan. It was reviewed and committed on the launch branch before Stage B application changes.

Secrets: **VERIFIED** not tracked. `.gitignore` has `.env*`. `git ls-files` found no `.env`, pem, or credential files. Present ignored files: `.env`, `.env.e2e`.

---

## Preserved change inventory (E2E harness)

**Modified (data-testids + E2E timer/auth wiring):**

- `.gitignore` — Playwright artifacts and `tests/e2e/.auth/*.json`
- `package.json` / `package-lock.json` — Playwright, Artillery, E2E scripts
- `jest.config.js` — ignore `tests/e2e`, `tests/load`, `apps/mobile`
- `tsconfig.json` — exclude `playwright.config.ts`
- `lib/auth/clerk.ts` — `http://localhost:3100` authorized party
- `lib/game/constants.ts` — E2E timer overrides via `APP_ENV=test`
- `app/api/game/submit/route.ts` — in-process auto-accept fallback when `APP_ENV=test`
- `app/api/game/end-quarter/route.ts` — uses `getIntermissionMs`
- UI data-testids on create/join/play-live/upgrade, age gate, paywall, game board, hand, lobby, voting, end-game
- `dev-docs/STRIPE_TEST_SETUP.md` — Stripe listen for port 3100

**Untracked (now preserved on the launch branch):**

- `playwright.config.ts`, `scripts/e2e-*.ts`, `lib/e2e/*`, `app/api/e2e/*`
- `tests/e2e/**`, `tests/load/**`, `tests/unit/e2e/**`
- `.github/workflows/e2e.yml`
- `dev-docs/E2E_TESTING.md`, launch audit/plan

---

## Environment inventory (hosts only — no secrets)

Local files present: `.env`, `.env.e2e`. No `.env.production`.

| File | Key | Host / path (no credentials) |
|------|-----|------------------------------|
| `.env` | `DATABASE_URL` | Neon pooler `ep-aged-leaf-ah3esvrh-pooler.c-3.us-east-1.aws.neon.tech` `/neondb` |
| `.env` | `DIRECT_DATABASE_URL` | Neon direct `ep-aged-leaf-ah3esvrh.c-3.us-east-1.aws.neon.tech` `/neondb` |
| `.env.e2e` | `DATABASE_URL_E2E` | Neon pooler `ep-floral-wave-ahs5px6s-pooler.c-3.us-east-1.aws.neon.tech` `/neondb` |
| `.env.e2e` | `PRODUCTION_DATABASE_URL` | **placeholder** (`your_prod_db_url`) — not a real URL |
| `.env.e2e` | `APP_ENV` | `test` |

**VERIFIED:** `aged-leaf` and `floral-wave` are **different Neon endpoints**.

**NEEDS OWNER CONFIRMATION (do not reset until answered):**

1. Which Neon branch is **production**?
2. Which is everyday **development** (`aged-leaf`)?
3. Is `floral-wave` / `neondb` a **dedicated disposable E2E** database?

`DATABASE_URL_E2E` does **not** contain the substring `e2e`. `e2e:db:reset` will **refuse** unless `E2E_ALLOW_DB=true` is set. That override must not be used until you confirm `floral-wave` is disposable.

E2E Clerk/Stripe/Ably/QStash values in `.env.e2e` look like placeholders (short lengths). Real Clerk test personas are required before Playwright auth setup.

---

## E2E cannot modify production — current guards

**VERIFIED** in `lib/e2e/safety.ts` and `lib/e2e/http-guard.ts`:

- Destructive helpers require `APP_ENV=test`
- Refuse `VERCEL_ENV=production` or `APP_ENV=production`
- Refuse if `DATABASE_URL_E2E === PRODUCTION_DATABASE_URL`
- URL must match `/e2e/i` **or** `E2E_ALLOW_DB=true`
- `/api/e2e/*` returns 404 unless `APP_ENV=test`, not a Vercel production deploy, and a ≥16-char `E2E_TEST_TOKEN` matches

Until `floral-wave` is confirmed disposable, **do not** set `E2E_ALLOW_DB=true` and **do not** run `npm run e2e:db:reset`.

---

## CI / deploy configuration

| Item | Status |
|------|--------|
| `.github/workflows/ci.yml` | Lint, typecheck, Jest, Next build. Dummy Clerk/Ably if secrets missing. **No** `prisma migrate deploy`. |
| `.github/workflows/e2e.yml` | Manual / opt-in (`vars.RUN_E2E`). Not a merge gate. |
| `vercel.json` | **Missing** |
| Production migrate-on-deploy | **Not in repo** — see `dev-docs/PRODUCTION_WEB_RUNBOOK.md` |

---

## Stage A stop conditions

- **Do not reset** `floral-wave` until you confirm it is disposable E2E.
- **Do not deploy** production or apply production migrations.
- **Do not enable** live Stripe until the go/no-go checklist passes.
