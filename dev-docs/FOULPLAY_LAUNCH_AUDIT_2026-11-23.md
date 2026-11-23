# FoulPlay Launch Audit — 23 November 2026

**Scope:** Read-only inspection of the repository as of this date.  
**Rule:** No application, schema, env, dependency, or deploy changes were made.  
**Tests run this session:** `npm run typecheck` (pass), `npm run lint` (1 warning), `npm test -- --ci` (**37 suites / 308 tests pass**). Playwright browser tests were **not** executed against a live database.

Legend used throughout:

- **VERIFIED** — observed in code, config, git, or this session’s test output
- **ASSUMPTION** — reasonable inference, not proven
- **RECOMMENDATION** — product/engineering advice for your approval

---

## 1. Executive summary

FoulPlay is a **working Next.js 16 web product** with Clerk auth, Prisma/Postgres, Ably realtime, QStash auto-accept, and Stripe test-mode billing. Core loops — create/join room, deal cards, submit, vote, auto-accept, end game, Run It Back, free-tier paywalls — exist in code and have **Jest coverage**. A Playwright + Artillery harness exists on disk but is **uncommitted**, **never fully run in this checkout** (no `tests/e2e/.auth/*.json`), and is **not** in default CI.

**Wednesday 25 November 2026 is realistic for a web launch only if scope is cut hard.** It is **not** realistic for:

- native iOS/Android store submission
- a full deletion of the round/intermission system
- a complete 220-card rewrite plus new 5-minute refresh mechanic plus production Stripe live plus first-ever Playwright green, all in two days

The smallest safe launch is: **responsive web on `app.foulplay.io`**, football + basketball, **round clearing left off by default (and hidden)**, existing submit/vote/score loop, Clerk + Stripe live with privacy/terms, and a short smoke checklist. Mobile should stay **web/PWA fallback**. Native app is Phase 1 lobby-only.

**Highest launch blockers (P0):**

1. No privacy policy or terms of service pages (**VERIFIED** — no `/privacy` or `/terms` routes).
2. Uncommitted E2E/billing-test harness sitting on `main` working tree; Stripe billing commit is **1 commit ahead of `origin/main` and unpushed**.
3. Production Stripe live keys, webhook, Clerk production instance, and migrate-on-deploy are **not encoded in repo** (`vercel.json` missing; CI does not run `prisma migrate deploy`).
4. `/api/ably/token` is unauthenticated (**VERIFIED** `app/api/ably/token/route.ts`).
5. Public `/api/rooms/invite-preview` is behind Clerk-protected `/api/rooms(.*)` in `proxy.ts` — likely 401 for guests.
6. Age/alcohol product exists; legal pages and store/web disclosures do not.

**Good news:** Round/intermission is already **optional**. `Room.allowQuarterClearing` defaults `false`; GameBoard only shows End Round UI when the flag is on (`components/game/game-board.tsx` `showQuarterControls`). You can ship continuous play **without deleting the round system this week**.

---

## 2. Architecture (Phase 1)

### Git state — VERIFIED

| Item | Value |
|------|--------|
| Branch | `main` tracking `origin/main`, **ahead 1** |
| HEAD | `d4d793d` (2026-09-09) “Add Stripe integration for billing and upgrade features” |
| Remote | `https://github.com/rzounlom/foulplay.git` |
| Last origin commit | `0f94252` (2026-08-27) |
| Uncommitted | 23 modified files + untracked E2E/load/lib/e2e (35 porcelain lines) |
| Other local branch | `chore/gameplay-refactor` |

Working tree includes the Playwright harness from September 2026 (data-testids, `lib/e2e`, `tests/e2e`, `playwright.config.ts`). That work is **not on origin**.

### Stack — VERIFIED (`package.json`)

| Layer | Version / notes |
|-------|-----------------|
| Next.js App Router | 16.1.6 |
| React | 19.2.3 |
| Prisma + pg adapter | 7.3.0 |
| Clerk | `@clerk/nextjs` ^6.37.1 |
| Stripe | ^22.6.0 |
| Ably | ^2.17.1 |
| QStash | `@upstash/qstash` ^2.9.0 |
| Zod | ^4.3.6 |
| Jest | 30.2.0 |
| Playwright | ^1.63.0 (devDependency) |
| Artillery | ^2.0.34 (devDependency) |
| Tailwind | 4 |

Mobile (`apps/mobile/package.json`): Expo ~54, RN 0.81.5, Clerk Expo, Ably. **Not** in the root Next workspace scripts.

### Web architecture — VERIFIED

```
Browser (Clerk session)
  → proxy.ts (Clerk + host-based marketing vs app redirect)
  → app/(game) pages + app/api/* route handlers
  → Prisma/Postgres (Neon in current env files)
  → Ably: room:{code}:state (authoritative) + room:{code} (legacy UI)
  → QStash delayed POST /api/qstash/auto-accept
  → Stripe Checkout + webhook
```

- **No `middleware.ts`.** In Next.js 16 this is correct: `proxy.ts` replaces middleware ([Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)). `dev-docs/planning/ROUTING_AND_DOMAINS.md` documents this.
- `proxy.ts` exports `export default clerkMiddleware(...)`. Next 16 prefers a `proxy` named export; **ASSUMPTION:** default export still runs (needs a production request log to confirm).
- Domains: `foulplay.io` marketing, `app.foulplay.io` app (`lib/host.ts`). Localhost is treated as app.

### Dual realtime — VERIFIED

- State channel + `Room.version` + snapshot resync: `lib/hooks/useRoomState.ts`, `lib/realtime/publish-room-event.ts`
- Legacy channel for popups: `lib/ably/useRoomChannel.ts`
- Polling fallback when Ably disconnected: lobby ~3s, game board similar
- Version-gap unit tests exist: `tests/unit/realtime/version-gap-recovery.test.ts`

### Database — VERIFIED (`prisma/schema.prisma`)

Users (Clerk id, age gate, Stripe entitlements), Rooms (lobby/active/ended, public chaos, rematch JSON, **five round/intermission columns**), Players, GameState, Cards, CardInstances, Submissions, Votes, Messages, WaitlistSignup, AnalyticsEvent, StripeWebhookEvent.

Migrations exist through `20260828180000_user_entitlements`. `prisma.config.ts` uses `DIRECT_DATABASE_URL` for migrate (Neon pooler lock workaround).

### Shared web/mobile code — VERIFIED broken

Mobile `tsconfig` maps `@/*` to `apps/mobile/*` only. `apps/mobile/app/create-room.tsx` imports `@/lib/game/modes`, but `apps/mobile/lib/` contains only `api.ts` and `ably.ts`. **The mobile create-room screen cannot typecheck/build as committed.**

### Risky / incomplete / unused — VERIFIED

| Item | Evidence |
|------|----------|
| Unauthenticated Ably token mint | `app/api/ably/token/route.ts` GET, no Clerk |
| Invite preview vs Clerk matcher | Public route under `/api/rooms(.*)` in `proxy.ts` |
| Dead auto-accept HTTP | `app/api/game/auto-accept-submission/route.ts` — no client callers; QStash is canonical |
| Dead quarter API | `app/api/game/advance-quarter/route.ts` Q1–Q4; UI uses numeric rounds |
| `canTurnInCards` | Schema comment: always true; host toggle removed |
| Card `type` | All 220 cards are `"penalty"`; `action`/`challenge` unused |
| Instructions vs engine | `instructions-modal.tsx` claims mode changes deck % mix; engine only **caps severe cards** + **display.ts** adjusts drink text |
| README | Still create-next-app boilerplate |
| No Sentry, no rate limits, no `vercel.json`, no PWA manifest | repo grep |
| `FREQUENCY_TIERS_SMAR_CARD_DRAW_PLAN.md` | empty file |
| `CARD_OVERHAUL_PLAN.md` | stale (~55+50 cards; actual 220) |

### Environment variable **names** (no values)

**Production web:** `DATABASE_URL`, `DIRECT_DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL`, `ABLY_API_KEY`, `NEXT_PUBLIC_ABLY_API_KEY` (dev only), `NEXT_PUBLIC_ABLY_USE_TOKEN`, `QSTASH_TOKEN`, `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `APP_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_GAME_NIGHT`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_LIFETIME`, `STRIPE_PRICE_ID`, `STRIPE_ALLOW_LIVE_KEYS`, `ADMIN_CLERK_IDS`, `ANALYTICS_WEBHOOK_URL`, `PUBLIC_CHAOS_ANALYTICS_WEBHOOK_URL`, partner `NEXT_PUBLIC_PARTNER_*` URLs.

**E2E-only (must not be on production):** `APP_ENV`, `DATABASE_URL_E2E`, `E2E_TEST_TOKEN`, `E2E_CLERK_PASSWORD`, `AUTO_ACCEPT_SECONDS_E2E`, `INTERMISSION_SECONDS_E2E`.

---

## 3. Feature inventory (Phase 2)

| # | Feature | Status | Evidence |
|---|---------|--------|----------|
| 1 | Landing / onboarding | **Implemented, untested in E2E** | `app/page.tsx`, marketing vs app home, `game-tour.tsx`. Instructions modal is long (rounds, modes, combos). |
| 2 | Clerk sign-in/up | **Implemented; E2E setup exists but unrun** | `app/(auth)/*`, `lib/auth/clerk.ts`, `tests/e2e/auth/setup.spec.ts` |
| 3 | Room creation | **Implemented + Jest** | `POST /api/rooms`, `tests/integration/api/rooms.test.ts` |
| 4 | Join / invites | **Implemented + Jest; invite-preview likely broken for guests** | `POST /api/rooms/join`, `GET /api/rooms/invite-preview` vs `proxy.ts` matcher |
| 5 | Private games | **Implemented + Jest/E2E spec** | Default `isPublicChaos: false` |
| 6 | Public Chaos matchmaking | **Implemented + unit tests; E2E spec unrun** | `POST /api/rooms/public-drop-in`, `lib/rooms/public-chaos-matchmaking.ts` |
| 7 | Mid-game joining | **Implemented** | `allowJoinInProgress` default true; public chaos forced true |
| 8 | Host controls | **Implemented, lightly tested** | Start, settings, reset points, end game, optional End Round. `game-board.tsx` is ~2500 lines. |
| 9 | Card dealing | **Implemented + unit tests** | `drawRandomCardIndicesSmart` in `lib/game/engine.ts`; seed from `lib/game/cards.ts` |
| 10 | Submissions | **Implemented + Jest** | `POST /api/game/submit` |
| 11 | Voting / thresholds | **Implemented + unit/integration** | `lib/game/approval.ts`: ≤3 players → 1 vote; else `ceil(n/2)` |
| 12 | Rejections / return | **Implemented + E2E spec unrun** | Vote reject + `tests/e2e/gameplay/rejection.spec.ts` |
| 13 | Auto-accept | **Implemented + Jest; E2E depends on QStash or APP_ENV=test fallback** | QStash + in-process `setTimeout` only if `APP_ENV=test` (`app/api/game/submit/route.ts`) |
| 14 | Points / leaderboard | **Implemented** | `Player.points`, end-game `lastGameEndResult` |
| 15 | Drinking penalties | **Implemented, display-only honor system** | `PENALTIES` in cards; `display.ts` mode multipliers; no enforcement |
| 16 | Round / intermission | **Implemented + E2E spec; optional** | See Phase 3 |
| 17 | End-game | **Implemented** | `POST /api/game/end`, `end-game/page.tsx` |
| 18 | Run It Back | **Implemented + Jest + E2E specs unrun** | rematch ready/start routes |
| 19 | Disconnect / reconnect | **Partial** | Ably retry + snapshot resync + polling + idle “click to reconnect”. No dedicated reconnect tests. Host disconnect does not auto-transfer host. |
| 20 | Mobile responsiveness | **Implemented in CSS, untested visually** | Tailwind breakpoints; no Playwright mobile project |
| 21 | Stripe / entitlements | **Implemented + Jest; live E2E unrun** | See Phase 5 |
| 22 | Free hosting limits | **Implemented + Jest + E2E specs** | 4 players, 2 private hosts/UTC day |
| 23 | Partner / ad strip | **Implemented; depends on Stripe + partner env URLs** | `lobby-monetization-strip.tsx`; hidden for premium |
| 24 | Profile / subscription | **Implemented; portal untested** | `app/(game)/profile/page.tsx`, `POST /api/stripe/portal` |
| 25 | Errors / loading | **Partial** | Skeletons on create/join; game board error toasts; not systematic |

### Frontend / API / DB / realtime inconsistencies — VERIFIED

1. Guest invite preview vs Clerk-protected `/api/rooms`.
2. Dual Ably channels (state vs legacy popups).
3. `lastGameEndResult.winnerId` is **player id**; rematch also stores `winnerUserId` (end route writes both — good). Seeded E2E rooms historically used placeholder winner ids.
4. Instructions claim mode changes deck composition %; code only caps severe cards + rewrites drink copy.
5. `currentQuarter` comments say Q1–Q4; runtime uses `"1"`, `"2"`, …
6. Intermission finalize is **client-driven** (timer in GameBoard), not QStash — tab-closed host can stall a private intermission.

---

## 4. Gameplay simplification (Phase 3)

### Current loop — VERIFIED

1. Host creates room (mode, sport, hand size, optional public, optional round clearing).
2. Players join; host starts (≥2 players).
3. Each player is dealt `handSize` cards (smart tier mix).
4. Watch broadcast → select cards → submit → others vote.
5. Approve → points + drink copy; reject → cards return; timeout → auto-accept.
6. Optional: host End Round → 5 min (2 min public) intermission → discard for points/penalties → Lock In → finalize.
7. Host ends game → leaderboard → Run It Back.

Onboarding (`instructions-modal.tsx`) currently explains modes, hand, voting, auto-accept, **and** round clearing. That is more than a casual fan can absorb in 30 seconds.

### Proposed continuous play — evaluation

**1. Is it simpler and more enjoyable?**  
**RECOMMENDATION: Yes, for launch.** Round clearing adds a second mini-game (discard, lock-in, penalties, suggest-end-round, host end-early) on top of the already social vote loop. Casual fans only need: *see event → tap card → friends confirm → points*.

**2. What becomes unnecessary if rounds go away**

- UI: End Round, intermission banner, Lock In, discard-for-intermission, suggest end round, “Start next round”
- APIs: `end-quarter`, `finalize-quarter`, `quarter-discard-*`, `suggest-end-round`, `decline-suggest-end-round`, `reset-round`, `advance-quarter`
- Ably events: `quarter_*`, `suggest_end_round_*`, `round_reset`
- E2E: `tests/e2e/gameplay/intermission.spec.ts`
- Create/lobby toggles for round clearing
- Timer env `INTERMISSION_SECONDS_E2E`

**3. Code/DB that depends on rounds — VERIFIED**

`Room.allowQuarterClearing`, `currentQuarter`, `quarterIntermissionEndsAt`, `pendingQuarterDiscardSelections`, `quarterDiscardDonePlayerIds`, `suggestEndRoundPlayerIds` in `prisma/schema.prisma`. Routes listed above. `start-room-game.ts` sets `currentQuarter: "1"` when flag on. Rematch copies `allowQuarterClearing` (`lib/rooms/create-rematch-lobby.ts`). Billing **does not** reference rounds.

**4. Would removing rounds break scoring, rematch, timers, billing?**

| Area | Impact |
|------|--------|
| Submit/vote/auto-accept scoring | None |
| Rematch | Copies the flag; safe if always false |
| QStash auto-accept | Independent |
| Billing / paywalls | None |
| Public chaos | Created with `allowQuarterClearing: false` already |

**5. 5-minute refresh eligibility — RECOMMENDATION**

Store `lastSuccessfulSubmitAt` (or `lastHandRefreshAt`) per `Player`. Eligible when `now - lastSuccessfulSubmitAt >= 5 minutes` **and** no pending submission. Mid-game joiners: start clock at join (`Player.createdAt`). Display countdown on the hand.

**6. Replace all cards vs individual cards**  
**RECOMMENDATION: replace the whole hand** (simpler mental model: “new cards”). Individual card refresh invites fishing.

**7. Spam / fishing**  
One refresh per 5 minutes; require no pending submission; keep smart-draw severe cap; do not let refresh run during an open vote on *your* cards (block while `CardSubmission.status === pending` for that player).

**8. Pending submissions**  
Do not discard instances that are `submitted`. Refresh only `status: "drawn"` cards, **or** block refresh until pending resolves. **RECOMMENDATION: block refresh while pending** (clearest).

**9. Mid-game joiners**  
They already get a full smart-dealt hand (`join-room-core.ts`). Refresh clock starts at join. Do not inherit another player’s intermission.

**10. Quiet player stuck?**  
Yes, today, if they have unplayable rares and no intermission. 5-minute refresh is the right pressure valve. Also keep high-frequency cards in the launch deck so hands are not all Hail Marys.

**11. One-screen onboarding copy (proposed)**

> Watch the game. When you see something on a card, tap it and submit. Friends vote if it happened. Get points. First to… actually: play until the host ends. Most points wins. If you haven’t played a card in 5 minutes, you can get a new hand.

**12. Fairness**  
Same 5-minute rule for everyone; no extra cards; pending submissions protected; host cannot refresh others.

### Other mechanics to cut/merge for launch — RECOMMENDATION

| Mechanic | Advice |
|----------|--------|
| Round/intermission | **Hide for launch**; delete post-launch if the simpler loop sticks |
| Suggest end round | Hide with rounds |
| Combo insight / “big swing” UI | P2 — extra cognitive load |
| Card reorder / hold-to-drag | P2 |
| Five drinking modes | Launch with **Non-drinking** + **Party** only (or Non-drinking + one drinking). Casual/Lit/Anything Goes are small display/cap variants |
| Hand size 4–12 | Launch default 6, hide advanced picker or cap 5–7 |
| Chat + reactions | Keep but don’t teach in onboarding |
| Party-chain / defending champ copy | Fun; not needed to start |
| Soccer/baseball | Already disabled — keep out |
| Turn / draw APIs | `GameState.currentTurnPlayerId` still exists; draw is not the main loop — don’t teach “turns” |

### Simplest implementation path

**Wednesday (recommended):** Do **not** delete round tables/APIs. Hide “Enable round clearing” on create/lobby. Default remains false. Games already run continuously. Optionally add a single `POST /api/game/refresh-hand` with a 5-minute cooldown if time remains after P0s.

**Post-launch:** Delete round APIs/UI and migrate unused columns.

**Do not implement until you approve.**

---

## 5. Continuous-play game specification (proposed)

**Not implemented.** For approval.

1. Host creates private or (premium) public room. Sport: football or basketball. Mode: Non-drinking or Party. Hand size: 6.
2. Code share / Join Live. Age gate once.
3. Host starts at 2+ players. Cards dealt immediately. Tour skipped or 3 steps max.
4. Continuous play until host taps End Game.
5. Submit → vote (threshold unchanged) → auto-accept 30s (15s public chaos).
6. Refresh Hand: button visible when `now - max(lastSubmit, joinTime) ≥ 300s` and no pending submission. Replaces all `drawn` cards via existing smart draw. Cooldown 5 minutes. Other players unaffected.
7. Mid-join allowed. Joiner gets a full hand; refresh clock starts at join.
8. Host End Game → leaderboard → Run It Back (billing unchanged).
9. No intermission, Lock In, discard drinking window, or end-round vote.

---

## 6. Football card audit (Phase 4)

**Source of truth:** `lib/game/cards.ts` `FOOTBALL_CARDS` (117 cards), seeded by `prisma/seed.ts`.

### Deck shape — VERIFIED

| | Count |
|--|------:|
| Total | 117 |
| mild / moderate / severe | 90 / 18 / 9 |
| hf / common / rare | 44 / 59 / 14 |
| 1-point cards | 83 |
| All `type` | penalty |

**Missing obvious gameplay card:** **Incomplete Pass** is not in the deck (Complete Pass and Dropped Pass exist). That is a launch gap.

### Frequency sources

**VERIFIED (published stats, not invented):**

- [Pro-Football-Reference 2024 penalties](https://www.pro-football-reference.com/years/2024/penalties.htm): False Start **2.49/g**, Offensive Holding **2.43/g**, Defensive PI **1.13/g**, Delay of Game **0.62/g**, Defensive Offside **0.57/g** (per team-game; contest ≈ 2×).
- [StatMuse / 2024 league table](https://www.statmuse.com/nfl/ask/nfl-league-average-penalties-per-play-by-year-2001-to-2024): 1,387 TDs in 544 team-games → **~2.55 TDs per team per game** (~5 TDs per contest); 3,506 accepted penalties / 544 → **~6.4 team penalties/g**.

**ESTIMATE:** sacks ~2–3/team-g, INTs ~0.8/team-g, safeties / pick-six / kick-return TD rare (internal `CARD_RARITY_RESEARCH.md` plus general NFL knowledge). Broadcast/fashion/commercial cards have **no official frequency**.

Internal research (`dev-docs/planning/CARD_RARITY_RESEARCH.md`) is useful but **not independently sourced** in-repo (no citations). Treat those numbers as **ESTIMATE**.

### Recommendation key

KEEP / REWRITE / MERGE / REMOVE / ADD. Freq: **V** verified, **E** estimate, **B** broadcast (unmeasured).

### Football — every current card

| Title | Pts | Sev | Tier | Freq | Casual fan? | TV-visible? | Objective? | Rec | Notes |
|-------|----:|-----|------|------|-------------|-------------|------------|-----|-------|
| Complete Pass | 1 | mild | common | E high | Y | Y | Y | KEEP | Add Incomplete Pass as sibling |
| Run Play | 1 | mild | common | E high | Y | Y | Ambiguous (every rush?) | REWRITE | “Run for a first down” or “Run of 10+ yards” |
| First Down | 1 | mild | common | E high | Y | Y | Y | KEEP | |
| Third Down Conversion | 2 | mild | common | E med | Y | Y | Y | KEEP | |
| Three-and-Out | 1 | mild | common | E med | Y | Y | Y | KEEP | |
| QB Scramble | 1 | mild | common | E med | Y | Y | Soft | KEEP | |
| QB Slides | 1 | mild | common | E med | Y | Y | Y | KEEP | |
| QB Throws It Away | 1 | mild | common | E med | Y | Y | Y | KEEP | |
| Punt | 1 | mild | common | E med | Y | Y | Y | KEEP | |
| Touchback | 1 | mild | common | E med | Y | Y | Y | KEEP | |
| Fair Catch | 1 | mild | common | E med | Y | Y | Y | KEEP | |
| False Start | 1 | mild | common | V ~2.5/g | Y | Y | Y | KEEP | |
| Offside | 1 | mild | common | V ~0.6/g | Y | Y | Y | KEEP | |
| Holding (Any Team) | 1 | mild | common | V ~2.4/g | Y | Y | Y | KEEP | |
| Delay of Game | 1 | mild | common | V ~0.6/g | Y | Y | Y | KEEP | |
| Pass Interference | 3 | mod | common | V ~1.1 DPI/g | Y | Y | Y | KEEP | |
| Personal Foul | 4 | mod | common | V ~0.4 UR/g | Y | Y | Soft | KEEP | |
| Sack | 3 | mod | common | E ~2–3/g | Y | Y | Y | KEEP | |
| Big Run (20+ yards) | 3 | mod | common | E low | Y | Y | Y | KEEP | |
| Big Pass (25+ yards) | 3 | mod | common | E low | Y | Y | Y | KEEP | |
| Red Zone Trip | 3 | mod | common | E med | Y | Y | Y | KEEP | |
| Goal Line Stand | 5 | mod | rare | E low | Y | Y | Ambiguous | REWRITE | Define “4th down stop inside 5” |
| Field Goal Made | 3 | mod | common | E ~2/g | Y | Y | Y | KEEP | |
| Missed Field Goal | 2 | mild | common | E | Y | Y | Y | KEEP | |
| Extra Point Missed | 2 | mild | common | E low | Y | Y | Y | KEEP | |
| Two-Point Attempt | 4 | mod | common | E low | Y | Y | Y | KEEP | |
| Fumble | 4 | mod | common | E ~1/g | Y | Y | Lost vs any fumble? | REWRITE | “Fumble lost” |
| Interception | 6 | mod | rare | E ~0.8/g | Y | Y | Y | KEEP | Pts a bit high vs TD=7 |
| Turnover on Downs | 3 | mod | common | E | Y | Y | Y | KEEP | |
| Timeout Called | 1 | mild | common | E high | Y | Y | Y | KEEP | |
| Coach Challenge | 1 | mild | common | E | Y | Y | Overlaps Replay | MERGE | Into Replay / Challenge |
| Replay Review | 1 | mild | common | E | Y | Y | Y | KEEP | |
| Two-Minute Warning | 2 | mild | common | V 2/g | Y | Y | Y | KEEP | |
| Injury Timeout | 1 | mild | common | E | Y | Y | Y | KEEP | Sensitive; keep wording factual |
| Touchdown | 7 | sev | rare | V ~5/contest | Y | Y | Y | KEEP | |
| Pick-Six | 8 | sev | rare | E rare | Y | Y | Y | KEEP | |
| Kickoff Return TD | 8 | sev | rare | E rare | Y | Y | Y | KEEP | |
| Fumble Return TD | 8 | sev | rare | E rare | Y | Y | Y | KEEP | |
| Safety | 8 | sev | rare | E very rare | Y | Y | Y | KEEP | |
| Overtime | 7 | sev | rare | E ~20% games | Y | Y | Y | KEEP | |
| Game-Winning Touchdown | 9 | sev | rare | E | Y | Y | Ambiguous | REWRITE | “Go-ahead score in last 2:00” |
| Game-Winning Field Goal | 9 | sev | rare | E | Y | Y | Same | REWRITE | Same clock rule |
| Hail Mary Attempt | 5 | mod | rare | E rare | Y | Y | Soft | KEEP | |
| Successful Hail Mary | 9 | sev | rare | E very rare | Y | Y | Y | KEEP | |
| 4th Down Attempt | 2 | mild | common | E | Y | Y | Y | KEEP | |
| 4th Down Converted | 3 | mod | common | E | Y | Y | Y | KEEP | |
| Dropped Pass | 1 | mild | common | E | Y | Y | Soft | KEEP | |
| Pass Deflected | 1 | mild | common | E | Y | Y | Soft | KEEP | |
| QB Under Pressure | 1 | mild | common | E high | Y | Y | Ambiguous | REMOVE or REWRITE | Too subjective |
| Roughing the Passer | 4 | mod | common | E | Y | Y | Y | KEEP | |
| Punt Return (No TD) | 1 | mild | common | E | Y | Y | Y | KEEP | |
| Kick Return (No TD) | 1 | mild | common | E | Y | Y | Y | KEEP | |
| Onside Kick | 5 | mod | rare | E rare | Y | Y | Y | KEEP | |
| Extra Point Made | 1 | mild | common | E high | Y | Y | Y | KEEP | Very frequent; 1pt OK |
| Spike or Kneel Down | 1 | mild | common | E | Y | Y | Y | KEEP | |
| Two-Minute Drill | 2 | mild | common | E | Y | Partial | Ambiguous | REMOVE | Overlaps Two-Minute Warning |
| Halftime | 2 | mild | rare | V 1/g | Y | Y | Y | KEEP | |
| Challenge Stands | 1 | mild | common | E | Y | Y | Y | MERGE | With Challenge Overturned as one Challenge card |
| Challenge Overturned | 3 | mod | common | E | Y | Y | Y | MERGE | |
| Announcer / graphic / camera / shoes / commercials (44 hf + extras) | 1–3 | mild/mod | hf | B | Mixed | Y | Often subjective | **REMOVE from launch core**; optional Broadcast Pack | Hands fill with unplayable noise; “Player Wearing Gloves” is always true |

**ADD for launch:** Incomplete Pass (1pt, mild, common). Optional: Offensive Holding split is unnecessary if Holding (Any Team) stays.

### Proposed launch football deck (~40 cards)

**Gameplay core (keep / rewrite):** Complete Pass, **Incomplete Pass (ADD)**, First Down, Third Down Conversion, Three-and-Out, False Start, Holding, Offside, Delay of Game, Sack, Pass Interference, Personal Foul, Fumble lost, Interception, Punt, Touchback, Field Goal Made, Missed Field Goal, Extra Point Made, Extra Point Missed, Touchdown, Timeout, Replay/Challenge (one card), Two-Minute Warning, Red Zone, 4th Down Attempt, 4th Down Converted, Big Play 20+, Dropped Pass, QB Scramble, Fair Catch, Spike/Kneel, Roughing the Passer, Turnover on Downs.

**Rare spice (few):** Pick-Six, Safety, Kick Return TD, Onside Kick, Overtime, Hail Mary.

**Broadcast pack (optional, separate dealing bucket or off for launch):** Beer commercial, same commercial twice, announcer “momentum”, yellow flag on screen. Not shoes/gloves/visor.

**Scoring:** Keep 1 / 3 / 7-ish. Do not add combo math. Interception at 6 vs TD at 7 is OK-ish; consider INT=5 if TDs feel cheap.

**Dealing:** Keep smart draw. For launch, target mix ~70% common gameplay, ≤20% rare, **0–1 broadcast** unless Broadcast Pack is on. Cap severe cards as today.

---

## 7. Basketball card audit (Phase 4)

**103 cards** in `BASKETBALL_CARDS`. mild/mod/sev **84 / 13 / 6**; hf/common/rare **41 / 51 / 11**.

**VERIFIED NBA 2024–25 league per-game averages** ([Basketball-Reference](https://www.basketball-reference.com/leagues/NBA_stats_per_game.html)): 13.5 3PM / 37.6 3PA (**~24 missed threes/g**), 14.3 TOV, 18.6 PF, 8.2 STL, 4.9 BLK, 11.1 ORB, 33.0 DRB, 16.9 FTM / 21.7 FTA (**~4.8 missed FT/g**), 41.7 FGM / 89.2 FGA.

Dunks/flagrants/ejections: **ESTIMATE** (not in that per-game table).

### Basketball — every current card (compressed)

**KEEP (gameplay, fan-recognizable, TV-clear):** Made 3, Missed 3, Made FT, Missed FT, Made Layup, Defensive Rebound, Offensive Rebound, Turnover, Steal, Block, Personal Foul, Timeout, Dunk, And-One, Technical Foul, Traveling, Shot Clock Violation, Fast Break Score, Charge/Offensive Foul, End of Quarter, Halftime, Overtime, Game-Winning Shot, Buzzer Beater (end of quarter), Player Fouls Out, 10–0 Run, Poster Dunk, Missed Dunk, Goaltending, Intentional Foul, Jump Ball, Flagrant Foul, Alley-Oop.

**REWRITE:** Airball (keep but define “doesn’t hit rim”); 4-Point Play (rare but OK); Half-Court Shot Made (keep rare).

**MERGE:** Coach Challenge + Challenge Stands + Challenge Overturned → one Challenge card. Dunk + Poster Dunk maybe keep both (poster is a moment).

**REMOVE from launch core:** Double Dribble (rare/confusable), most announcer phrases, shoe/sleeve/headband/face-mask cards, commercial clones of football, kiss cam, t-shirt cannon, “player claps”, “points to teammate”, “camera shows player on bench”.

**ADD:** Made 2-pointer / Missed jumper (the most common bucket after threes). Currently the deck has 3s and layups but not a generic midrange/jumper.

### Proposed launch basketball deck (~36)

Made 3, Missed 3, Made 2 (ADD), Missed jumper (ADD), Layup, Dunk, Missed Dunk, Free throw made/missed, Defensive rebound, Offensive rebound, Steal, Block, Turnover, Personal foul, Shooting foul/And-one, Technical, Traveling, Shot clock, Fast break, Charge, Timeout, End of quarter, Halftime, 10–0 run, Alley-oop, Poster, Goaltending, Intentional foul, Fouls out, Buzzer-beater, Game-winner, Overtime, Flagrant, Ejection (one card, player or coach).

Optional broadcast pack: Defense chant, celebrity courtside, beer commercial.

---

## 8. Billing / Stripe (Phase 5)

### Intended vs implemented — VERIFIED

| Rule | Code |
|------|------|
| Game Night $2.99 / 24h | `lib/billing/plans.ts`, `GAME_NIGHT_DURATION_MS`, stacks via `nextGameNightExpiry` |
| Monthly $7.99 | catalog + `STRIPE_PRICE_MONTHLY`; webhook `subscription.*` |
| Lifetime $79.99 | `lifetimeAccess` boolean |
| Free max 4 private players | `FREE_MAX_PLAYERS` |
| 2 private hosted games / UTC day | `hosted-games.ts` (public chaos excluded) |
| Public hosting premium | `assertCanHostPublicGame` |
| Join Live spawn free | `public-drop-in` → `createPublicChaosLobbyRoom` no entitlement check |
| Join always free; 5th waits | `join-room-core.ts` 409 + `waiting` |
| Run It Back paywall on **Start next game** | `rematch/start` |
| Checkout rejects raw price IDs | `app/api/stripe/checkout/route.ts` |
| Webhook idempotency | `StripeWebhookEvent` + claim/release |
| Live keys blocked unless `STRIPE_ALLOW_LIVE_KEYS=true` | `lib/stripe/mode-guard.ts` |
| Customer portal | `POST /api/stripe/portal` → `/profile` |

### Gaps — VERIFIED / ASSUMPTION

- Portal **untested**.
- No `invoice.payment_failed`, `charge.refunded`, or lifetime revoke.
- `past_due` is **not** premium (`is-premium.ts` only `active`/`trialing`) — **ASSUMPTION:** acceptable.
- Display prices are strings; **actual Stripe Dashboard amounts not verified this session**.
- Game Night is one-time Checkout `payment`; Monthly is `subscription`. Correct.
- Contextual paywalls exist; they can feel abrupt but they are **host-only** — joiners are not charged. Matches product copy.

### Security

- Price ID injection: mitigated.
- Webhook signature required.
- Metadata `userId` trusted only inside signed Stripe events.
- **P0/P1:** Ably token endpoint (not Stripe, but production).

**Do not turn on live keys until privacy/terms exist and `STRIPE_ALLOW_LIVE_KEYS` is a conscious production-only flag.**

---

## 9. Playwright and load tests (Phase 6)

### What exists on disk — VERIFIED

- `playwright.config.ts`: port **3100**, screenshots/video on failure, trace on first retry, setup → e2e, Stripe project gated by `RUN_STRIPE_E2E`
- 14 default tests listed previously (`npx playwright test --list`)
- 4 Stripe tests gated
- Helpers: personas, storageState, multi-context `createMultiUserGame`, waits, DB seed
- Safety: `lib/e2e/safety.ts`, HTTP 404 guard, Artillery production-host refuse
- CI workflow `.github/workflows/e2e.yml` only if `vars.RUN_E2E == true` or dispatch
- Default CI **does not** run Playwright

### What does **not** work in this checkout — VERIFIED

| Check | Result |
|-------|--------|
| Auth storageState files | Only `tests/e2e/.auth/.gitkeep` |
| `playwright-report` | `index.html` present (likely from `--list`, not a full green run) |
| `test-results/` | empty |
| Playwright in default CI | no |
| `.env.e2e` `DATABASE_URL_E2E` | Neon host `ep-floral-wave-…`, path **`/neondb`**, **does not contain `e2e`** |
| `E2E_ALLOW_DB` | **not set** → `e2e:db:reset` will **refuse** |
| `PRODUCTION_DATABASE_URL` vs E2E | set and **not equal** (good) |
| Playwright `dotenv.config()` | loads **`.env`**, not `.env.e2e` |
| `.env.e2e` missing | `NEXT_PUBLIC_ABLY_API_KEY`, `NEXT_PUBLIC_APP_URL` |
| Browser E2E this session | **not run** (DB not proven disposable; name is `neondb`) |

**RECOMMENDATION:** Confirm the `floral-wave` Neon branch is a throwaway, rename DB/branch to include `e2e` **or** set `E2E_ALLOW_DB=true` only after you confirm it is not prod. Then generate storageState. Do not point reset at the everyday `neondb` on the main branch.

### Tests to add after simplification (design only)

| ID | Scenario | Tool | Pass/fail |
|----|----------|------|-----------|
| 1 | 6 players same room | Playwright 6 contexts | All see count=6; no session leak |
| 2 | Simultaneous submits | Playwright 3 | All pending; no 500s |
| 3 | Simultaneous votes | Playwright | First-to-threshold wins; no double score |
| 4 | Threshold boundaries | Playwright + unit | 3p→1 vote; 4p→2; 5p→3; 6p→3 |
| 5 | Auto-accept | Playwright with `AUTO_ACCEPT_SECONDS_E2E=3` | Resolves without votes |
| 6 | Refresh after 5 min | Playwright with test timer **or** seeded timestamp | New hand; old drawn gone |
| 7 | Refresh cooldown | Playwright | Second refresh 403/disabled |
| 8 | Refresh isolation | Playwright | Other players’ hands unchanged |
| 9 | Refresh vs pending | Playwright | Blocked while pending |
| 10 | Disconnect during vote | Playwright close context | Vote still resolvable |
| 11 | Reconnect | Playwright new context same storage | Snapshot matches scores |
| 12 | Host disconnect | Playwright | Game continues; host can return |
| 13 | Public chaos burst | Artillery `/api/e2e/load/drop-in` | error rate <5%; p95 <2s; created rooms << VUs |
| 14 | Two games concurrent | Playwright | No cross-talk of room codes |
| 15 | End + Run It Back | Playwright | Ready count live; new lobby |
| 16 | Paywall recovery | Playwright | After seed premium, waiter joins |
| 17 | Stripe webhook | Existing Jest + optional `test:e2e:stripe` | Entitlement columns change |
| 18 | Mobile viewport | Playwright `Pixel 5` project | Create/join/hand/vote usable |

**Realistic Playwright concurrency:** 3–4 Chromium contexts per spec on a laptop; **max 6** for the six-player test. Not 20 browsers. Use Artillery for 20–100 VUs.

**Measurable backend SLOs (Artillery on E2E only):** error rate < 2% (P1) / < 5% (P2); p95 join < 2s; p99 snapshot < 1.5s; duplicate empty public rooms: created/VU < 0.2 in burst.

---

## 10. Production web readiness (Phase 7)

| Area | Status | Notes |
|------|--------|-------|
| Hosting | **ASSUMPTION: Vercel** | No `vercel.json`; Next build in CI |
| Domains | Documented | `lib/host.ts`, `ROUTING_AND_DOMAINS.md` — DNS not verified here |
| Env | Names known | Production Clerk/Stripe/Ably/QStash must be **live** counterparts |
| DB | Neon (current) | Need dedicated **prod** vs E2E vs dev |
| Migrations | Manual | CI does **not** migrate; `DIRECT_DATABASE_URL` required |
| Clerk prod | Not in repo | Need production instance, `app.foulplay.io` origins |
| Stripe live | Guarded off | Set live keys + `STRIPE_ALLOW_LIVE_KEYS=true` **only on prod** |
| Stripe webhook | Test secret in local env | Need live endpoint `https://app.foulplay.io/api/stripe/webhook` |
| Ably | Token route exists | Must set `NEXT_PUBLIC_ABLY_USE_TOKEN=true` and **auth the token route** |
| QStash | Required for 30s auto-accept in prod | Prod `APP_URL` must be public; E2E setTimeout **will not run** (`APP_ENV` not test) |
| CORS | N/A for same-origin web | Mobile later |
| Rate limit | **Missing** | P1 on checkout, rooms, ably token |
| Monitoring | **Missing Sentry** | P1 |
| Analytics | DB + optional webhook | OK |
| Privacy / Terms | **Missing** | **P0** |
| Age 21+ | Implemented | Modal + `is21Plus`; drinking modes gated |
| A11y | Partial | Some dialogs; no audit |
| Responsive | CSS present | No mobile E2E |
| SEO / OG | `app/layout.tsx` | Fine |
| PWA | **Missing** | Fallback for “mobile app” |
| Rollback | Vercel dashboard | Undocumented |
| Build | CI runs `next build` | Dummy Clerk keys in CI |

**Launch blockers vs later:** blockers = legal pages, prod env, migrate story, live Stripe webhook, QStash to prod URL, Ably token auth, confirm `proxy.ts` on Vercel, don’t deploy `APP_ENV=test`. Later = Sentry, rate limits, PWA, a11y pass.

---

## 11. Mobile readiness (Phase 8)

**VERIFIED:** Expo app exists at `apps/mobile`. Version 0.1.0. Screens: sign-in/up, home, create, join, lobby. **Gameplay is a placeholder** (`app/room/[code]/game.tsx` says Phase 2, use the web). No Stripe, no push (`expo-notifications` absent), no EAS config, no icons (assets `.gitkeep`), scheme `foulplay` only. Create-room imports missing `lib/game/modes`. Ably uses public API key.

| Question | Rating |
|----------|--------|
| Production distribution | **D — Not ready** |
| TestFlight/internal | **D** until it compiles and has icons |
| Store submission | **D** |
| Wednesday guarantee | **Impossible to claim** |

**Fallback:** responsive web (already) + optional PWA. Deep links on web: `/join?code=`.

IAP/App Store billing is a **separate** policy problem if native ever sells Game Night; web Stripe in a WKWebView is often rejected. Do not start native payments this week.

---

## 12. Prioritized backlog (Phase 9)

### P0 — blocks safe launch

| ID | Issue | Evidence | Impact | Fix | Effort | Tests | Regression risk |
|----|-------|----------|--------|-----|--------|-------|-----------------|
| P0-1 | No privacy/terms | No routes | Legal / Stripe / ads | Add `/privacy` `/terms`, footer links | 0.5–1d (lawyer copy) | Smoke | Low |
| P0-2 | Uncommitted + unpushed main | git status | Prod drift / lost E2E | Commit/push **after** you accept scope; don’t ship `APP_ENV=test` | 1h | CI | Low |
| P0-3 | Prod env + migrate not in CI | `ci.yml`, no vercel.json | Schema drift, down site | Document + run `prisma migrate deploy` on prod DIRECT URL | 2–4h | Staging migrate | Med |
| P0-4 | Live Stripe + webhook | mode-guard, local test keys | No revenue / missed grants | Dashboard products, live webhook, `STRIPE_ALLOW_LIVE_KEYS` only on prod | 2–4h | `test:e2e:stripe` on test mode first | Med |
| P0-5 | QStash + public APP_URL | submit enqueue | Auto-accept dead in prod | Prod QStash topic to `https://app.foulplay.io/api/qstash/auto-accept` | 1–2h | One live submit | Med |
| P0-6 | Ably token unauthenticated | `app/api/ably/token/route.ts` | Abuse / bill shock | Require Clerk session | 1–2h | Unit | Low |
| P0-7 | Invite preview 401 | `proxy.ts` matcher | Broken invite copy | Exclude `/api/rooms/invite-preview` | 15m | Integration | Low |
| P0-8 | Confirm proxy on Vercel | Next 16 `proxy.ts` | Auth/domain redirects off | Hit marketing vs app hosts | 1h | Manual | High if wrong |
| P0-9 | Age/alcohol disclosure | Age gate only | Compliance | Terms + 21+ copy on drinking modes | with P0-1 | Manual | Low |

### P1 — essential gameplay / revenue

| ID | Issue | Fix | Effort |
|----|-------|-----|--------|
| P1-1 | Decide rounds: hide vs delete | Hide toggle for launch | 1–3h hide / 1–2d delete |
| P1-2 | 5-minute refresh | New API + UI + timer | 0.5–1d |
| P1-3 | Launch decks (trim 220 → ~40+36) | Edit `cards.ts` + seed | 0.5–1d |
| P1-4 | Incomplete Pass / Made 2 missing | Add cards | 1h |
| P1-5 | E2E DB isolation | Rename Neon branch; load `.env.e2e` in Playwright | 2–4h |
| P1-6 | Playwright green on A/B/G/K/F | After Clerk users | 0.5–1d |
| P1-7 | Rate limit checkout/rooms/token | Simple IP/user limiter | 0.5d |
| P1-8 | Sentry | Next SDK | 2–4h |
| P1-9 | Host disconnect / no host transfer | Document for v1; optional later | — |
| P1-10 | Instructions too long | One-screen copy | 2h |

### P2 — after launch

Delete round APIs, combo UI trim, modes collapse, portal tests, `past_due` handling, PWA, a11y pass, Artillery nightly, soccer/baseball.

### P3 — nice-to-have

Native app Phase 2, push, Broadcast Pack, card reorder polish, party-chain flavor.

---

## 13. Open decisions (need your approval)

1. **Rounds:** Hide for Wednesday vs fully delete this week? **Recommendation: hide.**
2. **Refresh-hand:** Ship Wednesday vs post-launch? **Recommendation: post-launch unless P0s finish Monday.**
3. **Card trim:** Apply launch decks this week vs ship 220 as-is? **Recommendation: trim commercials/fashion; add Incomplete Pass + Made 2.**
4. **Modes:** Keep all five vs Non-drinking + Party only?
5. **Mobile:** Web-only Wednesday (recommended) vs any TestFlight attempt (not recommended).
6. **Stripe live Wednesday** vs test-mode production (bad)? Must be live for real money; test mode on prod domain confuses users.
7. **Legal copy:** Who writes privacy/terms (you vs counsel)?
8. **E2E Neon `floral-wave` / `neondb`:** Confirm disposable before any reset.
9. **Commit uncommitted E2E harness** to `main`?
10. **Public Chaos in v1** or private rooms only to reduce matchmaking risk?

---

## 14. Test results this session — VERIFIED

```
typecheck: pass
lint: 1 warning (unused userId in public-chaos-matchmaking.ts)
jest: 37 passed, 308 tests passed
playwright: not executed (DB safety)
```

**Do not treat prior agent reports as proof that Playwright, Stripe live, or mobile gameplay work.**
