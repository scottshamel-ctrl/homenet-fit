import { checkIsp } from "../lib/isp-checker";
import type { IspScenario } from "../lib/contracts";
import { byId, escapeHtml, revealResult, sourceList, statusChip, stringList } from "./ui";

const form = byId<HTMLFormElement>("isp-form");
const result = byId<HTMLElement>("isp-result");
const provider = byId<HTMLSelectElement>("isp-provider");
const scenario = byId<HTMLSelectElement>("isp-scenario");
const modelField = byId<HTMLElement>("model-field");

function syncFields(): void {
  modelField.hidden = scenario.value === "own-router";
}

function run(focus = true): void {
  const checked = checkIsp({
    provider: provider.value,
    scenario: scenario.value as IspScenario,
    equipmentModel: byId<HTMLInputElement>("equipment-model").value,
    hasVoice: byId<HTMLInputElement>("has-voice").checked,
    hasTv: byId<HTMLInputElement>("has-tv").checked,
  });
  const topLabel = checked.status === "compatible" ? "Supported arrangement" : checked.status === "conditional" ? "Works with conditions" : checked.status === "incompatible" ? "Provider device required" : "Manual check required";
  revealResult(result, `
    <div class="result-head">
      ${statusChip(checked.status, topLabel)}
      <h2>${escapeHtml(checked.providerName)}: ${escapeHtml(topLabel)}</h2>
      <p>${escapeHtml(checked.summary)}</p>
    </div>
    <section class="result-section"><div class="action-box"><strong>Do this first</strong>${escapeHtml(checked.nextAction)}</div></section>
    <section class="result-section"><h3>Requirements</h3>${stringList(checked.requirements)}</section>
    ${checked.lostFeatures.length ? `<section class="result-section"><h3>Features or controls that may change</h3>${stringList(checked.lostFeatures)}</section>` : ""}
    <section class="result-section"><h3>Evidence</h3>${sourceList(checked.sources)}</section>
    <section class="result-section"><p class="form-note">Policy status: ${escapeHtml(checked.scenarioStatus)} · Exact-model status: ${escapeHtml(checked.modelStatus)} · Confidence: ${escapeHtml(checked.confidence)}${checked.lastVerified ? ` · Verified ${escapeHtml(checked.lastVerified)}` : ""}</p></section>
  `, focus);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});
form.addEventListener("reset", () => setTimeout(() => { syncFields(); run(false); }));
provider.addEventListener("change", () => run(false));
scenario.addEventListener("change", () => { syncFields(); run(false); });
syncFields();
run(false);
