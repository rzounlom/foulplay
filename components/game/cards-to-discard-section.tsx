"use client";

import { getCardDescriptionForDisplay } from "@/lib/game/display";
import {
  useHandLayout,
  useIsSmallViewport,
  type HandLayout,
} from "./hand";

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
          <div
            className="flex items-center gap-1"
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
                onClick={() => setHandLayout(value as HandLayout)}
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
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 shrink-0">
        These will be discarded when the round ends. Click Remove to keep a card.
      </p>
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
        {cardInstances.map((cardInstance, index) => {
          const cardClasses = isSmallViewport
            ? handLayout === "1v"
              ? "p-4 rounded-lg border-2 transition-all duration-200 ease-out min-h-[280px] flex-shrink-0 w-full relative"
              : handLayout === "1h"
                ? "p-4 rounded-lg border-2 transition-all duration-200 ease-out min-h-[280px] flex-shrink-0 w-[min(85vw,320px)] snap-center relative"
                : handLayout === "2v"
                  ? "p-4 rounded-lg border-2 transition-all duration-200 ease-out min-h-[220px] relative"
                  : "p-4 rounded-lg border-2 transition-all duration-200 ease-out relative"
            : "p-3 md:p-4 lg:p-4 rounded-lg border-2 transition-all duration-200 ease-out min-h-[150px] md:min-h-[120px] lg:min-h-[220px] relative";
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
