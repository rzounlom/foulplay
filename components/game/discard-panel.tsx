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

interface DiscardPanelProps {
  cardInstances: CardInstance[];
  onRemove: (cardInstanceId: string) => void;
  onClose: () => void;
  intermissionSecondsLeft: number | null;
  roomMode?: string | null;
  isOpen: boolean;
}

export function DiscardPanel({
  cardInstances,
  onRemove,
  onClose,
  intermissionSecondsLeft,
  roomMode = null,
  isOpen,
}: DiscardPanelProps) {
  const timeStr =
    intermissionSecondsLeft != null
      ? `${Math.floor((intermissionSecondsLeft ?? 0) / 60)}:${String((intermissionSecondsLeft ?? 0) % 60).padStart(2, "0")}`
      : "5:00";

  if (!isOpen) return null;

  const panelContent = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold">Pending Discard</h2>
        <Button variant="tertiary" size="sm" onClick={onClose} aria-label="Close">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          {cardInstances.length > 0
            ? `These cards will be discarded when the round ends. Time left: ${timeStr}. Remove any you want to keep.`
            : `Select cards from your hand and submit for discard. Time left: ${timeStr}.`}
        </p>
        {cardInstances.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {cardInstances.map((cardInstance) => (
              <div
                key={cardInstance.id}
                className="p-4 rounded-lg border-2 border-neutral-200 dark:border-neutral-800 relative"
              >
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={() => onRemove(cardInstance.id)}
                  className="absolute top-2 right-2"
                >
                  Remove
                </Button>
                <h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-2 pr-16">
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
                  {getCardDescriptionForDisplay(cardInstance.card.description, roomMode)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No cards in pending discard.</p>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[9050]" onClick={onClose} aria-hidden />
      <div
        className="fixed top-0 right-0 h-full w-[min(100%,400px)] lg:hidden bg-surface border-l border-border shadow-xl z-[9051] flex flex-col animate-slide-in-right"
        role="dialog"
        aria-label="Pending discard"
        onClick={(e) => e.stopPropagation()}
      >
        {panelContent}
      </div>
      <div
        className="hidden lg:flex fixed inset-0 z-[9051] items-center justify-center p-4"
        onClick={onClose}
        aria-hidden
      >
        <div
          className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-lg h-[85vh] max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Pending discard"
        >
          {panelContent}
        </div>
      </div>
    </>
  );
}
