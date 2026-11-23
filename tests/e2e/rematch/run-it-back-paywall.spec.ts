import { test, expect } from "@playwright/test";
import { authReady, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement, seedEndedRematchRoom } from "../helpers/seed";
import { testLog } from "../helpers/ui";
import { waitForPaywall, waitForRematchReadyCount } from "../helpers/waits";

test.describe("L. Run it back paywall", () => {
  test.skip(
    !authReady(["host_free", "player_1", "player_2"]),
    "Run e2e:auth:setup first",
  );

  test("players can ready; host at daily limit is paywalled and ready state stays", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE_DAILY_LIMIT_EXHAUSTED");
    const seeded = await seedEndedRematchRoom({
      host: "host_free",
      players: ["player_1", "player_2"],
    });
    testLog({
      test: testInfo.title,
      roomCode: seeded.code,
      entitlement: "FREE_DAILY_LIMIT_EXHAUSTED",
    });

    const host = await openPersonaPage(browser, "host_free");
    const p1 = await openPersonaPage(browser, "player_1");
    const p2 = await openPersonaPage(browser, "player_2");

    try {
      for (const session of [host, p1, p2]) {
        await session.page.goto(`/game/${seeded.code}/end-game`);
      }
      await p1.page.getByTestId("run-it-back").first().click();
      await p2.page.getByTestId("run-it-back").first().click();
      await waitForRematchReadyCount(host.page, 2);
      await host.page.getByTestId("start-next-game").click();
      await waitForPaywall(host.page, "run_it_back");
      await waitForRematchReadyCount(host.page, 2);
      await expect(p1.page.getByText(/you’re in|you're in/i)).toBeVisible();
    } finally {
      await Promise.all([
        host.context.close(),
        p1.context.close(),
        p2.context.close(),
      ]);
    }
  });
});
