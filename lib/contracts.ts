export type DecisionStatus = "compatible" | "conditional" | "incompatible" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type IspScenario = "own-modem" | "own-router" | "both";

export interface SourceRecord {
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  publishedOrUpdated: string | null;
  retrieved: string;
  nextReview: string;
  evidenceNote: string;
}

export interface PathComponentInput {
  id: string;
  label: string;
  ceilingMbps: number | null;
  required?: boolean;
}

export interface PathComponentResult extends PathComponentInput {
  status: DecisionStatus;
  reason: string;
}

export interface BottleneckInput {
  planMbps: number;
  components: PathComponentInput[];
}

export interface BottleneckResult {
  status: DecisionStatus;
  planMbps: number | null;
  verifiedCeilingMbps: number | null;
  limiter: PathComponentInput | null;
  tiedLimiters: PathComponentInput[];
  unknownComponents: PathComponentInput[];
  components: PathComponentResult[];
  explanation: string;
  nextAction: string;
  testSteps: string[];
  errors: string[];
}

export interface IspCheckInput {
  provider: string;
  scenario: IspScenario;
  equipmentModel?: string;
  hasVoice?: boolean;
  hasTv?: boolean;
}

export interface IspCheckResult {
  status: DecisionStatus;
  scenarioStatus: DecisionStatus;
  modelStatus: "not-required" | "unknown";
  providerId: string | null;
  providerName: string;
  summary: string;
  requirements: string[];
  lostFeatures: string[];
  nextAction: string;
  sources: SourceRecord[];
  lastVerified: string | null;
  nextReview: string | null;
  confidence: Confidence;
}

export type CableCategory = "cat5" | "cat5e" | "cat6" | "cat6a" | "unknown";

export interface EthernetLinkInput {
  targetMbps: number;
  cableCategory: CableCategory;
  lengthMeters: number | null;
  portARate: number | null;
  portBRate: number | null;
  adapterRate: number | null;
  negotiatedMbps: number | null;
}

export interface EthernetLimiter {
  id: string;
  label: string;
  ceilingMbps: number | null;
}

export interface EthernetLinkResult {
  status: DecisionStatus;
  targetMbps: number | null;
  cableStatus: DecisionStatus;
  cableCeilingMbps: number | null;
  cableNote: string;
  expectedCeilingMbps: number | null;
  limiter: EthernetLimiter | null;
  negotiatedMbps: number | null;
  negotiationGap: boolean;
  explanation: string;
  causes: string[];
  actions: string[];
  assumptions: string[];
  testSteps: string[];
  sources: SourceRecord[];
  confidence: Confidence;
  errors: string[];
}

export type OwnDeviceKind = "router" | "mesh";
export type BridgeSupport = "yes" | "no" | "unknown";
export type TopologyPlanId =
  | "own-modem-single-router"
  | "ont-single-router"
  | "gateway-bridge"
  | "gateway-ip-passthrough"
  | "gateway-plus-ap"
  | "double-nat-accepted"
  | "unknown";

export interface TopologyInput {
  provider: string;
  ownDevice: OwnDeviceKind;
  keepsProviderGateway: boolean;
  bridgeSupport: BridgeSupport;
  hasVoice: boolean;
  hasTv: boolean;
  needsRouterFeatures: boolean;
}

export interface TopologyRole {
  device: string;
  role: string;
}

export interface TopologyResult {
  status: DecisionStatus;
  planId: TopologyPlanId;
  planName: string;
  providerName: string;
  providerNote: string;
  summary: string;
  doubleNat: "avoided" | "reduced" | "present" | "unknown";
  doubleNatNote: string;
  roles: TopologyRole[];
  cablePath: string[];
  steps: string[];
  tradeoffs: string[];
  warnings: string[];
  nextAction: string;
  sources: SourceRecord[];
  lastVerified: string | null;
  nextReview: string | null;
  confidence: Confidence;
  errors: string[];
}

export type MeshRelationship =
  | "one-managed-mesh"
  | "mixed-managed-mesh"
  | "cross-vendor-easymesh"
  | "access-point-fallback"
  | "unknown";

export interface MeshInput {
  mainFamily: string;
  addedFamily: string;
  sameSeries: "yes" | "no" | "unsure";
  wiredBackhaul: boolean;
}

export interface MeshResult {
  status: DecisionStatus;
  relationship: MeshRelationship;
  headline: string;
  summary: string;
  mainFamilyName: string;
  addedFamilyName: string;
  conditions: string[];
  lostFeatures: string[];
  setupPath: string[];
  fallback: string;
  nextAction: string;
  warnings: string[];
  sources: SourceRecord[];
  lastVerified: string | null;
  nextReview: string | null;
  confidence: Confidence;
  errors: string[];
}

export interface WholeNetworkInput extends IspCheckInput {
  planMbps: number;
  components: PathComponentInput[];
}

export interface NetworkPathStage {
  id: string;
  label: string;
  detail: string;
  status: DecisionStatus;
}

export interface WholeNetworkResult {
  status: DecisionStatus;
  verdict: string;
  meaning: string;
  firstIssue: string;
  cheapestAction: string;
  confidence: Confidence;
  path: NetworkPathStage[];
  isp: IspCheckResult;
  bottleneck: BottleneckResult;
  assumptions: string[];
}
