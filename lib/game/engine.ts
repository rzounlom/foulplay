/**
 * Game engine utilities for FoulPlay
 * Pure functions for game logic (fully testable)
 */

import { getCardsForSport, type Sport } from "./cards";

export interface GameState {
  roomId: string;
  currentTurnPlayerId: string;
  activeCardInstanceId: string | null;
  deckSeed: string;
  deck: number[]; // Array of card indices
  drawnCards: number[]; // Cards that have been drawn
}

/**
 * Generate a shuffled deck of card indices based on a seed
 * Uses a simple seeded random number generator for reproducibility
 */
export function generateDeck(seed: string, cardCount: number): number[] {
  // Simple seeded RNG
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Fisher-Yates shuffle with seeded random
  const deck = Array.from({ length: cardCount }, (_, i) => i);
  let seedValue = Math.abs(hash);

  for (let i = deck.length - 1; i > 0; i--) {
    // Generate pseudo-random number from seed
    seedValue = (seedValue * 9301 + 49297) % 233280;
    const j = Math.floor((seedValue / 233280) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
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
 * Initialize game state for a new game
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

  // Generate seed if not provided
  const deckSeed = seed || `${roomId}-${Date.now()}`;

  // Get card count for the sport
  const cards = getCardsForSport(sport);
  const cardCount = cards.length;

  // Generate deck
  const deck = generateDeck(deckSeed, cardCount);

  // First player starts (still needed for backwards compatibility, but turns are no longer enforced)
  const currentTurnPlayerId = playerIds[0];

  return {
    roomId,
    currentTurnPlayerId,
    activeCardInstanceId: null,
    deckSeed,
    deck,
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
