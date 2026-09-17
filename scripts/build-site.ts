#!/usr/bin/env bun
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sourcesJson from "../data/sources.json";
import {
  ANALYTICS,
  BUILD_MODE,
  contentSecurityPolicy,
  escapeHtml,
  layout,
  pageCards,
  robots,
  sitemap,
  statusChip,
  type PageSpec,
} from "../lib/render";
import type { SourceRecord } from "../lib/contracts";
import { listProviders } from "../lib/isp-checker";
import { listMeshFamilies } from "../lib/mesh";

const root = join(import.meta.dir, "..");
const out = join(root, "site");
const updated = "2026-09-14";
const sources = sourcesJson.sources as SourceRecord[];

const homeCrumb = [{ href: "/", label: "Home" }];
const toolCrumb = [...homeCrumb, { href: "/tools/", label: "Tools" }];
const guideCrumb = [...homeCrumb, { href: "/guides/", label: "Guides" }];

function rateOptions(selected: number | "unknown"): string {
  const options: Array<[string, string]> = [
    ["unknown", "Unknown — keep result honest"],
    ["100", "100 Mbps"],
    ["1000", "1 Gbps"],
    ["2500", "2.5 Gbps"],
    ["5000", "5 Gbps"],
    ["10000", "10 Gbps"],
  ];
  return options.map(([value, label]) => `<option value="${value}"${String(selected) === value ? " selected" : ""}>${label}</option>`).join("");
}

function providerOptions(): string {
  const labels: Record<string, string> = {
    xfinity: "Xfinity cable",
    "att-fiber": "AT&T Fiber",
    "tmobile-home-internet": "T-Mobile Home Internet",
    spectrum: "Spectrum cable",
    cox: "Cox cable",
    "verizon-fios": "Verizon Fios",
  };
  return `${listProviders().map((provider) => `<option value="${provider.providerId}">${labels[provider.providerId] ?? escapeHtml(provider.name)}</option>`).join("")}<option value="other">Another provider — returns unknown</option>`;
}

function meshFamilyOptions(selected: string): string {
  return listMeshFamilies()
    .map((family) => `<option value="${family.familyId}"${family.familyId === selected ? " selected" : ""}>${escapeHtml(family.name)}</option>`)
    .join("");
}

function sourceCards(selected = sources): string {
  return `<ul class="source-list">${selected.map((source) => `<li><a href="${source.url}">${escapeHtml(source.title)}</a><small>${escapeHtml(source.publisher)} · Retrieved ${source.retrieved} · Next review ${source.nextReview}</small><p>${escapeHtml(source.evidenceNote)}</p></li>`).join("")}</ul>`;
}

function guideSources(sourceIds: string[]): string {
  const selected = sourceIds.map((sourceId) => sources.find((source) => source.sourceId === sourceId)).filter((source): source is SourceRecord => Boolean(source));
  return `<h2>Official sources reviewed</h2><p>Policy details can change. These records were checked on September 14, 2026; use the linked provider page for the final pre-purchase or activation check.</p>${sourceCards(selected)}`;
}

function related(items: Array<{ href: string; title: string; text: string }>): string {
  return `<section><div class="section-intro"><div><span class="eyebrow">Continue the check</span><h2>Related tools and guides</h2></div></div>${pageCards(items.map((item) => ({ ...item, eyebrow: "Related", action: "Open" })))}</section>`;
}

const home: PageSpec = {
  path: "/",
  title: "HomeNet Fit — Home Network Compatibility and Bottleneck Tools",
  description: "Check whether your ISP, gateway, router, mesh, wiring, and devices fit together. Find the first real bottleneck before buying hardware.",
  h1: "Find what works together.",
  bodyOwnsHeading: true,
  pageClass: "home-page",
  updated,
  body: `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Home-network decision tools</span>
        <h1>Find what works together.</h1>
        <p class="lede">Check your ISP, internet tier, gateway, router, mesh, wiring, and device as one connected path. Find the first real limit before you buy anything.</p>
        <div class="button-row"><a class="button" href="/tools/network-compatibility-planner/">Check my network <span aria-hidden="true">→</span></a><a class="button button-secondary" href="/tools/internet-plan-bottleneck-finder/">Find my bottleneck</a></div>
        <ul class="micro-proof"><li>Runs in your browser</li><li>Sources and dates shown</li><li>Unknown beats a guess</li></ul>
      </div>
      <div class="hero-preview" aria-label="Example network path">
        <p class="preview-kicker">Example · 1.2 Gbps plan</p>
        <div class="network-path">
          <div class="path-node status-compatible"><strong>ISP plan</strong><span>1.2 Gbps</span></div>
          <div class="path-node status-compatible"><strong>Gateway</strong><span>2.5 GbE</span></div>
          <div class="path-node status-conditional"><strong>Router LAN</strong><span>1 GbE</span></div>
          <div class="path-node status-compatible"><strong>Wired link</strong><span>2.5 GbE</span></div>
          <div class="path-node status-conditional"><strong>Desktop</strong><span>1 GbE</span></div>
        </div>
        ${statusChip("conditional", "Bottleneck found")}
        <p class="preview-verdict">Your network works. This device tops out at a 1 Gbps link.</p>
        <p class="preview-action"><strong>Buy nothing yet.</strong> A faster router only helps this desktop after its 1 GbE interface changes too.</p>
      </div>
    </section>
    <section>
      <div class="section-intro"><div><span class="eyebrow">Six decisions</span><h2>Start with the answer you need.</h2></div><p>Each tool shares the same rules. No conflicting calculators.</p></div>
      ${pageCards([
        { href: "/tools/network-compatibility-planner/", eyebrow: "Tool 1", title: "Will my setup work together?", text: "Check the full path from provider to client and get one prioritized next action.", action: "Check my network" },
        { href: "/tools/internet-plan-bottleneck-finder/", eyebrow: "Tool 2", title: "What is slowing this device down?", text: "Compare every entered port and link rate to the internet tier without fake Wi-Fi precision.", action: "Find the limiter" },
        { href: "/tools/isp-equipment-checker/", eyebrow: "Tool 3", title: "Can I use my own equipment?", text: "Check source-backed provider rules and see when an exact model still needs manual approval.", action: "Check ISP rules" },
        { href: "/tools/ethernet-link-checker/", eyebrow: "Tool 4", title: "Will this cable carry the speed?", text: "Check one run against its ports and adapters, and tell a real ceiling from a negotiation fault.", action: "Check a link" },
        { href: "/tools/router-topology-planner/", eyebrow: "Tool 5", title: "Bridge mode, AP mode, or neither?", text: "Pick the arrangement your provider supports and see which router features it costs you.", action: "Plan topology" },
        { href: "/tools/mesh-compatibility-checker/", eyebrow: "Tool 6", title: "Can I add this mesh to that one?", text: "Check the manufacturer's own pairing rule, and get the arrangement that still works when they will not mesh.", action: "Check a pairing" },
      ])}
    </section>
    <section>
      <div class="section-intro"><div><span class="eyebrow">How it decides</span><h2>Evidence first. Cheapest fix next.</h2></div></div>
      <div class="principles">
        <div class="principle"><b>01</b><h3>Build the whole path</h3><p>A fast plan does not make every port, cable, access point, or client equally fast.</p></div>
        <div class="principle"><b>02</b><h3>Stop at the first limit</h3><p>The lowest verified required link sets the capability ceiling. Missing evidence stays unknown.</p></div>
        <div class="principle"><b>03</b><h3>Change only what helps</h3><p>Keep beats configure, configure beats add, and add beats replace when the useful outcome is equal.</p></div>
      </div>
    </section>
    <section>
      <div class="section-intro"><div><span class="eyebrow">Evidence coverage</span><h2>Six provider systems, clearly bounded.</h2></div><p>Xfinity, Spectrum, Cox, AT&amp;T Fiber, Verizon Fios, and T-Mobile Home Internet. Other providers return unknown.</p></div>
      <div class="callout"><p><strong>Exact model approval is not inferred.</strong> Cable-modem checks point to each provider's current device list. Fiber and fixed-wireless rules retain the ONT or supplied gateway where official guidance requires it.</p></div>
    </section>
  `,
};

const toolsIndex: PageSpec = {
  path: "/tools/",
  title: "Home Network Tools — HomeNet Fit",
  description: "Use six connected tools to check home-network compatibility, internet-plan bottlenecks, ISP equipment rules, Ethernet link rates, router topology, and mesh pairing.",
  h1: "Home-network tools",
  lede: "Six tools share one decision model: provider rules first, verified path capacity second, cheapest useful action last.",
  crumbs: homeCrumb,
  updated,
  body: pageCards([
    { href: "/tools/network-compatibility-planner/", eyebrow: "Tool 1", title: "Whole-Network Compatibility Planner", text: "Compose ISP requirements and link ceilings into one network-path verdict.", action: "Open planner" },
    { href: "/tools/internet-plan-bottleneck-finder/", eyebrow: "Tool 2", title: "Internet-Plan Bottleneck Finder", text: "Locate the first link that prevents a device from using the full plan tier.", action: "Find bottleneck" },
    { href: "/tools/isp-equipment-checker/", eyebrow: "Tool 3", title: "ISP Equipment Checker", text: "Check whether customer-owned equipment is supported, conditional, or requires manual verification.", action: "Check equipment" },
    { href: "/tools/ethernet-link-checker/", eyebrow: "Tool 4", title: "Ethernet Link Checker", text: "Check one cable run, both ports, and any adapter against 1, 2.5, 5, or 10 Gbps.", action: "Check a link" },
    { href: "/tools/router-topology-planner/", eyebrow: "Tool 5", title: "Router Topology Planner", text: "Choose between bridge mode, access-point mode, passthrough, or one router, and see what each costs.", action: "Plan topology" },
    { href: "/tools/mesh-compatibility-checker/", eyebrow: "Tool 6", title: "Mesh Compatibility Checker", text: "Check whether two mesh systems form one network, and what the fallback arrangement removes.", action: "Check a pairing" },
  ], "h2"),
};

const plannerPage: PageSpec = {
  path: "/tools/network-compatibility-planner/",
  title: "Home Network Compatibility Checker and Upgrade Planner — HomeNet Fit",
  description: "Check an ISP, gateway, router, connection, and client as one path. See what fits, the first issue, and the cheapest useful next action.",
  h1: "Will your whole network work together?",
  lede: "Enter provider rules and link rates you can verify. HomeNet Fit will preserve unknowns, identify the first issue, and avoid replacement advice that cannot help.",
  crumbs: toolCrumb,
  modules: ["/assets/planner-ui.js"],
  updated,
  body: `
    <div class="tool-shell">
      <form class="panel tool-form" id="planner-form" novalidate>
        <div class="stepper" aria-label="Progress"><span class="step-dot" data-step-dot="1" aria-current="step">1</span><i class="step-line"></i><span class="step-dot" data-step-dot="2">2</span><i class="step-line"></i><span class="step-dot" data-step-dot="3">3</span><span class="form-note" id="step-label">Step 1 of 3</span></div>
        <section class="step-panel" data-step-panel="1">
          <fieldset><legend>Provider and equipment plan</legend>
            <div class="field"><label for="planner-provider">Internet provider</label><select id="planner-provider">${providerOptions()}</select></div>
            <div class="field"><label for="planner-scenario">Customer-owned equipment</label><select id="planner-scenario"><option value="own-router">My own router or mesh</option><option value="own-modem">My own modem or gateway</option><option value="both">My own modem and router</option></select></div>
            <div class="field" id="planner-model-field" hidden><label for="planner-model">Exact modem or gateway model <span class="form-note">(optional)</span></label><input id="planner-model" autocomplete="off" placeholder="Example: brand and model from label"><small>A typed model is never treated as approved unless a maintained record supports it.</small></div>
            <label class="check-row"><input id="planner-voice" type="checkbox">I also have provider voice service</label>
            <label class="check-row"><input id="planner-tv" type="checkbox">I also have provider TV service</label>
          </fieldset>
          <div class="form-actions"><button type="button" data-next>Next: internet tier</button></div>
        </section>
        <section class="step-panel" data-step-panel="2" hidden>
          <fieldset><legend>Internet tier and core ports</legend>
            <div class="field"><label for="planner-speed">Advertised download tier</label><input id="planner-speed" type="number" value="1200" min="1" max="100000" inputmode="decimal"><small>Mbps. Enter 1000 for 1 Gbps or 2000 for 2 Gbps.</small></div>
            <div class="field-row">
              <div class="field"><label for="planner-gateway">Gateway LAN port</label><select id="planner-gateway">${rateOptions(2500)}</select></div>
              <div class="field"><label for="planner-router">Router LAN port</label><select id="planner-router">${rateOptions(1000)}</select></div>
            </div>
          </fieldset>
          <div class="form-actions"><button class="secondary" type="button" data-back>Back</button><button type="button" data-next>Next: device path</button></div>
        </section>
        <section class="step-panel" data-step-panel="3" hidden>
          <fieldset><legend>Link to the device</legend>
            <div class="field"><label for="planner-link">Wired or wireless link rate</label><select id="planner-link">${rateOptions(2500)}</select><small>For Wi-Fi, use the negotiated link rate shown by the device—not the router's combined marketing number.</small></div>
            <div class="field"><label for="planner-client">Client network interface</label><select id="planner-client">${rateOptions(1000)}</select></div>
          </fieldset>
          <div class="form-actions"><button class="secondary" type="button" data-back>Back</button><button type="submit">Check this path</button></div>
          <button class="secondary button-block" type="reset">Reset example</button>
        </section>
      </form>
      <section class="panel tool-result" id="planner-result" aria-live="polite" aria-label="Network compatibility result"><div class="result-empty"><div><span class="empty-icon">→</span><strong>Complete three short steps.</strong><p>The result will show a five-link path, first issue, confidence, and next action.</p></div></div></section>
    </div>
    <article class="prose">
      <h2>What this planner checks</h2><p>The planner combines two independent decisions. First, the ISP rule checks whether the customer-owned equipment arrangement is supported. Second, the bottleneck engine compares required link rates. A provider failure stops the path. Missing approval or rate evidence stays unknown.</p>
      <h2>How to read the result</h2><p><strong>Compatible</strong> means every entered requirement passes. <strong>Conditional</strong> means the setup works only with a stated mode or carries less than the full tier. <strong>Incompatible</strong> means a required provider or equipment rule fails. <strong>Unknown</strong> means a safe answer needs more evidence.</p>
      <h2>Worked example</h2><p>A 1.2 Gbps plan feeds a gateway with a 2.5 GbE LAN port, then a router and desktop with 1 GbE interfaces. The network works, but the verified line-rate ceiling is 1 Gbps. Replacing only the gateway cannot improve that device because two later links still share the lower rate.</p>
      <div class="callout"><p><strong>Not a remote scan:</strong> this tool uses only the values you enter. It does not read your IP address, router settings, SSID, passwords, or traffic.</p></div>
    </article>
    ${related([
      { href: "/tools/internet-plan-bottleneck-finder/", title: "Internet-Plan Bottleneck Finder", text: "Inspect more ports and an optional switch." },
      { href: "/tools/isp-equipment-checker/", title: "ISP Equipment Checker", text: "Review the provider rule and sources separately." },
      { href: "/guides/home-network-upgrade-order/", title: "Home-network upgrade order", text: "Test and change equipment in dependency order." },
    ])}
  `,
};

const bottleneckPage: PageSpec = {
  path: "/tools/internet-plan-bottleneck-finder/",
  title: "Internet Plan and Network Bottleneck Finder — HomeNet Fit",
  description: "Compare gateway, router, switch, link, and client rates to find the first verified home-network bottleneck.",
  h1: "Find the first link limiting your internet tier.",
  lede: "This checks interface capacity across the path. It does not promise application throughput or pretend to measure Wi-Fi remotely.",
  crumbs: toolCrumb,
  modules: ["/assets/bottleneck-ui.js"],
  updated,
  body: `
    <div class="tool-shell">
      <form class="panel tool-form" id="bottleneck-form" novalidate>
        <fieldset><legend>Internet tier</legend><div class="field"><label for="plan-speed">Advertised download speed</label><input id="plan-speed" type="number" min="1" max="100000" value="2000" inputmode="decimal"><small>Mbps. Use 2000 for a 2 Gbps tier.</small></div></fieldset>
        <fieldset><legend>Provider handoff and gateway</legend><div class="field-row"><div class="field"><label for="gateway-wan">Service / WAN handoff</label><select id="gateway-wan">${rateOptions(2500)}</select></div><div class="field"><label for="gateway-lan">Gateway LAN port</label><select id="gateway-lan">${rateOptions(2500)}</select></div></div></fieldset>
        <fieldset><legend>Router and switch</legend><div class="field-row"><div class="field"><label for="router-wan">Router WAN port</label><select id="router-wan">${rateOptions(2500)}</select></div><div class="field"><label for="router-lan">Router LAN port</label><select id="router-lan">${rateOptions(1000)}</select></div></div><label class="check-row"><input id="switch-present" type="checkbox">This device path passes through a switch</label><div class="field" id="switch-field" hidden><label for="switch-rate">Switch port</label><select id="switch-rate">${rateOptions(1000)}</select></div></fieldset>
        <fieldset><legend>Final device link</legend><div class="field-row"><div class="field"><label for="link-rate">Cable, Wi-Fi, or access-point link</label><select id="link-rate">${rateOptions(2500)}</select></div><div class="field"><label for="client-rate">Client interface</label><select id="client-rate">${rateOptions(1000)}</select></div></div></fieldset>
        <div class="form-actions"><button type="submit">Find bottleneck</button><button type="reset" class="secondary">Reset</button></div>
      </form>
      <section class="panel tool-result" id="bottleneck-result" aria-live="polite" aria-label="Bottleneck result"><div class="result-empty"><div><span class="empty-icon">↓</span><strong>Enter every required link.</strong><p>Choose Unknown instead of guessing at a port or negotiated rate.</p></div></div></section>
    </div>
    <article class="prose">
      <h2>What the number means</h2><p>The lowest supported or negotiated rate in a required path sets its line-rate ceiling. A 2.5 Gbps plan connected through a 1 GbE router LAN port cannot deliver more than that 1 GbE link to the selected device. Real file transfers and speed tests are lower because protocols and conditions add overhead.</p>
      <h2>Use negotiated rates when possible</h2><p>A cable label is only one condition. The two ports, adapter, cable, and negotiation result all matter. If a supposedly gigabit path negotiates at 100 Mbps, inspect the link before replacing the router.</p>
      <h2>Wi-Fi boundary</h2><p>Wi-Fi generation names and combined antenna totals do not produce a reliable room-level speed prediction. Enter a device-reported link rate only as an observation. Repeat the check at the same location and compare with a wired control test.</p>
    </article>
    ${related([
      { href: "/guides/wan-lan-port-speeds/", title: "WAN and LAN port speeds", text: "Read the labels that determine a multi-gig path." },
      { href: "/guides/router-for-multigig-plan/", title: "Router for a multi-gig plan", text: "Map the ports required before shopping." },
      { href: "/tools/network-compatibility-planner/", title: "Whole-Network Planner", text: "Add provider compatibility to this speed path." },
    ])}
  `,
};

const ispPage: PageSpec = {
  path: "/tools/isp-equipment-checker/",
  title: "ISP Modem and Own-Router Compatibility Checker — HomeNet Fit",
  description: "Check customer-owned modem, gateway, router, and mesh rules for six major U.S. internet provider systems.",
  h1: "Can you use your own modem, router, or mesh?",
  lede: "Provider policy and exact-model approval are separate layers. This checker names both instead of turning a generic policy into a false model approval.",
  crumbs: toolCrumb,
  modules: ["/assets/isp-ui.js"],
  updated,
  body: `
    <div class="tool-shell">
      <form class="panel tool-form" id="isp-form" novalidate>
        <fieldset><legend>Provider and equipment</legend>
          <div class="field"><label for="isp-provider">Internet provider</label><select id="isp-provider">${providerOptions()}</select></div>
          <div class="field"><label for="isp-scenario">What do you want to use?</label><select id="isp-scenario"><option value="own-router">My own router or mesh</option><option value="own-modem">My own modem or gateway</option><option value="both">My own modem and router</option></select></div>
          <div class="field" id="model-field" hidden><label for="equipment-model">Exact modem or gateway model</label><input id="equipment-model" autocomplete="off" placeholder="Brand and model from the device label"><small>A typed model still requires a maintained approval record or provider check.</small></div>
          <label class="check-row"><input id="has-voice" type="checkbox">Provider voice service is active</label>
          <label class="check-row"><input id="has-tv" type="checkbox">Provider TV service is active</label>
        </fieldset>
        <div class="form-actions"><button type="submit">Check provider rule</button><button type="reset" class="secondary">Reset</button></div>
      </form>
      <section class="panel tool-result" id="isp-result" aria-live="polite" aria-label="ISP equipment result"><div class="result-empty"><div><span class="empty-icon">?</span><strong>Provider rule first.</strong><p>The result separates the allowed arrangement from exact-model approval.</p></div></div></section>
    </div>
    <article class="prose">
      <h2>Why “allowed” does not mean “this model is approved”</h2><p>A provider may allow customer-owned equipment while still limiting exact modem models by network, address, service tier, voice support, or hardware revision. HomeNet Fit returns unknown when it lacks that exact current record. The official source link remains part of the result.</p>
      <h2>Current provider coverage</h2><table><thead><tr><th>Provider</th><th>Reviewed arrangements</th><th>Important boundary</th></tr></thead><tbody><tr><td data-label="Provider">Xfinity cable</td><td data-label="Reviewed arrangements">Own modem, own router, or both</td><td data-label="Important boundary">Exact modem approval remains address- and tier-aware.</td></tr><tr><td data-label="Provider">Spectrum cable</td><td data-label="Reviewed arrangements">Own modem, own router, or both</td><td data-label="Important boundary">Exact modem approval remains list- and tier-aware.</td></tr><tr><td data-label="Provider">Cox cable</td><td data-label="Reviewed arrangements">Own modem, own router, or both</td><td data-label="Important boundary">Exact modem approval remains model- and tier-aware.</td></tr><tr><td data-label="Provider">AT&amp;T Fiber</td><td data-label="Reviewed arrangements">Required gateway with downstream router</td><td data-label="Important boundary">A third-party modem does not replace the AT&amp;T gateway.</td></tr><tr><td data-label="Provider">Verizon Fios</td><td data-label="Reviewed arrangements">ONT with customer router; TV conditions</td><td data-label="Important boundary">A modem does not replace the Verizon ONT.</td></tr><tr><td data-label="Provider">T-Mobile Home Internet</td><td data-label="Reviewed arrangements">Required gateway with downstream router or Wi-Fi 6 mesh</td><td data-label="Important boundary">The gateway does not provide bridge mode.</td></tr></tbody></table>
      <div class="callout"><p><strong>Other ISP selected?</strong> The result is unknown by design. A future provider is added only with an official source, reviewed rule, dates, and fixtures.</p></div>
    </article>
    ${related([
      { href: "/guides/approved-modem-lists/", title: "How to read approved-modem lists", text: "Check tier, address, service, and revision details." },
      { href: "/guides/use-your-own-router/", title: "Use your own router", text: "Separate modem approval from downstream topology." },
      { href: "/tools/network-compatibility-planner/", title: "Whole-Network Planner", text: "Combine the provider rule with real link rates." },
    ])}
  `,
};

const ethernetPage: PageSpec = {
  path: "/tools/ethernet-link-checker/",
  title: "Ethernet Cable and Port Link Speed Checker — HomeNet Fit",
  description: "Check whether a Cat5e, Cat6, or Cat6a run plus its ports and adapters can carry 1, 2.5, 5, or 10 Gbps, and why a link negotiated low.",
  h1: "Does this Ethernet run actually carry the speed?",
  lede: "Cable category is one condition out of several. This checks the whole segment—cable, both ports, any adapter—and separates a real ceiling from a link that negotiated below its own capability.",
  crumbs: toolCrumb,
  modules: ["/assets/ethernet-ui.js"],
  updated,
  body: `
    <div class="tool-shell">
      <form class="panel tool-form" id="ethernet-form" novalidate>
        <fieldset><legend>What you want from this link</legend><div class="field"><label for="ethernet-target">Target link rate</label><select id="ethernet-target"><option value="1000">1 Gbps</option><option value="2500" selected>2.5 Gbps</option><option value="5000">5 Gbps</option><option value="10000">10 Gbps</option></select></div></fieldset>
        <fieldset><legend>The cable run</legend>
          <div class="field-row">
            <div class="field"><label for="cable-category">Printed category</label><select id="cable-category"><option value="cat5">Cat5</option><option value="cat5e" selected>Cat5e</option><option value="cat6">Cat6</option><option value="cat6a">Cat6a</option><option value="unknown">Unlabeled or unsure</option></select><small>Read the printing along the jacket, not the packaging.</small></div>
            <div class="field"><label for="cable-length">Run length <span class="form-note">(optional)</span></label><input id="cable-length" type="number" min="1" max="500" inputmode="decimal" placeholder="Metres"><small>Leave blank if the run is clearly under 100 m.</small></div>
          </div>
        </fieldset>
        <fieldset><legend>Both ends</legend>
          <div class="field-row">
            <div class="field"><label for="port-a">Router or switch port</label><select id="port-a">${rateOptions(2500)}</select></div>
            <div class="field"><label for="port-b">Device network interface</label><select id="port-b">${rateOptions(2500)}</select></div>
          </div>
          <label class="check-row"><input id="adapter-present" type="checkbox">A USB adapter, dock, or media converter is in this path</label>
          <div class="field" id="adapter-field" hidden><label for="adapter-rate">Adapter or dock rate</label><select id="adapter-rate">${rateOptions(1000)}</select></div>
        </fieldset>
        <fieldset><legend>What the link reports now</legend>
          <label class="check-row"><input id="observed-known" type="checkbox">I can see the negotiated link rate</label>
          <div class="field" id="observed-field" hidden><label for="observed-rate">Reported link rate</label><select id="observed-rate">${rateOptions(1000)}</select><small>Use the rate the operating system or switch reports for this port, not a speed-test number.</small></div>
        </fieldset>
        <div class="form-actions"><button type="submit">Check this link</button><button type="reset" class="secondary">Reset</button></div>
      </form>
      <section class="panel tool-result" id="ethernet-result" aria-live="polite" aria-label="Ethernet link result"><div class="result-empty"><div><span class="empty-icon">⇄</span><strong>Describe one segment at a time.</strong><p>One cable, the port at each end, and any adapter between them.</p></div></div></section>
    </div>
    <article class="prose">
      <h2>Why the cable is rarely the whole answer</h2><p>A category rating is a promise about the cable under a defined installation. It says nothing about the port at either end, the adapter in the middle, or whether all four pairs survived the last time someone pulled the run through a wall. A gigabit-rated cable paired with a 100 Mbps port produces a 100 Mbps link, and the cable is blameless.</p>
      <h2>What the categories actually carry</h2><p>The approved IEEE 802.3 objectives define 2.5 Gb/s over Cat5e up to at least 100 m, and 5 Gb/s over Cat6 at the same distance. 5 Gb/s on Cat5e exists only for defined deployments, so this tool does not hand you that as a verified ceiling. 10 Gb/s over Cat6 is specified as a distance-limited case between 55 m and 100 m, which is why a Cat6 run is not a dependable 10G path and Cat6a is.</p>
      <table><thead><tr><th>Cable</th><th>Verified ceiling here</th><th>Condition worth knowing</th></tr></thead><tbody><tr><td data-label="Cable">Cat5</td><td data-label="Verified ceiling here">100 Mbps</td><td data-label="Condition worth knowing">Gigabit often negotiates on a short run, but it is not a rated outcome.</td></tr><tr><td data-label="Cable">Cat5e</td><td data-label="Verified ceiling here">2.5 Gbps</td><td data-label="Condition worth knowing">5 Gbps is defined only for specific deployments, not for any Cat5e run.</td></tr><tr><td data-label="Cable">Cat6</td><td data-label="Verified ceiling here">5 Gbps</td><td data-label="Condition worth knowing">10 Gbps is a 55 m to 100 m distance-limited case.</td></tr><tr><td data-label="Cable">Cat6a</td><td data-label="Verified ceiling here">10 Gbps</td><td data-label="Condition worth knowing">Rated for the full 100 m, which is why it is the safe choice for new runs.</td></tr></tbody></table>
      <h2>The 100 Mbps tell</h2><p>If a path that should reach a gigabit reports 100 Mbps, suspect the wiring before the hardware. Gigabit needs all four pairs; 100BASE-TX needs two. A single broken conductor, a badly punched keystone, or a staple through the jacket drops the link exactly one tier and keeps working, which is what makes it so easy to misdiagnose as a slow router.</p>
      <h2>Worked example</h2><p>A 2.5 Gbps plan, a 2.5 GbE router port, a 2.5 GbE desktop card, and a 12 m Cat5e run should negotiate 2.5 Gbps. If it reports 1 Gbps instead, the cable is not the suspect: one end is probably advertising only gigabit, or the run passes through a dock that tops out there. Reseating and a known-good patch cable settle it in two minutes, for nothing.</p>
      <div class="callout"><p><strong>Nothing is measured here.</strong> This tool evaluates what you type. It never scans your network, reads your adapter, or tests a cable remotely.</p></div>
    </article>
    ${related([
      { href: "/guides/ethernet-cable-categories/", title: "Cable categories without the marketing", text: "What each category is rated to do, and where the limits bite." },
      { href: "/guides/ethernet-negotiated-100mbps/", title: "Why a gigabit link negotiates at 100 Mbps", text: "Find the fault instead of replacing working hardware." },
      { href: "/guides/usb-dock-ethernet-limits/", title: "USB docks and adapter limits", text: "When the host port, not the cable, sets the ceiling." },
      { href: "/tools/internet-plan-bottleneck-finder/", title: "Internet-Plan Bottleneck Finder", text: "Put this segment back into the full path to your plan." },
    ])}
  `,
};

const topologyPage: PageSpec = {
  path: "/tools/router-topology-planner/",
  title: "Bridge Mode, AP Mode, and Double NAT Decision Tool — HomeNet Fit",
  description: "Decide whether your router belongs in bridge mode, access-point mode, or behind the ISP gateway, and what each choice costs you.",
  h1: "Bridge mode, AP mode, or leave it alone?",
  lede: "Two routers in one home is a decision, not an accident. This picks the arrangement your provider actually supports and names what each one takes away.",
  crumbs: toolCrumb,
  modules: ["/assets/topology-ui.js"],
  updated,
  body: `
    <div class="tool-shell">
      <form class="panel tool-form" id="topology-form" novalidate>
        <fieldset><legend>Your provider and hardware</legend>
          <div class="field"><label for="topology-provider">Internet provider</label><select id="topology-provider">${providerOptions()}</select></div>
          <div class="field"><label for="own-device">What you own</label><select id="own-device"><option value="router">A router</option><option value="mesh">A mesh system</option></select></div>
          <label class="check-row"><input id="keeps-gateway" type="checkbox" checked>The provider gateway stays in the path</label>
          <div class="field" id="bridge-field"><label for="bridge-support">Does that gateway offer bridge mode?</label><select id="bridge-support"><option value="unknown" selected>I have not checked</option><option value="yes">Yes, I found the setting</option><option value="no">No, there is no bridge option</option></select></div>
        </fieldset>
        <fieldset><legend>What the network has to keep doing</legend>
          <label class="check-row"><input id="needs-features" type="checkbox" checked>I need my own router's features: port forwarding, VPN, parental controls, or a guest network</label>
          <label class="check-row"><input id="topology-voice" type="checkbox">Provider voice service is active</label>
          <label class="check-row"><input id="topology-tv" type="checkbox">Provider TV service is active</label>
        </fieldset>
        <div class="form-actions"><button type="submit">Plan the topology</button><button type="reset" class="secondary">Reset</button></div>
      </form>
      <section class="panel tool-result" id="topology-result" aria-live="polite" aria-label="Topology plan"><div class="result-empty"><div><span class="empty-icon">⇢</span><strong>One routing authority, where possible.</strong><p>The plan names each device's job, the cable order, and the features you lose.</p></div></div></section>
    </div>
    <article class="prose">
      <h2>What double NAT is, in one paragraph</h2><p>Network address translation lets many devices share one public address. When a retail router sits behind an ISP gateway that is also routing, translation happens twice. Outbound browsing survives that fine, which is why it goes unnoticed for months. Inbound connections do not: port forwarding has to be configured on both devices to work at all, and some consoles, remote-access tools, and self-hosted services simply report a problem and stop.</p>
      <h2>The four arrangements</h2><p><strong>One router only.</strong> An approved customer-owned modem or a direct ONT handoff removes the provider's routing device entirely. Simplest result, fewest surprises.</p><p><strong>Gateway in bridge mode.</strong> The gateway stops routing and hands the connection to your router, which keeps every feature you paid for. This is the documented fix when the provider supports it.</p><p><strong>Passthrough.</strong> Where a gateway is required and cannot bridge, some providers hand the public address to one downstream device. It removes most of the symptoms without removing the layer, so it is worth naming honestly rather than calling it a bridge.</p><p><strong>Access-point mode.</strong> The gateway keeps routing and your hardware provides Wi-Fi and switching only. NAT happens once. The cost is real: guest networks, site blocking, VPN service, and remote management stop working on a device in AP mode.</p>
      <h2>Choosing between the last two</h2><p>The question is not which is technically purer. It is whether you need the features your own router loses. If you run a VPN service or depend on parental controls, AP mode takes those away and no setting brings them back. If you only added the hardware for coverage, AP mode is the cleaner answer and costs you nothing you were using.</p>
      <h2>Before you change a mode</h2><p>Provider voice and TV services often depend on the gateway continuing to behave the way it does now. Bridging or bypassing it can take a phone line or a set-top feature with it. Confirm that path first—this tool marks those combinations as unverified rather than guessing on your behalf.</p>
      <div class="callout"><p><strong>Menus differ by model.</strong> The plan tells you which mode to use and in what order; use the linked official instructions for the exact screens on your hardware.</p></div>
    </article>
    ${related([
      { href: "/guides/double-nat-explained/", title: "Double NAT, and when it actually matters", text: "Which symptoms are real and which are folklore." },
      { href: "/guides/bridge-mode-vs-ap-mode/", title: "Bridge mode vs. access-point mode", text: "Same goal, different costs. Pick on features, not vocabulary." },
      { href: "/tools/isp-equipment-checker/", title: "ISP Equipment Checker", text: "Confirm the provider rule before you change any mode." },
    ])}
  `,
};

const meshPage: PageSpec = {
  path: "/tools/mesh-compatibility-checker/",
  title: "Mesh Wi-Fi Compatibility Checker — HomeNet Fit",
  description: "Check whether two mesh systems or a router and a satellite can form one network, and what to do when they cannot.",
  h1: "Can these two mesh systems work together?",
  lede: "Mixing mesh hardware works inside a system and almost never across systems. This checks the manufacturer's own rule for the pair you have, and names the arrangement that still works when the answer is no.",
  crumbs: toolCrumb,
  modules: ["/assets/mesh-ui.js"],
  updated,
  body: `
    <div class="tool-shell">
      <form class="panel tool-form" id="mesh-form" novalidate>
        <fieldset><legend>The two systems</legend>
          <div class="field"><label for="mesh-main">System running the network now</label><select id="mesh-main">${meshFamilyOptions("eero")}</select></div>
          <div class="field"><label for="mesh-added">System you want to add</label><select id="mesh-added">${meshFamilyOptions("tp-link-deco")}</select></div>
          <div class="field" id="series-field" hidden><label for="mesh-series">Are both units from the same series?</label><select id="mesh-series"><option value="unsure" selected>I have not checked the model numbers</option><option value="yes">Yes, the series matches</option><option value="no">No, the series differs</option></select><small>Read the model number from the label on the base of each unit.</small></div>
        </fieldset>
        <fieldset><legend>How they would connect</legend>
          <label class="check-row"><input id="mesh-wired" type="checkbox">I can run Ethernet between the two locations</label>
        </fieldset>
        <div class="form-actions"><button type="submit">Check the pairing</button><button type="reset" class="secondary">Reset</button></div>
      </form>
      <section class="panel tool-result" id="mesh-result" aria-live="polite" aria-label="Mesh compatibility result"><div class="result-empty"><div><span class="empty-icon">◎</span><strong>One mesh, or two networks and one router.</strong><p>The result names the arrangement, the setup order, and what a mismatch costs.</p></div></div></section>
    </div>
    <article class="prose">
      <h2>Why brand almost always decides this</h2><p>A mesh system is not a standard. Each manufacturer built its own way for nodes to find each other, share a backhaul, pass a client between units, and report status to one app. Those mechanisms are not interoperable, so an eero and a Deco placed in the same house remain two separate networks no matter what you name the Wi-Fi. The exception is Wi-Fi CERTIFIED EasyMesh, which exists specifically to let multi-AP devices from different vendors run as one network, and only applies when both devices actually carry that certification.</p>
      <h2>Same brand is not the same as same system</h2><p>This is where most money gets wasted. Netgear sells Orbi satellites per series, and each satellite lists a matching series router under system requirements. Google's Nest Wifi Pro does not mesh with earlier Nest Wifi or Google Wifi units. TP-Link's Deco systems and its OneMesh routers are separate mechanisms. In each case both products carry a familiar brand, both say mesh on the box, and neither pairs with the other. Read the model number, not the logo.</p>
      <h2>The arrangement that always works</h2><p>When two systems cannot form one mesh, you still have a usable network: pick one system to own routing and connect it to the modem, gateway, or ONT, then set the other to access-point mode so only one device routes. You get coverage without double NAT. What you do not get is seamless roaming — a device leaving one network reconnects to the other, so a call can drop at the boundary — and the access point's own guest network, parental controls, and VPN service stop applying. Give the two networks different names so you can tell which one a device is on.</p>
      <h2>Wire it if you can</h2><p>Every mesh works better with a wired backhaul. Without a cable, the link between units shares airtime with the clients those units are meant to serve, and an older unit sitting between the main router and a weak room becomes the ceiling for everything behind it. If an Ethernet run is possible, that single cable usually does more than upgraded hardware.</p>
      <div class="callout"><p><strong>Firmware changes these answers.</strong> Manufacturers add and drop mesh support between releases. Confirm the exact model numbers on the manufacturer's current page before buying a second unit.</p></div>
    </article>
    ${related([
      { href: "/guides/mixing-mesh-brands/", title: "Mixing mesh brands", text: "What actually happens when two systems share a house." },
      { href: "/guides/easymesh-vs-proprietary-mesh/", title: "EasyMesh vs. proprietary mesh", text: "What the certification standardizes, and how to verify it." },
      { href: "/guides/mix-wifi-generations/", title: "Mixing Wi-Fi generations", text: "What an older client costs you, and what it does not." },
      { href: "/tools/router-topology-planner/", title: "Router Topology Planner", text: "Decide which device owns routing before you wire them together." },
    ])}
  `,
};

const categoryPages: PageSpec[] = [
  {
    path: "/compatibility/", title: "Home Network Compatibility — HomeNet Fit", description: "Check ISP equipment arrangements and the full path between provider, gateway, router, link, and client.", h1: "Compatibility", lede: "Compatibility is a relationship with conditions—not a product badge.", crumbs: homeCrumb, updated,
    body: pageCards([
      { href: "/tools/network-compatibility-planner/", eyebrow: "Full path", title: "Whole-Network Compatibility Planner", text: "Check five links and provider policy together.", action: "Open tool" },
      { href: "/tools/isp-equipment-checker/", eyebrow: "Provider", title: "ISP Equipment Checker", text: "Review customer-owned equipment rules and current sources.", action: "Open tool" },
      { href: "/tools/router-topology-planner/", eyebrow: "Topology", title: "Router Topology Planner", text: "Decide between bridge mode, AP mode, passthrough, or a single router.", action: "Open tool" },
      { href: "/guides/approved-modem-lists/", eyebrow: "Guide", title: "Approved modem lists", text: "Understand why provider, address, tier, and service options matter.", action: "Read guide" },
      { href: "/guides/bridge-mode-vs-ap-mode/", eyebrow: "Guide", title: "Bridge mode vs. AP mode", text: "Same goal, different cost. Compare what each mode removes.", action: "Read guide" },
      { href: "/tools/mesh-compatibility-checker/", eyebrow: "Mesh", title: "Mesh Compatibility Checker", text: "Check whether two mesh systems can form one network.", action: "Open tool" },
      { href: "/guides/mixing-mesh-brands/", eyebrow: "Guide", title: "Mixing mesh brands", text: "Why same-brand pairs still fail, and what works instead.", action: "Read guide" },
      { href: "/guides/easymesh-vs-proprietary-mesh/", eyebrow: "Guide", title: "EasyMesh vs. proprietary mesh", text: "What the certification covers, and how to check a model.", action: "Read guide" },
      { href: "/guides/mix-wifi-generations/", eyebrow: "Guide", title: "Mixing Wi-Fi generations", text: "What older clients cost you, and what 6 GHz really needs.", action: "Read guide" },
    ], "h2"),
  },
  {
    path: "/bottlenecks/", title: "Home Network Bottlenecks — HomeNet Fit", description: "Find which gateway, router, switch, cable, link, or client interface limits an internet plan.", h1: "Bottlenecks", lede: "The first low required link matters more than the fastest label elsewhere in the network.", crumbs: homeCrumb, updated,
    body: pageCards([
      { href: "/tools/internet-plan-bottleneck-finder/", eyebrow: "Tool", title: "Internet-Plan Bottleneck Finder", text: "Compare every required link against the plan tier.", action: "Open tool" },
      { href: "/guides/wan-lan-port-speeds/", eyebrow: "Guide", title: "WAN and LAN port speeds", text: "Read the port chain behind gigabit and multi-gig service.", action: "Read guide" },
      { href: "/tools/ethernet-link-checker/", eyebrow: "Tool", title: "Ethernet Link Checker", text: "Test one segment: cable, both ports, and any adapter.", action: "Open tool" },
      { href: "/guides/router-for-multigig-plan/", eyebrow: "Guide", title: "Router for a multi-gig plan", text: "Know which links need more than 1 GbE before buying.", action: "Read guide" },
      { href: "/guides/ethernet-negotiated-100mbps/", eyebrow: "Guide", title: "Stuck at 100 Mbps", text: "Find the fault before replacing working hardware.", action: "Read guide" },
      { href: "/guides/usb-dock-ethernet-limits/", eyebrow: "Guide", title: "USB dock and adapter limits", text: "Why a gigabit adapter runs at a third of its rating.", action: "Read guide" },
    ], "h2"),
  },
];

interface Guide {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  lede: string;
  body: string;
  sourceIds: string[];
}

const guides: Guide[] = [
  {
    slug: "modem-router-gateway",
    title: "Modem vs. Router vs. Gateway: Identify the Device That Controls What",
    seoTitle: "Modem vs. Router vs. Gateway — HomeNet Fit",
    description: "Identify a modem, router, gateway, mesh unit, and ONT before changing a home-network setup.",
    lede: "Start with roles, not product names. One box may perform several jobs.",
    sourceIds: ["att-gateway", "verizon-fios-ont"],
    body: `<h2>The four roles</h2><p>A <strong>modem</strong> converts a cable or legacy phone-line signal into an Ethernet service handoff. An <strong>ONT</strong> terminates fiber service. A <strong>router</strong> creates the boundary between the provider-facing connection and the home network, then handles routing, NAT, DHCP, and often firewall policy. A <strong>wireless access point</strong> supplies Wi-Fi. A gateway combines several of these roles in one provider or retail device.</p><h2>Why identification matters</h2><p>Replacing “the router” may accidentally replace a modem-router gateway that the provider must approve. Adding a second router behind a gateway may create <a href="/guides/double-nat-explained/">two routing layers</a>. Adding a mesh unit in access-point mode is different from asking it to become the only router.</p><h2>Read the physical path</h2><ol><li>Find the cable, fiber ONT, or fixed-wireless gateway where service enters.</li><li>Trace the Ethernet cable to the device providing routing.</li><li>Trace any switches, access points, mesh nodes, and adapters to the affected client.</li><li>Record exact labels and port rates before changing a mode.</li></ol><div class="callout"><p>Use the <a href="/tools/network-compatibility-planner/">whole-network planner</a> after each role is clear.</p></div>`,
  },
  {
    slug: "use-your-own-router",
    title: "Can You Use Your Own Router? Separate Permission From Topology",
    seoTitle: "Can You Use Your Own Router? — HomeNet Fit",
    description: "Decide whether a customer-owned router replaces provider equipment or operates behind a required gateway.",
    lede: "“Use my own router” can mean three different network arrangements.",
    sourceIds: ["xfinity-approved-equipment", "spectrum-router-handoff", "cox-own-equipment", "att-ip-passthrough", "tmobile-connect", "verizon-fios-agreement"],
    body: `<h2>Three arrangements</h2><p>The cleanest arrangement gives one device the routing role. On cable service, an approved modem can hand Ethernet directly to a customer router. On some fiber and fixed-wireless services, the provider gateway stays and a customer router connects downstream. A third option runs the customer device in <a href="/guides/bridge-mode-vs-ap-mode/">access-point mode</a> so the provider gateway remains the only router.</p><h2>Questions to answer first</h2><ul><li>Does the provider require its gateway for service authentication or delivery?</li><li>Does the gateway provide bridge mode, IP passthrough, or neither?</li><li>Do provider TV or voice services depend on its hardware?</li><li>Can every WAN and LAN port carry the purchased tier?</li><li>Which device should provide DHCP and routing?</li></ul><h2>Avoid buying before the role is clear</h2><p>A faster third-party router cannot replace a required provider gateway by itself. It may still improve controls, ports, Wi-Fi, or coverage when connected in a supported arrangement. The useful question is not only whether the router works, but which role it is allowed to own.</p><div class="callout"><p>Check the current provider rule in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>.</p></div>`,
  },
  {
    slug: "approved-modem-lists",
    title: "How to Read an ISP Approved-Modem List Without Buying the Wrong Model",
    seoTitle: "How to Read an ISP Approved-Modem List — HomeNet Fit",
    description: "Use ISP approved-device tools correctly by checking address, speed tier, voice service, model, and revision.",
    lede: "A brand name or DOCSIS label alone does not prove current provider approval.",
    sourceIds: ["xfinity-device-info", "spectrum-authorized-modems", "cox-certified-modems"],
    body: `<h2>Check the exact identity</h2><p>Match the full model number and any hardware revision printed on the device label. A nearby model in the same retail family is not evidence. Used provider-owned or prepaid equipment can also carry restrictions that a compatible retail model does not.</p><h2>Check the selected service</h2><p>Provider tools may filter by address, available tier, and voice support. A modem approved for a slower plan may not be recommended for a faster tier. A data-only cable modem does not become a voice device because the product family has another voice-capable version.</p><h2>Use the provider result as the final activation gate</h2><p>HomeNet Fit can explain the rule and preserve reviewed records, but a provider controls current activation eligibility. Save the official result and recheck immediately before purchase when the list is dynamic. Modem approval is also a separate question from <a href="/guides/use-your-own-router/">whether a customer-owned router is permitted</a>; one answer does not imply the other.</p><table><thead><tr><th>Layer</th><th>What must match</th></tr></thead><tbody><tr><td data-label="Layer">Provider</td><td data-label="What must match">Correct network and service area</td></tr><tr><td data-label="Layer">Service</td><td data-label="What must match">Tier, Internet, Voice, and other required features</td></tr><tr><td data-label="Layer">Hardware</td><td data-label="What must match">Exact model and revision</td></tr><tr><td data-label="Layer">Date</td><td data-label="What must match">Current result, not an old retail screenshot</td></tr></tbody></table><div class="callout"><p>The <a href="/tools/isp-equipment-checker/">ISP checker</a> returns unknown when this exact confirmation is missing.</p></div>`,
  },
  {
    slug: "router-for-multigig-plan",
    title: "What a Router Needs for a 1.2, 2, or 5 Gbps Internet Plan",
    seoTitle: "Router Requirements for Multi-Gig Internet — HomeNet Fit",
    description: "Map the WAN, LAN, switch, adapter, cable, and client links required to use a multi-gig internet tier.",
    lede: "A multi-gig WAN label is not enough. The useful path must stay multi-gig after the router too.",
    sourceIds: ["netgear-multigig-ports"],
    body: `<h2>Follow one device path</h2><p>The service handoff enters the router through its WAN port. Traffic then leaves through a LAN port or wireless radio, may cross a switch or access point, and ends at a client interface. The lowest required link limits that client.</p><h2>Common 1 GbE trap</h2><p>A router can advertise a 2.5 GbE <a href="/guides/wan-lan-port-speeds/">WAN port while providing only 1 GbE LAN ports</a>. That may distribute more than one gigabit across several clients, but no single wired client on a 1 GbE LAN port receives the entire faster tier. This is not automatically a problem; it depends on the goal.</p><h2>Before replacing anything</h2><ol><li>Name the client that actually needs more than one gigabit.</li><li>Check the gateway and router handoff.</li><li>Check the exact LAN port used.</li><li>Include switches, docks, USB adapters, and client NICs.</li><li>Decide whether aggregate household capacity already solves the real problem.</li></ol><div class="callout"><p>Enter the chain in the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a>.</p></div>`,
  },
  {
    slug: "wan-lan-port-speeds",
    title: "WAN vs. LAN Port Speeds: Find the Quiet 1 GbE Limit",
    seoTitle: "WAN vs. LAN Port Speeds — HomeNet Fit",
    description: "Understand WAN, LAN, switch, adapter, and client Ethernet port rates, then find the quiet 1 GbE limit in a faster home-network path.",
    lede: "The direction label and speed label answer different questions.",
    sourceIds: ["netgear-multigig-ports"],
    body: `<h2>WAN receives the upstream connection</h2><p>The router WAN port connects toward the modem, gateway, or ONT. It must carry the desired service handoff. A 100 Mbps WAN port clearly limits a gigabit plan; a 1 GbE WAN port similarly limits a faster multi-gig tier.</p><h2>LAN delivers service downstream</h2><p>LAN ports connect clients, switches, and access points. One multi-gig WAN port does not imply every LAN port is multi-gig. Read the device specification and the label beside the exact physical port.</p><h2>Negotiation can fall below the label</h2><p>Ethernet chooses a common rate between both endpoints across the installed cable. A damaged pair, incompatible adapter, power-saving setting, or lower-rate device can produce <a href="/guides/ethernet-negotiated-100mbps/">a 100 Mbps or 1 Gbps negotiated link</a> even when another component supports more.</p><table><thead><tr><th>Rate label</th><th>Planning meaning</th></tr></thead><tbody><tr><td data-label="Rate label">Fast Ethernet</td><td data-label="Planning meaning">100 Mbps line rate</td></tr><tr><td data-label="Rate label">Gigabit / 1 GbE</td><td data-label="Planning meaning">1,000 Mbps line rate</td></tr><tr><td data-label="Rate label">2.5 GbE</td><td data-label="Planning meaning">2,500 Mbps line rate</td></tr><tr><td data-label="Rate label">5 GbE</td><td data-label="Planning meaning">5,000 Mbps line rate</td></tr><tr><td data-label="Rate label">10 GbE</td><td data-label="Planning meaning">10,000 Mbps line rate</td></tr></tbody></table><div class="callout"><p>Compare the full path in the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a>.</p></div>`,
  },
  {
    slug: "home-network-upgrade-order",
    title: "Home Network Upgrade Order: Test Before You Replace",
    seoTitle: "Home Network Upgrade Order — HomeNet Fit",
    description: "Diagnose a home-network problem in dependency order and avoid upgrades blocked by an earlier limiter.",
    lede: "The cheapest useful change is often a test, setting, port, or cable—not a new router.",
    sourceIds: ["netgear-multigig-ports"],
    body: `<h2>1. Define one problem</h2><p>Name the affected device, place, application, and time. “My internet is slow” mixes provider outages, one wired link, Wi-Fi coverage, client limits, and remote-server behavior into one vague symptom.</p><h2>2. Establish a wired control</h2><p>Test a capable computer by Ethernet at the nearest useful upstream point. Confirm its negotiated rate. Repeat tests rather than treating one result as a guarantee.</p><h2>3. Add one link at a time</h2><p>Move through gateway, router, switch, cable, access point, and client. The first point where capability or observed behavior falls is more useful than the fastest label anywhere else.</p><h2>4. Apply the cheapest intervention order</h2><ol><li>Keep equipment that meets the need.</li><li>Correct a mode, port selection, firmware, or configuration.</li><li>Replace a damaged or <a href="/guides/ethernet-cable-categories/">lower-rate cable</a> or adapter.</li><li>Add a wired access point, switch, or backhaul only when the path requires it.</li><li>Replace the router, mesh, or gateway last, after proving it owns the limitation.</li></ol><div class="callout"><p>Build the sequence with the <a href="/tools/network-compatibility-planner/">whole-network planner</a>.</p></div>`,
  },
  {
    slug: "xfinity-owned-equipment",
    title: "Using Your Own Modem and Router With Xfinity",
    seoTitle: "Use Your Own Modem or Router With Xfinity — HomeNet Fit",
    description: "Separate Xfinity modem approval from router compatibility, speed-tier limits, Voice support, and gateway-only features.",
    lede: "Xfinity allows customer-owned equipment, but a general policy never approves a particular modem.",
    sourceIds: ["xfinity-approved-equipment", "xfinity-device-info"],
    body: `<h2>Direct answer</h2><p>You can use your own router with a supported Xfinity modem or gateway. You can also use your own cable modem, but only after Xfinity's current Device Info tool accepts the exact model for your address, internet tier, and services. HomeNet Fit therefore treats the router arrangement as supported and the modem model as unknown until that final check is completed.</p><h2>Choose the arrangement before the hardware</h2><table><thead><tr><th>Goal</th><th>Required path</th><th>Main condition</th></tr></thead><tbody><tr><td data-label="Goal">Own router only</td><td data-label="Required path">Xfinity gateway or approved modem → router WAN</td><td data-label="Main condition">Router ports must carry the chosen tier</td></tr><tr><td data-label="Goal">Own modem only</td><td data-label="Required path">Coax → approved retail modem or gateway</td><td data-label="Main condition">Exact model, address, tier, and services must match</td></tr><tr><td data-label="Goal">Own modem and router</td><td data-label="Required path">Coax → approved modem → router WAN</td><td data-label="Main condition">Modem approval comes first; then verify Ethernet rates</td></tr></tbody></table><h2>Why the model check comes first</h2><p>Retail packaging can say “works with Xfinity” while <a href="/guides/approved-modem-lists/">the provider's current database</a> applies a narrower answer. Speed tiers change. Voice service needs can differ from internet-only service. Model suffixes and hardware revisions can matter. A used unit can also create an activation problem even when the underlying model is supported. Match the complete label and use Xfinity's live result, not a retailer badge or an old screenshot.</p><h2>Then check the Ethernet path</h2><p>An approved modem does not prove the selected device can use the full plan. Follow the connection from the modem Ethernet port through the router WAN port, router LAN or Wi-Fi link, and client interface. A 1 GbE link can be the useful limit on a faster tier even when the modem is approved.</p><h2>Features that do not transfer</h2><p>Customer equipment does not automatically receive gateway-only management, security, hotspot, or hardware-upgrade features. That does not make the arrangement wrong; it means the ownership tradeoff belongs in the decision.</p><div class="callout"><p><strong>Next step:</strong> use the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a> for the policy result, then the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a> for the port path.</p></div>`,
  },
  {
    slug: "spectrum-owned-equipment",
    title: "Using Your Own Modem and Router With Spectrum",
    seoTitle: "Use Your Own Modem or Router With Spectrum — HomeNet Fit",
    description: "Check Spectrum's authorized-modem gate, customer-router handoff, tier limits, support boundary, and voice-service unknowns.",
    lede: "A customer router is straightforward; a customer modem still needs exact authorization.",
    sourceIds: ["spectrum-authorized-modems", "spectrum-router-handoff"],
    body: `<h2>Direct answer</h2><p>You can connect your own router directly to a Spectrum modem. You can use a retail cable modem only when Spectrum's current authorized list includes the exact model for the relevant service. HomeNet Fit does not convert “DOCSIS 3.1” or a retailer compatibility badge into approval.</p><h2>Separate the modem decision from the Wi-Fi decision</h2><p>Spectrum currently supplies modem and router functions as separate equipment in the arrangement reviewed here. That creates two independent choices: keep or replace the cable modem, then keep or replace the routing and Wi-Fi device. A customer router can connect to either an authorized customer modem or the Spectrum modem's Ethernet handoff.</p><table><thead><tr><th>Layer</th><th>Evidence needed</th><th>Safe result without it</th></tr></thead><tbody><tr><td data-label="Layer">Cable modem</td><td data-label="Evidence needed">Exact model on Spectrum's current authorized list</td><td data-label="Safe result without it">Unknown</td></tr><tr><td data-label="Layer">Internet tier</td><td data-label="Evidence needed">Model supports the selected tier at the address</td><td data-label="Safe result without it">Unknown</td></tr><tr><td data-label="Layer">Router</td><td data-label="Evidence needed">WAN/LAN rates and supported Ethernet handoff</td><td data-label="Safe result without it">Compatible or limited by ports</td></tr><tr><td data-label="Layer">Voice service</td><td data-label="Evidence needed">Current Spectrum voice-equipment path</td><td data-label="Safe result without it">Unknown</td></tr></tbody></table><h2>Avoid accidental double routing</h2><p>Connect the customer router WAN port to a modem-only Ethernet handoff. If a gateway or another router remains upstream, decide which device owns routing, NAT, and DHCP. Adding a second router without a defined topology can produce <a href="/guides/double-nat-explained/">double NAT</a> even when basic browsing still works.</p><h2>Check support expectations</h2><p>Spectrum can support its network and supplied equipment, while administration of a customer router remains the owner's responsibility. Record the original working cable path before replacing anything so it can be restored during troubleshooting.</p><div class="callout"><p><strong>Next step:</strong> check the arrangement in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>. Verify the exact modem on Spectrum's linked official page before spending money.</p></div>`,
  },
  {
    slug: "cox-owned-equipment",
    title: "Using Your Own Modem and Router With Cox Cable Internet",
    seoTitle: "Use Your Own Modem or Router With Cox — HomeNet Fit",
    description: "Check Cox cable-modem certification, speed-tier support, used-device activation, router handoff, and lost Panoramic WiFi features.",
    lede: "Cox permits retail cable equipment, but certification, tier, account status, and support still matter.",
    sourceIds: ["cox-own-equipment", "cox-certified-modems"],
    body: `<h2>Direct answer</h2><p>You can use your own cable modem with Cox when the exact model is currently certified for the network and selected speed tier. If that modem does not include routing and Wi-Fi, connect a separate customer-owned router. This page covers Cox cable service; it does not generalize the cable-modem rule to a Cox fiber handoff.</p><h2>Four checks before buying</h2><ol><li>Find the complete model number on Cox's certified-modem list, then <a href="/guides/approved-modem-lists/">read that list the way the provider filters it</a>.</li><li>Confirm that Cox lists it for the speed tier you intend to use.</li><li>For a used modem, confirm it is no longer attached to another account.</li><li>Check the modem Ethernet port, router WAN/LAN ports, and target client path against the tier.</li></ol><table><thead><tr><th>Question</th><th>Answer layer</th><th>HomeNet Fit state</th></tr></thead><tbody><tr><td data-label="Question">Does Cox permit retail cable modems?</td><td data-label="Answer layer">Provider policy</td><td data-label="HomeNet Fit state">Conditional</td></tr><tr><td data-label="Question">Is this exact modem approved?</td><td data-label="Answer layer">Current certified-device list</td><td data-label="HomeNet Fit state">Unknown until checked</td></tr><tr><td data-label="Question">Can a separate router be used?</td><td data-label="Answer layer">Ethernet topology</td><td data-label="HomeNet Fit state">Compatible behind supported modem</td></tr><tr><td data-label="Question">Will Cox support the retail router?</td><td data-label="Answer layer">Support boundary</td><td data-label="HomeNet Fit state">No provider equipment support assumed</td></tr></tbody></table><h2>Know what leaves with Panoramic WiFi</h2><p>Cox's current guidance ties Panoramic WiFi app management, Advanced Security, and its provider equipment upgrade commitment to the Panoramic service. Owning hardware may still be the right choice, but compare those operational features instead of treating rental cost as the only difference.</p><h2>Voice service remains a separate check</h2><p>The current local rule does not verify customer-owned voice equipment. If Cox Voice is active, preserve unknown and confirm the voice path directly with Cox before changing the modem or gateway.</p><div class="callout"><p><strong>Next step:</strong> run the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>, then enter every Ethernet link in the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a>.</p></div>`,
  },
  {
    slug: "att-fiber-own-router",
    title: "Using Your Own Router With AT&T Fiber",
    seoTitle: "Use Your Own Router With AT&T Fiber — HomeNet Fit",
    description: "Keep the required AT&T gateway, understand IP Passthrough, avoid duplicate routing, and verify multi-gig ports before adding a router.",
    lede: "Your router can operate downstream, but it does not replace the AT&T Fiber gateway.",
    sourceIds: ["att-gateway", "att-ip-passthrough"],
    body: `<h2>Direct answer</h2><p>You can use a customer-owned router behind the AT&T-provided gateway. The reviewed AT&T guidance does not support replacing that gateway with a retail modem or gateway. Supported BGW gateways document IP Passthrough for one downstream device when that is the intended topology.</p><h2>Pick one routing design</h2><table><thead><tr><th>Design</th><th>Routing owner</th><th>Main tradeoff</th></tr></thead><tbody><tr><td data-label="Design">AT&T gateway only</td><td data-label="Routing owner">AT&T gateway</td><td data-label="Main tradeoff">Simplest provider-supported path</td></tr><tr><td data-label="Design">Own router in access-point mode</td><td data-label="Routing owner">AT&T gateway</td><td data-label="Main tradeoff">Adds Wi-Fi or ports without moving routing</td></tr><tr><td data-label="Design">Own router with IP Passthrough</td><td data-label="Routing owner">Customer router for the downstream network</td><td data-label="Main tradeoff">Gateway stays in path; setup and support are split</td></tr><tr><td data-label="Design">Retail modem replaces gateway</td><td data-label="Routing owner">Unsupported proposal</td><td data-label="Main tradeoff">Incompatible with the reviewed rule</td></tr></tbody></table><h2>IP Passthrough is not physical removal</h2><p>IP Passthrough changes how the AT&T gateway assigns the public-facing address to one downstream device. The gateway remains connected to AT&T Fiber. Follow the procedure for the exact BGW model; do not use instructions for a nearby gateway or assume every firmware screen is identical.</p><h2>Check the ports after topology</h2><p>A correct mode can still leave a speed limit. For a multi-gig tier, verify the exact gateway LAN port used, the <a href="/guides/wan-lan-port-speeds/">customer router WAN port</a>, its downstream LAN or Wi-Fi path, and the client interface. Moving routing responsibility cannot make a 1 GbE port carry a 2 Gbps line rate.</p><h2>Make rollback easy</h2><p>Save the current gateway settings and cable positions. Change one layer at a time. If service fails, reconnect a client to the gateway and verify the provider path before debugging the customer router.</p><div class="callout"><p><strong>Next step:</strong> select AT&amp;T Fiber and “my own router” in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>, then model the downstream ports.</p></div>`,
  },
  {
    slug: "verizon-fios-own-router",
    title: "Using Your Own Router With Verizon Fios",
    seoTitle: "Use Your Own Router With Verizon Fios — HomeNet Fit",
    description: "Identify the Fios ONT and Ethernet handoff, remove the modem assumption, and preserve Verizon TV and managed-feature conditions.",
    lede: "Fios terminates at an ONT, not a cable modem; the router decision begins after that handoff.",
    sourceIds: ["verizon-fios-ont", "verizon-fios-install", "verizon-fios-agreement", "verizon-fios-tv-home"],
    body: `<h2>Direct answer</h2><p>A retail cable or DSL modem does not replace Verizon's Optical Network Terminal. A customer-owned router can use the ONT's provisioned Ethernet handoff, but the answer becomes conditional when Fios TV, Verizon extenders, parental controls, or other managed router features are part of the setup.</p><h2>Start at the ONT</h2><p>The <a href="/guides/modem-router-gateway/">ONT</a> converts the incoming fiber signal into service handoffs for data, TV, and voice. Keep it powered and installed. For a customer router, confirm that internet service is provisioned over the ONT Ethernet output and connect that cable to the router WAN port. Do not open or alter provider fiber equipment.</p><table><thead><tr><th>Service case</th><th>Customer router result</th><th>Required check</th></tr></thead><tbody><tr><td data-label="Service case">Internet with Ethernet ONT handoff</td><td data-label="Customer router result">Conditional</td><td data-label="Required check">WAN rate, DHCP handoff, and support boundary</td></tr><tr><td data-label="Service case">Fios TV set-top boxes or TV Home app</td><td data-label="Customer router result">Unknown until TV topology is checked</td><td data-label="Required check">Compatible Fios router and MoCA/streaming dependencies</td></tr><tr><td data-label="Service case">Verizon extender or managed controls</td><td data-label="Customer router result">Feature loss possible</td><td data-label="Required check">Exact Verizon router and extender requirements</td></tr><tr><td data-label="Service case">Retail modem replacing ONT</td><td data-label="Customer router result">Incompatible</td><td data-label="Required check">Keep the ONT</td></tr></tbody></table><h2>Why TV changes the answer</h2><p>Verizon's current agreement states that streaming through a Verizon set-top box requires a compatible Fios router. Its TV Home guidance also says non-Verizon routers cannot provide every app function and warns that some multiple-router arrangements can block streaming or automatic pairing. HomeNet Fit therefore returns unknown when TV is selected instead of approving an internet-only topology.</p><h2>Check rate and support separately</h2><p>A router may establish internet service yet still limit a faster tier through its WAN, LAN, switch, or client port. Verizon can verify the Fios handoff and its equipment; troubleshooting a third-party router remains separate.</p><div class="callout"><p><strong>Next step:</strong> use the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>. Select the TV option when applicable so the result does not hide that dependency.</p></div>`,
  },
  {
    slug: "tmobile-home-internet-mesh",
    title: "Using a Router or Mesh With T-Mobile Home Internet",
    seoTitle: "Router or Mesh With T-Mobile Home Internet — HomeNet Fit",
    description: "Keep the T-Mobile gateway, connect a router or Wi-Fi 6 mesh by Ethernet, and understand bridge-mode, NAT, and control limits.",
    lede: "A router or mesh can sit behind the gateway; it cannot turn the gateway into bridge mode.",
    sourceIds: ["tmobile-connect"],
    body: `<h2>Direct answer</h2><p>You can connect a third-party router or Wi-Fi 6 mesh system to the T-Mobile Home Internet gateway by Ethernet. You cannot replace the gateway with a retail modem, and T-Mobile's current guidance says the gateway does not offer bridge mode.</p><h2>Choose the downstream role</h2><table><thead><tr><th>Goal</th><th>Arrangement</th><th>Condition</th></tr></thead><tbody><tr><td data-label="Goal">Add coverage with minimal routing change</td><td data-label="Arrangement">Mesh or router in access-point mode</td><td data-label="Condition">Gateway remains the routing device</td></tr><tr><td data-label="Goal">Use customer-router controls</td><td data-label="Arrangement">Router WAN connected to gateway Ethernet</td><td data-label="Condition">T-Mobile gateway still routes; double NAT may remain</td></tr><tr><td data-label="Goal">Replace the T-Mobile gateway</td><td data-label="Arrangement">Retail modem or gateway</td><td data-label="Condition">Incompatible with the reviewed rule</td></tr><tr><td data-label="Goal">Bridge the T-Mobile gateway</td><td data-label="Arrangement">Bridge-mode request</td><td data-label="Condition">Not available in current official guidance</td></tr></tbody></table><h2>Double NAT is a condition, not an automatic failure</h2><p>Ordinary browsing and streaming may still work when both the T-Mobile gateway and downstream router <a href="/guides/double-nat-explained/">perform NAT</a>. Applications that need inbound connections, strict NAT behavior, or certain VPN and gaming arrangements may not. The site should describe that limitation without promising a setting the gateway does not expose.</p><h2>Reduce competing Wi-Fi when appropriate</h2><p>T-Mobile documents managing the gateway Wi-Fi through the T-Life app. If the downstream mesh provides the home's Wi-Fi, decide whether the gateway radio should remain active. Keep the gateway reachable for provider management and restore steps.</p><h2>Do not promise a speed from the mesh label</h2><p>Fixed-wireless conditions vary before traffic reaches the home network. A new mesh cannot fix tower load, signal quality, or a provider-side limit. Compare a wired gateway test with the downstream path before buying more nodes.</p><div class="callout"><p><strong>Next step:</strong> check the required gateway arrangement in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>, then use the <a href="/tools/network-compatibility-planner/">whole-network planner</a> to model the downstream path.</p></div>`,
  },
  {
    slug: "ethernet-cable-categories",
    title: "Cat5e vs. Cat6 vs. Cat6a: What Each Cable Is Actually Rated To Carry",
    seoTitle: "Cat5e vs Cat6 vs Cat6a Speed and Distance — HomeNet Fit",
    description: "Compare Cat5e, Cat6, and Cat6a against 1, 2.5, 5, and 10 Gbps using approved IEEE 802.3 objectives, including the distance limits retailers leave out.",
    lede: "The useful question is not which cable is newest. It is which rate each one is rated to carry, and for how far.",
    sourceIds: ["ieee-8023bz-objectives", "ieee-8023an-objectives", "netgear-multigig-ports"],
    body: `<h2>Direct answer</h2><p>For a home run of 100 m or less: Cat5e carries 2.5 Gbps, Cat6 carries 5 Gbps, and Cat6a carries 10 Gbps. Those are the rates defined in the approved IEEE 802.3 objectives, not vendor marketing. Anything above those numbers exists only as a distance-limited or deployment-specific case, which is a different kind of claim and worth treating differently.</p><h2>The rating table</h2><table><thead><tr><th>Cable</th><th>Rated to 100 m</th><th>The condition retailers skip</th></tr></thead><tbody><tr><td data-label="Cable">Cat5</td><td data-label="Rated to 100 m">100 Mbps</td><td data-label="The condition retailers skip">Gigabit frequently negotiates on a short Cat5 run. It is a happy accident, not a specification, so do not design around it.</td></tr><tr><td data-label="Cable">Cat5e</td><td data-label="Rated to 100 m">2.5 Gbps</td><td data-label="The condition retailers skip">5 Gbps over Cat5e is defined only for specific deployments and configurations, not for an arbitrary run inside a wall.</td></tr><tr><td data-label="Cable">Cat6</td><td data-label="Rated to 100 m">5 Gbps</td><td data-label="The condition retailers skip">10 Gbps over Cat6 is specified as a distance-limited case between 55 m and 100 m, depending on the installation.</td></tr><tr><td data-label="Cable">Cat6a</td><td data-label="Rated to 100 m">10 Gbps</td><td data-label="The condition retailers skip">None worth noting at home. This is why it is the default for a new permanent run.</td></tr></tbody></table><h2>Why the Cat5e already in your wall is probably fine</h2><p>The most common upgrade question is whether a 1.2 or 2 Gbps plan requires rewiring the house. Usually it does not. Cat5e is rated for 2.5 Gbps across a full 100 m run, which covers the majority of residential plans sold today. Replacing in-wall cable is the most expensive and most disruptive change available, and it is rarely the part actually limiting the link.</p><h2>When the cable is genuinely the problem</h2><ul><li><strong>The run exceeds 100 m.</strong> Every rate here depends on that channel limit. Split the run with a switch instead of buying a better cable.</li><li><strong>You are targeting 10 Gbps.</strong> Cat6 may or may not reach it depending on length; Cat6a removes the question.</li><li><strong>The cable is damaged.</strong> A pierced or crushed run loses pairs, and losing pairs drops the negotiated rate a full tier while the link keeps working.</li><li><strong>It is unlabeled.</strong> An unidentified cable has no rating, so treat the ceiling as unknown rather than assuming the best case.</li></ul><h2>What a category rating does not promise</h2><p>A cable rating describes the cable under a defined installation. It says nothing about the port at either end, the <a href="/guides/usb-dock-ethernet-limits/">USB adapter in the middle</a>, or the quality of the termination at the keystone. A Cat6a run into a 1 GbE laptop port is a 1 Gbps link, and the cable did nothing wrong. Multi-gig rates also require both ends to support and enable them: a port that advertises only gigabit settles at gigabit no matter what sits between it and the switch.</p><h2>Buying advice, briefly</h2><p>For a new permanent run inside walls, use Cat6a. Labour dominates the cost, and the cable is the part you cannot easily change later. For patch cables on a desk, buy the category that matches your target rate and nothing more; a shorter, well-made Cat6 patch cable beats a cheap Cat8 one. Shielding matters in industrial noise, not in a typical home, and shielded cable terminated without proper grounding can perform worse than unshielded.</p><div class="callout"><p><strong>Next step:</strong> enter the exact run, both ports, and any adapter in the <a href="/tools/ethernet-link-checker/">Ethernet link checker</a> to see which part sets the ceiling.</p></div>`,
  },
  {
    slug: "ethernet-negotiated-100mbps",
    title: "Why a Gigabit Connection Negotiates at 100 Mbps",
    seoTitle: "Ethernet Link Stuck at 100 Mbps — HomeNet Fit",
    description: "Diagnose an Ethernet link reporting 100 Mbps on gigabit hardware, from lost pairs and bad terminations to fixed-speed settings and USB docks.",
    lede: "A link that reports exactly 100 Mbps on gigabit hardware is a fault with a short list of causes. Work the list before buying anything.",
    sourceIds: ["ieee-8023bz-objectives", "netgear-multigig-ports"],
    body: `<h2>Direct answer</h2><p>Gigabit Ethernet needs all four twisted pairs. 100BASE-TX needs two. When a gigabit-capable path reports 100 Mbps, the most likely explanation is that two pairs stopped carrying signal: a broken conductor, a poorly punched keystone, a staple through the jacket, or a partially seated plug. The link still works, which is exactly what gets it misdiagnosed as a slow router or a bad ISP.</p><h2>Check in this order</h2><ol><li><strong>Reseat both ends.</strong> Unplug and firmly reconnect each connector, then read the reported link rate again. This costs nothing and resolves a meaningful share of cases.</li><li><strong>Substitute a known-good short patch cable</strong> between the same two ports. If the rate recovers, the permanent run or its terminations are the fault.</li><li><strong>Change ports.</strong> Move the device to a different port on the same switch or router to rule out one failed port.</li><li><strong>Check auto-negotiation.</strong> An interface pinned to a fixed speed and duplex, usually left over from an old troubleshooting session, forces the whole link down. Set both ends back to auto.</li><li><strong>Remove the dock.</strong> A USB adapter or docking station negotiates on its own terms and can cap the link below both ports. Test the machine's built-in port before blaming the wiring.</li><li><strong>Re-terminate or replace the run</strong> only once the tests above point at it.</li></ol><h2>Read the right number</h2><p>Diagnose using the negotiated link rate your operating system or switch reports for that port, not a speed-test result. A speed test measures everything between you and a remote server, including the internet plan itself. The link rate is a property of the two interfaces and the cable between them, which is what you are trying to isolate.</p><table><thead><tr><th>Symptom</th><th>Most likely cause</th><th>First test</th></tr></thead><tbody><tr><td data-label="Symptom">Exactly 100 Mbps on gigabit hardware</td><td data-label="Most likely cause">Two pairs lost in the run or a termination</td><td data-label="First test">Known-good patch cable</td></tr><tr><td data-label="Symptom">1 Gbps when both ends are multi-gig</td><td data-label="Most likely cause">One port advertising only 1 Gbps, or a dock in the path</td><td data-label="First test">Bypass the dock, then confirm both ports enable 802.3bz</td></tr><tr><td data-label="Symptom">Rate drops after moving furniture</td><td data-label="Most likely cause">Crushed or stretched cable</td><td data-label="First test">Inspect and replace the patch run</td></tr><tr><td data-label="Symptom">Link flaps between rates</td><td data-label="Most likely cause">Marginal termination or a failing port</td><td data-label="First test">Change ports, then re-terminate</td></tr></tbody></table><h2>The multi-gig version of the same problem</h2><p>The same logic applies one tier up. A 2.5 Gbps path that settles at 1 Gbps is usually not a cable problem at all: 2.5G and 5G rates require both ends to support and enable them, so a port that advertises only gigabit negotiates gigabit over perfectly good Cat6. Confirm what each interface advertises before assuming the run needs replacing, and check <a href="/guides/ethernet-cable-categories/">what the installed cable category is actually rated for</a> before pricing a rewire.</p><h2>What not to do</h2><p>Do not replace the router first. It is the most visible device and the least likely cause of a link stuck one tier below its capability. Do not re-crimp a working permanent run before testing with a patch cable. Do not fix the speed manually to force gigabit; a forced mismatch produces worse results than the problem it was meant to solve.</p><div class="callout"><p><strong>Next step:</strong> describe the segment in the <a href="/tools/ethernet-link-checker/">Ethernet link checker</a>, including the rate the link currently reports. It separates a real ceiling from a negotiation fault.</p></div>`,
  },
  {
    slug: "double-nat-explained",
    title: "Double NAT: What Actually Breaks, and What Does Not",
    seoTitle: "Double NAT Explained — HomeNet Fit",
    description: "Understand what double NAT is, which symptoms it genuinely causes, how to confirm it in two minutes, and the documented ways to remove a second routing layer.",
    lede: "Double NAT is real, common, and much less catastrophic than forum threads suggest. It breaks a specific list of things.",
    sourceIds: ["netgear-double-nat", "att-ip-passthrough", "tmobile-connect"],
    body: `<h2>Direct answer</h2><p>Double NAT means two devices in your home are both performing network address translation, typically an ISP gateway and a retail router plugged into it. Outbound traffic is unaffected, which is why it goes unnoticed for months. Inbound connections are affected: port forwarding has to be configured on both devices to work at all, and some services report a problem and stop.</p><h2>What it actually breaks</h2><ul><li><strong>Port forwarding.</strong> A rule on the inner router alone does nothing, because the outer device never sends the traffic inward.</li><li><strong>Self-hosted services.</strong> A game server, a camera recorder, or a home lab reachable from outside needs a path through both layers.</li><li><strong>Console NAT type.</strong> Consoles commonly report strict or moderate NAT, which can affect matchmaking and party chat.</li><li><strong>Some VPN and remote-access tools.</strong> Anything expecting an inbound connection or a stable port mapping can behave unpredictably.</li></ul><h2>What it does not break</h2><p>Browsing, streaming, video calls, downloads, cloud backup, and nearly everything else that starts from inside your network. Double NAT does not meaningfully reduce your speed, and it is not why a page loads slowly. If throughput is the complaint, the cause is a port, a link, or the plan; check the path before changing topology.</p><h2>How to confirm it in two minutes</h2><ol><li>Open the retail router's status page and read its WAN or internet IP address.</li><li>If that address starts with 192.168, starts with 10., or falls between 172.16 and 172.31, it was issued by another router inside your home. That is double NAT.</li><li>If it looks like a public address, or the router reports a single NAT layer, you do not have the problem.</li></ol><p>A traceroute showing two private hops before the first provider address tells you the same thing.</p><h2>The four ways out</h2><table><thead><tr><th>Fix</th><th>What it does</th><th>Cost</th></tr></thead><tbody><tr><td data-label="Fix">Bridge mode on the gateway</td><td data-label="What it does">The gateway stops routing; your router keeps every feature</td><td data-label="Cost">Available only where the provider documents it</td></tr><tr><td data-label="Fix">IP passthrough</td><td data-label="What it does">The gateway hands its public-facing address to one downstream device</td><td data-label="Cost">The gateway stays in the path and support is split across two devices</td></tr><tr><td data-label="Fix">Access-point mode</td><td data-label="What it does">Your router stops routing and provides Wi-Fi and switching only</td><td data-label="Cost">Guest network, site blocking, VPN service, and remote management stop working</td></tr><tr><td data-label="Fix">Own modem, one router</td><td data-label="What it does">Removes the provider routing device entirely</td><td data-label="Cost">Requires an approved modem for your exact provider and tier</td></tr></tbody></table><h2>When leaving it alone is correct</h2><p>If nothing on your list of complaints appears above, double NAT is a label rather than a problem. Some providers do not offer bridge mode at all; T-Mobile's current guidance for its Home Internet gateway is one example. In that situation the honest options are <a href="/guides/bridge-mode-vs-ap-mode/">access-point mode</a> or accepting the second layer. Changing topology to fix a symptom you do not have is how a working network becomes a broken one.</p><div class="callout"><p><strong>Next step:</strong> the <a href="/tools/router-topology-planner/">topology planner</a> checks your provider's reviewed record and names which of these four options is available to you.</p></div>`,
  },
  {
    slug: "bridge-mode-vs-ap-mode",
    title: "Bridge Mode vs. Access-Point Mode: Same Goal, Different Cost",
    seoTitle: "Bridge Mode vs AP Mode — HomeNet Fit",
    description: "Compare bridge mode and access-point mode for a router behind an ISP gateway, including which router features each one keeps and which it removes.",
    lede: "Both leave one routing device. Only one of them lets your router keep doing its job.",
    sourceIds: ["netgear-router-ap-mode", "xfinity-bridge-mode", "netgear-double-nat"],
    body: `<h2>Direct answer</h2><p>Bridge mode is a setting on the <strong>ISP gateway</strong>: it stops routing and hands the connection to your router, which keeps every feature. Access-point mode is a setting on <strong>your router</strong>: it stops routing and provides Wi-Fi and switching only, while the gateway stays in charge. Both leave one routing device. The difference is which device it is, and therefore which features survive.</p><h2>Which device you are configuring</h2><table><thead><tr><th>Question</th><th>Bridge mode</th><th>Access-point mode</th></tr></thead><tbody><tr><td data-label="Question">Setting lives on</td><td data-label="Bridge mode">The ISP gateway</td><td data-label="Access-point mode">Your own router</td></tr><tr><td data-label="Question">Device that routes</td><td data-label="Bridge mode">Your router</td><td data-label="Access-point mode">The ISP gateway</td></tr><tr><td data-label="Question">Your router's features</td><td data-label="Bridge mode">All retained</td><td data-label="Access-point mode">Guest network, site blocking, VPN service, and remote management stop working</td></tr><tr><td data-label="Question">Port forwarding configured on</td><td data-label="Bridge mode">Your router</td><td data-label="Access-point mode">The ISP gateway</td></tr><tr><td data-label="Question">Available when</td><td data-label="Bridge mode">The provider documents the setting</td><td data-label="Access-point mode">Always, because it is your hardware</td></tr></tbody></table><h2>Prefer bridge mode when it exists</h2><p>If you bought the router for its features, bridge mode is the arrangement that lets you use them. Xfinity, for example, publishes a bridge-mode procedure for using a customer-owned router with its wireless gateway. Vendor guidance follows the same order: bridge the ISP gateway and keep the retail router in router mode, then fall back to access-point mode with the gateway's Wi-Fi turned off when bridge mode is unavailable.</p><h2>Access-point mode is not a downgrade if you bought for coverage</h2><p>The features AP mode removes are only a loss if you were using them. If the mesh system went in to cover a back bedroom and the gateway's parental controls are fine, AP mode is the simpler arrangement and costs you nothing. Decide on the feature list you actually use, not on which mode sounds more advanced.</p><h2>Practical cautions</h2><ul><li><strong>Turn off the gateway's Wi-Fi</strong> in an AP-mode setup, or two networks compete for the same airtime and clients attach to the wrong one.</li><li><strong>Bridge mode usually disables the gateway's Wi-Fi and LAN services.</strong> Have your own router configured and ready before you flip it, or you will be offline mid-change.</li><li><strong>Provider voice and TV can depend on the gateway routing.</strong> Confirm that path first. This is the most common way a working phone line quietly dies.</li><li><strong>Write down the current cabling.</strong> A photograph of the back of both devices is enough to restore it.</li><li><strong>Menus differ by model.</strong> Use the instructions for your exact gateway and router, not for a similarly named one.</li></ul><h2>If neither is available</h2><p>Some required gateways offer neither bridge mode nor passthrough. The real options are then access-point mode, or accepting <a href="/guides/double-nat-explained/">double NAT</a> and forwarding ports on the gateway instead. Both are legitimate. Neither requires new hardware.</p><div class="callout"><p><strong>Next step:</strong> the <a href="/tools/router-topology-planner/">topology planner</a> uses your provider's reviewed gateway record to say which mode is documented for you, and lists what the recommended arrangement takes away.</p></div>`,
  },
  {
    slug: "mixing-mesh-brands",
    title: "Can You Mix Mesh Wi-Fi Brands? What Actually Happens",
    seoTitle: "Can You Mix Mesh Brands? — HomeNet Fit",
    description: "Find out whether eero, Orbi, Deco, Nest Wifi, and AiMesh units can be mixed, why same-brand pairs still fail, and the arrangement that works when they cannot.",
    lede: "Two mesh systems in one house is usually two networks. That is fine, as long as you set it up on purpose.",
    sourceIds: ["eero-mixing-models", "netgear-orbi-satellite-series", "tplink-deco-mixing", "tplink-mesh-interop", "asus-aimesh", "google-nest-wifi-pro-mesh", "wifi-alliance-easymesh", "netgear-router-ap-mode"],
    body: `<h2>Direct answer</h2><p>You cannot join an eero to an Orbi, a Deco to a Nest Wifi, or any two unrelated mesh systems into one managed network. Mesh is not a standard — each manufacturer wrote its own method for nodes to find each other, share a backhaul, hand a client from one unit to the next, and report status to a single app. The one real exception is <a href="/guides/easymesh-vs-proprietary-mesh/">Wi-Fi CERTIFIED EasyMesh</a>, which exists specifically so multi-AP devices from different vendors can run as one network, and it only applies when both devices actually carry that certification rather than merely using the word mesh in their marketing.</p><h2>Mixing inside one system usually works</h2><p>The rule is per system, not per brand. eero states that its units work together across generations and that the network inherits the capabilities of the eero acting as the gateway. TP-Link publishes a Deco compatibility guide for mixing Deco models, with features drawn from the main unit. ASUS AiMesh works across supported routers, but the support is per model on a published list rather than across the whole product line.</p><h2>The same-brand traps that cost money</h2><table><thead><tr><th>Pair</th><th>What people assume</th><th>What the manufacturer says</th></tr></thead><tbody><tr><td data-label="Pair">Orbi satellite + Orbi router of another series</td><td data-label="What people assume">Any Orbi satellite joins any Orbi router</td><td data-label="What the manufacturer says">Each add-on satellite lists a matching series router under system requirements</td></tr><tr><td data-label="Pair">Nest Wifi Pro + Nest Wifi or Google Wifi</td><td data-label="What people assume">All Google mesh units are one family</td><td data-label="What the manufacturer says">Nest Wifi Pro does not mesh with the earlier Wi-Fi 5 devices</td></tr><tr><td data-label="Pair">TP-Link Deco + TP-Link OneMesh router</td><td data-label="What people assume">Same brand, same mesh</td><td data-label="What the manufacturer says">Deco and OneMesh are separate mechanisms that do not interoperate</td></tr><tr><td data-label="Pair">Two AiMesh-capable ASUS routers</td><td data-label="What people assume">AiMesh works across the ASUS range</td><td data-label="What the manufacturer says">Support is per model, on ASUS's published compatibility list</td></tr></tbody></table><h2>What you get instead</h2><p>When the pairing is not supported, you still have a working arrangement: choose one system to own routing and connect only that one to the modem, gateway, or ONT, then put the second system into access-point or bridge mode. One device routes, so there is no second NAT layer, and the second system adds Wi-Fi and switch ports where you need them.</p><p>Be honest about the two costs. There is no seamless roaming between them — a device leaving one network disconnects and reconnects to the other, which a video call will notice. And a system in access-point mode loses its own guest network, parental controls, VPN service, and remote management, because those are routing features. Give the two networks different Wi-Fi names; sharing one name across unrelated systems does not create roaming, it creates two networks with the same label and devices that cling to the wrong one.</p><h2>Cable between them if you can</h2><p>A wired backhaul helps every arrangement here, mixed or not. Without a cable, the link between units competes for airtime with the clients those units are supposed to serve, and an older unit sitting between the main router and a weak room sets the ceiling for everything behind it. One Ethernet run frequently does more for coverage than a hardware upgrade would.</p><h2>Before you buy the second unit</h2><ol><li>Read the model number from the label on the base of the unit you already own.</li><li>Open the manufacturer's page for the unit you are considering and find the system-requirements or compatibility list.</li><li>Confirm that your exact model appears there — not the brand, not the product line.</li><li>If it does not appear, plan on access-point mode or buy the unit sold for your system.</li><li>Keep the receipt. Mesh support changes with firmware releases in both directions.</li></ol><div class="callout"><p><strong>Next step:</strong> the <a href="/tools/mesh-compatibility-checker/">mesh compatibility checker</a> applies each manufacturer's reviewed rule to the pair you have, and gives you the setup order for whichever arrangement is possible.</p></div>`,
  },
  {
    slug: "easymesh-vs-proprietary-mesh",
    title: "Wi-Fi EasyMesh vs. Proprietary Mesh: Why a Shared Standard Is Not a Shared Network",
    seoTitle: "Wi-Fi EasyMesh vs. Proprietary Mesh — HomeNet Fit",
    description: "Learn what Wi-Fi CERTIFIED EasyMesh certification guarantees, how it differs from a vendor's own mesh method, and how to verify a model before buying it.",
    lede: "Every mesh product speaks Wi-Fi. Almost none of them speak the same multi-AP language.",
    sourceIds: ["wifi-alliance-easymesh", "wifi-alliance-product-finder", "tplink-mesh-interop", "asus-aimesh", "eero-mixing-models"],
    body: `<h2>Direct answer</h2><p>Wi-Fi is a radio standard. Multi-AP coordination is not part of it. Two access points can both be Wi-Fi 6 certified, both support WPA3, both hold a perfect link to your laptop, and still be unable to form a single network — because the work of deciding which unit serves which client, carrying traffic between units, and presenting one configuration to one app was invented separately by each vendor. Wi-Fi CERTIFIED EasyMesh is the Wi-Fi Alliance program that standardizes exactly that missing layer.</p><h2>What the certification adds on top of plain Wi-Fi</h2><p>The Wi-Fi Alliance describes EasyMesh as a standards-based approach for networks that use multiple access points working together as a unified network, capable of steering devices to the best AP and reshaping the network as conditions change. The listed capabilities include onboarding through Wi-Fi Easy Connect QR codes, prioritizing low-latency traffic, and — the part that matters when you are shopping — scalability by adding EasyMesh access points from multiple vendors.</p><h2>Two layers, two different questions</h2><table><thead><tr><th>Layer</th><th>What it governs</th><th>The question it answers</th></tr></thead><tbody><tr><td data-label="Layer">Wi-Fi generation (Wi-Fi 5/6/6E/7)</td><td data-label="What it governs">Radio behavior between one AP and one client</td><td data-label="The question it answers">How fast and how efficiently a phone talks to a single unit</td></tr><tr><td data-label="Layer">Security (WPA2, WPA3)</td><td data-label="What it governs">Authentication and encryption on the link</td><td data-label="The question it answers">Whether a client is allowed on and how the traffic is protected</td></tr><tr><td data-label="Layer">Multi-AP method (EasyMesh or proprietary)</td><td data-label="What it governs">Coordination, steering, backhaul, single-app control</td><td data-label="The question it answers">Whether two units become one network or stay two networks</td></tr></tbody></table><p>People shop on the first row, get burned by the third, and conclude the hardware is defective. It is not. Nothing was ever promised.</p><h2>Why vendors keep building their own anyway</h2><p>Proprietary systems shipped years before the certification and carry features the standard does not define: an eero network inherits the capabilities of whichever eero is acting as gateway, ASUS AiMesh spans a published list of supported routers with the main router's features flowing to the rest, and TP-Link maintains Deco, OneMesh, EasyMesh, and Omada as four distinct mechanisms with different scopes. A vendor with a working ecosystem, a mature app, and its own roadmap has little reason to converge, so "mesh" on a box tells you the marketing category and nothing about interoperability. The practical consequences of that — including the same-brand pairs that still refuse to join — are laid out in <a href="/guides/mixing-mesh-brands/">what actually happens when you mix mesh brands</a>.</p><h2>How to verify before you buy</h2><ol><li>Find the model number on the label of the unit, not the product-line name on the box.</li><li>Search that model in the Wi-Fi Alliance's Wi-Fi CERTIFIED Product Finder.</li><li>Look for Wi-Fi EasyMesh in the certification list. If the word mesh only appears in the vendor's own marketing, the standard is not in play.</li><li>Repeat for the second unit. Certification is per model, so one certified device plus one uncertified device is still two networks.</li><li>If either check fails, plan on the access-point arrangement instead of hoping firmware will bridge the gap.</li></ol><h2>What EasyMesh still does not promise</h2><p>Certification means the coordination layer is standardized. It does not mean two vendors' units will expose every feature in one app, that vendor-specific extras survive a mixed network, or that a shipping product implements every optional capability. It also does not change physics: the shared radio still carries both client traffic and any wireless backhaul. Treat a match as a green light for pairing, then verify the specific features you care about on each manufacturer's page.</p><div class="callout"><p><strong>Next step:</strong> run your two model numbers through the <a href="/tools/mesh-compatibility-checker/">mesh compatibility checker</a>. Unlisted hardware returns unknown rather than a guess, and every outcome includes a working fallback.</p></div>`,
  },
  {
    slug: "mix-wifi-generations",
    title: "Mixing Wi-Fi 5, 6, 6E, and 7 Devices: What You Keep and What You Lose",
    seoTitle: "Mixing Wi-Fi Generations — HomeNet Fit",
    description: "See how older and newer Wi-Fi devices work together, which features quietly fall back, and what a 6 GHz or Wi-Fi 7 connection genuinely requires first.",
    lede: "An old laptop will not break a new router. It will just decline most of what you paid for.",
    sourceIds: ["wifi-alliance-generations", "microsoft-wifi-windows", "intel-6ghz-enable", "eero-mixing-models", "tplink-deco-mixing"],
    body: `<h2>Direct answer</h2><p>Generations interoperate. A Wi-Fi 4 printer from 2011 connects to a Wi-Fi 7 router, and a Wi-Fi 7 phone connects to a Wi-Fi 5 router. Each pairing negotiates down to the newest capability both ends share, so the older device sets the terms for its own connection only. Nothing is blocked, and nothing about the older device drags the rest of the network down to its level. What you lose is quieter: the specific feature you upgraded for may never engage, because it needs matching support on both ends plus, in some cases, the right operating system, driver, and country.</p><h2>The generations, and what each one added</h2><table><thead><tr><th>Generation</th><th>Introduced</th><th>Bands it can use</th><th>Headline capability</th></tr></thead><tbody><tr><td data-label="Generation">Wi-Fi 4</td><td data-label="Introduced">2009</td><td data-label="Bands it can use">2.4 GHz (and 5 GHz on some hardware)</td><td data-label="Headline capability">First multi-stream consumer Wi-Fi</td></tr><tr><td data-label="Generation">Wi-Fi 5</td><td data-label="Introduced">2014</td><td data-label="Bands it can use">2.4 and 5 GHz on most products</td><td data-label="Headline capability">Multi-gigabit rates on the less crowded 5 GHz band</td></tr><tr><td data-label="Generation">Wi-Fi 6</td><td data-label="Introduced">2018</td><td data-label="Bands it can use">2.4 and 5 GHz</td><td data-label="Headline capability">OFDMA and MU-MIMO efficiency in busy households</td></tr><tr><td data-label="Generation">Wi-Fi 6E</td><td data-label="Introduced">Certification extending Wi-Fi 6</td><td data-label="Bands it can use">Adds 6 GHz</td><td data-label="Headline capability">Wide channels in spectrum older devices cannot reach</td></tr><tr><td data-label="Generation">Wi-Fi 7</td><td data-label="Introduced">2024</td><td data-label="Bands it can use">2.4, 5, and 6 GHz</td><td data-label="Headline capability">320 MHz channels in 6 GHz and multi-link operation</td></tr></tbody></table><h2>The feature that most often fails to appear</h2><p>Buying a 6E or Wi-Fi 7 router does not by itself produce a 6 GHz connection. On a Windows PC, Intel lists the full prerequisite chain for its adapters: Windows 11 with current updates, a driver at 22.70.0 or later for Wi-Fi 6E hardware and 23.10.0 or later for Wi-Fi 7 hardware, and a compatible router. Wi-Fi 7 functionality additionally needs Windows 11 version 24H2, which Microsoft confirms as the release where Wi-Fi 7 support arrives. Two more conditions sit outside your control: some countries prohibit 6 GHz use, and a laptop manufacturer may not have enabled the band on your model.</p><h2>Check what your client can actually do</h2><p>On Windows, open a terminal and run <code>netsh wlan show drivers</code>. Under <strong>Radio types supported</strong>, 802.11be means Wi-Fi 7 and 802.11ax means Wi-Fi 6 or 6E. The same output lists whether WPA3 Personal is supported. This takes ten seconds and settles an argument that otherwise ends with a returned router.</p><h2>Security during the transition</h2><p>Networks running both WPA2 and WPA3 are the normal state of a mixed household. Windows attempts WPA3-Personal first and upgrades an existing WPA2 configuration automatically, but Microsoft notes that roaming smoothly between a WPA2 access point and a WPA3 one requires an adapter that supports cross-roaming. If an older client drops when you move through the house after a security change, that requirement is the first thing to check — not the access points.</p><h2>Mixed hardware inside one mesh system</h2><p>Mixing generations of the same mesh family is usually supported and usually capped by the unit in charge. eero states that its network inherits the capabilities of the eero acting as gateway, and TP-Link's Deco guidance draws network features from the main unit. The practical rule: put the newest, fastest unit at the front of the network, and let the older ones extend coverage behind it. Reversing that order is the most common self-inflicted ceiling in a mixed mesh. Across different systems the answer changes entirely, and <a href="/guides/easymesh-vs-proprietary-mesh/">the certification layer</a> is what decides whether they can cooperate at all.</p><h2>What to do with the old devices</h2><p>Keep them. A Wi-Fi 4 thermostat on 2.4 GHz costs you almost nothing on a modern router, and replacing working hardware to chase a clean generation list is money spent on a number. Spend it instead on whichever link your own testing shows is actually limiting you.</p><div class="callout"><p><strong>Next step:</strong> if the slow part of the path might be wired rather than wireless, the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a> compares every required link against your plan tier before you buy anything.</p></div>`,
  },
  {
    slug: "usb-dock-ethernet-limits",
    title: "Why a USB Dock or Adapter Caps Your Ethernet Speed",
    seoTitle: "USB Dock and Adapter Ethernet Limits — HomeNet Fit",
    description: "Find out why a gigabit Ethernet adapter runs slow on a USB 2.0 port, what each USB tier carries, and how to keep a dock from limiting a wired path.",
    lede: "The adapter says gigabit. The port it is plugged into gets the final word.",
    sourceIds: ["usbif-usb32", "wd-usb-speeds", "startech-usb31000s", "netgear-multigig-ports"],
    body: `<h2>Direct answer</h2><p>A USB Ethernet adapter or dock is one more link in the wired path, and it obeys the same rule as every other link: the connection runs at the lowest common capability of the two ends. USB-IF states this plainly for USB 3.2 products — they are backwards compatible with all existing USB products and will operate at the lowest common speed capability. Plug a gigabit-capable adapter into a USB 2.0 port and the host port, not the adapter, sets the ceiling.</p><h2>What each USB tier can carry</h2><table><thead><tr><th>USB tier</th><th>Signaling rate</th><th>Typical real-world rate</th><th>Enough for a gigabit link?</th></tr></thead><tbody><tr><td data-label="USB tier">USB 2.0 (Hi-Speed)</td><td data-label="Signaling rate">480 Mbps</td><td data-label="Typical real-world rate">About 240 Mbps</td><td data-label="Enough for a gigabit link?">No</td></tr><tr><td data-label="USB tier">USB 5Gbps (USB 3.2 Gen 1)</td><td data-label="Signaling rate">5 Gbps</td><td data-label="Typical real-world rate">About 3.2 Gbps</td><td data-label="Enough for a gigabit link?">Yes, with headroom</td></tr><tr><td data-label="USB tier">USB 10Gbps (USB 3.2 Gen 2)</td><td data-label="Signaling rate">10 Gbps</td><td data-label="Typical real-world rate">About 7.2 Gbps</td><td data-label="Enough for a gigabit link?">Yes, and enough for 2.5G or 5G</td></tr><tr><td data-label="USB tier">USB 20Gbps (USB 3.2 Gen 2×2)</td><td data-label="Signaling rate">20 Gbps</td><td data-label="Typical real-world rate">About 16 Gbps</td><td data-label="Enough for a gigabit link?">Yes</td></tr></tbody></table><p>Those real-world figures come from Western Digital's published USB table and vary with the host, operating system, and workload. The signaling rate is the raw number on the box; the second column is closer to what a sustained transfer sees.</p><h2>The arithmetic that catches people out</h2><p>A 1 Gbps Ethernet link needs more than 1 Gbps of bus behind it, because the bus carries framing and protocol overhead alongside your data. USB 2.0 offers 480 Mbps of signaling before any of that, which is under half of what a gigabit link needs. This is why adapter vendors are explicit about it: StarTech's USB 3.0 gigabit adapter datasheet states that it delivers gigabit at full bandwidth <em>unlike USB 2.0 adapters</em>, remains backward compatible with USB 2.0 and 1.x systems with speed limited by the USB bus, and that USB 2.0 adapters cannot provide true gigabit speeds.</p><h2>Connector shape is not speed</h2><p>A USB-C port can be a USB 2.0 port. Plenty of budget laptops, streaming sticks, tablets, and single-board computers ship a USB-C connector wired only for 480 Mbps and power. The same trap runs in reverse: a blue USB-A port is usually 5 Gbps, but the colour is a convention, not a specification. Check the port's documented tier on the device maker's spec page rather than inferring it from the plug.</p><h2>Diagnosing it in three steps</h2><ol><li><strong>Read the negotiated link rate, not a speed test.</strong> If the operating system reports the adapter at 1 Gbps but throughput stalls near 200–300 Mbps, the Ethernet side negotiated fine and the bus is the limiter. A link that instead <em>reports</em> 100 Mbps is a different fault with a different cause — see <a href="/guides/ethernet-negotiated-100mbps/">why a gigabit link negotiates at 100 Mbps</a>.</li><li><strong>Move the adapter to a different port</strong> on the same machine and retest. A single change of port frequently doubles or triples the result, which is itself the diagnosis.</li><li><strong>Bypass the dock entirely</strong> — plug Ethernet straight into the machine's built-in port if it has one, or into the adapter alone without the hub. If the number jumps, the dock's shared bus was splitting bandwidth with a display, an SSD, or a webcam.</li></ol><h2>What to buy instead</h2><p>For a gigabit plan, a 5 Gbps USB adapter is enough and is the cheapest fix. For a multi-gig plan, the ports matter twice: Netgear's own explanation of multi-gig ports is worth reading before assuming a 2.5G router port pairs with whatever adapter you own, because a 2.5 GbE USB adapter needs a 5 Gbps or faster host port to have any chance of reaching its rating. Where the machine has a built-in Ethernet port that already meets your plan tier, use it and keep the dock for peripherals.</p><div class="callout"><p><strong>Next step:</strong> the <a href="/tools/ethernet-link-checker/">Ethernet link checker</a> takes the adapter or dock as an explicit part of the segment, so the result names the limiting element instead of blaming the cable.</p></div>`,
  },
];

const guidesIndex: PageSpec = {
  path: "/guides/",
  title: "Home Network Guides — HomeNet Fit",
  description: "Read practical guides about ISP equipment, network roles, multi-gig ports, bottlenecks, and upgrade order.",
  h1: "Guides",
  lede: "Direct explanations that lead into a working decision tool.",
  crumbs: homeCrumb,
  updated,
  body: pageCards(guides.map((guide) => ({ href: `/guides/${guide.slug}/`, eyebrow: "Guide", title: guide.title, text: guide.lede, action: "Read guide" })), "h2"),
};

const guidePages: PageSpec[] = guides.map((guide) => ({
  path: `/guides/${guide.slug}/`,
  title: guide.seoTitle,
  description: guide.description,
  h1: guide.title,
  lede: guide.lede,
  crumbs: guideCrumb,
  updated,
  body: `<article class="prose">${guide.body}${guideSources(guide.sourceIds)}</article>`,
}));

const trustPages: PageSpec[] = [
  {
    path: "/about/", title: "About HomeNet Fit", description: "Learn why HomeNet Fit checks the complete network path, preserves unknown evidence, and recommends the smallest useful equipment change.", h1: "About HomeNet Fit", lede: "A consumer decision tool for compatibility and bottlenecks—not an equipment storefront.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>Purpose</h2><p>HomeNet Fit helps people understand whether an ISP, gateway, router, mesh system, link, and device work together. The result names conditions, missing evidence, the first verified limiter, and the smallest action likely to help.</p><h2>What we do not claim</h2><p>The site does not remotely scan networks, certify provider activation, promise throughput, or present paid rankings as neutral engineering advice.</p><h2>Current state</h2><p>This is a local review build. It is not publicly deployed, monetized, or accepting advertising.</p></article>`,
  },
  {
    path: "/methodology/", title: "Methodology — HomeNet Fit", description: "See HomeNet Fit compatibility statuses, source priorities, bottleneck math, confidence rules, and update schedule.", h1: "Methodology", lede: "Every result separates policy, equipment capability, path math, and uncertainty.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>Four statuses</h2><p>Compatible means every required reviewed rule passes. Conditional means a mode, retained device, lost feature, or lower path ceiling applies. Incompatible means a required rule fails. Unknown means evidence is missing, model-specific, conflicting, or outside current coverage.</p><h2>Path calculation</h2><p>For required links with valid supported or negotiated rates, the minimum rate is the verified line-rate ceiling. A proven lower link remains a useful limiter even when another downstream rate is unknown. When all known links meet the tier but one required rate is missing, the result stays unknown.</p><h2>Evidence priority</h2><p>Official ISP, manufacturer, standards-body, and certification records outrank retailers, forums, and summaries. Provider rules are reviewed monthly in the current data contract. Results show retrieval and next-review dates.</p><h2>Action order</h2><p>When outcomes are equal, keep is preferred over configure, configure over add or rewire, and add or rewire over replace.</p></article>`,
  },
  {
    path: "/editorial-standards/", title: "Editorial Standards — HomeNet Fit", description: "Read HomeNet Fit standards for official evidence, exact-model claims, original utility, AI-assisted drafting, corrections, and publication blocks.", h1: "Editorial standards", lede: "AI can accelerate evidence processing and drafting. It cannot turn an unsupported claim into a publishable fact.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>Source every changing rule</h2><p>Provider approval, equipment support, firmware behavior, prices, and current standards claims need dated evidence. Similar model names are not interchangeable.</p><h2>Add utility, not paraphrase</h2><p>Pages must answer a distinct user decision with a calculation, comparison, path, example, or clearer procedure. Competitor wording and organization are not source material.</p><h2>Block weak output</h2><p>Unsupported facts, broken tools, near-duplicate intent, inaccessible controls, missing mobile checks, and hidden primary content block publication regardless of a numeric score.</p></article>`,
  },
  {
    path: "/corrections/", title: "Corrections — HomeNet Fit", description: "See how HomeNet Fit verifies reported errors, updates changed source records and decision rules, reruns fixtures, and records material corrections.", h1: "Corrections", lede: "A changed source should update the rule, its fixtures, and every affected result.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>Correction process</h2><ol><li>Record the exact claim, source, date, and affected provider or equipment.</li><li>Compare the current official evidence with the stored record.</li><li>Change or withdraw the rule.</li><li>Rerun compatible, conditional, incompatible, unknown, and alias fixtures.</li><li>Publish a dated changelog entry before restoring affected pages.</li></ol><p>A public correction channel will be activated only after a domain and monitored inbox are approved. This local build does not collect reports.</p></article>`,
  },
  {
    path: "/sources/", title: "Sources — HomeNet Fit", description: "Review the provider and manufacturer sources used by HomeNet Fit, including evidence notes, retrieval dates, and required review dates.", h1: "Current sources", lede: "The provider rule set stays bounded, dated, and reviewable.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><p>These records support current local fixtures. A source link does not imply endorsement of HomeNet Fit.</p>${sourceCards()}</article>`,
  },
  {
    path: "/changelog/", title: "Changelog — HomeNet Fit", description: "See dated HomeNet Fit changes covering tools, provider rules, source coverage, privacy behavior, index controls, and material decision logic.", h1: "Changelog", lede: "Material rule and tool changes stay visible.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>September 14, 2026</h2><ul><li>Created the local static foundation.</li><li>Added Tools 1–3 with shared deterministic logic.</li><li>Expanded coverage to Xfinity, Spectrum, Cox cable, AT&amp;T Fiber, Verizon Fios, and T-Mobile Home Internet.</li><li>Expanded the guide library from six to sixteen substantive pages.</li><li>Added the Ethernet link checker and router topology planner, bringing the tool count to five.</li><li>Added the mesh compatibility checker and its mixing-mesh-brands guide, bringing the tool count to six.</li><li>Added IEEE 802.3 cabling objectives and vendor bridge-mode, AP-mode, and double-NAT records to the source set.</li><li>Added manufacturer mesh-pairing records from eero, NETGEAR, TP-Link, ASUS, Google, and the Wi-Fi Alliance.</li><li>Completed the supporting library at twenty guides with EasyMesh certification, Wi-Fi generation mixing, and USB dock link limits.</li><li>Added Wi-Fi Alliance generation, Microsoft Windows Wi-Fi, Intel 6 GHz, USB-IF, Western Digital, and StarTech records to the source set.</li><li>Recorded passing 85/100 publication gates for all six tools and twenty guides.</li><li>Gave every guide a contextual in-prose link to a related guide, and made the two-destination link rule an automated check.</li><li>Fixed a production defect that would have published every page as noindex with an empty sitemap, and set 40 of 42 pages indexable with the error page and the contact placeholder excluded.</li><li>Replaced the local review banner with a browser-privacy statement in production builds.</li><li>Made the build verifier mode-aware so robots, sitemap, headers, and per-page index status must agree before a production build passes.</li><li>Kept the default build local and noindex pending separate deployment and publication review.</li></ul><h2>September 17, 2026</h2><ul><li>Tied the content-security policy to the analytics setting, so privacy-preserving traffic measurement can only be enabled deliberately and is verified before a build passes.</li><li>Prepared the hosting configuration and launch checks. No deployment, domain, analytics, or advertising has been activated.</li></ul></article>`,
  },
  {
    path: "/privacy/", title: "Privacy — HomeNet Fit", description: "Read what the local HomeNet Fit tools process, which sensitive network details they never request, and what must change before public analytics or ads.", h1: "Privacy", lede: "The current tools run entirely in the browser and do not send entered network details to a server.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>Current local build</h2><p>HomeNet Fit does not have accounts, analytics, advertising, contact forms, uploads, or server-side tool processing. Tool inputs remain in the open browser tab and disappear when the page is closed or reset.</p><h2>Data not requested</h2><p>Do not enter passwords, SSIDs, public IP addresses, MAC addresses, serial numbers, account numbers, or free-text configuration dumps. The tools do not need them.</p><h2>Future changes</h2><p>Any public analytics, consent system, or Google advertising integration requires an updated policy before activation.</p></article>`,
  },
  {
    path: "/terms/", title: "Terms — HomeNet Fit", description: "Read the planning limits, provider-verification requirement, safe-use boundaries, and no-performance-guarantee terms for HomeNet Fit tools.", h1: "Terms", lede: "Use the results as planning guidance and verify current provider and manufacturer requirements.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>No activation or performance guarantee</h2><p>HomeNet Fit reports entered capabilities and reviewed rules. Providers control activation and may change eligibility. Real throughput depends on conditions beyond the tool.</p><h2>Safe use</h2><p>Do not open provider enclosures, alter fiber, bypass provider authentication, or perform electrical or cabling work beyond your skill. Follow provider and manufacturer instructions.</p><h2>Current availability</h2><p>This local review build is supplied as-is for evaluation and is not a public service.</p></article>`,
  },
  {
    path: "/cookies/", title: "Cookie Information — HomeNet Fit", description: "See the current HomeNet Fit cookie and browser-storage behavior, plus the disclosure required before future analytics, consent, or advertising tools.", h1: "Cookie information", lede: "The current local build sets no cookies and stores no tool answers.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><h2>Current behavior</h2><p>The static tools do not use cookies, local storage, accounts, advertising, or analytics. A future public release must document any analytics, consent, or advertising technology before it is enabled.</p></article>`,
  },
  {
    path: "/contact/", title: "Contact — HomeNet Fit", description: "See why the local HomeNet Fit review build does not yet claim a public support inbox, correction address, or working contact form.", h1: "Contact", lede: "No public support or correction inbox is active yet.", crumbs: homeCrumb, updated,
    body: `<article class="prose"><p>This site has not purchased a domain or launched publicly. A monitored contact address and correction channel will be created only after separate domain and deployment approval. No form is shown because there is nowhere truthful to send it yet.</p></article>`,
  },
];

const notFound: PageSpec = {
  path: "/404.html",
  title: "Page Not Found — HomeNet Fit",
  description: "The requested HomeNet Fit page does not exist.",
  h1: "That path is not connected.",
  lede: "The page may have moved or never passed its publication gate.",
  body: `<div class="button-row"><a class="button" href="/">Go home</a><a class="button button-secondary" href="/tools/">Browse tools</a></div>`,
};

const TOOL_COUNT = 6;

const pages: PageSpec[] = [
  home,
  toolsIndex,
  plannerPage,
  bottleneckPage,
  ispPage,
  ethernetPage,
  topologyPage,
  meshPage,
  ...categoryPages,
  guidesIndex,
  ...guidePages,
  ...trustPages,
  notFound,
];

// Every page is indexable in production unless it is an error page or an
// unfinished placeholder. `/contact/` stays out until a real inbox exists.
const NOINDEX_PATHS = new Set(["/404.html", "/contact/"]);
for (const page of pages) page.indexable = !NOINDEX_PATHS.has(page.path);

function outputPath(path: string): string {
  if (path === "/") return join(out, "index.html");
  if (path.endsWith(".html")) return join(out, path.slice(1));
  return join(out, path.slice(1), "index.html");
}

async function write(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

await rm(out, { recursive: true, force: true });
await mkdir(join(out, "assets"), { recursive: true });

for (const page of pages) await write(outputPath(page.path), layout(page));

const bundle = await Bun.build({
  entrypoints: [
    join(root, "src", "planner-ui.ts"),
    join(root, "src", "bottleneck-ui.ts"),
    join(root, "src", "isp-ui.ts"),
    join(root, "src", "ethernet-ui.ts"),
    join(root, "src", "topology-ui.ts"),
    join(root, "src", "mesh-ui.ts"),
  ],
  outdir: join(out, "assets"),
  target: "browser",
  format: "esm",
  minify: true,
  sourcemap: "none",
});
if (!bundle.success) throw new Error(bundle.logs.map((log) => log.message).join("\n"));

await cp(join(root, "src", "style.css"), join(out, "assets", "style.css"));
await cp(join(root, "src", "favicon.svg"), join(out, "favicon.svg"));
await write(join(out, "robots.txt"), robots());
await write(join(out, "sitemap.xml"), sitemap(pages));
await write(join(out, "_headers"), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${contentSecurityPolicy()}\n${BUILD_MODE === "local" ? "  X-Robots-Tag: noindex, nofollow\n" : ""}\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
await write(join(out, "build-manifest.json"), JSON.stringify({
  site: "HomeNet Fit",
  mode: BUILD_MODE,
  analytics: ANALYTICS,
  generatedAt: new Date().toISOString(),
  pages: pages.length,
  tools: TOOL_COUNT,
  guides: guides.length,
  providerRuleSets: listProviders().length,
  indexablePages: BUILD_MODE === "production" ? pages.filter((page) => page.indexable).length : 0,
}, null, 2) + "\n");

console.log(`Built ${pages.length} pages, ${TOOL_COUNT} tools, and ${guides.length} guides in ${BUILD_MODE} mode.`);
