/**
 * 🔴 RR-138 §2 · READING SHARED RENDER EVIDENCE — A ROW READS ONLY WHAT NAMES IT, AND ONLY WHAT ITS HASH PROVES.
 *
 * Given the evidence batch's render records (src/render/render-evidence.mjs) and the local corpus, returns, per source page, the
 * renders a named ROW may read: a record whose `readBy` does not name the row is never returned to it (it cannot claim evidence it never
 * read), and a body or visible text is returned only when its bytes hash to what the record carries — otherwise it is null, counted.
 * Pure apart from reading the files it is handed.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sha = (b) => createHash("sha256").update(b).digest("hex");

/**
 * @param {{ records: object[], corpus: string, row: string }} o
 * @returns {{ byPage: Map<string, Record<string, object>>, run: object|null, unverified: number, notForThisRow: number }}
 */
export function renderEvidenceFor({ records, corpus, row }) {
  const byPage = new Map();
  let unverified = 0, notForThisRow = 0;
  const run = records.find((r) => r.record_type === "render_run") ?? null;
  for (const r of records.filter((x) => x.record_type === "observation" && x.value?.renderMode === "RENDERED")) {
    if (!Array.isArray(r.value.readBy) || !r.value.readBy.includes(row)) { notForThisRow += 1; continue; }
    const read = (suffix, want) => {
      if (want == null) return null;
      const f = join(corpus, `${r.observation_id}.render.${suffix}`);
      const bytes = existsSync(f) ? readFileSync(f, "utf8") : null;
      if (bytes === null || sha(bytes) !== want) { unverified += 1; return null; }
      return bytes;
    };
    const html = r.value.renderState === "FAILED" ? null : read("html", r.content_sha256);
    const visibleText = read("txt", r.value.visible_text_sha256);
    const page = byPage.get(r.value.source_observation_id) ?? {};
    page[r.value.kind] = { renderState: r.value.renderState, reason: r.value.reason, html, visibleText, layout: r.value.layout ?? null, viewport: r.value.viewport, requests: r.value.requests };
    byPage.set(r.value.source_observation_id, page);
  }
  return { byPage, run, unverified, notForThisRow };
}
