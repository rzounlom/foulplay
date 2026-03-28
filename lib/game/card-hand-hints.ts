/**
 * Lightweight, client-only hints for hand cards (playability feel, no API).
 */

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

/**
 * At most one optional insight per card: Hot > Combo > Playability.
 * Spreads hints across ~1/3 of hand on average without stacking.
 */
export function getCardInsightTag(
  instanceId: string,
  cardDefinitionKey: string,
): string | null {
  const h = fnv1a32(`${instanceId}\0${cardDefinitionKey}`);
  if (h % 9 === 0) return "🔥 Hot right now";
  if (h % 11 === 0) return "🔗 Combo potential";
  if (h % 6 === 0) return PLAYABILITY[h % 3] ?? null;
  return null;
}
