import {
  effectiveAllowJoinInProgress,
  roomAllowsMidGameJoin,
} from "@/lib/rooms/public-chaos-invariant";

describe("public-chaos-invariant", () => {
  describe("roomAllowsMidGameJoin", () => {
    it("allows lobby regardless of flags", () => {
      expect(
        roomAllowsMidGameJoin({
          status: "lobby",
          isPublicChaos: false,
          allowJoinInProgress: false,
        }),
      ).toBe(true);
    });

    it("allows active public chaos even when allowJoinInProgress is false (legacy row)", () => {
      expect(
        roomAllowsMidGameJoin({
          status: "active",
          isPublicChaos: true,
          allowJoinInProgress: false,
        }),
      ).toBe(true);
    });

    it("blocks active private room when join-in-progress is off", () => {
      expect(
        roomAllowsMidGameJoin({
          status: "active",
          isPublicChaos: false,
          allowJoinInProgress: false,
        }),
      ).toBe(false);
    });

    it("allows active private room when join-in-progress is on", () => {
      expect(
        roomAllowsMidGameJoin({
          status: "active",
          isPublicChaos: false,
          allowJoinInProgress: true,
        }),
      ).toBe(true);
    });
  });

  describe("effectiveAllowJoinInProgress", () => {
    it("is true for public chaos even if stored false", () => {
      expect(
        effectiveAllowJoinInProgress({
          isPublicChaos: true,
          allowJoinInProgress: false,
        }),
      ).toBe(true);
    });

    it("follows stored value for private rooms", () => {
      expect(
        effectiveAllowJoinInProgress({
          isPublicChaos: false,
          allowJoinInProgress: false,
        }),
      ).toBe(false);
    });
  });
});
