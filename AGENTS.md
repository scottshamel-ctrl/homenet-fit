# HomeNet Fit — Consumer home-network compatibility utility site

## Purpose

Build the source-backed HomeNet Fit static site and deterministic tools that show what works together, where a network path is limited, and what to change first.

## Boundaries

- Owns this project's source data, decision logic, tests, static generator, and generated `site/` output.
- Must not deploy, purchase a domain, apply to AdSense, start a service, or activate shared/paused automations without separate approval.
- May reuse patterns from shared Zo systems, but must not modify ACE, Hermes Mission Control, Fiction Studio, Roughdraft Studio, or Preflight Bench.

## Rules

- `PREBUILD_PLAN.md` is the approved product and design contract. Its §9 correction note supersedes the original Search Console gate.
- Tool count is capped at six while the site is local. No seventh tool without Search Console query evidence, which requires deployment.
- The §19 launch floor is met: six tools and twenty supporting guides. Further guides are also gated on query evidence; do not keep adding pages to hit a bigger number.
- Every guide body must link out to at least two distinct internal destinations, per §12, with at least one link in the prose rather than the closing callout. All twenty comply; `verify-site.ts` enforces both conditions.
- Report plan-conflict resolutions when they are made, not when asked. Deciding is in scope; deciding silently is not.
- Built tools, in build order: 1 (whole-network planner), 2 (bottleneck finder), 3 (ISP equipment checker), 4 (Ethernet link checker), 5 (router topology planner), 6 (mesh compatibility checker).
- Build order is not `PREBUILD_PLAN.md` numbering. Built 4 = plan Tool 7, built 5 = plan Tool 8, built 6 = plan Tool 4. Still unbuilt: plan Tools 5 (Wi-Fi client capability), 6 (MoCA), 9 (mesh placement), 10 (upgrade priority).
- Compatibility states are `compatible`, `conditional`, `incompatible`, or `unknown`.
- Missing, conflicting, model-specific, or stale evidence returns `unknown`; never infer approval from a related model.
- Tool 2 owns path-ceiling math. Tool 3 owns ISP rules. Tool 1 composes both without duplicating either.
- Tool 4 owns single-segment cable/port/adapter rules and the negotiation-gap diagnosis. Tool 5 owns gateway topology and reuses Tool 3's provider result rather than restating it. Tool 6 owns mesh-family pairing and always returns an access-point fallback instead of a dead end.
- Mesh pairing is per system, not per brand. Same-vendor families that document no cross-pairing (Orbi series, Nest Wifi Pro vs. Nest Wifi, Deco vs. OneMesh) stay `incompatible`; unlisted hardware stays `unknown`.
- Cable ceilings come from the approved IEEE 802.3 objectives: Cat5e 2.5G, Cat6 5G, Cat6a 10G to 100 m. Do not promote a distance-limited or deployment-specific case to a verified ceiling.
- Result headers use a short status chip plus a distinct sentence; never repeat the same string in both.
- `pageCards` takes `"h2"` when cards sit directly under the page H1, so heading order never skips a level.
- Official provider/manufacturer/standards sources outrank secondary sources.
- Current provider coverage is Xfinity cable, Spectrum cable, Cox cable, AT&T Fiber, Verizon Fios, and T-Mobile Home Internet.
- Every tool and guide must have a recorded publishing score of at least 85/100 with no blocking defect.
- Default build is local and globally `noindex`; production mode is not authorization to deploy.
- Production indexes 40 of 42 pages. `NOINDEX_PATHS` in `build-site.ts` and `verify-site.ts` must stay in sync and currently holds `/404.html` and `/contact/`. Index `/contact/` once a real inbox exists.
- `verify-site.ts` reads `build-manifest.json` for the mode and checks both. Run it after a production build too; a local-only pass proves nothing about what would ship.
- `DEPLOYMENT.md` is the launch runbook. Step 1 (repository) is executed; steps 2–8 are not.
- The deploy repository is `github.com/scottshamel-ctrl/homenet-fit` (private, project at root). `/home/workspace` stays the source of truth; re-sync with `git subtree push --prefix=Projects/homenet-fit <url> main` after each commit. Never connect `/home/workspace` to Cloudflare Pages — it carries Roughdraft prospect data.
- `BUILD_MODE=production` is set inline by the `deploy:build` script, never as a Cloudflare dashboard variable, so production mode cannot be lost by editing dashboard state.
- There is deliberately no `wrangler.jsonc` (it configures Functions, which this site has no) and no `_redirects` (Pages handles the extensionless/trailing-slash cases, and `_redirects` cannot express the `www` → apex rule; that is a Bulk Redirect).
- The CSP comes from `contentSecurityPolicy()` in `lib/render.ts`. The default blocks Cloudflare's analytics beacon; `ANALYTICS=cloudflare` widens it, and `verify-site.ts` fails when the manifest setting and the header disagree either way. Add future ad or analytics hosts through that function behind a flag, never by hand-editing the header string.
- `homenetfit.com` was unregistered on 2026-09-17. The origin is hardcoded in canonicals, sitemap, and JSON-LD; a different domain requires a rebuild with `SITE_ORIGIN`, not a DNS change.
- No paid API calls, visitor accounts, remote scans, affiliate rankings, or precise Wi-Fi throughput promises.

## How to Verify

```bash
bun test
bun run build
bun run verify
```

Then inspect desktop, 360px mobile, and effective 200% zoom renders for all six tool pages and sample guides, exercising every result state (compatible, conditional, incompatible, unknown, invalid input).

## Child DOX Index

No child docs.

Parent rail: `../AGENTS.md`
