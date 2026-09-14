import type {
  BottleneckInput,
  BottleneckResult,
  DecisionStatus,
  PathComponentInput,
  PathComponentResult,
} from "./contracts";

function validRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100_000;
}

function unknownResult(input: BottleneckInput, errors: string[]): BottleneckResult {
  return {
    status: "unknown",
    planMbps: validRate(input.planMbps) ? input.planMbps : null,
    verifiedCeilingMbps: null,
    limiter: null,
    tiedLimiters: [],
    unknownComponents: input.components.filter((component) => component.required !== false),
    components: [],
    explanation: "The path cannot be evaluated until the invalid or missing inputs are corrected.",
    nextAction: "Correct the highlighted values, then run the check again.",
    testSteps: [],
    errors,
  };
}

export function findBottleneck(input: BottleneckInput): BottleneckResult {
  const errors: string[] = [];
  if (!validRate(input.planMbps)) errors.push("Internet plan speed must be greater than 0 and no more than 100,000 Mbps.");
  if (!Array.isArray(input.components) || input.components.length === 0) errors.push("Add at least one required network-path component.");

  for (const component of input.components ?? []) {
    if (!component.id || !component.label) errors.push("Every path component needs an ID and label.");
    if (component.ceilingMbps !== null && !validRate(component.ceilingMbps)) {
      errors.push(`${component.label || "A component"} must use a positive supported rate or Unknown.`);
    }
  }
  if (errors.length) return unknownResult(input, errors);

  const active = input.components.filter((component) => component.required !== false);
  const known = active.filter((component): component is PathComponentInput & { ceilingMbps: number } => validRate(component.ceilingMbps));
  const unknownComponents = active.filter((component) => component.ceilingMbps === null);
  const verifiedCeilingMbps = known.length ? Math.min(...known.map((component) => component.ceilingMbps)) : null;
  const tiedLimiters = verifiedCeilingMbps === null ? [] : known.filter((component) => component.ceilingMbps === verifiedCeilingMbps);
  const limiter = tiedLimiters[0] ?? null;

  let status: DecisionStatus;
  if (verifiedCeilingMbps !== null && verifiedCeilingMbps < input.planMbps) status = "conditional";
  else if (unknownComponents.length) status = "unknown";
  else if (verifiedCeilingMbps !== null) status = "compatible";
  else status = "unknown";

  const components: PathComponentResult[] = active.map((component) => {
    if (component.ceilingMbps === null) {
      return { ...component, status: "unknown", reason: "Supported or negotiated rate was not provided." };
    }
    if (component.ceilingMbps < input.planMbps) {
      return {
        ...component,
        status: "conditional",
        reason: `This link is rated below the ${formatRate(input.planMbps)} internet tier.`,
      };
    }
    return { ...component, status: "compatible", reason: `This link is rated to carry the ${formatRate(input.planMbps)} tier.` };
  });

  let explanation: string;
  let nextAction: string;
  if (status === "conditional" && limiter) {
    explanation = `${limiter.label} sets the verified line-rate ceiling at ${formatRate(limiter.ceilingMbps)}. Real application throughput will be lower and varies by protocol, server, and conditions.`;
    nextAction = `Verify ${limiter.label.toLowerCase()} is negotiating at its supported rate. Upgrade or reconfigure that link first only if the higher plan speed matters to this device.`;
  } else if (status === "unknown") {
    explanation = verifiedCeilingMbps === null
      ? "No verified component rate is available, so the path ceiling is unknown."
      : `Known links reach at least ${formatRate(verifiedCeilingMbps)}, but ${unknownComponents.map((component) => component.label).join(", ")} still ${unknownComponents.length === 1 ? "needs" : "need"} a supported or negotiated rate.`;
    nextAction = `Check ${unknownComponents[0]?.label.toLowerCase() ?? "the missing link"} in the device settings, port label, or manufacturer specification.`;
  } else {
    explanation = `Every entered link is rated for at least ${formatRate(input.planMbps)}. This confirms interface capacity, not real-world throughput.`;
    nextAction = "Keep the current path. If measured speed is low, test one wired link at a time before buying hardware.";
  }

  return {
    status,
    planMbps: input.planMbps,
    verifiedCeilingMbps,
    limiter,
    tiedLimiters,
    unknownComponents,
    components,
    explanation,
    nextAction,
    testSteps: [
      "Connect one capable computer by Ethernet to the nearest upstream device.",
      "Confirm the negotiated link rate in the operating system or device interface.",
      "Run more than one test to a nearby server, then move downstream one link at a time.",
      "Treat Wi-Fi results as observations for that place and time, not a fixed equipment ceiling.",
    ],
    errors: [],
  };
}

export function formatRate(mbps: number | null): string {
  if (mbps === null) return "Unknown";
  if (mbps >= 1000) return `${Number((mbps / 1000).toFixed(2))} Gbps`;
  return `${Number(mbps.toFixed(1))} Mbps`;
}
