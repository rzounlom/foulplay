"use client";

import { useEffect, useMemo } from "react";
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

interface HandProps {
  cards: CardInstance[];
  onCardSelect?: (cardInstanceId: string) => void;
  onCardSubmit?: (cardInstanceIds: string[]) => void;
  onCardDiscard?: (cardInstanceIds: string[]) => void;
  onQuarterDiscardSelection?: (cardInstanceIds: string[]) => void;
  selectedCardId?: string | null;
  selectedCardIds?: string[];
  handSize?: number;
  allowQuarterClearing?: boolean;
  currentQuarter?: string | null;
  canTurnInCards?: boolean;
  isQuarterIntermission?: boolean;
  intermissionSecondsLeft?: number | null;
  myQuarterSelectionIds?: string[];
  roomMode?: string | null;
}

export function Hand({
  cards,
  onCardSelect,
  onCardSubmit,
  onQuarterDiscardSelection,
  selectedCardId,
  selectedCardIds = [],
  handSize = 5,
  canTurnInCards = true,
  isQuarterIntermission = false,
  myQuarterSelectionIds = [],
  roomMode = null,
}: HandProps) {
  const isMultiSelect = !!(onCardSubmit || onQuarterDiscardSelection);
  const selectedIds = useMemo(
    () => (isMultiSelect ? selectedCardIds : selectedCardId ? [selectedCardId] : []),
    [isMultiSelect, selectedCardIds, selectedCardId]
  );
  // During normal play, only submit-for-vote is allowed. Discard with penalty is only during round intermission.
  const canSubmitCards = canTurnInCards && !isQuarterIntermission;
  const cardsInHand = cards.filter((c) => c.status === "drawn");

  const cardsStaying =
    myQuarterSelectionIds.length > 0
      ? cardsInHand.filter((c) => !myQuarterSelectionIds.includes(c.id))
      : cardsInHand;

  const canSubmitWithEnter =
    (canSubmitCards && selectedIds.length > 0) ||
    (isQuarterIntermission && !!onQuarterDiscardSelection && selectedIds.length > 0);

  useEffect(() => {
    if (!canSubmitWithEnter) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      const el = document.activeElement;
      const tag = el?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (canSubmitCards && selectedIds.length > 0) {
        onCardSubmit?.(selectedIds);
      } else if (isQuarterIntermission && onQuarterDiscardSelection && selectedIds.length > 0) {
        const toAdd = selectedIds.filter((id) => !myQuarterSelectionIds.includes(id));
        if (toAdd.length > 0) onQuarterDiscardSelection([...myQuarterSelectionIds, ...toAdd]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canSubmitWithEnter,
    canSubmitCards,
    isQuarterIntermission,
    selectedIds,
    myQuarterSelectionIds,
    onCardSubmit,
    onQuarterDiscardSelection,
  ]);

  if (cardsInHand.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-6 border border-border shadow-sm dark:shadow-none text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 mb-3" aria-hidden>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Your Hand</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No cards right now. New cards will appear after the next draw or when your submissions are resolved.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg p-6 border border-border shadow-sm dark:shadow-none">
      <h3 className="text-lg font-semibold mb-4">
        Your Hand ({cardsStaying.length}/{handSize})
      </h3>
      {!canTurnInCards && !isQuarterIntermission && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-sm">
          Card turn-in is currently disabled by the host
        </div>
      )}
      {isQuarterIntermission && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm">
          Select cards from your hand and click Submit for discard. They will move to Pending Discard above. Remove from Pending Discard to keep them. When the timer ends, cards in Pending Discard are discarded and replaced.{roomMode !== "non-drinking" && " Drink penalty applies."}
        </div>
      )}

      {(canSubmitCards && selectedIds.length > 0) || (isQuarterIntermission && onQuarterDiscardSelection && selectedIds.length > 0) ? (
        <div className="mb-4 flex gap-2">
          {canSubmitCards && selectedIds.length > 0 && (
            <Button
              variant="outline-primary"
              size="md"
              className="flex-1"
              onClick={() => onCardSubmit?.(selectedIds)}
            >
              Submit {selectedIds.length} Card{selectedIds.length !== 1 ? "s" : ""}
            </Button>
          )}
          {isQuarterIntermission && onQuarterDiscardSelection && selectedIds.length > 0 && (
            <Button
              variant="outline-primary"
              size="md"
              className="flex-1"
              onClick={() => {
                const toAdd = selectedIds.filter((id) => !myQuarterSelectionIds.includes(id));
                if (toAdd.length > 0) onQuarterDiscardSelection([...myQuarterSelectionIds, ...toAdd]);
              }}
            >
              Submit {selectedIds.length} Card{selectedIds.length !== 1 ? "s" : ""} for discard
            </Button>
          )}
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cardsStaying.map((cardInstance, index) => {
          const isSelected = isMultiSelect 
            ? selectedIds.includes(cardInstance.id)
            : selectedCardId === cardInstance.id;
          return (
            <div
              key={cardInstance.id}
              onClick={() => onCardSelect?.(cardInstance.id)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ease-out cursor-pointer min-h-0 hover:scale-[1.02] hover:shadow-md active:scale-[0.99] animate-fade-in-up ${
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.02] shadow-md"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-primary/50"
              }`}
              style={{ animationDelay: `${index * 40}ms` }}
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
                {getCardDescriptionForDisplay(cardInstance.card.description, roomMode)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
