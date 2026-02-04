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
  selectedCardId?: string | null;
  currentUserId: string;
  playerId: string;
}

export function Hand({
  cards,
  onCardSelect,
  selectedCardId,
  currentUserId,
  playerId,
}: HandProps) {

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
        Your Hand ({cards.length}/5)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((cardInstance) => {
          const isSelected = selectedCardId === cardInstance.id;
          return (
            <div
              key={cardInstance.id}
              onClick={() => onCardSelect?.(cardInstance.id)}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-primary/50"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{cardInstance.card.title}</h4>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      cardInstance.card.severity === "severe"
                        ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : cardInstance.card.severity === "moderate"
                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        : "bg-green-500/20 text-green-600 dark:text-green-400"
                    }`}
                  >
                    {cardInstance.card.severity}
                  </span>
                  <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs font-medium">
                    {cardInstance.card.points} pts
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                {cardInstance.card.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
