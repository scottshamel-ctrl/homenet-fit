import { describe, expect, test } from "bun:test";
import { findBottleneck } from "../lib/bottleneck";

const path = (rates: Array<number | null>) => rates.map((ceilingMbps, index) => ({
  id: `link-${index}`,
  label: `Link ${index + 1}`,
  ceilingMbps,
}));

describe("findBottleneck", () => {
  test("finds the first one-gigabit limiter on a 2-gigabit plan", () => {
    const result = findBottleneck({ planMbps: 2000, components: path([2500, 1000, 2500, 1000]) });
    expect(result.status).toBe("conditional");
    expect(result.verifiedCeilingMbps).toBe(1000);
    expect(result.limiter?.label).toBe("Link 2");
    expect(result.tiedLimiters).toHaveLength(2);
  });

  test("preserves unknown when every known link can carry the plan", () => {
    const result = findBottleneck({ planMbps: 1000, components: path([2500, null, 1000]) });
    expect(result.status).toBe("unknown");
    expect(result.unknownComponents[0]?.label).toBe("Link 2");
  });

  test("reports a proven low ceiling even when a later link is unknown", () => {
    const result = findBottleneck({ planMbps: 1000, components: path([100, null, 2500]) });
    expect(result.status).toBe("conditional");
    expect(result.verifiedCeilingMbps).toBe(100);
  });

  test("passes when all required links meet the plan", () => {
    const result = findBottleneck({ planMbps: 1000, components: path([2500, 1000, 10000]) });
    expect(result.status).toBe("compatible");
    expect(result.errors).toEqual([]);
  });

  test("ignores an optional absent switch", () => {
    const components = [
      { id: "router", label: "Router", ceilingMbps: 2500 },
      { id: "switch", label: "Switch", ceilingMbps: null, required: false },
      { id: "client", label: "Client", ceilingMbps: 2500 },
    ];
    expect(findBottleneck({ planMbps: 2000, components }).status).toBe("compatible");
  });

  test("returns actionable errors for invalid trust-boundary input", () => {
    const result = findBottleneck({ planMbps: -1, components: path([0]) });
    expect(result.status).toBe("unknown");
    expect(result.errors).toHaveLength(2);
    expect(result.verifiedCeilingMbps).toBeNull();
  });
});
