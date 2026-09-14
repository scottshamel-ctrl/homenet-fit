import { findBottleneck, formatRate } from "./bottleneck";
import { checkIsp } from "./isp-checker";
import type {
  Confidence,
  DecisionStatus,
  NetworkPathStage,
  WholeNetworkInput,
  WholeNetworkResult,
} from "./contracts";

const priority: Record<DecisionStatus, number> = {
  compatible: 0,
  conditional: 1,
  unknown: 2,
  incompatible: 3,
};

function worst(...statuses: DecisionStatus[]): DecisionStatus {
  return statuses.reduce((current, status) => priority[status] > priority[current] ? status : current, "compatible");
}

function confidenceFor(status: DecisionStatus, unknownCount: number): Confidence {
  if (status === "unknown" || unknownCount > 0) return "low";
  if (status === "conditional") return "medium";
  return "high";
}

export function planWholeNetwork(input: WholeNetworkInput): WholeNetworkResult {
  const isp = checkIsp(input);
  const bottleneck = findBottleneck({ planMbps: input.planMbps, components: input.components });
  const status = worst(isp.status, bottleneck.status);
  const gatewayComponent = bottleneck.components.find((component) => component.id === "gateway");
  const routerComponent = bottleneck.components.find((component) => component.id === "router");
  const linkComponent = bottleneck.components.find((component) => component.id === "link");
  const clientComponent = bottleneck.components.find((component) => component.id === "client");

  const path: NetworkPathStage[] = [
    {
      id: "isp",
      label: "ISP plan",
      detail: Number.isFinite(input.planMbps) && input.planMbps > 0 ? formatRate(input.planMbps) : "Invalid speed",
      status: Number.isFinite(input.planMbps) && input.planMbps > 0 ? "compatible" : "unknown",
    },
    {
      id: "gateway",
      label: "Modem / gateway",
      detail: gatewayComponent?.ceilingMbps ? formatRate(gatewayComponent.ceilingMbps) : isp.summary,
      status: worst(isp.status, gatewayComponent?.status ?? "unknown"),
    },
    {
      id: "router",
      label: "Router / mesh",
      detail: routerComponent?.ceilingMbps ? formatRate(routerComponent.ceilingMbps) : "Rate unknown",
      status: routerComponent?.status ?? "unknown",
    },
    {
      id: "link",
      label: "Wired / wireless link",
      detail: linkComponent?.ceilingMbps ? formatRate(linkComponent.ceilingMbps) : "Rate unknown",
      status: linkComponent?.status ?? "unknown",
    },
    {
      id: "client",
      label: "Client device",
      detail: clientComponent?.ceilingMbps ? formatRate(clientComponent.ceilingMbps) : "Rate unknown",
      status: clientComponent?.status ?? "unknown",
    },
  ];

  let verdict: string;
  let meaning: string;
  let firstIssue: string;
  let cheapestAction: string;
  if (status === "incompatible") {
    verdict = "This setup does not fit as entered.";
    meaning = isp.summary;
    firstIssue = "The provider equipment requirement fails before downstream speed matters.";
    cheapestAction = isp.nextAction;
  } else if (status === "unknown") {
    verdict = "One required answer is still unknown.";
    meaning = isp.status === "unknown" ? isp.summary : bottleneck.explanation;
    firstIssue = isp.status === "unknown"
      ? "Provider or exact-model evidence must be checked first."
      : `${bottleneck.unknownComponents[0]?.label ?? "A path component"} has no verified rate.`;
    cheapestAction = isp.status === "unknown" ? isp.nextAction : bottleneck.nextAction;
  } else if (status === "conditional") {
    verdict = "This setup fits with conditions.";
    meaning = bottleneck.status === "conditional" ? bottleneck.explanation : isp.summary;
    firstIssue = bottleneck.limiter && bottleneck.limiter.ceilingMbps !== null && bottleneck.limiter.ceilingMbps < input.planMbps
      ? `${bottleneck.limiter.label} is the first verified limiter at ${formatRate(bottleneck.limiter.ceilingMbps)}.`
      : "The provider requires a specific gateway mode or retained device.";
    cheapestAction = bottleneck.status === "conditional" ? bottleneck.nextAction : isp.nextAction;
  } else {
    verdict = "The entered path fits the internet tier.";
    meaning = "Every required provider rule and entered link rate passes. This is a capability check, not a remote speed measurement.";
    firstIssue = "No incompatible or limiting link was found in the entered path.";
    cheapestAction = "Keep the current equipment. Test before changing anything.";
  }

  return {
    status,
    verdict,
    meaning,
    firstIssue,
    cheapestAction,
    confidence: confidenceFor(status, bottleneck.unknownComponents.length),
    path,
    isp,
    bottleneck,
    assumptions: [
      "Entered port and link rates are supported or negotiated line rates, not marketing Wi-Fi totals.",
      "Real application throughput is lower than interface line rate and changes with protocol and conditions.",
      "Provider approval and setup rules can change; evidence dates are shown with the result.",
    ],
  };
}
