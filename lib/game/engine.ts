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
 * - Lit: max 2 (4–6), max 3 (7–9), max 4 (10–12)
 */
export function getMaxSevereCardsInHand(
  mode: string | null,
  handSize: number
): number {
  if (mode === "casual") return 1;
  if (mode === "party") return handSize <= 6 ? 1 : 2;
  if (mode === "lit") {
    if (handSize <= 6) return 2;
    if (handSize <= 9) return 3;
    return 4;
  }
  return Infinity;
}

/** hf = high-frequency; common = gameplay; rare = big moments */
export type Tier = "hf" | "common" | "rare";

/**
 * Target tier counts for hand composition (hand size 4–12).
 * Keeps hands playable (~1 event per 1–1.5 mins).
 */
export function getTargetTierCounts(handSize: number): {
  hf: number;
  common: number;
  rare: number;
} {
  const s = Math.max(4, Math.min(12, handSize));
  let hfPct = 0.55;
  let commonPct = 0.4;
  let rarePct = 0.05;
  if (s >= 7 && s <= 9) {
    hfPct = 0.45;
    commonPct = 0.45;
    rarePct = 0.1;
  } else if (s >= 10) {
    hfPct = 0.4;
    commonPct = 0.45;
    rarePct = 0.15;
  }
  const hf = Math.max(1, Math.round(s * hfPct));
  const common = Math.max(0, Math.round(s * commonPct));
  let rare = Math.max(0, s - hf - common);
  const total = hf + common + rare;
  if (total !== s) {
    const diff = s - total;
    rare = Math.max(0, rare + diff);
  }
  return { hf, common, rare };
}

export function summarizeHand(
  cards: { severity: string; tier?: string }[],
  handIndices: number[]
): {
  severeCount: number;
  tierCounts: { hf: number; common: number; rare: number };
} {
  let severeCount = 0;
  const tierCounts = { hf: 0, common: 0, rare: 0 };
  for (const idx of handIndices) {
    const c = cards[idx];
    if (!c) continue;
    if (c.severity === "severe") severeCount++;
    const tier = (c.tier ?? "common") as Tier;
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }
  return { severeCount, tierCounts };
}

export function chooseNeededTier(
  current: { hf: number; common: number; rare: number },
  target: { hf: number; common: number; rare: number }
): Tier {
  if (current.hf < target.hf) return "hf";
  if (current.common < target.common) return "common";
  return "rare";
}

/**
 * Smart draw: respects tier composition + severe caps.
 * Use for initial deal and replacement draws.
 */
export function drawRandomCardIndicesSmart(
  cards: { severity: string; tier?: string }[],
  count: number,
  mode: string | null,
  handSize: number,
  currentHandIndices: number[]
): number[] {
  if (cards.length === 0 || count <= 0) return [];

  const target = getTargetTierCounts(handSize);
  const maxSevere = getMaxSevereCardsInHand(mode, handSize);

  const simulatedHand = [...currentHandIndices];
  const drawn: number[] = [];

  const poolForTier = (tier: Tier, allowSevere: boolean) =>
    cards
      .map((c, idx) => {
        if ((c.tier ?? "common") !== tier) return -1;
        if (!allowSevere && c.severity === "severe") return -1;
        return idx;
      })
      .filter((idx) => idx >= 0);

  for (let i = 0; i < count; i++) {
    const { severeCount, tierCounts } = summarizeHand(cards, simulatedHand);
    const canDrawSevere = severeCount < maxSevere;
    const desiredTier = chooseNeededTier(tierCounts, target);

    let pool = poolForTier(desiredTier, canDrawSevere);

    if (pool.length === 0) {
      const fallbackOrder: Tier[] =
        desiredTier === "hf"
          ? ["common", "rare"]
          : desiredTier === "common"
            ? ["hf", "rare"]
            : ["hf", "common"];
      for (const t of fallbackOrder) {
        pool = poolForTier(t, canDrawSevere);
        if (pool.length > 0) break;
      }
    }

    if (pool.length === 0) {
      pool = cards.map((_, idx) => idx);
    }

    const poolIdx = drawRandomCardIndex(pool.length);
    const cardIdx = pool[poolIdx];
    drawn.push(cardIdx);
    simulatedHand.push(cardIdx);
  }

  return drawn;
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
