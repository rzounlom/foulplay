import { test, expect } from "@playwright/test";
import { authReady, createMultiUserGame } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { startLobbyGame, submitFirstHandCard, testLog } from "../helpers/ui";
import { waitForScore, waitForSubmission, waitForVoteResolved } from "../helpers/waits";

test.describe("G. Basic game flow", () => {
  test.skip(
    !authReady(["host_free", "player_1", "player_2"]),
    "Run e2e:auth:setup first",
  );

  test("submit, vote accept, points update", async ({ browser }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const game = await createMultiUserGame(browser, {
      host: "host_free",
      players: ["player_1", "player_2"],
    });
    testLog({ test: testInfo.title, roomCode: game.roomCode });

    try {
      await startLobbyGame(game.hostPage);
      await Promise.all(
        [game.hostPage, ...game.playerPages].map((page) =>
          page.waitForURL(/\/game\/[A-Z0-9]{6}/, { timeout: 20_000 }),
        ),
      );

      await expect(game.hostPage.getByTestId("refresh-hand")).toBeVisible({
        timeout: 15_000,
      });
      await expect(game.hostPage.getByTestId("end-round")).toHaveCount(0);
      await expect(
        game.hostPage.getByLabel(/enable round clearing/i),
      ).toHaveCount(0);

      const submitter = game.playerPages[0];
      const voter = game.playerPages[1];
      await submitFirstHandCard(submitter);
      await waitForSubmission(voter);
      await voter.getByTestId("vote-approve-all").click();
      await waitForVoteResolved(submitter, "approved");
      await waitForScore(submitter);
    } finally {
      await game.close();
    }
  });
});
