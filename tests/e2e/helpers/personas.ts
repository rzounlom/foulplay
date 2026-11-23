export const E2E_PERSONA_KEYS = [
  "host_free",
  "host_game_night",
  "host_monthly",
  "host_lifetime",
  "player_1",
  "player_2",
  "player_3",
  "player_4",
  "player_5",
  "public_player_1",
  "public_player_2",
] as const;

export type E2ePersonaKey = (typeof E2E_PERSONA_KEYS)[number];

export type EntitlementSeed =
  | "FREE"
  | "GAME_NIGHT_ACTIVE"
  | "GAME_NIGHT_EXPIRED"
  | "MONTHLY_ACTIVE"
  | "MONTHLY_CANCELED_OR_EXPIRED"
  | "LIFETIME"
  | "FREE_DAILY_LIMIT_EXHAUSTED";

export type E2ePersona = {
  key: E2ePersonaKey;
  email: string;
  displayName: string;
  defaultEntitlement: EntitlementSeed;
};

export const E2E_PERSONAS: Record<E2ePersonaKey, E2ePersona> = {
  host_free: {
    key: "host_free",
    email: "host-free@e2e.foulplay.test",
    displayName: "Host Free",
    defaultEntitlement: "FREE",
  },
  host_game_night: {
    key: "host_game_night",
    email: "host-gamenight@e2e.foulplay.test",
    displayName: "Host Game Night",
    defaultEntitlement: "GAME_NIGHT_ACTIVE",
  },
  host_monthly: {
    key: "host_monthly",
    email: "host-monthly@e2e.foulplay.test",
    displayName: "Host Monthly",
    defaultEntitlement: "MONTHLY_ACTIVE",
  },
  host_lifetime: {
    key: "host_lifetime",
    email: "host-lifetime@e2e.foulplay.test",
    displayName: "Host Lifetime",
    defaultEntitlement: "LIFETIME",
  },
  player_1: {
    key: "player_1",
    email: "player-1@e2e.foulplay.test",
    displayName: "Player One",
    defaultEntitlement: "FREE",
  },
  player_2: {
    key: "player_2",
    email: "player-2@e2e.foulplay.test",
    displayName: "Player Two",
    defaultEntitlement: "FREE",
  },
  player_3: {
    key: "player_3",
    email: "player-3@e2e.foulplay.test",
    displayName: "Player Three",
    defaultEntitlement: "FREE",
  },
  player_4: {
    key: "player_4",
    email: "player-4@e2e.foulplay.test",
    displayName: "Player Four",
    defaultEntitlement: "FREE",
  },
  player_5: {
    key: "player_5",
    email: "player-5@e2e.foulplay.test",
    displayName: "Player Five",
    defaultEntitlement: "FREE",
  },
  public_player_1: {
    key: "public_player_1",
    email: "public-1@e2e.foulplay.test",
    displayName: "Public One",
    defaultEntitlement: "FREE",
  },
  public_player_2: {
    key: "public_player_2",
    email: "public-2@e2e.foulplay.test",
    displayName: "Public Two",
    defaultEntitlement: "FREE",
  },
};

export function e2ePassword(): string {
  const pw = process.env.E2E_CLERK_PASSWORD;
  if (!pw) {
    throw new Error("E2E_CLERK_PASSWORD is required to create/sign-in test users");
  }
  return pw;
}
