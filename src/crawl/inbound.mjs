/**
 * 🔴 ITEM 26 — ONE DEFINITION OF "NO INBOUND LINKS INSIDE THE CRAWLED SET",
 * READ BY EVERY RUNNER FROM ONE STORED GRAPH.
 *
 * ── THE DEFECT THIS REPLACES (found 13 September 2026) ─────────────────────
 *
 * Two runners counted pages with no inbound links over the SAME 394 bodies and
 * printed 340 and 341. The numbers were one apart and BOTH were wrong, in two
 * different ways that almost cancelled:
 *
 *   bin/audit-content.mjs counted once per OBSERVATION. Five pages were reached
 *   by two requested URLs that redirected to one final URL, so five pages were
 *   counted twice: its 340 was 335 distinct pages.
 *
 *   bin/audit-technical.mjs counted once per page but IGNORED A LINK FROM
 *   ANOTHER HOST. Six sub-site home pages are linked from 359–393 crawled pages,
 *   every one of them on a different host, so it called them unlinked: 341.
 *
 * Neither runner said which question it was answering. A near-agreement is the
 * most dangerous kind, because nobody investigates a difference of one.
 *
 * ── THE ONE DEFINITION ──────────────────────────────────────────────────────
 *
 * See ZERO_INBOUND_DEFINITION. The unit is the DISTINCT PAGE, because a page is
 * what a reader or a search engine reaches; the scope is EVERY CRAWLED HOST,
 * because the crawled set is one estate and a sub-site home linked from every
 * other site in it is reachable, not orphaned. The same-host reading answers a
 * different question — "does this site link to its own page?" — and is not what
 * "inside the crawled set" says.
 *
 * 🔴 RAW_HTML ONLY. A link injected by JavaScript is not in these bytes, so zero
 * inbound is reported UNKNOWN downstream, never "orphan" (LAW-ABSENT-1).
 *
 * This module names no product.
 */

import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

import { canonicalUrl } from "../evidence/ids.mjs";
import { extractLinks } from "./seeds.mjs";

export const ZERO_INBOUND_DEFINITION =
  "NO INBOUND LINKS INSIDE THE CRAWLED SET: a DISTINCT crawled page (by canonical URL — two requested URLs " +
  "that reach one page are one page) that no OTHER distinct crawled page links to in its served HTML. A link " +
  "from ANY crawled host counts; a page's link to itself does not. Raw HTML only: a JavaScript-injected link " +
  "is invisible here, so zero inbound is UNKNOWN, never 'orphan'.";

const safeCanonical = (u) => {
  try {
    return canonicalUrl(u);
  } catch {
    return null;
  }
};

/**
 * The distinct pages of a run, each with every observation that reached it and
 * ONE body — the lowest observation_id's, so the choice never depends on order.
 */
export function pagesFromRun({ crawlRecords, bodies }) {
  const byPage = new Map();
  const fetched = crawlRecords
    .filter((r) => r.record_type === "observation" && !r.value?.skipped)
    .sort((a, b) => a.observation_id.localeCompare(b.observation_id));
  for (const o of fetched) {
    const canonical = safeCanonical(o.value.final_url ?? o.value.requested_url);
    if (!canonical) continue;
    const page = byPage.get(canonical) ?? { canonical, observation_ids: [], html: null };
    page.observation_ids.push(o.observation_id);
    if (page.html === null && bodies.has(o.observation_id)) {
      page.html = bodies.get(o.observation_id);
      page.body_observation_id = o.observation_id;
    }
    byPage.set(canonical, page);
  }
  return [...byPage.values()].sort((a, b) => a.canonical.localeCompare(b.canonical));
}

/** Every link found in each page's served HTML, one edge per occurrence, in a fixed order. */
export function deriveEdges(pages) {
  const edges = [];
  for (const p of pages) {
    if (p.html === null) continue;
    for (const raw of extractLinks(p.html, p.canonical)) {
      const to = safeCanonical(raw);
      edges.push({ from: p.canonical, from_observation_id: p.body_observation_id, to: to ?? raw, to_parsed: to !== null });
    }
  }
  return edges;
}

/**
 * Inbound count per distinct page = how many OTHER distinct crawled pages link
 * to it (a page linking twice counts once). Pages with no stored body cannot be
 * a source of links, and are still counted as targets.
 */
export function inboundOf({ pages, edges }) {
  const known = new Set(pages.map((p) => p.canonical));
  const sources = new Map(pages.map((p) => [p.canonical, new Set()]));
  for (const e of edges) {
    if (!e.to_parsed || e.to === e.from || !known.has(e.to)) continue;
    sources.get(e.to).add(e.from);
  }
  const inbound = new Map([...sources].map(([page, s]) => [page, s.size]));
  const zero = [...inbound].filter(([, n]) => n === 0).map(([page]) => page).sort();
  return { inbound, zero, pages: pages.length, definition: ZERO_INBOUND_DEFINITION };
}

export function packGraph(edges) {
  const raw = Buffer.from(edges.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
  return brotliCompressSync(raw, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length },
  });
}

export function unpackGraph(buffer) {
  return brotliDecompressSync(buffer).toString("utf8").split("\n").filter((l) => l !== "").map((l) => JSON.parse(l));
}
