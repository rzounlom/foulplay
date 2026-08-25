import {
  userCanAccessDrinkingMode,
  DRINKING_MODE_ACCESS_ERROR,
} from "@/lib/user/age-gate";
import { isDrinkingMode } from "@/lib/game/modes";

describe("Age gate", () => {
  describe("userCanAccessDrinkingMode", () => {
    it("allows only explicit 21+ confirmation", () => {
      expect(userCanAccessDrinkingMode(true)).toBe(true);
      expect(userCanAccessDrinkingMode(false)).toBe(false);
      expect(userCanAccessDrinkingMode(null)).toBe(false);
      expect(userCanAccessDrinkingMode(undefined)).toBe(false);
    });
  });

  describe("isDrinkingMode", () => {
    it("treats non-drinking as safe for under-21 users", () => {
      expect(isDrinkingMode("non-drinking")).toBe(false);
      expect(isDrinkingMode("party")).toBe(true);
    });
  });

  describe("DRINKING_MODE_ACCESS_ERROR", () => {
    it("mentions non-drinking mode fallback", () => {
      expect(DRINKING_MODE_ACCESS_ERROR).toMatch(/non-drinking/i);
    });
  });
});
