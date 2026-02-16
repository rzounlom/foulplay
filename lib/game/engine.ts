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
