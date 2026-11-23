/**
 * Single source of truth for game modes.
 * Used for validation in API routes and type safety across engine, API, and UI.
 */

import { z } from "zod";
import { LAUNCH_MODES } from "@/lib/game/launch-scope";

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
  party: "Party — points plus drinks",
  lit: "Get Lit — intense drinking penalties",
  anything_goes: "Anything Goes",
  "non-drinking": "Non-drinking — points only",
};

/** Modes that show drinking penalties (require 21+ self-certification). */
export const DRINKING_MODES = GAME_MODES.filter(
  (mode): mode is Exclude<GameMode, "non-drinking"> => mode !== "non-drinking",
);

export function isDrinkingMode(mode: string | null | undefined): boolean {
  return mode != null && mode !== "non-drinking";
}

/**
 * Modes a user may pick in launch UI.
 * Stored rooms with a legacy mode still validate via GAME_MODES / isValidGameMode.
 * Pass currentMode so a host of an existing casual/lit room can keep that value.
 */
export function getAvailableModes(
  is21Plus: boolean | null,
  currentMode?: string | null,
): GameMode[] {
  const launch: GameMode[] =
    is21Plus === false ? ["non-drinking"] : [...LAUNCH_MODES];

  if (
    currentMode &&
    isValidGameMode(currentMode) &&
    !launch.includes(currentMode)
  ) {
    if (is21Plus === false && isDrinkingMode(currentMode)) {
      return launch;
    }
    return [currentMode, ...launch];
  }

  return launch;
}
