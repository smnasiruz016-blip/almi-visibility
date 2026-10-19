/**
 * 🔴 PAGE-1 · THE FOUR MISSING GATE FAMILIES (owner decision 1 of RR-293; RTP-1 PAGE-1, P20). A page passes only when every gate passes:
 *   A · SEMANTIC DUPLICATION — judged on intent + answer + coverage + useful value; a word-overlap percentage is a review SIGNAL only, never
 *       the verdict, its line carrying its recorded justification; the same intent with the same answer is MERGED, never a second page;
 *   B · CANNIBALIZATION — no two pages target the same need or the same main query; the weaker merges into the stronger, both named;
 *   C · TECHNICAL — crawlable, indexable, one self-canonical, a concise title, a meta description present and unique, internal links in and
 *       out, listed in the sitemap, each AI search bot allowed by robots, readable without scripts, a direct answer near the top, facts with
 *       visible sources and dates; and the site answers 404 for a URL not in the plan;
 *   D · COST — a build run is costed in the ledger BEFORE it starts; over its declared budget it is refused; NOT MEASURED is never zero.
 * Every guidance-dependent check cites its quote (the guidance record of RR-293, _handoffs AlmiVisibility_GUIDANCE_READ_2026-10-19.json);
 * a quote past its freshness window REFUSES the check that rests on it (RTP-1 P20). Pure: nothing is fetched, written or published, and no
 * line here says or implies that any search or AI engine will show or cite a page.
 * Generic: it names no client, product or host.
 */
import { parseRobots, isAllowedByRules } from "../crawl/robots.mjs";

export const GATES = Object.freeze({ A: "SEMANTIC_DUPLICATION", B: "CANNIBALIZATION", C: "TECHNICAL", D: "COST", E: "EXISTING_PAGE_FIRST" });
export const AI_SEARCH_BOTS = Object.freeze(["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]);
/** The review line for word overlap, with its recorded justification — a SIGNAL, never a verdict (RTP-1 P20; owner v3 §14.2, S5). */
export const OVERLAP_SIGNAL = Object.freeze({ at: 0.4, justification: "the owner's v3 §14.2 (RTP-1 S5): textual overlap above 40 per cent triggers review, never rejection on the percentage alone" });
/** The title review line, with its justification: the guidance sets no limit (G6) but asks for concise titles (G5) and truncates to the device. */
export const TITLE_REVIEW_AT = Object.freeze({ chars: 70, justification: "no limit is set by the guidance (G6), which asks for concise titles (G5) and truncates long ones to the device width; 70 characters is this engine's recorded review line" });
const TOP_WORDS = 120, MIN_TEXT_WORDS = 100;

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const visibleText = (html) => String(html ?? "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const tags = (html, t) => String(html ?? "").match(new RegExp(`<${t}\\b[^>]*>`, "gi")) ?? [];
const attr = (tag, a) => (new RegExp(`\\b${a}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag) ?? [])[1] ?? null;
const shingles = (t) => { const w = norm(t).split(" ").filter(Boolean); const s = new Set(); for (let i = 0; i + 5 <= w.length; i += 1) s.add(w.slice(i, i + 5).join(" ")); return s; };
const jaccard = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n += 1; return n / (a.size + b.size - n); };

/** The guidance a check rests on: CURRENT while its window is open, EXPIRED after — an expired quote refuses its check. */
export function citation(guidance, id, on) {
  const q = (guidance?.quotes ?? []).find((x) => x.id === id);
  if (!q) return Object.freeze({ id, state: "MISSING" });
  return Object.freeze({ id, state: q.validUntil >= on ? "CURRENT" : "EXPIRED", quote: q.quote, url: q.url, readOn: q.readOn, validUntil: q.validUntil });
}
const check = (name, ok, reason, cites = []) => Object.freeze({ name, result: ok === null ? "NOT MEASURED" : ok ? "PASS" : "FAIL", reason: ok ? null : reason, cites });

/* ── A ── */
export function semanticDuplication(pages, { guidance, on }) {
  const cites = [citation(guidance, "G1", on), citation(guidance, "G2", on), citation(guidance, "G3", on)];
  const expired = cites.filter((c) => c.state !== "CURRENT");
  const sh = new Map(pages.map((p) => [p.id, shingles(visibleText(p.html))]));
  const out = new Map();
  pages.forEach((p, i) => {
    const checks = [];
    if (expired.length) checks.push(check("guidance current", false, `the guidance it rests on is ${expired.map((c) => `${c.id} ${c.state}`).join(", ")} — refused until it is read again (RTP-1 P20)`, cites));
    checks.push(check("an answer of its own (useful value)", (p.answer ?? []).length > 0, "no answer of its own from a verified fact — no useful value of its own", cites));
    const signals = [];
    for (const q of pages.slice(0, i)) {
      const sameIntent = (p.mainQuery && norm(p.mainQuery) === norm(q.mainQuery)) || (p.needs?.length && q.needs?.length && [...p.needs].sort().join() === [...q.needs].sort().join());
      const sameAnswer = (p.answer ?? []).length > 0 && [...p.answer].sort().join() === [...(q.answer ?? [])].sort().join();
      if (sameIntent && sameAnswer) checks.push(check(`not the same as ${q.id}`, false, `the same intent and the same answer as ${q.id} — MERGE into it, never a second page`, cites));
      const j = jaccard(sh.get(p.id), sh.get(q.id));
      if (j >= OVERLAP_SIGNAL.at) signals.push(`overlap ${Math.round(j * 100)}% with ${q.id} — a review SIGNAL (${OVERLAP_SIGNAL.justification}), not the verdict`);
    }
    out.set(p.id, Object.freeze({ gate: GATES.A, pass: checks.every((c) => c.result === "PASS"), checks, signals }));
  });
  return out;
}

/* ── B ── */
export function cannibalization(pages, { guidance, on }) {
  const cites = [citation(guidance, "G1", on), citation(guidance, "G3", on)];
  const strength = (p) => [(p.answer ?? []).length, (p.demand ?? 0)];
  const stronger = (a, b) => { const [x, y] = [strength(a), strength(b)]; return x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : pages.indexOf(a) < pages.indexOf(b); };
  const out = new Map(pages.map((p) => [p.id, []]));
  for (let i = 0; i < pages.length; i += 1) for (let k = i + 1; k < pages.length; k += 1) {
    const a = pages[i], b = pages[k];
    const need = (a.needs ?? []).find((n) => (b.needs ?? []).includes(n));
    const query = a.mainQuery && norm(a.mainQuery) === norm(b.mainQuery) ? a.mainQuery : null;
    if (!need && !query) continue;
    const [win, lose] = stronger(a, b) ? [a, b] : [b, a];
    out.get(lose.id).push(check(`not competing with ${win.id}`, false, `targets the same ${need ? `need ${need}` : `main query "${query}"`} as ${win.id} — the weaker MERGES into the stronger (${win.id})`, cites));
  }
  return new Map([...out].map(([id, checks]) => [id, Object.freeze({ gate: GATES.B, pass: checks.length === 0, checks: checks.length ? checks : [check("one need, one page", true, null, cites)] })]));
}

/* ── C ── */
export function technical(pages, { guidance, on, site }) {
  const c = (id) => citation(guidance, id, on);
  const rules = typeof site?.robotsTxt === "string" ? site.robotsTxt : null;
  const allowed = (ua, url) => (rules === null ? null : isAllowedByRules(parseRobots(rules, ua), url));
  /* the site's other pages (an index, a hub) join the link graph — links in from them and out to them count — but are not gated here */
  const extra = site?.extraPages ?? [];
  const urls = new Set([...pages, ...extra].map((p) => p.url));
  const linksOf = (p) => tags(p.html, "a").map((a) => { try { return new URL(attr(a, "href") ?? "", p.url).href.replace(/#.*$/, ""); } catch { return null; } }).filter(Boolean);
  const inbound = new Map(pages.map((p) => [p.url, 0]));
  for (const p of [...pages, ...extra]) for (const l of new Set(linksOf(p))) if (l !== p.url && inbound.has(l)) inbound.set(l, inbound.get(l) + 1);
  const metas = pages.map((p) => { const d = tags(p.html, "meta").find((m) => /name=["']description["']/i.test(m)); return [p.id, d ? (attr(d, "content") ?? "").trim() : ""]; });
  const metaOf = new Map(metas);
  const sitemap = site?.sitemapUrls ? new Set(site.sitemapUrls) : null;
  const notPlanned = typeof site?.serve === "function" ? site.serve("/not-a-planned-page-rr293") : null;
  const out = new Map();
  for (const p of pages) {
    const html = String(p.html ?? "");
    const canon = tags(html, "link").filter((l) => /rel=["']canonical["']/i.test(l)).map((l) => attr(l, "href"));
    const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) ?? [])[1]?.trim() ?? "";
    /* the page's OWN text: navigation, header and footer do not count toward it (a list of links is not content) */
    const text = visibleText(html.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, " "));
    const words = text.split(" ").filter(Boolean);
    const firstP = (/<\/h1>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html) ?? [])[1];
    const firstPAt = firstP ? visibleText(html.slice(0, html.indexOf(firstP))).split(" ").length : Infinity;
    const out_ = new Set(linksOf(p).filter((l) => urls.has(l) && l !== p.url));
    const facts = p.facts ?? null; /* [{ hasSource, hasDate }] when the page's facts are known */
    const meta = metaOf.get(p.id);
    const dupMeta = meta ? metas.filter(([id, m]) => id !== p.id && m && m === meta).map(([id]) => id) : [];
    const checks = [
      check("crawlable", allowed("*", p.url), "the site's robots file disallows it", [c("G11")]),
      ...AI_SEARCH_BOTS.map((ua) => check(`${ua} allowed by robots`, allowed(ua, p.url), `${ua} is disallowed — the page can't be surfaced by that AI search`, [c(ua === "OAI-SearchBot" ? "O1" : ua === "PerplexityBot" ? "P2" : "A1")])),
      check("indexable", !tags(html, "meta").some((m) => /name=["']robots["']/i.test(m) && /noindex/i.test(attr(m, "content") ?? "")), "a noindex robots meta", [c("G11")]),
      check("one self-canonical", canon.length === 1 && canon[0] === p.url, canon.length === 0 ? "no canonical link" : canon.length > 1 ? `${canon.length} canonical links` : `canonical points elsewhere (${canon[0]})`, [c("G4")]),
      check("a concise title", title.length > 0 && title.length <= TITLE_REVIEW_AT.chars, title ? `the title is ${title.length} characters — over the review line of ${TITLE_REVIEW_AT.chars} (${TITLE_REVIEW_AT.justification})` : "no title", [c("G5"), c("G6")]),
      check("a meta description", meta.length > 0, "no meta description", [c("G8")]),
      check("a unique meta description", meta.length === 0 ? null : dupMeta.length === 0, `the same description as ${dupMeta?.join(", ")}`, [c("G7")]),
      check("internal links in", inbound.get(p.url) > 0, "no other page of the set links to it", [c("G9")]),
      check("internal links out", out_.size > 0, "it links to no other page of the set", [c("G10")]),
      check("listed in the sitemap", sitemap === null ? null : sitemap.has(p.url), "not in the sitemap", [c("G4")]),
      check("readable without scripts", words.length >= MIN_TEXT_WORDS, `${words.length} words without scripts (at least ${MIN_TEXT_WORDS})`, [c("G11"), c("G13")]),
      check("a direct answer near the top", firstPAt <= TOP_WORDS && norm(visibleText(firstP ?? "")).split(" ").length >= 8, firstP ? `the first paragraph starts after ${firstPAt} words` : "no paragraph after the main heading", [c("G13")]),
      check("facts with visible sources and dates", facts === null ? null : facts.length > 0 && facts.every((f) => f.hasSource && f.hasDate), facts === null ? "NOT MEASURED" : `${facts.filter((f) => !(f.hasSource && f.hasDate)).length} of ${facts.length} fact(s) without a visible source and date`, [c("G2")]),
      check("a URL not in the plan is 404", notPlanned === null ? null : notPlanned.status === 404, "an unplanned URL answered", []),
    ];
    const expired = checks.flatMap((x) => x.cites).filter((x) => x.state !== "CURRENT");
    const finalChecks = expired.length ? [...checks, check("guidance current", false, `guidance ${[...new Set(expired.map((x) => `${x.id} ${x.state}`))].join(", ")} — refused until read again (RTP-1 P20)`)] : checks;
    out.set(p.id, Object.freeze({ gate: GATES.C, pass: finalChecks.every((x) => x.result === "PASS"), checks: finalChecks }));
  }
  return out;
}

/* ── D ── */
/** A run's cost gate: an entry in the ledger BEFORE it starts, its estimate inside its declared budget; NOT MEASURED never passes as 0. */
export function costGate({ entry, startedAt, budget }) {
  const checks = [
    check("costed before it starts", Boolean(entry && entry.recorded_at && startedAt && entry.recorded_at <= startedAt), entry ? "the ledger entry was written after the run started" : "no ledger entry for the run"),
    check("money measured", entry?.money?.amountState === "MEASURED" || entry?.money?.amountState === "ZERO_BY_TARIFF", "the money figure is NOT MEASURED — never taken as zero, so the run cannot be shown inside its budget"),
    check("inside the declared budget", !budget || !entry?.money ? false : typeof entry.money.amount === "number" && entry.money.amount <= budget.money && (entry.requests ?? Infinity) <= budget.requests, budget ? `over the declared budget (${budget.money} ${budget.currency ?? ""}, ${budget.requests} request(s))` : "no declared budget"),
  ];
  return Object.freeze({ gate: GATES.D, pass: checks.every((x) => x.result === "PASS"), checks });
}

/** All five: E (existing page first, F34/F35, already in the engine) is handed in per page; the page passes only when all five pass. */
export function allGates(pages, { guidance, on, site, cost, existingFirst = () => true }) {
  const a = semanticDuplication(pages, { guidance, on }), b = cannibalization(pages, { guidance, on }), c = technical(pages, { guidance, on, site });
  return pages.map((p) => {
    const g = { A: a.get(p.id), B: b.get(p.id), C: c.get(p.id), D: cost, E: Object.freeze({ gate: GATES.E, pass: existingFirst(p) === true }) };
    return Object.freeze({ id: p.id, url: p.url, gates: g, pass: Object.values(g).every((x) => x.pass) });
  });
}
