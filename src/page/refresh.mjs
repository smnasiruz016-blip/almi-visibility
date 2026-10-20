/**
 * 🔴 AUTO-REFRESH (RR-297, item 1). When a recheck finds a source fact CHANGED, every page and article that shows that fact is rebuilt by the
 * ONE builder with the new value, its source and its new checked date — same gates; same-meaning words allowed, numbers, units and
 * conditions exact (the key-fact check). The rebuilt page follows the client's publish mode (AUTO after the gates, or REVIEW FIRST).
 *   · a CHANGED recheck carries the fact as re-read: `newClaim` { text, quotation, readOn, cardValue? }. One that does not record the new
 *     wording cannot be rebuilt — it is REPORTED ("changed, its new wording is not recorded"), and the page is left as it is;
 *   · a BLOCKED or REJECTED recheck never changes a page: it is reported;
 *   · a page that shows no changed fact is not rebuilt at all — it stays byte-identical;
 *   · the client gets one plain line per change: what changed, on which pages, old → new.
 * Pure: nothing is written, fetched or published. Generic: no client is named.
 */
import { renderItems, gateInput, servedBy } from "./one-builder.mjs";
import { allGates } from "./page-gates.mjs";
import { publishDecision } from "./articles.mjs";

const claimIdOf = (factId) => String(factId ?? "").replace(/^claim:/, "");
const valueOf = (keyFacts, claimId, text) => keyFacts.find((k) => k.claimId === claimId)?.value ?? text;

/** Plan the refresh: each recheck → a CHANGE (rebuild the pages showing it) or a REPORTED line (nothing changes). */
export function refreshPlan({ rechecks = [], pages = [] }) {
  const shows = (p, id) => (p.items ?? []).some((it) => it.claims.some((c) => c.claimId === id));
  const changes = [], reported = [];
  for (const r of rechecks.filter((x) => x?.record_type === "fact_recheck")) {
    const id = claimIdOf(r.factId);
    const on = pages.filter((p) => shows(p, id)).map((p) => p.url);
    if (r.state === "BLOCKED" || r.state === "REJECTED") { reported.push(Object.freeze({ claimId: id, state: r.state, reason: r.reason ?? null, pages: on, line: `${id}: the recheck was ${r.state}${r.reason ? ` (${r.reason})` : ""} — no page was changed` })); continue; }
    if (r.state !== "CHANGED") continue;
    const n = r.newClaim;
    if (!n || typeof n.text !== "string" || !n.text.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(n.readOn ?? "")) { reported.push(Object.freeze({ claimId: id, state: "CHANGED", reason: "NEW_WORDING_NOT_RECORDED", pages: on, line: `${id}: the source changed, but its new wording is not recorded — no page was changed; it waits for the corrected fact` })); continue; }
    if (!on.length) { reported.push(Object.freeze({ claimId: id, state: "CHANGED", reason: "SHOWN_ON_NO_PAGE", pages: [], line: `${id}: the source changed; no page shows this fact` })); continue; }
    changes.push(Object.freeze({ claimId: id, newClaim: n, pages: on, url: r.url ?? null }));
  }
  return Object.freeze({ changes: Object.freeze(changes), reported: Object.freeze(reported) });
}

/**
 * Run the refresh over the client's pages and articles: `pages` are [{ url, title, items, questions, related }] as they stand, each with its
 * current `html`. Returns the rebuilt pages (with their gate verdict and publish decision), the untouched pages (their html as it was), the
 * client's one-line notes, and what was only reported.
 */
export function refreshRun({ rechecks, pages, keyFacts = [], quotationOf = null, design, on, settings = {}, guidance, robotsTxt, cost, extraPages = [] }) {
  const plan = refreshPlan({ rechecks, pages });
  const changed = new Map(plan.changes.map((c) => [c.claimId, c]));
  const facts = keyFacts.map((k) => (changed.has(k.claimId) && changed.get(k.claimId).newClaim.cardValue ? { ...k, value: changed.get(k.claimId).newClaim.cardValue } : k));
  const quote = (id) => (changed.has(id) ? changed.get(id).newClaim.quotation ?? null : quotationOf ? quotationOf(id) : null);
  const rebuilt = [], untouched = [];
  for (const p of pages) {
    if (!p.items.some((it) => it.claims.some((c) => changed.has(c.claimId)))) { untouched.push(p); continue; }
    const items = p.items.map((it) => ({ ...it, claims: it.claims.map((c) => (changed.has(c.claimId) ? { ...c, text: changed.get(c.claimId).newClaim.text, quotation: changed.get(c.claimId).newClaim.quotation ?? c.quotation, readOn: changed.get(c.claimId).newClaim.readOn, link: changed.get(c.claimId).newClaim.link ?? c.link } : c)) }));
    const r = renderItems({ title: p.title, items, keyFacts: facts, rates: [], quotationOf: quote, design, stamp: null, on, related: p.related ?? [] });
    rebuilt.push({ ...p, ...r, url: p.url, title: p.title, questions: p.questions, answer: items.flatMap((it) => it.claims.map((c) => c.claimId)) });
  }
  const gated = [...rebuilt.map(gateInput), ...untouched.map((p) => p.gate).filter(Boolean)];
  const verdicts = allGates(gated, { guidance, on, cost, site: { robotsTxt, sitemapUrls: gated.map((g) => g.url), serve: servedBy(gated), extraPages } });
  const out = rebuilt.map((p) => {
    const v = verdicts.find((x) => x.id === p.url);
    const passed = Boolean(v?.pass);
    const failed = v ? Object.values(v.gates).flatMap((g) => (g?.checks ?? []).filter((c) => c.result !== "PASS").map((c) => `${g.gate}: ${c.reason ?? c.name}`)) : ["not judged"];
    return Object.freeze({ url: p.url, html: p.html, cards: p.cards, gates: passed ? "PASS" : `REFUSED — ${failed[0] ?? "a gate refused it"}`, publish: publishDecision({ url: p.url, day: on, settings, gatesPassed: passed }) });
  });
  const notes = plan.changes.map((c) => {
    const before = pages.flatMap((p) => p.items.flatMap((it) => it.claims)).find((x) => x.claimId === c.claimId);
    return `"${valueOf(keyFacts, c.claimId, before?.text ?? c.claimId)}" → "${c.newClaim.cardValue ?? c.newClaim.text}" (checked ${c.newClaim.readOn}) — rebuilt: ${c.pages.join(", ")}`;
  });
  return Object.freeze({ rebuilt: Object.freeze(out), untouched: Object.freeze(untouched.map((p) => ({ url: p.url, html: p.html }))), notes: Object.freeze(notes), reported: plan.reported });
}
