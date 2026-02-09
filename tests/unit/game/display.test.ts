import {
  getCardDescriptionForDisplay,
  isNonDrinkingMode,
} from "@/lib/game/display";

describe("Display helpers", () => {
  describe("getCardDescriptionForDisplay", () => {
    it("returns generic text when mode is non-drinking", () => {
      expect(
        getCardDescriptionForDisplay("Drink 2 sips when this happens.", "non-drinking")
      ).toBe("Earn points when this event occurs.");
    });

    it("returns original description when mode is not non-drinking", () => {
      const desc = "Drink 2 sips when this happens.";
      expect(getCardDescriptionForDisplay(desc, "casual")).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, "party")).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, "lit")).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, null)).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, "")).toBe(desc);
    });

    it("returns generic text when mode is non-drinking even if description is empty", () => {
      expect(getCardDescriptionForDisplay("", "non-drinking")).toBe(
        "Earn points when this event occurs."
      );
    });
  });

  describe("isNonDrinkingMode", () => {
    it("returns true only for non-drinking mode", () => {
      expect(isNonDrinkingMode("non-drinking")).toBe(true);
    });

    it("returns false for other modes and null/empty", () => {
      expect(isNonDrinkingMode("casual")).toBe(false);
      expect(isNonDrinkingMode("party")).toBe(false);
      expect(isNonDrinkingMode("lit")).toBe(false);
      expect(isNonDrinkingMode(null)).toBe(false);
      expect(isNonDrinkingMode("")).toBe(false);
    });
  });
});
