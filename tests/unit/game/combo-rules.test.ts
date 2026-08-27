import {
  cardShowsComboInsight,
  computeSelectionComboFeedback,
  getTitleClusterIndex,
} from "@/lib/game/combo-rules";
import { buildIdentityGroups } from "@/lib/game/card-identity";

const passCard = {
  id: "def_pass",
  title: "Complete Pass",
  severity: "mild",
  tier: "common",
  points: 1,
};

const tdCard = {
  id: "def_td",
  title: "Touchdown",
  severity: "severe",
  tier: "rare",
  points: 5,
};

const hfCard = {
  id: "def_hf",
  title: "Commercial Break",
  severity: "mild",
  tier: "hf",
  points: 1,
};

describe("combo-rules", () => {
  describe("getTitleClusterIndex", () => {
    it("maps related titles to the same cluster", () => {
      expect(getTitleClusterIndex("Complete Pass")).toBe(
        getTitleClusterIndex("Dropped Pass"),
      );
      expect(getTitleClusterIndex("Touchdown")).toBe(
        getTitleClusterIndex("Field Goal"),
      );
    });

    it("returns null for unrelated titles", () => {
      expect(getTitleClusterIndex("Halftime Show")).toBeNull();
    });
  });

  describe("cardShowsComboInsight", () => {
    it("flags duplicates in hand", () => {
      expect(
        cardShowsComboInsight(passCard, {
          hand: [passCard, passCard],
          identityGroupSize: 2,
        }),
      ).toBe(true);
    });

    it("flags cards when another hand card shares an event cluster", () => {
      expect(
        cardShowsComboInsight(passCard, {
          hand: [passCard, { ...passCard, id: "def_drop", title: "Dropped Pass" }],
          identityGroupSize: 1,
        }),
      ).toBe(true);
    });

    it("does not flag isolated mild HF cards without hand overlap", () => {
      expect(
        cardShowsComboInsight(hfCard, {
          hand: [hfCard],
          identityGroupSize: 1,
        }),
      ).toBe(false);
    });

    it("does not flag isolated rare cards without cluster overlap", () => {
      expect(
        cardShowsComboInsight(tdCard, {
          hand: [tdCard],
          identityGroupSize: 1,
        }),
      ).toBe(false);
    });
  });

  describe("computeSelectionComboFeedback", () => {
    it("returns nothing for a single-card selection", () => {
      const groups = buildIdentityGroups([
        { id: "i1", card: passCard },
      ]);
      expect(
        computeSelectionComboFeedback([passCard], [passCard], groups, ["i1"]),
      ).toEqual({ comboLine: null, bigSwingLine: null });
    });

    it("shows combo when two cards share a cluster", () => {
      const dropped = { ...passCard, id: "def_drop", title: "Dropped Pass" };
      const hand = [
        { id: "i1", card: passCard },
        { id: "i2", card: dropped },
      ];
      const groups = buildIdentityGroups(hand);
      expect(
        computeSelectionComboFeedback(
          [passCard, dropped],
          hand.map((h) => h.card),
          groups,
          ["i1", "i2"],
        ),
      ).toEqual({
        comboLine: "🔗 Combo potential",
        bigSwingLine: null,
      });
    });

    it("shows big swing for three-card combo selections", () => {
      const dropped = { ...passCard, id: "def_drop", title: "Dropped Pass" };
      const interception = {
        ...passCard,
        id: "def_int",
        title: "Interception",
      };
      const hand = [
        { id: "i1", card: passCard },
        { id: "i2", card: dropped },
        { id: "i3", card: interception },
      ];
      const groups = buildIdentityGroups(hand);
      const selected = [passCard, dropped, interception];
      expect(
        computeSelectionComboFeedback(
          selected,
          hand.map((h) => h.card),
          groups,
          ["i1", "i2", "i3"],
        ).bigSwingLine,
      ).toBe("Big swing if these hit 😈");
    });

    it("shows combo when two HF cards are selected together", () => {
      const hfB = { ...hfCard, id: "def_hf2", title: "Beer Commercial" };
      const hand = [
        { id: "i1", card: hfCard },
        { id: "i2", card: hfB },
      ];
      const groups = buildIdentityGroups(hand);
      expect(
        computeSelectionComboFeedback(
          [hfCard, hfB],
          hand.map((h) => h.card),
          groups,
          ["i1", "i2"],
        ),
      ).toEqual({
        comboLine: "🔗 Combo potential",
        bigSwingLine: null,
      });
    });

    it("does not show combo for two unrelated low-tier cards", () => {
      const unrelatedA = {
        id: "a",
        title: "Halftime Show",
        severity: "moderate",
        tier: "rare",
        points: 3,
      };
      const unrelatedB = {
        id: "b",
        title: "Coach Challenge",
        severity: "moderate",
        tier: "rare",
        points: 3,
      };
      const hand = [
        { id: "i1", card: unrelatedA },
        { id: "i2", card: unrelatedB },
      ];
      const groups = buildIdentityGroups(hand);
      expect(
        computeSelectionComboFeedback(
          [unrelatedA, unrelatedB],
          hand.map((h) => h.card),
          groups,
          ["i1", "i2"],
        ),
      ).toEqual({ comboLine: null, bigSwingLine: null });
    });
  });
});
