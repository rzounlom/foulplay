import {
  assertSafeE2eEnvironment,
  isProductionLoadTarget,
} from "@/lib/e2e/safety";

describe("E2E DB safety", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("refuses production APP_ENV", () => {
    process.env.APP_ENV = "production";
    process.env.DATABASE_URL_E2E = "postgresql://localhost/foulplay_e2e";
    expect(() => assertSafeE2eEnvironment()).toThrow(/production/i);
  });

  it("requires APP_ENV=test", () => {
    delete process.env.APP_ENV;
    process.env.DATABASE_URL_E2E = "postgresql://localhost/foulplay_e2e";
    expect(() => assertSafeE2eEnvironment()).toThrow(/APP_ENV=test/);
  });

  it("requires DATABASE_URL_E2E", () => {
    process.env.APP_ENV = "test";
    delete process.env.DATABASE_URL_E2E;
    expect(() => assertSafeE2eEnvironment()).toThrow(/DATABASE_URL_E2E/);
  });

  it("requires e2e in the URL unless E2E_ALLOW_DB=true", () => {
    process.env.APP_ENV = "test";
    process.env.DATABASE_URL_E2E = "postgresql://localhost/foulplay_dev";
    delete process.env.E2E_ALLOW_DB;
    expect(() => assertSafeE2eEnvironment()).toThrow(/e2e/);
  });

  it("accepts a dedicated e2e URL", () => {
    process.env.APP_ENV = "test";
    process.env.DATABASE_URL_E2E = "postgresql://localhost/foulplay_e2e";
    expect(assertSafeE2eEnvironment()).toContain("foulplay_e2e");
  });

  it("refuses when E2E URL matches PRODUCTION_DATABASE_URL", () => {
    process.env.APP_ENV = "test";
    process.env.DATABASE_URL_E2E = "postgresql://localhost/foulplay_e2e";
    process.env.PRODUCTION_DATABASE_URL = "postgresql://localhost/foulplay_e2e";
    expect(() => assertSafeE2eEnvironment()).toThrow(/PRODUCTION_DATABASE_URL/);
  });

  it("flags production load targets", () => {
    expect(isProductionLoadTarget("https://app.foulplay.io")).toBe(true);
    expect(isProductionLoadTarget("http://localhost:3100")).toBe(false);
  });
});
