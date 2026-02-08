/**
 * Display helpers for game UI (e.g. non-drinking mode hides drink penalties)
 */

/**
 * Returns the card description to show in the UI.
 * When room mode is "non-drinking", we show a generic line instead of drink penalty text.
 */
export function getCardDescriptionForDisplay(
  description: string,
  mode: string | null
): string {
  if (mode === "non-drinking") {
    return "Earn points when this event occurs.";
  }
  return description;
}

/** True when the room mode is non-drinking (no drink penalties shown). */
export function isNonDrinkingMode(mode: string | null): boolean {
  return mode === "non-drinking";
}
