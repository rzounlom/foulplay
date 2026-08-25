/**
 * Lightweight, client-only hints for hand cards (playability feel, no API).
 */

import {
  cardShowsComboInsight,
  type ComboCardFields,
} from "@/lib/game/combo-rules";
import { getCardIdentityKey, type CardLike } from "@/lib/game/card-identity";

/** FNV-1a 32-bit — stable per instance + definition. */
export function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Severity chip: emoji + risk word (replaces raw severity text in hand). */
export function getSeverityRiskEmojiLabel(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "mild") return "🟢 Safe";
  if (s === "moderate") return "🟡 Risky";
  if (s === "severe" || s === "wild") return "🔴 Chaos";
  return severity;
}

const PLAYABILITY = ["🔥 Likely soon", "👀 Happens often", "🎯 Good bet"] as const;

export type CardInsightInput = {
  instanceId: string;
  card: ComboCardFields;
  /** Full in-hand definitions for cluster / combo rules. */
  handCards: ComboCardFields[];
  identityGroupSize: number;
};

/**
 * At most one optional insight per card: Hot > Combo (rules) > Playability (hash).
 */
export function getCardInsightTag(input: CardInsightInput): string | null {
  if (
    cardShowsComboInsight(input.card, {
      hand: input.handCards,
      identityGroupSize: input.identityGroupSize,
    })
  ) {
    return "🔗 Combo potential";
  }

  const definitionKey = getCardIdentityKey(input.card as CardLike);
  const h = fnv1a32(`${input.instanceId}\0${definitionKey}`);
  if (h % 9 === 0) return "🔥 Hot right now";
  if (h % 6 === 0) return PLAYABILITY[h % 3] ?? null;
  return null;
}
