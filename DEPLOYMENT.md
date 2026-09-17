# HomeNet Fit — deployment runbook

Everything here is prepared but **not executed**. Deployment, domain purchase, Search
Console setup, analytics activation, and AdSense application each remain separate
approvals. Nothing in this file has been run.

Verified against Cloudflare Pages documentation on 2026-09-17.

## 0. What this costs

| Item | Cost |
|---|---:|
| `homenetfit.com` registration | $10–$20/year |
| Cloudflare Pages (static assets) | $0 |
| GitHub repository | $0 |
| Search Console, Bing Webmaster Tools | $0 |
| Cloudflare Web Analytics | $0 |
| **Recurring after the domain** | **$0/month** |

`homenetfit.com` was unregistered as of 2026-09-17 (Verisign RDAP returned no record).
Every canonical URL, the sitemap, and the JSON-LD graph already hardcode that exact
origin, so a different domain means a rebuild with `SITE_ORIGIN` set, not a DNS swap.
Re-check availability immediately before purchase.

## 1. Repository

The site must get its **own** GitHub repository.

Do not connect `/home/workspace` to Cloudflare Pages. That repository has no remote, is
about 2 GB, and carries unrelated Roughdraft Studio runtime data including prospect
emails and an outbox database. Cloudflare only publishes build output, but the Git
integration still requires pushing the whole repository to GitHub.

Create `homenet-fit` under the connected account (`scottshamel-ctrl`) containing only
`Projects/homenet-fit/` at its root. `site/` is generated, so it can be committed or
ignored; Pages rebuilds it either way.

## 2. Cloudflare Pages project

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `bun run deploy:build` |
| Build output directory | `site` |
| Root directory | repository root |
| Production branch | `main` |

Build environment variables (**Settings → Environment variables**, production):

| Variable | Value | Why |
|---|---|---|
| `BUN_VERSION` | `1.3.11` | The v3 image ships Bun 1.2.15 and updates minor versions without notice. Pin it. |
| `SKIP_DEPENDENCY_INSTALL` | `1` | The project has zero dependencies; skip the install step. |

`BUILD_MODE=production` is **not** a dashboard variable on purpose. `deploy:build` sets it
inline, so production mode travels with the repository and cannot be lost by editing
dashboard state. That exact failure — a production deploy silently shipping every page as
`noindex` — is what commit `433080f` fixed.

`deploy:build` runs the unit tests, builds in production mode, and runs `verify-site.ts`.
Any failure returns a non-zero exit code, which Pages treats as a failed build, so a site
that fails its own gates never publishes.

### No Wrangler configuration file

There is deliberately no `wrangler.jsonc`. Cloudflare's Pages Wrangler config exists to
configure **Functions** — bindings and runtime vars. HomeNet Fit has no Functions and no
bindings, so the file would add nothing while making itself the mandatory source of truth
for project configuration.

### No `_redirects` file

Two reasons, both checked against current documentation:

- Pages already redirects `/about/index.html` → `/about/` and `/contact.html` → `/contact`.
  Generated canonicals use trailing-slash directory URLs, which matches that behavior.
- `_redirects` explicitly **does not support domain-level redirects**, so `www` → apex
  cannot live there. It is a Bulk Redirect (step 4).

Add `_redirects` only when a real published URL has to move.

## 3. Domain and DNS

1. Register `homenetfit.com` (Cloudflare Registrar sells at cost and adds no markup).
2. In the Pages project: **Custom domains → Set up a custom domain →** `homenetfit.com`.
3. Cloudflare creates the DNS record automatically when the zone is on the same account.
4. Wait for the certificate to issue, then confirm `https://homenetfit.com/` serves the
   homepage and `https://homenetfit.com/tools/network-compatibility-planner/` loads.

## 4. `www` → apex redirect

Required so `www` and apex do not both get indexed.

1. **Bulk Redirects → Create a list**, one entry:

   | Source | Target | Status | Parameters |
   |---|---|---|---|
   | `www.homenetfit.com` | `https://homenetfit.com` | 301 | Preserve query string, Subpath matching, Preserve path suffix, Include subdomains |

2. Create a Bulk Redirect rule using that list.
3. **DNS → Add record:** `A`, name `www`, address `192.0.2.1`, **Proxied**.
4. Confirm: `curl --head https://www.homenetfit.com/` returns `301` with a `location` of
   `https://homenetfit.com/`.

The `homenet-fit.pages.dev` production URL stays reachable and indexable. Every page
carries a self-canonical pointing at `homenetfit.com`, which is the normal handling; add a
redirect rule only if Search Console later reports `pages.dev` URLs being indexed.
Preview deployment URLs are separate and already get `X-Robots-Tag: noindex` from
Cloudflare automatically.

## 5. Search Console

1. Add a **Domain** property for `homenetfit.com` (covers `www`, apex, http, and https).
2. Verify with the DNS TXT record — the zone is already on Cloudflare, so this is one
   record and no file upload.
3. Submit `https://homenetfit.com/sitemap.xml`.
4. Request indexing for the homepage and the two strongest tools.
5. Bing Webmaster Tools can import the Search Console property; optional, free, do it the
   same day.

Expect the sitemap to report 40 URLs. `/404.html` and `/contact/` are intentionally
excluded — index `/contact/` once a real inbox exists.

## 6. Analytics

Cloudflare Web Analytics is free, cookie-free, and needs no consent banner.

1. **Web Analytics → Add a site →** `homenetfit.com`. On a Pages project Cloudflare injects
   the beacon automatically at the next deployment.
2. Set `ANALYTICS=cloudflare` as a Pages build environment variable and redeploy.

Step 2 is not optional. The default Content-Security-Policy sends `script-src 'self'` and
`connect-src 'none'`, which blocks `beacon.min.js` and its reporting endpoint. The beacon
then fails silently and analytics reads zero forever. `ANALYTICS=cloudflare` widens the
policy to exactly what the beacon needs, and `verify-site.ts` fails the build if the
setting and the header ever disagree in either direction.

## 7. After launch

- Watch Search Console coverage until indexed pages settle, then compare against 40.
- The tool and guide caps in `AGENTS.md` lift once real query data exists. Expand toward
  the strongest queries; do not add pages to reach a number.
- Do **not** apply to AdSense on launch day. Work the §19 checklist in `PREBUILD_PLAN.md`
  first.
- When AdSense is approved, the CSP needs `script-src` and `frame-src` entries for Google's
  ad hosts. Extend `contentSecurityPolicy()` in `lib/render.ts` behind a flag, the same way
  analytics is handled, rather than hand-editing the header string.

## 8. Rollback

Pages keeps every deployment. **Deployments → (older deployment) → Rollback** restores it
immediately. To take the site down entirely, remove the custom domain from the Pages
project; the DNS record and the repository are unaffected.
