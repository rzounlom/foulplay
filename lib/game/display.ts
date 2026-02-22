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

const TAKE_A_SHOT = /^Take a shot$/i;
const TAKE_N_SHOTS = /^Take (\d+) shots?$/i;
const SHOTGUN_A_BEER = /^Shotgun a beer$/i;
const SHOTGUN_N_BEERS = /^Shotgun (\d+) beers?$/i;
const FINISH_YOUR_DRINK = /^Finish your drink$/i;
const FINISH_N_DRINKS = /^Finish (\d+) drinks?$/i;

/**
 * Combines an array of penalty strings into a shorter list.
 * - "Take 2 drinks" + "Take 3 drinks" = "Take 5 drinks"
 * - "Take a shot" + "Take a shot" = "Take 2 shots"
 * - "Shotgun a beer" + "Shotgun a beer" = "Shotgun 2 beers"
 * - "Finish your drink" + "Finish your drink" = "Finish 2 drinks"
 */
export function combinePenalties(penalties: string[]): string[] {
  let drinkCount = 0;
  let shotCount = 0;
  let shotgunCount = 0;
  let finishCount = 0;
  let finishAndHalfCount = 0;
  const other: string[] = [];

  for (const p of penalties) {
    const drink = parseDrinkCount(p);
    if (drink !== null && !SEVERE_PENALTIES.includes(p as (typeof SEVERE_PENALTIES)[number])) {
      drinkCount += drink;
    } else if (TAKE_A_SHOT.test(p)) {
      shotCount += 1;
    } else {
      const shotMatch = p.match(TAKE_N_SHOTS);
      if (shotMatch) {
        shotCount += parseInt(shotMatch[1], 10);
      } else if (SHOTGUN_A_BEER.test(p)) {
        shotgunCount += 1;
      } else {
        const sgMatch = p.match(SHOTGUN_N_BEERS);
        if (sgMatch) {
          shotgunCount += parseInt(sgMatch[1], 10);
        } else if (p === "Finish your drink") {
          finishCount += 1;
        } else if (p === "Finish your drink + 1/2 another") {
          finishAndHalfCount += 1;
        } else {
          const fnMatch = p.match(FINISH_N_DRINKS);
          if (fnMatch) {
            finishCount += parseInt(fnMatch[1], 10);
          } else {
            other.push(p);
          }
        }
      }
    }
  }

  const result: string[] = [];
  if (drinkCount > 0) {
    result.push(drinkCount === 1 ? "Take a drink" : `Take ${drinkCount} drinks`);
  }
  if (shotCount > 0) {
    result.push(shotCount === 1 ? "Take a shot" : `Take ${shotCount} shots`);
  }
  if (shotgunCount > 0) {
    result.push(shotgunCount === 1 ? "Shotgun a beer" : `Shotgun ${shotgunCount} beers`);
  }
  if (finishCount > 0) {
    result.push(finishCount === 1 ? "Finish your drink" : `Finish ${finishCount} drinks`);
  }
  if (finishAndHalfCount > 0) {
    result.push(
      finishAndHalfCount === 1
        ? "Finish your drink + 1/2 another"
        : `Finish ${finishAndHalfCount} drinks + ${finishAndHalfCount}/2 another`
    );
  }
  result.push(...other);
  return result;
}

/**
 * Returns the action part of a penalty for use in combined messages.
 * - "Take 6 drinks" -> "take your 6 drinks"
 * - "Finish your drink" -> "Finish your drink"
 */
export function formatPenaltyPartForCombined(displayDescription: string): string {
  const takeMatch = displayDescription.match(/^Take (a |\d+ )?(drink|drinks|shot)s?$/i);
  if (takeMatch) {
    const countStr = takeMatch[1]?.trim();
    const count = countStr === "a" ? 1 : countStr ? parseInt(countStr, 10) : 1;
    const unit = takeMatch[2]?.toLowerCase().startsWith("shot") ? "shot" : "drink";
    const plural = count !== 1;
    const unitWord = plural ? `${unit}s` : unit;
    const amount = count === 1 ? "1 " : `${count} `;
    return `take your ${amount}${unitWord}`;
  }
  return displayDescription;
}

/**
 * Formats a penalty reminder message for display.
 * - "Take a drink" -> "Don't forget to take your 1 drink!"
 * - "Take 2 drinks" -> "Don't forget to take your 2 drinks!"
 * - "Take a shot" -> "Don't forget to take your 1 shot!"
 * - Other penalties (Shotgun, Finish, etc.) -> "Don't forget: <penalty>!"
 */
export function formatPenaltyReminder(displayDescription: string): string {
  const takeMatch = displayDescription.match(/^Take (a |\d+ )?(drink|drinks|shot)s?$/i);
  if (takeMatch) {
    const countStr = takeMatch[1]?.trim();
    const count = countStr === "a" ? 1 : countStr ? parseInt(countStr, 10) : 1;
    const unit = takeMatch[2]?.toLowerCase().startsWith("shot") ? "shot" : "drink";
    const plural = count !== 1;
    const unitWord = plural ? `${unit}s` : unit;
    const amount = count === 1 ? "1 " : `${count} `;
    return `Don't forget to take your ${amount}${unitWord}!`;
  }
  return `Don't forget: ${displayDescription}!`;
}
