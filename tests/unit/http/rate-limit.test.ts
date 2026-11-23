import { consumeRateLimit, resetRateLimitBuckets } from "@/lib/http/rate-limit";

describe("consumeRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("allows requests under the limit", () => {
    expect(consumeRateLimit("k", 2, 1000, 0)).toEqual({ ok: true });
    expect(consumeRateLimit("k", 2, 1000, 1)).toEqual({ ok: true });
  });

  it("blocks the next request in the same window", () => {
    consumeRateLimit("k", 1, 1000, 0);
    expect(consumeRateLimit("k", 1, 1000, 10)).toEqual({
      ok: false,
      retryAfterMs: 990,
    });
  });

  it("resets after the window", () => {
    consumeRateLimit("k", 1, 1000, 0);
    expect(consumeRateLimit("k", 1, 1000, 1000)).toEqual({ ok: true });
  });

  it("isolates keys", () => {
    consumeRateLimit("a", 1, 1000, 0);
    expect(consumeRateLimit("b", 1, 1000, 0)).toEqual({ ok: true });
  });
});
