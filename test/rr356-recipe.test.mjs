/**
 * 🔴 RR-356 · THE PAGE RECIPE v3 IN FULL (desktop/recipe.mjs, desktop/serp.mjs) with the owner's rulings R1–R9: each step runs and is tested,
 * each check fails when its step is broken (the sabotage run in the PR).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { personOf, questionsOf, clusterIntents, coverageOf, secondSearch, covers, decisionOf, rightToExist, freshness, factClass, overlap, duplicationReview, afterPublish, BATCH } from "../desktop/recipe.mjs";
import { searchGoogle, readSerp, communityQuestions, mayBuy, SERP, SERP_OFF } from "../desktop/serp.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";

const ON = "2026-11-01";
const NURSES = { kind: "profession", profession: "nursing", title: "OET for Nurses", questions: [{ question: "oet score for nurses uk", source: "AlmiWorld keyword service" }, { question: "Is OET accepted for nurses in Australia?", source: "a Reddit result as Google shows it (2026-11-01)" }] };

test("RR-356 · G0 + G1–G2 + G4 · the person, the question universe with every source, same-intent wordings clustered", () => {
  assert.deepEqual(personOf(NURSES, { subject: "OET" } /* RR-359: no default subject */), { person: "A trained nurse who wants to work abroad", context: "must show English for registration with a council in another country", goal: "know which council asks which OET score, and how the OET for nurses works" });
  const qs = questionsOf(NURSES, { on: ON, subject: "OET" });
  for (const c of ["first", "eligibility", "cost", "time", "exceptions", "next", "actions", "documents", "mistakes"]) assert.ok(qs.some((q) => q.category === c), c);
  assert.deepEqual(qs.filter((q) => q.category === "asked").map((q) => [q.from, q.source]), [["search", "AlmiWorld keyword service"], ["reddit", "a Reddit result as Google shows it (2026-11-01)"]], "each question keeps its source");
  const cl = clusterIntents([{ question: "oet fee for nurses" }, { question: "OET fees for nurses" }, { question: "oet result time" }]);
  assert.deepEqual(cl.map((c) => [c.intent, c.wordings.length]), [["oet fee for nurses", 2], ["oet result time", 1]], "one intent, its real wordings kept");
});

test("RR-356 · R4 + G1 · Google's results through the paid service — OFF by default, a hard cap of $1 a day; Reddit / Quora only as Google shows them", async () => {
  /* OFF: nothing is bought, said */
  const off = await searchGoogle({ keyword: "oet for nurses", settings: {}, ledger: { spent: [] }, fetchImpl: () => { throw new Error("bought while off"); } });
  assert.deepEqual([off.ok, off.off, off.why], [false, true, SERP_OFF]);
  /* the cap: a search that could pass $1 today is refused BEFORE it is sent */
  assert.equal(mayBuy({ spent: [{ on: `${ON}T01:00:00Z`, cost: 0.999 }] }, { now: `${ON}T10:00:00Z` }).ok, false);
  assert.equal(mayBuy({ spent: [{ on: "2026-10-31T01:00:00Z", cost: 0.999 }] }, { now: `${ON}T10:00:00Z` }).ok, true, "yesterday's spend is not today's");
  /* the service's documented answer read: results, People also ask, related searches */
  const ANSWER = { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [
    { type: "organic", url: "https://a.example/oet-nurses", title: "OET for nurses guide", description: "…" },
    { type: "people_also_ask", items: [{ title: "What OET score do nurses need?" }] },
    { type: "organic", url: "https://www.reddit.com/r/nursing/comments/1/is_oet_hard/", title: "Is OET hard for nurses? : r/nursing", description: "…" },
    { type: "organic", url: "https://www.quora.com/How-do-I-prepare-for-OET", title: "How do I prepare for OET as a nurse? - Quora", description: "…" },
    { type: "related_searches", items: ["oet nursing requirements"] }] }] }] };
  const r = readSerp(ANSWER);
  assert.deepEqual([r.results.length, r.paa, r.related], [3, ["What OET score do nurses need?"], ["oet nursing requirements"]]);
  assert.deepEqual(communityQuestions(r.results, "reddit.com"), ["Is OET hard for nurses?"]);
  assert.deepEqual(communityQuestions(r.results, "quora.com"), ["How do I prepare for OET as a nurse?"]);
  /* ON: one POST to the service only — never to reddit.com or quora.com; the cost kept; a repeat comes from the cache */
  const calls = [], ledger = { spent: [], cache: {} };
  const got = await searchGoogle({ keyword: "oet for nurses", settings: { on: true }, ledger, login: "l", password: "p", now: `${ON}T10:00:00Z`, fetchImpl: async (u, init) => { calls.push(u); return { json: async () => ANSWER }; } });
  assert.equal(got.ok, true); assert.deepEqual(calls, [SERP.url]); assert.equal(ledger.spent.length, 1);
  assert.equal((await searchGoogle({ keyword: "oet for nurses", settings: { on: true }, ledger, login: "l", password: "p", fetchImpl: () => { throw new Error("bought twice"); } })).cached, true);
});

test("RR-356 · G5 + G6 · read what ranks → the coverage list (diagnostic only); the second-search test", () => {
  const read = [
    { url: "https://a.example", title: "OET for nurses", headings: ["OET score for NMC", "How long are results valid?", "Booking OET"] },
    { url: "https://b.example", title: "Nurses and OET", headings: ["OET scores for the NMC", "How long are results valid", "Writing tips"] },
    { url: "https://c.example", title: "OET nursing", headings: ["Booking the OET", "OET score for NMC"] }];
  const cov = coverageOf(read);
  assert.deepEqual(cov.map((c) => [c.topic, c.seenOn]), [["OET score for NMC", 3], ["How long are results valid?", 2], ["Booking OET", 2]], "a subtopic two or more results cover");
  const second = secondSearch({ best: { title: "OET for nurses", headings: ["OET score for NMC", "Booking OET"], text: "" }, paa: ["Can nurses take OET at home?"], coverage: cov });
  assert.deepEqual(second.map((s) => s.question), ["Can nurses take OET at home?", "How long are results valid?"], "what the reader would still search for");
  assert.equal(covers("How long are OET results valid? Two years.", "How long are results valid?"), true);
  assert.equal(covers("Booking closes 24 days before.", "How long are results valid?"), false);
});

test("RR-356 · G8 + G9 · the decision per intent; why this URL deserves to exist (R3: demand, or an opportunity)", () => {
  assert.equal(decisionOf({ row: { kind: "NEW" } }), "CREATE");
  assert.equal(decisionOf({ row: { kind: "IMPROVE" }, pack: { add: ["q"] } }), "IMPROVE");
  assert.equal(decisionOf({ row: { kind: "IMPROVE" }, pack: { add: [] } }), "KEEP", "the existing page already answers it");
  assert.equal(decisionOf({ row: { kind: "SECTION", into: "https://site/x" } }), "ADD SECTION");
  assert.equal(decisionOf({ row: { kind: "SECTION", into: "/new-page" } }), "MERGE");
  assert.equal(decisionOf({ row: { kind: "REFUSED", why: "no answer yet" } }), "MONITOR");
  assert.equal(decisionOf({ row: { kind: "REFUSED", why: "people searching this want another website" } }), "REJECT");
  assert.equal(decisionOf({ row: { kind: "NEW" }, measured: { verdict: "NOINDEX" } }), "NOINDEX");
  const demand = rightToExist({ page: NURSES, questions: questionsOf(NURSES, { subject: "OET" }), answered: 5 }), opp = rightToExist({ page: { ...NURSES, questions: [] }, questions: questionsOf({ ...NURSES, questions: [] }), answered: 5 });
  assert.equal(demand.kind, "demand"); assert.match(demand.why, /^2 searches people make \(search, reddit\)/);
  assert.equal(opp.kind, "opportunity"); assert.match(opp.why, /an opportunity page, built strong and watched/);
});

test("RR-356 · G14 + G15 · freshness windows (an expired fact is never current); textual overlap above 40% → a meaning review", () => {
  assert.deepEqual([factClass("costs AUD 587"), factClass("NMC registers nurses and asks for a test"), factClass("OET has 12 professions")], ["dynamic", "process", "stable"]);
  const f = freshness([{ text: "OET costs AUD 587", readOn: "2026-07-01" }, { text: "OET costs AUD 587", readOn: "2026-10-01" }], `${ON}T00:00:00Z`);
  assert.deepEqual([f.expired.length, f.fresh.length, f.fresh[0].until], [1, 1, "2026-12-30"], "a fee 90 days; 123 days old is expired");
  const shared = "the writing task is a letter written from case notes for your own profession and the word range is 180 to 200 words for every candidate";
  assert.ok(overlap(`${shared} nurses uk`, `${shared} doctors ireland`) > 0.4);
  const r = duplicationReview([{ url: "a", title: "OET for Nurses", intent: "nurses", text: `${shared} a`, facts: ["n1", "s"] }, { url: "b", title: "OET for Doctors", intent: "doctors", text: `${shared} b`, facts: ["d1", "s"] }, { url: "c", title: "OET Nurses Guide", intent: "nurses", text: `${shared} c`, facts: ["n1", "s"] }]);
  assert.equal(r.get("b").verdict, "distinct", "shared questions, its own facts — reviewed, distinct");
  assert.equal(r.get("c").verdict, "duplicate", "the same intent and the same facts");
});

test("RR-356 · G18–G20 · small batches; after publishing: no verdict before 28 days, weak → improved once, then a proposal (never auto-deleted)", () => {
  assert.equal(BATCH, 5);
  const live = [{ url: "a", live: "https://x/a", on: "2026-10-20T00:00:00Z" }, { url: "b", live: "https://x/b", on: "2026-07-01T00:00:00Z" }, { url: "c", live: "https://x/c", on: "2026-07-01T00:00:00Z" }, { url: "d", live: "https://x/d", on: "2026-07-01T00:00:00Z" }];
  const v = afterPublish({ live, perPage: { "https://x/b": { impressions: 300, clicks: 4 }, "https://x/c": { impressions: 20, clicks: 0 }, "https://x/d": { impressions: 30, clicks: 0 } }, improved: { d: true }, now: `${ON}T00:00:00Z` });
  assert.deepEqual(v.map((x) => x.verdict), ["WAIT", "KEEP", "WEAK", "NOINDEX"]);
  assert.match(v[3].line, /nothing changes without your OK/);
});

test("RR-356 · the checks in the drafts: intent completeness against the coverage list, fact freshness — each names what is missing", () => {
  const pg = (path, fact) => ({ url: `https://c.example${path}`, title: "Clinic", h1: "Clinic", h2: [], qa: [], facts: [fact], lead: [], prices: [] });
  const site = { ok: true, origin: "https://c.example", readOn: ON, robotsTxt: null, sitemapUrls: null, shell: { from: "https://c.example", head: "<style>x</style>", header: "<header>h</header>", footer: "<footer>f</footer>" },
    pages: [pg("/", "Teeth whitening at the clinic takes 60 minutes for most people."), pg("/whitening", "Teeth whitening takes 60 to 90 minutes at the clinic, with a check after.")] };
  const plan = [{ kind: "topic", title: "How long does teeth whitening take", items: [{ part: "topic", question: "How long does teeth whitening take?", claims: [{ claimId: "c1", text: "Teeth whitening takes 60 to 90 minutes at the clinic.", link: "https://c.example/whitening", readOn: "2026-10-30", source: "c.example", official: true }] }], coverage: [{ topic: "Does whitening hurt" }], second: [] }];
  const d = seoPages({ site, on: `${ON}T10:00:00Z`, pagePlan: plan }).drafts[0];
  const H = d.gates.find((g) => g.gate === "H"), I = d.gates.find((g) => g.gate === "I");
  assert.deepEqual(d.suggestions, ["Does whitening hurt"], "RR-362 item 15: a suggestion to add, never a failure"); assert.deepEqual(H.failing, []);
  assert.equal(I.pass, true);
  const old = seoPages({ site, on: `${ON}T10:00:00Z`, pagePlan: [{ ...plan[0], coverage: [], items: [{ ...plan[0].items[0], claims: [{ ...plan[0].items[0].claims[0], readOn: "2025-09-01" }] /* a length of time: a stable fact, a year at most */ }] }] }).drafts[0];
  assert.match(old.gates.find((g) => g.gate === "I").failing.join(" "), /^Review needed — 1 fact is past its recheck date/);
  assert.equal(old.gates.find((g) => g.gate === "H").pass, true, "nothing left open when the coverage list is answered");
});
