import {
  ablyRoomChannelName,
  ablyStateChannelName,
  getAblyChannelNamespace,
} from "@/lib/ably/channels";

describe("Ably channel names", () => {
  const original = process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    } else {
      process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE = original;
    }
  });

  it("keeps historical production names when no namespace is set", () => {
    delete process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE;
    expect(getAblyChannelNamespace()).toBeNull();
    expect(ablyRoomChannelName("ABC123")).toBe("room:ABC123");
    expect(ablyStateChannelName("ABC123")).toBe("room:ABC123:state");
  });

  it("prefixes preview so inherited room codes cannot hit production channels", () => {
    process.env.NEXT_PUBLIC_ABLY_CHANNEL_NAMESPACE = "preview";
    expect(ablyRoomChannelName("ABC123")).toBe("room:preview:ABC123");
    expect(ablyStateChannelName("ABC123")).toBe("room:preview:ABC123:state");
  });
});
