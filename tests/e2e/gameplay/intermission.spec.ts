import { test, expect } from "@playwright/test";
import { authReady, createMultiUserGame } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { startLobbyGame, testLog } from "../helpers/ui";
import { waitForRoundState } from "../helpers/waits";

test.describe("J. Intermission / end round", () => {
  test.skip(
    !authReady(["host_free", "player_1", "player_2"]),
    "Run e2e:auth:setup first",
  );

  test("host ends the round; players discard, lock in, and host can end early", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const game = await createMultiUserGame(browser, {
      host: "host_free",
      players: ["player_1", "player_2"],
      allowQuarterClearing: true,
    });
    testLog({ test: testInfo.title, roomCode: game.roomCode });

    try {
      await startLobbyGame(game.hostPage);

      const endRound = game.hostPage.getByTestId("end-round").first();
      if (!(await endRound.isVisible().catch(() => false))) {
        await game.hostPage.getByRole("button", { name: /show more controls/i }).click();
      }
      await game.hostPage.getByTestId("end-round").first().click();
      await game.hostPage.getByTestId("end-round-confirm").click();
      await waitForRoundState(game.playerPages[0], /discard cards to get new ones/i);

      const player = game.playerPages[0];
      const before = await player.getByTestId("hand-card").count();
      await player.getByTestId("hand-card").first().click();
      await player.getByTestId("intermission-discard-submit").click();
      await player.getByTestId("intermission-lock-in").click();
      await expect(player.getByTestId("intermission-lock-in")).toContainText(/unlock/i);

      await game.hostPage.getByTestId("end-round-early").click();
      await game.hostPage.getByRole("button", { name: /start next round/i }).last().click();
      await expect(player.getByTestId("hand-card")).toHaveCount(before, {
        timeout: 20_000,
      });
    } finally {
      await game.close();
    }
  });
});
