import familiesJson from "../data/mesh-families.json";
import sourcesJson from "../data/sources.json";
import type { MeshInput, MeshRelationship, MeshResult, SourceRecord } from "./contracts";

interface MeshFamily {
  familyId: string;
  name: string;
  vendor: string;
  mixPolicy: "any-model" | "any-model-on-list" | "same-series" | "cross-vendor" | "unknown";
  note: string;
  mixNotes: string[];
  sourceIds: string[];
}

interface DocumentedConflict {
  familyA: string;
  familyB: string;
  reason: string;
  sourceIds: string[];
}

const families = familiesJson.families as MeshFamily[];
const conflicts = familiesJson.documentedConflicts as DocumentedConflict[];
const sources = sourcesJson.sources as SourceRecord[];

const apLostFeatures = [
  "A second system in access-point mode keeps its Wi-Fi and switching only. Its guest network, parental controls, VPN service, and remote management stop applying.",
  "Clients hand off between two separate Wi-Fi networks by disconnecting and reconnecting, so a call or a stream can drop at the boundary.",
];

function resolveSources(sourceIds: string[]): SourceRecord[] {
  const unique = [...new Set(sourceIds)];
  return unique
    .map((sourceId) => sources.find((source) => source.sourceId === sourceId))
    .filter((source): source is SourceRecord => Boolean(source));
}

export function listMeshFamilies(): MeshFamily[] {
  return families;
}

function findConflict(a: string, b: string): DocumentedConflict | undefined {
  return conflicts.find(
    (conflict) =>
      (conflict.familyA === a && conflict.familyB === b) || (conflict.familyA === b && conflict.familyB === a),
  );
}

function fallbackText(wiredBackhaul: boolean): string {
  return wiredBackhaul
    ? "Run the second system in access-point mode on the Ethernet you already have. One device keeps routing, the other only adds Wi-Fi, and the wired link carries the traffic between them."
    : "Run the second system in access-point mode, and run Ethernet to it if you can. Without a cable it has to repeat over the air, which shares airtime with the clients it is meant to serve — treat that as the last resort.";
}

export function checkMesh(input: MeshInput): MeshResult {
  const main = families.find((family) => family.familyId === input.mainFamily);
  const added = families.find((family) => family.familyId === input.addedFamily);
  const base = {
    mainFamilyName: main?.name ?? "Unselected system",
    addedFamilyName: added?.name ?? "Unselected system",
    lastVerified: familiesJson.lastVerified,
    nextReview: familiesJson.nextReview,
    errors: [] as string[],
  };

  if (!main || !added) {
    return {
      ...base,
      status: "unknown",
      relationship: "unknown",
      headline: "Pick both systems first",
      summary: "Choose the system that will run the network and the system you want to add to it.",
      conditions: [],
      lostFeatures: [],
      setupPath: [],
      fallback: fallbackText(input.wiredBackhaul),
      nextAction: "Select both systems to get a verdict.",
      warnings: [],
      sources: [],
      confidence: "low",
      errors: ["Both systems must be selected."],
    };
  }

  const fallback = fallbackText(input.wiredBackhaul);

  if (main.mixPolicy === "unknown" || added.mixPolicy === "unknown") {
    const unlisted = main.mixPolicy === "unknown" ? main : added;
    return {
      ...base,
      status: "unknown",
      relationship: "unknown",
      headline: "No reviewed record for that system",
      summary: `HomeNet Fit has no reviewed manufacturer record for ${unlisted.name.toLowerCase()}, so it will not claim the pairing either way.`,
      conditions: [],
      lostFeatures: [],
      setupPath: [],
      fallback,
      nextAction: "Check the manufacturer's own support page for whether these two units can join one mesh, then fall back to access-point mode if it does not say they can.",
      warnings: ["A pairing verdict without a manufacturer record would be a guess."],
      sources: resolveSources([...main.sourceIds, ...added.sourceIds]),
      confidence: "low",
      errors: [],
    };
  }

  const conflict = findConflict(main.familyId, added.familyId);
  if (conflict) {
    return {
      ...base,
      status: "incompatible",
      relationship: "access-point-fallback",
      headline: "These two cannot form one mesh",
      summary: conflict.reason,
      conditions: [],
      lostFeatures: apLostFeatures,
      setupPath: [
        "Decide which system owns routing for the house, and keep that one connected to the modem, gateway, or ONT.",
        "Set the other system to access-point or bridge mode so only one device performs routing.",
        "Give the two networks different Wi-Fi names so devices do not bounce between them expecting seamless roaming.",
      ],
      fallback,
      nextAction: "Pick one system to run the network, and put the other in access-point mode or retire it.",
      warnings: ["Sharing one Wi-Fi name across two unrelated systems does not create roaming. It creates two networks with the same label."],
      sources: resolveSources([...conflict.sourceIds, ...main.sourceIds, ...added.sourceIds]),
      confidence: "high",
      errors: [],
    };
  }

  if (main.mixPolicy === "cross-vendor" && added.mixPolicy === "cross-vendor") {
    return {
      ...base,
      status: "conditional",
      relationship: "cross-vendor-easymesh",
      headline: "Possible through EasyMesh, with conditions",
      summary: "Wi-Fi EasyMesh is the standards-based way to run access points from different vendors as one network, so this pairing is workable when both devices actually carry that certification.",
      conditions: [
        "Confirm both devices are Wi-Fi CERTIFIED EasyMesh on the Wi-Fi Alliance product finder, not just described as mesh in the box copy.",
        "EasyMesh standardises the multi-AP behaviour. Each vendor's app, parental controls, and security extras stay on their own device.",
        "Expect the controller device's firmware to drive onboarding; check both vendors' EasyMesh instructions before buying the second unit.",
      ],
      lostFeatures: ["Vendor-specific features do not cross the brand boundary, so plan on managing each device in its own app."],
      setupPath: [
        "Verify the EasyMesh certification for both exact models.",
        "Set the device that will control the network as the EasyMesh controller and connect it to the service handoff.",
        "Onboard the second device as an EasyMesh agent using the controller vendor's procedure.",
        "Re-test the weak rooms that prompted the addition.",
      ],
      fallback,
      nextAction: "Confirm EasyMesh certification for both exact models before buying anything.",
      warnings: [],
      sources: resolveSources(["wifi-alliance-easymesh", ...main.sourceIds, ...added.sourceIds]),
      confidence: "medium",
      errors: [],
    };
  }

  if (main.familyId !== added.familyId) {
    const sameVendor = main.vendor === added.vendor;
    return {
      ...base,
      status: "incompatible",
      relationship: "access-point-fallback",
      headline: "Not one managed mesh",
      summary: sameVendor
        ? `${main.name} and ${added.name} come from the same manufacturer but are separate mesh systems. Each one documents pairing within its own system, not across to the other.`
        : `${main.name} and ${added.name} each document mesh pairing inside their own system. Neither publishes a way to join the other's mesh, so there is no shared roaming, no shared backhaul, and no single app.`,
      conditions: [],
      lostFeatures: apLostFeatures,
      setupPath: [
        "Choose the system that will own routing, and connect only that one to the modem, gateway, or ONT.",
        "Put the other system in access-point mode so the house has exactly one router.",
        "Cable between them if you can; otherwise place the second system where it still has a strong link to the first.",
        "Name the two Wi-Fi networks differently so you can tell which one a device is on.",
      ],
      fallback,
      nextAction: "Keep one system as the router and add the other as an access point, or standardise on one system.",
      warnings: ["Two mesh systems in one house both trying to route will also create a second NAT layer. Check the topology planner before wiring them together."],
      sources: resolveSources([...main.sourceIds, ...added.sourceIds]),
      confidence: "medium",
      errors: [],
    };
  }

  const family = main;
  const sourceIds = [...family.sourceIds];

  if (family.mixPolicy === "same-series") {
    if (input.sameSeries === "yes") {
      return {
        ...base,
        status: "compatible",
        relationship: "one-managed-mesh",
        headline: "Same series, one managed mesh",
        summary: `Both units belong to the same ${family.vendor} series, which is the pairing the manufacturer sells and documents. Add the satellite through the vendor app and it joins the existing system.`,
        conditions: family.mixNotes,
        lostFeatures: [],
        setupPath: [
          "Update the router to current firmware before adding the satellite.",
          "Place the satellite within reliable range of the router for the first sync, then move it to its final spot.",
          "Add it through the vendor app and wait for the sync indicator to settle.",
          "Cable the satellite back to the router if a run exists, since a wired backhaul frees the wireless capacity for clients.",
        ],
        fallback,
        nextAction: "Add the satellite through the vendor app and confirm it syncs before moving it to its final position.",
        warnings: [],
        sources: resolveSources(sourceIds),
        confidence: "high",
        errors: [],
      };
    }
    const unsure = input.sameSeries === "unsure";
    return {
      ...base,
      status: "unknown",
      relationship: "unknown",
      headline: unsure ? "Check the series on both labels" : "Cross-series pairing is not documented",
      summary: unsure
        ? `${family.vendor} sells these satellites per series and lists the matching series router as a system requirement, so the model numbers decide this. Read both labels before buying anything.`
        : `${family.vendor} lists the matching series router as a system requirement for each add-on satellite and publishes no cross-series pairing list. That makes a mismatched pair unverified — not confirmed to work, and not confirmed to fail.`,
      conditions: family.mixNotes,
      lostFeatures: [],
      setupPath: [
        "Read the model number on the base of each unit and compare the series digits.",
        "Check the satellite's own product page for the router listed under system requirements.",
        "If the series differ, plan on access-point mode or a matching satellite instead of assuming the pair will sync.",
      ],
      fallback,
      nextAction: unsure
        ? "Compare the model numbers on both units, then run this check again."
        : "Buy the satellite sold for your router's series, or run the second unit as an access point.",
      warnings: unsure ? [] : ["Treat an undocumented pairing as a return-policy question, not a plan."],
      sources: resolveSources(sourceIds),
      confidence: "low",
      errors: [],
    };
  }

  if (family.mixPolicy === "any-model-on-list") {
    return {
      ...base,
      status: "conditional",
      relationship: "mixed-managed-mesh",
      headline: "Supported once both models are on the list",
      summary: `${family.vendor} designs this system so different supported models work as one network, and every node inherits the main unit's feature set. The condition is that both exact models appear on the compatibility list and run the right firmware.`,
      conditions: family.mixNotes,
      lostFeatures: ["Features come from the main unit, so anything the main unit lacks is missing network-wide even if the node supports it."],
      setupPath: [
        "Confirm both exact models on the manufacturer's current compatibility list.",
        "Update both units to firmware that includes the mesh feature.",
        "Set the stronger unit as the main router so the network inherits its capabilities.",
        "Add the second unit as a node, then cable it back to the main unit if a run exists.",
      ],
      fallback,
      nextAction: "Check both exact model numbers against the manufacturer's compatibility list before buying.",
      warnings: ["Compatibility is per model, not per brand. A router from the same maker is not automatically eligible."],
      sources: resolveSources(sourceIds),
      confidence: "medium",
      errors: [],
    };
  }

  return {
    ...base,
    status: "conditional",
    relationship: "mixed-managed-mesh",
    headline: "One mesh, with the mixing caveats",
    summary: `${family.note} You get one network and one app; what changes is performance and which features survive the mix.`,
    conditions: family.mixNotes,
    lostFeatures: [
      "A feature only works across the house when every unit supports it. The weakest unit sets the network's feature floor.",
      "Mixed generations pull throughput toward the older unit wherever that unit carries the traffic.",
    ],
    setupPath: [
      "Put the newest or best-connected unit in the main role, wired to the modem, gateway, or ONT.",
      "Update every unit to current firmware before joining them.",
      "Add the second unit through the vendor app as a node or point.",
      "Cable the node back to the main unit where a run exists, so the wireless capacity goes to clients instead of backhaul.",
    ],
    fallback,
    nextAction: "Set the newer unit as the main one, update firmware on both, then add the second unit through the app.",
    warnings: input.wiredBackhaul
      ? []
      : ["Without a wired backhaul, an older unit placed between the main unit and a weak room becomes the ceiling for everything behind it."],
    sources: resolveSources(sourceIds),
    confidence: "medium",
    errors: [],
  };
}

export const meshRelationshipLabels: Record<MeshRelationship, string> = {
  "one-managed-mesh": "One managed mesh",
  "mixed-managed-mesh": "One mesh, mixed units",
  "cross-vendor-easymesh": "Cross-vendor EasyMesh",
  "access-point-fallback": "Separate systems, one router",
  unknown: "Not established",
};

export type { MeshFamily };
