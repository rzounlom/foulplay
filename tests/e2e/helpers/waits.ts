import { type Page, expect } from "@playwright/test";

export async function waitForPlayerCount(page: Page, count: number): Promise<void> {
  await expect(page.getByTestId("lobby-player-count")).toHaveAttribute(
    "data-player-count",
    String(count),
    { timeout: 20_000 },
  );
}

export async function waitForPaywall(page: Page, trigger?: string): Promise<void> {
  const paywall = page.getByTestId("paywall");
  await expect(paywall).toBeVisible({ timeout: 15_000 });
  if (trigger) {
    await expect(paywall).toHaveAttribute("data-paywall-trigger", trigger);
  }
  await expect(page.getByTestId("paywall-game-night")).toBeVisible();
  await expect(page.getByTestId("paywall-monthly")).toBeVisible();
}

export async function waitForJoinWaiting(page: Page): Promise<void> {
  await expect(page.getByTestId("join-waiting-on-host")).toBeVisible({
    timeout: 15_000,
  });
}

export async function waitForSubmission(page: Page): Promise<void> {
  await expect(
    page.getByTestId("vote-approve-all").or(page.getByText("Decide if this happened")),
  ).toBeVisible({
    timeout: 20_000,
  });
}

export async function waitForVoteState(page: Page): Promise<void> {
  await waitForSubmission(page);
}

export async function waitForVoteResolved(page: Page, status: "approved" | "rejected"): Promise<void> {
  if (status === "approved") {
    await expect(page.locator(".points-awarded-popup")).toBeVisible({
      timeout: 25_000,
    });
    return;
  }
  await expect(page.locator(".cards-rejected-popup")).toBeVisible({
    timeout: 25_000,
  });
}

export async function waitForRematchReadyCount(page: Page, ready: number): Promise<void> {
  await expect(page.getByTestId("rematch-ready-count")).toContainText(
    String(ready),
    { timeout: 20_000 },
  );
}

export async function waitForRoundState(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text)).toBeVisible({ timeout: 20_000 });
}

export async function waitForScore(page: Page, points?: number | string): Promise<void> {
  const pattern =
    points == null ? /[1-9]\d* pts/ : new RegExp(`${points} pts`);
  await expect(page.getByText(pattern)).toBeVisible({ timeout: 20_000 });
}
