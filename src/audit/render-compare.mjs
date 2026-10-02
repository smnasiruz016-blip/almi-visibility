/**
 * 🔴 F22 · THE SOURCE-VERSUS-RENDER DETECTOR (acceptance _handoffs 2d20a63; Owner Ruling 7: "A SOURCE-VERSUS-RENDER CHECK IS A
 * DETECTOR", written under the sealed exam rule).
 *
 * Derived ONLY from F22's own contract (specification line 60: "Compare source and rendered states, including links, canonical data,
 * content and structured data"; V3: "detect important JS-only content") and from the evidence store's data model — never from the
 * sealed corpus, which this file does not name and the census in tools/ proves it does not.
 *
 * Pure. It is handed two documents of ONE page — the SOURCE (as served, read without scripts) and its RENDER — and the render's state.
 * It never sees a path, an id, a host list or a client: its output carries counts only.
 *
 *   C2  a comparison is MEASURED only against a COMPLETE render; against PARTIAL or FAILED every dimension is NOT MEASURED, the render's
 *       own reason named — never SAME, never 0.
 *   C3  four dimensions, each SAME or DIFFERS, DIFFERS carrying onlyInRender (JS-only) and onlyInSource (removed by script):
 *         LINKS            the set of link targets (<a href> ELEMENTS — not text inside a script), resolved, fragment dropped
 *         CANONICAL        the set of <link rel="canonical"> targets, resolved
 *         CONTENT          the visible text, as words, compared as a multiset
 *         STRUCTURED_DATA  the parsed JSON-LD blocks, compared as a multiset of their canonical forms; a block that does not parse is
 *                          counted as unparseable on its side, never dropped and never compared as equal
 */
import { extractLinks } from "../crawl/seeds.mjs";

export const DIMENSIONS = Object.freeze(["LINKS", "CANONICAL", "CONTENT", "STRUCTURED_DATA"]);
export const NOT_MEASURED = "NOT MEASURED";

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};

/** The markup of ELEMENTS only: comments and the contents of script, style and template removed — text inside a script that merely
 * spells "<a href>" is not a link (found by this file's first test run: an inline script's string read as a source link). */
export const elementsOnly = (html) => String(html ?? "").replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");

/** Every <link rel=canonical> target, resolved against the page URL. */
export function canonicalsIn(html, baseUrl) {
  const out = [];
  for (const m of elementsOnly(html).matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(m[0], "rel");
    if (!rel || !rel.toLowerCase().split(/\s+/).includes("canonical")) continue;
    const href = attr(m[0], "href");
    if (href === null) continue;
    try { out.push(new URL(href, baseUrl).toString()); } catch { out.push(`unresolvable:${href}`); }
  }
  return out;
}

const canonicalJson = (v) => (Array.isArray(v) ? `[${v.map(canonicalJson).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(",")}}` : JSON.stringify(v));

/** Every JSON-LD block: its canonical form, or one unparseable count. */
export function jsonLdIn(html) {
  const blocks = [];
  let unparseable = 0;
  for (const m of String(html ?? "").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const type = attr(`<script ${m[1]}>`, "type");
    if (!type || type.trim().toLowerCase() !== "application/ld+json") continue;
    try { blocks.push(canonicalJson(JSON.parse(m[2]))); } catch { unparseable += 1; }
  }
  return { blocks, unparseable };
}

/** The visible text as words (Unicode letters and digits), lower-cased. */
export const wordsOf = (text) => String(text ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Multiset difference counts: how many items only the render has, and how many only the source has. */
export function multisetDiff(sourceItems, renderItems) {
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
  const s = count(sourceItems), r = count(renderItems);
  let onlyInRender = 0, onlyInSource = 0;
  for (const [k, n] of r) onlyInRender += Math.max(0, n - (s.get(k) ?? 0));
  for (const [k, n] of s) onlyInSource += Math.max(0, n - (r.get(k) ?? 0));
  return { onlyInRender, onlyInSource };
}

const verdict = (d, extra = {}) => ({ state: d.onlyInRender === 0 && d.onlyInSource === 0 && !extra.unparseable ? "SAME" : "DIFFERS", ...d, ...extra });

/**
 * Compare ONE page's source with its render.
 * @param {{ renderState: string, renderReason: string, pageUrl: string, sourceHtml: string, renderedHtml: string|null, sourceText: string|null, renderedText: string|null }} o
 */
export function compareSourceRender({ renderState, renderReason, pageUrl, sourceHtml, renderedHtml, sourceText = null, renderedText = null }) {
  if (renderState !== "COMPLETE") {
    const nm = { state: NOT_MEASURED, reason: `the render is ${renderState ?? "absent"}: ${renderReason ?? "no reason recorded"} — a comparison is measured only against a COMPLETE render` };
    return { renderState, dimensions: Object.fromEntries(DIMENSIONS.map((d) => [d, nm])) };
  }
  const links = multisetDiff([...new Set(extractLinks(elementsOnly(sourceHtml), pageUrl))], [...new Set(extractLinks(elementsOnly(renderedHtml), pageUrl))]);
  const canon = multisetDiff([...new Set(canonicalsIn(sourceHtml, pageUrl))], [...new Set(canonicalsIn(renderedHtml, pageUrl))]);
  const s = jsonLdIn(sourceHtml), r = jsonLdIn(renderedHtml);
  const content = sourceText === null || renderedText === null
    ? { state: NOT_MEASURED, reason: `the ${sourceText === null ? "source" : "rendered"} visible text was not read` }
    : verdict(multisetDiff(wordsOf(sourceText), wordsOf(renderedText)));
  return {
    renderState,
    dimensions: {
      LINKS: verdict(links),
      CANONICAL: verdict(canon),
      CONTENT: content,
      STRUCTURED_DATA: verdict(multisetDiff(s.blocks, r.blocks), { unparseable: s.unparseable + r.unparseable, unparseableInSource: s.unparseable, unparseableInRender: r.unparseable }),
    },
  };
}

/** The population, count-only: per dimension SAME / DIFFERS / NOT MEASURED, each with its denominator, and the JS-only totals. */
export function summariseComparisons(comparisons, { pagesWithoutBody = 0 } = {}) {
  const pages = comparisons.length + pagesWithoutBody;
  const byState = comparisons.reduce((m, c) => ((m[c.renderState] = (m[c.renderState] ?? 0) + 1), m), {});
  const dims = {};
  for (const d of DIMENSIONS) {
    const xs = comparisons.map((c) => c.dimensions[d]);
    dims[d] = {
      SAME: xs.filter((x) => x.state === "SAME").length,
      DIFFERS: xs.filter((x) => x.state === "DIFFERS").length,
      [NOT_MEASURED]: xs.filter((x) => x.state === NOT_MEASURED).length + pagesWithoutBody,
      onlyInRender: xs.reduce((n, x) => n + (x.onlyInRender ?? 0), 0),
      onlyInSource: xs.reduce((n, x) => n + (x.onlyInSource ?? 0), 0),
      denominator: pages,
    };
  }
  const incomplete = pagesWithoutBody > 0 || DIMENSIONS.some((d) => dims[d][NOT_MEASURED] > 0);
  return { pages, pagesWithoutBody, renderStates: byState, dimensions: dims, incomplete };
}
