/**
 * Central free-tier hosting limits. Import these instead of scattering literals.
 */

export const FREE_MAX_PLAYERS = 4;
export const FREE_HOSTED_GAMES_PER_DAY = 2;

/** Duration granted by a Game Night Pass after a successful payment. */
export const GAME_NIGHT_DURATION_MS = 24 * 60 * 60 * 1000;

export type PaywallTrigger =
  | "player_limit"
  | "daily_game_limit"
  | "public_hosting"
  | "upgrade_page"
  | "profile"
  | "ad_strip"
  | "run_it_back";

export const PAYWALL_TRIGGERS = [
  "player_limit",
  "daily_game_limit",
  "public_hosting",
  "upgrade_page",
  "profile",
  "ad_strip",
  "run_it_back",
] as const;

export function isPaywallTrigger(value: unknown): value is PaywallTrigger {
  return (
    typeof value === "string" &&
    (PAYWALL_TRIGGERS as readonly string[]).includes(value)
  );
}

export const PAYWALL_ERROR_CODE = {
  HOST_PLAYER_LIMIT: "HOST_PLAYER_LIMIT",
  DAILY_HOST_LIMIT: "DAILY_HOST_LIMIT",
  PUBLIC_HOSTING_PREMIUM: "PUBLIC_HOSTING_PREMIUM",
} as const;

export type PaywallErrorCode =
  (typeof PAYWALL_ERROR_CODE)[keyof typeof PAYWALL_ERROR_CODE];

export type PaywallApiBody = {
  error: string;
  code: PaywallErrorCode;
  paywall: { trigger: PaywallTrigger };
  /** Joiners wait; they are not charged and are not added to the room. */
  waiting?: boolean;
};

export function paywallResponseBody(
  code: PaywallErrorCode,
  trigger: PaywallTrigger,
  error: string,
  extra?: { waiting?: boolean },
): PaywallApiBody {
  return {
    error,
    code,
    paywall: { trigger },
    ...(extra?.waiting ? { waiting: true } : {}),
  };
}
