# HomeNet Fit

Six deterministic tools that answer one question for U.S. home-network owners: **will this equipment actually work together, and what is holding my speed back?**

People pay for a 1 Gbps plan and get 300 Mbps. Is the cause the modem, a Cat5 cable, a 100 Mbps switch port, double NAT, or a mesh node that can't pair with the old one? Most advice online guesses. HomeNet Fit only answers from cited evidence, and says `unknown` when the evidence isn't there.

**Stack:** TypeScript, Bun, zero runtime dependencies, framework-free static site. 61 unit tests, 42 generated pages, 35 cited sources.

## The tools

| Tool | What it decides |
|---|---|
| Whole-Network Planner | Composes the tools below into one upgrade plan without duplicating their logic |
| Bottleneck Finder | The lowest verified link in the path from the ISP to the device, including ties and unknown links |
| ISP Equipment Checker | Whether you can use your own modem or router on Xfinity, Spectrum, Cox, AT&T Fiber, Verizon Fios, or T-Mobile Home Internet |
| Ethernet Link Checker | Cable category × port × adapter ceilings, and the gap when a link negotiates below its rating |
| Router Topology Planner | Bridge mode, access-point mode, and double-NAT diagnosis |
| Mesh Compatibility Checker | Which mesh systems can pair, with an access-point fallback instead of a dead end |

## Engineering decisions worth looking at

**`unknown` is a first-class answer.** Every result is `compatible`, `conditional`, `incompatible`, or `unknown`. Missing, conflicting, stale, or model-specific evidence returns `unknown`. The code never infers approval from a related model. A confident wrong answer about ISP equipment costs a user a return shipment or a service call, so the tools refuse to guess. See `lib/contracts.ts`.

**Rules are data, and every rule cites a source.** ISP policies, mesh-pairing families, and topology profiles live in versioned JSON (`data/`). Each source record carries a retrieval date and a next-review date, so stale evidence can be detected instead of silently trusted. Official provider, manufacturer, and standards sources outrank secondary ones. Cable ceilings come from IEEE 802.3 objectives, not forum posts.

**One owner per rule.** The bottleneck finder owns path-ceiling math. The ISP checker owns provider rules. The planner composes both and restates neither, so a policy change is a one-file edit.

**Mesh pairing is per system, not per brand.** Same-vendor families that don't cross-pair (Orbi series, Nest Wifi Pro vs. Nest Wifi, Deco vs. OneMesh) stay `incompatible`. "It's the same brand" is exactly the assumption that leaves people with hardware that won't work together.

**The build verifies what would ship.** `scripts/verify-site.ts` checks every generated page for index and noindex correctness, internal-link depth, content depth, CSP compatibility, and per-page JavaScript budgets. It reads the build manifest, so a production build is checked against production rules. It became mode-aware after a real bug: an `indexable` flag was declared and read but never assigned, so the production build shipped all 42 pages as `noindex` with an empty sitemap, while the local-only check still passed.

**No tracking by default.** Tool inputs stay in the browser tab. The Content Security Policy is generated in one function (`contentSecurityPolicy()` in `lib/render.ts`), and the verifier fails if the CSP and the analytics setting disagree.

## Layout

```
lib/       decision logic (pure functions, fully unit-tested)
data/      versioned rules + cited sources
src/       framework-free browser UI for each tool
scripts/   static site generator + post-build verifier
tests/     61 tests across the six tools
```

## Run it

```bash
bun test          # 61 tests
bun run build     # local build (every page noindex)
bun run verify    # verify the generated site
bun run preview   # http://127.0.0.1:4173
```

`bun run build:production` builds with production index rules. It doesn't deploy anything.

## Status

Feature-complete for launch: six tools, twenty supporting guides, and a publishing-quality score of at least 85/100 recorded for every page. Not yet deployed.
