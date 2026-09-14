import { findBottleneck, formatRate } from "../lib/bottleneck";
import { byId, escapeHtml, rateFrom, revealResult, statusChip, stringList } from "./ui";

const form = byId<HTMLFormElement>("bottleneck-form");
const result = byId<HTMLElement>("bottleneck-result");
const switchPresent = byId<HTMLInputElement>("switch-present");
const switchField = byId<HTMLElement>("switch-field");

function syncSwitch(): void {
  switchField.hidden = !switchPresent.checked;
}

function run(focus = true): void {
  const planMbps = Number(byId<HTMLInputElement>("plan-speed").value);
  const checked = findBottleneck({
    planMbps,
    components: [
      { id: "gateway-wan", label: "Gateway WAN / service handoff", ceilingMbps: rateFrom("gateway-wan") },
      { id: "gateway", label: "Gateway LAN port", ceilingMbps: rateFrom("gateway-lan") },
      { id: "router-wan", label: "Router WAN port", ceilingMbps: rateFrom("router-wan") },
      { id: "router", label: "Router LAN port", ceilingMbps: rateFrom("router-lan") },
      { id: "switch", label: "Switch port", ceilingMbps: switchPresent.checked ? rateFrom("switch-rate") : null, required: switchPresent.checked },
      { id: "link", label: "Ethernet, Wi-Fi, or access-point link", ceilingMbps: rateFrom("link-rate") },
      { id: "client", label: "Client network interface", ceilingMbps: rateFrom("client-rate") },
    ],
  });

  if (checked.errors.length) {
    revealResult(result, `<div class="error-summary" role="alert"><strong>Fix these inputs</strong>${stringList(checked.errors)}</div>`, focus);
    return;
  }

  const rows = checked.components.map((component) => `<li class="component-row"><strong>${escapeHtml(component.label)}</strong>${statusChip(component.status)}<p>${escapeHtml(component.reason)}</p></li>`).join("");
  revealResult(result, `
    <div class="result-head">
      ${statusChip(checked.status, checked.status === "compatible" ? "Path supports tier" : checked.status === "conditional" ? "Bottleneck found" : "Evidence missing")}
      <h2>${checked.status === "compatible" ? "No entered link caps the plan." : checked.status === "conditional" ? `${escapeHtml(checked.limiter?.label ?? "A link")} caps this path.` : "One link still needs a rate."}</h2>
      <p>${escapeHtml(checked.explanation)}</p>
    </div>
    <section class="result-section" aria-label="Key values">
      <dl class="metric-grid">
        <div class="metric"><dt>Internet tier</dt><dd>${formatRate(checked.planMbps)}</dd></div>
        <div class="metric"><dt>Verified ceiling</dt><dd>${formatRate(checked.verifiedCeilingMbps)}</dd></div>
        <div class="metric"><dt>Unknown links</dt><dd>${checked.unknownComponents.length}</dd></div>
      </dl>
    </section>
    <section class="result-section"><div class="action-box"><strong>Do this first</strong>${escapeHtml(checked.nextAction)}</div></section>
    <section class="result-section"><h3>Path breakdown</h3><ul class="component-list">${rows}</ul></section>
    <section class="result-section"><h3>Test without guessing</h3>${stringList(checked.testSteps)}</section>
    <section class="result-section"><p class="form-note">Line-rate capacity is not a promised speed. HomeNet Fit never remotely scans your network.</p></section>
  `, focus);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    syncSwitch();
    run(false);
  });
});

switchPresent.addEventListener("change", syncSwitch);
syncSwitch();
run(false);
