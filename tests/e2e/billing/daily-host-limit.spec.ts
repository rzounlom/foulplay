import { test, expect } from "@playwright/test";
import { authReady, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { ensureAgeConfirmed, testLog } from "../helpers/ui";
import { waitForPaywall } from "../helpers/waits";

test.describe("D. Daily host limit", () => {
  test.skip(
    !authReady(["host_free", "player_1"]),
    "Run e2e:auth:setup first",
  );

  test("third private game paywalls the host; joiners are not charged", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE_DAILY_LIMIT_EXHAUSTED");
    const host = await openPersonaPage(browser, "host_free");
    try {
      await host.page.goto("/create");
      await ensureAgeConfirmed(host.page);
      await host.page.locator("#mode").selectOption("non-drinking");
      await host.page.locator("#sport").selectOption("football");
      await host.page.getByTestId("create-room-submit").click();
      await waitForPaywall(host.page, "daily_game_limit");
      testLog({
        test: testInfo.title,
        host: "host_free",
        entitlement: "FREE_DAILY_LIMIT_EXHAUSTED",
      });
    } finally {
      await host.context.close();
    }

    const joiner = await openPersonaPage(browser, "player_1");
    try {
      await joiner.page.goto("/join");
      await ensureAgeConfirmed(joiner.page);
      await expect(joiner.page.getByTestId("paywall")).toHaveCount(0);
      await expect(joiner.page.getByTestId("join-room-submit")).toBeVisible();
    } finally {
      await joiner.context.close();
    }
  });
});
