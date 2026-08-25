/**
 * Approval logic utilities for FoulPlay
 * Functions for calculating approval thresholds and checking submission status
 */

/**
 * Votes needed to approve or reject (same threshold both ways).
 * Small rooms (≤3): one other player's vote settles it.
 * Larger rooms: majority (ceil of half).
 */
export function voteThreshold(totalPlayers: number): number {
  if (totalPlayers <= 3) {
    return 1;
  }
  return Math.ceil(totalPlayers / 2);
}

/** @deprecated alias — use voteThreshold */
export function requiredApprovals(totalPlayers: number): number {
  return voteThreshold(totalPlayers);
}

export function requiredRejections(totalPlayers: number): number {
  return voteThreshold(totalPlayers);
}

/**
 * Check if a submission can be resolved based on votes.
 * Approve and reject use the same threshold; whichever side hits it first wins
 * (evaluated after each vote in the API).
 * Uses eligibleVoterCount for "all voted" early completion (defaults to totalPlayers).
 * When submitter cannot vote, pass eligibleVoterCount = totalPlayers - 1.
 */
export function canResolveSubmission(
  totalPlayers: number,
  approvalVotes: number,
  rejectionVotes: number,
  eligibleVoterCount?: number,
  /** When both thresholds are met, the vote that just settled it (API path). */
  decidingVote?: boolean
): "approved" | "rejected" | "pending" {
  const threshold = voteThreshold(totalPlayers);
  const totalVotes = approvalVotes + rejectionVotes;
  const votersForAllVoted = eligibleVoterCount ?? totalPlayers;

  if (totalVotes === 0) {
    return "pending";
  }

  const approvalMet = approvalVotes >= threshold;
  const rejectionMet = rejectionVotes >= threshold;

  if (approvalMet && rejectionMet) {
    if (decidingVote !== undefined) {
      return decidingVote ? "approved" : "rejected";
    }
    return "pending";
  }

  if (approvalMet) {
    return "approved";
  }

  if (rejectionMet) {
    return "rejected";
  }

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
