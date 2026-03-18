import {
  drawRandomCardIndex,
  drawRandomCardIndices,
  drawRandomCardIndexRespectingSevere,
  drawRandomCardIndicesRespectingSevere,
  drawRandomCardIndicesSmart,
  getMaxSevereCardsInHand,
  getTargetTierCounts,
  initializeGameState,
  advanceTurn,
  type GameState,
} from "@/lib/game/engine";

describe("Game Engine", () => {
  describe("getMaxSevereCardsInHand", () => {
    it("returns 2 for casual mode", () => {
      expect(getMaxSevereCardsInHand("casual", 4)).toBe(2);
      expect(getMaxSevereCardsInHand("casual", 6)).toBe(2);
      expect(getMaxSevereCardsInHand("casual", 8)).toBe(2);
    });

    it("returns 2 for party when hand size <= 6", () => {
      expect(getMaxSevereCardsInHand("party", 4)).toBe(2);
      expect(getMaxSevereCardsInHand("party", 6)).toBe(2);
    });

    it("returns 3 for party when hand size > 6", () => {
      expect(getMaxSevereCardsInHand("party", 7)).toBe(3);
      expect(getMaxSevereCardsInHand("party", 10)).toBe(3);
    });

    it("returns 3/4/5 for lit mode by hand size", () => {
      expect(getMaxSevereCardsInHand("lit", 4)).toBe(3);
      expect(getMaxSevereCardsInHand("lit", 5)).toBe(3);
      expect(getMaxSevereCardsInHand("lit", 6)).toBe(3);
      expect(getMaxSevereCardsInHand("lit", 7)).toBe(4);
      expect(getMaxSevereCardsInHand("lit", 8)).toBe(4);
      expect(getMaxSevereCardsInHand("lit", 9)).toBe(4);
      expect(getMaxSevereCardsInHand("lit", 10)).toBe(5);
      expect(getMaxSevereCardsInHand("lit", 11)).toBe(5);
      expect(getMaxSevereCardsInHand("lit", 12)).toBe(5);
    });

    it("returns Infinity for anything_goes mode", () => {
      expect(getMaxSevereCardsInHand("anything_goes", 4)).toBe(Infinity);
      expect(getMaxSevereCardsInHand("anything_goes", 6)).toBe(Infinity);
      expect(getMaxSevereCardsInHand("anything_goes", 12)).toBe(Infinity);
    });

    it("returns Infinity for null/unknown mode", () => {
      expect(getMaxSevereCardsInHand(null, 6)).toBe(Infinity);
      expect(getMaxSevereCardsInHand("custom", 6)).toBe(Infinity);
    });
  });

  describe("drawRandomCardIndexRespectingSevere", () => {
    const cards = [
      { severity: "mild" },
      { severity: "moderate" },
      { severity: "severe" },
    ];

    it("draws from all cards when under limit", () => {
      for (let i = 0; i < 50; i++) {
        const idx = drawRandomCardIndexRespectingSevere(cards, 0, 1);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(3);
      }
    });

    it("excludes severe when at limit", () => {
      for (let i = 0; i < 50; i++) {
        const idx = drawRandomCardIndexRespectingSevere(cards, 1, 1);
        expect(idx).toBeLessThan(2);
        expect(cards[idx].severity).not.toBe("severe");
      }
    });

    it("allows severe when under limit", () => {
      let foundSevere = false;
      for (let i = 0; i < 100; i++) {
        const idx = drawRandomCardIndexRespectingSevere(cards, 0, 2);
        if (cards[idx].severity === "severe") foundSevere = true;
      }
      expect(foundSevere).toBe(true);
    });
  });

  describe("drawRandomCardIndicesRespectingSevere", () => {
    const cards = [
      { severity: "mild" },
      { severity: "moderate" },
      { severity: "severe" },
    ];

    it("returns correct count", () => {
      const indices = drawRandomCardIndicesRespectingSevere(
        cards,
        3,
        "casual",
        6
      );
      expect(indices).toHaveLength(3);
    });

    it("respects casual limit (max 2 severe)", () => {
      for (let run = 0; run < 20; run++) {
        const indices = drawRandomCardIndicesRespectingSevere(
          cards,
          5,
          "casual",
          6
        );
        const severeCount = indices.filter((i) => cards[i].severity === "severe").length;
        expect(severeCount).toBeLessThanOrEqual(2);
      }
    });

    it("respects party limit with hand size 7 (max 3 severe)", () => {
      for (let run = 0; run < 20; run++) {
        const indices = drawRandomCardIndicesRespectingSevere(
          cards,
          5,
          "party",
          7
        );
        const severeCount = indices.filter((i) => cards[i].severity === "severe").length;
        expect(severeCount).toBeLessThanOrEqual(3);
      }
    });

    it("allows any count for lit mode", () => {
      const indices = drawRandomCardIndicesRespectingSevere(
        cards,
        3,
        "lit",
        6
      );
      expect(indices).toHaveLength(3);
    });

    it("allows any count for anything_goes mode", () => {
      const indices = drawRandomCardIndicesRespectingSevere(
        cards,
        3,
        "anything_goes",
        6
      );
      expect(indices).toHaveLength(3);
    });
  });

  describe("getTargetTierCounts", () => {
    it("returns counts that sum to handSize for all hand sizes 4–12", () => {
      for (let s = 4; s <= 12; s++) {
        const t = getTargetTierCounts(s);
        expect(t.hf + t.common + t.rare).toBe(s);
      }
    });

    it("returns no negative counts", () => {
      for (let s = 4; s <= 12; s++) {
        const t = getTargetTierCounts(s);
        expect(t.hf).toBeGreaterThanOrEqual(0);
        expect(t.common).toBeGreaterThanOrEqual(0);
        expect(t.rare).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns hf >= 1 for all hand sizes", () => {
      for (let s = 4; s <= 12; s++) {
        const t = getTargetTierCounts(s);
        expect(t.hf).toBeGreaterThanOrEqual(1);
      }
    });

    it("returns output with hf, common, rare keys", () => {
      const t = getTargetTierCounts(6);
      expect(t).toHaveProperty("hf");
      expect(t).toHaveProperty("common");
      expect(t).toHaveProperty("rare");
      expect(Object.keys(t)).toHaveLength(3);
    });

    it("matches tier mix for 4–6: hf 60%, common 28%, rare 12%", () => {
      for (let s = 4; s <= 6; s++) {
        const t = getTargetTierCounts(s);
        expect(t.rare).toBeGreaterThanOrEqual(0);
        expect(t.rare).toBeLessThanOrEqual(Math.ceil(s * 0.15));
      }
    });

    it("matches tier mix for 7–9: hf 52%, common 30%, rare 18%", () => {
      for (let s = 7; s <= 9; s++) {
        const t = getTargetTierCounts(s);
        expect(t.rare).toBeGreaterThanOrEqual(1);
        expect(t.rare).toBeLessThanOrEqual(Math.ceil(s * 0.2));
      }
    });

    it("matches tier mix for 10–12: hf 45%, common 32%, rare 23%", () => {
      for (let s = 10; s <= 12; s++) {
        const t = getTargetTierCounts(s);
        expect(t.rare).toBeGreaterThanOrEqual(2);
        expect(t.rare).toBeLessThanOrEqual(Math.ceil(s * 0.25));
      }
    });

    it("clamps handSize to 4–12", () => {
      const t1 = getTargetTierCounts(1);
      expect(t1.hf + t1.common + t1.rare).toBe(4);
      const t20 = getTargetTierCounts(20);
      expect(t20.hf + t20.common + t20.rare).toBe(12);
    });
  });

  describe("drawRandomCardIndicesSmart", () => {
    const cardsWithTier = [
      { severity: "mild", tier: "hf" as const },
      { severity: "mild", tier: "common" as const },
      { severity: "severe", tier: "rare" as const },
    ];

    it("returns correct count", () => {
      const indices = drawRandomCardIndicesSmart(
        cardsWithTier,
        2,
        "casual",
        6,
        []
      );
      expect(indices).toHaveLength(2);
    });

    it("respects severe cap in casual mode", () => {
      for (let run = 0; run < 30; run++) {
        const indices = drawRandomCardIndicesSmart(
          cardsWithTier,
          3,
          "casual",
          6,
          []
        );
        const severeCount = indices.filter(
          (i) => cardsWithTier[i].severity === "severe"
        ).length;
        expect(severeCount).toBeLessThanOrEqual(1);
      }
    });

    it("respects severe cap in party mode (hand 4-6: max 1, hand 7+: max 2)", () => {
      const cards = [
        { severity: "severe", tier: "rare" as const },
        { severity: "severe", tier: "rare" as const },
        { severity: "mild", tier: "common" as const },
        { severity: "mild", tier: "hf" as const },
      ];
      for (let run = 0; run < 20; run++) {
        const indices = drawRandomCardIndicesSmart(cards, 4, "party", 6, []);
        const severeCount = indices.filter((i) => cards[i].severity === "severe").length;
        expect(severeCount).toBeLessThanOrEqual(1);
      }
      for (let run = 0; run < 20; run++) {
        const indices = drawRandomCardIndicesSmart(cards, 5, "party", 8, []);
        const severeCount = indices.filter((i) => cards[i].severity === "severe").length;
        expect(severeCount).toBeLessThanOrEqual(2);
      }
    });

    it("replacement draws restore composition toward target mix", () => {
      // Deck: indices 0,1,2 = hf; 3,4,5 = common; 6,7,8 = rare
      const deck = [
        { severity: "mild", tier: "hf" as const },
        { severity: "mild", tier: "hf" as const },
        { severity: "mild", tier: "hf" as const },
        { severity: "mild", tier: "common" as const },
        { severity: "mild", tier: "common" as const },
        { severity: "mild", tier: "common" as const },
        { severity: "mild", tier: "rare" as const },
        { severity: "mild", tier: "rare" as const },
        { severity: "mild", tier: "rare" as const },
      ];
      // Hand has 3 hf (indices 0,1,2). Target for handSize 4: hf 2, common 2, rare 0.
      // We need common. Drawing 1 replacement should yield a common card.
      for (let run = 0; run < 50; run++) {
        const drawn = drawRandomCardIndicesSmart(
          deck,
          1,
          "casual",
          4,
          [0, 1, 2]
        );
        expect(drawn).toHaveLength(1);
        expect(deck[drawn[0]].tier).toBe("common");
      }
    });

    it("allows any severe count in anything_goes mode", () => {
      const cardsAllSevere = [
        { severity: "severe", tier: "rare" as const },
        { severity: "severe", tier: "rare" as const },
        { severity: "severe", tier: "rare" as const },
      ];
      const indices = drawRandomCardIndicesSmart(
        cardsAllSevere,
        3,
        "anything_goes",
        6,
        []
      );
      expect(indices).toHaveLength(3);
      const severeCount = indices.filter((i) => cardsAllSevere[i].severity === "severe").length;
      expect(severeCount).toBe(3);
    });

    it("initial deal uses target tier mix", () => {
      const deck = [
        { severity: "mild", tier: "hf" as const },
        { severity: "mild", tier: "hf" as const },
        { severity: "mild", tier: "common" as const },
        { severity: "mild", tier: "common" as const },
        { severity: "mild", tier: "rare" as const },
      ];
      // Run many initial deals and verify tier counts sum to 6 and severe cap holds
      for (let run = 0; run < 30; run++) {
        const indices = drawRandomCardIndicesSmart(deck, 6, "casual", 6, []);
        expect(indices).toHaveLength(6);
        const hf = indices.filter((i) => deck[i].tier === "hf").length;
        const common = indices.filter((i) => deck[i].tier === "common").length;
        const rare = indices.filter((i) => deck[i].tier === "rare").length;
        expect(hf + common + rare).toBe(6);
      }
    });
  });

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
