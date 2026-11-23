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
    const previous = process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    delete process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    expect(ablySubscribeCapability("ABC123")).toEqual({
      "room:ABC123": ["subscribe"],
      "room:ABC123:state": ["subscribe"],
    });
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    } else {
      process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE = previous;
    }
  });

  it("namespaces preview channels so they cannot collide with production", () => {
    const previous = process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE = "preview";
    expect(ablySubscribeCapability("ABC123")).toEqual({
      "room:preview:ABC123": ["subscribe"],
      "room:preview:ABC123:state": ["subscribe"],
    });
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    } else {
      process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE = previous;
    }
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
