import { test, expect } from "@playwright/test";
import { authReady, createMultiUserGame, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { joinRoomByCode, testLog } from "../helpers/ui";
import { waitForJoinWaiting, waitForPaywall, waitForPlayerCount } from "../helpers/waits";

test.describe("B. Fifth player paywall", () => {
  test.skip(
    !authReady(["host_free", "player_1", "player_2", "player_3", "player_5"]),
    "Run e2e:auth:setup first",
  );

  test("fifth joiner waits for free; host sees player-limit paywall", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const game = await createMultiUserGame(browser, {
      host: "host_free",
      players: ["player_1", "player_2", "player_3"],
    });
    testLog({
      test: testInfo.title,
      roomCode: game.roomCode,
      host: "host_free",
    });

    const fifth = await openPersonaPage(browser, "player_5");
    try {
      await waitForPlayerCount(game.hostPage, 4);
      await joinRoomByCode(fifth.page, game.roomCode);
      await waitForJoinWaiting(fifth.page);
      await expect(fifth.page.getByTestId("paywall")).toHaveCount(0);
      await expect(fifth.page).not.toHaveURL(/\/upgrade/);
      await waitForPaywall(game.hostPage, "player_limit");
    } finally {
      await fifth.context.close();
      await game.close();
    }
  });
});
