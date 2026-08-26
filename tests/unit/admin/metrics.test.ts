import { parseMetricsRange } from "@/lib/admin/metrics";

describe("parseMetricsRange", () => {
  it("accepts supported ranges", () => {
    expect(parseMetricsRange("24h")).toBe("24h");
    expect(parseMetricsRange("7d")).toBe("7d");
    expect(parseMetricsRange("30d")).toBe("30d");
  });

  it("defaults to 7d for unknown values", () => {
    expect(parseMetricsRange(null)).toBe("7d");
    expect(parseMetricsRange("90d")).toBe("7d");
    expect(parseMetricsRange("")).toBe("7d");
  });
});
