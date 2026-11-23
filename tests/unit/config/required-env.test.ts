import { getForbiddenProductionEnvIssues } from "@/lib/config/required-env";

describe("getForbiddenProductionEnvIssues", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("reports APP_ENV=test", () => {
    process.env.APP_ENV = "test";
    delete process.env.NEXT_PUBLIC_ABLY_API_KEY;
    delete process.env.E2E_TEST_TOKEN;
    delete process.env.DATABASE_URL_E2E;
    delete process.env.E2E_ALLOW_DB;
    expect(getForbiddenProductionEnvIssues()).toContain("APP_ENV=test is set");
  });

  it("is clean when forbidden flags are absent", () => {
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_ABLY_API_KEY;
    delete process.env.E2E_TEST_TOKEN;
    delete process.env.DATABASE_URL_E2E;
    delete process.env.E2E_ALLOW_DB;
    expect(getForbiddenProductionEnvIssues()).toEqual([]);
  });
});
