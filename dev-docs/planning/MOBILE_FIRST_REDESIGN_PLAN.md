# FoulPlay — Mobile-First Gameplay Redesign Plan

This document outlines a detailed plan to redesign the gameplay (game room) experience to be **mobile-first**, with tablet and mobile feeling like a native app. Desktop layout remains the primary reference and should continue to look and feel as it does today.

---

## 1. Goals & Principles

- **Mobile-first:** Design and implement for small viewports first; enhance for tablet and desktop.
- **App-like on small screens:** On tablet and mobile, the web app should look and behave like a native app (full-width sections, slide-out panels, minimal chrome).
- **Hand always in view:** The user’s cards (Your Hand) and How to Play should be the primary focus and appear **above** Pending Submissions and Pending Discard on all screen sizes.
- **Desktop preserved:** No regression on desktop; current 3-column layout and styling remain the standard for large viewports.

---

## 2. Breakpoints (Reference)

Use a single, consistent set of breakpoints across the app:

| Name      | Min width | Usage                          |
|-----------|-----------|---------------------------------|
| Mobile    | 0         | Phones (default)                |
| Tablet    | 768px     | `md:` — tablets, large phones  |
| Desktop   | 1024px    | `lg:` — desktop layout          |

- **Mobile + Tablet:** Apply mobile-first layout (stacked content, hamburger nav, players as slide-out).
- **Desktop (lg and up):** Current layout (3-column grid, full nav, players in sidebar).

---

## 3. Layout & Content Order Changes

### 3.1 Section order (all screen sizes)

**Current order (center column):**
1. Round intermission callout (when applicable)
2. Pending Submissions (or empty state)
3. Pending Discard (when intermission)
4. Your Cards (hand) + How to Play

**New order:**
1. Round intermission callout (when applicable)
2. **Your Cards (hand)** + **How to Play** — always first so the hand is front and center
3. Pending Submissions (or empty state)
4. Pending Discard (when intermission)

**Implementation:** In `game-board.tsx`, reorder the center column so the “Your Cards” block (including Hand + InstructionsModal) is rendered **above** the Pending Submissions and Pending Discard blocks. No change to left column (Host Controls + Players) order on desktop.

### 3.2 Desktop (lg+) layout — unchanged

- Keep `grid gap-6 lg:grid-cols-3` (or current equivalent).
- Left column: Host Controls (if host) + Players list (sticky).
- Center column: Content in the **new** order above (Hand first, then Submissions, then Discard).
- No fourth column; right side can remain empty or used for future features.

### 3.3 Tablet & mobile layout — new structure

- **Single full-width column.** No side-by-side sidebar for players on small screens.
- **Stacking order (top to bottom):**
  1. **Top bar** (room header: room code, mode, sport, reactions, chat, **players button** — see 4.2).
  2. **Round intermission banner** (when applicable).
  3. **Your Cards** (hand) — full width, compact cards (see 6).
  4. **Pending Submissions** — full width, compact cards.
  5. **Pending Discard** — full width when in intermission.
- **Host Controls:** On mobile/tablet, host controls can either:
  - Live inside the **Players slide-out** (e.g. at top of the panel), or
  - Remain as a collapsible block at the top of the main column (below the top bar).  
  **Recommendation:** Put Host Controls at the top of the Players slide-out panel on mobile/tablet so the main column is only: hand → submissions → discard.

---

## 4. Navigation & Top Bar

### 4.1 Navbar — mobile/tablet (hamburger + slide-out)

**Current:** Full horizontal nav with Home, Create Room, Join Room, Active Games, Profile, ThemeToggle, UserButton.

**New (below `lg` breakpoint):**
- **Visible on all pages:** Only:
  - **Logo/Brand** (e.g. “FoulPlay”) — left, links to `/`.
  - **Hamburger menu button** — opens slide-out sidebar (see below).
  - **ThemeToggle** — right.
  - **UserButton (Clerk)** — right.
- **Slide-out sidebar** (opens from left when hamburger is clicked):
  - Overlay (dismiss on click outside or Escape).
  - Panel: Home, Create Room, Join Room, Active Games, Profile (same links as current nav).
  - Optional: Footer with “Close” or just close on link click/overlay.
  - Animation: slide-in from left (e.g. 250–300ms), overlay fade-in.
- **Desktop (lg+):** Keep current navbar (all links visible, no hamburger).

**Files:** `components/navigation/main-nav.tsx`. Add state for sidebar open/close; conditional rendering of hamburger vs. full links based on viewport (e.g. `lg:flex` for links, `lg:hidden` for hamburger, and vice versa). Sidebar can be a new component (e.g. `NavSidebar`) or part of `MainNav`.

### 4.2 Game room top bar (game-board)

**Current:** Room title, copy link, Mode, Sport, Round (if applicable), Pending count, ReactionBar, Chat button — all in one or two rows.

**Mobile/tablet adjustments:**
- Keep: Room code (or “Game Room”), copy link, Mode, Sport, Reactions, Chat.
- **Add:** **“Players” button** (icon + label or icon only) that opens the **Players slide-out** (see 5). Badge optional (e.g. player count).
- **Compact layout:** Wrap or truncate text; smaller typography; ReactionBar and Chat can stay as-is or move to a second row if needed. Ensure navbar (or hamburger) doesn’t clash — consider a single row under the main app navbar for: [Room code + copy] [Mode | Sport] [Reactions] [Chat] [Players].
- **Desktop:** Optionally keep a “Players” entry in the left column only (no button in top bar) so the top bar stays clean.

---

## 5. Players Section as Slide-Out (Mobile & Tablet)

### 5.1 Behavior

- **Desktop (lg+):** Players remain in the **left column** of the grid (current behavior). No slide-out.
- **Mobile & tablet:** Remove the Players (and Host Controls) block from the main content flow. Replace with:
  - A **“Players”** button in the game room top bar (see 4.2).
  - Clicking it opens a **slide-out panel** (from the right, similar to Chat).

### 5.2 Players panel design

- **Position:** Fixed, right side of viewport (same pattern as ChatPanel).
- **Width:** e.g. 280–320px or `min(320px, 85vw)`.
- **Content:**
  - **If host:** Host Controls at the top (show points, allow join in progress, quarter/round controls, Reset Points, End Game, etc.).
  - **Player list** below (same content as current PlayerList: avatar/name, points if visible, host badge).
- **Header:** “Players” title + close button.
- **Overlay:** Semi-transparent backdrop; click to close (like Chat).
- **Animation:** Slide-in from right, 250–300ms.

### 5.3 Implementation notes

- Reuse the same overlay/panel pattern as `ChatPanel` for consistency.
- In `game-board.tsx`:
  - On `lg+`: Render Host Controls + PlayerList in the left column as today.
  - Below `lg`: Do **not** render Host Controls + PlayerList in the main grid. Instead, render a **PlayersPanel** (new component or variant) that is toggled by the “Players” button and contains Host Controls + PlayerList.
- Ensure `data-tour="player-list"` and `data-tour="host-controls"` are still attached for the interactive tour (either in the sidebar content when panel is open, or keep a hidden/offscreen copy for tour — or run tour only on desktop where the layout is unchanged).

---

## 6. Card Styling — Compact & 3-per-Row on Mobile

### 6.1 Your Hand (hand.tsx and game-board)

**Current:** Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; cards have padding, title, severity, points, description (line-clamp-2).

**New:**
- **Mobile (default):** `grid-cols-2` — 2 cards per row. Reduce padding (e.g. `p-2`), smaller font sizes, single line for title (truncate), description `line-clamp-1`. Severity and points on one row under title.
- **Tablet (md) and up:** `md:grid-cols-3` — 3 cards per row.
- **Desktop (lg+):** Same 3 per row with current padding and text sizes.

**Card component structure (hand):**
- Use a single shared card layout that accepts a “compact” or “size” prop, or use responsive classes only (e.g. `p-2 lg:p-3`, `text-[10px] lg:text-xs`).
- Ensure touch targets are at least ~44px for tap areas (the whole card can be the hit area).

### 6.2 Pending Submissions & Voting UI

- **Submission cards** (cards in a submission): Same idea — smaller on mobile, 2 per row on mobile and 3 per row on tablet+. In `VotingUI` and `SubmissionPending`, use `grid grid-cols-2 md:grid-cols-3` and reduced padding/font sizes for the card tiles.
- **Pending Discard:** Reuse the same compact card style when in discard flow.

### 6.3 Card layout: title then pills on one row

- **Rework game card layout** so it stays readable on small screens:
  - **Row 1:** Card title only (full width, truncate if needed).
  - **Row 2:** Severity pill and points pill on **one row** (e.g. `flex gap-1` or `flex gap-2`), directly under the title.
  - **Row 3:** Description (line-clamp as above).
- This avoids stacking severity/points in a column beside the title and keeps the card block compact and scannable on mobile.

### 6.4 Summary

| Area              | Mobile (default)     | Tablet (md)   | Desktop (lg)   |
|-------------------|----------------------|---------------|----------------|
| Hand cards        | 2 per row, compact   | 3 per row     | Current size   |
| Submission cards  | 2 per row, compact   | 3 per row     | Current        |
| Card padding      | p-2                  | p-2.5         | p-3            |
| Title font        | text-[10px] / xs     | text-xs       | text-xs/sm     |
| Description       | line-clamp-1 or hide | line-clamp-2  | line-clamp-2   |
| Pills             | One row under title  | Same          | Same           |

---

## 7. Game Room Page Structure (Summary)

### 7.1 Desktop (lg+)

- Navbar: full links, no hamburger.
- Game room: 3-column grid.
  - Left: Host Controls (if host) + Players.
  - Center: **Hand (first)** → Pending Submissions → Pending Discard.
  - (No right column.)
- Top bar: Room code, copy, Mode, Sport, Round (if any), Reactions, Chat (no “Players” button needed).

### 7.2 Mobile & tablet (< lg)

- Navbar: Logo, hamburger, ThemeToggle, UserButton. Sidebar with nav links when hamburger open.
- Game room:
  - Single column, full width.
  - Top bar: Room code, copy, Mode, Sport, Reactions, Chat, **Players** (opens slide-out).
  - Content order: Intermission banner (if any) → **Your Cards** → **Pending Submissions** → **Pending Discard**.
  - Players panel: Slide-out from right; contains Host Controls (if host) + Player list.

---

## 8. Implementation Phases

### Phase 1 — Content order & grid (no new UI)

- In `game-board.tsx`, reorder center column so **Your Cards** (and How to Play) are **above** Pending Submissions and Pending Discard.
- Verify desktop layout unchanged; verify mobile/tablet just get the new vertical order.

### Phase 2 — Navbar: hamburger + sidebar

- In `main-nav.tsx`, add responsive behavior: below `lg`, show only Logo, hamburger, ThemeToggle, UserButton.
- Implement slide-out sidebar with nav links; overlay + keyboard (Escape) close.
- Test on narrow viewport; ensure desktop still shows full nav.

### Phase 3 — Players as slide-out (mobile/tablet)

- Add “Players” button to game room top bar (visible only below `lg`).
- Create Players panel component (or extend existing pattern): slide from right, Host Controls + PlayerList.
- In `game-board.tsx`, below `lg` do not render left column; render Players panel content only when panel is open.
- Ensure Host Controls and PlayerList still work (state, API calls) when used inside the panel.

### Phase 4 — Compact cards (hand + submissions + discard)

- **Hand:** In `hand.tsx`, add responsive classes so cards are 3 per row and compact on mobile (smaller padding, font, line-clamp).
- **VotingUI / SubmissionPending / PendingDiscard:** Apply same compact card grid and styling for small viewports.
- Test 3 cards per row on a narrow viewport; ensure touch targets and readability.

### Phase 5 — Polish & testing

- Review top bar on mobile (wrap, overflow, “Players” button placement).
- Ensure interactive tour still works (e.g. only on desktop, or adapt tour steps for mobile by targeting visible elements).
- Test all flows: join, start, draw, submit, vote, chat, reactions, host controls, players panel, navbar sidebar.
- Accessibility: focus trap in sidebars, focus restore on close, keyboard navigation.

---

## 9. Files to Touch (Checklist)

| File / area              | Changes |
|--------------------------|--------|
| `components/game/game-board.tsx` | Reorder sections (Hand first); conditional left column vs. Players panel; “Players” button in top bar; responsive layout (single column < lg). |
| `components/navigation/main-nav.tsx` | Hamburger + sidebar; responsive visibility of links vs. hamburger; ThemeToggle + UserButton always visible on small screens. |
| `components/game/hand.tsx` | Responsive card grid (3 cols mobile); compact card styling (padding, font size, line-clamp). |
| `components/game/voting-ui.tsx` | Compact card layout for submission cards on mobile. |
| `components/game/submission-pending.tsx` | Compact card layout on mobile. |
| `components/game/pending-discard.tsx` | Compact card layout on mobile. |
| **New:** `components/game/players-panel.tsx` (or similar) | Slide-out panel containing Host Controls + PlayerList for mobile/tablet. |
| **New (optional):** `components/navigation/nav-sidebar.tsx` | Slide-out nav links for hamburger menu. |

---

## 10. Out of Scope (for this plan)

- Changes to lobby, create room, join room, or profile pages (can be done later with same mobile-first principles).
- Actual native mobile app (this plan is “web app that looks/feels like an app” on tablet and mobile).
- Changes to game logic or API.

---

## 11. Success Criteria

- On viewport &lt; 1024px: Hand and How to Play are at the top; Submissions and Discard below; Players and Host Controls in a slide-out; navbar is hamburger + ThemeToggle + UserButton.
- On viewport ≥ 1024px: Layout and behavior match current desktop design, with only the new section order (Hand first) applied.
- Hand and submission cards show 3 per row on mobile and are readable and tappable.
- No layout break or horizontal scroll on 320px–768px widths.
- Sidebars (nav, players, chat) open/close smoothly and don’t block critical actions.

---

*Document version: 1.0. Last updated: 2025-02-07.*
