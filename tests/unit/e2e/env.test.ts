import {
  e2eAutoAcceptSeconds,
  e2eIntermissionSeconds,
  isE2EAppEnv,
  isProductionDeploy,
} from "@/lib/e2e/env";

describe("e2e env guards", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("isE2EAppEnv is true only when APP_ENV=test", () => {
    process.env.APP_ENV = "test";
    expect(isE2EAppEnv()).toBe(true);
    process.env.APP_ENV = "production";
    expect(isE2EAppEnv()).toBe(false);
    delete process.env.APP_ENV;
    expect(isE2EAppEnv()).toBe(false);
  });

  it("treats VERCEL_ENV=production as a production deploy", () => {
    process.env.VERCEL_ENV = "production";
    expect(isProductionDeploy()).toBe(true);
  });

  it("ignores timer overrides unless APP_ENV=test", () => {
    process.env.APP_ENV = "production";
    process.env.AUTO_ACCEPT_SECONDS_E2E = "3";
    process.env.INTERMISSION_SECONDS_E2E = "8";
    expect(e2eAutoAcceptSeconds()).toBeNull();
    expect(e2eIntermissionSeconds()).toBeNull();
  });

  it("accepts bounded timer overrides in test", () => {
    process.env.APP_ENV = "test";
    process.env.AUTO_ACCEPT_SECONDS_E2E = "5";
    process.env.INTERMISSION_SECONDS_E2E = "8";
    expect(e2eAutoAcceptSeconds()).toBe(5);
    expect(e2eIntermissionSeconds()).toBe(8);
  });

  it("rejects out-of-range timer overrides", () => {
    process.env.APP_ENV = "test";
    process.env.AUTO_ACCEPT_SECONDS_E2E = "999";
    process.env.INTERMISSION_SECONDS_E2E = "0";
    expect(e2eAutoAcceptSeconds()).toBeNull();
    expect(e2eIntermissionSeconds()).toBeNull();
  });
});
