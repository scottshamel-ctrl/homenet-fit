import { describe, expect, test } from "bun:test";
import { checkEthernetLink } from "../lib/ethernet";
import type { EthernetLinkInput } from "../lib/contracts";

function input(overrides: Partial<EthernetLinkInput> = {}): EthernetLinkInput {
  return {
    targetMbps: 1000,
    cableCategory: "cat5e",
    lengthMeters: 15,
    portARate: 1000,
    portBRate: 1000,
    adapterRate: null,
    negotiatedMbps: null,
    ...overrides,
  };
}

describe("checkEthernetLink", () => {
  test("rates a matched gigabit link as compatible", () => {
    const result = checkEthernetLink(input());
    expect(result.status).toBe("compatible");
    expect(result.expectedCeilingMbps).toBe(1000);
    expect(result.negotiationGap).toBe(false);
  });

  test("Cat5e carries 2.5 Gbps per the 802.3bz objectives", () => {
    const result = checkEthernetLink(input({ targetMbps: 2500, portARate: 2500, portBRate: 2500 }));
    expect(result.cableCeilingMbps).toBe(2500);
    expect(result.status).toBe("compatible");
  });

  test("Cat5e does not claim a verified 5 Gbps ceiling", () => {
    const result = checkEthernetLink(input({ targetMbps: 5000, portARate: 5000, portBRate: 5000 }));
    expect(result.status).toBe("conditional");
    expect(result.limiter?.id).toBe("cable");
    expect(result.expectedCeilingMbps).toBe(2500);
  });

  test("Cat6 stops at 5 Gbps and explains the 10G distance case", () => {
    const result = checkEthernetLink(input({ targetMbps: 10000, cableCategory: "cat6", portARate: 10000, portBRate: 10000, lengthMeters: 40 }));
    expect(result.cableCeilingMbps).toBe(5000);
    expect(result.cableNote).toContain("55 m");
    expect(result.status).toBe("conditional");
  });

  test("Cat6a carries 10 Gbps across a full run", () => {
    const result = checkEthernetLink(input({ targetMbps: 10000, cableCategory: "cat6a", portARate: 10000, portBRate: 10000, lengthMeters: 95 }));
    expect(result.status).toBe("compatible");
    expect(result.expectedCeilingMbps).toBe(10000);
  });

  test("a run beyond 100 m is incompatible regardless of category", () => {
    const result = checkEthernetLink(input({ cableCategory: "cat6a", lengthMeters: 140 }));
    expect(result.status).toBe("incompatible");
    expect(result.cableCeilingMbps).toBeNull();
    expect(result.actions.join(" ")).toContain("switch");
  });

  test("100 Mbps on a gigabit-capable path is reported as a fault, not a ceiling", () => {
    const result = checkEthernetLink(input({ negotiatedMbps: 100 }));
    expect(result.status).toBe("conditional");
    expect(result.negotiationGap).toBe(true);
    expect(result.causes.join(" ")).toContain("four pairs");
    expect(result.actions[0]).toContain("Reseat");
  });

  test("a 1 Gbps negotiation on a multi-gig path names the 802.3bz condition", () => {
    const result = checkEthernetLink(input({ targetMbps: 2500, portARate: 2500, portBRate: 2500, negotiatedMbps: 1000 }));
    expect(result.negotiationGap).toBe(true);
    expect(result.causes.join(" ")).toContain("802.3bz");
  });

  test("an adapter in the path can become the limiter", () => {
    const result = checkEthernetLink(input({ targetMbps: 2500, portARate: 2500, portBRate: 2500, adapterRate: 1000 }));
    expect(result.limiter?.id).toBe("adapter");
    expect(result.expectedCeilingMbps).toBe(1000);
  });

  test("an unlabeled cable returns unknown rather than a guess", () => {
    const result = checkEthernetLink(input({ cableCategory: "unknown" }));
    expect(result.status).toBe("unknown");
    expect(result.cableCeilingMbps).toBeNull();
    expect(result.confidence).toBe("low");
  });

  test("an unknown port keeps the whole link unknown", () => {
    const result = checkEthernetLink(input({ portBRate: null }));
    expect(result.status).toBe("unknown");
    expect(result.causes.join(" ")).toContain("Device network interface");
  });

  test("missing length is recorded as an assumption", () => {
    const result = checkEthernetLink(input({ lengthMeters: null }));
    expect(result.assumptions.join(" ")).toContain("100 m or less");
  });

  test("invalid input is rejected instead of scored", () => {
    const result = checkEthernetLink(input({ targetMbps: 0, lengthMeters: 900 }));
    expect(result.status).toBe("unknown");
    expect(result.errors.length).toBe(2);
  });

  test("every result carries reviewed standards evidence", () => {
    const result = checkEthernetLink(input());
    expect(result.sources.map((source) => source.sourceId)).toContain("ieee-8023bz-objectives");
  });
});
