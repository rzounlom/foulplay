/**
 * Shared gameplay constants. Safe to import from client and server.
 */

import { e2eAutoAcceptSeconds, e2eIntermissionSeconds } from "@/lib/e2e/env";

export const AUTO_ACCEPT_DELAY_SECONDS = 30;
export const AUTO_ACCEPT_SECONDS = AUTO_ACCEPT_DELAY_SECONDS;
export const AUTO_ACCEPT_DELAY = "30s";

/** Faster vote auto-accept for drop-in public chaos rooms */
export const PUBLIC_CHAOS_AUTO_ACCEPT_SECONDS = 15;

/** Max simultaneous players in a public chaos room (matchmaking) */
export const PUBLIC_CHAOS_MAX_PLAYERS = 6;

/** Prefer joining active games with this many players (ideal band) */
export const PUBLIC_CHAOS_IDEAL_MIN = 2;
export const PUBLIC_CHAOS_IDEAL_MAX = 5;

export function getAutoAcceptSeconds(isPublicChaos: boolean): number {
  const e2e = e2eAutoAcceptSeconds();
  if (e2e != null) return e2e;
  return isPublicChaos ? PUBLIC_CHAOS_AUTO_ACCEPT_SECONDS : AUTO_ACCEPT_DELAY_SECONDS;
}

export function getAutoAcceptQstashDelay(isPublicChaos: boolean): string {
  return `${getAutoAcceptSeconds(isPublicChaos)}s`;
}

const INTERMISSION_MINUTES_DEFAULT = 5;
const INTERMISSION_MINUTES_PUBLIC_CHAOS = 2;

/** Intermission length in ms. E2E override only when APP_ENV=test. */
export function getIntermissionMs(isPublicChaos: boolean): number {
  const e2e = e2eIntermissionSeconds();
  if (e2e != null) return e2e * 1000;
  const minutes = isPublicChaos
    ? INTERMISSION_MINUTES_PUBLIC_CHAOS
    : INTERMISSION_MINUTES_DEFAULT;
  return minutes * 60 * 1000;
}
