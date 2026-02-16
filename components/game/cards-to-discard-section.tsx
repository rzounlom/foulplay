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

interface CardInstance {
  id: string;
  card: Card;
  status: string;
}

interface CardsToDiscardSectionProps {
  cardInstances: CardInstance[];
  onRemove: (cardInstanceId: string) => void;
  roomMode?: string | null;
}

/**
 * Cards to Discard — shown above Your Hand during quarter intermission.
 * Similar to SubmitterPendingBadge (Your submissions). Separate container so it
 * doesn't affect Your Hand layout or cause scrolling.
 */
export function CardsToDiscardSection({
  cardInstances,
  onRemove,
  roomMode = null,
}: CardsToDiscardSectionProps) {
  if (cardInstances.length === 0) return null;

  return (
    <div className="bg-surface rounded-lg p-4 md:p-6 border border-border shadow-sm dark:shadow-none">
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4 flex items-center gap-2">
        Cards to Discard
        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
          {cardInstances.length} selected
        </span>
      </h3>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
        These will be discarded when the round ends. Click Remove to keep a card.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {cardInstances.map((cardInstance) => (
          <div
            key={cardInstance.id}
            className="p-4 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 transition-all duration-200 relative"
          >
            <button
              type="button"
              onClick={() => onRemove(cardInstance.id)}
              className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded transition-colors"
            >
              Remove
            </button>
            <div className="flex items-center justify-between gap-2 mb-2 pr-16">
              <h4 className="font-semibold text-sm leading-tight line-clamp-2 flex-1 min-w-0">
                {cardInstance.card.title}
              </h4>
            </div>
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
                roomMode,
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
