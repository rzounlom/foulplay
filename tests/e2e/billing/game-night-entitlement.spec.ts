import { test, expect } from "@playwright/test";
import { authReady, createMultiUserGame, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { createPrivateRoom, ensureAgeConfirmed, joinRoomByCode, testLog } from "../helpers/ui";
import { waitForPlayerCount } from "../helpers/waits";

test.describe("C. Game Night entitlement", () => {
  test.skip(
    !authReady([
      "host_game_night",
      "player_1",
      "player_2",
      "player_3",
      "player_5",
    ]),
    "Run e2e:auth:setup first",
  );

  test("active Game Night unlocks larger rooms, ads off, public hosting, no daily cap", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_game_night", "GAME_NIGHT_ACTIVE");
    const game = await createMultiUserGame(browser, {
      host: "host_game_night",
      players: ["player_1", "player_2", "player_3"],
    });
    testLog({
      test: testInfo.title,
      roomCode: game.roomCode,
      host: "host_game_night",
      entitlement: "GAME_NIGHT_ACTIVE",
    });

    const fifth = await openPersonaPage(browser, "player_5");
    try {
      await joinRoomByCode(fifth.page, game.roomCode);
      await fifth.page.waitForURL(new RegExp(`/game/${game.roomCode}`, "i"), {
        timeout: 20_000,
      });
      await waitForPlayerCount(game.hostPage, 5);
      await expect(game.hostPage.getByTestId("paywall")).toHaveCount(0);
      await expect(game.hostPage.getByTestId("lobby-partner-strip")).toHaveCount(0);
    } finally {
      await fifth.context.close();
      await game.close();
    }

    const host = await openPersonaPage(browser, "host_game_night");
    try {
      await host.page.goto("/create");
      await ensureAgeConfirmed(host.page);
      await expect(host.page.getByTestId("paywall")).toHaveCount(0);
      await host.page.getByTestId("public-game-toggle").locator("input").check();
      await expect(host.page.getByTestId("paywall")).toHaveCount(0);
      const extra = await createPrivateRoom(host.page);
      expect(extra).toMatch(/^[A-Z0-9]{6}$/);
    } finally {
      await host.context.close();
    }
  });
});
