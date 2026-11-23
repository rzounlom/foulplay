import { test, expect } from "@playwright/test";
import { authReady, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement, seedEndedRematchRoom } from "../helpers/seed";
import { testLog } from "../helpers/ui";
import { waitForRematchReadyCount } from "../helpers/waits";

test.describe("K. Run it back", () => {
  test.skip(
    !authReady(["host_free", "player_1", "player_2", "player_3"]),
    "Run e2e:auth:setup first",
  );

  test("ready count updates live and only opted-in players carry over", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const seeded = await seedEndedRematchRoom({
      host: "host_free",
      players: ["player_1", "player_2", "player_3"],
    });
    testLog({ test: testInfo.title, roomCode: seeded.code });

    const host = await openPersonaPage(browser, "host_free");
    const p1 = await openPersonaPage(browser, "player_1");
    const p2 = await openPersonaPage(browser, "player_2");
    const p3 = await openPersonaPage(browser, "player_3");

    try {
      for (const session of [host, p1, p2, p3]) {
        await session.page.goto(`/game/${seeded.code}/end-game`);
      }

      await p1.page.getByTestId("run-it-back").first().click();
      await waitForRematchReadyCount(host.page, 1);
      await p2.page.getByTestId("run-it-back").first().click();
      await waitForRematchReadyCount(host.page, 2);
      await host.page.getByTestId("run-it-back").first().click();
      await waitForRematchReadyCount(p2.page, 3);

      await host.page.getByTestId("start-next-game").click();
      await host.page.waitForURL(/\/game\/[A-Z0-9]{6}/, { timeout: 20_000 });
      const nextCode = host.page.url().match(/\/game\/([A-Z0-9]{6})/i)?.[1];
      expect(nextCode).toBeTruthy();
      expect(nextCode?.toUpperCase()).not.toBe(seeded.code);

      await p1.page.waitForURL(new RegExp(`/game/${nextCode}`, "i"), {
        timeout: 20_000,
      });
      await p2.page.waitForURL(new RegExp(`/game/${nextCode}`, "i"), {
        timeout: 20_000,
      });
      await expect(p3.page).not.toHaveURL(new RegExp(`/game/${nextCode}`, "i"));
    } finally {
      await Promise.all([
        host.context.close(),
        p1.context.close(),
        p2.context.close(),
        p3.context.close(),
      ]);
    }
  });
});
