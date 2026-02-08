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
 * Generate a deck ordered by mode so severity distribution matches intensity:
 * - Casual: mild cards appear first (more often drawn early), then moderate, then severe.
 * - Lit: severe first, then moderate, then mild (higher intensity draws).
 * - Party: fully shuffled (balanced).
 * severities[i] is the severity of card at index i (same order as API card list, e.g. by id).
 */
export function generateDeckForMode(
  seed: string,
  severities: Severity[],
  mode: GameMode | string
): number[] {
  const indicesBySeverity: Record<Severity, number[]> = {
    mild: [],
    moderate: [],
    severe: [],
  };
  severities.forEach((sev, i) => {
    if (indicesBySeverity[sev]) indicesBySeverity[sev].push(i);
  });

  const shuffle = (arr: number[], s: string) => seededShuffle([...arr], s);

  switch (mode) {
    case "casual":
      return [
        ...shuffle(indicesBySeverity.mild, `${seed}-mild`),
        ...shuffle(indicesBySeverity.moderate, `${seed}-moderate`),
        ...shuffle(indicesBySeverity.severe, `${seed}-severe`),
      ];
    case "lit":
      return [
        ...shuffle(indicesBySeverity.severe, `${seed}-severe`),
        ...shuffle(indicesBySeverity.moderate, `${seed}-moderate`),
        ...shuffle(indicesBySeverity.mild, `${seed}-mild`),
      ];
    case "party":
    default:
      return generateDeck(seed, severities.length);
  }
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
    // Deck is empty, reshuffle
    const newDeck = generateDeck(state.deckSeed, state.deck.length);
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
