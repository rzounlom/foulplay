import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const baseURL =
  process.env.E2E_BASE_URL || "http://localhost:3100";
const e2eDatabaseUrl = process.env.DATABASE_URL_E2E;
const runStripe = process.env.RUN_STRIPE_E2E === "true";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: e2eDatabaseUrl
    ? {
        command: "npx next dev -p 3100",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        env: {
          ...process.env,
          APP_ENV: "test",
          PORT: "3100",
          DATABASE_URL: e2eDatabaseUrl,
          DIRECT_DATABASE_URL:
            process.env.DIRECT_DATABASE_URL_E2E || e2eDatabaseUrl,
          NEXT_PUBLIC_APP_URL: baseURL,
          AUTO_ACCEPT_SECONDS_E2E:
            process.env.AUTO_ACCEPT_SECONDS_E2E || "5",
          INTERMISSION_SECONDS_E2E:
            process.env.INTERMISSION_SECONDS_E2E || "8",
          NEXT_PRIVATE_SKIP_TURBO: "1",
        },
      }
    : undefined,
  projects: [
    {
      name: "setup",
      testMatch: /auth\/setup\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "e2e",
      dependencies: ["setup"],
      testIgnore: [/auth\/setup\.spec\.ts/, /stripe\//],
      use: { ...devices["Desktop Chrome"] },
    },
    ...(runStripe
      ? [
          {
            name: "stripe",
            dependencies: ["setup"],
            testMatch: /stripe\//,
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : []),
  ],
});
