/**
 * Display helpers for game UI (e.g. non-drinking mode, mode-based penalty display)
 */

/** Severe penalties that stay unchanged across modes */
const SEVERE_PENALTIES = [
  "Take a shot",
  "Shotgun a beer",
  "Finish your drink",
  "Finish your drink + 1/2 another",
] as const;

/** "Take x drink(s)" patterns - base count for mode adjustment */
const TAKE_DRINKS_PATTERN = /^Take (\d+) drink(s?)$/i;
const TAKE_A_DRINK = /^Take a drink$/i;

/**
 * Check if description is a "Take x drinks" card (adjustable by mode).
 * Excludes severe penalties (shot, shotgun, finish).
 */
function isTakeXDrinksCard(description: string): boolean {
  if (SEVERE_PENALTIES.some((p) => description === p)) return false;
  return TAKE_DRINKS_PATTERN.test(description) || TAKE_A_DRINK.test(description);
}

/**
 * Parse the base drink count from a "Take x drinks" description.
 * Returns 1 for "Take a drink", 2 for "Take 2 drinks", etc.
 */
function parseDrinkCount(description: string): number | null {
  const matchA = description.match(TAKE_A_DRINK);
  if (matchA) return 1;
  const matchN = description.match(TAKE_DRINKS_PATTERN);
  if (matchN) return parseInt(matchN[1], 10);
  return null;
}

/**
 * Returns the card description to show in the UI.
 * - non-drinking: generic message
 * - casual: base penalty as-is
 * - party: "Take x drinks" → base + 1 (severe penalties unchanged)
 * - lit: "Take x drinks" → base * 2 (severe penalties unchanged)
 */
export function getCardDescriptionForDisplay(
  description: string,
  mode: string | null
): string {
  if (mode === "non-drinking") {
    return "Earn points when this event occurs.";
  }

  if (!isTakeXDrinksCard(description)) {
    return description;
  }

  const base = parseDrinkCount(description);
  if (base === null) return description;

  if (mode === "casual") {
    return description;
  }

  if (mode === "party") {
    const count = base + 1;
    return count === 1 ? "Take a drink" : `Take ${count} drinks`;
  }

  if (mode === "lit") {
    const count = base * 2;
    return count === 1 ? "Take a drink" : `Take ${count} drinks`;
  }

  return description;
}

/** True when the room mode is non-drinking (no drink penalties shown). */
export function isNonDrinkingMode(mode: string | null): boolean {
  return mode === "non-drinking";
}
