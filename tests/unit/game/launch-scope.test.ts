import {
  LAUNCH_MODES,
  LAUNCH_PUBLIC_CHAOS_VISIBLE,
  LAUNCH_ROUND_CONTROLS_VISIBLE,
  LAUNCH_REFRESH_HAND_ENABLED,
  REFRESH_HAND_COOLDOWN_MS,
  isLaunchSelectableMode,
  resolveLaunchQuarterClearing,
} from "@/lib/game/launch-scope";

describe("launch scope", () => {
  it("hides Public Chaos and round controls for Wednesday web", () => {
    expect(LAUNCH_PUBLIC_CHAOS_VISIBLE).toBe(false);
    expect(LAUNCH_ROUND_CONTROLS_VISIBLE).toBe(false);
  });

  it("exposes only Non-drinking and Party as selectable modes", () => {
    expect([...LAUNCH_MODES]).toEqual(["non-drinking", "party"]);
    expect(isLaunchSelectableMode("non-drinking")).toBe(true);
    expect(isLaunchSelectableMode("party")).toBe(true);
    expect(isLaunchSelectableMode("casual")).toBe(false);
    expect(isLaunchSelectableMode("lit")).toBe(false);
    expect(isLaunchSelectableMode("anything_goes")).toBe(false);
  });

  it("keeps a five-minute refresh-hand cooldown", () => {
    expect(LAUNCH_REFRESH_HAND_ENABLED).toBe(true);
    expect(REFRESH_HAND_COOLDOWN_MS).toBe(5 * 60 * 1000);
  });

  it("refuses round clearing on new rooms while launch hides round controls", () => {
    expect(resolveLaunchQuarterClearing(true)).toBe(false);
    expect(resolveLaunchQuarterClearing(false)).toBe(false);
    expect(resolveLaunchQuarterClearing(undefined)).toBe(false);
  });
});
