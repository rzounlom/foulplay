import { test, expect } from "@playwright/test";
import { authReady, createMultiUserGame } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { startLobbyGame, submitFirstHandCard, testLog } from "../helpers/ui";
import { waitForSubmission, waitForVoteResolved } from "../helpers/waits";

test.describe("I. Auto accept", () => {
  test.skip(
    !authReady(["host_free", "player_1", "player_2"]),
    "Run e2e:auth:setup first",
  );

  test("submission auto-accepts after the E2E timer", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const game = await createMultiUserGame(browser, {
      host: "host_free",
      players: ["player_1", "player_2"],
    });
    testLog({
      test: testInfo.title,
      roomCode: game.roomCode,
      autoAcceptSeconds: process.env.AUTO_ACCEPT_SECONDS_E2E || "5",
    });

    try {
      await startLobbyGame(game.hostPage);
      const submitter = game.playerPages[0];
      const voter = game.playerPages[1];
      await submitFirstHandCard(submitter);
      await waitForSubmission(voter);
      await waitForVoteResolved(submitter, "approved");
      await expect(voter.getByTestId("vote-approve-all")).toHaveCount(0);
    } finally {
      await game.close();
    }
  });
});
