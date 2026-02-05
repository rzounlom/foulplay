"use client";

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
}

export function SubmissionPending({ submission, totalPlayers }: SubmissionPendingProps) {
  const approvalVotes = submission.votes.filter((v) => v.vote === true).length;
  const rejectionVotes = submission.votes.filter((v) => v.vote === false).length;
  const requiredApprovals = Math.ceil(totalPlayers / 2);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          Submission{submission.cardInstances.length > 1 ? "s" : ""} Pending
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Waiting for other players to vote on your {submission.cardInstances.length} card{submission.cardInstances.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Cards Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {submission.cardInstances.map((cardInstance) => (
          <div
            key={cardInstance.id}
            className="p-3 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 min-h-0"
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
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-tight">
              {cardInstance.card.description}
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
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{
              width: `${Math.min((approvalVotes / requiredApprovals) * 100, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
