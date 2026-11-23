import { isClerkExemptApiPath } from "@/lib/proxy/public-paths";

describe("isClerkExemptApiPath", () => {
  it("allows guest invite preview", () => {
    expect(isClerkExemptApiPath("/api/rooms/invite-preview")).toBe(true);
  });

  it("does not exempt other room or game APIs", () => {
    expect(isClerkExemptApiPath("/api/rooms")).toBe(false);
    expect(isClerkExemptApiPath("/api/rooms/join")).toBe(false);
    expect(isClerkExemptApiPath("/api/ably/token")).toBe(false);
    expect(isClerkExemptApiPath("/api/game/submit")).toBe(false);
  });
});
