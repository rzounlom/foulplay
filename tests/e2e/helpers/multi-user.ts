import { existsSync } from "node:fs";
import { type Browser, type BrowserContext, type Page } from "@playwright/test";
import { authStatePath } from "./auth";
import type { E2ePersonaKey } from "./personas";
import { createPrivateRoom, joinRoomByCode, testLog } from "./ui";

export function authReady(personas: E2ePersonaKey[]): boolean {
  return personas.every((persona) => existsSync(authStatePath(persona)));
}

export async function openPersonaPage(
  browser: Browser,
  persona: E2ePersonaKey,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    storageState: authStatePath(persona),
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      testLog({ persona, consoleError: msg.text() });
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      testLog({ persona, apiError: `${res.status()} ${res.url()}` });
    }
  });
  return { context, page };
}

export type MultiUserGame = {
  roomCode: string;
  hostPage: Page;
  hostContext: BrowserContext;
  playerPages: Page[];
  playerContexts: BrowserContext[];
  close: () => Promise<void>;
};

export async function createMultiUserGame(
  browser: Browser,
  options: {
    host: E2ePersonaKey;
    players: E2ePersonaKey[];
    headed?: boolean;
    allowQuarterClearing?: boolean;
  },
): Promise<MultiUserGame> {
  const { context: hostContext, page: hostPage } = await openPersonaPage(
    browser,
    options.host,
  );
  const roomCode = await createPrivateRoom(hostPage, {
    allowQuarterClearing: options.allowQuarterClearing,
  });
  testLog({
    action: "createMultiUserGame",
    host: options.host,
    roomCode,
    players: options.players,
  });

  const playerContexts: BrowserContext[] = [];
  const playerPages: Page[] = [];
  for (const player of options.players) {
    const { context: ctx, page } = await openPersonaPage(browser, player);
    await joinRoomByCode(page, roomCode);
    await page.waitForURL(new RegExp(`/game/${roomCode}`, "i"), {
      timeout: 20_000,
    });
    playerContexts.push(ctx);
    playerPages.push(page);
  }

  return {
    roomCode,
    hostPage,
    hostContext,
    playerPages,
    playerContexts,
    close: async () => {
      await Promise.all([
        hostContext.close(),
        ...playerContexts.map((c) => c.close()),
      ]);
    },
  };
}
