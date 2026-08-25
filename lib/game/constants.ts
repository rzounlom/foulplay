/**
 * Shared gameplay constants. Safe to import from client and server.
 */

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
  return isPublicChaos ? PUBLIC_CHAOS_AUTO_ACCEPT_SECONDS : AUTO_ACCEPT_DELAY_SECONDS;
}

export function getAutoAcceptQstashDelay(isPublicChaos: boolean): string {
  return `${getAutoAcceptSeconds(isPublicChaos)}s`;
}
