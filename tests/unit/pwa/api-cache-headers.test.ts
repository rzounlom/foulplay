import nextConfig from "@/next.config";

describe("API cache headers", () => {
  it("forbids storing API responses (no service-worker-style gameplay cache)", async () => {
    const headersFn = nextConfig.headers;
    expect(headersFn).toBeDefined();
    const rules = (await headersFn?.()) ?? [];
    const api = rules.find((rule) => rule.source === "/api/:path*");
    expect(api).toBeDefined();
    const cache = api?.headers.find((header) => header.key === "Cache-Control");
    expect(cache?.value).toMatch(/no-store/);
  });
});
