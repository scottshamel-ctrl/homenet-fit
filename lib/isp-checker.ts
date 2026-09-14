import rulesJson from "../data/isp-rules.json";
import sourcesJson from "../data/sources.json";
import type {
  Confidence,
  DecisionStatus,
  IspCheckInput,
  IspCheckResult,
  IspScenario,
  SourceRecord,
} from "./contracts";

interface ProviderRecord {
  providerId: string;
  name: string;
  aliases: string[];
  accessTechnologies: string[];
  officialSupportUrl: string;
}

interface IspRule {
  ruleId: string;
  providerId: string;
  scenario: IspScenario;
  status: DecisionStatus;
  exactModelCheckRequired: boolean;
  summary: string;
  requirements: string[];
  lostFeatures: string[];
  nextAction: string;
  sourceIds: string[];
  lastVerified: string;
  nextReview: string;
  confidence: Confidence;
}

const providers = rulesJson.providers as ProviderRecord[];
const rules = rulesJson.rules as IspRule[];
const sources = sourcesJson.sources as SourceRecord[];

function key(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizeProviderId(value: string): string | null {
  const target = key(value);
  const provider = providers.find((item) =>
    [item.providerId, item.name, ...item.aliases].some((alias) => key(alias) === target),
  );
  return provider?.providerId ?? null;
}

export function listProviders(): ProviderRecord[] {
  return providers.map((provider) => ({ ...provider, aliases: [...provider.aliases], accessTechnologies: [...provider.accessTechnologies] }));
}

export function checkIsp(input: IspCheckInput): IspCheckResult {
  const providerId = normalizeProviderId(input.provider);
  const provider = providers.find((item) => item.providerId === providerId);
  if (!provider) {
    return {
      status: "unknown",
      scenarioStatus: "unknown",
      modelStatus: "unknown",
      providerId: null,
      providerName: input.provider.trim() || "Provider not selected",
      summary: "This local foundation does not yet contain a reviewed rule for that provider and service type.",
      requirements: ["Use the provider's current official equipment or support page for a manual check."],
      lostFeatures: [],
      nextAction: "Choose a covered provider or verify the setup directly with the provider.",
      sources: [],
      lastVerified: null,
      nextReview: null,
      confidence: "low",
    };
  }

  const rule = rules.find((item) => item.providerId === providerId && item.scenario === input.scenario);
  if (!rule) {
    return {
      status: "unknown",
      scenarioStatus: "unknown",
      modelStatus: "unknown",
      providerId,
      providerName: provider.name,
      summary: "The provider is covered, but this equipment arrangement does not have a reviewed rule.",
      requirements: ["Verify the arrangement with the provider before changing equipment."],
      lostFeatures: [],
      nextAction: `Use ${provider.name}'s official support page for the missing arrangement.`,
      sources: [],
      lastVerified: null,
      nextReview: null,
      confidence: "low",
    };
  }

  const requirements = [...rule.requirements];
  let status = rule.status;
  let summary = rule.summary;
  let nextAction = rule.nextAction;
  const modelStatus = rule.exactModelCheckRequired ? "unknown" : "not-required";

  if (rule.exactModelCheckRequired) {
    status = "unknown";
    const model = input.equipmentModel?.trim();
    summary = model
      ? `${rule.summary} HomeNet Fit has not independently verified ${model} against the provider's address- and tier-aware database.`
      : `${rule.summary} No exact model was provided or independently verified.`;
  }

  if (input.hasVoice && providerId === "xfinity" && input.scenario !== "own-router") {
    requirements.push("The exact modem or gateway must be listed for Xfinity Voice, not only Internet service.");
  }

  if (input.hasVoice && ["spectrum", "cox"].includes(provider.providerId) && input.scenario !== "own-router") {
    status = "unknown";
    requirements.push("This rule does not verify customer-owned equipment for provider voice service.");
    nextAction = "Confirm the voice-service equipment path with the provider before changing the modem or gateway.";
  }

  if (input.hasTv && providerId !== "tmobile-home-internet") {
    status = "unknown";
    requirements.push("This rule does not verify provider TV equipment or managed-TV feature dependencies.");
    nextAction = "Confirm the TV-service topology with the provider before changing the gateway or router.";
  }

  const resultSources = rule.sourceIds
    .map((sourceId) => sources.find((source) => source.sourceId === sourceId))
    .filter((source): source is SourceRecord => Boolean(source));

  return {
    status,
    scenarioStatus: rule.status,
    modelStatus,
    providerId,
    providerName: provider.name,
    summary,
    requirements,
    lostFeatures: [...rule.lostFeatures],
    nextAction,
    sources: resultSources,
    lastVerified: rule.lastVerified,
    nextReview: rule.nextReview,
    confidence: status === "unknown" ? "low" : rule.confidence,
  };
}
