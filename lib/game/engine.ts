/**
 * Game engine utilities for FoulPlay
 * Pure functions for game logic (fully testable)
 */

import { getCardsForSport, type Sport } from "./cards";
import type { Severity } from "./cards";

export type GameMode = "casual" | "party" | "lit";

export interface GameState {
  roomId: string;
  currentTurnPlayerId: string;
  activeCardInstanceId: string | null;
  deckSeed: string;
  deck: number[]; // Array of card indices
  drawnCards: number[]; // Cards that have been drawn
}

/** Seeded RNG state for reproducible shuffles */
function createSeededRng(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  let state = Math.abs(hash);
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Shuffle an array in place using a seeded RNG (Fisher-Yates).
 * Returns the same array for chaining.
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = createSeededRng(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate a shuffled deck of card indices based on a seed.
 * Uses a simple seeded random number generator for reproducibility.
 */
export function generateDeck(seed: string, cardCount: number): number[] {
  const deck = Array.from({ length: cardCount }, (_, i) => i);
  return seededShuffle(deck, seed);
}

/**
 * Mode-based severity distribution (PRD / Phase 12).
 * Percentages: mild / moderate / severe.
 */
const MODE_SEVERITY_PCT: Record<
  string,
  { mild: number; moderate: number; severe: number }
> = {
  casual: { mild: 0.7, moderate: 0.25, severe: 0.05 },
  party: { mild: 0.5, moderate: 0.35, severe: 0.15 },
  lit: { mild: 0.4, moderate: 0.35, severe: 0.25 },
  "non-drinking": { mild: 0.7, moderate: 0.25, severe: 0.05 },
};

/** Pick n indices from pool with replacement using seeded RNG */
function sampleWithReplacement(
  pool: number[],
  n: number,
  seed: string
): number[] {
  if (pool.length === 0 || n <= 0) return [];
  const rng = createSeededRng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(pool[Math.floor(rng() * pool.length)]);
  }
  return out;
}

/**
 * Generate a deck with mode-based severity mix (Phase 12).
 * - Casual: ~70% mild, ~25% moderate, ~5% severe
 * - Party: ~50% mild, ~35% moderate, ~15% severe
 * - Lit: ~40% mild, ~35% moderate, ~25% severe
 * - Non-drinking: same as casual
 * severities[i] is the severity of card at index i (same order as API card list).
 */
export function generateDeckForMode(
  seed: string,
  severities: Severity[],
  mode: GameMode | string
): number[] {
  const cardCount = severities.length;
  const indicesBySeverity: Record<Severity, number[]> = {
    mild: [],
    moderate: [],
    severe: [],
  };
  severities.forEach((sev, i) => {
    if (indicesBySeverity[sev]) indicesBySeverity[sev].push(i);
  });

  const mildPool = indicesBySeverity.mild;
  const modPool = indicesBySeverity.moderate;
  const sevPool = indicesBySeverity.severe;

  const pct = MODE_SEVERITY_PCT[mode] ?? MODE_SEVERITY_PCT.party;
  let mildCount = Math.floor(cardCount * pct.mild);
  let modCount = Math.floor(cardCount * pct.moderate);
  let sevCount = cardCount - mildCount - modCount;
  if (sevCount < 0) {
    sevCount = 0;
    modCount = cardCount - mildCount;
  }

  // Cap to available cards per severity; redistribute remainder to mild then moderate
  mildCount = Math.min(mildCount, mildPool.length);
  modCount = Math.min(modCount, modPool.length);
  sevCount = Math.min(sevCount, sevPool.length);
  let total = mildCount + modCount + sevCount;
  while (total < cardCount && (mildCount < mildPool.length || modCount < modPool.length || sevCount < sevPool.length)) {
    if (mildCount < mildPool.length) {
      mildCount++;
      total++;
    } else if (modCount < modPool.length) {
      modCount++;
      total++;
    } else if (sevCount < sevPool.length) {
      sevCount++;
      total++;
    }
  }

  const deck: number[] = [
    ...sampleWithReplacement(mildPool, mildCount, `${seed}-m`),
    ...sampleWithReplacement(modPool, modCount, `${seed}-mod`),
    ...sampleWithReplacement(sevPool, sevCount, `${seed}-s`),
  ];

  return seededShuffle(deck, seed);
}

/**
 * Draw the next card from the deck
 * Returns the card index and updates the game state
 */
export function drawNextCard(state: GameState): {
  cardIndex: number | null;
  newState: GameState;
} {
  // Find the next card that hasn't been drawn
  const availableCard = state.deck.find(
    (cardIndex) => !state.drawnCards.includes(cardIndex)
  );

  if (availableCard === undefined) {
    // Deck exhausted: reshuffle the same deck to preserve mode-based severity mix (Phase 12)
    const reshuffleSeed = `${state.deckSeed}-reshuffle-${state.drawnCards.length}`;
    const newDeck = seededShuffle([...state.deck], reshuffleSeed);
    const newState: GameState = {
      ...state,
      deck: newDeck,
      drawnCards: [],
    };
    return drawNextCard(newState);
  }

  const newState: GameState = {
    ...state,
    drawnCards: [...state.drawnCards, availableCard],
    activeCardInstanceId: null, // Will be set when CardInstance is created
  };

  return {
    cardIndex: availableCard,
    newState,
  };
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
 * If deck is provided (e.g. mode-weighted), it is used; otherwise a shuffled deck is generated.
 */
export function initializeGameState(
  roomId: string,
  playerIds: string[],
  sport: Sport,
  seed?: string,
  deck?: number[]
): GameState {
  if (playerIds.length === 0) {
    throw new Error("Cannot initialize game with no players");
  }

  const deckSeed = seed || `${roomId}-${Date.now()}`;
  const cards = getCardsForSport(sport);
  const cardCount = cards.length;
  const finalDeck =
    deck && deck.length === cardCount ? deck : generateDeck(deckSeed, cardCount);
  const currentTurnPlayerId = playerIds[0];

  return {
    roomId,
    currentTurnPlayerId,
    activeCardInstanceId: null,
    deckSeed,
    deck: finalDeck,
    drawnCards: [],
  };
}

/**
 * Draw multiple cards for a player
 * Returns array of card indices and updated game state
 */
export function drawMultipleCards(
  state: GameState,
  count: number
): {
  cardIndices: number[];
  newState: GameState;
} {
  const cardIndices: number[] = [];
  let currentState = state;

  for (let i = 0; i < count; i++) {
    const result = drawNextCard(currentState);
    if (result.cardIndex !== null) {
      cardIndices.push(result.cardIndex);
      currentState = result.newState;
    } else {
      // Deck exhausted, break
      break;
    }
  }

  return {
    cardIndices,
    newState: currentState,
  };
}
