/**
 * Rotating, punchy UI copy for points / rejection / penalty toasts.
 */

const POINTS_TEMPLATES = [
  (p: number) => `+${p} pts 🔥 that counts`,
  (p: number) => `+${p} pts 👏 good eye`,
  (p: number) => `+${p} pts 😤 that definitely happened`,
  (p: number) => `+${p} pts 🎯 perfect call`,
];

function pickIndexAvoidingRepeat(
  length: number,
  lastIndex: number | null,
): number {
  if (length <= 0) return 0;
  if (length === 1) return 0;
  let idx = Math.floor(Math.random() * length);
  let guard = 0;
  while (lastIndex !== null && idx === lastIndex && guard++ < 12) {
    idx = Math.floor(Math.random() * length);
  }
  return idx;
}

export function pickPointsAwardedMessage(
  points: number,
  lastIndex: number | null,
): { text: string; index: number } {
  const idx = pickIndexAvoidingRepeat(POINTS_TEMPLATES.length, lastIndex);
  return { text: POINTS_TEMPLATES[idx](points), index: idx };
}

const REJECTION_MESSAGES = [
  "❌ Cards rejected — back to your hand",
  "❌ Too early — hold that one",
  "❌ Not this time 😅",
];

export function pickCardsRejectedMessage(lastIndex: number | null): {
  text: string;
  index: number;
} {
  const idx = pickIndexAvoidingRepeat(REJECTION_MESSAGES.length, lastIndex);
  return { text: REJECTION_MESSAGES[idx], index: idx };
}

const TAKE_A_DRINK = /^Take a drink$/i;
const TAKE_N_DRINKS = /^Take (\d+) drinks?$/i;
const TAKE_A_SHOT = /^Take a shot$/i;
const TAKE_N_SHOTS = /^Take (\d+) shots?$/i;

/** Single combined penalty line we can describe with a count + drink/shot. */
function parseSimplePenaltyLine(line: string): {
  count: number;
  unit: "drink" | "shot";
} | null {
  if (TAKE_A_DRINK.test(line)) return { count: 1, unit: "drink" };
  const dm = line.match(TAKE_N_DRINKS);
  if (dm) return { count: parseInt(dm[1], 10), unit: "drink" };
  if (TAKE_A_SHOT.test(line)) return { count: 1, unit: "shot" };
  const sm = line.match(TAKE_N_SHOTS);
  if (sm) return { count: parseInt(sm[1], 10), unit: "shot" };
  return null;
}

const FUN_PENALTY_WITH_COUNT = [
  (c: number, u: "drink" | "shot") => {
    const w = u === "drink" ? (c === 1 ? "drink" : "drinks") : c === 1 ? "shot" : "shots";
    return `${c} ${w}… good luck 😅`;
  },
  (c: number, u: "drink" | "shot") => {
    const w = u === "drink" ? (c === 1 ? "drink" : "drinks") : c === 1 ? "shot" : "shots";
    return `Time to pay up — ${c} ${w} 🥤`;
  },
  (c: number, u: "drink" | "shot") => {
    void c;
    void u;
    return `You earned it… unfortunately 😂`;
  },
];

const FUN_PENALTY_GENERIC = [
  "Penalties await — pay up! 😅",
  "Time to pay up 🥤",
  "You earned it… unfortunately 😂",
];

/**
 * Fun rotating penalty toast. Uses count-based lines when `combined` is one
 * simple drink/shot line; otherwise uses generic punchy lines.
 */
export function pickFunPenaltyMessage(
  combined: string[],
  lastIndex: number | null,
): { text: string; index: number } {
  const simple =
    combined.length === 1 ? parseSimplePenaltyLine(combined[0]) : null;

  if (simple) {
    const idx = pickIndexAvoidingRepeat(FUN_PENALTY_WITH_COUNT.length, lastIndex);
    return {
      text: FUN_PENALTY_WITH_COUNT[idx](simple.count, simple.unit),
      index: idx,
    };
  }

  const idx = pickIndexAvoidingRepeat(FUN_PENALTY_GENERIC.length, lastIndex);
  return { text: FUN_PENALTY_GENERIC[idx], index: idx };
}
