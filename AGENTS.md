# HomeNet Fit — Consumer home-network compatibility utility site

## Purpose

Build the source-backed HomeNet Fit static site and deterministic tools that show what works together, where a network path is limited, and what to change first.

## Boundaries

- Owns this project's source data, decision logic, tests, static generator, and generated `site/` output.
- Must not deploy, purchase a domain, apply to AdSense, start a service, or activate shared/paused automations without separate approval.
- May reuse patterns from shared Zo systems, but must not modify ACE, Hermes Mission Control, Fiction Studio, Roughdraft Studio, or Preflight Bench.

## Rules

- `PREBUILD_PLAN.md` is the approved product and design contract.
- Initial build scope is Tools 1–3. Tools 4–10 remain planned.
- Compatibility states are `compatible`, `conditional`, `incompatible`, or `unknown`.
- Missing, conflicting, model-specific, or stale evidence returns `unknown`; never infer approval from a related model.
- Tool 2 owns path-ceiling math. Tool 3 owns ISP rules. Tool 1 composes both without duplicating either.
- Official provider/manufacturer/standards sources outrank secondary sources.
- Current provider coverage is Xfinity cable, Spectrum cable, Cox cable, AT&T Fiber, Verizon Fios, and T-Mobile Home Internet.
- Every tool and guide must have a recorded publishing score of at least 85/100 with no blocking defect.
- Default build is local and globally `noindex`; production mode is not authorization to deploy.
- No paid API calls, visitor accounts, remote scans, affiliate rankings, or precise Wi-Fi throughput promises.

## How to Verify

```bash
bun test
bun run build
bun run verify
```

Then inspect desktop, 360px mobile, and effective 200% zoom renders for all three tool pages and sample provider guides.

## Child DOX Index

No child docs.

Parent rail: `../AGENTS.md`
