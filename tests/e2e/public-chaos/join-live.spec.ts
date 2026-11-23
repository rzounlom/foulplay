import { test, expect } from "@playwright/test";
import { authReady, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { ensureAgeConfirmed, testLog } from "../helpers/ui";

test.describe("F. Join Live Game", () => {
  test.skip(!authReady(["public_player_1"]), "Run e2e:auth:setup first");

  test("free user is never paywalled and lands in a live room", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("public_player_1", "FREE");
    const player = await openPersonaPage(browser, "public_player_1");
    try {
      await player.page.goto("/play-live");
      await ensureAgeConfirmed(player.page);
      await expect(player.page.getByTestId("paywall")).toHaveCount(0);
      await player.page.getByTestId("join-live-submit").click();
      await player.page.waitForURL(/\/game\/[A-Z0-9]{6}/, { timeout: 25_000 });
      const match = player.page.url().match(/\/game\/([A-Z0-9]{6})/i);
      testLog({
        test: testInfo.title,
        roomCode: match?.[1],
        persona: "public_player_1",
      });
      await expect(player.page.getByTestId("paywall")).toHaveCount(0);
      await expect(
        player.page.getByText(/you joined a live game/i),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await player.context.close();
    }
  });
});
