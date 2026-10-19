/**
 * 🔴 F91 C20 (Acceptance Amendment 7, RR-289; beta-g decision A) · WHAT AN F91 PATH MAY HOLD AS A CLIENT'S PAGES.
 * From ONE research batch the caller names: the pages Visibility built (the batch's own built pages that were published, newest per URL,
 * with their html) and the client's CURRENT live site pages it reads as input (the batch's filed current-site list). Every other page the
 * stored crawl holds was generated before Visibility and never stands (src/page/existing-page-population.mjs withoutGeneratedPages).
 * A batch that files no current-site list gives KEEP null: the population is read as stored and the run says C20 is NOT DECLARED.
 * Reads only the directory it is handed; names no product, host or tenant.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const CURRENT_SITE_FILE = /^current-site-\d{4}-\d{2}-\d{2}\.json$/;
export const C20_NOT_DECLARED = "C20 NOT DECLARED — the batch files no current-site list; the population is read as stored";
const rows = (p) => (existsSync(p) ? readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);

export function readC20Keep(dir) {
  const files = dir && existsSync(dir) ? readdirSync(dir).filter((f) => CURRENT_SITE_FILE.test(f)).sort() : [];
  if (!files.length) return Object.freeze({ keep: null, declared: false, line: C20_NOT_DECLARED });
  const current = (JSON.parse(readFileSync(join(dir, files.at(-1)), "utf8")).pages ?? []).filter((p) => typeof p?.url === "string");
  const built = [...new Map(rows(join(dir, "joined-pages.jsonl")).filter((r) => r.record_type === "joined_page_draft" && typeof r.publishedUrl === "string").map((r) => [r.publishedUrl, r])).values()];
  const pages = [...built.map((b) => ({ url: b.publishedUrl, html: b.html ?? "", origin: "VISIBILITY_BUILT" })), ...current.map((c) => ({ url: c.url, html: "", origin: "CURRENT_SITE" }))];
  return Object.freeze({ keep: Object.freeze({ pages: Object.freeze(pages) }), declared: true, file: files.at(-1), counts: Object.freeze({ built: built.length, current: current.length }),
    line: `C20 (Amendment 7) — only ${built.length} page(s) Visibility built and ${current.length} current live site page(s) (${files.at(-1)}); every page generated before Visibility is excluded` });
}
