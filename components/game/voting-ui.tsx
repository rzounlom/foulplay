"use client";

import { useState, useMemo } from "react";

interface Card {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
  points: number;
}

interface CardInstance {
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
  votes?: Array<{
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

interface Submission {
  id: string;
  status: string;
  cardInstances: CardInstance[];
  submittedBy: {
    id: string;
    user: {
      id: string;
      name: string;
    };
    nickname?: string | null;
  };
}

interface VotingUIProps {
  submission: Submission;
  currentUserId: string;
  totalPlayers: number;
  onVote: (submissionId: string, cardInstanceIds: string[], vote: boolean) => Promise<void>;
}

export function VotingUI({
  submission,
  currentUserId,
  totalPlayers,
  onVote,
}: VotingUIProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  
  const requiredApprovals = Math.ceil(totalPlayers / 2);

  // Calculate vote counts per card
  const cardVoteData = useMemo(() => {
    return submission.cardInstances.map((cardInstance) => {
      const votes = cardInstance.votes || [];
      const approvalVotes = votes.filter((v) => v.vote === true).length;
      const rejectionVotes = votes.filter((v) => v.vote === false).length;
      const userVoteRecord = votes.find((v) => v.voter.user.id === currentUserId);
      const hasVoted = !!userVoteRecord;
      const userVote = userVoteRecord?.vote ?? null;
      const resolution = 
        approvalVotes >= requiredApprovals ? "approved" :
        rejectionVotes >= requiredApprovals ? "rejected" :
        "pending";

      return {
        cardInstanceId: cardInstance.id,
        approvalVotes,
        rejectionVotes,
        hasVoted,
        userVote,
        resolution,
      };
    });
  }, [submission.cardInstances, currentUserId, requiredApprovals]);

  const canVote =
    submission.status === "pending" &&
    submission.submittedBy.user.id !== currentUserId;

  const toggleCardSelection = (cardInstanceId: string) => {
    if (!canVote) return;
    const cardData = cardVoteData.find(d => d.cardInstanceId === cardInstanceId);
    if (cardData?.hasVoted) return; // Can't select cards already voted on

    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardInstanceId)) {
        next.delete(cardInstanceId);
      } else {
        next.add(cardInstanceId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!canVote) return;
    const votableCards = cardVoteData
      .filter(d => !d.hasVoted && d.resolution === "pending")
      .map(d => d.cardInstanceId);
    setSelectedCards(new Set(votableCards));
  };

  const deselectAll = () => {
    setSelectedCards(new Set());
  };

  const handleVote = async (vote: boolean, cardInstanceIds: string[]) => {
    if (isVoting || cardInstanceIds.length === 0) return;

    setIsVoting(true);
    try {
      await onVote(submission.id, cardInstanceIds, vote);
      // Clear selection after voting
      setSelectedCards(new Set());
    } catch (error) {
      console.error("Failed to vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleVoteAll = async (vote: boolean) => {
    const allPendingCards = cardVoteData
      .filter(d => !d.hasVoted && d.resolution === "pending")
      .map(d => d.cardInstanceId);
    await handleVote(vote, allPendingCards);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Vote on Submission</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Submitted by: {submission.submittedBy.nickname || submission.submittedBy.user.name}
        </p>
        {canVote && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Select cards to vote on individually, or use &quot;Vote All&quot; buttons
          </p>
        )}
      </div>

      {/* Cards Display with Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {submission.cardInstances.map((cardInstance) => {
          const cardData = cardVoteData.find(d => d.cardInstanceId === cardInstance.id);
          const isSelected = selectedCards.has(cardInstance.id);
          const canSelect = canVote && !cardData?.hasVoted && cardData?.resolution === "pending";

          return (
            <div
              key={cardInstance.id}
              onClick={() => canSelect && toggleCardSelection(cardInstance.id)}
              className={`p-3 rounded-lg border-2 min-h-0 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/20 dark:bg-primary/10"
                  : canSelect
                  ? "border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 hover:border-primary/50"
                  : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 opacity-60"
              } ${
                cardData?.resolution === "approved"
                  ? "ring-2 ring-green-500/50"
                  : cardData?.resolution === "rejected"
                  ? "ring-2 ring-red-500/50"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="font-semibold text-xs leading-tight flex-1 min-w-0">
                  {cardInstance.card.title}
                </h4>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                      cardInstance.card.severity === "severe"
                        ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : cardInstance.card.severity === "moderate"
                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        : "bg-green-500/20 text-green-600 dark:text-green-400"
                    }`}
                  >
                    {cardInstance.card.severity}
                  </span>
                  <span className="px-1.5 py-0.5 bg-accent/20 text-accent rounded text-[10px] font-medium whitespace-nowrap">
                    {cardInstance.card.points} pts
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-tight mb-2">
                {cardInstance.card.description}
              </p>
              
              {/* Card Vote Status */}
              {cardData && (
                <div className="text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Approve: {cardData.approvalVotes}/{requiredApprovals}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Reject: {cardData.rejectionVotes}
                    </span>
                  </div>
                  {cardData.hasVoted && (
                    <div className="text-center">
                      <span className={`font-medium ${
                        cardData.userVote ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        You: {cardData.userVote ? "Approved" : "Rejected"}
                      </span>
                    </div>
                  )}
                  {cardData.resolution !== "pending" && (
                    <div className="text-center">
                      <span className={`font-semibold ${
                        cardData.resolution === "approved" 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {cardData.resolution === "approved" ? "✓ Approved" : "✗ Rejected"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Controls */}
      {canVote && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            disabled={selectedCards.size === 0}
            className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Deselect All
          </button>
          {selectedCards.size > 0 && (
            <span className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 self-center">
              {selectedCards.size} card{selectedCards.size !== 1 ? "s" : ""} selected
            </span>
          )}
        </div>
      )}

      {/* Vote Buttons */}
      {canVote && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <button
              onClick={() => selectedCards.size > 0 ? handleVote(true, Array.from(selectedCards)) : handleVoteAll(true)}
              disabled={isVoting || (selectedCards.size === 0 && cardVoteData.every(d => d.hasVoted || d.resolution !== "pending"))}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isVoting ? "Voting..." : selectedCards.size > 0 ? `Approve Selected (${selectedCards.size})` : "Approve All"}
            </button>
            <button
              onClick={() => selectedCards.size > 0 ? handleVote(false, Array.from(selectedCards)) : handleVoteAll(false)}
              disabled={isVoting || (selectedCards.size === 0 && cardVoteData.every(d => d.hasVoted || d.resolution !== "pending"))}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isVoting ? "Voting..." : selectedCards.size > 0 ? `Reject Selected (${selectedCards.size})` : "Reject All"}
            </button>
          </div>
        </div>
      )}

      {/* Cannot Vote */}
      {submission.submittedBy.user.id === currentUserId && (
        <div className="text-center mt-4">
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
