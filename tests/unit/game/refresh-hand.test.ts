import { REFRESH_HAND_COOLDOWN_MS } from "@/lib/game/launch-scope";
import {
  evaluateRefreshHand,
  getRefreshHandEligibleAt,
} from "@/lib/game/refresh-hand";

describe("refresh-hand eligibility", () => {
  const join = new Date("2026-11-23T17:00:00.000Z");

  it("starts the clock at join when the player has never submitted", () => {
    const availableAt = getRefreshHandEligibleAt({
      playerJoinedAt: join,
      lastSubmissionAt: null,
      newestDrawnAt: join,
    });
    expect(availableAt.getTime()).toBe(join.getTime() + REFRESH_HAND_COOLDOWN_MS);
  });

  it("blocks while a submission is pending even if the cooldown elapsed", () => {
    const now = new Date(join.getTime() + REFRESH_HAND_COOLDOWN_MS + 1_000);
    const result = evaluateRefreshHand({
      now,
      roomStatus: "active",
      hasPendingSubmission: true,
      intermissionActive: false,
      drawnCount: 6,
      playerJoinedAt: join,
      lastSubmissionAt: join,
      newestDrawnAt: join,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("pending");
  });

  it("does not retire an empty or submitted-only hand", () => {
    const now = new Date(join.getTime() + REFRESH_HAND_COOLDOWN_MS + 1_000);
    const result = evaluateRefreshHand({
      now,
      roomStatus: "active",
      hasPendingSubmission: false,
      intermissionActive: false,
      drawnCount: 0,
      playerJoinedAt: join,
      lastSubmissionAt: null,
      newestDrawnAt: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });

  it("uses the newest drawn card so a successful refresh cannot immediately repeat", () => {
    const dealt = new Date(join.getTime() + REFRESH_HAND_COOLDOWN_MS);
    const now = new Date(dealt.getTime() + 1_000);
    const result = evaluateRefreshHand({
      now,
      roomStatus: "active",
      hasPendingSubmission: false,
      intermissionActive: false,
      drawnCount: 6,
      playerJoinedAt: join,
      lastSubmissionAt: null,
      newestDrawnAt: dealt,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("cooldown");
      expect(result.availableAt.getTime()).toBe(
        dealt.getTime() + REFRESH_HAND_COOLDOWN_MS,
      );
    }
  });

  it("allows refresh after 5 quiet minutes with drawn cards and no pending vote", () => {
    const now = new Date(join.getTime() + REFRESH_HAND_COOLDOWN_MS);
    const result = evaluateRefreshHand({
      now,
      roomStatus: "active",
      hasPendingSubmission: false,
      intermissionActive: false,
      drawnCount: 6,
      playerJoinedAt: join,
      lastSubmissionAt: null,
      newestDrawnAt: join,
    });
    expect(result.ok).toBe(true);
  });
});
