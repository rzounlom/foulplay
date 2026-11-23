import { test, expect } from "@playwright/test";
import { authReady, createMultiUserGame } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { startLobbyGame, submitFirstHandCard, testLog } from "../helpers/ui";
import { waitForSubmission, waitForVoteResolved } from "../helpers/waits";

test.describe("H. Rejection flow", () => {
  test.skip(
    !authReady(["host_free", "player_1", "player_2"]),
    "Run e2e:auth:setup first",
  );

  test("majority reject returns the card and shows rejection UI", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const game = await createMultiUserGame(browser, {
      host: "host_free",
      players: ["player_1", "player_2"],
    });
    testLog({ test: testInfo.title, roomCode: game.roomCode });

    try {
      await startLobbyGame(game.hostPage);
      const submitter = game.playerPages[0];
      const voter = game.playerPages[1];
      const before = await submitter.getByTestId("hand-card").count();
      await submitFirstHandCard(submitter);
      await waitForSubmission(voter);
      await voter.getByTestId("vote-reject-all").click();
      await waitForVoteResolved(submitter, "rejected");
      await expect(submitter.locator(".cards-rejected-popup")).toBeVisible({
        timeout: 15_000,
      });
      await expect(submitter.getByTestId("hand-card")).toHaveCount(before, {
        timeout: 15_000,
      });
    } finally {
      await game.close();
    }
  });
});
