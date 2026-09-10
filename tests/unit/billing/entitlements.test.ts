import {
  getHostMaxPlayers,
  getUserEntitlements,
  isHostAtPlayerLimit,
  nextGameNightExpiry,
} from "@/lib/billing/entitlements";
import { FREE_MAX_PLAYERS, GAME_NIGHT_DURATION_MS } from "@/lib/billing/hosting-limits";
import { PUBLIC_CHAOS_MAX_PLAYERS } from "@/lib/game/constants";
import { isPremiumSubscription } from "@/lib/subscription/is-premium";

const future = () => new Date(Date.now() + 86_400_000);
const past = () => new Date(Date.now() - 1000);

describe("getUserEntitlements", () => {
  it("returns a free user with no premium flags", () => {
    const e = getUserEntitlements({ subscriptionStatus: "free" });
    expect(e.plan).toBe("free");
    expect(e.isPremium).toBe(false);
    expect(e.hasActiveGameNightPass).toBe(false);
    expect(e.hasMonthlySubscription).toBe(false);
    expect(e.hasLifetimeAccess).toBe(false);
    expect(e.isAdFree).toBe(false);
    expect(e.canHostUnlimitedGames).toBe(false);
    expect(e.canHostLargeRooms).toBe(false);
    expect(e.canHostPublicGames).toBe(false);
  });

  it("treats an active Game Night pass as premium and ad-free", () => {
    const expires = future();
    const e = getUserEntitlements({ gameNightPassExpiresAt: expires });
    expect(e.plan).toBe("game_night");
    expect(e.hasActiveGameNightPass).toBe(true);
    expect(e.isPremium).toBe(true);
    expect(e.isAdFree).toBe(true);
    expect(e.canHostPublicGames).toBe(true);
    expect(e.gameNightPassExpiresAt).toEqual(expires);
  });

  it("treats an expired Game Night pass as free", () => {
    const e = getUserEntitlements({ gameNightPassExpiresAt: past() });
    expect(e.plan).toBe("free");
    expect(e.hasActiveGameNightPass).toBe(false);
    expect(e.isPremium).toBe(false);
    expect(e.isAdFree).toBe(false);
  });

  it("treats an active monthly subscription as premium", () => {
    const e = getUserEntitlements({
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: future(),
    });
    expect(e.plan).toBe("monthly");
    expect(e.hasMonthlySubscription).toBe(true);
    expect(e.isPremium).toBe(true);
    expect(e.isAdFree).toBe(true);
    expect(e.canHostUnlimitedGames).toBe(true);
  });

  it("treats canceled / expired monthly as not premium", () => {
    expect(
      getUserEntitlements({ subscriptionStatus: "canceled" }).hasMonthlySubscription,
    ).toBe(false);
    expect(
      getUserEntitlements({
        subscriptionStatus: "active",
        subscriptionCurrentPeriodEnd: past(),
      }).isPremium,
    ).toBe(false);
  });

  it("treats lifetime access as premium even without a subscription", () => {
    const e = getUserEntitlements({ lifetimeAccess: true });
    expect(e.plan).toBe("lifetime");
    expect(e.hasLifetimeAccess).toBe(true);
    expect(e.isPremium).toBe(true);
    expect(e.isAdFree).toBe(true);
    expect(e.canHostPublicGames).toBe(true);
  });

  it("prefers lifetime over monthly and game night for display plan", () => {
    const e = getUserEntitlements({
      lifetimeAccess: true,
      subscriptionStatus: "active",
      subscriptionCurrentPeriodEnd: future(),
      gameNightPassExpiresAt: future(),
    });
    expect(e.plan).toBe("lifetime");
    expect(e.hasMonthlySubscription).toBe(true);
    expect(e.hasActiveGameNightPass).toBe(true);
  });
});

describe("host player limits", () => {
  const free = getUserEntitlements({});
  const premium = getUserEntitlements({ lifetimeAccess: true });

  it("caps free private hosts at FREE_MAX_PLAYERS", () => {
    expect(getHostMaxPlayers(free, false)).toBe(FREE_MAX_PLAYERS);
    expect(isHostAtPlayerLimit(free, false, 3)).toBe(false);
    expect(isHostAtPlayerLimit(free, false, 4)).toBe(true);
  });

  it("does not cap premium private hosts", () => {
    expect(getHostMaxPlayers(premium, false)).toBeNull();
    expect(isHostAtPlayerLimit(premium, false, 12)).toBe(false);
  });

  it("uses public chaos capacity for public rooms regardless of host plan", () => {
    expect(getHostMaxPlayers(free, true)).toBe(PUBLIC_CHAOS_MAX_PLAYERS);
    expect(isHostAtPlayerLimit(free, true, 4)).toBe(false);
    expect(isHostAtPlayerLimit(free, true, 6)).toBe(true);
  });
});

describe("nextGameNightExpiry", () => {
  it("grants 24 hours from now when no pass is active", () => {
    const now = new Date("2026-08-28T20:00:00.000Z");
    const expired = new Date("2026-08-27T20:00:00.000Z");
    expect(nextGameNightExpiry(null, now).getTime()).toBe(
      now.getTime() + GAME_NIGHT_DURATION_MS,
    );
    expect(nextGameNightExpiry(expired, now).getTime()).toBe(
      now.getTime() + GAME_NIGHT_DURATION_MS,
    );
  });

  it("extends from the current expiry when a pass is still active", () => {
    const now = new Date("2026-08-28T20:00:00.000Z");
    const current = new Date("2026-08-29T08:00:00.000Z");
    expect(nextGameNightExpiry(current, now).getTime()).toBe(
      current.getTime() + GAME_NIGHT_DURATION_MS,
    );
  });
});

describe("isPremiumSubscription (monthly only)", () => {
  it("does not treat lifetime or game night fields as a subscription", () => {
    expect(isPremiumSubscription({ subscriptionStatus: "free" })).toBe(false);
  });
});
