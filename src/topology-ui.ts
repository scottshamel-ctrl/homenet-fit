import { planTopology } from "../lib/topology";
import type { BridgeSupport, OwnDeviceKind } from "../lib/contracts";
import { byId, escapeHtml, revealResult, sourceList, statusChip, stringList } from "./ui";

const form = byId<HTMLFormElement>("topology-form");
const result = byId<HTMLElement>("topology-result");
const keepsGateway = byId<HTMLInputElement>("keeps-gateway");
const bridgeField = byId<HTMLElement>("bridge-field");

const planChipLabel: Record<string, string> = {
  compatible: "Supported plan",
  conditional: "Conditions apply",
  incompatible: "Not supported",
  unknown: "Evidence missing",
};

const doubleNatLabel: Record<string, string> = {
  avoided: "Double NAT avoided",
  reduced: "Double NAT reduced, not removed",
  present: "Double NAT present by choice",
  unknown: "Double NAT status unknown",
};

function syncFields(): void {
  bridgeField.hidden = !keepsGateway.checked;
}

function run(focus = true): void {
  const plan = planTopology({
    provider: byId<HTMLSelectElement>("topology-provider").value,
    ownDevice: byId<HTMLSelectElement>("own-device").value as OwnDeviceKind,
    keepsProviderGateway: keepsGateway.checked,
    bridgeSupport: (keepsGateway.checked ? byId<HTMLSelectElement>("bridge-support").value : "unknown") as BridgeSupport,
    hasVoice: byId<HTMLInputElement>("topology-voice").checked,
    hasTv: byId<HTMLInputElement>("topology-tv").checked,
    needsRouterFeatures: byId<HTMLInputElement>("needs-features").checked,
  });

  const roles = plan.roles.length
    ? `<section class="result-section"><h3>Who does what</h3><ul class="component-list">${plan.roles.map((role) => `<li class="component-row pair"><strong>${escapeHtml(role.device)}</strong><p>${escapeHtml(role.role)}</p></li>`).join("")}</ul></section>`
    : "";
  const path = plan.cablePath.length
    ? `<section class="result-section"><h3>Cable path</h3><ol class="ordered-steps">${plan.cablePath.map((hop) => `<li>${escapeHtml(hop)}</li>`).join("")}</ol></section>`
    : "";

  revealResult(result, `
    <div class="result-head">
      ${statusChip(plan.status, planChipLabel[plan.status])}
      <h2>${escapeHtml(plan.planName)}</h2>
      <p>${escapeHtml(plan.summary)}</p>
    </div>
    <section class="result-section"><div class="action-box"><strong>Do this first</strong>${escapeHtml(plan.nextAction)}</div></section>
    <section class="result-section"><h3>${escapeHtml(doubleNatLabel[plan.doubleNat])}</h3><p>${escapeHtml(plan.doubleNatNote)}</p></section>
    ${roles}
    ${path}
    <section class="result-section"><h3>Setup order</h3><ol class="ordered-steps">${plan.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section>
    ${plan.tradeoffs.length ? `<section class="result-section"><h3>What you give up</h3>${stringList(plan.tradeoffs)}</section>` : ""}
    ${plan.warnings.length ? `<section class="result-section"><h3>Check before you change modes</h3>${stringList(plan.warnings)}</section>` : ""}
    ${plan.providerNote ? `<section class="result-section"><h3>Provider record</h3><p>${escapeHtml(plan.providerNote)}</p></section>` : ""}
    <section class="result-section"><h3>Evidence</h3>${sourceList(plan.sources)}</section>
    <section class="result-section"><p class="form-note">Confidence: ${escapeHtml(plan.confidence)}${plan.lastVerified ? ` · Gateway records verified ${escapeHtml(plan.lastVerified)}` : ""}. Device menus differ by model and firmware; use the linked official instructions for the exact steps.</p></section>
  `, focus);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});
form.addEventListener("reset", () => setTimeout(() => { syncFields(); run(false); }));
keepsGateway.addEventListener("change", () => { syncFields(); run(false); });
syncFields();
run(false);
