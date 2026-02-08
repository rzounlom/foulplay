"use client";

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
  status: string;
}

interface PendingDiscardProps {
  cardInstances: CardInstance[];
  onRemove: (cardInstanceId: string) => void;
  intermissionSecondsLeft: number | null;
  roomMode?: string | null;
}

export function PendingDiscard({
  cardInstances,
  onRemove,
  intermissionSecondsLeft,
  roomMode = null,
}: PendingDiscardProps) {
  const timeStr =
    intermissionSecondsLeft != null
      ? `${Math.floor((intermissionSecondsLeft ?? 0) / 60)}:${String((intermissionSecondsLeft ?? 0) % 60).padStart(2, "0")}`
      : "5:00";

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          Pending Discard
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {cardInstances.length > 0
            ? `These cards will be discarded when the round intermission ends. You'll get new cards and points${roomMode !== "non-drinking" ? " (drink penalty applies)" : ""}. Time left: ${timeStr}. Remove any you want to keep.`
            : `Select cards from your hand and submit for discard. They will appear here. Time left: ${timeStr}. When intermission ends, cards here are discarded and replaced.`}
        </p>
      </div>

      {/* Cards Display - same layout as SubmissionPending */}
      {cardInstances.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cardInstances.map((cardInstance) => (
          <div
            key={cardInstance.id}
            className="p-3 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 min-h-0 relative"
          >
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={() => onRemove(cardInstance.id)}
              className="absolute top-2 right-2 !p-1.5 min-w-0 text-xs"
            >
              Remove
            </Button>
            <div className="flex items-start justify-between gap-2 mb-1.5 pr-14">
              <h4 className="font-semibold text-xs leading-tight flex-1 min-w-0">
                {cardInstance.card.title}
              </h4>
              <div className="flex flex-col items-end gap-1 shrink-0">
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
              {getCardDescriptionForDisplay(cardInstance.card.description, roomMode)}
            </p>
          </div>
        ))}
      </div>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4">
          No cards in pending discard. Select cards from your hand below and click Submit for discard.
        </p>
      )}
    </div>
  );
}
