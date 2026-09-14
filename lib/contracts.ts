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
