/**
 * 🔴 F76 · CONTROLLED DRAFT AND PUBLISHING (acceptance _handoffs AlmiVisibility_F76_ACCEPTANCE_2026-10-19.md, RR-291; owner answer Q6:
 * submission to Search Console uses the client's own connection when the client connects it; for AlmiWorld projects the owner connects his
 * own; CC never types a login; until connected, the engine writes the sitemap file only).
 *
 *   C1 · a page is published only with ITS OWN approval record (who approved, the day, the decision it stands on);
 *   C2 · a cohort is capped (PUBLISH_COHORT_CAP, or the client's own lower cap) and this module has no publish-all or generate-all path — every
 *        call names its pages;
 *   C3 · rollback restores the previous version byte for byte;
 *   C4 · without the client's own Search Console connection nothing is submitted: the sitemap file is written, and the submission reads
 *        NOT CONNECTED.
 * Pure: it decides and renders; it deploys, sends and submits nothing. Generic: it names no client, product or host.
 */
import { createHash } from "node:crypto";

/** The engine's own ceiling on one cohort; a client may declare a lower one. The pilot publication of RR-271 was 12 pages. */
export const PUBLISH_COHORT_CAP = 20;
export const SUBMISSION = Object.freeze({ NOT_CONNECTED: "NOT CONNECTED", CONNECTED: "CONNECTED" });
const present = (v) => typeof v === "string" && v.trim() !== "";
const sha = (s) => createHash("sha256").update(s).digest("hex");

/** C1 + C2 · one named cohort: each page with its own approval, the cohort under its cap — or refusals, each named. */
export function planCohort({ pages, approvals, cap = PUBLISH_COHORT_CAP }) {
  if (!Array.isArray(pages) || pages.length === 0) return Object.freeze({ state: "REFUSED", refusals: ["a cohort names its pages — there is no publish-all"] });
  const limit = Math.min(cap, PUBLISH_COHORT_CAP);
  const refusals = [];
  if (pages.length > limit) refusals.push(`the cohort holds ${pages.length} pages, over its cap of ${limit}`);
  const byPage = new Map((approvals ?? []).filter((a) => present(a?.pageId) && present(a?.approvedBy) && /^\d{4}-\d{2}-\d{2}/.test(a?.on ?? "") && present(a?.decision)).map((a) => [a.pageId, a]));
  for (const p of pages) if (!byPage.has(p)) refusals.push(`${p}: no approval record of its own`);
  return refusals.length ? Object.freeze({ state: "REFUSED", refusals }) : Object.freeze({ state: "MAY_PUBLISH", pages: Object.freeze([...pages]), approvals: Object.freeze(pages.map((p) => byPage.get(p))) });
}

/** C3 · roll back: the version before the latest, exactly as it was stored. */
export function rollback(versions) {
  if (!Array.isArray(versions) || versions.length < 2) return Object.freeze({ state: "REFUSED", reason: "no previous version to restore" });
  const prev = versions.at(-2);
  return Object.freeze({ state: "RESTORED", html: prev.html, sha256: sha(prev.html), restoredFrom: prev.versionId ?? null });
}

/** C4 · the sitemap the engine writes, and what happens to submission. */
export function sitemapXml(urls) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(urls)].sort().map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}\n</urlset>\n`;
}
export function submissionState(connection) {
  return connection?.state === "CONNECTED" && present(connection?.connectorId)
    ? Object.freeze({ state: SUBMISSION.CONNECTED, by: connection.connectorId })
    : Object.freeze({ state: SUBMISSION.NOT_CONNECTED, line: "submission NOT CONNECTED — the client has not connected its own Search Console; the sitemap file is written and nothing is submitted" });
}
