/**
 * Approval logic utilities for FoulPlay
 * Functions for calculating approval thresholds and checking submission status
 */

/**
 * Calculate the number of approvals required based on total players
 * Uses majority rule: (totalPlayers / 2) + 1, rounded up
 */
export function requiredApprovals(totalPlayers: number): number {
  if (totalPlayers < 2) {
    return 1;
  }
  // Majority rule: need more than half
  return Math.ceil(totalPlayers / 2);
}

/**
 * Check if a submission can be resolved based on votes.
 * Uses totalPlayers for thresholds (50% majority rule).
 * Uses eligibleVoterCount for "all voted" early completion (defaults to totalPlayers).
 * When submitter cannot vote, pass eligibleVoterCount = totalPlayers - 1.
 *
 * Returns:
 * - "approved" if approval threshold is met
 * - "rejected" if rejection threshold is met (more than half reject)
 * - "pending" if neither threshold is met
 */
export function canResolveSubmission(
  totalPlayers: number,
  approvalVotes: number,
  rejectionVotes: number,
  eligibleVoterCount?: number
): "approved" | "rejected" | "pending" {
  const required = requiredApprovals(totalPlayers);
  const totalVotes = approvalVotes + rejectionVotes;
  const votersForAllVoted = eligibleVoterCount ?? totalPlayers;

  // No votes yet: cannot resolve from votes; remains pending (e.g. for auto-accept at timeout)
  if (totalVotes === 0) {
    return "pending";
  }

  // If we have enough approvals, approve
  if (approvalVotes >= required) {
    return "approved";
  }

  // If we have enough rejections (more than half), reject
  const rejectionThreshold = Math.ceil(totalPlayers / 2);
  if (rejectionVotes >= rejectionThreshold) {
    return "rejected";
  }

  // If all eligible voters have voted, resolve by majority (immediate completion)
  if (totalVotes >= votersForAllVoted) {
    return approvalVotes > rejectionVotes ? "approved" : "rejected";
  }

  return "pending";
}

/**
 * Get the current vote counts for a submission
 */
export interface VoteCounts {
  approvals: number;
  rejections: number;
  total: number;
}

export function getVoteCounts(votes: { vote: boolean }[]): VoteCounts {
  const approvals = votes.filter((v) => v.vote === true).length;
  const rejections = votes.filter((v) => v.vote === false).length;

  return {
    approvals,
    rejections,
    total: votes.length,
  };
}
