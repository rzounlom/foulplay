import {
  combinePenalties,
  getCardDescriptionForDisplay,
  isNonDrinkingMode,
} from "@/lib/game/display";
import {
  buildIdentityGroups,
  countIdentityInHand,
  getCardIdentityKey,
  type CardLike,
} from "@/lib/game/card-identity";

/** UI label for severity → risk framing (sport-agnostic). */
export function getRiskLabel(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "mild") return "Safe";
  if (s === "moderate") return "Risky";
  if (s === "severe" || s === "wild") return "Chaos";
  return severity;
}

/** True when card is “higher risk” for microcopy (moderate+). */
export function isHighRewardSeverity(severity: string): boolean {
  const s = severity.toLowerCase();
  return s === "moderate" || s === "severe" || s === "wild";
}

/**
 * Sum penalty “drink units” after combining selected cards’ displayed penalties
 * (same merge rules as gameplay). Shots/finishes add to the total count for one number.
 */
export function sumCombinedPenaltyDrinkUnits(
  descriptions: string[],
  mode: string | null,
): number {
  if (isNonDrinkingMode(mode) || descriptions.length === 0) return 0;
  const displayed = descriptions.map((d) =>
    getCardDescriptionForDisplay(d, mode),
  );
  const combined = combinePenalties(displayed);
  let total = 0;
  for (const line of combined) {
    total += parsePenaltyLineToUnits(line);
  }
  return total;
}

function parsePenaltyLineToUnits(line: string): number {
  const takeDrinks = line.match(/^Take (\d+) drinks?$/i);
  if (takeDrinks) return parseInt(takeDrinks[1], 10);
  if (/^Take a drink$/i.test(line)) return 1;

  const takeShots = line.match(/^Take (\d+) shots?$/i);
  if (takeShots) return parseInt(takeShots[1], 10);
  if (/^Take a shot$/i.test(line)) return 1;

  const shotgunN = line.match(/^Shotgun (\d+) beers?$/i);
  if (shotgunN) return parseInt(shotgunN[1], 10);
  if (/^Shotgun a beer$/i.test(line)) return 1;

  const finishN = line.match(/^Finish (\d+) drinks?$/i);
  if (finishN) return parseInt(finishN[1], 10);
  if (/^Finish your drink$/i.test(line)) return 1;
  if (/Finish your drink \+ 1\/2 another/i.test(line)) return 1;

  return 0;
}

const DUPLICATE_HINTS = [
  "Duplicate in hand 👀",
  "Double play potential",
  "You’ve got 2 of this one",
] as const;

type HandCardForHint = { id: string; card: CardLike };

/**
 * Derives duplicate-aware helper copy (no effects — safe for useMemo).
 * Variant is stable for a given selection + hand fingerprint (deterministic hash).
 */
export function computeDuplicateSelectionHint(
  canSubmitCards: boolean,
  selectedIds: string[],
  cardsToDisplay: HandCardForHint[],
  selectedSig: string,
  handFingerprint: string,
): string | null {
  if (!canSubmitCards || selectedIds.length === 0) return null;
  const groups = buildIdentityGroups(cardsToDisplay);
  let maxTotal = 0;
  let anyDuplicateRemaining = false;
  for (const sid of selectedIds) {
    const ci = cardsToDisplay.find((c) => c.id === sid);
    if (!ci) continue;
    const key = getCardIdentityKey(ci.card);
    const total = countIdentityInHand(groups, key);
    const groupIds = groups.get(key) ?? [];
    const selectedInGroup = selectedIds.filter((id) =>
      groupIds.includes(id),
    ).length;
    if (total >= 2 && total - selectedInGroup > 0) {
      anyDuplicateRemaining = true;
      maxTotal = Math.max(maxTotal, total);
    }
  }
  if (!anyDuplicateRemaining) return null;

  const seed = `${selectedSig}:${handFingerprint}:${maxTotal}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % DUPLICATE_HINTS.length;
  let text: string = DUPLICATE_HINTS[idx];
  if (text === "You’ve got 2 of this one" && maxTotal !== 2) {
    text = `You’ve got ${maxTotal} of this one`;
  }
  return text;
}
