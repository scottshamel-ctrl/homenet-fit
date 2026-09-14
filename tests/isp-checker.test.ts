import { describe, expect, test } from "bun:test";
import { checkIsp, normalizeProviderId } from "../lib/isp-checker";

describe("checkIsp", () => {
  test("normalizes provider aliases without fuzzy guessing", () => {
    expect(normalizeProviderId("Comcast")).toBe("xfinity");
    expect(normalizeProviderId("AT&T Fiber")).toBe("att-fiber");
    expect(normalizeProviderId("Charter Spectrum")).toBe("spectrum");
    expect(normalizeProviderId("Cox Communications")).toBe("cox");
    expect(normalizeProviderId("Fios")).toBe("verizon-fios");
    expect(normalizeProviderId("similar cable company")).toBeNull();
  });

  test("keeps exact Xfinity modem approval unknown", () => {
    const result = checkIsp({ provider: "xfinity", scenario: "own-modem", equipmentModel: "Example 1000" });
    expect(result.scenarioStatus).toBe("conditional");
    expect(result.status).toBe("unknown");
    expect(result.modelStatus).toBe("unknown");
    expect(result.sources.map((source) => source.publisher)).toEqual(["Xfinity", "Xfinity"]);
  });

  test("allows a customer router behind supported Xfinity service", () => {
    const result = checkIsp({ provider: "xfinity", scenario: "own-router" });
    expect(result.status).toBe("compatible");
    expect(result.modelStatus).toBe("not-required");
  });

  test("requires the AT&T gateway but allows a downstream router conditionally", () => {
    expect(checkIsp({ provider: "att", scenario: "own-modem" }).status).toBe("incompatible");
    const router = checkIsp({ provider: "att-fiber", scenario: "own-router" });
    expect(router.status).toBe("conditional");
    expect(router.requirements.join(" ")).toContain("AT&T-provided gateway");
  });

  test("shows T-Mobile bridge-mode constraint", () => {
    const result = checkIsp({ provider: "tmhi", scenario: "own-router" });
    expect(result.status).toBe("conditional");
    expect(result.lostFeatures.join(" ")).toContain("Bridge mode");
  });

  test("keeps Spectrum and Cox exact cable-modem approval unknown", () => {
    for (const provider of ["spectrum", "cox"]) {
      const result = checkIsp({ provider, scenario: "own-modem", equipmentModel: "Example model" });
      expect(result.scenarioStatus).toBe("conditional");
      expect(result.status).toBe("unknown");
      expect(result.modelStatus).toBe("unknown");
      expect(result.sources.length).toBeGreaterThan(0);
    }
  });

  test("allows separate routers behind supported Spectrum and Cox cable modems", () => {
    expect(checkIsp({ provider: "spectrum", scenario: "own-router" }).status).toBe("compatible");
    expect(checkIsp({ provider: "cox", scenario: "own-router" }).status).toBe("compatible");
  });

  test("models Verizon Fios as ONT plus conditional customer router", () => {
    expect(checkIsp({ provider: "verizon-fios", scenario: "own-modem" }).status).toBe("incompatible");
    const router = checkIsp({ provider: "verizon-fios", scenario: "own-router" });
    expect(router.status).toBe("conditional");
    expect(router.requirements.join(" ")).toContain("ONT");
  });

  test("does not generalize cable internet rules to provider voice", () => {
    for (const provider of ["spectrum", "cox"]) {
      const result = checkIsp({ provider, scenario: "own-modem", hasVoice: true });
      expect(result.status).toBe("unknown");
      expect(result.nextAction).toContain("voice-service equipment path");
    }
  });

  test("returns unknown for an uncovered provider", () => {
    const result = checkIsp({ provider: "Other ISP", scenario: "own-router" });
    expect(result.status).toBe("unknown");
    expect(result.sources).toEqual([]);
  });

  test("does not approve TV-dependent topology from a generic router rule", () => {
    const result = checkIsp({ provider: "xfinity", scenario: "own-router", hasTv: true });
    expect(result.status).toBe("unknown");
    expect(result.requirements.join(" ")).toContain("TV equipment");
  });
});
