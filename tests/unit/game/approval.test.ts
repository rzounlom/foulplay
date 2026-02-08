import {
  requiredApprovals,
  canResolveSubmission,
  getVoteCounts,
} from "@/lib/game/approval";

describe("Approval Logic", () => {
  describe("requiredApprovals", () => {
    it("should return 1 for 0 players (edge case)", () => {
      expect(requiredApprovals(0)).toBe(1);
    });

    it("should return 1 for single player", () => {
      expect(requiredApprovals(1)).toBe(1);
    });

    it("should return 1 for 2 players", () => {
      expect(requiredApprovals(2)).toBe(1);
    });

    it("should return 2 for 3 players", () => {
      expect(requiredApprovals(3)).toBe(2);
    });

    it("should return 2 for 4 players", () => {
      expect(requiredApprovals(4)).toBe(2);
    });

    it("should return 3 for 5 players", () => {
      expect(requiredApprovals(5)).toBe(3);
    });

    it("should return 3 for 6 players", () => {
      expect(requiredApprovals(6)).toBe(3);
    });

    it("should use majority rule (ceil of half)", () => {
      expect(requiredApprovals(7)).toBe(4); // ceil(7/2) = 4
      expect(requiredApprovals(8)).toBe(4); // ceil(8/2) = 4
      expect(requiredApprovals(9)).toBe(5); // ceil(9/2) = 5
    });
  });

  describe("canResolveSubmission", () => {
    it("should approve when approval threshold is met", () => {
      const result = canResolveSubmission(5, 3, 0);
      expect(result).toBe("approved");
    });

    it("should reject when rejection threshold is met", () => {
      const result = canResolveSubmission(5, 0, 3);
      expect(result).toBe("rejected");
    });

    it("should return pending when neither threshold is met", () => {
      const result = canResolveSubmission(5, 1, 1);
      expect(result).toBe("pending");
    });

    it("should approve when all players approve", () => {
      const result = canResolveSubmission(5, 5, 0);
      expect(result).toBe("approved");
    });

    it("should reject when all players reject", () => {
      const result = canResolveSubmission(5, 0, 5);
      expect(result).toBe("rejected");
    });

    it("should use majority when all players voted but threshold not met", () => {
      // 5 players, 2 approve, 3 reject - majority rejects
      const result = canResolveSubmission(5, 2, 3);
      expect(result).toBe("rejected");
    });

    it("should approve when majority approves (all voted)", () => {
      // 5 players, 3 approve, 2 reject - majority approves
      const result = canResolveSubmission(5, 3, 2);
      expect(result).toBe("approved");
    });

    it("should approve when both thresholds are met (approvals checked first)", () => {
      // 4 players, 2 approve, 2 reject - both meet threshold, but approvals are checked first
      // requiredApprovals(4) = 2, so 2 approvals >= 2, returns "approved"
      const result = canResolveSubmission(4, 2, 2);
      expect(result).toBe("approved");
    });

    it("should handle edge case with 2 players", () => {
      expect(canResolveSubmission(2, 1, 0)).toBe("approved");
      expect(canResolveSubmission(2, 0, 1)).toBe("rejected");
      // 2 players, 1 approve, 1 reject - approvals checked first, 1 >= 1, so approved
      expect(canResolveSubmission(2, 1, 1)).toBe("approved");
    });
  });

  describe("getVoteCounts", () => {
    it("should count approvals correctly", () => {
      const votes = [
        { vote: true },
        { vote: true },
        { vote: false },
      ];
      const counts = getVoteCounts(votes);
      expect(counts.approvals).toBe(2);
      expect(counts.rejections).toBe(1);
      expect(counts.total).toBe(3);
    });

    it("should count rejections correctly", () => {
      const votes = [
        { vote: false },
        { vote: false },
        { vote: false },
      ];
      const counts = getVoteCounts(votes);
      expect(counts.approvals).toBe(0);
      expect(counts.rejections).toBe(3);
      expect(counts.total).toBe(3);
    });

    it("should handle empty votes array", () => {
      const counts = getVoteCounts([]);
      expect(counts.approvals).toBe(0);
      expect(counts.rejections).toBe(0);
      expect(counts.total).toBe(0);
    });

    it("should handle mixed votes", () => {
      const votes = [
        { vote: true },
        { vote: false },
        { vote: true },
        { vote: true },
        { vote: false },
      ];
      const counts = getVoteCounts(votes);
      expect(counts.approvals).toBe(3);
      expect(counts.rejections).toBe(2);
      expect(counts.total).toBe(5);
    });
  });
});
