"use client";

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
}

export function Hand({
  cards,
  onCardSelect,
  onCardSubmit,
  onCardDiscard,
  onQuarterDiscardSelection,
  selectedCardId,
  selectedCardIds = [],
  handSize = 5,
  allowQuarterClearing = false,
  currentQuarter = null,
  canTurnInCards = true,
  isQuarterIntermission = false,
  intermissionSecondsLeft = null,
  myQuarterSelectionIds = [],
}: HandProps) {
  const isMultiSelect = !!(onCardSubmit || onQuarterDiscardSelection);
  const selectedIds = isMultiSelect ? selectedCardIds : (selectedCardId ? [selectedCardId] : []);
  const canDiscardNormal =
    allowQuarterClearing &&
    onCardDiscard &&
    currentQuarter &&
    !isQuarterIntermission;
  const canSubmitCards = canTurnInCards && !isQuarterIntermission;
  const cardsInHand = cards.filter((c) => c.status === "drawn");

  const cardsToTurnIn = cardsInHand.filter((c) => myQuarterSelectionIds.includes(c.id));
  const cardsStaying =
    myQuarterSelectionIds.length > 0
      ? cardsInHand.filter((c) => !myQuarterSelectionIds.includes(c.id))
      : cardsInHand;

  if (cardsInHand.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Your Hand</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">
          No cards in hand
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
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
          Select which cards to turn in (0 to {handSize}). They will be turned in and replaced when the intermission ends. Time left:{" "}
          {intermissionSecondsLeft != null
            ? `${Math.floor((intermissionSecondsLeft ?? 0) / 60)}:${String((intermissionSecondsLeft ?? 0) % 60).padStart(2, "0")}`
            : "5:00"}
          . Drink penalty applies per card turned in.
        </div>
      )}

      {/* Turning in at end of round — submission-style card (only when user has confirmed a selection) */}
      {isQuarterIntermission && cardsToTurnIn.length > 0 && (
        <div className="mb-4 rounded-lg p-4 border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-orange-900 dark:text-orange-100">
              Turning in at end of round ({cardsToTurnIn.length} card{cardsToTurnIn.length !== 1 ? "s" : ""})
            </h3>
            <button
              type="button"
              onClick={() => onQuarterDiscardSelection?.([])}
              className="text-sm font-medium text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200 underline cursor-pointer"
            >
              Change selection
            </button>
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
            These will be turned in when the intermission ends. You’ll get new cards and points (drink penalty applies).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cardsToTurnIn.map((cardInstance) => (
              <div
                key={cardInstance.id}
                className="p-3 rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-neutral-900 min-h-0"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
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
                  {cardInstance.card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {((isMultiSelect && selectedIds.length > 0) || (isQuarterIntermission && onQuarterDiscardSelection)) && (
        <div className="mb-4 flex gap-2">
          {canSubmitCards && selectedIds.length > 0 && (
            <button
              onClick={() => onCardSubmit?.(selectedIds)}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Submit {selectedIds.length} Card{selectedIds.length !== 1 ? "s" : ""}
            </button>
          )}
          {isQuarterIntermission && onQuarterDiscardSelection && (
            <button
              onClick={() => onQuarterDiscardSelection(selectedIds)}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              {selectedIds.length > 0
                ? `Turn in ${selectedIds.length} card${selectedIds.length !== 1 ? "s" : ""} at end of round`
                : "Confirm (keep all cards)"}
            </button>
          )}
          {canDiscardNormal && selectedIds.length > 0 && (
            <button
              onClick={() => onCardDiscard?.(selectedIds)}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Discard {selectedIds.length} Card{selectedIds.length !== 1 ? "s" : ""} (Drink Penalty)
            </button>
          )}
        </div>
      )}
      {isQuarterIntermission && onQuarterDiscardSelection && selectedIds.length === 0 && cardsToTurnIn.length === 0 && (
        <div className="mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded text-sm">
          Select cards below (0 to {handSize}), then click &quot;Turn in at end of round&quot; or &quot;Confirm (keep all cards)&quot;. You can change your selection until the timer ends.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cardsStaying.map((cardInstance) => {
          const isSelected = isMultiSelect 
            ? selectedIds.includes(cardInstance.id)
            : selectedCardId === cardInstance.id;
          return (
            <div
              key={cardInstance.id}
              onClick={() => onCardSelect?.(cardInstance.id)}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer min-h-0 ${
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-primary/50"
              }`}
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
          );
        })}
      </div>
    </div>
  );
}
