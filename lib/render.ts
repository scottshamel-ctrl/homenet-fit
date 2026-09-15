export const SITE_NAME = "HomeNet Fit";
const environment = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
export const SITE_ORIGIN = environment.SITE_ORIGIN ?? "https://homenetfit.com";
export const BUILD_MODE = environment.BUILD_MODE === "production" ? "production" : "local";

export interface Crumb {
  href: string;
  label: string;
}

export interface PageSpec {
  path: string;
  title: string;
  description: string;
  h1: string;
  lede?: string;
  body: string;
  crumbs?: Crumb[];
  modules?: string[];
  pageClass?: string;
  bodyOwnsHeading?: boolean;
  indexable?: boolean;
  updated?: string;
}

export const NAV = [
  { href: "/tools/network-compatibility-planner/", label: "Check My Network" },
  { href: "/compatibility/", label: "Compatibility" },
  { href: "/bottlenecks/", label: "Bottlenecks" },
  { href: "/guides/", label: "Guides" },
  { href: "/methodology/", label: "Methodology" },
];

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function breadcrumbHtml(crumbs: Crumb[], current: string): string {
  if (!crumbs.length) return "";
  const links = crumbs.map((crumb) => `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`).join('<span aria-hidden="true">/</span>');
  return `<nav class="breadcrumbs frame" aria-label="Breadcrumb">${links}<span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(current)}</span></nav>`;
}

function breadcrumbData(crumbs: Crumb[], current: string, path: string): unknown | null {
  if (!crumbs.length) return null;
  const items = [...crumbs.map((crumb) => ({ name: crumb.label, url: SITE_ORIGIN + crumb.href })), { name: current, url: SITE_ORIGIN + path }];
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function layout(page: PageSpec): string {
  const canonical = SITE_ORIGIN + page.path;
  const mayIndex = BUILD_MODE === "production" && page.indexable === true;
  const activeNav = (href: string) => page.path === href || (href !== "/tools/network-compatibility-planner/" && page.path.startsWith(href));
  const nav = NAV.map((item) => `<a href="${item.href}"${activeNav(item.href) ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`).join("");
  const scripts = (page.modules ?? []).map((src) => `<script type="module" src="${src}"></script>`).join("\n");
  const graph: unknown[] = [
    { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#site`, name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    { "@type": "WebPage", name: page.title, description: page.description, url: canonical, isPartOf: { "@id": `${SITE_ORIGIN}/#site` } },
  ];
  const breadcrumbs = breadcrumbData(page.crumbs ?? [], page.h1, page.path);
  if (breadcrumbs) graph.push(breadcrumbs);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="robots" content="${mayIndex ? "index, follow" : "noindex, nofollow"}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="theme-color" content="#f6f8fb">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/style.css">
  <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>
</head>
<body class="${escapeHtml(page.pageClass ?? "")}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${BUILD_MODE === "production"
    ? `<aside class="review-bar" aria-label="Privacy status">Every check runs in your browser · No network details are sent to a server</aside>`
    : `<aside class="review-bar" aria-label="Build status">Local review build · Not published · No data leaves this browser</aside>`}
  <header class="site-header">
    <div class="frame header-inner">
      <a class="wordmark" href="/" aria-label="HomeNet Fit home"><span class="wordmark-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>HomeNet <strong>Fit</strong></span></a>
      <nav class="primary-nav" aria-label="Primary">${nav}</nav>
    </div>
  </header>
  ${breadcrumbHtml(page.crumbs ?? [], page.h1)}
  <main id="main" class="frame main-content">
    ${page.bodyOwnsHeading ? "" : `<header class="page-heading">
      <h1>${escapeHtml(page.h1)}</h1>
      ${page.lede ? `<p class="lede">${escapeHtml(page.lede)}</p>` : ""}
    </header>`}
    ${page.body}
  </main>
  <footer class="site-footer">
    <div class="frame footer-grid">
      <div><a class="wordmark wordmark-footer" href="/">HomeNet <strong>Fit</strong></a><p>Find what works together. Fix the actual bottleneck. Buy only what helps.</p></div>
      <nav aria-label="Project"><a href="/about/">About</a><a href="/methodology/">Methodology</a><a href="/sources/">Sources</a><a href="/changelog/">Changelog</a></nav>
      <nav aria-label="Policies"><a href="/editorial-standards/">Editorial standards</a><a href="/corrections/">Corrections</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cookies/">Cookies</a><a href="/contact/">Contact</a></nav>
    </div>
    <div class="frame footer-note">Capability guidance, not a remote network test. Confirm provider eligibility and current model support before buying equipment.</div>
  </footer>
  ${scripts}
</body>
</html>
`;
}

export function statusChip(status: string, label?: string): string {
  const text = label ?? status.charAt(0).toUpperCase() + status.slice(1);
  const icons: Record<string, string> = { compatible: "✓", conditional: "!", incompatible: "×", unknown: "?" };
  return `<span class="status-chip status-${escapeHtml(status)}"><span aria-hidden="true">${icons[status] ?? "•"}</span>${escapeHtml(text)}</span>`;
}

// Cards nested under a section heading use h3; cards placed directly under the page h1
// (index and category pages) need h2 so the heading order never skips a level.
export function pageCards(items: Array<{ href: string; eyebrow: string; title: string; text: string; action?: string }>, level: "h2" | "h3" = "h3"): string {
  return `<div class="card-grid">${items.map((item) => `<a class="link-card" href="${item.href}"><span class="eyebrow">${escapeHtml(item.eyebrow)}</span><${level}>${escapeHtml(item.title)}</${level}><p>${escapeHtml(item.text)}</p><span class="card-action">${escapeHtml(item.action ?? "Open guide")} <span aria-hidden="true">→</span></span></a>`).join("")}</div>`;
}

export function sitemap(pages: PageSpec[]): string {
  const entries = BUILD_MODE === "production"
    ? pages.filter((page) => page.indexable === true).map((page) => `  <url><loc>${SITE_ORIGIN + page.path}</loc>${page.updated ? `<lastmod>${page.updated}</lastmod>` : ""}</url>`).join("\n")
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function robots(): string {
  if (BUILD_MODE !== "production") return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\nDisallow: /*?\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
