"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getCardDescriptionForDisplay } from "@/lib/game/display";

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
  votingPaused?: boolean;
  roomMode?: string | null;
}

export function VotingUI({
  submission,
  currentUserId,
  totalPlayers,
  onVote,
  votingPaused = false,
  roomMode = null,
}: VotingUIProps) {
  const [isVoting, setIsVoting] = useState<Record<string, boolean>>({});
  
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
    !votingPaused &&
    submission.status === "pending" &&
    submission.submittedBy.user.id !== currentUserId;

  const handleVote = async (cardInstanceId: string, vote: boolean) => {
    if (isVoting[cardInstanceId]) return;

    setIsVoting((prev) => ({ ...prev, [cardInstanceId]: true }));
    try {
      await onVote(submission.id, [cardInstanceId], vote);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Failed to vote:", error);
    } finally {
      setIsVoting((prev) => ({ ...prev, [cardInstanceId]: false }));
    }
  };

  const handleVoteAll = async (vote: boolean) => {
    const allCardIds = submission.cardInstances.map(ci => ci.id);
    const isAnyVoting = allCardIds.some(id => isVoting[id]);
    if (isAnyVoting) return;

    // Set all as voting
    const votingState: Record<string, boolean> = {};
    allCardIds.forEach(id => { votingState[id] = true; });
    setIsVoting((prev) => ({ ...prev, ...votingState }));

    try {
      await onVote(submission.id, allCardIds, vote);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Failed to vote:", error);
    } finally {
      // Clear all voting states
      const clearedState: Record<string, boolean> = {};
      allCardIds.forEach(id => { clearedState[id] = false; });
      setIsVoting((prev) => ({ ...prev, ...clearedState }));
    }
  };

  return (
    <div className="bg-surface rounded-lg p-4 md:p-6 border border-border shadow-sm dark:shadow-none">
      <div className="mb-4">
        <h3 className="text-section-title mb-2">Vote on Submission</h3>
        <p className="text-body-muted">
          Submitted by: {submission.submittedBy.nickname || submission.submittedBy.user.name}
        </p>
      </div>

      {votingPaused && submission.status === "pending" && submission.submittedBy.user.id !== currentUserId && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm">
          Voting is paused during the quarter-ending intermission.
        </div>
      )}

      {/* Accept All / Reject All Buttons */}
      {canVote && (
        <div className="mb-4 flex gap-3">
          <Button
            variant="outline-success"
            size="md"
            onClick={() => handleVoteAll(true)}
            disabled={Object.values(isVoting).some((v) => v)}
            fullWidth
          >
            Accept All
          </Button>
          <Button
            variant="outline-destructive"
            size="md"
            onClick={() => handleVoteAll(false)}
            disabled={Object.values(isVoting).some((v) => v)}
            fullWidth
          >
            Reject All
          </Button>
        </div>
      )}

      {/* Cards Display with Individual Vote Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-2 lg:gap-3">
        {submission.cardInstances.map((cardInstance, index) => {
          const cardData = cardVoteData.find(d => d.cardInstanceId === cardInstance.id);
          const cardIsVoting = isVoting[cardInstance.id] || false;

          const resolution = cardData?.resolution ?? "pending";
          const isApproved = resolution === "approved";
          const isRejected = resolution === "rejected";
          const flashClass = isApproved
            ? "vote-card-approved-flash"
            : isRejected
              ? "vote-card-rejected-flash"
              : "";

          return (
            <div
              key={`${cardInstance.id}-${resolution}`}
              className={`p-4 md:p-2.5 lg:p-3 rounded-lg border-2 min-w-0 overflow-hidden transition-all duration-300 ease-out hover:shadow-md min-h-[100px] md:min-h-[88px] lg:min-h-0 ${resolution === "pending" ? "animate-fade-in-up" : ""} ${flashClass} ${
                isApproved
                  ? "ring-2 ring-green-500/50 border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
                  : isRejected
                  ? "ring-2 ring-red-500/50 border-red-500/30 bg-red-50/50 dark:bg-red-950/20"
                  : "border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 hover:border-primary/50"
              }`}
              style={resolution === "pending" ? { animationDelay: `${index * 50}ms` } : undefined}
            >
              <h4 className="font-semibold text-sm md:text-xs leading-tight truncate mb-1.5 md:mb-1">
                {cardInstance.card.title}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-1 lg:gap-2 mb-1.5 md:mb-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-xs md:text-[10px] font-medium whitespace-nowrap ${
                    cardInstance.card.severity === "severe"
                      ? "bg-red-500/20 text-red-600 dark:text-red-400"
                      : cardInstance.card.severity === "moderate"
                      ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                      : "bg-green-500/20 text-green-600 dark:text-green-400"
                  }`}
                >
                  {cardInstance.card.severity}
                </span>
                <span className="px-1.5 py-0.5 bg-accent/20 text-accent rounded text-xs md:text-[10px] font-medium whitespace-nowrap">
                  {cardInstance.card.points} pts
                </span>
              </div>
              <p className="text-xs md:text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-tight mb-2 lg:mb-3">
                {getCardDescriptionForDisplay(cardInstance.card.description, roomMode)}
              </p>
              
              {/* Vote Status */}
              {cardData && (
                <div className="text-[10px] mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Approve: {cardData.approvalVotes}/{requiredApprovals}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Reject: {cardData.rejectionVotes}
                    </span>
                  </div>
                </div>
              )}

              {/* Individual Vote Buttons */}
              {canVote && (
                <div className="flex gap-1 sm:gap-2 min-w-0">
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => handleVote(cardInstance.id, true)}
                    disabled={cardIsVoting}
                    isLoading={cardIsVoting}
                    className="min-w-0 flex-1 shrink px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline-destructive"
                    size="sm"
                    onClick={() => handleVote(cardInstance.id, false)}
                    disabled={cardIsVoting}
                    isLoading={cardIsVoting}
                    className="min-w-0 flex-1 shrink px-2 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
