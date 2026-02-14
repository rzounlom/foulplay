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
  submittedBy: {
    id: string;
    user: { id: string; name: string };
    nickname?: string | null;
  };
}

interface SubmitterPendingBadgeProps {
  submissions: Submission[];
  roomMode?: string | null;
}

export function SubmitterPendingBadge({
  submissions,
  roomMode = null,
}: SubmitterPendingBadgeProps) {
  const myPendingSubmissions = submissions.filter((s) => s.status === "pending");
  if (myPendingSubmissions.length === 0) return null;

  const allCards = myPendingSubmissions.flatMap((s) =>
    s.cardInstances.map((ci) => ({ ...ci, submissionId: s.id }))
  );

  return (
    <div className="bg-surface rounded-lg p-4 md:p-6 border border-border shadow-sm dark:shadow-none">
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
        Your submissions
        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
          Vote pending
        </span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {allCards.map(({ id, card, submissionId }) => (
          <div
            key={`${submissionId}-${id}`}
            className="p-4 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-semibold text-sm leading-tight line-clamp-2 flex-1 min-w-0">
                {card.title}
              </h4>
              <span className="shrink-0 px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-medium whitespace-nowrap">
                Vote pending
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
                  card.severity === "severe"
                    ? "bg-red-500/20 text-red-600 dark:text-red-400"
                    : card.severity === "moderate"
                      ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                      : "bg-green-500/20 text-green-600 dark:text-green-400"
                }`}
              >
                {card.severity}
              </span>
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-[11px] font-medium whitespace-nowrap">
                {card.points} pts
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-tight">
              {getCardDescriptionForDisplay(card.description, roomMode)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
