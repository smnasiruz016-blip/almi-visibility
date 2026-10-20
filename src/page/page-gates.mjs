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
/* RR-294 (beta-g decision A): no word or fact count anywhere — "near the top" is a position, never a minimum length */
const TOP_WORDS = 120;

/* RR-298: letters and digits of ANY script count (Arabic, Urdu, Hindi, Chinese…) — a Latin-only fold erased them, so two different
 * Arabic questions read as the same query */
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
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
    /* RR-294 (beta-g decision B): a page must add something no other page already says — a page whose questions AND answers all stand on
     * another page that says more has no question of its own beyond it, and is MERGED into it */
    if (Array.isArray(p.questions) && (p.answer ?? []).length) {
      const pq = new Set(p.questions.map(norm)), pa = new Set(p.answer);
      for (const q of pages) {
        if (q === p || !Array.isArray(q.questions)) continue;
        const qq = new Set(q.questions.map(norm)), qa = new Set(q.answer ?? []);
        const covered = [...pq].every((x) => qq.has(x)) && [...pa].every((x) => qa.has(x));
        const more = qq.size > pq.size || qa.size > pa.size;
        if (covered && more) { checks.push(check(`a question of its own beyond ${q.id}`, false, `no question or answer of its own beyond ${q.id} — MERGE into it`, cites)); break; }
      }
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
    /* RR-294 (beta-g decision A): NO word or fact count. The direct answer near the top is the page's first sourced answer — a key-fact card
     * or an answer line, each carrying data-claim-id — standing within the first TOP_WORDS words of the page's own text */
    const own = html.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, " ");
    const firstAt = own.search(/<[^>]+data-claim-id=/i);
    const firstPAt = firstAt < 0 ? Infinity : visibleText(own.slice(own.search(/<body\b/i) >= 0 ? own.search(/<body\b/i) : 0, firstAt)).split(" ").filter(Boolean).length;
    const cardsShown = (own.match(/<li class="card"[\s\S]*?<\/li>/gi) ?? []).filter((li) => /class="src"[^>]*href=|href="[^"]+"[^>]*class="src"/.test(li) && /\d{4}-\d{2}-\d{2}/.test(li));
    /* every question planned for the page is answered — sourced and dated, or by its recorded CHECKED_NOT_FOUND line */
    const items = Array.isArray(p.items) ? p.items : null;
    const unanswered = items === null ? null : items.filter((it) => !(it.claims ?? []).some((c) => c.link && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? "")) && !(it.checkedNotFound ?? []).length).map((it) => it.heading?.wording ?? it.needId);
    const inHtml = items === null ? null : items.flatMap((it) => it.claims ?? []).filter((c) => c.text && !norm(text).includes(norm(String(c.text).slice(0, 80)).split(" ").slice(0, -1).join(" "))).length;
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
      check("answers in the page itself, no script needed", inHtml === null ? null : inHtml === 0, `${inHtml} answer line(s) not in the page's HTML`, [c("G11"), c("B5")]),
      check("every planned question answered, sourced and dated", unanswered === null ? null : unanswered.length === 0, `not answered with a source and date: ${(unanswered ?? []).join(" · ")}`, [c("G2"), c("B6")]),
      check("key facts shown as cards", cardsShown.length > 0, "no key-fact card with its source and checked date", [c("B6")]),
      check("a direct answer near the top", firstPAt <= TOP_WORDS, firstAt < 0 ? "no sourced answer on the page" : `the first sourced answer starts after ${firstPAt} words`, [c("G13"), c("B4")]),
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
    /* RR-297: no cost entry handed in is a FAIL of gate D, named — never a crash, never a pass */
    const d = cost ?? Object.freeze({ gate: GATES.D, pass: false, checks: Object.freeze([Object.freeze({ name: "the run's cost recorded before it starts", result: "FAIL", reason: "no cost entry was recorded for this run" })]) });
    const g = { A: a.get(p.id), B: b.get(p.id), C: c.get(p.id), D: d, E: Object.freeze({ gate: GATES.E, pass: existingFirst(p) === true }) };
    return Object.freeze({ id: p.id, url: p.url, gates: g, pass: Object.values(g).every((x) => x?.pass === true) });
  });
}

/**
 * PAGE-1 · THE ACCEPTANCE STEP of bin/build-page.mjs (RR-294 beta-g decision C): every candidate construction ACCEPTED is judged by all five
 * gates in the form it would go live (its noindex line made a canonical link to its URL); one that fails any gate is REFUSED — its HTML
 * withdrawn, so nothing of it is written — with each failing check named. A refusal is a result, not an error.
 */
export function acceptByPageGates(results, { guidance, on, site, cost, urlOf, itemsOf = () => null, existingFirst = () => true }) {
  const asLive = (html, url) => String(html ?? "").replace(/<meta name="robots" content="noindex[^"]*">/, `<link rel="canonical" href="${url}">`);
  const candidates = results.filter((c) => c.verdict === "ACCEPTED" && typeof c.html === "string");
  const pages = candidates.map((c) => { const items = itemsOf(c); return { id: c.slug, url: urlOf(c), html: asLive(c.html, urlOf(c)), needs: [], mainQuery: c.slug, questions: items ? items.flatMap((it) => (it.questions ?? []).map((q) => q.wording ?? q)) : null, answer: items ? items.flatMap((it) => (it.claims ?? []).map((x) => x.claimId)) : [], items, facts: items ? items.flatMap((it) => (it.claims ?? []).map((x) => ({ hasSource: Boolean(x.link), hasDate: /^\d{4}-\d{2}-\d{2}$/.test(x.readOn ?? "") }))) : null }; });
  const judged = new Map(allGates(pages, { guidance, on, site, cost, existingFirst }).map((r) => [r.id, r]));
  return results.map((c) => {
    const r = judged.get(c.slug);
    if (!r || r.pass) return Object.freeze({ ...c, pageGates: r ? "PASS" : "NOT JUDGED (not accepted by construction)" });
    const failed = Object.values(r.gates).flatMap((g) => (g.checks ?? [{ name: g.gate, result: g.pass ? "PASS" : "FAIL" }]).filter((x) => x.result !== "PASS").map((x) => `${g.gate}: ${x.reason ?? x.name}`));
    return Object.freeze({ ...c, verdict: "REFUSED", html: null, pageGates: "REFUSED", rejects: [...(c.rejects ?? []), ...failed.map((reason) => ({ part: "pageGates", reason }))] });
  });
}

/* PAGE-1 (RR-294 beta-g decision C; moved here by RR-295 when the old constructor was removed): the five gate families exist in this module
 * and run as bin/build-page.mjs's own acceptance step (acceptByPageGates) over the ONE page builder's pages. A page still needs every gate
 * to pass, and nothing is published by any of it. */
export const PAGE_ONE = Object.freeze({
  id: "PAGE-1",
  state: "SATISFIED",
  statement:
    "§3 makes five gates a CONJUNCTION before a new page; all five exist and run as build-page's acceptance step " +
    "(src/page/page-gates.mjs acceptByPageGates) — a page failing any one is refused, named",
  missingGateFamilies: Object.freeze([]),
  gates: Object.freeze(["semantic duplication", "cannibalization", "technical", "cost", "existing page first"]),
});
