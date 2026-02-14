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
  drawnBy?: {
    id: string;
    user: { id: string; name: string };
    nickname?: string | null;
  };
  votes?: Array<{
    id: string;
    vote: boolean;
    voter: { id: string; user: { id: string; name: string } };
  }>;
}

interface Submission {
  id: string;
  status: string;
  cardInstances: CardInstance[];
  submittedBy: {
    id: string;
    user: { id: string; name: string };
    nickname?: string | null;
  };
}

interface VotingPanelProps {
  submissions: Submission[];
  currentUserId: string;
  totalPlayers: number;
  onVote: (submissionId: string, cardInstanceIds: string[], vote: boolean) => Promise<void>;
  onClose: () => void;
  votingPaused?: boolean;
  roomMode?: string | null;
}

export function VotingPanel({
  submissions,
  currentUserId,
  totalPlayers,
  onVote,
  onClose,
  votingPaused = false,
  roomMode = null,
}: VotingPanelProps) {
  const [isVoting, setIsVoting] = useState<Record<string, boolean>>({});

  const submissionsToVote = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.status === "pending" &&
          s.submittedBy.user.id !== currentUserId
      ),
    [submissions, currentUserId]
  );

  const requiredApprovals = Math.ceil(totalPlayers / 2);

  const hasVotedOnAll = useMemo(() => {
    for (const submission of submissionsToVote) {
      for (const card of submission.cardInstances) {
        const votes = card.votes || [];
        const hasVoted = votes.some((v) => v.voter.user.id === currentUserId);
        if (!hasVoted) return false;
      }
    }
    return submissionsToVote.length > 0;
  }, [submissionsToVote, currentUserId]);

  const handleVote = async (submissionId: string, cardInstanceId: string, vote: boolean) => {
    const key = `${submissionId}-${cardInstanceId}`;
    if (isVoting[key]) return;
    setIsVoting((prev) => ({ ...prev, [key]: true }));
    try {
      await onVote(submissionId, [cardInstanceId], vote);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Failed to vote:", error);
    } finally {
      setIsVoting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleVoteAll = async (submission: Submission, vote: boolean) => {
    const allIds = submission.cardInstances.map((c) => c.id);
    const key = `all-${submission.id}`;
    if (isVoting[key]) return;
    setIsVoting((prev) => ({ ...prev, [key]: true }));
    try {
      await onVote(submission.id, allIds, vote);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Failed to vote:", error);
    } finally {
      setIsVoting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const canVote =
    !votingPaused &&
    submissionsToVote.some((s) => s.submittedBy.user.id !== currentUserId);

  if (submissionsToVote.length === 0) return null;

  const panelContent = (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Vote on Submissions</h2>
        {hasVotedOnAll ? (
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        ) : (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Vote on all cards to continue
          </span>
        )}
      </div>
      <div className="p-4 space-y-6">
        {submissionsToVote.map((submission) => {
          const submitterName =
            submission.submittedBy.nickname || submission.submittedBy.user.name;
          const canVoteThis = canVote && submission.submittedBy.user.id !== currentUserId;

          return (
            <div
              key={submission.id}
              className="bg-surface-muted rounded-lg p-4 border border-border"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Submitted by: {submitterName}
                </p>
                {canVoteThis && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleVoteAll(submission, true)}
                      disabled={isVoting[`all-${submission.id}`]}
                      isLoading={isVoting[`all-${submission.id}`]}
                    >
                      Accept All
                    </Button>
                    <Button
                      variant="outline-destructive"
                      size="sm"
                      onClick={() => handleVoteAll(submission, false)}
                      disabled={isVoting[`all-${submission.id}`]}
                      isLoading={isVoting[`all-${submission.id}`]}
                    >
                      Reject All
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {submission.cardInstances.map((cardInstance) => {
                  const votes = cardInstance.votes || [];
                  const approvalVotes = votes.filter((v) => v.vote === true).length;
                  const rejectionVotes = votes.filter((v) => v.vote === false).length;
                  const hasVoted = votes.some((v) => v.voter.user.id === currentUserId);
                  const resolution =
                    approvalVotes >= requiredApprovals
                      ? "approved"
                      : rejectionVotes >= requiredApprovals
                        ? "rejected"
                        : "pending";

                  return (
                    <div
                      key={cardInstance.id}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col min-h-[180px] ${
                        resolution === "approved"
                          ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
                          : resolution === "rejected"
                            ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                            : "border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10"
                      }`}
                    >
                      <div className="flex-1 min-h-0">
                        <h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-2">
                          {cardInstance.card.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                              cardInstance.card.severity === "severe"
                                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                                : cardInstance.card.severity === "moderate"
                                  ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                  : "bg-green-500/20 text-green-600 dark:text-green-400"
                            }`}
                          >
                            {cardInstance.card.severity}
                          </span>
                          <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-[11px] font-medium whitespace-nowrap">
                            {cardInstance.card.points} pts
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-tight">
                          {getCardDescriptionForDisplay(
                            cardInstance.card.description,
                            roomMode
                          )}
                        </p>
                      </div>

                      {resolution === "pending" && (
                        <div className="space-y-2 pt-3 mt-auto">
                          <div className="flex items-center justify-between text-xs text-neutral-500">
                            <span>Approve: {approvalVotes}/{requiredApprovals}</span>
                            <span>Reject: {rejectionVotes}</span>
                          </div>
                          {canVoteThis && !hasVoted && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() =>
                                  handleVote(submission.id, cardInstance.id, true)
                                }
                                disabled={isVoting[`${submission.id}-${cardInstance.id}`]}
                                isLoading={isVoting[`${submission.id}-${cardInstance.id}`]}
                                className="flex-1"
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline-destructive"
                                size="sm"
                                onClick={() =>
                                  handleVote(submission.id, cardInstance.id, false)
                                }
                                disabled={isVoting[`${submission.id}-${cardInstance.id}`]}
                                isLoading={isVoting[`${submission.id}-${cardInstance.id}`]}
                                className="flex-1"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {hasVoted && (
                            <span className="text-xs text-neutral-500 block">Voted</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[9100]" aria-hidden />
      <div
        className="fixed top-0 right-0 h-full w-[min(100%,400px)] lg:hidden bg-surface border-l border-border shadow-xl z-[9101] flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Vote on submissions"
      >
        {panelContent}
      </div>
      <div
        className="hidden lg:flex fixed inset-0 z-[9101] items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Vote on submissions"
      >
        <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {panelContent}
        </div>
      </div>
    </>
  );
}
