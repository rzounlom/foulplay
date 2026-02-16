import {
  drawRandomCardIndex,
  drawRandomCardIndices,
  initializeGameState,
  advanceTurn,
  type GameState,
} from "@/lib/game/engine";

describe("Game Engine", () => {
  describe("drawRandomCardIndex", () => {
    it("should return an index in valid range", () => {
      const cardCount = 50;
      for (let i = 0; i < 100; i++) {
        const index = drawRandomCardIndex(cardCount);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(cardCount);
      }
    });

    it("should throw when cardCount is 0", () => {
      expect(() => drawRandomCardIndex(0)).toThrow("cardCount must be positive");
    });

    it("should throw when cardCount is negative", () => {
      expect(() => drawRandomCardIndex(-1)).toThrow("cardCount must be positive");
    });

    it("should return 0 when cardCount is 1", () => {
      const index = drawRandomCardIndex(1);
      expect(index).toBe(0);
    });
  });

  describe("drawRandomCardIndices", () => {
    it("should return the requested number of indices", () => {
      const indices = drawRandomCardIndices(50, 5);
      expect(indices).toHaveLength(5);
    });

    it("should return indices in valid range", () => {
      const indices = drawRandomCardIndices(50, 20);
      indices.forEach((index) => {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(50);
      });
    });

    it("should allow duplicates (equal probability, cards never run out)", () => {
      const indices = drawRandomCardIndices(5, 100);
      expect(indices).toHaveLength(100);
      const uniqueCount = new Set(indices).size;
      expect(uniqueCount).toBeLessThanOrEqual(5);
      // With 100 draws from 5 cards, we expect many duplicates
    });

    it("should return empty array when count is 0", () => {
      const indices = drawRandomCardIndices(50, 0);
      expect(indices).toEqual([]);
    });

    it("should return empty array when cardCount is 0", () => {
      const indices = drawRandomCardIndices(0, 5);
      expect(indices).toEqual([]);
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
      expect(state.deck).toEqual([]);
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

    it("should not populate deck (cards drawn via random indices)", () => {
      const state = initializeGameState("room1", ["player1"], "football");
      expect(state.deck).toEqual([]);
      expect(state.drawnCards).toEqual([]);
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
        deck: [],
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
        deck: [],
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
        deck: [],
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
        deck: [],
        drawnCards: [],
      };

      const newState = advanceTurn(state, []);
      expect(newState).toEqual(state);
    });
  });
});
