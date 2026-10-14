/**
 * F23 · INTERNAL AND EXTERNAL LINK AUDIT OF THE PAGES THE ENGINE BUILT (F23 Acceptance Amendment 2, _handoffs eeb7245, RR-263; first frozen
 * d3c8e79, RR-111). This module replaces, for F23, the crawl-batch audit of src/audit/link-audit.mjs; that file is left byte for byte as it
 * was, because two other rows' proofs pin its bytes and read STATE and targetState from it — it is no longer an F23 input.
 * The row is STANDALONE and audits ONLY THE PAGES THE ENGINE BUILT (the owner's principle, 14 October 2026): any client's pages, built
 * and not yet published, and once live. No crawl batch is an input. It names no product, client, host, batch or date. Absent evidence
 * is reported, never filled.
 *
 *   C1  every <a href> in every stored body, one per occurrence, read after comments, script, style and template are removed (the same
 *       stripping F26 uses); a page with no stored body is counted ABSENT; a truncated body makes the population INCOMPLETE
 *   C2  internal target by its RECORDED status: 2xx WORKING · 4xx/5xx BROKEN (RFC 9110) · REDIRECTED when it answered 3xx and its
 *       chain ends 2xx, reported with the chain's length; a chain that ends 4xx/5xx is BROKEN; anything else, a refused request (robots,
 *       a rate limit, a challenge, a timeout), no record, or two crawl records that disagree → NOT MEASURED with its reason
 *   C3  external destination the same way; never observed → NOT MEASURED — never working, broken, a pass, a failure or 0
 *   C4  a link with no accessible name (no visible text, aria-label, image alt or title) is an ANCHOR PROBLEM (WCAG 2.2 SC 4.1.2); a name
 *       through aria-labelledby, or an element whose name cannot be aligned to its href, is NOT MEASURED; a present name NEEDS A PERSON
 *   C5  no page of this population stands in a crawled set this row reads, so the inbound links of every page are NOT MEASURED and
 *       a page is never called orphan; hidden needs a rendered page → NOT MEASURED
 *   C6  NO count makes a page's links excessive: the count is reported with its denominator and has no verdict. A link is WEAKLY
 *       CONTEXTUAL when its name is empty, when it is an image link with no alt text, or when its WHOLE name is a generic link name
 *       declared for the page's language (config/audit/link-rules.mjs — data, never code). A page whose language declares none has that
 *       limb NOT MEASURED. A link named only by a web address is counted and has no verdict.
 *   C7  every count with its denominator, per page; INCOMPLETE named; three verdicts per part
 * Pure: pages and recorded destinations in; counts out. Never fetches, renders or writes.
 */
import { extractLinkDetails } from "../crawl/seeds.mjs";
import { scannable } from "./accessibility.mjs";
import { STATE, VERDICT } from "./link-audit.mjs";
import { GENERIC_LINK_NAMES, WEAK, NOT_MEASURED_REASON } from "../../config/audit/link-rules.mjs";

/* one vocabulary of classes and verdicts with the earlier audit (src/audit/link-audit.mjs), never a second */
export { STATE, VERDICT };
/** Where a page of the audited population comes from. */
export const POPULATION = Object.freeze({ BUILT: "BUILT, NOT YET PUBLISHED", LIVE: "LIVE" });
/** The record a bounded link-status check writes for one destination (src/audit/link-status.mjs). */
export const LINK_STATUS_RECORD = "link_status_observation";
export const MISSING = Object.freeze({
  hidden: "a rendered page — whether a link is hidden is decided by styles and scripts a stored raw-HTML body does not carry",
  orphaned: "a crawled set — this row reads only the pages the engine built, and none of them stands in a crawled set it reads, so no inbound link can be counted",
  genericNames: "declared generic link names for the page's language — none is declared, and none is guessed",
});

/**
 * C2/C3: what is recorded about one destination — its class, the length of its redirect chain when it has one, and the reason when it is
 * NOT MEASURED. Only a stored observation of the bounded link-status check decides (the latest one); with none the destination is
 * NOT MEASURED — never working, never broken. A crawl record is not read here.
 */
export function destinationOf(recs) {
  const checked = (recs ?? []).filter((r) => r?.record_type === LINK_STATUS_RECORD).at(-1) ?? null;
  if (!checked) return Object.freeze({ state: STATE.NOT_MEASURED, hops: null, reason: NOT_MEASURED_REASON.NEVER_CHECKED });
  const state = Object.values(STATE).includes(checked.state) ? checked.state : STATE.NOT_MEASURED;
  return Object.freeze({ state, hops: Number.isInteger(checked.hops) ? checked.hops : null, reason: state === STATE.NOT_MEASURED ? checked.reason ?? NOT_MEASURED_REASON.NO_STATUS : null });
}

const SKIPPED_HREF = (h) => h === null || h === "" || h.startsWith("#") || /^(mailto|tel|javascript):/i.test(h);
const hrefOf = (open) => { const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(open); return m ? (m[1] ?? m[2]).replace(/&amp;/g, "&").trim() : null; };
const altOf = (img) => { const m = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(img); return m ? (m[1] ?? m[2]).trim() : ""; };

/** C1: every link occurrence of one stored body, each with its target and — when its element can be aligned — its accessible name and
 * whether its content is an image (and whether any image in it has alt text). */
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
  /* the content of each closed anchor, in the same order and under the same skipping as the names above */
  const inner = [];
  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const href = hrefOf(m[1]);
    if (SKIPPED_HREF(href)) continue;
    try { new URL(href, base); inner.push(m[2]); } catch { /* as above */ }
  }
  const withContent = aligned && inner.length === named.length;
  return opened.map((to, i) => {
    const images = withContent ? inner[i].match(/<img\b[^>]*>/gi) ?? [] : null;
    return { to, name: aligned ? named[i] : null, image: images === null ? null : { present: images.length > 0, alt: images.some((t) => altOf(t) !== "") } };
  });
}

/** The language a stored body declares for itself (the primary subtag of <html lang>), or null. */
export function pageLanguage(html) {
  const m = /<html\b[^>]*\blang\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(String(html ?? ""));
  const v = m ? (m[1] ?? m[2]).trim().toLowerCase().split(/[-_]/)[0] : "";
  return /^[a-z]{2,3}$/.test(v) ? v : null;
}

/** C6: a name that is only a web address — counted, never judged. */
export const nameIsAddress = (name) => typeof name === "string" && /^(https?:\/\/|www\.)\S+$/i.test(name.trim());

/**
 * C6: is one link WEAKLY CONTEXTUAL? `names` is the declared list of generic names for the page's language, or null when none is declared.
 * @returns {{ weak: string|null, notMeasured: string|null }} the limb it is weak by, or what could not be measured for it
 */
export function weakOf(link, names) {
  if (link.name === null || link.name.accessibleNameSource === "NOT_MEASURED_ARIA_LABELLEDBY") return { weak: null, notMeasured: "the link's name could not be read from raw HTML" };
  /* an image link with no alt text: its content is an image, it has no text of its own and no aria-label, and no image in it has alt text */
  if (link.image?.present && link.name.anchorText === "" && link.name.accessibleNameSource !== "aria-label" && !link.image.alt) return { weak: WEAK.IMAGE_NO_ALT, notMeasured: null };
  if (link.name.accessibleName === null) return { weak: WEAK.EMPTY_NAME, notMeasured: null };
  if (names === null) return { weak: null, notMeasured: MISSING.genericNames };
  if (names.includes(link.name.accessibleName.trim().toLowerCase())) return { weak: WEAK.GENERIC_NAME, notMeasured: null };
  return { weak: null, notMeasured: null };
}

const tally = () => ({ [STATE.WORKING]: 0, [STATE.REDIRECTED]: 0, [STATE.BROKEN]: 0, [STATE.NOT_MEASURED]: 0 });
const side = () => ({ counts: tally(), redirectHops: 0, longestChain: 0, chainsOfUnknownLength: 0, reasons: {} });
const total = (t) => Object.values(t).reduce((a, b) => a + b, 0);
const partVerdict = (bad, unmeasured, n, complete) => (bad > 0 ? VERDICT.DISPROVED : n > 0 && unmeasured === 0 && complete ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE);
const add = (into, from) => { for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v; };
const note = (s, d) => {
  s.counts[d.state] += 1;
  if (d.state === STATE.NOT_MEASURED) s.reasons[d.reason ?? NOT_MEASURED_REASON.NO_STATUS] = (s.reasons[d.reason ?? NOT_MEASURED_REASON.NO_STATUS] ?? 0) + 1;
  /* a chain's length is reported for every link whose destination redirected, wherever the chain ends */
  if (d.state === STATE.REDIRECTED || (d.state === STATE.BROKEN && d.hops > 0)) { if (Number.isInteger(d.hops)) { s.redirectHops += d.hops; s.longestChain = Math.max(s.longestChain, d.hops); } else s.chainsOfUnknownLength += 1; }
};

/**
 * ONE page's links, counted (C1 to C7, per page). Internal means the target's host is the page's own host — or, for a page that has no
 * address of its own yet, one of the client's declared hosts (`page.internalHosts`).
 */
export function auditPage({ page, recordsOf, canon, genericNames = GENERIC_LINK_NAMES }) {
  const internal = side(), external = side();
  const anchor = { named: 0, nameless: 0, notMeasured: 0 };
  const weak = { [WEAK.EMPTY_NAME]: 0, [WEAK.IMAGE_NO_ALT]: 0, [WEAK.GENERIC_NAME]: 0 };
  let links = 0, weakNotMeasured = 0, genericNotMeasured = 0, addressNames = 0;
  const language = page.html === null ? null : pageLanguage(page.html);
  const names = language !== null && Array.isArray(genericNames?.[language]) ? genericNames[language].map((n) => String(n).trim().toLowerCase()) : null;
  const hosts = new Set(Array.isArray(page.internalHosts) ? page.internalHosts : [new URL(page.canonical).host]);
  if (page.html !== null) for (const l of linksOf(page.html, page.canonical)) {
    links += 1;
    const target = canon(l.to);
    const d = /^https?:/i.test(l.to) ? destinationOf(target === null ? [] : recordsOf(target)) : Object.freeze({ state: STATE.NOT_MEASURED, hops: null, reason: NOT_MEASURED_REASON.NOT_HTTP });
    note(target !== null && hosts.has(new URL(target).host) ? internal : external, d);
    if (l.name === null || l.name.accessibleNameSource === "NOT_MEASURED_ARIA_LABELLEDBY") anchor.notMeasured += 1;
    else if (l.name.accessibleName === null) anchor.nameless += 1;
    else anchor.named += 1;
    const w = weakOf(l, names);
    if (w.weak) weak[w.weak] += 1;
    else if (w.notMeasured) { weakNotMeasured += 1; if (w.notMeasured === MISSING.genericNames) genericNotMeasured += 1; }
    if (nameIsAddress(l.name?.accessibleName)) addressNames += 1;
  }
  return { population: page.population ?? POPULATION.BUILT, hasBody: page.html !== null, truncated: page.html !== null && page.truncated === true, language, links, internal, external, anchor,
    weak: { byLimb: weak, total: total(weak), notMeasured: weakNotMeasured, genericNotMeasured }, addressNames };
}

/**
 * @param {{ pages: {canonical:string, html:string|null, truncated?:boolean, population?:string, internalHosts?:string[]}[], recordsOf: (url:string)=>object[], canon: (u:string)=>string|null, genericNames?: object }} a
 */
export function auditLinks({ pages, recordsOf, canon, genericNames = GENERIC_LINK_NAMES }) {
  const perPage = pages.map((page) => auditPage({ page, recordsOf, canon, genericNames }));
  const internal = side(), external = side();
  const anchor = { named: 0, nameless: 0, notMeasured: 0 };
  const byLimb = { [WEAK.EMPTY_NAME]: 0, [WEAK.IMAGE_NO_ALT]: 0, [WEAK.GENERIC_NAME]: 0 };
  let links = 0, weakNotMeasured = 0, genericNotMeasured = 0, addressNames = 0;
  for (const p of perPage) {
    links += p.links;
    for (const [into, from] of [[internal, p.internal], [external, p.external]]) { add(into.counts, from.counts); add(into.reasons, from.reasons); into.redirectHops += from.redirectHops; into.longestChain = Math.max(into.longestChain, from.longestChain); into.chainsOfUnknownLength += from.chainsOfUnknownLength; }
    add(anchor, p.anchor); add(byLimb, p.weak.byLimb);
    weakNotMeasured += p.weak.notMeasured; genericNotMeasured += p.weak.genericNotMeasured; addressNames += p.addressNames;
  }
  const absentPages = perPage.filter((p) => !p.hasBody).length;
  const truncatedPages = perPage.filter((p) => p.truncated).length;
  const complete = absentPages === 0 && truncatedPages === 0;
  const withBody = pages.length - absentPages;
  const weakTotal = total(byLimb);
  const part = (s) => ({ counts: s.counts, denominator: total(s.counts), redirects: { links: s.counts[STATE.REDIRECTED], hops: s.redirectHops, longestChain: s.longestChain, ofUnknownLength: s.chainsOfUnknownLength }, notMeasuredReasons: s.reasons,
    verdict: partVerdict(s.counts[STATE.BROKEN], s.counts[STATE.NOT_MEASURED], total(s.counts), complete) });
  const parts = {
    internal: part(internal),
    external: part(external),
    anchorName: { counts: anchor, denominator: links, needsAPerson: anchor.named, verdict: partVerdict(anchor.nameless, anchor.notMeasured, links, complete) },
    /* C5: no page of this population stands in a crawled set — the inbound links of EVERY page are NOT MEASURED */
    orphaned: { notMeasured: pages.length, denominator: pages.length, missing: MISSING.orphaned, verdict: VERDICT.COULD_NOT_PROVE },
    hidden: { notMeasured: links, denominator: links, missing: MISSING.hidden, verdict: VERDICT.COULD_NOT_PROVE },
    /* C6: the count is reported and never judged — this part has NO verdict */
    excessive: { links, denominator: withBody, verdict: null },
    weaklyContextual: { weak: weakTotal, byLimb, notMeasured: weakNotMeasured, genericNotMeasured, denominator: links, missing: genericNotMeasured ? MISSING.genericNames : null, verdict: partVerdict(weakTotal, weakNotMeasured, links, complete) },
    /* C6: counted, never called weak, no verdict */
    addressNames: { count: addressNames, denominator: links, verdict: null },
  };
  const absent = [];
  if (absentPages) absent.push(`${absentPages} of ${pages.length} page(s) have no stored body`);
  if (truncatedPages) absent.push(`${truncatedPages} of ${withBody} stored bod(ies) were truncated by the collector`);
  if (internal.counts[STATE.NOT_MEASURED]) absent.push(`${internal.counts[STATE.NOT_MEASURED]} of ${total(internal.counts)} internal link(s) point at a target with no measured status`);
  if (external.counts[STATE.NOT_MEASURED]) absent.push(`${external.counts[STATE.NOT_MEASURED]} of ${total(external.counts)} external link(s) point at a destination with no measured status`);
  if (anchor.notMeasured) absent.push(`${anchor.notMeasured} of ${links} link name(s) could not be read from raw HTML`);
  if (pages.length) absent.push(`inbound links of ${pages.length} of ${pages.length} page(s): ${MISSING.orphaned}`);
  if (genericNotMeasured) absent.push(`${genericNotMeasured} of ${links} link(s) stand on a page whose language declares no generic link names — that limb is NOT MEASURED`);
  absent.push(`hidden: ${MISSING.hidden}`);
  const verdicts = Object.values(parts).map((x) => x.verdict).filter((v) => v !== null);
  const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : verdicts.every((v) => v === VERDICT.PROVED) ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE;
  return { pages: pages.length, pagesWithBody: withBody, absentPages, truncatedPages, links, parts, perPage, incomplete: pages.length > 0 && absent.length > 0, absent, verdict };
}

const reasonsLine = (reasons) => Object.entries(reasons).sort().map(([k, n]) => `${k} ${n}`).join(" · ");

/** C3/C7: a class count is printed only over what was measured; with nothing measured the classes read NOT MEASURED, never 0. */
export function formatPart(name, part) {
  const c = part.counts, n = part.denominator, nm = c[STATE.NOT_MEASURED], measured = n - nm;
  if (n === 0) return `${name}: no links of this kind (0 of 0) — ${part.verdict}`;
  const r = part.redirects;
  const chain = r && (r.hops > 0 || r.ofUnknownLength > 0) ? ` · redirect chains: ${r.hops} hop(s) in all, longest ${r.longestChain}${r.ofUnknownLength ? `, ${r.ofUnknownLength} of unrecorded length` : ""}` : "";
  const classes = measured === 0
    ? "WORKING, REDIRECTED and BROKEN are NOT MEASURED"
    : `WORKING ${c[STATE.WORKING]} · REDIRECTED ${c[STATE.REDIRECTED]} · BROKEN ${c[STATE.BROKEN]} (of ${measured} measured)${chain}`;
  const why = nm > 0 && part.notMeasuredReasons && Object.keys(part.notMeasuredReasons).length ? ` (${reasonsLine(part.notMeasuredReasons)})` : "";
  return `${name}: ${n} link(s) · ${classes} · NOT MEASURED ${nm} of ${n}${why} — ${part.verdict}`;
}

/** C7: one page's counts on one line — counts and denominators only; no address, name or text of the page. */
export function formatPage(p, index, of) {
  const t = (s) => total(s.counts);
  const cls = (s) => `WORKING ${s.counts[STATE.WORKING]} · REDIRECTED ${s.counts[STATE.REDIRECTED]} · BROKEN ${s.counts[STATE.BROKEN]} · NOT MEASURED ${s.counts[STATE.NOT_MEASURED]}${Object.keys(s.reasons).length ? ` (${reasonsLine(s.reasons)})` : ""}`;
  if (!p.hasBody) return `page ${index} of ${of} · ${p.population} · no stored body — its links are absent`;
  const hops = p.internal.redirectHops + p.external.redirectHops, longest = Math.max(p.internal.longestChain, p.external.longestChain);
  return `page ${index} of ${of} · ${p.population} · language ${p.language ?? "not declared"} · links ${p.links} (count only — never a pass or a failure)\n      internal ${t(p.internal)} of ${p.links}: ${cls(p.internal)}\n      external ${t(p.external)} of ${p.links}: ${cls(p.external)}\n      redirect chains: ${hops} hop(s) in all, longest ${longest}`
    + `\n      weak ${p.weak.total} of ${p.links} (${Object.entries(p.weak.byLimb).map(([k, n]) => `${k} ${n}`).join(" · ")}) · weak NOT MEASURED ${p.weak.notMeasured} of ${p.links}${p.weak.genericNotMeasured ? ` (${p.weak.genericNotMeasured}: no generic names declared for this language)` : ""} · named only by a web address ${p.addressNames} of ${p.links} (counted, no verdict)`
    + `\n      no accessible name ${p.anchor.nameless} of ${p.links} · name NOT MEASURED ${p.anchor.notMeasured} of ${p.links}`;
}
