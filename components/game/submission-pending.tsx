"use client";

import { getCardDescriptionForDisplay } from "@/lib/game/display";

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
  cardInstances: Array<{
    id: string;
    card: Card;
  }>;
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

interface SubmissionPendingProps {
  submission: Submission;
  totalPlayers: number;
  roomMode?: string | null;
}

export function SubmissionPending({ submission, totalPlayers, roomMode = null }: SubmissionPendingProps) {
  const approvalVotes = submission.votes.filter((v) => v.vote === true).length;
  const rejectionVotes = submission.votes.filter((v) => v.vote === false).length;
  const requiredApprovals = Math.ceil(totalPlayers / 2);

  return (
    <div className="bg-surface rounded-lg p-6 border border-border shadow-sm dark:shadow-none">
      <div className="mb-4">
        <h3 className="text-section-title mb-2">
          Submission{submission.cardInstances.length > 1 ? "s" : ""} Pending
        </h3>
        <p className="text-body-muted">
          Waiting for other players to vote on your {submission.cardInstances.length} card{submission.cardInstances.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Cards Display */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-3 mb-4">
        {submission.cardInstances.map((cardInstance, index) => (
          <div
            key={cardInstance.id}
            className="p-2 lg:p-3 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 min-h-0 animate-fade-in-up transition-shadow duration-200 hover:shadow-md"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <h4 className="font-semibold text-[10px] lg:text-xs leading-tight truncate mb-1 lg:mb-1.5">
              {cardInstance.card.title}
            </h4>
            <div className="flex flex-wrap items-center gap-1 lg:gap-2 mb-1 lg:mb-1.5">
              <span
                className={`px-1 py-0.5 rounded text-[9px] lg:text-[10px] font-medium whitespace-nowrap ${
                  cardInstance.card.severity === "severe"
                    ? "bg-red-500/20 text-red-600 dark:text-red-400"
                    : cardInstance.card.severity === "moderate"
                    ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    : "bg-green-500/20 text-green-600 dark:text-green-400"
                }`}
              >
                {cardInstance.card.severity}
              </span>
              <span className="px-1 py-0.5 bg-accent/20 text-accent rounded text-[9px] lg:text-[10px] font-medium whitespace-nowrap">
                {cardInstance.card.points} pts
              </span>
            </div>
            <p className="text-[9px] lg:text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-1 lg:line-clamp-2 leading-tight">
              {getCardDescriptionForDisplay(cardInstance.card.description, roomMode)}
            </p>
          </div>
        ))}
      </div>

      {/* Vote Progress */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-600 dark:text-neutral-400">
            Approvals: {approvalVotes}/{requiredApprovals}
          </span>
          <span className="text-neutral-600 dark:text-neutral-400">
            Rejections: {rejectionVotes}
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min((approvalVotes / requiredApprovals) * 100, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
