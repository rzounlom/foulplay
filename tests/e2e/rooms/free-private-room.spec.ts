import { test, expect } from "@playwright/test";
import { authReady, createMultiUserGame } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { waitForPlayerCount } from "../helpers/waits";
import { testLog } from "../helpers/ui";

const personas = ["host_free", "player_1", "player_2", "player_3"] as const;

test.describe("A. Free private room", () => {
  test.skip(!authReady([...personas]), "Run e2e:auth:setup first");

  test("host_free creates a private room and three players join", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const game = await createMultiUserGame(browser, {
      host: "host_free",
      players: ["player_1", "player_2", "player_3"],
    });
    testInfo.attach("room", {
      body: game.roomCode,
      contentType: "text/plain",
    });
    testLog({
      test: testInfo.title,
      roomCode: game.roomCode,
      host: "host_free",
      entitlement: "FREE",
    });

    try {
      await waitForPlayerCount(game.hostPage, 4);
      await expect(game.hostPage.getByTestId("lobby-start-game")).toBeVisible();
      await expect(game.hostPage.getByTestId("paywall")).toHaveCount(0);
      await expect(game.hostPage.getByTestId("lobby-partner-strip")).toBeVisible();
    } finally {
      await game.close();
    }
  });
});
