import { test, expect } from "@playwright/test";
import { authReady, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement } from "../helpers/seed";
import { createPrivateRoom, ensureAgeConfirmed, testLog } from "../helpers/ui";
import { waitForPaywall } from "../helpers/waits";

test.describe("E. Public hosting", () => {
  test.skip(
    !authReady(["host_free", "host_lifetime"]),
    "Run e2e:auth:setup first",
  );

  test("free host sees upgrade prompt when enabling public game", async ({
    browser,
  }) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const host = await openPersonaPage(browser, "host_free");
    try {
      await host.page.goto("/create");
      await ensureAgeConfirmed(host.page);
      await host.page.getByTestId("public-game-toggle").locator("input").check();
      await waitForPaywall(host.page, "public_hosting");
    } finally {
      await host.context.close();
    }
  });

  test("premium host can create a public chaos room with join-in-progress", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_lifetime", "LIFETIME");
    const host = await openPersonaPage(browser, "host_lifetime");
    try {
      const code = await createPrivateRoom(host.page, { publicIfAllowed: true });
      testLog({
        test: testInfo.title,
        roomCode: code,
        host: "host_lifetime",
        entitlement: "LIFETIME",
      });
      await expect(host.page.getByText(/live drop-in room/i)).toBeVisible();
      await expect(host.page.getByTestId("paywall")).toHaveCount(0);
    } finally {
      await host.context.close();
    }
  });
});
