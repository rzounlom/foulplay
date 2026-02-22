import {
  getCardDescriptionForDisplay,
  isNonDrinkingMode,
  combinePenalties,
} from "@/lib/game/display";

describe("Display helpers", () => {
  describe("getCardDescriptionForDisplay", () => {
    it("returns generic text when mode is non-drinking", () => {
      expect(
        getCardDescriptionForDisplay("Take 2 drinks", "non-drinking")
      ).toBe("Earn points when this event occurs.");
    });

    it("returns generic text when mode is non-drinking even if description is empty", () => {
      expect(getCardDescriptionForDisplay("", "non-drinking")).toBe(
        "Earn points when this event occurs."
      );
    });

    describe("Take x drinks cards (mode-based penalty display)", () => {
      it("casual: returns base penalty as-is", () => {
        expect(getCardDescriptionForDisplay("Take a drink", "casual")).toBe("Take a drink");
        expect(getCardDescriptionForDisplay("Take 2 drinks", "casual")).toBe("Take 2 drinks");
        expect(getCardDescriptionForDisplay("Take 3 drinks", "casual")).toBe("Take 3 drinks");
      });

      it("party: Take x drinks → base + 1", () => {
        expect(getCardDescriptionForDisplay("Take a drink", "party")).toBe("Take 2 drinks");
        expect(getCardDescriptionForDisplay("Take 2 drinks", "party")).toBe("Take 3 drinks");
        expect(getCardDescriptionForDisplay("Take 3 drinks", "party")).toBe("Take 4 drinks");
      });

      it("lit: Take x drinks → base × 2", () => {
        expect(getCardDescriptionForDisplay("Take a drink", "lit")).toBe("Take 2 drinks");
        expect(getCardDescriptionForDisplay("Take 2 drinks", "lit")).toBe("Take 4 drinks");
        expect(getCardDescriptionForDisplay("Take 3 drinks", "lit")).toBe("Take 6 drinks");
      });

      it("severe penalties unchanged in all modes", () => {
        const severe = [
          "Take a shot",
          "Shotgun a beer",
          "Finish your drink",
          "Finish your drink + 1/2 another",
        ];
        for (const desc of severe) {
          expect(getCardDescriptionForDisplay(desc, "casual")).toBe(desc);
          expect(getCardDescriptionForDisplay(desc, "party")).toBe(desc);
          expect(getCardDescriptionForDisplay(desc, "lit")).toBe(desc);
        }
      });
    });

    it("returns original description for non-Take-x-drinks when mode is casual/party/lit", () => {
      const desc = "Do 10 push-ups when this happens.";
      expect(getCardDescriptionForDisplay(desc, "casual")).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, "party")).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, "lit")).toBe(desc);
    });

    it("returns original description when mode is null or unknown", () => {
      const desc = "Take 2 drinks";
      expect(getCardDescriptionForDisplay(desc, null)).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, "")).toBe(desc);
      expect(getCardDescriptionForDisplay(desc, "custom")).toBe(desc);
    });
  });

  describe("combinePenalties", () => {
    it("combines Take X drinks", () => {
      expect(combinePenalties(["Take 2 drinks", "Take 3 drinks"])).toEqual([
        "Take 5 drinks",
      ]);
      expect(combinePenalties(["Take a drink", "Take 2 drinks"])).toEqual([
        "Take 3 drinks",
      ]);
    });

    it("combines Take X shots", () => {
      expect(combinePenalties(["Take a shot", "Take a shot"])).toEqual([
        "Take 2 shots",
      ]);
      expect(combinePenalties(["Take a shot", "Take 2 shots"])).toEqual([
        "Take 3 shots",
      ]);
    });

    it("combines Shotgun X beers", () => {
      expect(combinePenalties(["Shotgun a beer", "Shotgun a beer"])).toEqual([
        "Shotgun 2 beers",
      ]);
    });

    it("combines Finish X drinks", () => {
      expect(
        combinePenalties(["Finish your drink", "Finish your drink"])
      ).toEqual(["Finish 2 drinks"]);
    });

    it("keeps mixed types separate", () => {
      expect(
        combinePenalties(["Take 2 drinks", "Take a shot", "Take 3 drinks"])
      ).toEqual(["Take 5 drinks", "Take a shot"]);
    });

    it("returns single penalty unchanged", () => {
      expect(combinePenalties(["Take 2 drinks"])).toEqual(["Take 2 drinks"]);
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
