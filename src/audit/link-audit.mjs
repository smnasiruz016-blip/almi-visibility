/**
 * F23 · INTERNAL AND EXTERNAL LINK AUDIT (acceptance _handoffs d3c8e79, RR-111). Built under the owner's refinement (RR-111 §0): this row's
 * job includes REPORTING absent evidence, so absence is reported, never filled, and the verdict is only what the real population supports.
 *
 *   C1  every <a href> in every stored body, one per occurrence, read after comments, script, style and template are removed (the same
 *       stripping F26 uses); a page with no stored body is counted ABSENT; a truncated body makes the population INCOMPLETE
 *   C2  internal target by its RECORDED status (F20's statusOf): 2xx WORKING · 3xx REDIRECTED · 4xx/5xx BROKEN (RFC 9110) · anything else,
 *       a robots skip, no record, or two records that disagree → NOT MEASURED
 *   C3  external destination the same way; never observed → NOT MEASURED — never working, broken, a pass, a failure or 0
 *   C4  a link with no accessible name (no visible text, aria-label, image alt or title) is an ANCHOR PROBLEM (WCAG 2.2 SC 4.1.2); a name
 *       through aria-labelledby, or an element whose name cannot be aligned to its href, is NOT MEASURED; a present name NEEDS A PERSON
 *   C5  zero inbound inside the raw-HTML crawled set is UNKNOWN, never orphan; hidden needs a rendered page → NOT MEASURED
 *   C6  excessive / weakly contextual: no owner boundary is declared, so both are NOT MEASURED — no value exists here to invent
 *   C7  every count with its denominator; INCOMPLETE named; three verdicts per part
 * Pure: pages, recorded target states and the item-26 zero-inbound set in; counts out. Never fetches, renders or writes.
 */
import { extractLinkDetails } from "../crawl/seeds.mjs";
import { scannable } from "./accessibility.mjs";
import { statusOf } from "./url-audit.mjs";

export const STATE = Object.freeze({ WORKING: "WORKING", REDIRECTED: "REDIRECTED", BROKEN: "BROKEN", NOT_MEASURED: "NOT MEASURED" });
export const VERDICT = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
export const MISSING = Object.freeze({
  hidden: "a rendered page — whether a link is hidden is decided by styles and scripts a stored raw-HTML body does not carry",
  orphaned: "a rendered page and a complete page inventory — a script-inserted link is invisible to raw HTML (item 26)",
  excessive: "an owner declaration of how many links on one page is excessive — none is declared",
  weaklyContextual: "an owner declaration of what makes a link weakly contextual — none is declared",
});

/** C2/C3: one target's class from its RECORDED observations only. `recs` is the list of records for that URL ([] = never observed). */
export function targetState(recs) {
  const states = new Set((recs ?? []).map((rec) => {
    if (!rec || rec.skipped) return STATE.NOT_MEASURED;
    const s = statusOf(rec);
    if (s.state === "OK") return STATE.WORKING;
    if (s.state === "CLIENT_ERROR" || s.state === "SERVER_ERROR") return STATE.BROKEN;
    if (s.state === "OTHER" && s.status >= 300 && s.status < 400) return STATE.REDIRECTED;
    return STATE.NOT_MEASURED;
  }));
  return states.size === 1 ? [...states][0] : STATE.NOT_MEASURED;
}

const SKIPPED_HREF = (h) => h === null || h === "" || h.startsWith("#") || /^(mailto|tel|javascript):/i.test(h);
const hrefOf = (open) => { const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(open); return m ? (m[1] ?? m[2]).replace(/&amp;/g, "&").trim() : null; };

/** C1: every link occurrence of one stored body, each with its target and — when its element can be aligned — its accessible name. */
export function linksOf(html, base) {
  const body = scannable(html);
  const opened = [];
  for (const m of body.matchAll(/<a\b([^>]*)>/gi)) {
    const href = hrefOf(m[1]);
    if (SKIPPED_HREF(href)) continue;
    try { const u = new URL(href, base); u.hash = ""; opened.push(u.toString()); } catch { /* an unparseable href points at nothing */ }
  }
  const { links: named } = extractLinkDetails(body, base, { maxLinks: Infinity });
  const aligned = named.length === opened.length && named.every((l, i) => l.to === opened[i]);
  return opened.map((to, i) => ({ to, name: aligned ? named[i] : null }));
}

const tally = () => ({ [STATE.WORKING]: 0, [STATE.REDIRECTED]: 0, [STATE.BROKEN]: 0, [STATE.NOT_MEASURED]: 0 });
const total = (t) => Object.values(t).reduce((a, b) => a + b, 0);
const partVerdict = (bad, unmeasured, n, complete) => (bad > 0 ? VERDICT.DISPROVED : n > 0 && unmeasured === 0 && complete ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE);

/**
 * @param {{ pages: {canonical:string, html:string|null, truncated?:boolean}[], recordsOf: (url:string)=>object[], zeroInbound: string[], canon: (u:string)=>string|null }} a
 */
export function auditLinks({ pages, recordsOf, zeroInbound, canon }) {
  const internal = tally(), external = tally();
  const anchor = { named: 0, nameless: 0, notMeasured: 0 };
  let links = 0;
  const absentPages = pages.filter((p) => p.html === null).length;
  const truncatedPages = pages.filter((p) => p.html !== null && p.truncated === true).length;
  for (const p of pages) {
    if (p.html === null) continue;
    const host = new URL(p.canonical).host;
    for (const l of linksOf(p.html, p.canonical)) {
      links += 1;
      const target = canon(l.to);
      const side = target !== null && new URL(target).host === host ? internal : external;
      side[targetState(target === null ? [] : recordsOf(target))] += 1;
      if (l.name === null || l.name.accessibleNameSource === "NOT_MEASURED_ARIA_LABELLEDBY") anchor.notMeasured += 1;
      else if (l.name.accessibleName === null) anchor.nameless += 1;
      else anchor.named += 1;
    }
  }
  const complete = absentPages === 0 && truncatedPages === 0;
  const zero = zeroInbound.length;
  const withBody = pages.length - absentPages;
  const parts = {
    internal: { counts: internal, denominator: total(internal), verdict: partVerdict(internal[STATE.BROKEN], internal[STATE.NOT_MEASURED], total(internal), complete) },
    external: { counts: external, denominator: total(external), verdict: partVerdict(external[STATE.BROKEN], external[STATE.NOT_MEASURED], total(external), complete) },
    anchorName: { counts: anchor, denominator: links, needsAPerson: anchor.named, verdict: partVerdict(anchor.nameless, anchor.notMeasured, links, complete) },
    orphaned: { unknown: zero, denominator: pages.length, missing: MISSING.orphaned, verdict: VERDICT.COULD_NOT_PROVE },
    hidden: { notMeasured: links, denominator: links, missing: MISSING.hidden, verdict: VERDICT.COULD_NOT_PROVE },
    excessive: { notMeasured: withBody, denominator: withBody, missing: MISSING.excessive, verdict: VERDICT.COULD_NOT_PROVE },
    weaklyContextual: { notMeasured: links, denominator: links, missing: MISSING.weaklyContextual, verdict: VERDICT.COULD_NOT_PROVE },
  };
  const absent = [];
  if (absentPages) absent.push(`${absentPages} of ${pages.length} page(s) have no stored body`);
  if (truncatedPages) absent.push(`${truncatedPages} of ${withBody} stored bod(ies) were truncated by the collector`);
  if (internal[STATE.NOT_MEASURED]) absent.push(`${internal[STATE.NOT_MEASURED]} of ${total(internal)} internal link(s) point at a target with no usable recorded status`);
  if (external[STATE.NOT_MEASURED]) absent.push(`${external[STATE.NOT_MEASURED]} of ${total(external)} external link(s) point at a destination never fetched`);
  if (anchor.notMeasured) absent.push(`${anchor.notMeasured} of ${links} link name(s) could not be read from raw HTML`);
  if (zero) absent.push(`${zero} of ${pages.length} page(s) have no inbound link in raw HTML — UNKNOWN, never orphan`);
  absent.push(`hidden: ${MISSING.hidden}`, `excessive: ${MISSING.excessive}`, `weakly contextual: ${MISSING.weaklyContextual}`);
  const verdicts = Object.values(parts).map((x) => x.verdict);
  const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : verdicts.every((v) => v === VERDICT.PROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;
  return { pages: pages.length, pagesWithBody: withBody, absentPages, truncatedPages, links, parts, incomplete: absent.length > 0, absent, verdict };
}

/** C3/C7: a class count is printed only over what was measured; with nothing measured the classes read NOT MEASURED, never 0. */
export function formatPart(name, part) {
  const c = part.counts, n = part.denominator, nm = c[STATE.NOT_MEASURED], measured = n - nm;
  if (n === 0) return `${name}: no links of this kind (0 of 0) — ${part.verdict}`;
  const classes = measured === 0
    ? "WORKING, REDIRECTED and BROKEN are NOT MEASURED"
    : `WORKING ${c[STATE.WORKING]} · REDIRECTED ${c[STATE.REDIRECTED]} · BROKEN ${c[STATE.BROKEN]} (of ${measured} measured)`;
  return `${name}: ${n} link(s) · ${classes} · NOT MEASURED ${nm} of ${n} — ${part.verdict}`;
}
