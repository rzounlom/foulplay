import { isE2eHttpAuthorized } from "@/lib/e2e/http-guard";

function req(headers: Record<string, string> = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get: (name: string) => normalized[name.toLowerCase()] ?? null,
    },
  };
}

describe("isE2eHttpAuthorized", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("denies outside APP_ENV=test", () => {
    process.env.APP_ENV = "production";
    delete process.env.VERCEL_ENV;
    process.env.E2E_TEST_TOKEN = "a".repeat(16);
    expect(
      isE2eHttpAuthorized(req({ authorization: "Bearer " + "a".repeat(16) })),
    ).toBe(false);
  });

  it("denies on any Vercel deploy even if APP_ENV=test", () => {
    process.env.APP_ENV = "test";
    process.env.VERCEL_ENV = "preview";
    process.env.E2E_TEST_TOKEN = "a".repeat(16);
    expect(
      isE2eHttpAuthorized(req({ authorization: "Bearer " + "a".repeat(16) })),
    ).toBe(false);
  });

  it("denies without a long token", () => {
    process.env.APP_ENV = "test";
    delete process.env.VERCEL_ENV;
    delete process.env.E2E_TEST_TOKEN;
    expect(isE2eHttpAuthorized(req())).toBe(false);
  });

  it("denies when the bearer token does not match", () => {
    process.env.APP_ENV = "test";
    delete process.env.VERCEL_ENV;
    process.env.E2E_TEST_TOKEN = "correct-token-16";
    expect(
      isE2eHttpAuthorized(req({ authorization: "Bearer wrong-token-16xx" })),
    ).toBe(false);
  });

  it("allows matching bearer token in test", () => {
    process.env.APP_ENV = "test";
    delete process.env.VERCEL_ENV;
    process.env.E2E_TEST_TOKEN = "correct-token-16";
    expect(
      isE2eHttpAuthorized(req({ authorization: "Bearer correct-token-16" })),
    ).toBe(true);
  });
});
