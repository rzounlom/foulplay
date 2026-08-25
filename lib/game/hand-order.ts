export const HAND_ORDER_STORAGE_KEY = "foulplay-hand-card-order";
export const HAND_REORDER_HINT_KEY = "foulplay-hand-reorder-hint-dismissed";

export const HAND_LONG_PRESS_MS = 1000;
export const HAND_LONG_PRESS_MOVE_CANCEL_PX = 12;

interface CardWithId {
  id: string;
}

export function loadHandOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HAND_ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function saveHandOrder(order: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HAND_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* ignore */
  }
}

/** Apply saved order; unknown / new cards append at the end. */
export function applyHandOrder<T extends CardWithId>(
  cards: T[],
  savedOrder: string[],
): T[] {
  if (savedOrder.length === 0) return cards;

  const byId = new Map(cards.map((c) => [c.id, c]));
  const ordered: T[] = [];

  for (const id of savedOrder) {
    const card = byId.get(id);
    if (card) {
      ordered.push(card);
      byId.delete(id);
    }
  }

  for (const card of cards) {
    if (byId.has(card.id)) {
      ordered.push(card);
    }
  }

  return ordered;
}

export function reorderHandIds(
  order: string[],
  activeId: string,
  overId: string,
): string[] {
  const fromIndex = order.indexOf(activeId);
  const toIndex = order.indexOf(overId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return order;
  }

  const next = [...order];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

export function syncHandOrderWithCards(
  cards: CardWithId[],
  currentOrder: string[],
): string[] {
  const ids = cards.map((c) => c.id);
  const idSet = new Set(ids);
  const next = currentOrder.filter((id) => idSet.has(id));
  for (const id of ids) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}
