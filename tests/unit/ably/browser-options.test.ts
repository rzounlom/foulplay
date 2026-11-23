import { getBrowserAblyOptions } from "@/lib/ably/browser-options";

describe("getBrowserAblyOptions", () => {
  it("uses token auth and never embeds an API key", () => {
    const options = getBrowserAblyOptions("ab12cd");
    expect(options.authUrl).toBe("/api/ably/token");
    expect(options.authParams).toEqual({ roomCode: "AB12CD" });
    expect(options).not.toHaveProperty("key");
  });
});
