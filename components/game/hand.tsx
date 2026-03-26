"use client";

import { useEffect, useMemo, useState } from "react";
import { AUTO_ACCEPT_SECONDS } from "@/lib/game/constants";

import { Button } from "@/components/ui/button";
import {
  getCardDescriptionForDisplay,
  isNonDrinkingMode,
} from "@/lib/game/display";
import { buildIdentityGroups, getCardIdentityKey } from "@/lib/game/card-identity";
import {
  computeDuplicateSelectionHint,
  getRiskLabel,
  isHighRewardSeverity,
  sumCombinedPenaltyDrinkUnits,
} from "@/lib/game/selection-metrics";
import {
  HandLayoutGrid,
  getLayoutsForCardCount,
  getGridContainerClasses,
  getCardClasses,
  type HandLayout,
} from "./hand-layout-grid";

export const HAND_LAYOUT_KEY = "foulplay-hand-layout";
export type { HandLayout } from "./hand-layout-grid";

const VALID_LAYOUTS: HandLayout[] = [
  "1v",
  "1h",
  "2v",
  "2h",
  "3v",
  "3h",
];

export function useHandLayout() {
  const [layout, setLayout] = useState<HandLayout>(() => {
    if (typeof window === "undefined") return "2v";
    try {
      const stored = localStorage.getItem(HAND_LAYOUT_KEY) as HandLayout | null;
      if (stored && VALID_LAYOUTS.includes(stored)) return stored;
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

export function useIsSmallViewport() {
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
  /** Optional shared definition id when present on API payload */
  templateId?: string | null;
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
  /** When true, user has pending submission — show wait message and block new submissions */
  hasPendingSubmission?: boolean;
  /** ISO string when user's pending submission will auto-accept (for countdown display) */
  pendingSubmissionAutoAcceptAt?: string | null;
  /** First-session hint beside the “Your Hand” heading (inline gameplay guidance) */
  showStartHereHint?: boolean;
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
  hasPendingSubmission = false,
  pendingSubmissionAutoAcceptAt = null,
  showStartHereHint = false,
}: HandProps) {
  const [handLayout, setHandLayout] = useHandLayout();
  const isSmallViewport = useIsSmallViewport();
  const [pendingSecondsLeft, setPendingSecondsLeft] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!hasPendingSubmission || !pendingSubmissionAutoAcceptAt) return;
    const compute = () => {
      const target = new Date(pendingSubmissionAutoAcceptAt).getTime();
      const secs = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setPendingSecondsLeft(secs);
    };
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [hasPendingSubmission, pendingSubmissionAutoAcceptAt]);
  const isMultiSelect = !!(onCardSubmit || onQuarterDiscardSelection);
  const cardsInHand = cards.filter((c) => c.status === "drawn");
  const cardsToDisplay = cardsInHand;

  const selectedIds = useMemo(
    () =>
      isMultiSelect ? selectedCardIds : selectedCardId ? [selectedCardId] : [],
    [isMultiSelect, selectedCardIds, selectedCardId],
  );

  /** Cards queued for discard + current selection (each = one penalty). */
  const discardPenaltyPreviewCount = useMemo(() => {
    if (!isQuarterIntermission) return 0;
    return new Set([...myQuarterSelectionIds, ...selectedIds]).size;
  }, [isQuarterIntermission, myQuarterSelectionIds, selectedIds]);
  const canSubmitCards =
    canTurnInCards &&
    !isQuarterIntermission &&
    !submissionDisabled &&
    !hasPendingSubmission;

  const selectedSubmissionPotentialPoints = useMemo(() => {
    if (!canSubmitCards || selectedIds.length === 0) return 0;
    return cardsToDisplay
      .filter((c) => selectedIds.includes(c.id))
      .reduce((sum, c) => sum + c.card.points, 0);
  }, [canSubmitCards, selectedIds, cardsToDisplay]);

  const identityGroups = useMemo(
    () => buildIdentityGroups(cardsToDisplay),
    [cardsToDisplay],
  );

  /** Stable across parent re-renders when hand content is unchanged (avoids duplicate-hint effect loops). */
  const handFingerprint = useMemo(
    () =>
      cardsToDisplay
        .map((c) => `${c.id}:${getCardIdentityKey(c.card)}`)
        .sort()
        .join("|"),
    [cardsToDisplay],
  );

  const selectedSig = useMemo(
    () => [...selectedIds].sort().join(","),
    [selectedIds],
  );

  const selectedCombinedDrinkUnits = useMemo(() => {
    if (!canSubmitCards || selectedIds.length === 0) return 0;
    const descs = cardsToDisplay
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => c.card.description);
    return sumCombinedPenaltyDrinkUnits(descs, roomMode);
  }, [canSubmitCards, selectedIds, cardsToDisplay, roomMode]);

  const duplicateSelectionHint = useMemo(
    () =>
      computeDuplicateSelectionHint(
        canSubmitCards,
        selectedIds,
        cardsToDisplay,
        selectedSig,
        handFingerprint,
      ),
    [
      canSubmitCards,
      selectedIds,
      cardsToDisplay,
      selectedSig,
      handFingerprint,
    ],
  );

  // Ensure layout is valid for current card count (e.g. user had 6 cards with 6v, then drew down to 3)
  const validLayouts = getLayoutsForCardCount(cardsToDisplay.length);
  const effectiveLayout = validLayouts.includes(handLayout)
    ? handLayout
    : (validLayouts[0] ?? "2v");

  useEffect(() => {
    const layouts = getLayoutsForCardCount(cardsToDisplay.length);
    if (!layouts.includes(handLayout) && layouts.length > 0) {
      setHandLayout(layouts[0]);
    }
  }, [cardsToDisplay.length, handLayout, setHandLayout]);

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
        <div className="flex items-start sm:items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
              Your Hand
            </h3>
            {showStartHereHint && (
              <span
                className="inline-flex items-center rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-primary shadow-sm"
                role="status"
              >
                Start here — pick a card
              </span>
            )}
          </div>
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
      <div className="flex items-start sm:items-center justify-between gap-x-3 gap-y-2 mb-4 lg:mb-6 flex-wrap shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1 min-w-0 flex-1">
          <h3 className="text-lg font-semibold lg:text-xl shrink-0">
            Your Hand ({cardsToDisplay.length}/{handSize})
          </h3>
          {showStartHereHint && (
            <span
              className="inline-flex items-center rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-primary shadow-sm"
              role="status"
            >
              Start here — pick a card
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {currentUserPoints !== undefined && (
            <span
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 min-[821px]:hidden"
              aria-label="Your points"
            >
              {currentUserPoints} pts
            </span>
          )}
          {isSmallViewport && (
            <HandLayoutGrid
              cardCount={cardsToDisplay.length}
              currentLayout={effectiveLayout}
              onLayoutChange={setHandLayout}
            />
          )}
        </div>
      </div>
      {!canTurnInCards && !isQuarterIntermission && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-sm shrink-0">
          Card turn-in is currently disabled by the host
        </div>
      )}
      {hasPendingSubmission && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm shrink-0">
          Wait until your current cards are voted on or auto-accepted
          {pendingSecondsLeft != null ? (
            <> ({pendingSecondsLeft}s)</>
          ) : (
            <> ({AUTO_ACCEPT_SECONDS}s)</>
          )}{" "}
          before submitting new cards.
        </div>
      )}
      {submissionDisabled && !hasPendingSubmission && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm shrink-0">
          Submissions paused — please wait
        </div>
      )}
      {isQuarterIntermission && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm shrink-0 space-y-1">
          <p className="font-medium leading-snug">
            Pick cards to discard
            <br />
            Get new ones after the timer
            <br />
            More cards = more penalty
          </p>
        </div>
      )}
      {isQuarterIntermission && discardPenaltyPreviewCount > 0 && (
        <p
          className="mb-4 text-sm font-semibold text-amber-900 dark:text-amber-100 shrink-0"
          aria-live="polite"
        >
          {discardPenaltyPreviewCount} card
          {discardPenaltyPreviewCount !== 1 ? "s" : ""} selected →{" "}
          {discardPenaltyPreviewCount} penalty
          {discardPenaltyPreviewCount !== 1 ? "ies" : ""}
        </p>
      )}

      {(canSubmitCards && selectedIds.length > 0) ||
      (isQuarterIntermission &&
        onQuarterDiscardSelection &&
        selectedIds.length > 0) ? (
        <div className="mb-4 lg:mb-6 flex flex-col gap-2 shrink-0">
          {canSubmitCards && selectedIds.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {selectedIds.length}{" "}
                {selectedIds.length === 1 ? "card" : "cards"} → +
                {selectedSubmissionPotentialPoints} pts
                {!isNonDrinkingMode(roomMode) && (
                  <>
                    {" "}
                    / {selectedCombinedDrinkUnits} drinks ⚖️
                  </>
                )}
                {isNonDrinkingMode(roomMode) && " ⚖️"}
              </p>
              <p className="text-xs text-primary dark:text-primary/90 font-medium">
                {selectedIds.length}{" "}
                {selectedIds.length === 1 ? "card" : "cards"} → potential +
                {selectedSubmissionPotentialPoints} pts 😏
              </p>
              {selectedIds.length >= 2 && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  🔥 Combo potential
                </p>
              )}
              {selectedIds.length >= 3 && (
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  Big swing if these hit 😈
                </p>
              )}
              {duplicateSelectionHint && (
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {duplicateSelectionHint}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">
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
        </div>
      ) : null}
      <div
        className={
          isSmallViewport
            ? getGridContainerClasses(effectiveLayout)
            : "grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-5 p-2 overflow-y-auto min-h-0 flex-1"
        }
      >
        {cardsToDisplay.map((cardInstance, index) => {
          const isSelected = isMultiSelect
            ? selectedIds.includes(cardInstance.id)
            : selectedCardId === cardInstance.id;
          const isInDiscardSelection = myQuarterSelectionIds.includes(cardInstance.id);
          const cardClasses = getCardClasses(
            effectiveLayout,
            isSmallViewport,
            true
          );
          const identityKey = getCardIdentityKey(cardInstance.card);
          const groupSize = identityGroups.get(identityKey)?.length ?? 1;
          const isDupGroup = groupSize >= 2;
          const highRewardCard = isHighRewardSeverity(cardInstance.card.severity);
          return (
            <div
              key={cardInstance.id}
              onClick={() =>
                !submissionDisabled &&
                (!hasPendingSubmission || isQuarterIntermission) &&
                onCardSelect?.(cardInstance.id)
              }
              className={`relative group ${cardClasses} ${submissionDisabled || (hasPendingSubmission && !isQuarterIntermission) ? "pointer-events-none opacity-75" : ""} ${
                isSelected
                  ? isSmallViewport
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.02] shadow-md"
                  : isInDiscardSelection
                    ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-md"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-primary/50"
              } ${isDupGroup && !isSelected ? "ring-1 ring-amber-500/40 shadow-[inset_0_0_14px_rgba(245,158,11,0.07)]" : ""}`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {isDupGroup && (
                <span
                  className="absolute top-1.5 right-1.5 z-10 rounded-md bg-amber-950/85 text-amber-100 text-[10px] font-bold px-1.5 py-0.5 tabular-nums shadow-sm"
                  aria-hidden
                >
                  x{groupSize}
                </span>
              )}
              <h4
                className={`font-semibold leading-tight break-words pr-8 ${isSmallViewport ? "text-base mb-2" : "text-base md:text-sm lg:text-xl mb-2 md:mb-1.5 lg:mb-3"}`}
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
                  className={`px-2 py-0.5 rounded font-medium whitespace-nowrap border border-border/60 text-neutral-700 dark:text-neutral-300 ${
                    isSmallViewport ? "text-[10px]" : "text-[10px] md:text-[11px] lg:text-xs"
                  }`}
                >
                  {getRiskLabel(cardInstance.card.severity)}
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
              {highRewardCard && (
                <p
                  className={`mt-1.5 text-[10px] sm:text-[11px] italic text-center text-neutral-500 dark:text-neutral-400 transition-opacity ${
                    isSelected
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  High reward if this hits 😈
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
