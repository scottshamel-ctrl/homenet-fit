import profilesJson from "../data/topology-profiles.json";
import sourcesJson from "../data/sources.json";
import { checkIsp, normalizeProviderId } from "./isp-checker";
import type {
  Confidence,
  DecisionStatus,
  SourceRecord,
  TopologyInput,
  TopologyPlanId,
  TopologyResult,
  TopologyRole,
} from "./contracts";

interface TopologyProfile {
  providerId: string;
  gatewayRequired: boolean;
  gatewayBridgeMode: "documented" | "not-available" | "not-applicable" | "unknown";
  ipPassthrough: "documented" | "not-available" | "unknown";
  note: string;
  sourceIds: string[];
}

const profiles = profilesJson.profiles as TopologyProfile[];
const sources = sourcesJson.sources as SourceRecord[];
const vendorSourceIds = ["netgear-router-ap-mode", "netgear-double-nat"];

const apLostFeatures = [
  "Guest network, site blocking, VPN service, and remote management stop working on a router placed in access-point mode.",
  "Port forwarding and inbound rules belong on whichever device still performs routing.",
];

function resolveSources(sourceIds: string[]): SourceRecord[] {
  return sourceIds
    .map((sourceId) => sources.find((source) => source.sourceId === sourceId))
    .filter((source): source is SourceRecord => Boolean(source));
}

function deviceName(input: TopologyInput): string {
  return input.ownDevice === "mesh" ? "Your mesh system" : "Your router";
}

export function planTopology(input: TopologyInput): TopologyResult {
  const providerId = normalizeProviderId(input.provider);
  const profile = profiles.find((item) => item.providerId === providerId);
  const isp = checkIsp({
    provider: input.provider,
    scenario: input.keepsProviderGateway ? "own-router" : "both",
    hasVoice: input.hasVoice,
    hasTv: input.hasTv,
  });

  if (!profile || !providerId) {
    return {
      status: "unknown",
      planId: "unknown",
      planName: "Provider not covered",
      providerName: isp.providerName,
      providerNote: "No reviewed gateway record exists for this provider in the current data set.",
      summary: "HomeNet Fit has no reviewed gateway record for that provider, so it will not recommend a topology that depends on one.",
      doubleNat: "unknown",
      doubleNatNote: "Whether a second routing layer exists depends on how the provider device is configured, which has not been verified here.",
      roles: [],
      cablePath: [],
      steps: [
        "Ask the provider whether its device can run in bridge mode, offer IP passthrough, or be replaced by customer-owned equipment.",
        "If none of those is available, plan on access-point mode for the customer-owned router or mesh so only one device performs routing.",
        "Return to this tool once the provider confirms which modes exist.",
      ],
      tradeoffs: [],
      warnings: ["A topology recommendation without a verified provider record would be a guess."],
      nextAction: "Confirm the available gateway modes with the provider before changing equipment.",
      sources: [],
      lastVerified: null,
      nextReview: null,
      confidence: "low",
      errors: [],
    };
  }

  const own = deviceName(input);
  const warnings: string[] = [];
  const tradeoffs: string[] = [];
  let planId: TopologyPlanId;
  let planName: string;
  let summary: string;
  let doubleNat: TopologyResult["doubleNat"];
  let doubleNatNote: string;
  let roles: TopologyRole[];
  let cablePath: string[];
  let steps: string[];
  let nextAction: string;
  let status: DecisionStatus;
  const extraSourceIds = [...profile.sourceIds];

  if (!input.keepsProviderGateway && !profile.gatewayRequired) {
    const fiber = providerId === "verizon-fios";
    planId = fiber ? "ont-single-router" : "own-modem-single-router";
    planName = fiber ? "ONT straight into your own router" : "Your own modem, then your own router";
    status = "conditional";
    summary = fiber
      ? `The ONT terminates the fiber service and hands off Ethernet. ${own} performs all routing, so there is only ever one NAT layer.`
      : `An approved customer-owned modem replaces the provider gateway completely. ${own} performs all routing, so there is only ever one NAT layer.`;
    doubleNat = "avoided";
    doubleNatNote = "Only one device routes, so there is no second NAT layer to remove later.";
    roles = [
      { device: fiber ? "Provider ONT" : "Your modem", role: fiber ? "Terminates fiber service and hands off Ethernet" : "Converts the service signal to Ethernet only" },
      { device: own, role: "Routing, NAT, DHCP, firewall, and Wi-Fi" },
    ];
    cablePath = [fiber ? "Fiber service → ONT" : "Service line → your modem", `Ethernet → ${own.toLowerCase()} WAN port`, "LAN ports and Wi-Fi → your devices"];
    steps = [
      fiber
        ? "Confirm the ONT has an active Ethernet handoff for your installation."
        : "Verify the exact modem model against the provider's current approved list before buying it.",
      `Connect the handoff to the WAN port on ${own.toLowerCase()}, not to a LAN port.`,
      "Leave the router in router mode so it owns DHCP and the firewall.",
      "Confirm the router's WAN address is not in a private range shared with an upstream device.",
    ];
    nextAction = fiber
      ? "Confirm the ONT Ethernet handoff, then connect your own router directly to it."
      : "Confirm the exact modem model on the provider's current list, then connect your own router to it.";
    tradeoffs.push("You own support for the modem or the ONT handoff. The provider will troubleshoot its service, not your equipment.");
    if (input.hasVoice) warnings.push("Provider voice service can depend on a specific gateway or modem. Verify voice support before removing provider equipment.");
    if (input.hasTv) warnings.push("Provider TV features frequently depend on provider equipment and its in-home network. Confirm the TV path before changing the router.");
  } else if (profile.gatewayBridgeMode === "documented" && input.bridgeSupport !== "no") {
    planId = "gateway-bridge";
    planName = "Provider gateway in bridge mode";
    status = input.bridgeSupport === "yes" ? "compatible" : "conditional";
    summary = `The provider gateway stops routing and passes the connection through. ${own} becomes the only router, which removes double NAT and keeps every router feature available.`;
    doubleNat = "avoided";
    doubleNatNote = "Bridge mode leaves exactly one routing device, which is the documented fix for double NAT.";
    roles = [
      { device: "Provider gateway", role: "Bridge only — no routing, no NAT, no Wi-Fi" },
      { device: own, role: "Routing, NAT, DHCP, firewall, and Wi-Fi" },
    ];
    cablePath = ["Service line → provider gateway", `Gateway Ethernet → ${own.toLowerCase()} WAN port`, "LAN ports and Wi-Fi → your devices"];
    steps = [
      "Enable bridge mode on the provider gateway using the provider's own procedure.",
      `Connect the gateway to the WAN port on ${own.toLowerCase()}.`,
      "Reboot both devices in order: gateway first, then your router.",
      "Check that your router's WAN address is a public address rather than a private one.",
    ];
    nextAction = "Put the provider gateway in bridge mode, then connect your router to its Ethernet handoff.";
    tradeoffs.push("Gateway Wi-Fi and gateway-managed features turn off in bridge mode. Your router supplies all of them instead.");
    if (input.hasVoice) warnings.push("Bridge mode can affect provider voice service on the same gateway. Confirm voice support before switching modes.");
    if (input.hasTv) warnings.push("Provider TV features may rely on the gateway's own network. Verify the TV path before bridging.");
    if (input.bridgeSupport === "unknown") warnings.push("You have not confirmed bridge mode on your exact gateway model. Check the provider's current article for that model before planning around it.");
  } else if (profile.ipPassthrough === "documented") {
    planId = "gateway-ip-passthrough";
    planName = "Required gateway with passthrough to your router";
    status = "conditional";
    summary = `The gateway must remain in the path, so the closest available arrangement hands the public address to ${own.toLowerCase()} instead of bridging. Routing still starts at the gateway, so this reduces the effects of double NAT rather than removing the layer.`;
    doubleNat = "reduced";
    doubleNatNote = "Passthrough is not a bridge. One device still holds the service session, so treat inbound-connection problems as a gateway question first.";
    roles = [
      { device: "Provider gateway", role: "Required service device, passing the public address to one downstream device" },
      { device: own, role: "Routing, NAT, DHCP, firewall, and Wi-Fi for the home network" },
    ];
    cablePath = ["Service line → provider gateway", `Gateway Ethernet → ${own.toLowerCase()} WAN port`, "LAN ports and Wi-Fi → your devices"];
    steps = [
      `Connect ${own.toLowerCase()} to a gateway Ethernet port and note the address it receives.`,
      "Assign passthrough or the DMZ-style mode on the gateway to that exact device.",
      "Disable the gateway's Wi-Fi so devices do not attach to two separate networks.",
      "Confirm inbound rules and port forwarding on your router, then retest the specific application that failed.",
    ];
    nextAction = "Configure the gateway's documented passthrough mode for your router, then disable gateway Wi-Fi.";
    tradeoffs.push("Only one downstream device can receive the passthrough address. Everything else stays behind your router.");
    tradeoffs.push("Gateway firmware updates can reset this mode. Recheck it after provider maintenance.");
    if (input.hasTv) warnings.push("Provider TV equipment often depends on the gateway network. Verify the TV path before changing gateway modes.");
  } else if (input.needsRouterFeatures && profile.gatewayRequired && profile.gatewayBridgeMode === "not-available" && profile.ipPassthrough === "not-available") {
    planId = "double-nat-accepted";
    planName = "Gateway keeps routing, your router runs behind it";
    status = "conditional";
    summary = `This provider's gateway cannot bridge or pass the address through, and you want router features that access-point mode disables. Keeping ${own.toLowerCase()} in router mode is the only way to have those features here, and it creates a second NAT layer on purpose.`;
    doubleNat = "present";
    doubleNatNote = "Two devices perform NAT. Most browsing is unaffected; inbound connections, some game consoles, and remote access need forwarding on both devices or will not work.";
    roles = [
      { device: "Provider gateway", role: "First router: service connection, first NAT layer" },
      { device: own, role: "Second router: your Wi-Fi, DHCP, and feature set" },
    ];
    cablePath = ["Service line → provider gateway", `Gateway LAN → ${own.toLowerCase()} WAN port`, "LAN ports and Wi-Fi → your devices"];
    steps = [
      "Give the two devices different private address ranges so they do not overlap.",
      "Disable Wi-Fi on the provider gateway so clients land on one network only.",
      "Forward any required inbound port on the gateway first, then again on your router.",
      "Accept that some inbound services will still fail, and switch to access-point mode if they matter more than the router features.",
    ];
    nextAction = "Separate the two address ranges, disable gateway Wi-Fi, and forward ports on both devices.";
    tradeoffs.push("You keep parental controls, VPN, and guest networks at the cost of a second NAT layer.");
    warnings.push("Double NAT is a deliberate trade here, not a recommended default.");
  } else {
    planId = "gateway-plus-ap";
    planName = "Required gateway with your device in access-point mode";
    status = "conditional";
    summary = `The provider gateway must keep routing, so ${own.toLowerCase()} should run as an access point. Only one device performs NAT, which avoids the double-NAT problems while giving you the Wi-Fi coverage of your own hardware.`;
    doubleNat = "avoided";
    doubleNatNote = "Access-point mode is the documented fallback when a gateway cannot be bridged: the gateway stays the only router.";
    roles = [
      { device: "Provider gateway", role: "Routing, NAT, DHCP, and firewall" },
      { device: own, role: "Wi-Fi coverage and switching only" },
    ];
    cablePath = ["Service line → provider gateway", `Gateway LAN → ${own.toLowerCase()} LAN or uplink port`, "Wi-Fi and LAN ports → your devices"];
    steps = [
      `Set ${own.toLowerCase()} to access-point or bridge mode in its own settings before connecting it.`,
      "Disable Wi-Fi on the provider gateway so clients do not split across two networks.",
      "Connect the gateway to your device and let the gateway hand out all addresses.",
      "Re-test the rooms that were weak, since coverage is the reason for this arrangement.",
    ];
    nextAction = `Put ${own.toLowerCase()} in access-point mode, then turn the gateway's Wi-Fi off.`;
    tradeoffs.push(...apLostFeatures);
    if (input.needsRouterFeatures) warnings.push("You asked to keep router features that access-point mode disables. Those features stay on the provider gateway in this arrangement.");
    if (profile.gatewayBridgeMode === "not-available") warnings.push("This provider's gateway does not offer bridge mode, so a customer router in router mode would add a second NAT layer.");
    if (input.hasTv && providerId !== "tmobile-home-internet") warnings.push("Provider TV equipment may depend on the gateway network. Keep TV devices on the gateway path.");
  }

  if (!input.keepsProviderGateway && profile.gatewayRequired) {
    warnings.unshift("This provider requires its own gateway, so the plan below keeps it in the path even though you asked to remove it.");
  }
  if (planId === "gateway-plus-ap" && !profile.gatewayRequired) {
    tradeoffs.push("This provider does not require its gateway. An approved customer-owned modem would remove it and return every router feature to your own device.");
  }

  if (isp.status === "unknown") {
    status = "unknown";
    warnings.push("The provider equipment rule returned unknown for this service combination, so confirm the arrangement with the provider before changing modes.");
  }

  const resultSources = resolveSources([...extraSourceIds, ...vendorSourceIds]);
  const confidence: Confidence = status === "unknown" ? "low" : status === "compatible" ? "high" : "medium";

  return {
    status,
    planId,
    planName,
    providerName: isp.providerName,
    providerNote: profile.note,
    summary,
    doubleNat,
    doubleNatNote,
    roles,
    cablePath,
    steps,
    tradeoffs,
    warnings,
    nextAction,
    sources: resultSources,
    lastVerified: profilesJson.lastVerified,
    nextReview: profilesJson.nextReview,
    confidence,
    errors: [],
  };
}
