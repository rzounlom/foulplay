import {
  getQstashCallbackBaseUrl,
  qstashCallbackUrl,
  qstashDeliveryHeaders,
} from "@/lib/queue/callback-url";

describe("QStash callback URL isolation", () => {
  const keys = [
    "VERCEL_ENV",
    "APP_URL",
    "NEXT_PUBLIC_APP_URL",
    "VERCEL_URL",
    "VERCEL_AUTOMATION_BYPASS_SECRET",
  ] as const;
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it("uses APP_URL outside preview", () => {
    process.env.APP_URL = "https://app.foulplay.io/";
    expect(getQstashCallbackBaseUrl()).toBe("https://app.foulplay.io");
    expect(qstashCallbackUrl("/api/qstash/auto-accept")).toBe(
      "https://app.foulplay.io/api/qstash/auto-accept",
    );
    expect(qstashDeliveryHeaders()).toBeUndefined();
  });

  it("refuses production hosts on preview and falls back to VERCEL_URL", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.APP_URL = "https://foulplay.io/";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.foulplay.io";
    process.env.VERCEL_URL = "foulplay-abc-rzounloms-projects.vercel.app";
    expect(getQstashCallbackBaseUrl()).toBe(
      "https://foulplay-abc-rzounloms-projects.vercel.app",
    );
  });

  it("keeps a preview APP_URL when it is not production", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.APP_URL =
      "https://foulplay-git-launch-web-ios-2026-11-25-rzounloms-projects.vercel.app";
    expect(getQstashCallbackBaseUrl()).toContain(".vercel.app");
  });

  it("attaches Vercel protection bypass only on preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET = "bypass-test-secret";
    expect(qstashDeliveryHeaders()).toEqual({
      "x-vercel-protection-bypass": "bypass-test-secret",
      "x-vercel-set-bypass-cookie": "true",
    });
  });
});
