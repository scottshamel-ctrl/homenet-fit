import { formatRate } from "../lib/bottleneck";
import { cableLabel, checkEthernetLink } from "../lib/ethernet";
import type { CableCategory } from "../lib/contracts";
import { byId, escapeHtml, rateFrom, revealResult, sourceList, statusChip, stringList } from "./ui";

const form = byId<HTMLFormElement>("ethernet-form");
const result = byId<HTMLElement>("ethernet-result");
const adapterPresent = byId<HTMLInputElement>("adapter-present");
const adapterField = byId<HTMLElement>("adapter-field");
const observedKnown = byId<HTMLInputElement>("observed-known");
const observedField = byId<HTMLElement>("observed-field");

function syncFields(): void {
  adapterField.hidden = !adapterPresent.checked;
  observedField.hidden = !observedKnown.checked;
}

function numberOrNull(id: string): number | null {
  const raw = byId<HTMLInputElement>(id).value.trim();
  return raw === "" ? null : Number(raw);
}

const chipLabel: Record<string, string> = {
  compatible: "Supports the rate",
  conditional: "Below the target",
  incompatible: "Out of specification",
  unknown: "Evidence missing",
};

const headline: Record<string, string> = {
  compatible: "This link supports the rate you asked for.",
  conditional: "Something is holding this link back.",
  incompatible: "The run itself is longer than the standard allows.",
  unknown: "The ceiling cannot be set yet.",
};

function run(focus = true): void {
  const checked = checkEthernetLink({
    targetMbps: Number(byId<HTMLInputElement>("ethernet-target").value),
    cableCategory: byId<HTMLSelectElement>("cable-category").value as CableCategory,
    lengthMeters: numberOrNull("cable-length"),
    portARate: rateFrom("port-a"),
    portBRate: rateFrom("port-b"),
    adapterRate: adapterPresent.checked ? rateFrom("adapter-rate") : null,
    negotiatedMbps: observedKnown.checked ? rateFrom("observed-rate") : null,
  });

  if (checked.errors.length) {
    revealResult(result, `<div class="error-summary" role="alert"><strong>Fix these inputs</strong>${stringList(checked.errors)}</div>`, focus);
    return;
  }

  const title = checked.negotiationGap
    ? "This link is negotiating below its own capability."
    : checked.status === "conditional" && checked.limiter
      ? `${escapeHtml(checked.limiter.label)} sets the ceiling.`
      : headline[checked.status];

  revealResult(result, `
    <div class="result-head">
      ${statusChip(checked.status, chipLabel[checked.status])}
      <h2>${title}</h2>
      <p>${escapeHtml(checked.explanation)}</p>
    </div>
    <section class="result-section" aria-label="Key values">
      <dl class="metric-grid">
        <div class="metric"><dt>Target rate</dt><dd>${formatRate(checked.targetMbps)}</dd></div>
        <div class="metric"><dt>Expected ceiling</dt><dd>${formatRate(checked.expectedCeilingMbps)}</dd></div>
        <div class="metric"><dt>Reported link</dt><dd>${formatRate(checked.negotiatedMbps)}</dd></div>
      </dl>
    </section>
    <section class="result-section"><div class="action-box"><strong>Do this first</strong>${escapeHtml(checked.actions[0] ?? "Record the reported link rate before changing anything.")}</div></section>
    <section class="result-section"><h3>Cable rating</h3><p>${statusChip(checked.cableStatus, `${cableLabel(byId<HTMLSelectElement>("cable-category").value as CableCategory)} · ${formatRate(checked.cableCeilingMbps)}`)}</p><p>${escapeHtml(checked.cableNote)}</p></section>
    ${checked.causes.length ? `<section class="result-section"><h3>${checked.negotiationGap ? "What usually causes this" : "Why"}</h3>${stringList(checked.causes)}</section>` : ""}
    ${checked.actions.length > 1 ? `<section class="result-section"><h3>Work through these in order</h3><ol class="ordered-steps">${checked.actions.slice(1).map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ol></section>` : ""}
    <section class="result-section"><h3>Test without guessing</h3>${stringList(checked.testSteps)}</section>
    ${checked.assumptions.length ? `<section class="result-section"><h3>Assumptions used</h3>${stringList(checked.assumptions)}</section>` : ""}
    <section class="result-section"><h3>Evidence</h3>${sourceList(checked.sources)}</section>
    <section class="result-section"><p class="form-note">Confidence: ${escapeHtml(checked.confidence)}. Line rate is interface capacity, not a measured file-transfer speed.</p></section>
  `, focus);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});
form.addEventListener("reset", () => setTimeout(() => { syncFields(); run(false); }));
adapterPresent.addEventListener("change", () => { syncFields(); run(false); });
observedKnown.addEventListener("change", () => { syncFields(); run(false); });
syncFields();
run(false);
