"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  applyHandOrder,
  HAND_LONG_PRESS_MOVE_CANCEL_PX,
  HAND_LONG_PRESS_MS,
  HAND_REORDER_HINT_KEY,
  loadHandOrder,
  reorderHandIds,
  saveHandOrder,
  syncHandOrderWithCards,
} from "@/lib/game/hand-order";

interface CardWithId {
  id: string;
}

function readShowReorderHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HAND_REORDER_HINT_KEY) !== "true";
  } catch {
    return true;
  }
}

export function useHandReorder<T extends CardWithId>(cards: T[]) {
  const [manualOrder, setManualOrder] = useState<string[] | null>(() => {
    const loaded = loadHandOrder();
    return loaded.length > 0 ? loaded : null;
  });
  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [holdingId, setHoldingId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [showReorderHint, setShowReorderHint] = useState(readShowReorderHint);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<{ x: number; y: number } | null>(null);
  const holdActivatedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const cardIdsKey = cards
    .map((c) => c.id)
    .sort()
    .join("|");

  const order = useMemo(() => {
    const stubCards = cardIdsKey
      ? cardIdsKey.split("|").map((id) => ({ id }))
      : [];
    if (stubCards.length === 0) return [];
    const base = manualOrder ?? loadHandOrder();
    return syncHandOrderWithCards(stubCards, base);
  }, [cardIdsKey, manualOrder]);

  const orderedCards = useMemo(
    () => applyHandOrder(cards, order),
    [cards, order],
  );

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartRef.current = null;
    setHoldingId(null);
    setHoldProgress(0);
  }, []);

  const enterRearrangeMode = useCallback(() => {
    holdActivatedRef.current = true;
    suppressClickRef.current = true;
    setIsRearrangeMode(true);
    clearHold();
  }, [clearHold]);

  const exitRearrangeMode = useCallback(() => {
    setIsRearrangeMode(false);
    setDraggingId(null);
    setDropTargetId(null);
    suppressClickRef.current = false;
  }, []);

  const dismissReorderHint = useCallback(() => {
    setShowReorderHint(false);
    try {
      localStorage.setItem(HAND_REORDER_HINT_KEY, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const reorderCards = useCallback(
    (activeId: string, overId: string) => {
      setManualOrder((prev) => {
        const synced = syncHandOrderWithCards(cards, prev ?? loadHandOrder());
        const next = reorderHandIds(synced, activeId, overId);
        saveHandOrder(next);
        return next;
      });
    },
    [cards],
  );

  const clearHoldTimer = useCallback(() => {
    clearHold();
  }, [clearHold]);

  const startHold = useCallback(
    (cardId: string, clientX: number, clientY: number) => {
      clearHold();
      holdStartRef.current = { x: clientX, y: clientY };
      setHoldingId(cardId);
      const startedAt = Date.now();
      holdIntervalRef.current = setInterval(() => {
        setHoldProgress(
          Math.min(1, (Date.now() - startedAt) / HAND_LONG_PRESS_MS),
        );
      }, 40);
      holdTimerRef.current = setTimeout(() => {
        enterRearrangeMode();
      }, HAND_LONG_PRESS_MS);
    },
    [clearHold, enterRearrangeMode],
  );

  const moveHold = useCallback(
    (clientX: number, clientY: number) => {
      const start = holdStartRef.current;
      if (!start) return;
      const dx = clientX - start.x;
      const dy = clientY - start.y;
      if (Math.hypot(dx, dy) > HAND_LONG_PRESS_MOVE_CANCEL_PX) {
        clearHold();
      }
    },
    [clearHold],
  );

  const endHold = useCallback(() => {
    if (holdActivatedRef.current) {
      holdActivatedRef.current = false;
    }
    clearHold();
  }, [clearHold]);

  const shouldSuppressClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return true;
    }
    return false;
  }, []);

  const startDrag = useCallback((cardId: string) => {
    setDraggingId(cardId);
    setDropTargetId(null);
  }, []);

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingId) return;
      const el = document.elementFromPoint(clientX, clientY);
      const cardEl = el?.closest("[data-hand-card-id]");
      const targetId = cardEl?.getAttribute("data-hand-card-id");
      if (targetId && targetId !== draggingId) {
        setDropTargetId(targetId);
      } else {
        setDropTargetId(null);
      }
    },
    [draggingId],
  );

  const endDrag = useCallback(() => {
    if (draggingId && dropTargetId) {
      reorderCards(draggingId, dropTargetId);
    }
    setDraggingId(null);
    setDropTargetId(null);
  }, [draggingId, dropTargetId, reorderCards]);

  return {
    orderedCards,
    isRearrangeMode,
    holdingId,
    holdProgress,
    draggingId,
    dropTargetId,
    showReorderHint,
    enterRearrangeMode,
    exitRearrangeMode,
    dismissReorderHint,
    startHold,
    moveHold,
    endHold,
    clearHoldTimer,
    shouldSuppressClick,
    startDrag,
    moveDrag,
    endDrag,
  };
}
