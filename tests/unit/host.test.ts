import { getDomainType, hostnameFromUrl } from "@/lib/host";

describe("getDomainType", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it("treats app. and localhost as the app", () => {
    expect(getDomainType("app.foulplay.io")).toBe("app");
    expect(getDomainType("localhost:3000")).toBe("app");
    expect(getDomainType("127.0.0.1")).toBe("app");
  });

  it("treats the apex marketing domain as marketing", () => {
    expect(getDomainType("foulplay.io")).toBe("marketing");
    expect(getDomainType("www.foulplay.io")).toBe("marketing");
  });

  it("treats Vercel preview hosts as the app so /create does not self-redirect", () => {
    expect(
      getDomainType(
        "foulplay-git-launch-web-ios-2026-11-25-rzounloms-projects.vercel.app",
      ),
    ).toBe("app");
  });

  it("treats NEXT_PUBLIC_APP_URL host as the app", () => {
    process.env.NEXT_PUBLIC_APP_URL =
      "https://foulplay-git-launch-web-ios-2026-11-25-rzounloms-projects.vercel.app";
    expect(
      getDomainType(
        "foulplay-git-launch-web-ios-2026-11-25-rzounloms-projects.vercel.app",
      ),
    ).toBe("app");
  });
});

describe("hostnameFromUrl", () => {
  it("parses a hostname and ignores a trailing slash", () => {
    expect(hostnameFromUrl("https://app.foulplay.io/")).toBe("app.foulplay.io");
  });
});
