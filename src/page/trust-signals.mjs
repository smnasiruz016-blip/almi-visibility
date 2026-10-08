/**
 * F93 · TRUST AND IDENTITY SIGNALS — who is responsible for a page, reachable about and contact pages, a visible last-updated date that matches
 * the page's recorded changes, and transparent sources; a missing signal is a finding and is never invented (acceptance _handoffs 4938f07,
 * RR-214; approved by its hash 87522358…, contract a83e76ec…).
 *
 *   C1  identity: the markers a declared list names (meta author, rel="author", structured-data author or publisher name) — PRESENT naming the
 *       marker, or ABSENT, a finding. Whether the identity is real, and any credential, expertise or experience: NOT MEASURED. A new page's
 *       responsible party is the client's RECORDED organisation identity, or ABSENT; nothing is ever written, generated or implied.
 *   C2  about / contact: a recorded page whose URL's last path segment is a declared word; reachable only through a recorded link to a target
 *       recorded WORKING (F23). An unobserved target: NOT MEASURED. Broken, redirected or not served: not reachable, a finding. A word outside
 *       the declared list: NOT MEASURED, named.
 *   C3  a visible date by declared markers, against the page's recorded fingerprints (F31): MATCHES when not before the latest recorded change and
 *       not after the latest observation; fewer than two fingerprints → NOT MEASURED; no visible date → ABSENT. A new page: NOT MEASURED until a
 *       recorded publication or change.
 *   C4  sources: a new page — F37's own every-claim-sourced record, read unchanged; an existing page — a recorded citation verdict for that page,
 *       or NOT MEASURED.
 *   C5  every signal is PRESENT, a FINDING or NOT MEASURED — never a default.
 *   C6  every result carries F31's bound; no claim about pages the inventory does not hold unless it is COMPLETE; one tenant, read-only.
 *   C7  F93 changes no other row.
 *
 * Pure. Records in, findings and a plan out. No file, no network, no provider, no store.
 */
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { targetState, STATE as F23 } from "../audit/link-audit.mjs";
import { canonicalUrl } from "../evidence/ids.mjs";

export const SIGNAL = Object.freeze({ PRESENT: "PRESENT", REACHABLE: "REACHABLE", MATCHES: "MATCHES", FINDING: "FINDING", NOT_MEASURED: "NOT MEASURED" });
export const ABOUT_WORDS = Object.freeze(["about", "about-us"]);
export const CONTACT_WORDS = Object.freeze(["contact", "contact-us"]);
export const NOT_VERIFIED = "NOT MEASURED — no record verifies an identity, a credential, expertise or experience";
export const NO_ORG_RECORD = "no recorded organisation identity for the client — none is invented";
export const NO_CITATION_RECORD = "NOT MEASURED — no recorded citation verdict for this page (F46 audits the fact registry, not pages)";
export const DATE_BEFORE_PUBLICATION = "NOT MEASURED — no recorded publication or change for a new page; no date is set before one";
export const STANDING = "findings and a plan only — F93 writes, generates or adds no author, organisation, credential, experience, page, link or date, publishes nothing and changes no other row";

const present = (s) => typeof s === "string" && s.trim() !== "";
const sameTenant = (a, b) => decideResolvedTenants(a, b).allowed === true;
const canon = (u) => { try { return canonicalUrl(String(u)); } catch { return null; } };
const lastSegment = (u) => { try { return new URL(u).pathname.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? ""; } catch { return ""; } };
const day = (iso) => (present(iso) && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toISOString().slice(0, 10) : null);

/* ── C1 · identity ── */
function jsonLdBlocks(html) {
  const out = [];
  for (const m of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const v = JSON.parse(m[1]); out.push(...(Array.isArray(v) ? v : v?.["@graph"] ?? [v])); } catch { /* unparseable: not a marker */ }
  }
  return out;
}
const nameOf = (x) => (typeof x === "string" ? x : Array.isArray(x) ? nameOf(x[0]) : x?.name);
export function identityOf(html) {
  const s = String(html ?? "");
  const markers = [];
  if (/<meta\b[^>]*name\s*=\s*["']author["'][^>]*content\s*=\s*["'][^"'\s][^"']*["']/i.test(s) || /<meta\b[^>]*content\s*=\s*["'][^"'\s][^"']*["'][^>]*name\s*=\s*["']author["']/i.test(s)) markers.push("meta-author");
  if (/<(a|link)\b[^>]*rel\s*=\s*["'][^"']*\bauthor\b[^"']*["']/i.test(s)) markers.push("rel-author");
  const ld = jsonLdBlocks(s);
  if (ld.some((b) => present(nameOf(b?.author)))) markers.push("structured-data-author");
  if (ld.some((b) => present(nameOf(b?.publisher)))) markers.push("structured-data-publisher");
  return Object.freeze(markers.length
    ? { signal: SIGNAL.PRESENT, markers: Object.freeze(markers), credentials: NOT_VERIFIED }
    : { signal: SIGNAL.FINDING, why: "no identity marker on the page (meta author, rel=author, structured-data author or publisher)", markers: Object.freeze([]), credentials: NOT_VERIFIED });
}

/* ── C2 · about and contact ── */
export const kindOf = (url) => { const w = lastSegment(url); return ABOUT_WORDS.includes(w) ? "about" : CONTACT_WORDS.includes(w) ? "contact" : null; };
const nearMiss = (url) => { const w = lastSegment(url); return !kindOf(url) && /about|contact/.test(w); };
/** One status for a target from its recorded observations: F23's class, NOT SERVED when every record has no served state. */
export function statusOf(recs) {
  const list = recs ?? [];
  if (list.length && list.every((r) => r && !r.skipped && !Number.isInteger(r.status) && present(r.error))) return "NOT SERVED";
  return list.length ? targetState(list) : "UNOBSERVED";
}
export function reachOf({ pageId, kind, edges = [], recordsOf = () => [] }) {
  const out = edges.filter((e) => e.fromPageId === pageId);
  const hits = out.filter((e) => kindOf(e.toUrl) === kind).map((e) => ({ url: canon(e.toUrl), status: statusOf(recordsOf(e.toUrl)) }));
  const near = out.filter((e) => nearMiss(e.toUrl) && new RegExp(kind).test(lastSegment(e.toUrl)));
  if (hits.some((h) => h.status === F23.WORKING)) return Object.freeze({ signal: SIGNAL.REACHABLE, targets: Object.freeze(hits.filter((h) => h.status === F23.WORKING).map((h) => h.url)) });
  if (hits.some((h) => h.status === "UNOBSERVED" || h.status === F23.NOT_MEASURED)) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: `the linked ${kind} URL has no usable recorded status — never observed, or its records disagree` });
  if (hits.length) return Object.freeze({ signal: SIGNAL.FINDING, why: `the linked ${kind} page is recorded ${hits.map((h) => h.status).join(", ")} — not reachable` });
  if (near.length) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: `a linked URL's last word names ${kind} outside the declared list — not decided` });
  return Object.freeze({ signal: SIGNAL.FINDING, why: `no recorded link from this page to a recorded ${kind} page` });
}

/* ── C3 · the visible date and the recorded changes ── */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function wordDate(s) {
  const m = /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i.exec(s);
  return m ? `${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
export function visibleDateOf(html) {
  const s = String(html ?? "");
  const dates = [];
  for (const m of s.matchAll(/<time\b[^>]*datetime\s*=\s*["']([^"']+)["']/gi)) dates.push({ marker: "time-element", date: day(m[1]) });
  for (const b of jsonLdBlocks(s)) if (present(b?.dateModified)) dates.push({ marker: "structured-data-dateModified", date: day(b.dateModified) });
  const text = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const m of text.matchAll(/(?:last\s+updated|updated\s+on)\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi)) dates.push({ marker: "last-updated-wording", date: /^\d{4}-/.test(m[1]) ? day(m[1]) : wordDate(m[1]) });
  const ok = dates.filter((d) => d.date);
  return ok.length ? ok.sort((a, b) => b.date.localeCompare(a.date))[0] : null;
}
export function dateOf({ html, fingerprints = [] }) {
  const v = visibleDateOf(html);
  if (!v) return Object.freeze({ signal: SIGNAL.FINDING, why: "no visible last-updated date (time element, structured-data dateModified, or last-updated wording)" });
  const fps = [...fingerprints].filter((f) => present(f?.sha256) && day(f?.observedAt)).sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)));
  const distinct = new Set(fps.map((f) => f.sha256));
  if (distinct.size < 2) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, date: v.date, marker: v.marker, why: "fewer than two recorded fingerprints — no recorded change to match the date against" });
  const latestSha = fps.at(-1).sha256;
  const latestChange = day(fps.find((f) => f.sha256 === latestSha).observedAt);
  const latestObservation = day(fps.at(-1).observedAt);
  if (v.date < latestChange) return Object.freeze({ signal: SIGNAL.FINDING, date: v.date, marker: v.marker, why: `the visible date ${v.date} is earlier than the latest recorded change (${latestChange})` });
  if (v.date > latestObservation) return Object.freeze({ signal: SIGNAL.FINDING, date: v.date, marker: v.marker, why: `the visible date ${v.date} is later than the latest observation (${latestObservation})` });
  return Object.freeze({ signal: SIGNAL.MATCHES, date: v.date, marker: v.marker, latestChange, latestObservation });
}

/* ── C4 · sources ── */
export function sourcesOfDraft(draft) {
  const c = draft?.checks?.everyClaimSourced;
  if (!c || !present(c.state)) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: "the draft carries no every-claim-sourced record (F37 C3)" });
  return Object.freeze({ signal: c.state === "PASS" ? SIGNAL.PRESENT : SIGNAL.FINDING, record: Object.freeze({ ...c }), why: c.why ?? null });
}
export function sourcesOfPage(pageId, citationVerdicts = []) {
  const v = citationVerdicts.find((x) => x?.pageId === pageId);
  if (!v) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_CITATION_RECORD });
  return Object.freeze({ signal: v.verdict === "PASS" ? SIGNAL.PRESENT : SIGNAL.FINDING, ref: v.ref ?? null, why: v.why ?? null });
}

/** C6 · F31's verdict and its bound, carried whole. */
const boundOf = (v) => Object.freeze({ state: present(v?.state) ? v.state : "UNKNOWN", text: present(v?.bound) ? v.bound : "no completeness verdict recorded (F31)" });

/**
 * C1–C6 · one tenant's existing pages. `pages` [{pageId, tenantId, url, html, fingerprints}], `edges` [{fromPageId, toUrl}], `recordsOf`
 * the recorded observations of a URL, `citationVerdicts` recorded per-page citation verdicts (none exist today).
 */
export function auditTrust({ tenantId, pages = [], edges = [], recordsOf = () => [], completeness = null, citationVerdicts = [] }) {
  const own = [], refused = [];
  for (const p of pages) (sameTenant(p?.tenantId, tenantId) ? own : refused).push(p);
  const bound = boundOf(completeness);
  const complete = bound.state === "COMPLETE";
  const results = own.map((p) => {
    if (!present(p.html)) return Object.freeze({ pageId: p.pageId, measured: false, why: "NOT MEASURED — no stored body for this page" });
    return Object.freeze({
      pageId: p.pageId, measured: true,
      identity: identityOf(p.html),
      about: reachOf({ pageId: p.pageId, kind: "about", edges, recordsOf }),
      contact: reachOf({ pageId: p.pageId, kind: "contact", edges, recordsOf }),
      date: dateOf({ html: p.html, fingerprints: p.fingerprints ?? [] }),
      sources: sourcesOfPage(p.pageId, citationVerdicts),
    });
  });
  const recordedAbout = own.filter((p) => kindOf(p.url) === "about").length, recordedContact = own.filter((p) => kindOf(p.url) === "contact").length;
  const site = Object.freeze({
    aboutPageRecorded: recordedAbout > 0,
    contactPageRecorded: recordedContact > 0,
    siteHasNoAboutPage: recordedAbout > 0 ? false : complete ? true : SIGNAL.NOT_MEASURED,
    siteHasNoContactPage: recordedContact > 0 ? false : complete ? true : SIGNAL.NOT_MEASURED,
  });
  const tally = (part) => results.filter((r) => r.measured).reduce((m, r) => ((m[r[part].signal] = (m[r[part].signal] ?? 0) + 1), m), {});
  return Object.freeze({
    feature: "F93", tenantId, bound, site,
    pages: own.length, measured: results.filter((r) => r.measured).length,
    counts: Object.freeze({ identity: tally("identity"), about: tally("about"), contact: tally("contact"), date: tally("date"), sources: tally("sources") }),
    results: Object.freeze(results),
    refused: Object.freeze(refused.map((p) => Object.freeze({ pageId: p?.pageId ?? null, why: "ANOTHER TENANT'S PAGE — never read into this audit (C6)" }))),
    standing: STANDING,
  });
}

/** C1–C5 · the trust plan for one draft F37 rendered: what the page should show, from records only. */
export function planForDraft({ draft, organisation = null, pages = [], recordsOf = () => [], tenantId, completeness = null }) {
  const own = pages.filter((p) => sameTenant(p?.tenantId, tenantId));
  const linkTo = (kind) => {
    const working = own.filter((p) => kindOf(p.url) === kind && statusOf(recordsOf(p.url)) === F23.WORKING).map((p) => p.pageId);
    return working.length ? Object.freeze({ signal: SIGNAL.PRESENT, link: Object.freeze(working) }) : Object.freeze({ signal: SIGNAL.FINDING, why: `no recorded, WORKING ${kind} page of this tenant to link` });
  };
  return Object.freeze({
    feature: "F93", subject: draft?.subject ?? null, bound: boundOf(completeness),
    identity: present(organisation?.name) && present(organisation?.ref)
      ? Object.freeze({ signal: SIGNAL.PRESENT, organisation: organisation.name, ref: organisation.ref, credentials: NOT_VERIFIED })
      : Object.freeze({ signal: SIGNAL.FINDING, why: NO_ORG_RECORD, credentials: NOT_VERIFIED }),
    about: linkTo("about"), contact: linkTo("contact"),
    date: Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: DATE_BEFORE_PUBLICATION }),
    sources: sourcesOfDraft(draft),
    standing: STANDING,
  });
}
