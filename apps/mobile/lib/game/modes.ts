/**
 * Launch-facing modes for the existing Expo lobby.
 * Keep this list aligned with web launch scope. Do not import the Next.js
 * game engine from here — mobile tsconfig does not share that tree.
 */
export const GAME_MODES = ["non-drinking", "party"] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const MODE_LABELS: Record<GameMode, string> = {
  "non-drinking": "Non-drinking",
  party: "Party",
};
