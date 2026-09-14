import type { DecisionStatus, SourceRecord } from "../lib/contracts";

export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function rateFrom(id: string): number | null {
  const raw = byId<HTMLSelectElement>(id).value;
  return raw === "unknown" || raw === "" ? null : Number(raw);
}

export function statusChip(status: DecisionStatus, label?: string): string {
  const text = label ?? status.charAt(0).toUpperCase() + status.slice(1);
  const icon = { compatible: "✓", conditional: "!", incompatible: "×", unknown: "?" }[status];
  return `<span class="status-chip status-${status}"><span aria-hidden="true">${icon}</span>${escapeHtml(text)}</span>`;
}

export function sourceList(sources: SourceRecord[]): string {
  if (!sources.length) return "<p>No reviewed source record is available for this result.</p>";
  return `<ul class="source-list">${sources.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a><small>${escapeHtml(source.publisher)} · Retrieved ${escapeHtml(source.retrieved)} · Review by ${escapeHtml(source.nextReview)}</small></li>`).join("")}</ul>`;
}

export function stringList(items: string[]): string {
  if (!items.length) return "";
  return `<ul class="clean-list">${items.map((item) => `<li>• ${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function revealResult(target: HTMLElement, html: string, focus = true): void {
  target.innerHTML = html;
  if (!focus) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}
