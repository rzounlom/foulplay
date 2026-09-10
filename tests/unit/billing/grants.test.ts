import { prisma } from "@/lib/db/prisma";
import {
  grantGameNightPass,
  grantLifetimeAccess,
} from "@/lib/stripe/grant-from-checkout";
import { GAME_NIGHT_DURATION_MS } from "@/lib/billing/hosting-limits";
import { getContextualPaywallCopy } from "@/lib/billing/paywall-copy";
import { formatGameNightEnd } from "@/lib/billing/format-game-night";
import { FREE_MAX_PLAYERS, FREE_HOSTED_GAMES_PER_DAY } from "@/lib/billing/hosting-limits";

jest.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("grant entitlements from checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("grants a 24 hour Game Night pass from now", async () => {
    const now = new Date("2026-08-28T18:00:00.000Z");
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      gameNightPassExpiresAt: null,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const expires = await grantGameNightPass("user_1", now);
    expect(expires.getTime()).toBe(now.getTime() + GAME_NIGHT_DURATION_MS);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { gameNightPassExpiresAt: expires },
    });
  });

  it("extends an active Game Night instead of replacing it", async () => {
    const now = new Date("2026-08-28T18:00:00.000Z");
    const current = new Date("2026-08-29T06:00:00.000Z");
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      gameNightPassExpiresAt: current,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const expires = await grantGameNightPass("user_1", now);
    expect(expires.getTime()).toBe(current.getTime() + GAME_NIGHT_DURATION_MS);
  });

  it("sets lifetimeAccess permanently", async () => {
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    await grantLifetimeAccess("user_1");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { lifetimeAccess: true },
    });
  });
});

describe("contextual paywall copy", () => {
  it("covers host triggers without asking joiners to pay", () => {
    expect(getContextualPaywallCopy("player_limit").title).toMatch(/crew got bigger/i);
    expect(getContextualPaywallCopy("player_limit").body).toContain(String(FREE_MAX_PLAYERS));
    expect(getContextualPaywallCopy("daily_game_limit").body).toContain(
      String(FREE_HOSTED_GAMES_PER_DAY),
    );
    expect(getContextualPaywallCopy("public_hosting").title).toMatch(/public/i);
    expect(getContextualPaywallCopy("run_it_back").title).toMatch(/chaos/i);
  });
});

describe("formatGameNightEnd", () => {
  it("says tomorrow when the pass ends the next calendar day", () => {
    const now = new Date("2026-08-28T20:00:00");
    const end = new Date("2026-08-29T20:14:00");
    expect(formatGameNightEnd(end.toISOString(), now)).toMatch(/^Ends tomorrow at /);
  });
});
