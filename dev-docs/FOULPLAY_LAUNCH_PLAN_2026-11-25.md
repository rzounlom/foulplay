# FoulPlay Execution Plan — Target Wednesday 25 November 2026

**Companion:** `dev-docs/FOULPLAY_LAUNCH_AUDIT_2026-11-23.md`  
**Status:** Plan only. **Do not implement until you approve** the open decisions in the audit.  
**Today:** Monday 23 November 2026.

---

## Reality check

A full product rewrite (delete rounds, new refresh mechanic, 220-card overhaul, first Playwright green, live Stripe, legal, **and** App Store) **does not fit two days**.

**Go-live target that can actually ship:** production **web** at `app.foulplay.io` for football/basketball watch parties, private rooms + optional Join Live, existing vote loop, host-paid upgrades, 21+ gate.

**Out of Wednesday scope unless you explicitly override:** native store submission, full round-system deletion, Artillery soak, soccer/baseball.

---

## Recommended launch scope (smallest safe)

**In:**

- Clerk-authenticated web app
- Create / join / invite code
- Football + basketball
- Non-drinking + one drinking mode (or keep all five if hide-only)
- Submit / vote / auto-accept / scores / end game / Run It Back
- Free host limits + Stripe live Game Night / Monthly / Lifetime
- Age gate
- Privacy + terms
- Round clearing **hidden** (flag stays false; APIs remain)
- Responsive mobile **browser**

**Out:**

- Native iOS/Android
- Intermission UX
- 5-minute refresh (unless P0s finish early)
- Broadcast/fashion card flood (trim if you approve card work)
- Playwright as a merge gate (run what we can; don’t block DNS on it)

---

## Critical path

```
Legal pages + prod Clerk/Stripe/Ably/QStash/env
        ↓
Hide rounds (+ optional card trim)
        ↓
Migrate prod DB + deploy web
        ↓
Stripe webhook live + smoke (create, join, submit, vote, checkout test card on live? or last test-mode staging)
        ↓
Go / no-go
```

Card trim and refresh-hand are **off** the critical path. E2E is **off** the critical path but should start Monday afternoon if the Neon E2E branch is confirmed disposable.

---

## Monday 23 November — Audit, decisions, environments

**Owner: you + this session (audit done).** Remaining Monday work is **your decisions** and env verification. Estimated **3–5 hours of your time**, not coding until approval.

| Time (ET, suggestive) | Task | Depends on | Output |
|-----------------------|------|------------|--------|
| Morning | Read audit; answer 10 open decisions | Audit doc | Written yes/no |
| Late morning | Confirm Neon: which branch is **prod**, which is **dev**, which is **E2E** (`floral-wave` / `neondb` is **not** named e2e) | Dashboard | Diagram of 3 URLs (no secrets in git) |
| Midday | Clerk production instance: `app.foulplay.io` + `localhost:3000` origins | Clerk | Prod keys staged in Vercel, not committed |
| Afternoon | Stripe live products/prices exist and match $2.99 / $7.99 / $79.99 | Stripe Dashboard | Price IDs noted |
| Afternoon | Ably app + QStash prod destination | Dashboards | Token auth plan |
| Afternoon | Domain/DNS: `foulplay.io` vs `app.foulplay.io` on Vercel | Hosting | Both resolve |
| If time | Confirm `proxy.ts` on a preview deploy | Preview URL | Marketing vs app split works |

**Do not** run `e2e:db:reset` until you confirm the E2E URL is disposable. Safety will currently **refuse** anyway (`DATABASE_URL_E2E` path `/neondb`, no `e2e` substring, `E2E_ALLOW_DB` unset).

**Monday done when:** decisions recorded; prod vs E2E DBs named; Clerk/Stripe/Ably/QStash prod accounts reachable.

---

## Tuesday 24 November — Approved implementation only

Assume you accepted **hide rounds, web-only, trim commercials, no refresh-hand, commit E2E harness but don’t require green**.

| Block | Hours | Work | Tests |
|-------|------:|------|-------|
| P0-1 Legal | 3–6 | `/privacy`, `/terms`, footer links, 21+ sentence on drinking create | Manual + lint |
| P0-6 Ably token auth | 2 | Clerk-protect `GET /api/ably/token` | Jest |
| P0-7 Invite preview | 0.5 | Exclude from `proxy.ts` matcher | Integration rooms test |
| P1-1 Hide rounds | 2–3 | Remove/hide create + lobby toggles; keep APIs | Jest rooms; skip intermission E2E |
| P1-3/4 Cards (if approved) | 4–6 | Trim hf fashion/commercials; add Incomplete Pass + Made 2; seed | `engine.test.ts`; manual deal |
| P1-10 Onboarding | 2 | Collapse instructions to ~6 lines | Manual |
| P0-3/4/5 Prod wiring | 3–4 | Vercel env, migrate deploy, QStash URL, Stripe webhook, `STRIPE_ALLOW_LIVE_KEYS` **prod only** | Staging smoke |
| Commit hygiene | 1 | Commit E2E + product diffs on a branch; PR; don’t push `APP_ENV=test` to prod | CI Jest |
| E2E (best effort) | 3–5 | Fix Playwright to load `.env.e2e`; rename DB or `E2E_ALLOW_DB`; `e2e:auth:setup`; run A, B, G | Playwright headed |

**Tuesday stop-the-line:** if legal pages or Stripe webhook are not done, **do not** start card-rewrite leftovers. Prefer a smaller deck later.

**If you instead approve full round deletion + refresh-hand:** that is **+1.5–2.5 days**. It slips past Wednesday. Put it on Thursday/Friday, not on the launch train.

---

## Wednesday 25 November — Release day

| Window | Task |
|--------|------|
| Morning | `npm test`, typecheck, lint. Preview deploy smoke: sign-in, age gate, create private room, 2 browsers join, submit, vote, end, Run It Back, upgrade page loads Checkout in **live** or confirmed test staging |
| Morning | Privacy/terms reachable. No `APP_ENV=test`. Auto-accept waits 30s (QStash). |
| Midday | **Go/no-go** (checklist below) |
| If go | Promote to production; `prisma migrate deploy` already applied; Stripe live webhook delivery 200s |
| After | 30-minute smoke on real phones (Safari iOS, Chrome Android) against prod |
| After | Watch Ably/QStash/Stripe dashboards 1 hour |
| Not today | App Store / Play submission |

**Mobile / iPhone:** ship the **web PWA** (Safari → Add to Home Screen). There is **no Apple Developer membership and no Expo account** as of 23 November 2026, so TestFlight is a stretch goal only. See `dev-docs/MOBILE_ACCOUNT_SETUP.md`.

---

## Task estimates vs calendar

| Workstream | Optimistic | Likely | Wednesday? |
|------------|------------|--------|------------|
| Legal pages | 3h | 1d (copy) | Yes if you supply text |
| Hide rounds | 2h | 3h | Yes |
| Card trim | 4h | 1d | Maybe |
| Refresh-hand | 6h | 1.5d | **No** unless Monday coding starts |
| Delete rounds | 1d | 2d | **No** |
| Stripe live | 2h | 4h | Yes |
| Playwright green | 4h | 1–2d (Clerk quirks) | Best effort |
| Native app | weeks | weeks | **No** |

---

## Go / no-go criteria (Wednesday midday)

**GO** only if **all** are true:

1. Privacy and terms URLs live and linked in footer.
2. Production uses Clerk **production** keys and Stripe **live** keys (`sk_live` / `pk_live`) with `STRIPE_ALLOW_LIVE_KEYS=true` **only** there.
3. Stripe webhook on prod URL verified (Dashboard shows recent 2xx).
4. `prisma migrate deploy` applied to **prod** DB; app reads/writes entitlements columns.
5. QStash delivers auto-accept against prod `APP_URL` (one test submission auto-resolves ~30s).
6. Ably connected in prod (token route authenticated; no root key in the browser if token mode on).
7. Create → join → submit → vote → end works on a phone browser.
8. Age gate blocks drinking modes for under-21 self-report.
9. Free host 5th player waits; host sees paywall (manual or E2E).
10. `APP_ENV` is **not** `test` in Vercel production.
11. `/api/e2e/*` returns 404 in production.
12. Rollback known: previous Vercel deployment.

**NO-GO** (ship Thursday/Friday instead) if any of:

- Legal missing
- Webhook not receiving
- Auto-accept dead
- Auth redirects broken (`proxy.ts` not running)
- Prod DB pointing at E2E/dev
- Uncommitted local `main` deployed from a laptop instead of git

**Soft no-go (launch anyway with eyes open):** Playwright red; cards still 220; rounds toggle still visible; Sentry missing; Public Chaos flaky.

---

## Day-by-day if you approve the recommended scope

### Monday (remaining)

- [ ] Approve/reject: hide rounds, web-only, card trim, no refresh, no native
- [ ] Identify prod / dev / e2e databases
- [ ] Stage Vercel + Clerk + Stripe + Ably + QStash
- [ ] Draft privacy/terms text

### Tuesday

- [ ] Implement only approved P0/P1
- [ ] Preview deploy
- [ ] Test-mode Stripe checkout still works on preview
- [ ] Jest still 308+ green
- [ ] Optional Playwright A/B

### Wednesday

- [ ] Final smoke
- [ ] Production promote
- [ ] Live webhook + one real $2.99 Game Night **or** a disciplined live-mode test charge you refund
- [ ] Announce web URL only

---

## Rollback

1. Vercel → previous production deployment.
2. Do **not** automatically reverse Prisma migrations unless a migration is the failure (then restore Neon PITR / snapshot — confirm you have it **before** Wednesday).
3. Stripe: disable webhook endpoint if grants double-fire; idempotency table should already prevent duplicate event IDs.

---

## After launch (Thu–Sun, not promised)

- 5-minute refresh-hand
- Delete round APIs
- Apply full launch decks
- Playwright CI with `RUN_E2E`
- Sentry + rate limits
- Native TestFlight **only after** Expo account + Apple Developer membership + explicit approval
- Native Phase 2 gameplay **only after** web gameplay is boringly stable

---

## Explicit non-goals this week

- App Store / Google Play submission or promised TestFlight dates
- Creating a new Expo project or duplicating `apps/mobile`
- Service worker / offline gameplay cache
- Load tests against production
- Enabling `APP_ENV=test` in production so E2E timers fire
- Bypassing Clerk

---

## What I will do after you reply

Wait for your decisions on the 10 audit questions. Then implement **only** the approved slice, starting with P0 legal/auth/webhook/hide-rounds unless you order a different sequence.
