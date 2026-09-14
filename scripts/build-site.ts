#!/usr/bin/env bun
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sourcesJson from "../data/sources.json";
import {
  BUILD_MODE,
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
      <div class="section-intro"><div><span class="eyebrow">Three decisions</span><h2>Start with the answer you need.</h2></div><p>Each tool shares the same rules. No conflicting calculators.</p></div>
      ${pageCards([
        { href: "/tools/network-compatibility-planner/", eyebrow: "Tool 1", title: "Will my setup work together?", text: "Check the full path from provider to client and get one prioritized next action.", action: "Check my network" },
        { href: "/tools/internet-plan-bottleneck-finder/", eyebrow: "Tool 2", title: "What is slowing this device down?", text: "Compare every entered port and link rate to the internet tier without fake Wi-Fi precision.", action: "Find the limiter" },
        { href: "/tools/isp-equipment-checker/", eyebrow: "Tool 3", title: "Can I use my own equipment?", text: "Check source-backed provider rules and see when an exact model still needs manual approval.", action: "Check ISP rules" },
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
  description: "Use three connected tools to check home-network compatibility, internet-plan bottlenecks, and ISP equipment rules.",
  h1: "Home-network tools",
  lede: "Three tools share one decision model: provider rules first, verified path capacity second, cheapest useful action last.",
  crumbs: homeCrumb,
  updated,
  body: pageCards([
    { href: "/tools/network-compatibility-planner/", eyebrow: "Tool 1", title: "Whole-Network Compatibility Planner", text: "Compose ISP requirements and link ceilings into one network-path verdict.", action: "Open planner" },
    { href: "/tools/internet-plan-bottleneck-finder/", eyebrow: "Tool 2", title: "Internet-Plan Bottleneck Finder", text: "Locate the first link that prevents a device from using the full plan tier.", action: "Find bottleneck" },
    { href: "/tools/isp-equipment-checker/", eyebrow: "Tool 3", title: "ISP Equipment Checker", text: "Check whether customer-owned equipment is supported, conditional, or requires manual verification.", action: "Check equipment" },
  ]),
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

const categoryPages: PageSpec[] = [
  {
    path: "/compatibility/", title: "Home Network Compatibility — HomeNet Fit", description: "Check ISP equipment arrangements and the full path between provider, gateway, router, link, and client.", h1: "Compatibility", lede: "Compatibility is a relationship with conditions—not a product badge.", crumbs: homeCrumb, updated,
    body: pageCards([
      { href: "/tools/network-compatibility-planner/", eyebrow: "Full path", title: "Whole-Network Compatibility Planner", text: "Check five links and provider policy together.", action: "Open tool" },
      { href: "/tools/isp-equipment-checker/", eyebrow: "Provider", title: "ISP Equipment Checker", text: "Review customer-owned equipment rules and current sources.", action: "Open tool" },
      { href: "/guides/approved-modem-lists/", eyebrow: "Guide", title: "Approved modem lists", text: "Understand why provider, address, tier, and service options matter.", action: "Read guide" },
    ]),
  },
  {
    path: "/bottlenecks/", title: "Home Network Bottlenecks — HomeNet Fit", description: "Find which gateway, router, switch, cable, link, or client interface limits an internet plan.", h1: "Bottlenecks", lede: "The first low required link matters more than the fastest label elsewhere in the network.", crumbs: homeCrumb, updated,
    body: pageCards([
      { href: "/tools/internet-plan-bottleneck-finder/", eyebrow: "Tool", title: "Internet-Plan Bottleneck Finder", text: "Compare every required link against the plan tier.", action: "Open tool" },
      { href: "/guides/wan-lan-port-speeds/", eyebrow: "Guide", title: "WAN and LAN port speeds", text: "Read the port chain behind gigabit and multi-gig service.", action: "Read guide" },
      { href: "/guides/router-for-multigig-plan/", eyebrow: "Guide", title: "Router for a multi-gig plan", text: "Know which links need more than 1 GbE before buying.", action: "Read guide" },
    ]),
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
    body: `<h2>The four roles</h2><p>A <strong>modem</strong> converts a cable or legacy phone-line signal into an Ethernet service handoff. An <strong>ONT</strong> terminates fiber service. A <strong>router</strong> creates the boundary between the provider-facing connection and the home network, then handles routing, NAT, DHCP, and often firewall policy. A <strong>wireless access point</strong> supplies Wi-Fi. A gateway combines several of these roles in one provider or retail device.</p><h2>Why identification matters</h2><p>Replacing “the router” may accidentally replace a modem-router gateway that the provider must approve. Adding a second router behind a gateway may create two routing layers. Adding a mesh unit in access-point mode is different from asking it to become the only router.</p><h2>Read the physical path</h2><ol><li>Find the cable, fiber ONT, or fixed-wireless gateway where service enters.</li><li>Trace the Ethernet cable to the device providing routing.</li><li>Trace any switches, access points, mesh nodes, and adapters to the affected client.</li><li>Record exact labels and port rates before changing a mode.</li></ol><div class="callout"><p>Use the <a href="/tools/network-compatibility-planner/">whole-network planner</a> after each role is clear.</p></div>`,
  },
  {
    slug: "use-your-own-router",
    title: "Can You Use Your Own Router? Separate Permission From Topology",
    seoTitle: "Can You Use Your Own Router? — HomeNet Fit",
    description: "Decide whether a customer-owned router replaces provider equipment or operates behind a required gateway.",
    lede: "“Use my own router” can mean three different network arrangements.",
    sourceIds: ["xfinity-approved-equipment", "spectrum-router-handoff", "cox-own-equipment", "att-ip-passthrough", "tmobile-connect", "verizon-fios-agreement"],
    body: `<h2>Three arrangements</h2><p>The cleanest arrangement gives one device the routing role. On cable service, an approved modem can hand Ethernet directly to a customer router. On some fiber and fixed-wireless services, the provider gateway stays and a customer router connects downstream. A third option runs the customer device in access-point mode so the provider gateway remains the only router.</p><h2>Questions to answer first</h2><ul><li>Does the provider require its gateway for service authentication or delivery?</li><li>Does the gateway provide bridge mode, IP passthrough, or neither?</li><li>Do provider TV or voice services depend on its hardware?</li><li>Can every WAN and LAN port carry the purchased tier?</li><li>Which device should provide DHCP and routing?</li></ul><h2>Avoid buying before the role is clear</h2><p>A faster third-party router cannot replace a required provider gateway by itself. It may still improve controls, ports, Wi-Fi, or coverage when connected in a supported arrangement. The useful question is not only whether the router works, but which role it is allowed to own.</p><div class="callout"><p>Check the current provider rule in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>.</p></div>`,
  },
  {
    slug: "approved-modem-lists",
    title: "How to Read an ISP Approved-Modem List Without Buying the Wrong Model",
    seoTitle: "How to Read an ISP Approved-Modem List — HomeNet Fit",
    description: "Use ISP approved-device tools correctly by checking address, speed tier, voice service, model, and revision.",
    lede: "A brand name or DOCSIS label alone does not prove current provider approval.",
    sourceIds: ["xfinity-device-info", "spectrum-authorized-modems", "cox-certified-modems"],
    body: `<h2>Check the exact identity</h2><p>Match the full model number and any hardware revision printed on the device label. A nearby model in the same retail family is not evidence. Used provider-owned or prepaid equipment can also carry restrictions that a compatible retail model does not.</p><h2>Check the selected service</h2><p>Provider tools may filter by address, available tier, and voice support. A modem approved for a slower plan may not be recommended for a faster tier. A data-only cable modem does not become a voice device because the product family has another voice-capable version.</p><h2>Use the provider result as the final activation gate</h2><p>HomeNet Fit can explain the rule and preserve reviewed records, but a provider controls current activation eligibility. Save the official result and recheck immediately before purchase when the list is dynamic.</p><table><thead><tr><th>Layer</th><th>What must match</th></tr></thead><tbody><tr><td data-label="Layer">Provider</td><td data-label="What must match">Correct network and service area</td></tr><tr><td data-label="Layer">Service</td><td data-label="What must match">Tier, Internet, Voice, and other required features</td></tr><tr><td data-label="Layer">Hardware</td><td data-label="What must match">Exact model and revision</td></tr><tr><td data-label="Layer">Date</td><td data-label="What must match">Current result, not an old retail screenshot</td></tr></tbody></table><div class="callout"><p>The <a href="/tools/isp-equipment-checker/">ISP checker</a> returns unknown when this exact confirmation is missing.</p></div>`,
  },
  {
    slug: "router-for-multigig-plan",
    title: "What a Router Needs for a 1.2, 2, or 5 Gbps Internet Plan",
    seoTitle: "Router Requirements for Multi-Gig Internet — HomeNet Fit",
    description: "Map the WAN, LAN, switch, adapter, cable, and client links required to use a multi-gig internet tier.",
    lede: "A multi-gig WAN label is not enough. The useful path must stay multi-gig after the router too.",
    sourceIds: ["netgear-multigig-ports"],
    body: `<h2>Follow one device path</h2><p>The service handoff enters the router through its WAN port. Traffic then leaves through a LAN port or wireless radio, may cross a switch or access point, and ends at a client interface. The lowest required link limits that client.</p><h2>Common 1 GbE trap</h2><p>A router can advertise a 2.5 GbE WAN port while providing only 1 GbE LAN ports. That may distribute more than one gigabit across several clients, but no single wired client on a 1 GbE LAN port receives the entire faster tier. This is not automatically a problem; it depends on the goal.</p><h2>Before replacing anything</h2><ol><li>Name the client that actually needs more than one gigabit.</li><li>Check the gateway and router handoff.</li><li>Check the exact LAN port used.</li><li>Include switches, docks, USB adapters, and client NICs.</li><li>Decide whether aggregate household capacity already solves the real problem.</li></ol><div class="callout"><p>Enter the chain in the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a>.</p></div>`,
  },
  {
    slug: "wan-lan-port-speeds",
    title: "WAN vs. LAN Port Speeds: Find the Quiet 1 GbE Limit",
    seoTitle: "WAN vs. LAN Port Speeds — HomeNet Fit",
    description: "Understand WAN, LAN, switch, adapter, and client Ethernet port rates, then find the quiet 1 GbE limit in a faster home-network path.",
    lede: "The direction label and speed label answer different questions.",
    sourceIds: ["netgear-multigig-ports"],
    body: `<h2>WAN receives the upstream connection</h2><p>The router WAN port connects toward the modem, gateway, or ONT. It must carry the desired service handoff. A 100 Mbps WAN port clearly limits a gigabit plan; a 1 GbE WAN port similarly limits a faster multi-gig tier.</p><h2>LAN delivers service downstream</h2><p>LAN ports connect clients, switches, and access points. One multi-gig WAN port does not imply every LAN port is multi-gig. Read the device specification and the label beside the exact physical port.</p><h2>Negotiation can fall below the label</h2><p>Ethernet chooses a common rate between both endpoints across the installed cable. A damaged pair, incompatible adapter, power-saving setting, or lower-rate device can produce a 100 Mbps or 1 Gbps negotiated link even when another component supports more.</p><table><thead><tr><th>Rate label</th><th>Planning meaning</th></tr></thead><tbody><tr><td data-label="Rate label">Fast Ethernet</td><td data-label="Planning meaning">100 Mbps line rate</td></tr><tr><td data-label="Rate label">Gigabit / 1 GbE</td><td data-label="Planning meaning">1,000 Mbps line rate</td></tr><tr><td data-label="Rate label">2.5 GbE</td><td data-label="Planning meaning">2,500 Mbps line rate</td></tr><tr><td data-label="Rate label">5 GbE</td><td data-label="Planning meaning">5,000 Mbps line rate</td></tr><tr><td data-label="Rate label">10 GbE</td><td data-label="Planning meaning">10,000 Mbps line rate</td></tr></tbody></table><div class="callout"><p>Compare the full path in the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a>.</p></div>`,
  },
  {
    slug: "home-network-upgrade-order",
    title: "Home Network Upgrade Order: Test Before You Replace",
    seoTitle: "Home Network Upgrade Order — HomeNet Fit",
    description: "Diagnose a home-network problem in dependency order and avoid upgrades blocked by an earlier limiter.",
    lede: "The cheapest useful change is often a test, setting, port, or cable—not a new router.",
    sourceIds: ["netgear-multigig-ports"],
    body: `<h2>1. Define one problem</h2><p>Name the affected device, place, application, and time. “My internet is slow” mixes provider outages, one wired link, Wi-Fi coverage, client limits, and remote-server behavior into one vague symptom.</p><h2>2. Establish a wired control</h2><p>Test a capable computer by Ethernet at the nearest useful upstream point. Confirm its negotiated rate. Repeat tests rather than treating one result as a guarantee.</p><h2>3. Add one link at a time</h2><p>Move through gateway, router, switch, cable, access point, and client. The first point where capability or observed behavior falls is more useful than the fastest label anywhere else.</p><h2>4. Apply the cheapest intervention order</h2><ol><li>Keep equipment that meets the need.</li><li>Correct a mode, port selection, firmware, or configuration.</li><li>Replace a damaged or lower-rate cable or adapter.</li><li>Add a wired access point, switch, or backhaul only when the path requires it.</li><li>Replace the router, mesh, or gateway last, after proving it owns the limitation.</li></ol><div class="callout"><p>Build the sequence with the <a href="/tools/network-compatibility-planner/">whole-network planner</a>.</p></div>`,
  },
  {
    slug: "xfinity-owned-equipment",
    title: "Using Your Own Modem and Router With Xfinity",
    seoTitle: "Use Your Own Modem or Router With Xfinity — HomeNet Fit",
    description: "Separate Xfinity modem approval from router compatibility, speed-tier limits, Voice support, and gateway-only features.",
    lede: "Xfinity allows customer-owned equipment, but a general policy never approves a particular modem.",
    sourceIds: ["xfinity-approved-equipment", "xfinity-device-info"],
    body: `<h2>Direct answer</h2><p>You can use your own router with a supported Xfinity modem or gateway. You can also use your own cable modem, but only after Xfinity's current Device Info tool accepts the exact model for your address, internet tier, and services. HomeNet Fit therefore treats the router arrangement as supported and the modem model as unknown until that final check is completed.</p><h2>Choose the arrangement before the hardware</h2><table><thead><tr><th>Goal</th><th>Required path</th><th>Main condition</th></tr></thead><tbody><tr><td data-label="Goal">Own router only</td><td data-label="Required path">Xfinity gateway or approved modem → router WAN</td><td data-label="Main condition">Router ports must carry the chosen tier</td></tr><tr><td data-label="Goal">Own modem only</td><td data-label="Required path">Coax → approved retail modem or gateway</td><td data-label="Main condition">Exact model, address, tier, and services must match</td></tr><tr><td data-label="Goal">Own modem and router</td><td data-label="Required path">Coax → approved modem → router WAN</td><td data-label="Main condition">Modem approval comes first; then verify Ethernet rates</td></tr></tbody></table><h2>Why the model check comes first</h2><p>Retail packaging can say “works with Xfinity” while the provider's current database applies a narrower answer. Speed tiers change. Voice service needs can differ from internet-only service. Model suffixes and hardware revisions can matter. A used unit can also create an activation problem even when the underlying model is supported. Match the complete label and use Xfinity's live result, not a retailer badge or an old screenshot.</p><h2>Then check the Ethernet path</h2><p>An approved modem does not prove the selected device can use the full plan. Follow the connection from the modem Ethernet port through the router WAN port, router LAN or Wi-Fi link, and client interface. A 1 GbE link can be the useful limit on a faster tier even when the modem is approved.</p><h2>Features that do not transfer</h2><p>Customer equipment does not automatically receive gateway-only management, security, hotspot, or hardware-upgrade features. That does not make the arrangement wrong; it means the ownership tradeoff belongs in the decision.</p><div class="callout"><p><strong>Next step:</strong> use the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a> for the policy result, then the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a> for the port path.</p></div>`,
  },
  {
    slug: "spectrum-owned-equipment",
    title: "Using Your Own Modem and Router With Spectrum",
    seoTitle: "Use Your Own Modem or Router With Spectrum — HomeNet Fit",
    description: "Check Spectrum's authorized-modem gate, customer-router handoff, tier limits, support boundary, and voice-service unknowns.",
    lede: "A customer router is straightforward; a customer modem still needs exact authorization.",
    sourceIds: ["spectrum-authorized-modems", "spectrum-router-handoff"],
    body: `<h2>Direct answer</h2><p>You can connect your own router directly to a Spectrum modem. You can use a retail cable modem only when Spectrum's current authorized list includes the exact model for the relevant service. HomeNet Fit does not convert “DOCSIS 3.1” or a retailer compatibility badge into approval.</p><h2>Separate the modem decision from the Wi-Fi decision</h2><p>Spectrum currently supplies modem and router functions as separate equipment in the arrangement reviewed here. That creates two independent choices: keep or replace the cable modem, then keep or replace the routing and Wi-Fi device. A customer router can connect to either an authorized customer modem or the Spectrum modem's Ethernet handoff.</p><table><thead><tr><th>Layer</th><th>Evidence needed</th><th>Safe result without it</th></tr></thead><tbody><tr><td data-label="Layer">Cable modem</td><td data-label="Evidence needed">Exact model on Spectrum's current authorized list</td><td data-label="Safe result without it">Unknown</td></tr><tr><td data-label="Layer">Internet tier</td><td data-label="Evidence needed">Model supports the selected tier at the address</td><td data-label="Safe result without it">Unknown</td></tr><tr><td data-label="Layer">Router</td><td data-label="Evidence needed">WAN/LAN rates and supported Ethernet handoff</td><td data-label="Safe result without it">Compatible or limited by ports</td></tr><tr><td data-label="Layer">Voice service</td><td data-label="Evidence needed">Current Spectrum voice-equipment path</td><td data-label="Safe result without it">Unknown</td></tr></tbody></table><h2>Avoid accidental double routing</h2><p>Connect the customer router WAN port to a modem-only Ethernet handoff. If a gateway or another router remains upstream, decide which device owns routing, NAT, and DHCP. Adding a second router without a defined topology can produce double NAT even when basic browsing still works.</p><h2>Check support expectations</h2><p>Spectrum can support its network and supplied equipment, while administration of a customer router remains the owner's responsibility. Record the original working cable path before replacing anything so it can be restored during troubleshooting.</p><div class="callout"><p><strong>Next step:</strong> check the arrangement in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>. Verify the exact modem on Spectrum's linked official page before spending money.</p></div>`,
  },
  {
    slug: "cox-owned-equipment",
    title: "Using Your Own Modem and Router With Cox Cable Internet",
    seoTitle: "Use Your Own Modem or Router With Cox — HomeNet Fit",
    description: "Check Cox cable-modem certification, speed-tier support, used-device activation, router handoff, and lost Panoramic WiFi features.",
    lede: "Cox permits retail cable equipment, but certification, tier, account status, and support still matter.",
    sourceIds: ["cox-own-equipment", "cox-certified-modems"],
    body: `<h2>Direct answer</h2><p>You can use your own cable modem with Cox when the exact model is currently certified for the network and selected speed tier. If that modem does not include routing and Wi-Fi, connect a separate customer-owned router. This page covers Cox cable service; it does not generalize the cable-modem rule to a Cox fiber handoff.</p><h2>Four checks before buying</h2><ol><li>Find the complete model number on Cox's certified-modem list.</li><li>Confirm that Cox lists it for the speed tier you intend to use.</li><li>For a used modem, confirm it is no longer attached to another account.</li><li>Check the modem Ethernet port, router WAN/LAN ports, and target client path against the tier.</li></ol><table><thead><tr><th>Question</th><th>Answer layer</th><th>HomeNet Fit state</th></tr></thead><tbody><tr><td data-label="Question">Does Cox permit retail cable modems?</td><td data-label="Answer layer">Provider policy</td><td data-label="HomeNet Fit state">Conditional</td></tr><tr><td data-label="Question">Is this exact modem approved?</td><td data-label="Answer layer">Current certified-device list</td><td data-label="HomeNet Fit state">Unknown until checked</td></tr><tr><td data-label="Question">Can a separate router be used?</td><td data-label="Answer layer">Ethernet topology</td><td data-label="HomeNet Fit state">Compatible behind supported modem</td></tr><tr><td data-label="Question">Will Cox support the retail router?</td><td data-label="Answer layer">Support boundary</td><td data-label="HomeNet Fit state">No provider equipment support assumed</td></tr></tbody></table><h2>Know what leaves with Panoramic WiFi</h2><p>Cox's current guidance ties Panoramic WiFi app management, Advanced Security, and its provider equipment upgrade commitment to the Panoramic service. Owning hardware may still be the right choice, but compare those operational features instead of treating rental cost as the only difference.</p><h2>Voice service remains a separate check</h2><p>The current local rule does not verify customer-owned voice equipment. If Cox Voice is active, preserve unknown and confirm the voice path directly with Cox before changing the modem or gateway.</p><div class="callout"><p><strong>Next step:</strong> run the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>, then enter every Ethernet link in the <a href="/tools/internet-plan-bottleneck-finder/">bottleneck finder</a>.</p></div>`,
  },
  {
    slug: "att-fiber-own-router",
    title: "Using Your Own Router With AT&T Fiber",
    seoTitle: "Use Your Own Router With AT&T Fiber — HomeNet Fit",
    description: "Keep the required AT&T gateway, understand IP Passthrough, avoid duplicate routing, and verify multi-gig ports before adding a router.",
    lede: "Your router can operate downstream, but it does not replace the AT&T Fiber gateway.",
    sourceIds: ["att-gateway", "att-ip-passthrough"],
    body: `<h2>Direct answer</h2><p>You can use a customer-owned router behind the AT&T-provided gateway. The reviewed AT&T guidance does not support replacing that gateway with a retail modem or gateway. Supported BGW gateways document IP Passthrough for one downstream device when that is the intended topology.</p><h2>Pick one routing design</h2><table><thead><tr><th>Design</th><th>Routing owner</th><th>Main tradeoff</th></tr></thead><tbody><tr><td data-label="Design">AT&T gateway only</td><td data-label="Routing owner">AT&T gateway</td><td data-label="Main tradeoff">Simplest provider-supported path</td></tr><tr><td data-label="Design">Own router in access-point mode</td><td data-label="Routing owner">AT&T gateway</td><td data-label="Main tradeoff">Adds Wi-Fi or ports without moving routing</td></tr><tr><td data-label="Design">Own router with IP Passthrough</td><td data-label="Routing owner">Customer router for the downstream network</td><td data-label="Main tradeoff">Gateway stays in path; setup and support are split</td></tr><tr><td data-label="Design">Retail modem replaces gateway</td><td data-label="Routing owner">Unsupported proposal</td><td data-label="Main tradeoff">Incompatible with the reviewed rule</td></tr></tbody></table><h2>IP Passthrough is not physical removal</h2><p>IP Passthrough changes how the AT&T gateway assigns the public-facing address to one downstream device. The gateway remains connected to AT&T Fiber. Follow the procedure for the exact BGW model; do not use instructions for a nearby gateway or assume every firmware screen is identical.</p><h2>Check the ports after topology</h2><p>A correct mode can still leave a speed limit. For a multi-gig tier, verify the exact gateway LAN port used, the customer router WAN port, its downstream LAN or Wi-Fi path, and the client interface. Moving routing responsibility cannot make a 1 GbE port carry a 2 Gbps line rate.</p><h2>Make rollback easy</h2><p>Save the current gateway settings and cable positions. Change one layer at a time. If service fails, reconnect a client to the gateway and verify the provider path before debugging the customer router.</p><div class="callout"><p><strong>Next step:</strong> select AT&amp;T Fiber and “my own router” in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>, then model the downstream ports.</p></div>`,
  },
  {
    slug: "verizon-fios-own-router",
    title: "Using Your Own Router With Verizon Fios",
    seoTitle: "Use Your Own Router With Verizon Fios — HomeNet Fit",
    description: "Identify the Fios ONT and Ethernet handoff, remove the modem assumption, and preserve Verizon TV and managed-feature conditions.",
    lede: "Fios terminates at an ONT, not a cable modem; the router decision begins after that handoff.",
    sourceIds: ["verizon-fios-ont", "verizon-fios-install", "verizon-fios-agreement", "verizon-fios-tv-home"],
    body: `<h2>Direct answer</h2><p>A retail cable or DSL modem does not replace Verizon's Optical Network Terminal. A customer-owned router can use the ONT's provisioned Ethernet handoff, but the answer becomes conditional when Fios TV, Verizon extenders, parental controls, or other managed router features are part of the setup.</p><h2>Start at the ONT</h2><p>The ONT converts the incoming fiber signal into service handoffs for data, TV, and voice. Keep it powered and installed. For a customer router, confirm that internet service is provisioned over the ONT Ethernet output and connect that cable to the router WAN port. Do not open or alter provider fiber equipment.</p><table><thead><tr><th>Service case</th><th>Customer router result</th><th>Required check</th></tr></thead><tbody><tr><td data-label="Service case">Internet with Ethernet ONT handoff</td><td data-label="Customer router result">Conditional</td><td data-label="Required check">WAN rate, DHCP handoff, and support boundary</td></tr><tr><td data-label="Service case">Fios TV set-top boxes or TV Home app</td><td data-label="Customer router result">Unknown until TV topology is checked</td><td data-label="Required check">Compatible Fios router and MoCA/streaming dependencies</td></tr><tr><td data-label="Service case">Verizon extender or managed controls</td><td data-label="Customer router result">Feature loss possible</td><td data-label="Required check">Exact Verizon router and extender requirements</td></tr><tr><td data-label="Service case">Retail modem replacing ONT</td><td data-label="Customer router result">Incompatible</td><td data-label="Required check">Keep the ONT</td></tr></tbody></table><h2>Why TV changes the answer</h2><p>Verizon's current agreement states that streaming through a Verizon set-top box requires a compatible Fios router. Its TV Home guidance also says non-Verizon routers cannot provide every app function and warns that some multiple-router arrangements can block streaming or automatic pairing. HomeNet Fit therefore returns unknown when TV is selected instead of approving an internet-only topology.</p><h2>Check rate and support separately</h2><p>A router may establish internet service yet still limit a faster tier through its WAN, LAN, switch, or client port. Verizon can verify the Fios handoff and its equipment; troubleshooting a third-party router remains separate.</p><div class="callout"><p><strong>Next step:</strong> use the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>. Select the TV option when applicable so the result does not hide that dependency.</p></div>`,
  },
  {
    slug: "tmobile-home-internet-mesh",
    title: "Using a Router or Mesh With T-Mobile Home Internet",
    seoTitle: "Router or Mesh With T-Mobile Home Internet — HomeNet Fit",
    description: "Keep the T-Mobile gateway, connect a router or Wi-Fi 6 mesh by Ethernet, and understand bridge-mode, NAT, and control limits.",
    lede: "A router or mesh can sit behind the gateway; it cannot turn the gateway into bridge mode.",
    sourceIds: ["tmobile-connect"],
    body: `<h2>Direct answer</h2><p>You can connect a third-party router or Wi-Fi 6 mesh system to the T-Mobile Home Internet gateway by Ethernet. You cannot replace the gateway with a retail modem, and T-Mobile's current guidance says the gateway does not offer bridge mode.</p><h2>Choose the downstream role</h2><table><thead><tr><th>Goal</th><th>Arrangement</th><th>Condition</th></tr></thead><tbody><tr><td data-label="Goal">Add coverage with minimal routing change</td><td data-label="Arrangement">Mesh or router in access-point mode</td><td data-label="Condition">Gateway remains the routing device</td></tr><tr><td data-label="Goal">Use customer-router controls</td><td data-label="Arrangement">Router WAN connected to gateway Ethernet</td><td data-label="Condition">T-Mobile gateway still routes; double NAT may remain</td></tr><tr><td data-label="Goal">Replace the T-Mobile gateway</td><td data-label="Arrangement">Retail modem or gateway</td><td data-label="Condition">Incompatible with the reviewed rule</td></tr><tr><td data-label="Goal">Bridge the T-Mobile gateway</td><td data-label="Arrangement">Bridge-mode request</td><td data-label="Condition">Not available in current official guidance</td></tr></tbody></table><h2>Double NAT is a condition, not an automatic failure</h2><p>Ordinary browsing and streaming may still work when both the T-Mobile gateway and downstream router perform NAT. Applications that need inbound connections, strict NAT behavior, or certain VPN and gaming arrangements may not. The site should describe that limitation without promising a setting the gateway does not expose.</p><h2>Reduce competing Wi-Fi when appropriate</h2><p>T-Mobile documents managing the gateway Wi-Fi through the T-Life app. If the downstream mesh provides the home's Wi-Fi, decide whether the gateway radio should remain active. Keep the gateway reachable for provider management and restore steps.</p><h2>Do not promise a speed from the mesh label</h2><p>Fixed-wireless conditions vary before traffic reaches the home network. A new mesh cannot fix tower load, signal quality, or a provider-side limit. Compare a wired gateway test with the downstream path before buying more nodes.</p><div class="callout"><p><strong>Next step:</strong> check the required gateway arrangement in the <a href="/tools/isp-equipment-checker/">ISP equipment checker</a>, then use the <a href="/tools/network-compatibility-planner/">whole-network planner</a> to model the downstream path.</p></div>`,
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
  body: pageCards(guides.map((guide) => ({ href: `/guides/${guide.slug}/`, eyebrow: "Guide", title: guide.title, text: guide.lede, action: "Read guide" }))),
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
    body: `<article class="prose"><h2>September 14, 2026</h2><ul><li>Created the local static foundation.</li><li>Added Tools 1–3 with shared deterministic logic.</li><li>Expanded coverage to Xfinity, Spectrum, Cox cable, AT&amp;T Fiber, Verizon Fios, and T-Mobile Home Internet.</li><li>Expanded the guide library from six to twelve substantive pages.</li><li>Recorded passing 85/100 publication gates for all three tools and twelve guides.</li><li>Kept all pages noindex pending separate deployment and publication review.</li></ul></article>`,
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

const pages: PageSpec[] = [
  home,
  toolsIndex,
  plannerPage,
  bottleneckPage,
  ispPage,
  ...categoryPages,
  guidesIndex,
  ...guidePages,
  ...trustPages,
  notFound,
];

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
await write(join(out, "_headers"), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'\n${BUILD_MODE === "local" ? "  X-Robots-Tag: noindex, nofollow\n" : ""}\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
await write(join(out, "build-manifest.json"), JSON.stringify({
  site: "HomeNet Fit",
  mode: BUILD_MODE,
  generatedAt: new Date().toISOString(),
  pages: pages.length,
  tools: 3,
  guides: guides.length,
  providerRuleSets: 3,
  indexablePages: BUILD_MODE === "production" ? pages.filter((page) => page.indexable).length : 0,
}, null, 2) + "\n");

console.log(`Built ${pages.length} pages, 3 tools, and ${guides.length} guides in ${BUILD_MODE} mode.`);
