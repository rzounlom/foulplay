/**
 * Single source of truth for game modes.
 * Used for validation in API routes and type safety across engine, API, and UI.
 */

import { z } from "zod";

/** All valid game modes. Non-drinking affects display only; others affect severe caps. */
export const GAME_MODES = [
  "casual",
  "party",
  "lit",
  "anything_goes",
  "non-drinking",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

/** Zod schema for required game mode validation. */
export const gameModeSchema = z.enum(GAME_MODES);

/** Zod schema for optional game mode (e.g. PATCH where mode may be omitted). */
export const gameModeSchemaOptional = gameModeSchema.optional();

/** Type for validated optional mode. */
export type GameModeOptional = GameMode | undefined;

/** Check if a string is a valid game mode. */
export function isValidGameMode(value: unknown): value is GameMode {
  return gameModeSchema.safeParse(value).success;
}

/** Display labels for each game mode (for UI selects). */
export const MODE_LABELS: Record<GameMode, string> = {
  casual: "Casual — mild drinking penalties",
  party: "Party — balanced mix",
  lit: "Get Lit — intense drinking penalties",
  anything_goes: "Anything Goes",
  "non-drinking": "Non-drinking",
};
