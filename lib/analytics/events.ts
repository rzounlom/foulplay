/** Canonical analytics event names stored in AnalyticsEvent.name */

export const ANALYTICS_EVENTS = [
  "user_signup_synced",
  "age_gate_confirmed",
  "room_created",
  "room_joined",
  "game_started",
  "game_ended",
  "room_abandoned",
  "rematch_started",
  "drop_in_matched",
  "submission_created",
  // Legacy public chaos names (still emitted for webhook compat)
  "public_room_created",
  "public_room_joined",
  "public_room_game_started",
  "public_room_run_it_back",
  "public_room_abandoned",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export type PublicChaosJoinSource = "drop_in" | "invite_link";

/** Event names counted as "game started" in dashboards */
export const GAME_STARTED_EVENT_NAMES = [
  "game_started",
  "public_room_game_started",
] as const;

/** Event names counted as "game ended" in dashboards */
export const GAME_ENDED_EVENT_NAMES = ["game_ended"] as const;

export const ROOM_CREATED_EVENT_NAMES = [
  "room_created",
  "public_room_created",
] as const;

export const ROOM_JOINED_EVENT_NAMES = [
  "room_joined",
  "public_room_joined",
] as const;
