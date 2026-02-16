# FoulPlay — Comprehensive UAT Testing Plan

This document is the **full User Acceptance Testing (UAT) plan** for FoulPlay. Use it to validate the product end-to-end before release. QA and stakeholders run the scenarios, record pass/fail, and sign off on each area.

---

## How to use this document

1. **Before UAT:** Use a staging or production-like environment with real (or staging) Clerk, Ably, and database. Have at least 2 test accounts (different browsers or incognito) for multi-player flows.
2. **During UAT:** One person (Tester) executes the steps for each scenario and fills in **Pass/Fail** and **Notes**. An optional Observer can watch and raise edge cases.
3. **Recording:** For each scenario, mark Pass or Fail. In Notes, record any deviation (e.g. "Approval took 3 votes instead of 2 for 4 players") or environment details.
4. **Defects:** Log any failure as a defect (see §6). Reference the scenario ID (e.g. VOTE-4) in the defect.
5. **Sign-off:** After each section (e.g. 2.1 Authentication), the Sign-off owner confirms that section. When all sections are passed and signed off, the **release gate** (§3) is met.

---

## 1. Scope & Objectives

**In scope**

- Authentication (sign-in, sign-up, redirects)
- Room lifecycle (create, join, lobby, settings)
- Gameplay (start game, draw, submit, vote, turn flow)
- Host controls (end game, reset points, show points, allow join in progress, end round, reset round, finalize quarter)
- End-game flow (winner screen, leaderboard, navigation)
- Quarter-based card clearing (when enabled for the room)
- Non-drinking mode (card descriptions, no drink penalty text)
- In-game chat and reactions
- User profile (view, edit default nickname, skip-tour preference, stats)
- Theme (light / dark mode)
- Mode-based card distribution (Casual, Party, Lit, Non-drinking)
- Real-time sync (Ably) for all relevant events
- Mobile & responsive layout (hamburger nav, players panel, hand first, no horizontal scroll)
- Accessibility basics (keyboard, focus, labels)

**Out of scope (for this UAT)**

- Third-party provider uptime (Clerk, Ably) — assume they work
- Load/performance testing (separate plan)
- Security penetration testing (separate plan)

**Environment**

- **Staging or production-like:** Same env vars as prod (or staging equivalents for Clerk/Ably/DB).
- **Test accounts:** At least 2–3 (different Clerk users) for multi-player.
- **Browsers:** Chrome, Safari, Firefox (latest); plus one mobile browser (e.g. Safari iOS or Chrome Android).
- **Viewports:** Test at least one run at &lt; 768px (mobile) and one at ≥ 1024px (desktop) for layout and touch targets.

**Roles**

- **Tester:** Executes steps, records pass/fail and notes.
- **Observer (optional):** Watches session, raises edge cases.
- **Sign-off:** Product or QA lead confirms each section before release.

---

## 2. Test Scenarios

### 2.1 Authentication

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| AUTH-1 | Unauthenticated access to protected page | 1. Sign out if needed.<br>2. Open `/create` or `/join` or `/profile` or `/game/XXXXXX`. | Redirect to sign-in; after sign-in, redirect back to intended page (or preserve `?code=` for join). | | |
| AUTH-2 | Sign up new user | 1. Go to sign-up.<br>2. Complete Clerk sign-up. | Account created; user can access app (home, create, join, profile). | | |
| AUTH-3 | Sign in existing user | 1. Go to sign-in.<br>2. Sign in with existing account. | User lands on home or previously intended page. | | |
| AUTH-4 | Sign out | 1. Be signed in.<br>2. Use nav/user menu to sign out. | Signed out; protected routes redirect to sign-in. | | |

---

### 2.2 Rooms & Lobby

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| ROOM-1 | Create room | 1. Go to Create Room.<br>2. Select Mode (e.g. Party), Sport (Football or Basketball), hand size; optionally enable quarter clearing for Football/Basketball.<br>3. Submit. | Room created; redirect to `/game/[CODE]`; user is host; lobby shows. | | |
| ROOM-2 | Create room — validation | 1. Try creating without mode or sport. | Create disabled or error until both selected. | | |
| ROOM-3 | Join room by code | 1. Second user goes to Join Room.<br>2. Enter 6-character code (or use URL with `?code=`).<br>3. Optionally enter nickname.<br>4. Join. | Second user added; redirect to game lobby; both players visible. | | |
| ROOM-4 | Join — invalid code | 1. Enter wrong or short code. | Join disabled or clear error (e.g. "Room not found"). | | |
| ROOM-5 | Lobby — host sees controls | 1. As host, view lobby. | Can change Mode, Sport, Cards per hand; Copy room URL works; Start Game visible; if Football/Basketball, quarter clearing checkbox visible. | | |
| ROOM-6 | Lobby — non-host view | 1. As non-host, view lobby. | Sees player list and current mode/sport/hand size; no edit/start (read-only). | | |
| ROOM-7 | Lobby — Start disabled until 2+ players | 1. Create room (only host). | Start Game disabled or message "Need at least 2 players". | | |
| ROOM-8 | Real-time join | 1. Host has lobby open.<br>2. Second user joins in another browser. | Host sees new player without refresh. | | |
| ROOM-9 | Join in progress (when allowed) | 1. Host starts a game; in host controls enable "Allow new users to join".<br>2. Third user goes to Join, enters room code, joins. | Third user joins the active game; sees game board; can participate (draw/vote when applicable). | | |
| ROOM-10 | Join in progress (when disallowed) | 1. Room has game active and "Allow new users to join" is off.<br>2. New user tries to join with room code. | Clear error (e.g. game already started, join not allowed). | | |

---

### 2.3 Gameplay — Start, Draw, Submit

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| GAME-1 | Start game | 1. In lobby with 2+ players, host clicks Start Game. | Game starts; all see game board; first turn set; initial hands dealt per hand size. | | |
| GAME-2 | Start — only host | 1. Non-host tries to start (if UI exposed). | Cannot start; or 403 from API. | | |
| GAME-3 | Draw card | 1. As current-turn player, click Draw Card. | One card added to hand; turn may advance; others see update in real time. | | |
| GAME-4 | Draw — hand full | 1. Draw until hand = hand size (e.g. 5).<br>2. Try drawing again. | Error or disabled; no extra card. | | |
| GAME-5 | Submit card | 1. Select one or more cards from hand.<br>2. Submit for review. | Card(s) move to "Pending Submissions"; voting UI appears for others. | | |
| GAME-6 | Mode affects deck | 1. Create room with Mode = Casual; start game; note card mix.<br>2. Create room with Mode = Lit; start game. | Casual: more mild cards; Lit: more moderate/severe (or different mix). | | |

---

### 2.4 Voting & Approval

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| VOTE-1 | Vote approve | 1. As non-submitter, open voting UI.<br>2. Approve. | Vote recorded; when threshold met, submission approved; points awarded; turn advances. | | |
| VOTE-2 | Vote reject | 1. As non-submitter, reject. | Vote recorded; when rejection threshold met, submission rejected; card(s) returned to hand. | | |
| VOTE-3 | Cannot vote on own submission | 1. Submit a card.<br>2. As same user, try to vote on it. | Cannot vote (UI disabled or API 400). | | |
| VOTE-4 | Threshold — approval | 1. With 4 players, get 2 approvals (excluding submitter). | Submission approved; points applied; turn advances. | | |
| VOTE-5 | Threshold — rejection | 1. With enough rejections (e.g. majority of voters). | Submission rejected; no points; card(s) returned to hand. | | |
| VOTE-6 | Real-time vote update | 1. Two browsers; one votes. | Other sees vote count/result update without refresh. | | |
| VOTE-7 | Per-card vote (multiple cards in submission) | 1. Submitter submits 2 cards.<br>2. Voters approve one and reject one. | Each card resolved per its votes; approved card clears, rejected card returns to hand. | | |

---

### 2.5 Host Controls (during game)

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| HOST-1 | End game | 1. As host, open host controls (desktop: left column; mobile/tablet: Players panel).<br>2. End Game; confirm. | Game ends; all players see end-game page (winner, leaderboard); no crash. | | |
| HOST-2 | End game — cancel | 1. As host, click End Game then Cancel. | Game continues; no change. | | |
| HOST-3 | Reset points | 1. As host, Reset Points; confirm. | All player points = 0; game continues (same round/turn state). | | |
| HOST-4 | Reset points — cancel | 1. As host, click Reset Points then Cancel. | Points unchanged. | | |
| HOST-5 | Non-host does not see host controls | 1. As non-host, view game board. | No End Game, Reset Points, End Round, Reset Round, or Show points (host-only). | | |
| HOST-6 | Show points toggle | 1. As host, toggle "Show all players' points" off.<br>2. As non-host, view player list. | Non-host sees only own points (or no points).<br>3. Host toggles on. | All players' points visible. | | |
| HOST-7 | Allow join in progress toggle | 1. As host, enable "Allow new users to join".<br>2. New user joins with room code. | New user can join active game (see ROOM-9). | | |
| HOST-8 | End round | 1. As host, click End Round. | Round ends; next round starts (round number increments); turn resets as per rules. | | |
| HOST-9 | Reset round | 1. As host, click Reset Round (if shown). | Round count resets; next End Round starts Round 1. | | |
| HOST-10 | Finalize quarter (intermission) | 1. With quarter clearing enabled, host ends quarter so intermission starts.<br>2. Players select cards to turn in (or skip).<br>3. As host, click "End round early" or wait for timer. | Intermission ends; discarded cards processed; new cards drawn; game continues. | | |

---

### 2.6 End-Game Flow

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| END-1 | End-game page content | 1. After host ends game, view end-game page. | Winner name and points shown; leaderboard with all players; no broken layout. | | |
| END-2 | Navigation from end-game | 1. On end-game page, use link/button to go back to room or home. | Navigates correctly (e.g. back to room for new game or to home/join). | | |
| END-3 | All players see end-game | 1. Host ends game.<br>2. Check non-host browser. | Non-host also redirected to end-game page (real-time). | | |

---

### 2.7 Quarter Clearing (when room has it enabled)

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| QTR-1 | Quarter intermission appears | 1. Create room with Football or Basketball; enable quarter clearing; start game.<br>2. Host ends quarter (End Round / end quarter). | Intermission banner appears; countdown (e.g. 5:00); players can select cards to turn in. | | |
| QTR-2 | Select cards to discard | 1. During intermission, select one or more cards; confirm. | Selection saved; after host finalizes (or timer), cards discarded; drink penalty copy shown per card (unless non-drinking mode). | | |
| QTR-3 | Host finalize quarter | 1. During intermission, host clicks "End round early". | Intermission ends; discard processing runs; players get new cards; game continues. | | |

---

### 2.8 Non-Drinking Mode

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| NDR-1 | Create room — Non-drinking | 1. Create room; select Mode = Non-drinking; start game. | Game starts; card descriptions show generic text (e.g. "Earn points when this event occurs") instead of drink penalties. | | |
| NDR-2 | Card display in non-drinking | 1. In non-drinking game, open hand and pending submissions. | No drink/sip wording in card description. | | |

---

### 2.9 Chat & Reactions

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| CHAT-1 | Send message | 1. Open chat; type message; send. | Message appears in list; visible to other players. | | |
| CHAT-2 | Receive message (real-time) | 1. User A sends message. | User B sees it without refresh. | | |
| CHAT-3 | Unread indicator | 1. With chat closed, have another user send a message. | Unread count or indicator on Chat button. | | |
| REACT-1 | Send reaction | 1. Click a reaction (e.g. 👍) in the reaction bar. | Reaction appears in reaction display (pill with emoji + name); others see it. | | |
| REACT-2 | Multiple reactions | 1. Send several different reactions from different users. | Multiple reactions visible; animations smooth; no layout break. | | |
| REACT-3 | Reaction bar in light/dark theme | 1. Check reaction bar in light and dark theme. | Readable; matches app theme. | | |

---

### 2.10 User Profile & Settings

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| PROF-1 | View profile | 1. Go to Profile (from nav). | Profile page shows; stats (games played, games won, total points) visible. | | |
| PROF-2 | Edit default nickname | 1. Set default nickname; Save. | Saved; when opening Join Room, nickname field pre-filled. | | |
| PROF-3 | Skip tour preference | 1. In profile or tour, set "Don't show interactive tour"; save.<br>2. Start a new game. | Tour does not auto-start on game start; How to Play still openable. | | |

---

### 2.11 Theme & UI

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| UI-1 | Light mode | 1. Switch to light theme (nav toggle). | All key screens use light background and readable contrast (nav, game board, modals, chat). | | |
| UI-2 | Dark mode | 1. Switch to dark theme. | Consistent dark surfaces; primary/accent visible. | | |
| UI-3 | Theme persists | 1. Set theme; refresh or reopen app. | Same theme applied. | | |
| UI-4 | How to Play modal | 1. Open How to Play. | Content clear; modal matches theme; closes correctly. | | |

---

### 2.12 Mobile & Responsive

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| MOB-1 | Viewport &lt; 1024px — layout | 1. Resize to &lt; 1024px (or use device). | Single column; hand (Your Cards) above Pending Submissions/Discard; navbar shows logo, hamburger, theme, user. | | |
| MOB-2 | Hamburger nav | 1. At &lt; 1024px, open hamburger menu. | Slide-out sidebar with nav links (Home, Create, Join, Active Games, Profile); overlay; close on link or overlay. | | |
| MOB-3 | Players panel | 1. At &lt; 1024px, click Players in game room top bar. | Slide-out panel from right with Host Controls (if host) and player list; close button/overlay. | | |
| MOB-4 | No horizontal scroll | 1. At 320px–768px width, open game board, lobby, create, join, profile. | No horizontal scroll; content wraps or truncates. | | |
| MOB-5 | Touch targets | 1. On touch device (or narrow viewport), tap Create Room, Join, Start Game, Draw, Submit, Vote. | Buttons/links easy to tap (~44px min); no mis-taps. | | |
| MOB-6 | Desktop ≥ 1024px | 1. At ≥ 1024px. | Full navbar; 3-column game layout (Host + Players left, game area center); hand first in center column. | | |

---

### 2.13 Accessibility & Usability

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| A11Y-1 | Keyboard — main actions | 1. Use Tab and Enter/Space only. | Can reach and activate Create/Join, Start Game, Draw, Submit, Vote, Chat, Players (when visible). | | |
| A11Y-2 | Focus visible | 1. Tab through buttons and links. | Focus ring or visible focus state on all. | | |
| A11Y-3 | Labels | 1. Use screen reader or inspect. | Buttons and inputs have accessible names/labels. | | |
| A11Y-4 | Sidebars — focus | 1. Open hamburger or Players panel; Tab. | Focus stays within panel (or returns on close). | | |

---

### 2.14 Edge Cases & Error Handling

| ID   | Scenario | Steps | Expected | Pass/Fail | Notes |
|------|----------|--------|-----------|-----------|--------|
| ERR-1 | Room not found | 1. Go to `/game/INVALID` or join with wrong code. | Redirect or clear message (e.g. redirect to join, or "Room not found"). | | |
| ERR-2 | Network / API error | 1. Simulate offline or 500 (e.g. devtools). | User sees error message or toast; no silent failure. | | |
| ERR-3 | Refresh during game | 1. Mid-game, refresh page. | User remains in room; game state restored (or clear rejoin flow). | | |
| ERR-4 | Two tabs same user | 1. Open same game in two tabs as same user. | No duplicate votes or duplicate draws; or clear "already in room" behavior. | | |
| ERR-5 | Active games list | 1. Join or create rooms; go to Active Games. | List shows current user's rooms with correct status (Lobby/In Progress); links open correct room. | | |

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
| 2.6 End-Game Flow | | | | |
| 2.7 Quarter Clearing | | | | |
| 2.8 Non-Drinking Mode | | | | |
| 2.9 Chat & Reactions | | | | |
| 2.10 Profile & Settings | | | | |
| 2.11 Theme & UI | | | | |
| 2.12 Mobile & Responsive | | | | |
| 2.13 Accessibility | | | | |
| 2.14 Edge Cases | | | | |

**Overall release gate:** All sections passed and signed off; critical defects fixed or accepted with mitigation.

---

## 4. Test Data Suggestions

- **Room codes:** Use 6-character codes from Create Room; avoid hardcoded codes unless using a seeded test env.
- **Users:** At least 2–3 test accounts (different Clerk users) for multi-player.
- **Modes:** Run at least one full game in Casual and one in Lit (mode distribution); one in Non-drinking (card copy).
- **Sports:** Test Football and Basketball (quarter clearing only for these).
- **Viewports:** One full pass at mobile width (e.g. 375px) and one at desktop (e.g. 1280px).

---

## 5. Defect Logging

When a scenario fails, log a defect with:

- **Scenario ID** (e.g. VOTE-4, ROOM-9)
- **Title:** Short description of the failure
- **Steps:** What was done (can reference UAT steps)
- **Expected:** From the scenario table
- **Actual:** What happened
- **Severity:** Critical / Major / Minor (e.g. blocks release vs. cosmetic)
- **Environment:** Browser, viewport, account

Track defects in your usual tool (e.g. GitHub Issues, Jira). Reference defect IDs in the Sign-Off **Blockers / Notes** column until resolved.

---

## 6. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-07 | — | Initial comprehensive UAT plan. |
| 2.0 | 2025-02-07 | — | Full UAT doc: how-to-use, end-game flow, host controls detail, quarter clearing, non-drinking, join in progress, mobile/responsive, defect logging, sign-off table extended. |
