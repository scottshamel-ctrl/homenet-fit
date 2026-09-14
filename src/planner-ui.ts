import type { IspScenario } from "../lib/contracts";
import { formatRate } from "../lib/bottleneck";
import { planWholeNetwork } from "../lib/planner";
import { byId, escapeHtml, rateFrom, revealResult, sourceList, statusChip, stringList } from "./ui";

const form = byId<HTMLFormElement>("planner-form");
const result = byId<HTMLElement>("planner-result");
const panels = [...document.querySelectorAll<HTMLElement>("[data-step-panel]")];
const dots = [...document.querySelectorAll<HTMLElement>("[data-step-dot]")];
const scenario = byId<HTMLSelectElement>("planner-scenario");
const modelField = byId<HTMLElement>("planner-model-field");
let step = 1;

function syncFields(): void {
  modelField.hidden = scenario.value === "own-router";
}

function showStep(next: number): void {
  step = Math.max(1, Math.min(3, next));
  panels.forEach((panel) => { panel.hidden = Number(panel.dataset.stepPanel) !== step; });
  dots.forEach((dot) => {
    if (Number(dot.dataset.stepDot) === step) dot.setAttribute("aria-current", "step");
    else dot.removeAttribute("aria-current");
  });
  byId<HTMLElement>("step-label").textContent = `Step ${step} of 3`;
}

function run(focus = true): void {
  const checked = planWholeNetwork({
    provider: byId<HTMLSelectElement>("planner-provider").value,
    scenario: scenario.value as IspScenario,
    equipmentModel: byId<HTMLInputElement>("planner-model").value,
    hasVoice: byId<HTMLInputElement>("planner-voice").checked,
    hasTv: byId<HTMLInputElement>("planner-tv").checked,
    planMbps: Number(byId<HTMLInputElement>("planner-speed").value),
    components: [
      { id: "gateway", label: "Gateway LAN port", ceilingMbps: rateFrom("planner-gateway") },
      { id: "router", label: "Router LAN port", ceilingMbps: rateFrom("planner-router") },
      { id: "link", label: "Wired or wireless device link", ceilingMbps: rateFrom("planner-link") },
      { id: "client", label: "Client network interface", ceilingMbps: rateFrom("planner-client") },
    ],
  });
  const path = checked.path.map((stage) => `<div class="path-node status-${stage.status}"><strong>${escapeHtml(stage.label)}</strong><span>${escapeHtml(stage.detail)}</span></div>`).join("");
  revealResult(result, `
    <div class="result-head">
      ${statusChip(checked.status)}
      <h2>${escapeHtml(checked.verdict)}</h2>
      <p>${escapeHtml(checked.meaning)}</p>
    </div>
    <section class="result-section"><h3>Your network path</h3><div class="network-path">${path}</div></section>
    <section class="result-section"><div class="action-box"><strong>Cheapest useful next action</strong>${escapeHtml(checked.cheapestAction)}</div></section>
    <section class="result-section">
      <dl class="metric-grid">
        <div class="metric"><dt>Plan tier</dt><dd>${formatRate(checked.bottleneck.planMbps)}</dd></div>
        <div class="metric"><dt>Path ceiling</dt><dd>${formatRate(checked.bottleneck.verifiedCeilingMbps)}</dd></div>
        <div class="metric"><dt>Confidence</dt><dd>${escapeHtml(checked.confidence)}</dd></div>
      </dl>
    </section>
    <section class="result-section"><h3>First issue</h3><p>${escapeHtml(checked.firstIssue)}</p></section>
    <section class="result-section"><h3>Assumptions</h3>${stringList(checked.assumptions)}</section>
    <section class="result-section"><h3>Provider evidence</h3>${sourceList(checked.isp.sources)}</section>
  `, focus);
}

document.querySelectorAll<HTMLButtonElement>("[data-next]").forEach((button) => button.addEventListener("click", () => showStep(step + 1)));
document.querySelectorAll<HTMLButtonElement>("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(step - 1)));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});
form.addEventListener("reset", () => setTimeout(() => { showStep(1); syncFields(); run(false); }));
scenario.addEventListener("change", syncFields);
syncFields();
showStep(1);
run(false);
