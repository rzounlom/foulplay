# FoulPlay — React Native Mobile App Plan

This document plans the native mobile app for FoulPlay using **React Native**, reusing the existing backend APIs, Clerk auth, and Ably realtime.

---

## 1. Goals & Principles

- **Single backend:** The existing Next.js app and its API routes remain the source of truth. No separate mobile API; the app calls the same REST endpoints.
- **Shared auth & realtime:** Use Clerk for authentication and Ably for realtime (room events, chat, reactions) with the same backend and event contracts.
- **Feature parity (over time):** Target full parity with the web app: rooms, lobby, gameplay (draw, submit, vote), host controls, chat, reactions, profile, quarter clearing, non-drinking mode.
- **Native UX:** React Native for iOS and Android with native navigation, gestures, and platform conventions (e.g. safe areas, back behavior, share sheet for room link).

---

## 2. Current Backend Recap

### 2.1 API Surface (all require authenticated user)

| Area | Methods | Purpose |
|------|---------|---------|
| **Rooms** | `POST /api/rooms` | Create room |
| | `GET /api/rooms/[code]` | Get room (lobby or game state) |
| | `PATCH /api/rooms/[code]` | Update room (host: mode, sport, handSize, showPoints, allowJoinInProgress, allowQuarterClearing) |
| | `POST /api/rooms/join` | Join room (body: code, nickname?) |
| **User** | `GET /api/user/profile` | Get profile (stats, defaultNickname, skipTour) |
| | `PATCH /api/user/profile` | Update profile |
| | `GET /api/user/active-games` | List user’s active rooms |
| **Game** | `POST /api/game/start` | Start game (host) |
| | `GET /api/game/hand` | Get current hand |
| | `GET /api/game/submissions` | Get pending submissions |
| | `POST /api/game/draw` | Draw card |
| | `POST /api/game/submit` | Submit card(s) |
| | `POST /api/game/vote` | Vote on submission |
| | `POST /api/game/end` | End game (host) |
| | `POST /api/game/reset-points` | Reset points (host) |
| | `POST /api/game/reset-round`, `PATCH /api/game/turn-in-control` | Round / turn-in (host) |
| | `POST /api/game/end-quarter`, `POST /api/game/advance-quarter`, `POST /api/game/finalize-quarter` | Quarter flow (host) |
| | `POST /api/game/quarter-discard-selection` | Player quarter discard selection |
| | `POST /api/game/discard` | Discard cards (with penalty) |
| **Chat** | `GET /api/chat/messages` | List messages |
| | `POST /api/chat/message` | Send message |
| | `POST /api/chat/reaction` | Send reaction |

All of these are called with **same-origin cookies** today (web). For mobile we need **token-based auth** (see §3.2).

### 2.2 Realtime (Ably)

- **Channel:** `room:{roomCode}`.
- **Events:** e.g. `player_joined`, `game_started`, `game_ended`, `card_drawn`, `card_submitted`, `vote_cast`, `submission_approved`, `submission_rejected`, `turn_changed`, `room_settings_updated`, `points_reset`, `message_sent`, `reaction_sent`, quarter/round events, etc.
- **Publishing:** API routes publish after state changes (e.g. after vote, draw, start game). The app only **subscribes** to these events and refetches or updates UI; it does not publish from the client (except possibly for presence if we add it later).

So the mobile app will:

- Subscribe to `room:{roomCode}` and handle the same event set.
- Call REST APIs for all mutations; no direct Ably publish from the client (matches web).

### 2.3 Auth (current)

- **Web:** Clerk (`@clerk/nextjs/server`). `getCurrentUser()` uses Clerk’s `auth()` (cookie-based). No Bearer token in requests.
- **Mobile (required change):** Send Clerk **session token** in `Authorization: Bearer <token>` so the backend can authenticate the user.

---

## 3. Backend Changes Required for Mobile

### 3.1 Accept Bearer token in API routes

- **Option A (recommended):** Add a shared helper used by all API routes, e.g. `getCurrentUserFromRequest(request: NextRequest)`, which:
  1. Tries Clerk’s cookie-based auth first (for web).
  2. If no cookie auth, reads `Authorization: Bearer <token>`, verifies the JWT with Clerk’s public key / `authenticateRequest()` (or manual verification), extracts `sub` (Clerk user id), then finds or creates the user in the DB (same logic as current `getCurrentUser()`).
- **Option B:** Separate middleware for “mobile” routes that only accept Bearer. Less flexible (two code paths).

**Recommendation:** Option A so one codebase supports both web (cookie) and mobile (Bearer). Replace `getCurrentUser()` in API routes with `getCurrentUserFromRequest(request)` (or keep `getCurrentUser()` and have it accept an optional request and use Bearer when present).

### 3.2 CORS (if API is on a different origin)

- If the mobile app calls the same Next.js origin (e.g. `https://foulplay.example.com`), CORS is irrelevant for the app (React Native is not a browser). If you later expose a dedicated API domain, allow the app’s origin if needed.
- For **Expo / development**, you may call `http://localhost:3000` or a tunnel URL; ensure the backend allows that if you do server-side CORS checks.

### 3.3 Ably from mobile

- **Auth:** Ably can use **token auth** (backend issues short-lived tokens per room or per user) or **API key** in the client.
- **Current web:** Uses `NEXT_PUBLIC_ABLY_API_KEY` in the client (public key). Same can be used in the React Native app for subscribe-only usage; restrict key permissions in Ably dashboard if possible (e.g. subscribe only, no delete channel).
- **Alternative:** Backend endpoint that returns an Ably token for the current user/room; app uses that for stricter security. For MVP, reusing the public key in the app (with restricted permissions) is acceptable.

---

## 4. React Native Stack

| Concern | Choice | Notes |
|--------|--------|--------|
| **Framework** | React Native (Expo recommended) | Expo simplifies build, OTA, and native modules; can eject to bare if needed. |
| **Auth** | Clerk React Native SDK | Sign in/up, session, `getToken()` for API calls. |
| **Realtime** | Ably React Native (`ably`) | Same channel/event model as web. |
| **Navigation** | React Navigation | Stack + bottom tabs or drawer; deep links for `/join?code=XXX`. |
| **API client** | fetch + auth hook | Base URL from env; inject `Authorization: Bearer <sessionToken>` (from Clerk). |
| **State** | React Query (TanStack Query) + Ably | Server state via React Query (rooms, hand, submissions, profile); realtime via Ably subscription and cache invalidation or local state. |
| **Styling** | NativeWind (Tailwind for RN) or StyleSheet | Keeps styling close to web if using Tailwind. |
| **Forms / UI** | Custom components or library (e.g. React Native Paper, Tamagui) | Buttons, inputs, modals, lists. |

### 4.1 Project structure (single repo — adopted)

**Decision: single repo (monorepo).** The mobile app lives in **`apps/mobile`** in this repo. The web app stays at **repo root** (no move to `apps/web` unless you choose to later).

- **Web:** Root of repo (Next.js); deploys via Vercel as today.
- **Mobile:** `apps/mobile` (Expo / React Native); build and deploy via EAS; submit to App Store / Play Store from there.
- **Shared types (later):** When you need them, add e.g. `packages/types` and have both web and mobile import from it, or keep types in sync via copy and `dev-docs`.

---

## 5. App Architecture (High Level)

### 5.1 Screens / flows

- **Unauthenticated:** Sign-in, Sign-up (Clerk screens or custom).
- **Tabs or stack:** Home → Create Room | Join Room | Active Games | Profile.
- **Home:** Same as web: Create Room + Join Room CTAs.
- **Create Room:** Mode, Sport, Hand size, Quarter clearing (Football/Basketball); submit → create room API → navigate to Room (Lobby).
- **Join Room:** Code input (and optional nickname); join API → navigate to Room (Lobby or Game if join-in-progress).
- **Active Games:** List from `GET /api/user/active-games`; tap → Room.
- **Profile:** Stats, default nickname, skip tour; PATCH profile.
- **Room (Lobby):** Room code, copy link, player list, game settings (host only), Start Game. Subscribe to `room:{code}` for `player_joined`, `room_settings_updated`, `game_started`.
- **Room (Game):** Game board: hand, pending submissions, pending discard (if intermission), host controls (in a sheet or dedicated area), chat, reactions. Subscribe to all game events; refetch hand/submissions/room when relevant events fire.
- **End-game:** After `game_ended`, navigate to End-game screen (winner, leaderboard); from there, back to room or home.

### 5.2 API client

- Base URL: `process.env.EXPO_PUBLIC_API_URL` or `API_URL` (e.g. `https://foulplay.example.com`).
- Every request: attach `Authorization: Bearer ${await clerk.getToken()}` (or equivalent from Clerk React Native).
- On 401: clear session and redirect to sign-in.
- Use React Query for GETs (rooms, hand, submissions, profile, active-games) and mutations (create room, join, start, draw, submit, vote, etc.) with invalidation after success and after relevant Ably events.

### 5.3 Realtime (Ably)

- When user is on a room screen (lobby or game), subscribe to `room:{roomCode}`.
- On event: update local state and/or invalidate React Query keys so data refetches (e.g. `player_joined` → invalidate room; `vote_cast` / `submission_approved` → invalidate submissions and hand; `game_started` → invalidate room and navigate to game UI; `game_ended` → navigate to end-game).
- Unsubscribe on leave room screen.

---

## 6. Phased Implementation

### Phase 1 — Foundation (MVP)

- **Backend:** Implement `getCurrentUserFromRequest(request)` (or equivalent) supporting Bearer token; use it in all API routes. No change to API contracts.
- **Mobile:** Expo app, Clerk React Native (sign-in, sign-up, sign-out, get token). API client with base URL and Bearer token. React Navigation (auth stack + main stack).
- **Screens:** Home, Sign-in, Sign-up, Create Room, Join Room, Lobby (read-only: code, players, settings; host: start game). No game board yet.
- **Realtime:** Subscribe to `room:{code}` in Lobby; on `game_started` show a “Game started — open in web for now” or a minimal placeholder game screen.
- **Deliverable:** User can create/join room and start game from the app; game continues on web or placeholder in app.

### Phase 2 — Gameplay core

- **Screens:** Game board (hand, pending submissions, draw, submit, vote). Host: end game, reset points (in a host sheet/modal).
- **Realtime:** Handle `card_drawn`, `card_submitted`, `vote_cast`, `submission_approved`, `submission_rejected`, `turn_changed`, `game_ended`, `points_reset`.
- **Deliverable:** Full play loop: draw → submit → vote → approval/rejection; host can end game and reset points.

### Phase 3 — Chat, reactions, profile

- **Screens:** In-game chat (list + send), reaction bar. Profile tab: stats, default nickname, skip tour.
- **Realtime:** `message_sent`, `reaction_sent`.
- **APIs:** Chat messages, send message, send reaction; profile GET/PATCH; active-games.
- **Deliverable:** Chat and reactions in room; profile and active games list working.

### Phase 4 — Host controls & polish

- **Screens:** All host controls (show points, allow join in progress, end round, reset round, turn-in control, finalize quarter). Quarter discard flow (select cards, submit selection).
- **Realtime:** All remaining events (quarter/round, turn-in, etc.).
- **Deliverable:** Feature parity with web for host and quarter clearing.

### Phase 5 — Native polish & release

- Deep links: `foulplay://join?code=XXX` (and optional universal links).
- Share sheet: share room URL.
- Notifications (optional): e.g. “Your turn” or “New message” via Expo Notifications or provider.
- App icons, splash, store listings, TestFlight / internal testing, then App Store / Play Store.

---

## 7. Shared Types & Contracts

- **Recommendation:** Define (or generate) types for: Room, Player, GameState, Card, Submission, Vote, Hand, ChatMessage, Reaction, Ably event names and payloads. Use them in:
  - Next.js API route responses and Ably publish payloads.
  - React Native app (import from `packages/types` or shared package).
- **Ably event payloads:** Keep the same as web so both clients can subscribe and understand events. Document in a small “Events” section in this doc or in the backend (e.g. `lib/ably/events.ts`).

---

## 8. Environment & Config

- **Web (existing):** `NEXT_PUBLIC_*` for Clerk, Ably (if used in client). Backend uses `CLERK_SECRET_KEY`, `ABLY_API_KEY`, `DATABASE_URL`.
- **Mobile:**  
  - `EXPO_PUBLIC_API_URL` (or `API_URL`) = Next.js app URL.  
  - Clerk: same Clerk app; use React Native env vars for Clerk publishable key (and secret only if needed for token customization).  
  - Ably: same key as web client or token endpoint; e.g. `EXPO_PUBLIC_ABLY_API_KEY`.

---

## 9. Deployments (one repo)

With everything in a single repo, each surface has its own deploy path. They don’t conflict.

### 9.1 Web (Vercel)

- **What:** Your Next.js app (the site + API routes).
- **How:** Connect the repo to Vercel. If the app stays at **repo root**, Vercel auto-detects Next.js and deploys as today. If you move it to **e.g. `apps/web`** (monorepo), in Vercel set **Root Directory** to `apps/web` (or the folder that contains `package.json` and `next.config`).
- **Triggers:** Push to `main` (or your production branch) → production deploy; push to other branches → preview deploys. Only the web app is built; the mobile folder is ignored by Vercel.
- **Env:** Set env vars (Clerk, Ably, DB, etc.) in the Vercel project; they apply only to the web/API deploy.

### 9.2 Mobile (Expo / EAS)

- **What:** The React Native (Expo) app.
- **How:** Use **EAS (Expo Application Services)** for builds and updates. In the repo you have a folder for the app (e.g. `apps/mobile`). In that folder you run `eas build` and `eas update` (or hook them up to CI).
- **EAS Build:** Runs in the cloud (or on your machine). It only builds the mobile app; it doesn’t need or build the Next.js app. You point EAS at the app directory via `eas.json` and `app.json` (e.g. `"projectRoot": "."` when you’re inside `apps/mobile`). Produces **.ipa** (iOS) and **.aab** / **.apk** (Android).
- **EAS Update (OTA):** Pushes JS/assets updates to already-installed apps without a new store build. You run `eas update` from the app directory; only the mobile app bundle is uploaded. Good for small fixes and non-native changes.
- **Triggers:** You can run EAS manually, or from **GitHub Actions** in the same repo (e.g. on push to `main` or a `mobile` branch, `cd apps/mobile && eas build`). EAS only cares about the mobile app’s files.

### 9.3 App stores (iOS & Android)

- **What:** Getting the app onto the App Store and Google Play.
- **How:** You **don’t deploy to the stores from Vercel**. Flow is: **code in repo → EAS Build (or local build) → native binary → submit to store**.
  - **iOS:** EAS Build produces an `.ipa`. Use **EAS Submit** (`eas submit`) to send it to App Store Connect, or upload the `.ipa` manually in App Store Connect. Then in App Store Connect you submit for review and release.
  - **Android:** EAS Build produces an `.aab` (or `.apk`). Use EAS Submit to send it to Google Play Console, or upload manually. Then in Play Console you promote to production (or testing tracks).
- **Same repo:** Store submissions are triggered by **you** (or CI) running EAS Build + EAS Submit from the mobile app directory. The repo layout doesn’t change this; the stores only receive the built binary, not the repo.

### 9.4 Summary

| Surface        | Tool       | What gets built/deployed        | Trigger (typical)                |
|----------------|------------|----------------------------------|----------------------------------|
| Web + API      | Vercel     | Next.js app at root or `apps/web` | Push to `main` (or branch)       |
| Mobile binary  | EAS Build  | Only the Expo app (e.g. `apps/mobile`) | You or CI: `eas build`           |
| Mobile OTA     | EAS Update | Only JS/assets for the app      | You or CI: `eas update`          |
| App Store      | EAS Submit / App Store Connect | .ipa from EAS Build            | After build: `eas submit` or manual |
| Google Play    | EAS Submit / Play Console       | .aab from EAS Build            | After build: `eas submit` or manual |

So: **one repo, three independent flows** — Vercel for web, EAS for mobile builds/OTA, and store consoles (or EAS Submit) for store releases. They don’t step on each other.

---

## 10. Testing & CI

- **Unit / integration:** Jest (or Vitest) for API client, auth helper, and Ably subscription logic (mock Ably).
- **E2E:** Detox or Maestro for critical flows (sign-in → create room → start game → submit → vote).
- **CI:** Build iOS/Android in CI (e.g. EAS Build on Expo); run tests and lint.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Backend and mobile drift (API or events) | Shared types; single API surface; document events. |
| Clerk token expiry mid-session | Use short-lived token and refresh (Clerk React Native handles refresh); retry 401 with new token once. |
| Ably connection drops on mobile (background/network) | Handle disconnect/reconnect; show connection status; re-subscribe and refetch on reconnect. |
| Large payloads (e.g. full game state) | Prefer “events + refetch” over sending full state in every event. |

---

## 12. Success Criteria

- Users can sign in/up, create and join rooms, start a game, draw/submit/vote, and have host controls from the mobile app using the **existing** backend and Ably.
- One codebase (Next.js) serves both web and mobile for API and realtime contracts; only auth transport (cookie vs Bearer) differs.
- App is shippable to TestFlight and Google Play (internal or public) with the same feature set as web (phased as above).

---

## 13. Next Steps

1. **Backend:** Implement Bearer token support in `getCurrentUserFromRequest(request)` and switch API routes to use it (keep cookie path for web).
2. **Mobile app scaffold:** The Expo app is in **`apps/mobile`**. Next: add Clerk, API client (Bearer token), and Ably (see Phase 1 in §6).
3. **Phase 1:** Implement auth, home, create/join, lobby, and Ably subscription in app; validate with backend.
4. **Phases 2–5:** Follow the phased plan above; adjust order if business priorities change.

---

*Document version: 1.0. Last updated: 2025-02-07.*
