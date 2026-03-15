import {
  GAME_MODES,
  gameModeSchema,
  gameModeSchemaOptional,
  isValidGameMode,
} from "@/lib/game/modes";

describe("Game Modes", () => {
  describe("GAME_MODES", () => {
    it("includes all expected modes", () => {
      expect(GAME_MODES).toContain("casual");
      expect(GAME_MODES).toContain("party");
      expect(GAME_MODES).toContain("lit");
      expect(GAME_MODES).toContain("anything_goes");
      expect(GAME_MODES).toContain("non-drinking");
      expect(GAME_MODES).toHaveLength(5);
    });
  });

  describe("gameModeSchema", () => {
    it("accepts valid modes", () => {
      expect(gameModeSchema.parse("casual")).toBe("casual");
      expect(gameModeSchema.parse("party")).toBe("party");
      expect(gameModeSchema.parse("lit")).toBe("lit");
      expect(gameModeSchema.parse("anything_goes")).toBe("anything_goes");
      expect(gameModeSchema.parse("non-drinking")).toBe("non-drinking");
    });

    it("rejects invalid modes", () => {
      expect(() => gameModeSchema.parse("invalid")).toThrow();
      expect(() => gameModeSchema.parse("")).toThrow();
      expect(() => gameModeSchema.parse("CUSTOM")).toThrow();
      expect(() => gameModeSchema.parse("casual ")).toThrow();
      expect(() => gameModeSchema.parse(123)).toThrow();
      expect(() => gameModeSchema.parse(null)).toThrow();
    });

    it("safeParse returns success for valid modes", () => {
      expect(gameModeSchema.safeParse("casual").success).toBe(true);
      expect(gameModeSchema.safeParse("anything_goes").success).toBe(true);
    });

    it("safeParse returns error for invalid modes", () => {
      expect(gameModeSchema.safeParse("invalid").success).toBe(false);
      expect(gameModeSchema.safeParse("").success).toBe(false);
    });
  });

  describe("gameModeSchemaOptional", () => {
    it("accepts valid modes", () => {
      expect(gameModeSchemaOptional.parse("casual")).toBe("casual");
      expect(gameModeSchemaOptional.parse("party")).toBe("party");
    });

    it("accepts undefined", () => {
      expect(gameModeSchemaOptional.parse(undefined)).toBeUndefined();
      expect(gameModeSchemaOptional.optional().parse(undefined)).toBeUndefined();
    });

    it("rejects invalid modes", () => {
      expect(() => gameModeSchemaOptional.parse("invalid")).toThrow();
      expect(() => gameModeSchemaOptional.parse("freeform")).toThrow();
    });
  });

  describe("isValidGameMode", () => {
    it("returns true for valid modes", () => {
      expect(isValidGameMode("casual")).toBe(true);
      expect(isValidGameMode("party")).toBe(true);
      expect(isValidGameMode("lit")).toBe(true);
      expect(isValidGameMode("anything_goes")).toBe(true);
      expect(isValidGameMode("non-drinking")).toBe(true);
    });

    it("returns false for invalid values", () => {
      expect(isValidGameMode("invalid")).toBe(false);
      expect(isValidGameMode("")).toBe(false);
      expect(isValidGameMode(null)).toBe(false);
      expect(isValidGameMode(123)).toBe(false);
    });
  });
});
