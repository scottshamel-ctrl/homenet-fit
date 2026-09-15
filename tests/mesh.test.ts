import { describe, expect, test } from "bun:test";
import { checkMesh, listMeshFamilies } from "../lib/mesh";
import type { MeshInput } from "../lib/contracts";

function input(overrides: Partial<MeshInput> = {}): MeshInput {
  return {
    mainFamily: "eero",
    addedFamily: "eero",
    sameSeries: "unsure",
    wiredBackhaul: false,
    ...overrides,
  };
}

describe("checkMesh", () => {
  test("same vendor-agnostic family mixes with conditions rather than a clean pass", () => {
    const result = checkMesh(input());
    expect(result.status).toBe("conditional");
    expect(result.relationship).toBe("mixed-managed-mesh");
    expect(result.lostFeatures.length).toBeGreaterThan(0);
    expect(result.sources.length).toBeGreaterThan(0);
  });

  test("a wired backhaul removes the older-unit-in-the-middle warning", () => {
    expect(checkMesh(input({ wiredBackhaul: false })).warnings.length).toBe(1);
    expect(checkMesh(input({ wiredBackhaul: true })).warnings.length).toBe(0);
  });

  test("matching Orbi series passes; a mismatch stays unknown rather than failing", () => {
    const matched = checkMesh(input({ mainFamily: "netgear-orbi", addedFamily: "netgear-orbi", sameSeries: "yes" }));
    expect(matched.status).toBe("compatible");
    expect(matched.relationship).toBe("one-managed-mesh");

    const mismatched = checkMesh(input({ mainFamily: "netgear-orbi", addedFamily: "netgear-orbi", sameSeries: "no" }));
    expect(mismatched.status).toBe("unknown");
    expect(mismatched.summary).toContain("system requirement");

    const unsure = checkMesh(input({ mainFamily: "netgear-orbi", addedFamily: "netgear-orbi", sameSeries: "unsure" }));
    expect(unsure.status).toBe("unknown");
    expect(unsure.headline).toContain("label");
  });

  test("AiMesh is conditional on the model list, not on the brand", () => {
    const result = checkMesh(input({ mainFamily: "asus-aimesh", addedFamily: "asus-aimesh" }));
    expect(result.status).toBe("conditional");
    expect(result.warnings.join(" ")).toContain("per model");
  });

  test("Nest Wifi Pro with older Google hardware is a documented incompatibility", () => {
    const result = checkMesh(input({ mainFamily: "google-nest-wifi-pro", addedFamily: "google-nest-wifi" }));
    expect(result.status).toBe("incompatible");
    expect(result.relationship).toBe("access-point-fallback");
    expect(result.summary).toContain("6 GHz");
    expect(result.sources.some((source) => source.sourceId === "google-nest-wifi-pro-mesh")).toBe(true);
  });

  test("Deco and OneMesh are one vendor but two systems", () => {
    const result = checkMesh(input({ mainFamily: "tp-link-deco", addedFamily: "tp-link-onemesh" }));
    expect(result.status).toBe("incompatible");
    expect(result.summary).toContain("Omada");
  });

  test("two different proprietary systems fall back to access-point mode", () => {
    const result = checkMesh(input({ mainFamily: "eero", addedFamily: "tp-link-deco" }));
    expect(result.status).toBe("incompatible");
    expect(result.relationship).toBe("access-point-fallback");
    expect(result.setupPath.length).toBeGreaterThan(2);
  });

  test("two EasyMesh-certified devices are conditional, not automatic", () => {
    const result = checkMesh(input({ mainFamily: "easymesh", addedFamily: "eero" }));
    expect(result.status).toBe("incompatible");

    const both = checkMesh(input({ mainFamily: "easymesh", addedFamily: "easymesh" }));
    expect(both.status).toBe("conditional");
    expect(both.relationship).toBe("cross-vendor-easymesh");
    expect(both.conditions.join(" ")).toContain("CERTIFIED");
  });

  test("an unlisted system returns unknown and never a verdict", () => {
    const result = checkMesh(input({ addedFamily: "other" }));
    expect(result.status).toBe("unknown");
    expect(result.relationship).toBe("unknown");
    expect(result.warnings.join(" ")).toContain("guess");
  });

  test("an unselected system is an input error, not a verdict", () => {
    const result = checkMesh(input({ mainFamily: "" }));
    expect(result.status).toBe("unknown");
    expect(result.errors.length).toBe(1);
  });

  test("every family exposes a source record unless it is the unlisted case", () => {
    for (const family of listMeshFamilies()) {
      if (family.familyId === "other") continue;
      expect(family.sourceIds.length).toBeGreaterThan(0);
    }
  });

  test("the fallback always names access-point mode", () => {
    for (const wiredBackhaul of [true, false]) {
      expect(checkMesh(input({ wiredBackhaul })).fallback).toContain("access-point mode");
    }
  });
});
