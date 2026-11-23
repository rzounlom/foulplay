import { test, expect } from "@playwright/test";
import { authReady, openPersonaPage } from "../helpers/multi-user";
import { applyPersonaEntitlement, personaUserId } from "../helpers/seed";
import { createE2ePrisma } from "../helpers/prisma";
import { testLog } from "../helpers/ui";

const STRIPE_SUCCESS_CARD = "4242424242424242";

async function completeStripeCheckout(page: import("@playwright/test").Page) {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  const email = page.locator('input[type="email"]');
  if (await email.isVisible().catch(() => false)) {
    await email.fill("stripe-e2e@e2e.foulplay.test");
  }
  const card = page.locator('input[name="cardNumber"], input[placeholder*="1234"]');
  await card.first().fill(STRIPE_SUCCESS_CARD);
  const expiry = page.locator('input[name="cardExpiry"], input[placeholder*="MM"]');
  await expiry.first().fill("1234");
  const cvc = page.locator('input[name="cardCvc"], input[placeholder*="CVC"]');
  await cvc.first().fill("123");
  const name = page.locator('input[name="billingName"]');
  if (await name.isVisible().catch(() => false)) {
    await name.fill("E2E Stripe");
  }
  await page.getByRole("button", { name: /pay|subscribe|start/i }).click();
}

async function waitForEntitlement(
  userId: string,
  check: (user: {
    lifetimeAccess: boolean;
    subscriptionStatus: string;
    gameNightPassExpiresAt: Date | null;
  }) => boolean,
) {
  const prisma = createE2ePrisma();
  try {
    await expect
      .poll(
        async () => {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          return user && check(user);
        },
        { timeout: 45_000 },
      )
      .toBeTruthy();
  } finally {
    await prisma.$disconnect();
  }
}

test.describe("True Stripe checkout", () => {
  test.skip(process.env.RUN_STRIPE_E2E !== "true", "Set RUN_STRIPE_E2E=true");
  test.skip(!authReady(["host_free"]), "Run e2e:auth:setup first");

  test("Game Night checkout grants a pass and returns to the app", async ({
    browser,
  }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const userId = personaUserId("host_free");
    expect(userId).toBeTruthy();
    const host = await openPersonaPage(browser, "host_free");
    try {
      await host.page.goto("/upgrade");
      await host.page.getByTestId("upgrade-game_night").click();
      testLog({ test: testInfo.title, plan: "game_night", persona: "host_free" });
      await completeStripeCheckout(host.page);
      await host.page.waitForURL(/\/upgrade/, { timeout: 45_000 });
      await expect(host.page.getByText(/you.?re all set/i)).toBeVisible();
      await waitForEntitlement(userId!, (user) => {
        return Boolean(
          user.gameNightPassExpiresAt &&
            user.gameNightPassExpiresAt.getTime() > Date.now(),
        );
      });
    } finally {
      await host.context.close();
    }
  });

  test("Monthly checkout activates FoulPlay+", async ({ browser }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const userId = personaUserId("host_free");
    const host = await openPersonaPage(browser, "host_free");
    try {
      await host.page.goto("/upgrade");
      await host.page.getByTestId("upgrade-monthly").click();
      testLog({ test: testInfo.title, plan: "monthly" });
      await completeStripeCheckout(host.page);
      await host.page.waitForURL(/\/upgrade/, { timeout: 45_000 });
      await waitForEntitlement(userId!, (user) => user.subscriptionStatus === "active");
    } finally {
      await host.context.close();
    }
  });

  test("Lifetime checkout sets lifetimeAccess", async ({ browser }, testInfo) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const userId = personaUserId("host_free");
    const host = await openPersonaPage(browser, "host_free");
    try {
      await host.page.goto("/upgrade");
      await host.page.getByTestId("upgrade-lifetime").click();
      testLog({ test: testInfo.title, plan: "lifetime" });
      await completeStripeCheckout(host.page);
      await host.page.waitForURL(/\/upgrade/, { timeout: 45_000 });
      await waitForEntitlement(userId!, (user) => user.lifetimeAccess);
    } finally {
      await host.context.close();
    }
  });

  test("canceled checkout returns without granting access", async ({
    browser,
  }) => {
    await applyPersonaEntitlement("host_free", "FREE");
    const userId = personaUserId("host_free");
    const host = await openPersonaPage(browser, "host_free");
    try {
      await host.page.goto("/upgrade");
      await host.page.getByTestId("upgrade-game_night").click();
      await host.page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
      await host.page.goBack();
      await expect(host.page).not.toHaveURL(/checkout\.stripe\.com/);
      const prisma = createE2ePrisma();
      try {
        const user = await prisma.user.findUnique({ where: { id: userId! } });
        expect(user?.gameNightPassExpiresAt).toBeNull();
        expect(user?.lifetimeAccess).toBe(false);
        expect(user?.subscriptionStatus).toBe("free");
      } finally {
        await prisma.$disconnect();
      }
    } finally {
      await host.context.close();
    }
  });
});
