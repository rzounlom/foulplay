import {
  ablySubscribeCapability,
  normalizeRoomCode,
  userIsRoomMember,
} from "@/lib/ably/token-auth";

describe("Ably token auth helpers", () => {
  it("normalizes a 6-character room code", () => {
    expect(normalizeRoomCode("ab12cd")).toBe("AB12CD");
    expect(normalizeRoomCode(" AB12CD ")).toBe("AB12CD");
  });

  it("rejects missing or invalid codes", () => {
    expect(normalizeRoomCode(null)).toBeNull();
    expect(normalizeRoomCode("")).toBeNull();
    expect(normalizeRoomCode("ABC")).toBeNull();
    expect(normalizeRoomCode("ABC12!")).toBeNull();
  });

  it("grants subscribe-only capabilities on both room channels", () => {
    expect(ablySubscribeCapability("ABC123")).toEqual({
      "room:ABC123": ["subscribe"],
      "room:ABC123:state": ["subscribe"],
    });
  });

  it("allows hosts and seated players only", () => {
    expect(
      userIsRoomMember({
        userId: "user_1",
        hostId: "user_1",
        playerUserIds: [],
      }),
    ).toBe(true);
    expect(
      userIsRoomMember({
        userId: "user_2",
        hostId: "user_1",
        playerUserIds: ["user_2"],
      }),
    ).toBe(true);
    expect(
      userIsRoomMember({
        userId: "stranger",
        hostId: "user_1",
        playerUserIds: ["user_2"],
      }),
    ).toBe(false);
  });
});
