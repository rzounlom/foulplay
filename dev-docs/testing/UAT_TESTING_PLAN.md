# FoulPlay — Comprehensive UAT Testing Plan

This document defines the User Acceptance Testing (UAT) plan for FoulPlay. Use it to validate the product end-to-end before release. QA and stakeholders can run through the scenarios and sign off on each area.

---

## 1. Scope & Objectives

**In scope**

- Authentication (sign-in, sign-up, redirects)
- Room lifecycle (create, join, lobby, settings)
- Gameplay (start game, draw, submit, vote, turn flow)
- Host controls (end game, reset points)
- In-game chat and reactions
- User profile (view, edit, default nickname, skip-tour preference)
- Theme (light / dark mode)
- Mode-based card distribution (Casual, Party, Lit, Non-drinking)
- Real-time sync (Ably) for all relevant events
- Responsive layout and accessibility basics

**Out of scope (for this UAT)**

- Quarter-based card clearing (if not enabled in build)
- Third-party provider uptime (Clerk, Ably) — assume they work
- Load/performance testing (separate plan)
- Security penetration testing (separate plan)

**Environment**

- Use a **staging or production-like** environment (same env vars as prod, real Clerk/Ably/DB or staging equivalents).
- Two or more test accounts (different browsers or incognito) for multi-player flows.
- Supported browsers: Chrome, Safari, Firefox (latest), and one mobile browser.

**Roles**

- **Tester:** Executes steps, records pass/fail and notes.
- **Observer (optional):** Watches session, raises edge cases.
- **Sign-off:** Product or QA lead confirms each section before release.

---

## 2. Test Scenarios

### 2.1 Authentication

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| AUTH-1 | Unauthenticated access to protected page | 1. Sign out if needed.<br>2. Open `/create` or `/join` or `/game/XXXXXX`. | Redirect to sign-in; after sign-in, redirect back to intended page. | | |
| AUTH-2 | Sign up new user | 1. Go to sign-up.<br>2. Complete Clerk sign-up. | Account created; user can access app. | | |
| AUTH-3 | Sign in existing user | 1. Go to sign-in.<br>2. Sign in with existing account. | User lands on home or previously intended page. | | |
| AUTH-4 | Sign out | 1. Be signed in.<br>2. Use nav/user menu to sign out. | Signed out; protected routes redirect to sign-in. | | |

---

### 2.2 Rooms & Lobby

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| ROOM-1 | Create room | 1. Go to Create Room.<br>2. Select Mode (e.g. Party), Sport (Football or Basketball), hand size.<br>3. Submit. | Room created; redirect to `/game/[CODE]`; user is host; lobby shows. | | |
| ROOM-2 | Create room — validation | 1. Try creating without mode or sport. | Create disabled or error until both selected. | | |
| ROOM-3 | Join room by code | 1. Second user goes to Join Room.<br>2. Enter 6-character code (or use URL with `?code=`).<br>3. Join. | Second user added; redirect to game lobby; both players visible. | | |
| ROOM-4 | Join — invalid code | 1. Enter wrong or short code. | Clear error (404 or validation). | | |
| ROOM-5 | Lobby — host sees controls | 1. As host, view lobby. | Can change Mode/Sport (if supported); Start Game visible; Copy room URL works. | | |
| ROOM-6 | Lobby — non-host view | 1. As non-host, view lobby. | Sees player list and current mode/sport; no edit/start (or read-only). | | |
| ROOM-7 | Lobby — Start disabled until 2+ players | 1. Create room (only host). | Start Game disabled or message “Need 2+ players”. | | |
| ROOM-8 | Real-time join | 1. Host has lobby open.<br>2. Second user joins in another browser. | Host sees new player without refresh. | | |

---

### 2.3 Gameplay — Start, Draw, Submit

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| GAME-1 | Start game | 1. In lobby with 2+ players, host clicks Start Game. | Game starts; all see game board; first turn set; initial hands dealt per hand size. | | |
| GAME-2 | Start — only host | 1. Non-host tries to start (if UI exposed). | Cannot start; or 403 from API. | | |
| GAME-3 | Draw card | 1. As current (or any, if rules allow) player, click Draw Card. | One card added to hand; real-time update for others if applicable. | | |
| GAME-4 | Draw — hand full | 1. Draw until hand = hand size (e.g. 5).<br>2. Try drawing again. | Error message; no 6th card. | | |
| GAME-5 | Submit card | 1. Select a card from hand.<br>2. Submit for review. | Card moves to “pending”; voting UI appears for others. | | |
| GAME-6 | Mode affects deck | 1. Create room with Mode = Casual; start game; note card mix.<br>2. Create room with Mode = Lit; start game. | Casual: more mild cards; Lit: more moderate/severe (or different mix). | | |

---

### 2.4 Voting & Approval

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| VOTE-1 | Vote approve | 1. As non-submitter, open voting UI.<br>2. Approve. | Vote recorded; progress updates; when threshold met, submission resolves. | | |
| VOTE-2 | Vote reject | 1. As non-submitter, reject. | Vote recorded; when rejection threshold met, submission rejected; card returns to hand if applicable. | | |
| VOTE-3 | Cannot vote on own submission | 1. Submit a card.<br>2. As same user, try to vote on it. | Cannot vote (UI disabled or 400). | | |
| VOTE-4 | Threshold — approval | 1. With 4 players, get 2 approvals (excluding submitter). | Submission approved; points awarded; turn advances. | | |
| VOTE-5 | Threshold — rejection | 1. With enough rejections (e.g. majority of voters). | Submission rejected; no points; card returned to hand if applicable. | | |
| VOTE-6 | Real-time vote update | 1. Two browsers; one votes. | Other sees vote count/result update without refresh. | | |

---

### 2.5 Host Controls

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| HOST-1 | End game | 1. As host, open host controls.<br>2. End Game; confirm. | Game ends; winner (e.g. highest points) shown; new game starts with same players; points reset. | | |
| HOST-2 | Reset points | 1. As host, Reset Points; confirm. | All player points = 0; game continues (same round state). | | |
| HOST-3 | Non-host does not see host controls | 1. As non-host, view game board. | No End Game / Reset Points (or equivalent). | | |
| HOST-4 | Confirmation modals | 1. Click End Game and Cancel.<br>2. Click Reset Points and Cancel. | No destructive action; game unchanged. | | |

---

### 2.6 Chat & Reactions

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| CHAT-1 | Send message | 1. Open chat; type message; send. | Message appears in list; visible to other players. | | |
| CHAT-2 | Receive message (real-time) | 1. User A sends message. | User B sees it without refresh. | | |
| CHAT-3 | Unread indicator | 1. With chat closed, have another user send a message. | Unread count or indicator on Chat button. | | |
| REACT-1 | Send reaction | 1. Click a reaction (e.g. 👍) in the reaction bar. | Reaction appears in reaction display (pill with emoji + name); others see it. | | |
| REACT-2 | Multiple reactions | 1. Send several different reactions from different users. | Up to N (e.g. 6) visible; animations smooth; no layout break. | | |
| REACT-3 | Reaction bar styling | 1. Check reaction bar in light and dark theme. | Readable; matches app theme. | | |

---

### 2.7 User Profile & Settings

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| PROF-1 | View profile | 1. Go to Profile (from nav). | Profile page shows; stats (e.g. games played, wins, points) if implemented. | | |
| PROF-2 | Edit default nickname | 1. Set default nickname; save. | Saved; when joining a room, nickname pre-filled (or used as default). | | |
| PROF-3 | Skip tour preference | 1. In tour/instructions, check “Don’t show again”; save. | Next game start: tour does not auto-start; can still open from How to Play. | | |

---

### 2.8 Theme & UI

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| UI-1 | Light mode | 1. Switch to light theme (nav toggle). | All key screens use light background and readable contrast (nav, game board, modals, chat). | | |
| UI-2 | Dark mode | 1. Switch to dark theme. | Consistent dark surfaces; primary/accent visible. | | |
| UI-3 | Theme persists | 1. Set theme; refresh or reopen app. | Same theme applied. | | |
| UI-4 | How to Play modal | 1. Open How to Play. | Content clear; modal matches theme; closes correctly. | | |

---

### 2.9 Accessibility & Usability

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| A11Y-1 | Keyboard — main actions | 1. Use Tab and Enter/Space only. | Can reach and activate Create/Join, Start Game, Draw, Submit, Vote, Chat. | | |
| A11Y-2 | Focus visible | 1. Tab through buttons and links. | Focus ring or visible focus state on all. | | |
| A11Y-3 | Labels | 1. Use screen reader or inspect. | Buttons and inputs have accessible names/labels. | | |
| A11Y-4 | Reaction / live region | 1. Receive a reaction or message. | Announced or visible (e.g. aria-live). | | |

---

### 2.10 Edge Cases & Error Handling

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| ERR-1 | Room not found | 1. Go to `/game/INVALID` or join with wrong code. | Clear message (404 or “Room not found”). | | |
| ERR-2 | Network / API error | 1. Simulate offline or 500 (e.g. devtools). | User sees error message; no silent failure. | | |
| ERR-3 | Refresh during game | 1. Mid-game, refresh page. | Rejoin same room; state restored (or clear rejoin flow). | | |
| ERR-4 | Two tabs same user | 1. Open same game in two tabs as same user. | No duplicate votes or duplicate draws; or clear “already in room” behavior. | | |

---

## 3. Sign-Off Checklist

Before release, each area should be signed off. Use the table below and attach any defect list or notes.

| Area | Pass | Fail | Blockers / Notes | Signed off by |
|------|------|------|------------------|----------------|
| 2.1 Authentication | | | | |
| 2.2 Rooms & Lobby | | | | |
| 2.3 Gameplay | | | | |
| 2.4 Voting | | | | |
| 2.5 Host Controls | | | | |
| 2.6 Chat & Reactions | | | | |
| 2.7 Profile & Settings | | | | |
| 2.8 Theme & UI | | | | |
| 2.9 Accessibility | | | | |
| 2.10 Edge Cases | | | | |

**Overall release gate:** All sections passed and signed off; critical defects fixed or accepted with mitigation.

---

## 4. Test Data Suggestions

- **Room codes:** Use 6-character codes from Create Room; avoid hardcoded codes unless using a seeded test env.
- **Users:** At least 2–3 test accounts (different Clerk users) for multi-player.
- **Modes:** Run at least one full game in Casual and one in Lit to validate mode-based card mix (GAME-6, mode distribution).

---

## 5. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-07 | — | Initial comprehensive UAT plan. |
