/**
 * Game engine utilities for FoulPlay
 * Pure functions for game logic (fully testable)
 *
 * Card drawing: All cards have equal probability. Cards never run out; duplicates allowed.
 */

import { getCardsForSport, type Sport } from "./cards";

export type GameMode = "casual" | "party" | "lit";

export interface GameState {
  roomId: string;
  currentTurnPlayerId: string;
  activeCardInstanceId: string | null;
  deckSeed: string;
  deck: number[];
  drawnCards: number[];
}

/**
 * Returns the maximum number of severe cards a player can have in hand.
 * - Casual: max 1
 * - Party: max 1 when hand size 4–6, max 2 when hand size > 6
 * - Lit: no limit
 */
export function getMaxSevereCardsInHand(
  mode: string | null,
  handSize: number
): number {
  if (mode === "lit") return Infinity;
  if (mode === "casual") return 1;
  if (mode === "party") return handSize <= 6 ? 1 : 2;
  return Infinity;
}

/**
 * Draw a random card index from a pool, excluding severe cards when at limit.
 * Used when drawing a single card and the player's current severe count is known.
 */
export function drawRandomCardIndexRespectingSevere(
  cards: { severity: string }[],
  currentSevereCount: number,
  maxSevere: number
): number {
  if (cards.length === 0) throw new Error("cards must not be empty");
  const canDrawSevere = currentSevereCount < maxSevere;
  const validIndices = canDrawSevere
    ? cards.map((_, i) => i)
    : cards
        .map((c, i) => (c.severity === "severe" ? -1 : i))
        .filter((i) => i >= 0);
  if (validIndices.length === 0) {
    return drawRandomCardIndex(cards.length);
  }
  const poolIdx = drawRandomCardIndex(validIndices.length);
  return validIndices[poolIdx];
}

/**
 * Draw multiple card indices, respecting severe card limits per mode.
 * Draws one at a time so each draw respects the limit.
 * @param initialSevereCount - Severe cards already in hand (for replacement draws)
 */
export function drawRandomCardIndicesRespectingSevere(
  cards: { severity: string }[],
  count: number,
  mode: string | null,
  handSize: number,
  initialSevereCount = 0
): number[] {
  if (cards.length === 0 || count <= 0) return [];
  const maxSevere = getMaxSevereCardsInHand(mode, handSize);
  let severeCount = initialSevereCount;
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const canDrawSevere = severeCount < maxSevere;
    const validIndices = canDrawSevere
      ? cards.map((_, idx) => idx)
      : cards
          .map((c, idx) => (c.severity === "severe" ? -1 : idx))
          .filter((idx) => idx >= 0);
    if (validIndices.length === 0) {
      const idx = drawRandomCardIndex(cards.length);
      indices.push(idx);
      if (cards[idx].severity === "severe") severeCount++;
    } else {
      const poolIdx = drawRandomCardIndex(validIndices.length);
      const cardIdx = validIndices[poolIdx];
      indices.push(cardIdx);
      if (cards[cardIdx].severity === "severe") severeCount++;
    }
  }
  return indices;
}

/**
 * Draw a random card index (0 to cardCount-1).
 * Equal probability for all cards; allows duplicates across draws.
 */
export function drawRandomCardIndex(cardCount: number): number {
  if (cardCount <= 0) throw new Error("cardCount must be positive");
  return Math.floor(Math.random() * cardCount);
}

/**
 * Draw multiple random card indices.
 * Each draw has equal probability; same card can appear multiple times.
 */
export function drawRandomCardIndices(
  cardCount: number,
  count: number
): number[] {
  if (cardCount <= 0 || count <= 0) return [];
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(drawRandomCardIndex(cardCount));
  }
  return indices;
}

/**
 * Advance to the next player's turn
 * Cycles through players in order
 */
export function advanceTurn(
  state: GameState,
  playerIds: string[]
): GameState {
  if (playerIds.length === 0) {
    return state;
  }

  const currentIndex = playerIds.indexOf(state.currentTurnPlayerId);
  const nextIndex = (currentIndex + 1) % playerIds.length;

  return {
    ...state,
    currentTurnPlayerId: playerIds[nextIndex],
  };
}

/**
 * Initialize game state for a new game.
 * Card dealing is done separately via drawRandomCardIndices.
 */
export function initializeGameState(
  roomId: string,
  playerIds: string[],
  sport: Sport,
  seed?: string
): GameState {
  if (playerIds.length === 0) {
    throw new Error("Cannot initialize game with no players");
  }

  const deckSeed = seed || `${roomId}-${Date.now()}`;
  const currentTurnPlayerId = playerIds[0];

  return {
    roomId,
    currentTurnPlayerId,
    activeCardInstanceId: null,
    deckSeed,
    deck: [],
    drawnCards: [],
  };
}
