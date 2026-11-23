import { expect, type Page } from "@playwright/test";

export async function ensureAgeConfirmed(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /age confirmation/i });
  try {
    await dialog.waitFor({ state: "visible", timeout: 2_500 });
  } catch {
    return;
  }
  await page.getByTestId("age-gate-checkbox").check();
  await page.getByTestId("age-gate-confirm-21").click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
}

export async function createPrivateRoom(
  page: Page,
  options?: { allowQuarterClearing?: boolean; publicIfAllowed?: boolean },
): Promise<string> {
  await page.goto("/create");
  await ensureAgeConfirmed(page);
  await page.locator("#mode").selectOption("non-drinking");
  await page.locator("#sport").selectOption("football");
  if (options?.allowQuarterClearing) {
    const roundToggle = page.getByLabel(/enable round clearing/i);
    if ((await roundToggle.count()) > 0) {
      await roundToggle.check();
    }
  }
  if (options?.publicIfAllowed) {
    const publicToggle = page.getByTestId("public-game-toggle").locator("input");
    if ((await publicToggle.count()) > 0) {
      await publicToggle.check();
    }
  }
  const submit = page.getByTestId("create-room-submit");
  await expect(submit).toBeEnabled({ timeout: 15_000 });
  await submit.click();
  await page.waitForURL(/\/game\/[A-Z0-9]{6}/, { timeout: 20_000 });
  const match = page.url().match(/\/game\/([A-Z0-9]{6})/i);
  if (!match) throw new Error(`Could not parse room code from ${page.url()}`);
  return match[1].toUpperCase();
}

export async function joinRoomByCode(page: Page, code: string): Promise<void> {
  await page.goto(`/join?code=${code}`);
  await ensureAgeConfirmed(page);
  await page.getByTestId("join-room-submit").click();
}

export async function startLobbyGame(page: Page): Promise<void> {
  const start = page.getByTestId("lobby-start-game");
  await expect(start).toBeEnabled({ timeout: 20_000 });
  await start.click();
  await expect(page.getByTestId("hand-card").first()).toBeVisible({
    timeout: 25_000,
  });
}

export async function submitFirstHandCard(page: Page): Promise<void> {
  const card = page.getByTestId("hand-card").first();
  await expect(card).toBeVisible({ timeout: 25_000 });
  await card.click();
  await page.getByTestId("submit-cards").click();
}

export function testLog(info: Record<string, unknown>): void {
  console.info("[e2e]", JSON.stringify(info));
}
