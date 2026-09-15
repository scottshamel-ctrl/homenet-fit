import { checkMesh, listMeshFamilies, meshRelationshipLabels } from "../lib/mesh";
import { byId, escapeHtml, revealResult, sourceList, statusChip, stringList } from "./ui";

const form = byId<HTMLFormElement>("mesh-form");
const result = byId<HTMLElement>("mesh-result");
const mainSelect = byId<HTMLSelectElement>("mesh-main");
const addedSelect = byId<HTMLSelectElement>("mesh-added");
const seriesField = byId<HTMLElement>("series-field");

const meshChipLabel: Record<string, string> = {
  compatible: "One mesh",
  conditional: "Conditions apply",
  incompatible: "Separate systems",
  unknown: "Evidence missing",
};

const seriesFamilies = new Set(
  listMeshFamilies().filter((family) => family.mixPolicy === "same-series").map((family) => family.familyId),
);

function syncFields(): void {
  const sameFamily = mainSelect.value === addedSelect.value;
  seriesField.hidden = !(sameFamily && seriesFamilies.has(mainSelect.value));
}

function run(focus = true): void {
  const check = checkMesh({
    mainFamily: mainSelect.value,
    addedFamily: addedSelect.value,
    sameSeries: (seriesField.hidden ? "yes" : byId<HTMLSelectElement>("mesh-series").value) as "yes" | "no" | "unsure",
    wiredBackhaul: byId<HTMLInputElement>("mesh-wired").checked,
  });

  revealResult(result, `
    <div class="result-head">
      ${statusChip(check.status, meshChipLabel[check.status])}
      <h2>${escapeHtml(check.headline)}</h2>
      <p>${escapeHtml(check.summary)}</p>
    </div>
    <section class="result-section"><div class="action-box"><strong>Do this first</strong>${escapeHtml(check.nextAction)}</div></section>
    <section class="result-section"><h3>Result</h3><ul class="component-list"><li class="component-row pair"><strong>Running the network</strong><p>${escapeHtml(check.mainFamilyName)}</p></li><li class="component-row pair"><strong>Being added</strong><p>${escapeHtml(check.addedFamilyName)}</p></li><li class="component-row pair"><strong>Arrangement</strong><p>${escapeHtml(meshRelationshipLabels[check.relationship])}</p></li></ul></section>
    ${check.conditions.length ? `<section class="result-section"><h3>Conditions</h3>${stringList(check.conditions)}</section>` : ""}
    ${check.setupPath.length ? `<section class="result-section"><h3>Setup order</h3><ol class="ordered-steps">${check.setupPath.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section>` : ""}
    ${check.lostFeatures.length ? `<section class="result-section"><h3>What you give up</h3>${stringList(check.lostFeatures)}</section>` : ""}
    ${check.warnings.length ? `<section class="result-section"><h3>Check before you buy</h3>${stringList(check.warnings)}</section>` : ""}
    <section class="result-section"><h3>If the pairing does not work</h3><p>${escapeHtml(check.fallback)}</p></section>
    <section class="result-section"><h3>Evidence</h3>${sourceList(check.sources)}</section>
    <section class="result-section"><p class="form-note">Confidence: ${escapeHtml(check.confidence)}${check.lastVerified ? ` · Manufacturer records verified ${escapeHtml(check.lastVerified)}` : ""}. Mesh support changes with firmware; confirm the exact model numbers on the manufacturer's own page before spending money.</p></section>
  `, focus);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  run();
});
form.addEventListener("reset", () => setTimeout(() => { syncFields(); run(false); }));
mainSelect.addEventListener("change", () => { syncFields(); run(false); });
addedSelect.addEventListener("change", () => { syncFields(); run(false); });
syncFields();
run(false);
