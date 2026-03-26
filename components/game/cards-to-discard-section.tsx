"use client";

import { useEffect } from "react";
import { getCardDescriptionForDisplay } from "@/lib/game/display";
import { useHandLayout, useIsSmallViewport } from "./hand";
import {
  HandLayoutGrid,
  getLayoutsForCardCount,
  getGridContainerClasses,
  getCardClasses,
} from "./hand-layout-grid";

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
 * Cards to Discard — shown below Your Hand during quarter intermission.
 * Matches Your Hand styling and layout for consistency.
 */
export function CardsToDiscardSection({
  cardInstances,
  onRemove,
  roomMode = null,
}: CardsToDiscardSectionProps) {
  const [handLayout, setHandLayout] = useHandLayout();
  const isSmallViewport = useIsSmallViewport();

  const validLayouts = getLayoutsForCardCount(cardInstances.length);
  const effectiveLayout = validLayouts.includes(handLayout)
    ? handLayout
    : (validLayouts[0] ?? "2v");

  useEffect(() => {
    const layouts = getLayoutsForCardCount(cardInstances.length);
    if (!layouts.includes(handLayout) && layouts.length > 0) {
      setHandLayout(layouts[0]);
    }
  }, [cardInstances.length, handLayout, setHandLayout]);

  if (cardInstances.length === 0) return null;

  return (
    <div className="bg-surface rounded-lg p-3 md:p-6 lg:p-5 border border-border shadow-sm dark:shadow-none flex flex-col min-h-0 min-w-0 max-h-[calc(100vh-12rem)] overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 mb-4 lg:mb-6 flex-wrap shrink-0">
        <h3 className="text-lg font-semibold lg:text-xl">
          Cards to Discard
          <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
            {cardInstances.length} selected
          </span>
        </h3>
        {isSmallViewport && (
          <HandLayoutGrid
            cardCount={cardInstances.length}
            currentLayout={effectiveLayout}
            onLayoutChange={setHandLayout}
          />
        )}
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 shrink-0">
        Gone when the timer ends — Remove to keep a card.
      </p>
      <div
        className={
          isSmallViewport
            ? getGridContainerClasses(effectiveLayout)
            : "grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-5 p-2 overflow-y-auto min-h-0 flex-1"
        }
      >
        {cardInstances.map((cardInstance, index) => {
          const cardClasses =
            getCardClasses(effectiveLayout, isSmallViewport, false) + " relative";
          return (
            <div
              key={cardInstance.id}
              className={`${cardClasses} border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-md animate-fade-in-up`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <button
                type="button"
                onClick={() => onRemove(cardInstance.id)}
                className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 rounded transition-colors z-10"
              >
                Remove
              </button>
              <h4
                className={`font-semibold leading-tight break-words pr-2 ${isSmallViewport ? "text-base mb-2" : "text-base md:text-sm lg:text-xl mb-2 md:mb-1.5 lg:mb-3"}`}
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
