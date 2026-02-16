# Card System Overhaul Plan

This document outlines the step-by-step plan to overhaul the game card system. Execute in order to avoid breaking changes.

---

## Summary of Changes

1. **Game Engine**: Replace mode-based severity mixing with equal-probability random draws. Cards never run out; duplicates allowed.
2. **Mode Display**: Casual = base penalty; Party = base+1 for "Take x drinks"; Get Lit = base×2 for "Take x drinks". Severe penalties (shot, shotgun, finish) unchanged.
3. **Points**: Unchanged—use card points as-is.
4. **Cards**: Replace `lib/game/cards.ts` with new definitions (football ~55, basketball ~50).

---

## Phase 1: Replace Card Definitions

### 1.1 Update `lib/game/cards.ts`
- [ ] Replace entire file with the new card definitions provided by the user
- [ ] Ensure `PENALTIES` constants match exactly
- [ ] Ensure `getCardsForSport()` returns the correct arrays
- [ ] Verify types: `Sport`, `Severity`, `CardType`, `CardDefinition`

### 1.2 Update Prisma Seed
- [ ] `prisma/seed.ts` already imports from `lib/game/cards`—no changes needed
- [ ] Run `npm run db:seed` after cards.ts update to repopulate DB with new cards
- [ ] Verify: `npx prisma db seed` succeeds and card counts match (~55 football, ~50 basketball)

---

## Phase 2: Game Engine – Equal Probability Draws

### 2.1 Add New Draw Function in `lib/game/engine.ts`
- [ ] Add `drawRandomCardIndex(cardCount: number, seed?: string): number` that returns a random index `0..cardCount-1`
- [ ] Use `Math.floor(Math.random() * cardCount)` for production (or seeded RNG if tests need determinism)
- [ ] Add `drawRandomCardIndices(cardCount: number, count: number, seed?: string): number[]` for multiple draws (allows duplicates)

### 2.2 Simplify Engine – Remove Mode-Based Deck
- [ ] **Option A**: Keep `generateDeckForMode` for backward compat but add a new path that uses random draws
- [ ] **Option B**: Replace `generateDeckForMode` usage everywhere with `drawRandomCardIndex` / `drawRandomCardIndices`
- [ ] **Recommended**: Remove `generateDeckForMode`, `MODE_SEVERITY_PCT`, `sampleWithReplacement`; keep `generateDeck` only if used elsewhere (e.g. tests)
- [ ] Update `drawNextCard` to use random index **OR** deprecate it and have API routes call `drawRandomCardIndex` directly
- [ ] Update `drawMultipleCards` to call `drawRandomCardIndices` (no deck/drawnCards state)
- [ ] **GameState**: `deck` and `drawnCards` are no longer needed for draw logic. Consider:
  - Leaving them in the interface but unused (minimal change)
  - Or removing from `initializeGameState` and all callers

### 2.3 Update `initializeGameState` in `lib/game/engine.ts`
- [ ] Change to NOT require a deck for dealing—callers will deal cards themselves using random draws
- [ ] Or: `initializeGameState` only creates the turn/player state; card dealing is done in API

---

## Phase 3: API Routes – Use Random Draws

All routes that draw cards must switch from `generateDeckForMode` + `drawNextCard`/`drawMultipleCards` to `drawRandomCardIndex`/`drawRandomCardIndices`.

### 3.1 `app/api/game/start/route.ts`
- [ ] Remove `generateDeckForMode` and deck building
- [ ] For each player, for `handSize` iterations: call `drawRandomCardIndex(cards.length)` (or pass seed for reproducibility)
- [ ] Create `CardInstance` for each (roomId, cardId: cards[randomIndex].id, drawnById, status: "drawn")
- [ ] `initializeGameState`: pass empty deck or adjust to not need deck; keep `deckSeed` for any future use or remove
- [ ] GameState.create: `deckSeed` can stay; no need to persist deck

### 3.2 `app/api/game/draw/route.ts`
- [ ] Remove: `generateDeckForMode`, `drawnInstances`/`drawnCardIndices`, `gameState` rebuild
- [ ] Replace with: `const cardIndex = drawRandomCardIndex(cards.length)` (or use `Math.floor(Math.random() * cards.length)`)
- [ ] `selectedCard = cards[cardIndex]`
- [ ] Create `CardInstance` as before
- [ ] No `GameState` update for deck/drawnCards (only `activeCardInstanceId` if needed)

### 3.3 `app/api/game/vote/route.ts` (auto-draw after approval)
- [ ] Remove deck rebuild and `drawNextCard` loop
- [ ] For each replacement card: `drawRandomCardIndex(cards.length)` → create CardInstance
- [ ] No GameState deck update

### 3.4 `app/api/rooms/join/route.ts` (mid-game join)
- [ ] Remove deck/drawnCards logic
- [ ] For `handSize` cards: `drawRandomCardIndex(cards.length)` each → create CardInstance
- [ ] No GameState update for deck

### 3.5 `app/api/game/finalize-quarter/route.ts`
- [ ] Remove deck rebuild and `drawMultipleCards`
- [ ] For each `cardsToDeal`: `drawRandomCardIndex(cards.length)` → create CardInstance
- [ ] Remove `GameState.update` for `deckSeed` if it was only for deck (or keep if used elsewhere)

### 3.6 `app/api/game/discard/route.ts`
- [ ] Same as finalize-quarter: use `drawRandomCardIndices` or loop with `drawRandomCardIndex`
- [ ] Remove deck/GameState deck logic

### 3.7 `app/api/game/end/route.ts` (new game after end)
- [ ] Check if it deals cards—if so, use same random draw logic as start

---

## Phase 4: Mode-Based Penalty Display (UI Only)

### 4.1 Update `lib/game/display.ts`
- [ ] Add `getCardDescriptionForDisplay(description: string, mode: string | null): string`
- [ ] Logic:
  - `non-drinking`: return `"Earn points when this event occurs."` (existing)
  - `casual`: return `description` as-is
  - `party`: if description matches "Take X drink(s)" pattern, parse X, return `Take ${X+1} drink(s)` (or "Take 2 drinks" etc.)
  - `lit`: if description matches "Take X drink(s)", return `Take ${X*2} drink(s)`
  - **Severe penalties** (exact match): "Take a shot", "Shotgun a beer", "Finish your drink", "Finish your drink + 1/2 another" → return as-is for all modes
- [ ] Implement helper: `isTakeXDrinksCard(description: string): boolean` and `parseDrinkCount(description: string): number | null`
- [ ] Map: "Take a drink" → 1, "Take 2 drinks" → 2, "Take 3 drinks" → 3

### 4.2 Ensure UI Uses `getCardDescriptionForDisplay`
- [ ] Verify `game-board.tsx`, `hand.tsx`, `voting-panel.tsx`, `discard-panel.tsx`, etc. pass `room.mode` when displaying card descriptions
- [ ] Search codebase for `card.description` or `activeCard.card.description` and ensure they use the display helper

---

## Phase 5: Database & Schema

### 5.1 Schema
- [ ] **No schema changes required**—Card, CardInstance, GameState structure stays the same
- [ ] GameState.deckSeed can remain (used for any future logic or left unused)

### 5.2 Migration
- [ ] **No migration needed**—only data change
- [ ] Run `npm run db:seed` to replace cards with new definitions

---

## Phase 6: Tests

### 6.1 Unit Tests `tests/unit/game/engine.test.ts`
- [ ] Remove or rewrite tests for `generateDeckForMode` (mode percentages)
- [ ] Remove tests for severity distribution (casual/lit/party mix)
- [ ] Add tests for `drawRandomCardIndex`: returns index in range, allows any index
- [ ] Add tests for `drawRandomCardIndices`: returns correct count, allows duplicates
- [ ] Update `drawNextCard`/`drawMultipleCards` tests if those functions are removed or changed
- [ ] Update `initializeGameState` tests

### 6.2 Integration Tests `tests/integration/api/game.test.ts`
- [ ] Update mock card builder: no longer need 50 mild / 30 moderate / 20 severe
- [ ] Remove or rewrite: "Casual mode: dealt cards should have predominantly mild"
- [ ] Remove or rewrite: "Lit mode: dealt cards should include severe and moderate"
- [ ] Update any test that asserts on deck composition or severity mix
- [ ] Ensure tests for: start game, draw card, vote (approve → auto-draw), discard, finalize quarter, join mid-game
- [ ] Mock `drawRandomCardIndex` if needed for deterministic tests

### 6.3 Display Tests (if any)
- [ ] Add tests for `getCardDescriptionForDisplay` with casual, party, lit, non-drinking
- [ ] Test "Take a drink" → Party: "Take 2 drinks", Lit: "Take 2 drinks"
- [ ] Test "Take 2 drinks" → Party: "Take 3 drinks", Lit: "Take 4 drinks"
- [ ] Test "Take a shot" → unchanged for all modes

---

## Phase 7: Cleanup & Verification

### 7.1 Remove Dead Code
- [ ] Remove `generateDeckForMode` from engine.ts
- [ ] Remove `MODE_SEVERITY_PCT`, `sampleWithReplacement` if unused
- [ ] Remove `drawnCards` from GameState if no longer used (or leave for backward compat)
- [ ] Remove any imports of removed functions

### 7.2 Manual Verification
- [ ] Create room → Start game → Verify initial hand has random cards (can have duplicates)
- [ ] Draw card → Verify new random card
- [ ] Submit card → Get approved → Verify replacement card is random
- [ ] Create Party room → Verify "Take a drink" shows as "Take 2 drinks"
- [ ] Create Lit room → Verify "Take 2 drinks" shows as "Take 4 drinks"
- [ ] Verify "Take a shot" unchanged in Party/Lit
- [ ] Quarter intermission → Discard cards → Verify new cards are random
- [ ] Join mid-game → Verify new player gets random hand

---

## File Change Checklist

| File | Changes |
|------|---------|
| `lib/game/cards.ts` | Replace with new definitions |
| `lib/game/engine.ts` | Add random draw, remove mode-based deck |
| `lib/game/display.ts` | Add mode-based penalty display logic |
| `app/api/game/start/route.ts` | Use random draws for initial deal |
| `app/api/game/draw/route.ts` | Use random draw |
| `app/api/game/vote/route.ts` | Use random draws for replacement |
| `app/api/rooms/join/route.ts` | Use random draws for new player |
| `app/api/game/finalize-quarter/route.ts` | Use random draws |
| `app/api/game/discard/route.ts` | Use random draws |
| `app/api/game/end/route.ts` | Check and update if deals cards |
| `tests/unit/game/engine.test.ts` | Rewrite for new engine |
| `tests/integration/api/game.test.ts` | Update for new behavior |
| `prisma/seed.ts` | No change (uses cards.ts) |

---

## Execution Order

1. **Phase 1** – Cards + seed (can test seed independently)
2. **Phase 2** – Engine (unit test as you go)
3. **Phase 4** – Display (can test in isolation)
4. **Phase 3** – API routes (integration test)
5. **Phase 6** – Full test updates
6. **Phase 7** – Cleanup and manual QA

---

## Risk Mitigation

- **Backward compatibility**: Existing games in progress may have been started with the old engine. Consider: games use `deckSeed` and `drawnCards` implicitly via the API. Once we switch to random draws, in-flight games will break if they try to draw (the draw API will use new logic). **Recommendation**: Document that active games should be finished or abandoned before deploy; or add a migration path (low priority).
- **Determinism for tests**: Use a seeded RNG in `drawRandomCardIndex` when a seed is provided, so tests can assert on specific outcomes.
