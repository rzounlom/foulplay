"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getCardDescriptionForDisplay } from "@/lib/game/display";

const HAND_LAYOUT_KEY = "foulplay-hand-layout";
type HandLayout = "1v" | "1h" | "2v" | "2h";

function useHandLayout() {
  const [layout, setLayout] = useState<HandLayout>(() => {
    if (typeof window === "undefined") return "2v";
    try {
      const stored = localStorage.getItem(HAND_LAYOUT_KEY) as HandLayout | null;
      if (stored && ["1v", "1h", "2v", "2h"].includes(stored)) return stored;
    } catch {
      /* ignore */
    }
    return "2v";
  });
  const setAndStore = (value: HandLayout) => {
    setLayout(value);
    try {
      localStorage.setItem(HAND_LAYOUT_KEY, value);
    } catch {
      /* ignore */
    }
  };
  return [layout, setAndStore] as const;
}

function useIsSmallViewport() {
  const [isSmall, setIsSmall] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 820px)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const handler = () => setIsSmall(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isSmall;
}

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
  /** Shown to the right of "Your Hand" on small screens when Players panel is hidden */
  currentUserPoints?: number;
  /** When true, disables card submission and quarter discard submission (e.g. while host is ending round) */
  submissionDisabled?: boolean;
}

export function Hand({
  cards,
  onCardSelect,
  onCardSubmit,
  onQuarterDiscardSelection,
  selectedCardId,
  selectedCardIds = [],
  handSize = 6,
  canTurnInCards = true,
  isQuarterIntermission = false,
  myQuarterSelectionIds = [],
  roomMode = null,
  currentUserPoints,
  submissionDisabled = false,
}: HandProps) {
  const [handLayout, setHandLayout] = useHandLayout();
  const isSmallViewport = useIsSmallViewport();
  const isMultiSelect = !!(onCardSubmit || onQuarterDiscardSelection);
  const selectedIds = useMemo(
    () =>
      isMultiSelect ? selectedCardIds : selectedCardId ? [selectedCardId] : [],
    [isMultiSelect, selectedCardIds, selectedCardId],
  );
  // During normal play, only submit-for-vote is allowed. Discard with penalty is only during round intermission.
  const canSubmitCards =
    canTurnInCards && !isQuarterIntermission && !submissionDisabled;
  const cardsInHand = cards.filter((c) => c.status === "drawn");

  // During intermission: show all cards in grid; highlight those in discard selection
  const cardsToDisplay = cardsInHand;

  const canSubmitWithEnter =
    (canSubmitCards && selectedIds.length > 0) ||
    (isQuarterIntermission &&
      !!onQuarterDiscardSelection &&
      selectedIds.length > 0 &&
      !submissionDisabled);

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
      } else if (
        isQuarterIntermission &&
        onQuarterDiscardSelection &&
        selectedIds.length > 0
      ) {
        const toAdd = selectedIds.filter(
          (id) => !myQuarterSelectionIds.includes(id),
        );
        if (toAdd.length > 0)
          onQuarterDiscardSelection([...myQuarterSelectionIds, ...toAdd]);
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
    submissionDisabled,
  ]);

  if (cardsInHand.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-3 md:p-6 lg:min-h-[480px] lg:p-5 border border-border shadow-sm dark:shadow-none text-center">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 mb-3"
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
            Your Hand
          </h3>
          {currentUserPoints !== undefined && (
            <span
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 lg:hidden"
              aria-label="Your points"
            >
              {currentUserPoints} pts
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No cards right now. New cards will appear after the next draw or when
          your submissions are resolved.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg p-3 md:p-6 lg:p-5 border border-border shadow-sm dark:shadow-none flex flex-col min-h-0 min-w-0 max-h-[calc(100vh-12rem)] overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 mb-4 lg:mb-6 flex-wrap shrink-0">
        <h3 className="text-lg font-semibold lg:text-xl">
          Your Hand ({cardsToDisplay.length}/{handSize})
        </h3>
        <div className="flex items-center gap-1">
          {currentUserPoints !== undefined && (
            <span
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 min-[821px]:hidden"
              aria-label="Your points"
            >
              {currentUserPoints} pts
            </span>
          )}
          {isSmallViewport && (
            <div
              className="flex items-center gap-1 ml-2"
              role="group"
              aria-label="Card layout"
            >
              {(
                [
                  ["1v", "1 col, scroll down", "↓"],
                  ["1h", "1 col, scroll right", "→"],
                  ["2v", "2 cols, scroll down", "2↓"],
                  ["2h", "2 cols, scroll right", "2→"],
                ] as const
              ).map(([value, label, short]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHandLayout(value)}
                  title={label}
                  aria-pressed={handLayout === value}
                  className={`min-w-9 h-8 px-1.5 rounded text-xs font-medium transition-colors ${
                    handLayout === value
                      ? "bg-primary text-white"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                >
                  {short}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {!canTurnInCards && !isQuarterIntermission && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-sm shrink-0">
          Card turn-in is currently disabled by the host
        </div>
      )}
      {submissionDisabled && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm shrink-0">
          Submissions paused — round is ending
        </div>
      )}
      {isQuarterIntermission && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm shrink-0">
          Select cards from your hand and click Submit for discard. Highlighted cards are in Cards to Discard above. Remove any to keep them. When the timer ends, cards in Cards to Discard are discarded and replaced.{roomMode === "non-drinking" ? " Points apply." : " Drink penalty applies."}
        </div>
      )}

      {(canSubmitCards && selectedIds.length > 0) ||
      (isQuarterIntermission &&
        onQuarterDiscardSelection &&
        selectedIds.length > 0) ? (
        <div className="mb-4 lg:mb-6 flex gap-2 shrink-0">
          {canSubmitCards && selectedIds.length > 0 && (
            <Button
              variant="outline-primary"
              size="md"
              className="flex-1"
              onClick={() => onCardSubmit?.(selectedIds)}
            >
              Submit {selectedIds.length} Card
              {selectedIds.length !== 1 ? "s" : ""}
            </Button>
          )}
          {isQuarterIntermission &&
            onQuarterDiscardSelection &&
            selectedIds.length > 0 &&
            !submissionDisabled && (
              <Button
                variant="outline-primary"
                size="md"
                className="flex-1"
                onClick={() => {
                  const toAdd = selectedIds.filter(
                    (id) => !myQuarterSelectionIds.includes(id),
                  );
                  if (toAdd.length > 0)
                    onQuarterDiscardSelection([
                      ...myQuarterSelectionIds,
                      ...toAdd,
                    ]);
                }}
              >
                Submit {selectedIds.length} Card
                {selectedIds.length !== 1 ? "s" : ""} for discard
              </Button>
            )}
        </div>
      ) : null}
      <div
        className={
          isSmallViewport
            ? handLayout === "1v"
              ? "flex flex-col gap-2 overflow-y-auto min-h-0 flex-1 max-h-[calc(100vh-12rem)] p-1"
              : handLayout === "1h"
                ? "flex overflow-x-auto overflow-y-hidden gap-2 p-1 pb-2 snap-x snap-mandatory min-h-0 min-w-0 w-full flex-1 max-h-[calc(100vh-12rem)]"
                : handLayout === "2v"
                  ? "grid grid-cols-2 gap-2 overflow-y-auto min-h-0 flex-1 max-h-[calc(100vh-12rem)] p-1"
                  : "grid grid-flow-col gap-2 overflow-x-auto overflow-y-auto p-1 pb-2 auto-cols-[minmax(160px,min(45vw,300px))] min-h-0 min-w-0 w-full flex-1 max-h-[calc(100vh-12rem)] [grid-template-rows:repeat(2,auto)]"
            : "grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-5 p-2 overflow-y-auto min-h-0 flex-1"
        }
      >
        {cardsToDisplay.map((cardInstance, index) => {
          const isSelected = isMultiSelect
            ? selectedIds.includes(cardInstance.id)
            : selectedCardId === cardInstance.id;
          const isInDiscardSelection = myQuarterSelectionIds.includes(cardInstance.id);
          const cardClasses = isSmallViewport
            ? handLayout === "1v"
              ? "p-4 rounded-lg border-2 transition-all duration-200 ease-out cursor-pointer min-h-[280px] flex-shrink-0 w-full hover:scale-[1.01] hover:shadow-md active:scale-[0.99] animate-fade-in-up"
              : handLayout === "1h"
                ? "p-4 rounded-lg border-2 transition-all duration-200 ease-out cursor-pointer min-h-[280px] flex-shrink-0 w-[min(85vw,320px)] snap-center hover:scale-[1.01] hover:shadow-md active:scale-[0.99] animate-fade-in-up"
                : handLayout === "2v"
                  ? "p-4 rounded-lg border-2 transition-all duration-200 ease-out cursor-pointer min-h-[220px] hover:scale-[1.01] hover:shadow-md active:scale-[0.99] animate-fade-in-up"
                  : "p-4 rounded-lg border-2 transition-all duration-200 ease-out cursor-pointer hover:scale-[1.01] hover:shadow-md active:scale-[0.99] animate-fade-in-up"
            : "p-3 md:p-4 lg:p-4 rounded-lg border-2 transition-all duration-200 ease-out cursor-pointer min-h-[150px] md:min-h-[120px] lg:min-h-[220px] hover:scale-[1.02] hover:shadow-md active:scale-[0.99] animate-fade-in-up";
          return (
            <div
              key={cardInstance.id}
              onClick={() => onCardSelect?.(cardInstance.id)}
              className={`${cardClasses} ${
                isSelected
                  ? isSmallViewport
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.02] shadow-md"
                  : isInDiscardSelection
                    ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-md"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-primary/50"
              }`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <h4
                className={`font-semibold leading-tight break-words ${isSmallViewport ? "text-base mb-2" : "text-base md:text-sm lg:text-xl mb-2 md:mb-1.5 lg:mb-3"}`}
              >
                {cardInstance.card.title}
              </h4>
              <div
                className={`flex flex-wrap items-center gap-2 ${isSmallViewport ? "mb-2" : "md:gap-1.5 lg:gap-3 mb-2 md:mb-1.5 lg:mb-3"}`}
              >
                <span
                  className={`px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                    isSmallViewport
                      ? "text-xs"
                      : "text-xs md:text-[11px] lg:text-sm lg:px-3 lg:py-1"
                  } ${
                    cardInstance.card.severity === "severe"
                      ? "bg-red-500/20 text-red-600 dark:text-red-400"
                      : cardInstance.card.severity === "moderate"
                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        : "bg-green-500/20 text-green-600 dark:text-green-400"
                  }`}
                >
                  {cardInstance.card.severity}
                </span>
                <span
                  className={`px-2 py-0.5 bg-accent/20 text-accent rounded font-medium whitespace-nowrap ${isSmallViewport ? "text-xs" : "text-xs md:text-[11px] lg:text-sm lg:px-3 lg:py-1"}`}
                >
                  {cardInstance.card.points} pts
                </span>
              </div>
              <p
                className={`text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-tight ${isSmallViewport ? "text-sm" : "text-sm md:text-xs lg:text-base"}`}
              >
                {getCardDescriptionForDisplay(
                  cardInstance.card.description,
                  roomMode,
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
