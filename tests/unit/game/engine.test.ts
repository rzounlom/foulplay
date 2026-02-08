import {
  generateDeck,
  generateDeckForMode,
  drawNextCard,
  drawMultipleCards,
  initializeGameState,
  advanceTurn,
  type GameState,
} from "@/lib/game/engine";

describe("Game Engine", () => {
  describe("generateDeck", () => {
    it("should generate a deck with the correct number of cards", () => {
      const deck = generateDeck("test-seed", 100);
      expect(deck).toHaveLength(100);
    });

    it("should generate a deck with unique indices", () => {
      const deck = generateDeck("test-seed", 100);
      const uniqueIndices = new Set(deck);
      expect(uniqueIndices.size).toBe(100);
    });

    it("should generate the same deck for the same seed", () => {
      const deck1 = generateDeck("test-seed", 100);
      const deck2 = generateDeck("test-seed", 100);
      expect(deck1).toEqual(deck2);
    });

    it("should generate different decks for different seeds", () => {
      const deck1 = generateDeck("seed1", 100);
      const deck2 = generateDeck("seed2", 100);
      expect(deck1).not.toEqual(deck2);
    });

    it("should generate indices from 0 to cardCount-1", () => {
      const deck = generateDeck("test-seed", 50);
      deck.forEach((index) => {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(50);
      });
    });
  });

  describe("generateDeckForMode", () => {
    // Indices 0,1 = mild, 2 = moderate, 3 = severe
    const severities = [
      "mild",
      "mild",
      "moderate",
      "severe",
    ] as const;

    const countBySeverity = (deck: number[]) => ({
      mild: deck.filter((i) => i <= 1).length,
      moderate: deck.filter((i) => i === 2).length,
      severe: deck.filter((i) => i === 3).length,
    });

    it("should return same length as card count", () => {
      const deck = generateDeckForMode("seed", severities, "casual");
      expect(deck).toHaveLength(severities.length);
    });

    it("should be deterministic for same seed and mode", () => {
      const deck1 = generateDeckForMode("seed", severities, "casual");
      const deck2 = generateDeckForMode("seed", severities, "casual");
      expect(deck1).toEqual(deck2);
    });

    it("casual mode should have ~70% mild, ~25% moderate, ~5% severe", () => {
      const deck = generateDeckForMode("seed", severities, "casual");
      const counts = countBySeverity(deck);
      // 4 cards: 70% = 2.8 → 2 mild, 25% = 1 mod, 5% = 0.2 → 0 severe, remainder → 1 severe
      expect(counts.mild).toBeGreaterThanOrEqual(2);
      expect(counts.moderate).toBe(1);
      expect(counts.severe).toBeLessThanOrEqual(1);
    });

    it("lit mode should have more severe than casual (or cap when pool is small)", () => {
      const deck = generateDeckForMode("seed", severities, "lit");
      const counts = countBySeverity(deck);
      // 4 cards: target 1 mild, 1 mod, 2 severe but severe pool has only 1 card → remainder goes to mild
      expect(deck).toHaveLength(severities.length);
      expect(counts.moderate).toBe(1);
      expect(counts.severe).toBe(1); // only one severe index in pool
      expect(counts.mild + counts.moderate + counts.severe).toBe(4);
    });

    it("party mode should have ~50% mild, ~35% moderate, ~15% severe", () => {
      const deck = generateDeckForMode("seed", severities, "party");
      expect(deck).toHaveLength(severities.length);
      const counts = countBySeverity(deck);
      // 4 cards: 2 mild, 1 mod, 1 severe
      expect(counts.mild).toBe(2);
      expect(counts.moderate).toBe(1);
      expect(counts.severe).toBe(1);
    });

    it("non-drinking mode should use casual mix", () => {
      const deck = generateDeckForMode("seed", severities, "non-drinking");
      const counts = countBySeverity(deck);
      expect(counts.mild).toBeGreaterThanOrEqual(2);
      expect(counts.moderate).toBe(1);
    });
  });

  describe("drawNextCard", () => {
    it("should draw a card from the deck", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2, 3, 4],
        drawnCards: [],
      };

      const result = drawNextCard(state);
      expect(result.cardIndex).toBeDefined();
      expect(result.cardIndex).toBeGreaterThanOrEqual(0);
      expect(result.newState.drawnCards).toContain(result.cardIndex);
    });

    it("should not draw the same card twice", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2, 3, 4],
        drawnCards: [0, 1],
      };

      const result = drawNextCard(state);
      expect(result.cardIndex).not.toBe(0);
      expect(result.cardIndex).not.toBe(1);
    });

    it("should reshuffle when deck is exhausted", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2],
        drawnCards: [0, 1, 2],
      };

      const result = drawNextCard(state);
      expect(result.cardIndex).toBeDefined();
      expect(result.newState.drawnCards).toHaveLength(1);
    });

    it("should update drawnCards in new state", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2, 3, 4],
        drawnCards: [0],
      };

      const result = drawNextCard(state);
      expect(result.newState.drawnCards.length).toBe(2);
      expect(result.newState.drawnCards).toContain(0);
      expect(result.newState.drawnCards).toContain(result.cardIndex);
    });
  });

  describe("drawMultipleCards", () => {
    it("should draw multiple cards", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        drawnCards: [],
      };

      const result = drawMultipleCards(state, 5);
      expect(result.cardIndices).toHaveLength(5);
      expect(result.newState.drawnCards).toHaveLength(5);
    });

    it("should draw unique cards", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        drawnCards: [],
      };

      const result = drawMultipleCards(state, 5);
      const uniqueIndices = new Set(result.cardIndices);
      expect(uniqueIndices.size).toBe(5);
    });

    it("should handle drawing more cards than available", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2],
        drawnCards: [],
      };

      const result = drawMultipleCards(state, 10);
      expect(result.cardIndices.length).toBeGreaterThan(0);
      expect(result.cardIndices.length).toBeLessThanOrEqual(10);
    });
  });

  describe("initializeGameState", () => {
    it("should initialize game state with correct structure", () => {
      const state = initializeGameState(
        "room1",
        ["player1", "player2"],
        "football"
      );

      expect(state.roomId).toBe("room1");
      expect(state.currentTurnPlayerId).toBe("player1");
      expect(state.deckSeed).toBeDefined();
      expect(state.deck).toBeDefined();
      expect(state.drawnCards).toEqual([]);
      expect(state.activeCardInstanceId).toBeNull();
    });

    it("should use provided seed when given", () => {
      const state = initializeGameState(
        "room1",
        ["player1"],
        "football",
        "custom-seed"
      );

      expect(state.deckSeed).toBe("custom-seed");
    });

    it("should generate deck with correct card count for sport", () => {
      const state = initializeGameState("room1", ["player1"], "football");
      // Football should have 100 cards
      expect(state.deck).toHaveLength(100);
    });

    it("should throw error when no players provided", () => {
      expect(() => {
        initializeGameState("room1", [], "football");
      }).toThrow("Cannot initialize game with no players");
    });
  });

  describe("advanceTurn", () => {
    it("should advance to next player", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2],
        drawnCards: [],
      };

      const newState = advanceTurn(state, ["player1", "player2", "player3"]);
      expect(newState.currentTurnPlayerId).toBe("player2");
    });

    it("should cycle back to first player", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player3",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2],
        drawnCards: [],
      };

      const newState = advanceTurn(state, ["player1", "player2", "player3"]);
      expect(newState.currentTurnPlayerId).toBe("player1");
    });

    it("should handle single player", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2],
        drawnCards: [],
      };

      const newState = advanceTurn(state, ["player1"]);
      expect(newState.currentTurnPlayerId).toBe("player1");
    });

    it("should return same state when no players", () => {
      const state: GameState = {
        roomId: "room1",
        currentTurnPlayerId: "player1",
        activeCardInstanceId: null,
        deckSeed: "test-seed",
        deck: [0, 1, 2],
        drawnCards: [],
      };

      const newState = advanceTurn(state, []);
      expect(newState).toEqual(state);
    });
  });
});
