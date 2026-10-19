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
const html = ({ url, title = "A concise title", desc = `about ${url}`, canonical = url, noindex = false, links = [], body = words(130) } = {}) =>
  `<html><head><title>${title}</title>${desc ? `<meta name="description" content="${desc}">` : ""}${canonical ? `<link rel="canonical" href="${canonical}">` : ""}${noindex ? '<meta name="robots" content="noindex">' : ""}</head><body><h1>H</h1><p>${body}</p>${links.map((l) => `<a href="${l}">x</a>`).join("")}</body></html>`;
const page = (id, extra = {}) => ({ id, url: `${O}/${id}/`, answer: [`c-${id}`], needs: [`n-${id}`], mainQuery: `query ${id}`, facts: [{ hasSource: true, hasDate: true }], ...extra });
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
  assert.ok(GUIDANCE.pages.some((p) => p.state === "BLOCKED"), "the BLOCKED page is kept, named");
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
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], body: words(20) }); }), ["readable without scripts"]);
  /* a list of links is not content: navigation text never lifts a thin page over the line */
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url], body: words(20) }).replace("</body>", `<nav>${words(200, "link")}</nav></body>`); }), ["readable without scripts"]);
  assert.deepEqual(failOf((q) => { q[0].html = html({ url: q[0].url, links: [q[1].url] }).replace("<h1>H</h1>", `<h1>H</h1><div>${words(200, "nav")}</div>`); }), ["a direct answer near the top"]);
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
  const src = ["src/page/page-gates.mjs", "src/page/owner-preview.mjs"].map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  assert.ok(!/\b(will|guaranteed to) (be )?(cite|cited|rank|appear)/i.test(src.replace(/no line here says or implies that any search or AI engine will show or cite a page/, "")), "a promise that an engine will cite or rank a page");
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "live-pages.jsonl"));
test("REAL · the five gates over the stored test data: the 13 missing meta descriptions and the 1 long title caught; the owner preview's pages pass every gate", { skip: HERE ? false : "the stored test data is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=page-gates", "--subject=almi-oet", `--research-batch=${BATCH}`, "--on=2026-10-19", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /live pages \(the 12 guides and the hub\): 13 page\(s\)/);
  assert.match(r.stdout, /C fails: a meta description 13 /);
  assert.match(r.stdout, / a concise title 1( |$)/m);
  const pv = /the owner preview \(the pages that passed\): (\d+) page\(s\) · pass A (\d+) · B (\d+) · C (\d+) · E (\d+) · all \(with D\) (\d+)/.exec(r.stdout);
  assert.ok(pv && Number(pv[1]) > 0 && pv.slice(2).every((n) => n === pv[1]), r.stdout);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).filter((l) => /page\(s\) ·/.test(l)).map((l) => l.trim()).join(" | ")}`);
});
