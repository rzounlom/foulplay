import {
  BASKETBALL_CARDS,
  FOOTBALL_CARDS,
} from "@/lib/game/cards";
import {
  BASKETBALL_LAUNCH_TITLES,
  FOOTBALL_LAUNCH_TITLES,
  filterDealableCards,
} from "@/lib/game/launch-decks";

describe("launch decks", () => {
  it("includes Incomplete Pass, Made 2-Pointer, and Missed Jumper in definitions", () => {
    expect(FOOTBALL_CARDS.some((card) => card.title === "Incomplete Pass")).toBe(
      true,
    );
    expect(
      BASKETBALL_CARDS.some((card) => card.title === "Made 2-Pointer"),
    ).toBe(true);
    expect(
      BASKETBALL_CARDS.some((card) => card.title === "Missed Jumper"),
    ).toBe(true);
  });

  it("filters football dealing to the launch allowlist and drops commercials", () => {
    const dealt = filterDealableCards("football", FOOTBALL_CARDS);
    expect(dealt.length).toBeGreaterThanOrEqual(12);
    expect(dealt.length).toBeLessThanOrEqual(FOOTBALL_LAUNCH_TITLES.size);
    expect(dealt.every((card) => FOOTBALL_LAUNCH_TITLES.has(card.title))).toBe(
      true,
    );
    expect(dealt.some((card) => card.title === "Beer Commercial")).toBe(false);
    expect(dealt.some((card) => card.title === "Player Wearing Gloves")).toBe(
      false,
    );
    expect(dealt.some((card) => card.title === "Complete Pass")).toBe(true);
  });

  it("filters basketball dealing to the launch allowlist", () => {
    const dealt = filterDealableCards("basketball", BASKETBALL_CARDS);
    expect(dealt.length).toBeGreaterThanOrEqual(12);
    expect(dealt.length).toBeLessThanOrEqual(BASKETBALL_LAUNCH_TITLES.size);
    expect(
      dealt.every((card) => BASKETBALL_LAUNCH_TITLES.has(card.title)),
    ).toBe(true);
    expect(dealt.some((card) => card.title === "Kiss Cam / Fan Cam")).toBe(
      false,
    );
    expect(dealt.some((card) => card.title === "Made 3-Pointer")).toBe(true);
  });

  it("falls back to the full sport catalog if too few allowlisted cards exist in DB", () => {
    const sparse = [
      { title: "Complete Pass", tier: "common" },
      { title: "Beer Commercial", tier: "hf" },
    ];
    expect(filterDealableCards("football", sparse)).toEqual(sparse);
  });
});
