#!/usr/bin/env bun
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import rulesJson from "../data/isp-rules.json";
import gatesJson from "../data/publication-gates.json";
import sourcesJson from "../data/sources.json";

const root = join(import.meta.dir, "..");
const site = join(root, "site");
const errors: string[] = [];
const today = new Date().toISOString().slice(0, 10);

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : Promise.resolve([path]);
  }));
  return nested.flat();
}

function localTarget(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const clean = href.split(/[?#]/, 1)[0] || "/";
  if (clean === "/") return join(site, "index.html");
  if (clean.endsWith(".html") || clean.includes(".")) return join(site, clean.slice(1));
  return join(site, clean.slice(1), "index.html");
}

function publicPath(file: string): string {
  const relative = file.slice(site.length).replaceAll("\\", "/");
  if (relative === "/index.html") return "/";
  if (relative.endsWith("/index.html")) return relative.slice(0, -"index.html".length);
  return relative;
}

function wordCount(html: string): number {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  return main.replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

const files = await filesBelow(site);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const guideDocuments: Array<{ path: string; shingles: Set<string> }> = [];
if (htmlFiles.length !== 39) errors.push(`Expected 39 generated HTML pages, found ${htmlFiles.length}.`);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relative = file.slice(site.length + 1);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] ?? "";
  if (!/<h1[ >]/.test(html)) errors.push(`${relative} has no H1.`);
  if (!description) errors.push(`${relative} has no meta description.`);
  if (relative !== "404.html" && (title.length < 15 || title.length > 70)) errors.push(`${relative} title length is ${title.length}; expected 15–70.`);
  if (relative !== "404.html" && (description.length < 90 || description.length > 170)) errors.push(`${relative} description length is ${description.length}; expected 90–170.`);
  if (!/<link rel="canonical" href="https:\/\/homenetfit\.com\//.test(html)) errors.push(`${relative} has no canonical URL.`);
  if (!/<meta name="robots" content="noindex, nofollow">/.test(html)) errors.push(`${relative} is not protected by local noindex.`);
  if (/\b(TODO|FIXME|lorem ipsum|coming soon)\b/i.test(html)) errors.push(`${relative} contains unfinished filler.`);
  if (/style="/.test(html)) errors.push(`${relative} contains inline style blocked by the CSP.`);
  if (relative.startsWith("guides/") && relative !== "guides/index.html") {
    if (wordCount(html) < 250) errors.push(`${relative} has fewer than 250 words in main content.`);
    if (!html.includes("Official sources reviewed")) errors.push(`${relative} has no dated evidence section.`);
    const article = (html.match(/<article class="prose">([\s\S]*?)<h2>Official sources reviewed<\/h2>/)?.[1] ?? "")
      .replace(/<[^>]+>/g, " ").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/ +/g, " ").trim().split(" ");
    const shingles = new Set<string>();
    for (let index = 0; index <= article.length - 5; index += 1) shingles.add(article.slice(index, index + 5).join(" "));
    guideDocuments.push({ path: relative, shingles });
  }

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = localTarget(match[1]);
    if (!target) continue;
    try {
      if (!(await stat(target)).isFile()) errors.push(`${relative} links to missing ${match[1]}.`);
    } catch {
      errors.push(`${relative} links to missing ${match[1]}.`);
    }
  }
}

// ponytail: five-word overlap catches templated duplicates; use semantic review if future guides share more necessary vocabulary.
for (let left = 0; left < guideDocuments.length; left += 1) {
  for (let right = left + 1; right < guideDocuments.length; right += 1) {
    const first = guideDocuments[left];
    const second = guideDocuments[right];
    let shared = 0;
    for (const shingle of first.shingles) if (second.shingles.has(shingle)) shared += 1;
    const union = first.shingles.size + second.shingles.size - shared;
    if (union && shared / union > 0.2) errors.push(`${first.path} and ${second.path} exceed the near-duplicate content threshold.`);
  }
}

for (const asset of ["planner-ui.js", "bottleneck-ui.js", "isp-ui.js", "ethernet-ui.js", "topology-ui.js"]) {
  const size = (await stat(join(site, "assets", asset))).size;
  if (size > 80 * 1024) errors.push(`${asset} exceeds the 80 KB uncompressed JavaScript budget.`);
}

const robots = await readFile(join(site, "robots.txt"), "utf8");
if (robots.trim() !== "User-agent: *\nDisallow: /") errors.push("Local robots.txt must disallow all crawling.");
const sitemap = await readFile(join(site, "sitemap.xml"), "utf8");
if (sitemap.includes("<url>")) errors.push("Local sitemap must not contain indexable URLs.");

const sourceIds = new Set(sourcesJson.sources.map((source) => source.sourceId));
if (sourceIds.size !== sourcesJson.sources.length) errors.push("Source IDs must be unique.");
for (const source of sourcesJson.sources) {
  if (!source.url.startsWith("https://")) errors.push(`${source.sourceId} does not use HTTPS.`);
  if (source.nextReview < source.retrieved) errors.push(`${source.sourceId} has a next review before retrieval.`);
  if (source.nextReview < today) errors.push(`${source.sourceId} source review expired on ${source.nextReview}.`);
}

const providerScenarios = new Map<string, Set<string>>();
for (const rule of rulesJson.rules) {
  for (const sourceId of rule.sourceIds) {
    if (!sourceIds.has(sourceId)) errors.push(`${rule.ruleId} references missing source ${sourceId}.`);
  }
  if (rule.nextReview < rule.lastVerified) errors.push(`${rule.ruleId} has a next review before its verification date.`);
  if (rule.nextReview < today) errors.push(`${rule.ruleId} rule review expired on ${rule.nextReview}.`);
  const scenarios = providerScenarios.get(rule.providerId) ?? new Set<string>();
  scenarios.add(rule.scenario);
  providerScenarios.set(rule.providerId, scenarios);
}

for (const provider of rulesJson.providers) {
  const scenarios = providerScenarios.get(provider.providerId) ?? new Set<string>();
  for (const scenario of ["own-modem", "own-router", "both"]) {
    if (!scenarios.has(scenario)) errors.push(`${provider.providerId} has no ${scenario} rule.`);
  }
}

const maxima = gatesJson.criteriaMaximums;
const gatePaths = new Set<string>();
for (const page of gatesJson.pages) {
  if (gatePaths.has(page.path)) errors.push(`Duplicate publication gate for ${page.path}.`);
  gatePaths.add(page.path);
  const total = Object.entries(page.scores).reduce((sum, [criterion, score]) => {
    const maximum = maxima[criterion as keyof typeof maxima];
    if (maximum === undefined || score < 0 || score > maximum) errors.push(`${page.path} has invalid ${criterion} score ${score}.`);
    return sum + score;
  }, 0);
  if (total !== page.total) errors.push(`${page.path} gate total is ${page.total}, expected ${total}.`);
  if (page.total < gatesJson.minimumScore || page.decision !== "pass" || page.blockers.length) errors.push(`${page.path} did not pass the ${gatesJson.minimumScore}-point publication gate.`);
}

const acquisitionPaths = htmlFiles.map(publicPath).filter((path) => (path.startsWith("/tools/") && path !== "/tools/") || (path.startsWith("/guides/") && path !== "/guides/"));
for (const path of acquisitionPaths) if (!gatePaths.has(path)) errors.push(`${path} has no publication gate.`);
for (const path of gatePaths) if (!acquisitionPaths.includes(path)) errors.push(`${path} has a gate but no generated acquisition page.`);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Verified ${htmlFiles.length} pages, ${rulesJson.rules.length} ISP rules, ${sourceIds.size} current sources, ${gatePaths.size} publication gates, local noindex, internal links, content depth, originality, CSP compatibility, and JavaScript budgets.`);
