"use client";

import { useState } from "react";

interface Card {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
  points: number;
}

interface Submission {
  id: string;
  status: string;
  cardInstance: {
    id: string;
    card: Card;
    drawnBy: {
      id: string;
      user: {
        id: string;
        name: string;
      };
      nickname?: string | null;
    };
  };
  submittedBy: {
    id: string;
    user: {
      id: string;
      name: string;
    };
    nickname?: string | null;
  };
  votes: Array<{
    id: string;
    vote: boolean;
    voter: {
      id: string;
      user: {
        id: string;
        name: string;
      };
    };
  }>;
}

interface VotingUIProps {
  submission: Submission;
  currentUserId: string;
  totalPlayers: number;
  onVote: (submissionId: string, vote: boolean) => Promise<void>;
}

export function VotingUI({
  submission,
  currentUserId,
  totalPlayers,
  onVote,
}: VotingUIProps) {
  const [isVoting, setIsVoting] = useState(false);
  
  // Check if current user has voted by comparing voter's user ID
  const userVoteRecord = submission.votes.find(
    (v) => v.voter.user.id === currentUserId
  );
  const [hasVoted, setHasVoted] = useState(!!userVoteRecord);
  const [userVote, setUserVote] = useState<boolean | null>(
    userVoteRecord?.vote ?? null
  );

  const approvalVotes = submission.votes.filter((v) => v.vote === true).length;
  const rejectionVotes = submission.votes.filter((v) => v.vote === false).length;
  const requiredApprovals = Math.ceil(totalPlayers / 2);

  const canVote =
    !hasVoted &&
    submission.status === "pending" &&
    submission.submittedBy.user.id !== currentUserId;

  const handleVote = async (vote: boolean) => {
    if (isVoting || hasVoted) return;

    setIsVoting(true);
    try {
      await onVote(submission.id, vote);
      setHasVoted(true);
      setUserVote(vote);
    } catch (error) {
      console.error("Failed to vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Vote on Submission</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Submitted by: {submission.submittedBy.nickname || submission.submittedBy.user.name}
        </p>
      </div>

      {/* Card Display */}
      <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary/30 mb-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-xl font-bold">{submission.cardInstance.card.title}</h4>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                submission.cardInstance.card.severity === "severe"
                  ? "bg-red-500/20 text-red-600 dark:text-red-400"
                  : submission.cardInstance.card.severity === "moderate"
                  ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                  : "bg-green-500/20 text-green-600 dark:text-green-400"
              }`}
            >
              {submission.cardInstance.card.severity}
            </span>
            <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs font-medium">
              {submission.cardInstance.card.points} pts
            </span>
          </div>
        </div>
        <p className="text-neutral-700 dark:text-neutral-300">
          {submission.cardInstance.card.description}
        </p>
      </div>

      {/* Vote Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-600 dark:text-neutral-400">
            Approvals: {approvalVotes}/{requiredApprovals}
          </span>
          <span className="text-neutral-600 dark:text-neutral-400">
            Rejections: {rejectionVotes}
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{
              width: `${(approvalVotes / requiredApprovals) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Vote Buttons */}
      {canVote && (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isVoting ? "Voting..." : "Approve"}
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isVoting ? "Voting..." : "Reject"}
          </button>
        </div>
      )}

      {/* Already Voted */}
      {hasVoted && (
        <div className="text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            You voted:{" "}
            <span
              className={`font-semibold ${
                userVote ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {userVote ? "Approve" : "Reject"}
            </span>
          </p>
        </div>
      )}

      {/* Cannot Vote */}
      {submission.submittedBy.user.id === currentUserId && (
        <div className="text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            You cannot vote on your own submission
          </p>
        </div>
      )}

      {/* Status */}
      {submission.status !== "pending" && (
        <div className="mt-4 text-center">
          <p
            className={`text-sm font-semibold ${
              submission.status === "approved"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            Submission {submission.status}
          </p>
        </div>
      )}
    </div>
  );
}
