import { describe, expect, test } from "bun:test";
import { planTopology } from "../lib/topology";
import type { TopologyInput } from "../lib/contracts";

function input(overrides: Partial<TopologyInput> = {}): TopologyInput {
  return {
    provider: "xfinity",
    ownDevice: "router",
    keepsProviderGateway: true,
    bridgeSupport: "yes",
    hasVoice: false,
    hasTv: false,
    needsRouterFeatures: true,
    ...overrides,
  };
}

describe("planTopology", () => {
  test("bridges a gateway that documents bridge mode", () => {
    const result = planTopology(input());
    expect(result.planId).toBe("gateway-bridge");
    expect(result.doubleNat).toBe("avoided");
    expect(result.status).toBe("compatible");
  });

  test("removing a non-required gateway gives a single-router plan", () => {
    const result = planTopology(input({ keepsProviderGateway: false }));
    expect(result.planId).toBe("own-modem-single-router");
    expect(result.doubleNat).toBe("avoided");
    expect(result.roles[1].role).toContain("Routing");
  });

  test("Verizon Fios routes straight off the ONT", () => {
    const result = planTopology(input({ provider: "verizon-fios", keepsProviderGateway: false }));
    expect(result.planId).toBe("ont-single-router");
    expect(result.cablePath[0]).toContain("ONT");
  });

  test("AT&T Fiber uses documented passthrough, not a claimed bridge", () => {
    const result = planTopology(input({ provider: "att-fiber" }));
    expect(result.planId).toBe("gateway-ip-passthrough");
    expect(result.doubleNat).toBe("reduced");
    expect(result.doubleNatNote).toContain("not a bridge");
  });

  test("AT&T keeps the passthrough plan even if the user claims bridge support", () => {
    const result = planTopology(input({ provider: "att-fiber", bridgeSupport: "yes" }));
    expect(result.planId).toBe("gateway-ip-passthrough");
  });

  test("a required gateway cannot be removed on request", () => {
    const result = planTopology(input({ provider: "tmobile-home-internet", keepsProviderGateway: false, needsRouterFeatures: false }));
    expect(result.warnings[0]).toContain("requires its own gateway");
  });

  test("T-Mobile without feature demands lands on access-point mode", () => {
    const result = planTopology(input({ provider: "tmobile-home-internet", needsRouterFeatures: false }));
    expect(result.planId).toBe("gateway-plus-ap");
    expect(result.doubleNat).toBe("avoided");
    expect(result.tradeoffs.join(" ")).toContain("VPN service");
  });

  test("T-Mobile with feature demands states double NAT as a deliberate trade", () => {
    const result = planTopology(input({ provider: "tmobile-home-internet", needsRouterFeatures: true }));
    expect(result.planId).toBe("double-nat-accepted");
    expect(result.doubleNat).toBe("present");
    expect(result.warnings.join(" ")).toContain("deliberate trade");
  });

  test("a gateway with no documented bridge record falls back to access-point mode", () => {
    const result = planTopology(input({ provider: "spectrum", bridgeSupport: "unknown" }));
    expect(result.planId).toBe("gateway-plus-ap");
    expect(result.tradeoffs.join(" ")).toContain("does not require its gateway");
  });

  test("declining bridge mode on Xfinity moves the plan off bridging", () => {
    const result = planTopology(input({ bridgeSupport: "no", needsRouterFeatures: false }));
    expect(result.planId).toBe("gateway-plus-ap");
  });

  test("an uncovered provider returns unknown instead of a guess", () => {
    const result = planTopology(input({ provider: "some regional isp" }));
    expect(result.status).toBe("unknown");
    expect(result.planId).toBe("unknown");
    expect(result.roles).toEqual([]);
  });

  test("provider TV service downgrades certainty rather than being ignored", () => {
    const result = planTopology(input({ hasTv: true }));
    expect(result.status).toBe("unknown");
    expect(result.warnings.join(" ")).toContain("returned unknown");
  });

  test("a mesh system is named as the routing device when it is one", () => {
    const result = planTopology(input({ ownDevice: "mesh", keepsProviderGateway: false }));
    expect(result.roles.some((role) => role.device === "Your mesh system")).toBe(true);
  });

  test("every covered plan cites reviewed vendor and provider evidence", () => {
    const result = planTopology(input());
    const ids = result.sources.map((source) => source.sourceId);
    expect(ids).toContain("netgear-double-nat");
    expect(ids).toContain("xfinity-bridge-mode");
  });
});
