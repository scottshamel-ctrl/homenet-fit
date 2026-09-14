import sourcesJson from "../data/sources.json";
import { formatRate } from "./bottleneck";
import type {
  CableCategory,
  Confidence,
  DecisionStatus,
  EthernetLimiter,
  EthernetLinkInput,
  EthernetLinkResult,
  SourceRecord,
} from "./contracts";

const sources = sourcesJson.sources as SourceRecord[];
const cableSourceIds = ["ieee-8023bz-objectives", "ieee-8023an-objectives", "netgear-multigig-ports"];

interface CableVerdict {
  ceilingMbps: number | null;
  status: DecisionStatus;
  note: string;
}

function validRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100_000;
}

// Ceilings follow the approved IEEE 802.3 task-force objectives: 2.5G to 100 m on Class D (Cat5e),
// 5G to 100 m on Class E (Cat6) and only on defined Class D deployments, 10G at 55-100 m on Class E.
function cableVerdict(category: CableCategory, lengthMeters: number | null): CableVerdict {
  const length = lengthMeters ?? 0;
  if (category === "unknown") {
    return { ceilingMbps: null, status: "unknown", note: "An unlabeled or unidentified cable has no verified rating. Read the printing on the jacket or treat the run as unknown." };
  }
  if (lengthMeters !== null && lengthMeters > 100) {
    return { ceilingMbps: null, status: "incompatible", note: "A single twisted-pair run longer than 100 m is outside the structured-cabling limit for every BASE-T rate in this tool. Split the run with a switch." };
  }
  if (category === "cat5") {
    return { ceilingMbps: 100, status: "conditional", note: "Cat5 is specified for 100BASE-TX. Gigabit often negotiates on a short Cat5 run, but it is not a rated outcome, so this tool holds the verified ceiling at 100 Mbps." };
  }
  if (category === "cat5e") {
    return { ceilingMbps: 2500, status: "compatible", note: "Cat5e is rated for 1 Gbps and, under IEEE 802.3bz, for 2.5 Gbps up to 100 m. 5 Gbps on Cat5e is defined only for specific deployments, so it is not treated as a verified ceiling here." };
  }
  if (category === "cat6") {
    const tenGigNote = length > 55
      ? "10GBASE-T over Cat6 is specified only as a distance-limited case between 55 m and 100 m, so a run this long is not a verified 10G path."
      : "At 55 m or less, 10 Gbps may also negotiate, but 10GBASE-T over Cat6 depends on the individual installation, so the verified ceiling stays at 5 Gbps.";
    return { ceilingMbps: 5000, status: "compatible", note: `Cat6 is rated to carry 5 Gbps across a 100 m run. ${tenGigNote}` };
  }
  return { ceilingMbps: 10000, status: "compatible", note: "Cat6a is rated to carry 10 Gbps across a full 100 m run, which covers every rate in this tool." };
}

function unknownResult(input: EthernetLinkInput, errors: string[]): EthernetLinkResult {
  return {
    status: "unknown",
    targetMbps: validRate(input.targetMbps) ? input.targetMbps : null,
    cableStatus: "unknown",
    cableCeilingMbps: null,
    cableNote: "",
    expectedCeilingMbps: null,
    limiter: null,
    negotiatedMbps: null,
    negotiationGap: false,
    explanation: "This link cannot be evaluated until the invalid inputs are corrected.",
    causes: [],
    actions: [],
    assumptions: [],
    testSteps: [],
    sources: [],
    confidence: "low",
    errors,
  };
}

export function checkEthernetLink(input: EthernetLinkInput): EthernetLinkResult {
  const errors: string[] = [];
  if (!validRate(input.targetMbps)) errors.push("Target link rate must be greater than 0 and no more than 100,000 Mbps.");
  if (input.lengthMeters !== null && (!Number.isFinite(input.lengthMeters) || input.lengthMeters <= 0 || input.lengthMeters > 500)) {
    errors.push("Cable length must be between 1 and 500 metres, or left unknown.");
  }
  for (const [label, value] of [["First port", input.portARate], ["Second port", input.portBRate], ["Adapter or dock", input.adapterRate], ["Observed link rate", input.negotiatedMbps]] as const) {
    if (value !== null && !validRate(value)) errors.push(`${label} must be a positive supported rate or unknown.`);
  }
  if (errors.length) return unknownResult(input, errors);

  const cable = cableVerdict(input.cableCategory, input.lengthMeters);
  const assumptions: string[] = [];
  if (input.lengthMeters === null && input.cableCategory !== "unknown") {
    assumptions.push("Cable length was not entered, so this result assumes a single run of 100 m or less.");
  }
  if (input.adapterRate === null) assumptions.push("No USB adapter or dock was included in the path.");

  const candidates: EthernetLimiter[] = [
    { id: "cable", label: `${cableLabel(input.cableCategory)} cable run`, ceilingMbps: cable.ceilingMbps },
    { id: "port-a", label: "Router or switch port", ceilingMbps: input.portARate },
    { id: "port-b", label: "Device network interface", ceilingMbps: input.portBRate },
  ];
  if (input.adapterRate !== null) candidates.push({ id: "adapter", label: "USB adapter or dock", ceilingMbps: input.adapterRate });

  const known = candidates.filter((item): item is EthernetLimiter & { ceilingMbps: number } => validRate(item.ceilingMbps));
  const unknowns = candidates.filter((item) => item.ceilingMbps === null);
  const expectedCeilingMbps = known.length ? Math.min(...known.map((item) => item.ceilingMbps)) : null;
  const limiter = expectedCeilingMbps === null ? null : known.find((item) => item.ceilingMbps === expectedCeilingMbps) ?? null;
  const negotiationGap = validRate(input.negotiatedMbps) && expectedCeilingMbps !== null && input.negotiatedMbps < expectedCeilingMbps;

  let status: DecisionStatus;
  if (cable.status === "incompatible") status = "incompatible";
  else if (negotiationGap) status = "conditional";
  else if (expectedCeilingMbps !== null && expectedCeilingMbps < input.targetMbps) status = "conditional";
  else if (unknowns.length) status = "unknown";
  else status = "compatible";

  const causes: string[] = [];
  const actions: string[] = [];

  if (status === "incompatible") {
    causes.push("The entered run exceeds the 100 m channel limit that every rate in this tool depends on.");
    actions.push("Break the run with a switch or media converter so no single copper segment exceeds 100 m.");
  } else if (negotiationGap && validRate(input.negotiatedMbps)) {
    const observed = input.negotiatedMbps;
    if (observed <= 100 && expectedCeilingMbps !== null && expectedCeilingMbps >= 1000) {
      causes.push("A gigabit-capable path that negotiates at 100 Mbps usually means only two of the four pairs are carrying signal. A damaged conductor, a poorly terminated jack or keystone, or a crushed cable produces exactly this result.");
    }
    causes.push("One end may be pinned to a fixed speed instead of auto-negotiation, which forces the whole link to the lower rate.");
    if (input.adapterRate !== null) causes.push("A USB adapter or dock negotiates on its own terms and may cap the link below both ports regardless of the cable.");
    if (expectedCeilingMbps !== null && expectedCeilingMbps > 1000 && observed === 1000) {
      causes.push("Multi-gig rates need both ends to support and enable 802.3bz. A port that advertises only 1 Gbps will settle there even on capable cabling.");
    }
    causes.push("A dirty, loose, or partially seated connector can drop a link a full rate tier without disconnecting it.");
    actions.push("Reseat both connectors, then recheck the reported link rate before changing anything else.");
    actions.push("Swap in a known-good short patch cable between the same two ports. If the rate recovers, the run or its terminations are the fault.");
    actions.push("Move the device to a different port on the same switch or router to rule out a single failed port.");
    actions.push("Confirm both interfaces are set to auto-negotiate rather than a fixed speed and duplex.");
    if (input.adapterRate !== null) actions.push("Test the device's built-in port, or a different adapter, before blaming the cabling.");
    actions.push("Replace or re-terminate the permanent run only after the tests above point at it.");
  } else if (status === "conditional" && limiter) {
    causes.push(`${limiter.label} is rated at ${formatRate(limiter.ceilingMbps)}, below the ${formatRate(input.targetMbps)} you are aiming for.`);
    actions.push(`Change ${limiter.label.toLowerCase()} first. Upgrading anything else in this link cannot raise the rate while it stays in the path.`);
    actions.push("Recheck the reported link rate after the change so the result is a measurement, not an assumption.");
  } else if (status === "unknown") {
    causes.push(`${unknowns.map((item) => item.label).join(" and ")} still ${unknowns.length === 1 ? "needs" : "need"} a rating before this link can be judged.`);
    actions.push("Read the port label or specification sheet, or check the negotiated rate the operating system reports, then run the check again.");
  } else {
    actions.push("Keep this link. If throughput is still low, the cause is upstream of this segment or in the application, not in this cable and these ports.");
  }

  const explanation = status === "incompatible"
    ? "The cable run itself is out of specification, so no port change can fix this link."
    : negotiationGap
      ? `The path should support ${formatRate(expectedCeilingMbps)}, but the link reports ${formatRate(input.negotiatedMbps)}. That gap is a fault to find, not a limit to accept.`
      : status === "conditional"
        ? `${limiter?.label ?? "One component"} holds this link to ${formatRate(expectedCeilingMbps)}.`
        : status === "unknown"
          ? "Part of the link has no verified rating, so the ceiling stays unknown rather than being guessed."
          : `Every rated part of this link supports at least ${formatRate(input.targetMbps)}. Line rate is interface capacity, not measured throughput.`;

  const confidence: Confidence = status === "unknown" ? "low" : status === "compatible" ? "high" : "medium";

  return {
    status,
    targetMbps: input.targetMbps,
    cableStatus: cable.status,
    cableCeilingMbps: cable.ceilingMbps,
    cableNote: cable.note,
    expectedCeilingMbps,
    limiter,
    negotiatedMbps: validRate(input.negotiatedMbps) ? input.negotiatedMbps : null,
    negotiationGap,
    explanation,
    causes,
    actions,
    assumptions,
    testSteps: [
      "Read the link rate the operating system or switch reports for this exact port, not the speed-test result.",
      "Change one variable at a time: cable, then port, then adapter.",
      "Record the reported rate after each change so a fix is visible immediately.",
      "Keep a short known-good patch cable as the control for every future test.",
    ],
    sources: cableSourceIds
      .map((sourceId) => sources.find((source) => source.sourceId === sourceId))
      .filter((source): source is SourceRecord => Boolean(source)),
    confidence,
    errors: [],
  };
}

export function cableLabel(category: CableCategory): string {
  return { cat5: "Cat5", cat5e: "Cat5e", cat6: "Cat6", cat6a: "Cat6a", unknown: "Unlabeled" }[category];
}
