import { describe, expect, test } from "bun:test";
import { planWholeNetwork } from "../lib/planner";

function components(rates: [number | null, number | null, number | null, number | null]) {
  return [
    { id: "gateway", label: "Gateway LAN port", ceilingMbps: rates[0] },
    { id: "router", label: "Router LAN port", ceilingMbps: rates[1] },
    { id: "link", label: "Device link", ceilingMbps: rates[2] },
    { id: "client", label: "Client interface", ceilingMbps: rates[3] },
  ];
}

describe("planWholeNetwork", () => {
  test("composes an Xfinity router rule with a downstream limiter", () => {
    const result = planWholeNetwork({
      provider: "xfinity",
      scenario: "own-router",
      planMbps: 1200,
      components: components([2500, 1000, 2500, 1000]),
    });
    expect(result.status).toBe("conditional");
    expect(result.firstIssue).toContain("Router LAN port");
    expect(result.path).toHaveLength(5);
  });

  test("provider incompatibility stops an otherwise capable path", () => {
    const result = planWholeNetwork({
      provider: "att-fiber",
      scenario: "own-modem",
      planMbps: 1000,
      components: components([2500, 2500, 2500, 2500]),
    });
    expect(result.status).toBe("incompatible");
    expect(result.cheapestAction).toContain("Keep the AT&T gateway");
  });

  test("exact modem evidence stays unknown even when every port passes", () => {
    const result = planWholeNetwork({
      provider: "xfinity",
      scenario: "own-modem",
      equipmentModel: "Example 1000",
      planMbps: 1000,
      components: components([2500, 2500, 2500, 2500]),
    });
    expect(result.status).toBe("unknown");
    expect(result.confidence).toBe("low");
  });

  test("retains a provider condition when the path has capacity", () => {
    const result = planWholeNetwork({
      provider: "tmobile",
      scenario: "own-router",
      planMbps: 500,
      components: components([1000, 1000, 1000, 1000]),
    });
    expect(result.status).toBe("conditional");
    expect(result.meaning).toContain("bridge mode");
  });
});
