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
  selectedCardId?: string | null;
  selectedCardIds?: string[];
  handSize?: number;
}

export function Hand({
  cards,
  onCardSelect,
  onCardSubmit,
  selectedCardId,
  selectedCardIds = [],
  handSize = 5,
}: HandProps) {
  const isMultiSelect = !!onCardSubmit;
  const selectedIds = isMultiSelect ? selectedCardIds : (selectedCardId ? [selectedCardId] : []);

  if (cards.length === 0) {
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
        Your Hand ({cards.length}/{handSize})
      </h3>
      {isMultiSelect && selectedIds.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => onCardSubmit?.(selectedIds)}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Submit {selectedIds.length} Card{selectedIds.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((cardInstance) => {
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
