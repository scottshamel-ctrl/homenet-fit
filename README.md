# HomeNet Fit

Local, no-spend foundation for a source-backed U.S. home-network compatibility and upgrade-planning site.

Implemented:

- Whole-Network Compatibility and Upgrade Planner
- Internet-Plan Bottleneck Finder
- ISP Modem and Own-Router Checker
- Ethernet Cable, Port, and Adapter Link Checker
- Router Topology Planner for bridge mode, access-point mode, and double NAT
- Mesh-Family Compatibility Checker with an access-point fallback for unsupported pairings
- Static, crawlable page generation with framework-free browser interactions
- Versioned ISP rules and evidence records
- Local-build `noindex` controls, sitemap, robots file, trust pages, and twenty supporting guides
- Reviewed rules for Xfinity, Spectrum, Cox cable, AT&T Fiber, Verizon Fios, and T-Mobile Home Internet
- Reviewed mesh-pairing records from eero, NETGEAR, TP-Link, ASUS, Google, and the Wi-Fi Alliance
- Reviewed Wi-Fi generation, Windows/Intel 6 GHz prerequisite, and USB bus-rate records for the client-side guides
- Recorded 85/100 publication gates for every tool and guide page
- Unit tests and generated-site verification

## Run locally

```bash
bun test
bun run build
bun run verify
bun run preview
```

Open `http://127.0.0.1:4173`. The preview command is temporary and not a managed service.

## Build modes

`bun run build` creates a local review build. Every page includes `noindex, nofollow`, `robots.txt` disallows crawling, and the sitemap is empty.

`BUILD_MODE=production bun run build` prepares index controls for a future deployment. It does not deploy anything. Public deployment, domain purchase, and AdSense remain separate approvals.

## Data coverage

Initial ISP policy coverage includes Xfinity cable, Spectrum cable, Cox cable, AT&T Fiber, Verizon Fios, and T-Mobile Home Internet. Exact cable-modem approval intentionally returns `unknown` until checked against the provider's current model- and tier-aware records. Other providers return `unknown` rather than guessed rules.

Approved plan: `PREBUILD_PLAN.md`.
