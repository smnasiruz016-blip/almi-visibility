/**
 * RR-293 · PAGE-1's four missing gate families (owner decision 1) and the guidance they rest on (decision 2; RTP-1 P20), with the owner
 * preview (RTP-1 D5). One firing control per gate rule; REAL over the stored TEST DATA (owner decision 3: no product attached).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { semanticDuplication, cannibalization, technical, costGate, allGates, citation, OVERLAP_SIGNAL, TITLE_REVIEW_AT, AI_SEARCH_BOTS } from "../src/page/page-gates.mjs";
import { GUIDANCE } from "../config/guidance/guidance-read.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ON = "2026-10-19";
const words = (n, w = "word") => Array.from({ length: n }, (_, i) => `${w}${i}`).join(" ");
const O = "https://site.example";
/* RR-294: a page of the page law — a key-fact card with its source and checked date, then its sourced answer (data-claim-id) near the top */
const CARD = `<ul class="cards"><li class="card" data-claim-id="k1"><span class="k">Q</span><span class="v">V</span><a class="src" href="https://body.example/a" rel="nofollow">Source: a body</a><span class="src"> · Checked 2026-10-15</span></li></ul>`;
const html = ({ url, title = "A concise title", desc = `about ${url}`, canonical = url, noindex = false, links = [], body = words(130), card = CARD } = {}) =>
  `<html><head><title>${title}</title>${desc ? `<meta name="description" content="${desc}">` : ""}${canonical ? `<link rel="canonical" href="${canonical}">` : ""}${noindex ? '<meta name="robots" content="noindex">' : ""}</head><body><h1>H</h1>${card}<p data-claim-id="c1">${body}</p>${links.map((l) => `<a href="${l}">x</a>`).join("")}</body></html>`;
const page = (id, extra = {}) => ({ id, url: `${O}/${id}/`, answer: [`c-${id}`], needs: [`n-${id}`], mainQuery: `query ${id}`, facts: [{ hasSource: true, hasDate: true }], items: [{ needId: `n-${id}`, heading: { wording: `Q ${id}?` }, claims: [{ claimId: "c1", text: "word0 word1 word2 word3", link: "https://body.example/a", readOn: "2026-10-15" }] }], ...extra });
const ROBOTS = `User-agent: *\nAllow: /\n\n${AI_SEARCH_BOTS.map((b) => `User-agent: ${b}`).join("\n")}\nAllow: /\n`;
const twoPages = () => { const a = page("a"), b = page("b"); a.html = html({ url: a.url, links: [b.url] }); b.html = html({ url: b.url, links: [a.url] }); return [a, b]; };
const SITE = (ps) => ({ robotsTxt: ROBOTS, sitemapUrls: ps.map((p) => p.url), serve: (p) => ({ status: p === "/a" ? 200 : 404 }) });

test("the guidance: every quote one sentence, with its page, licence, read date and a 180-day window; an expired quote refuses its check", () => {
  assert.ok(GUIDANCE.quotes.length >= 10);
  assert.ok(GUIDANCE.quotes.every((q) => q.quote && q.url && q.licence && q.readOn && q.validUntil > q.readOn));
  assert.equal(citation(GUIDANCE, "G1", ON).state, "CURRENT");
  /* FIRING CONTROL: a day past the window — the quote is EXPIRED and gate A refuses */
  const late = "2028-01-01";
  assert.equal(citation(GUIDANCE, "G1", late).state, "EXPIRED");
  assert.equal(semanticDuplication(twoPages(), { guidance: GUIDANCE, on: late }).get("a").pass, false);
  /* RR-294 decision E: the Bing page, BLOCKED on the web, is READ from the owner's client file — never fetched — with B1–B7 checked word for word */
  const bing = GUIDANCE.pages.find((p) => p.id === "bing-webmaster-guidelines");
  assert.equal(bing.state, "READ");
  const bq = GUIDANCE.quotes.filter((q) => /^B\d$/.test(q.id));
  assert.equal(bq.length, 7);
  assert.ok(bq.every((q) => q.url.startsWith("client-file:") && /^[0-9a-f]{64}$/.test(q.textSha256)));
  for (const id of ["B4", "B5", "B6"]) assert.equal(citation(GUIDANCE, id, ON).state, "CURRENT", id);
});

test("A · the same intent and the same answer MERGE; a percentage is a signal, never the verdict; no answer of its own fails", () => {
  const [a, b] = twoPages();
  const ok = semanticDuplication([a, b], { guidance: GUIDANCE, on: ON });
  assert.ok(ok.get("a").pass && ok.get("b").pass);
  /* FIRING CONTROL: b with a's intent AND answer — MERGE */
  const dup = semanticDuplication([a, { ...b, mainQuery: a.mainQuery, answer: a.answer }], { guidance: GUIDANCE, on: ON });
  assert.equal(dup.get("b").pass, false);
  assert.match(dup.get("b").checks.find((c) => c.result === "FAIL").reason, /MERGE into it/);
  /* the same words with a DIFFERENT intent and answer: a review signal only — it still passes */
  const same = semanticDuplication([a, { ...b, html: a.html }], { guidance: GUIDANCE, on: ON });
  assert.equal(same.get("b").pass, true);
  assert.match(same.get("b").signals[0], /a review SIGNAL .* not the verdict/);
  assert.equal(OVERLAP_SIGNAL.at, 0.4);
  assert.match(OVERLAP_SIGNAL.justification, /never rejection on the percentage alone/);
  assert.equal(semanticDuplication([{ ...a, answer: [] }], { guidance: GUIDANCE, on: ON }).get("a").pass, false);
});

test("B · two pages of one need (or one main query): the weaker merges into the stronger, named", () => {
  const [a, b] = twoPages();
  assert.ok(cannibalization([a, b], { guidance: GUIDANCE, on: ON }).get("b").pass);
  /* FIRING CONTROLS: a shared need; a shared main query */
  const strong = { ...b, needs: a.needs, answer: ["x", "y"] };
  const r = cannibalization([a, strong], { guidance: GUIDANCE, on: ON });
  assert.equal(r.get("a").pass, false);
  assert.match(r.get("a").checks[0].reason, /MERGES into the stronger \(b\)/);
  assert.equal(cannibalization([a, { ...b, mainQuery: a.mainQuery }], { guidance: GUIDANCE, on: ON }).get("b").pass, false);
});

test("C · each technical rule fires alone: noindex, canonical, title, meta, unique meta, links in and out, sitemap, AI bots, no-script text, answer at the top, sources and dates, 404", () => {
  const ps = twoPages();
  const base = technical(ps, { guidance: GUIDANCE, on: ON, site: SITE(ps) });
  assert.ok(base.get("a").pass, JSON.stringify(base.get("a").checks.filter((c) => c.result !== "PASS")));
  const failOf = (mutate, site = SITE(ps)) => { const q = ps.map((p) => ({ ...p })); mutate(q); return technical(q, { guidance: GUIDANCE, on: ON, site }).get("a").checks.filter((c) => c.result !== "PASS").map((c) => c.name); };
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], noindex: true }); }), ["indexable"]);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], canonical: `${O}/elsewhere/` }); }), ["one self-canonical"]);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], title: "x".repeat(TITLE_REVIEW_AT.chars + 1) }); }), ["a concise title"]);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], desc: "" }); }), ["a meta description", "a unique meta description"]);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], desc: `about ${q[1].url}` }); }), ["a unique meta description"]);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url }); }), ["internal links out"]);
  assert.deepEqual(failOf((q) => { q[1].html = html({ url: q[1].url }); }), ["internal links in"]);
  assert.deepEqual(failOf(() => {}, { ...SITE(ps), sitemapUrls: [ps[1].url] }), ["listed in the sitemap"]);
  assert.deepEqual(failOf(() => {}, { ...SITE(ps), robotsTxt: "User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nUser-agent: Claude-SearchBot\nAllow: /\n\nUser-agent: PerplexityBot\nDisallow: /\n" }).filter((n) => /PerplexityBot/.test(n)).length, 1);
  /* RR-294 (beta-g decision A): NO word count — a short complete page passes; completeness is measured instead */
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], body: words(20) }); }), []);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], card: "" }); }), ["key facts shown as cards"]);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url] }).replace("<h1>H</h1>", `<h1>H</h1><div>${words(200, "intro")}</div>`); }), ["a direct answer near the top"]);
  /* a list of links is not the page's own text: navigation before the answer does not push it down */
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url] }).replace("<h1>H</h1>", `<h1>H</h1><nav>${words(200, "link")}</nav>`); }), []);
  assert.deepEqual(failOf((q) => { q[0].items = [...q[0].items, { needId: "n2", heading: { wording: "Unanswered?" }, claims: [{ claimId: "c2", text: "x", link: null, readOn: null }] }]; }), ["every planned question answered, sourced and dated"]);
  assert.deepEqual(failOf((q) => { q[0].items = [{ ...q[0].items[0], claims: [{ ...q[0].items[0].claims[0], text: "a sentence that is nowhere on the page at all" }] }]; }), ["answers in the page itself, no script needed"]);
  assert.deepEqual(failOf((q) => { q[0].facts = [{ hasSource: true, hasDate: false }]; }), ["facts with visible sources and dates"]);
  assert.deepEqual(failOf(() => {}, { ...SITE(ps), serve: () => ({ status: 200 }) }), ["a URL not in the plan is 404"]);
});

test("D · a run is costed BEFORE it starts; over its budget it is refused; NOT MEASURED is never zero", () => {
  const entry = { recorded_at: "2026-10-19T10:00:00Z", money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "local" }, requests: 0 };
  const budget = { money: 0, currency: "USD", requests: 0 };
  assert.equal(costGate({ entry, startedAt: "2026-10-19T10:00:01Z", budget }).pass, true);
  /* FIRING CONTROLS */
  assert.equal(costGate({ entry, startedAt: "2026-10-19T09:59:00Z", budget }).pass, false, "an entry written after the start");
  assert.equal(costGate({ entry: null, startedAt: "x", budget }).pass, false);
  assert.equal(costGate({ entry: { ...entry, money: { amountState: "MEASURED", amount: 5, currency: "USD" } }, startedAt: "2026-10-19T10:00:01Z", budget }).pass, false, "over the budget");
  const nm = costGate({ entry: { ...entry, money: { amountState: "UNKNOWN", amount: null } }, startedAt: "2026-10-19T10:00:01Z", budget });
  assert.equal(nm.pass, false, "NOT MEASURED passed as zero");
  /* its OWN check refuses it — not only the budget line beside it */
  assert.equal(nm.checks.find((c) => c.name === "money measured").result, "FAIL", "NOT MEASURED was read as a measured figure");
});

test("all five: one gate failing fails the page; no page text says an engine will cite it", () => {
  const ps = twoPages();
  const cost = costGate({ entry: { recorded_at: "a", money: { amountState: "ZERO_BY_TARIFF", amount: 0 }, requests: 0 }, startedAt: "b", budget: { money: 0, requests: 0 } });
  assert.ok(allGates(ps, { guidance: GUIDANCE, on: ON, site: SITE(ps), cost }).every((r) => r.pass));
  assert.ok(allGates(ps, { guidance: GUIDANCE, on: ON, site: SITE(ps), cost, existingFirst: (p) => p.id !== "a" }).find((r) => r.id === "a").pass === false);
  const src = ["src/page/page-gates.mjs", "src/page/one-builder.mjs", "src/page/joined-page.mjs"].map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  assert.ok(!/\b(will|guaranteed to) (be )?(cite|cited|rank|appear)/i.test(src.replace(/no line here says or implies that any search or AI engine will show or cite a page/, "")), "a promise that an engine will cite or rank a page");
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "live-pages.jsonl"));
test("REAL · the five gates over the stored test data: the 13 missing live meta descriptions caught; the ONE builder’s guides gated, every failure named (RR-295: the 31 plan drafts are removed)", { skip: HERE ? false : "the stored test data is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=page-gates", "--subject=almi-oet", `--research-batch=${BATCH}`, "--on=2026-10-19", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /live pages \(the 12 guides and the hub\): 13 page\(s\)/);
  assert.match(r.stdout, /C fails: a meta description 13 /);
  /* RR-294: no second template — the guides come from the one builder, each failure named. RR-295: no plan page is built (decision 3) */
  const g = /the one builder · the 12 guides rebuilt: 12 page\(s\) · pass A (\d+) · B (\d+) · C (\d+) · D (\d+) · E (\d+) · all (\d+)/.exec(r.stdout);
  assert.ok(g, r.stdout);
  assert.doesNotMatch(r.stdout, /plan pages/, "a plan page was built");
  assert.ok(Number(g[6]) >= 11, "the rebuilt guides pass the gates, bar a named one");
  const ob = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=one-builder", "--subject=almi-oet", `--research-batch=${BATCH}`, "--on=2026-10-19", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc", "--list"], { cwd: REPO, encoding: "utf8" });
  assert.equal(ob.status, 0, ob.stderr);
  const rows = ob.stdout.split(/\r?\n/).filter((l) => /^\s+(PASS|FAIL) /.test(l));
  assert.equal(rows.length, 12, "the 12 guides, and no plan page");
  assert.match(ob.stdout, /key-fact cards refused 0/, "RR-295: every card of the 12 guides is shown — same meaning, every number, unit and condition kept");
  assert.ok(rows.filter((l) => /FAIL/.test(l)).every((l) => / — \S/.test(l)), "every failing page carries its plain reason");
  assert.match(ob.stdout, /design the client's own \(its questionnaire\)/);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).filter((l) => /page\(s\) ·/.test(l)).map((l) => l.trim()).join(" | ")}`);
});
