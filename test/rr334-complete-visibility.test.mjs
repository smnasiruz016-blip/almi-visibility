/**
 * RR-334 · COMPLETE VISIBILITY (owner GREEN, 27 Oct 2026) — light proof of the changed code:
 *   1 old rules: a task finished under older rules is due at once; every product's questions on the RR-330/333 path (not RR-329's);
 *     an owner-saved seed list gets the seeds the owner's rules added; the replaced RR-328 answer prompt is gone;
 *   2 the junk questions already stored leave the counts (reversible) — and an answer under the replaced rule is set aside;
 *   3 article drafts: an answer from checked facts, an introduction checked block by block, the owner's word kept;
 *   5 the owner's search templates are the base wording; per template the searches and confirmed results are counted; "not found" said why.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCountryFacts, CF_RULES, IDEAS } from "../site/cf-collector.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { sweepQuestions } from "../site/cf-questions.mjs";
import { coverageOf, NAME_TYPES } from "../desktop/country-facts.mjs";
import { reviewQueueOf } from "../site/owner-status.mjs";
import { notASearch } from "../desktop/real-questions.mjs";
import * as AI from "../site/cf-ai.mjs";
import { withMoreSeeds, parseSeeds, DEFAULT_SEEDS, SEED_RULES } from "../site/kw-seeds.mjs";
import { liveRuns, isNode } from "../tools/harness-lock-guard.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { currentGroups } from "../site/kw-collector.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { answerDrafts, checkIntro, articleHtml, introQuestion } from "../site/articles.mjs";
import { ownerArticles } from "../site/pages.mjs";

const ON = "2026-10-27", T0 = Date.parse(`${ON}T10:00:00Z`), KEY = { ANTHROPIC_API_KEY: "test-key-invented-not-real-0000000" };
const fact = (o) => ({ product: "oet", part: "questions", kind: "question", proposedBy: "ai", aiWritten: true, readOn: ON, sourceUrl: null, ...o });
const readerOf = (pages) => { const read = []; return { read: async (u) => { read.push(u); return pages[u] ?? { ok: false, url: u, why: "the page answered 404", checkedOn: ON }; }, raw: async () => null, sitemapOf: async () => ({ ok: true, urls: [] }), requests: () => read.length, read_: read }; };
const quiet = async (store, countries) => { await store.setTask("*", "fee", { day: ON, state: "done" }); await store.setTask("*", "centres", { day: ON, state: "done" }); for (const c of countries) for (const t of ["councils", "rules"]) await store.setTask(c, t, { day: ON, state: "done", tried: { rules: CF_RULES } }); };

test("2 · RR-334: the junk questions already stored leave the counts without the owner's Reject — reversible; his own decisions untouched; an answer under the replaced rule set aside", async () => {
  const store = cfMemoryStore(), at = `${ON}T09:00:00Z`;
  await store.putFact(fact({ key: "question|Pakistan|booking", country: "Pakistan", status: "confirmed", value: { group: "booking", question: "How can I register for your class?", answer: "Register on the official site.", answerKind: "guidance" } }), { at });
  await store.putFact(fact({ key: "question|India|other-questions", country: "India", status: "confirmed", value: { group: "other questions", question: "Will you apply for this year's match?", answer: "I can't apply.", answerKind: "guidance" } }), { at });
  await store.putFact(fact({ key: "question|India|home", country: "India", status: "confirmed", value: { group: "home", question: "Is OET computer-based better than paper-based?", answer: "Both are the same test.", answerKind: "guidance" } }), { at });
  await store.putFact(fact({ key: "question|Nepal|scores", country: "Nepal", status: "confirmed", value: { group: "scores", question: "Sir what score do I need?", answer: "Check with your council.", answerKind: "guidance" } }), { at });
  await store.decide("question|Nepal|scores", { action: "approve", at });
  await store.putFact(fact({ key: "cv:question|Pakistan|fees", product: "cv", country: "Pakistan", status: "confirmed", value: { question: "cv maker price in pakistan", answer: "A CV maker can be free.", label: "AI-written from the country's confirmed facts", intent: "fees" } }), { at });
  const n = await sweepQuestions({ store, put: (f) => store.putFact(f, { at: `${ON}T10:00:00Z` }) });
  assert.equal(n, 3);
  const pk = await store.fact("question|Pakistan|booking"), ind = await store.fact("question|India|other-questions"), cv = await store.fact("cv:question|Pakistan|fees");
  assert.deepEqual([pk.status, pk.value.removedBy, pk.value.removedWhy], ["unconfirmed", "question filter", "it asks the video's maker about their own class, channel or contact"]);
  assert.match(ind.why, /^removed by the question filter: it asks the video's maker to do something — not a question people search \(Approve brings it back\)$/);
  assert.deepEqual([cv.status, cv.value.removedBy], ["unconfirmed", "replaced rule"]); assert.match(cv.why, /^set aside: answered under the replaced RR-328\/329 rule/);
  assert.equal((await store.fact("question|India|home")).status, "confirmed", "a real question stays");
  assert.equal((await store.fact("question|Nepal|scores")).status, "approved", "the owner's own word is never touched");
  /* out of every count: the grid's unconfirmed, the review queue; counted as set aside */
  const all = await store.facts(), c = coverageOf(all, { countries: ["Pakistan", "India", "Nepal"] }).counts;
  assert.deepEqual([c.unconfirmed, c.removed], [0, 3]); assert.equal(reviewQueueOf(all).unverified, 0);
  assert.equal((await store.history("question|Pakistan|booking")).at(-1).note, pk.why, "its record kept in the history");
  /* reversible: one Approve brings it back; a second sweep never removes it again */
  await store.decide("question|Pakistan|booking", { action: "approve", at });
  assert.equal(await sweepQuestions({ store, put: (f) => store.putFact(f, { at }) }), 0); assert.equal((await store.fact("question|Pakistan|booking")).status, "approved");
  assert.equal(notASearch("Can an MDS graduate apply for the OET exam?"), null);
});

test("1 · RR-334: a questions task finished under OLDER rules is due at once (stamped after); a task under today's rules waits its days", async () => {
  const store = cfMemoryStore(); await quiet(store, ["Pakistan", "India"]);
  await store.setTask("Pakistan", "questions", { day: ON, state: "done", tried: { stats: { asked: 3 } } });
  await store.setTask("India", "questions", { day: ON, state: "done", tried: { stats: { asked: 3 }, rules: CF_RULES } });
  const out = await runCountryFacts({ store, reader: readerOf({}), env: {}, now: () => T0, budgetMs: 1e9, countries: ["Pakistan", "India"], products: ["oet"] });
  const t = await store.tasks();
  assert.equal(t.get("Pakistan|questions").tries, 2, "done under older rules: run again today"); assert.equal(t.get("Pakistan|questions").tried.rules, CF_RULES);
  assert.equal(t.get("India|questions").tries, 1, "done under today's rules: not again"); assert.ok(out.ok);
});

test("1 · RR-334: every other product's questions are answered under the SAME rules as AlmiOET's — official on its page, else labelled guidance; never RR-329's facts-only answers; YouTube stays AlmiOET's; per template searches → confirmed", async () => {
  const store = cfMemoryStore(); await quiet(store, []);
  await store.setTask("Pakistan", "prep:facts", { day: ON, state: "done" });
  const kwStore = { keywordsAt: async () => [{ keyword: "ielts exam fee in pakistan", volume: 1300, period: "2025-10..2026-09" }, { keyword: "how to register for ielts in pakistan", volume: 480, period: "2025-10..2026-09" }] };
  const pages = { "https://ielts.org/pakistan/fees": { ok: true, url: "https://ielts.org/pakistan/fees", title: "IELTS fees in Pakistan", text: "The IELTS test fee in Pakistan is PKR 70,000 for the paper-based and computer-delivered test.", checkedOn: ON } };
  const asked = [];
  const ai = async (q) => {
    asked.push(q.template);
    if (q.template !== "answers") return { ok: false, why: "not in this test", usd: 0, searches: 0 };
    const ids = [...q.prompt.matchAll(/^- ([a-z~-]+): /gm)].map((m) => m[1]);
    return { ok: true, usd: 0.02, searches: 4, data: { answers: ids.map((id) => (id === "fees" ? { group: id, question: "How much is the IELTS fee in Pakistan?", kind: "official", answer: "The IELTS fee in Pakistan is PKR 70,000.", quote: "The IELTS test fee in Pakistan is PKR 70,000 for the paper-based and computer-delivered test.", sourceUrl: "https://ielts.org/pakistan/fees" } : { group: id, question: "How do I register for IELTS?", kind: "guidance", answer: "Register on the official booking site and keep your passport ready.", quote: "", sourceUrl: "" })) } };
  };
  const youtube = { state: "READY", searchTopic: async () => { throw new Error("YouTube is never searched for this product"); }, comments: async () => [] };
  const out = await runCountryFacts({ store, kwStore, reader: readerOf(pages), env: KEY, ai, youtube, now: () => T0, budgetMs: 1e9, countries: ["Pakistan"], products: ["prep"] });
  const qs = (await store.facts({ country: "Pakistan" })).filter((f) => f.product === "prep" && f.part === "questions");
  const fee = qs.find((f) => f.value.answerKind === "official"), g = qs.find((f) => f.value.answerKind === "guidance");
  assert.deepEqual([fee.key, fee.status, fee.sourceUrl, fee.value.rules], ["prep:question|Pakistan|fees", "confirmed", "https://ielts.org/pakistan/fees", CF_RULES]);
  assert.deepEqual([g.status, g.value.label, g.value.pageable], ["confirmed", "general guidance (no official page says it)", false]);
  assert.ok(!qs.some((f) => /AI-written from the country's confirmed facts/.test(f.value.label ?? "")), "RR-329's label is gone");
  assert.deepEqual(out.templates.answers, { asks: 1, searches: 4, found: 1, guidance: 1 });
  assert.equal((await store.tasks()).get("Pakistan|prep:questions").tried.rules, CF_RULES);
  assert.equal(AI.answerQuestion, undefined, "the replaced RR-328 answer prompt is gone");
});

test("1+5 · RR-334: the keyword ideas (templates b and d) become the product's seeds (the owner's saved list kept as he wrote it, the ideas added) — Google measures them; at most 20", async () => {
  /* the ideas step: OET and AlmiVisibility first, filtered to real searches about the product */
  const kw = memoryStore(), store = cfMemoryStore(); await quiet(store, []);
  const prompts = [];
  const ai = async (q) => { if (q.template !== "keywords") return { ok: false, why: "not in this test", usd: 0, searches: 0 }; prompts.push(q.prompt);
    return { ok: true, usd: 0.01, searches: 3, data: { keywords: /oet/i.test(q.prompt.split("\n")[0]) ? ["oet exam fee in pakistan", "oet", "canva cv maker", "how nurses from pakistan apply for oet for the uk", "OET writing sample for nurses"] : ["how to rank my restaurant on google", "seo", "free website seo audit"] } }; };
  const out = await runCountryFacts({ store, kwStore: kw, reader: readerOf({}), env: KEY, ai, now: () => T0, budgetMs: 1e9, countries: [], products: ["oet"] });
  assert.equal(prompts.length, IDEAS.perDay);
  assert.match(prompts[0], /^What do people search on Google about OET\? Give the exact words people type, short and long, including questions\.\nWhat do people in Pakistan search about OET, in their own words\?/);
  assert.match(prompts[0], /What do nurses from Pakistan search about OET when they want to work in the UK\?/);
  const ideas = await kw.seedIdeas();
  assert.deepEqual(ideas.oet.seeds, ["oet exam fee in pakistan", "how nurses from pakistan apply for oet for the uk", "oet writing sample for nurses"]);
  assert.deepEqual(ideas.visibility.seeds, ["how to rank my restaurant on google", "free website seo audit"]); assert.equal(out.templates.keywords.found, 5);
  /* an owner-saved list keeps his words; the ideas join its product group (live, 27 Oct: "the first list — not yet saved by you") */
  await kw.setSeedList("product:oet | AlmiOET | oet, oet exam\ncategory:food | Food | recipes", `${ON}T08:00:00Z`);
  const g = await currentGroups(kw), oet = g.groups.find((x) => x.id === "product:oet");
  assert.equal(g.from, "owner");
  assert.deepEqual(oet.seeds, ["oet", "oet exam", "oet exam fee in pakistan", "how nurses from pakistan apply for oet for the uk", "oet writing sample for nurses"]);
  const big = withMoreSeeds(parseSeeds(DEFAULT_SEEDS).groups, { ideas: { visibility: { seeds: Array.from({ length: 30 }, (_, i) => `seo idea number ${i}`) } } }).find((x) => x.key === "visibility");
  assert.equal(big.seeds.length, SEED_RULES.productSeeds);
});

test("5 · RR-334: the owner's templates are the base wording — councils by name or by the body that registers <people>; answers official first, then reliable guidance; a profession with no body says \"not found\" and why", async () => {
  const cq = AI.councilQuestion({ country: "Pakistan", subject: "OET", professions: ["nursing", "podiatry"], known: [{ profession: "nursing", name: "Pakistan Nursing and Midwifery Council", link: "https://pnmc.gov.pk/" }] }).prompt;
  assert.match(cq, /- nursing: I need the official website, address and contact details of Pakistan Nursing and Midwifery Council in Pakistan\./);
  assert.match(cq, /- podiatry: What is the official body that registers podiatrists in Pakistan\? I need its official website, address and contact details\./);
  const aq = AI.officialAnswerQuestion({ country: "India", subject: "OET", subjectSite: "https://oet.com", groups: [{ id: "fees", asked: [{ text: "oet fee india" }] }] }).prompt;
  assert.match(aq, /I need the official answer to this question: '<the group's question>' for India\. Give the official source page\. If no official page answers it: I need a reliable non-official answer to '<the group's question>' \(teachers, experts, real candidates\)\. Give the source page and date\./);
  /* "not found": kept with its why, the profession still searched every day (rule R1) */
  const store = cfMemoryStore(); await store.setTask("*", "fee", { day: ON, state: "done" }); await store.setTask("*", "centres", { day: ON, state: "done" });
  for (const t of ["questions", "rules"]) await store.setTask("Pakistan", t, { day: ON, state: "done", tried: { rules: CF_RULES } });
  const ai = async (q) => (q.template === "councils" ? { ok: true, usd: 0.01, searches: 2, data: { councils: [{ profession: "podiatry", name: "", nameType: NAME_TYPES[0], website: "", address: "", sourceUrl: "", notFound: true, why: "Podiatry is not a regulated profession in Pakistan; no official body registers podiatrists." }] } } : { ok: false, why: "not in this test", usd: 0, searches: 0 });
  const out = await runCountryFacts({ store, reader: readerOf({}), env: KEY, ai, now: () => T0, budgetMs: 1e9, countries: ["Pakistan"], products: ["oet"] });
  const t = (await store.tasks()).get("Pakistan|councils");
  assert.equal(t.state, "searching"); assert.equal(t.tried.podiatry.notFound, "Podiatry is not a regulated profession in Pakistan; no official body registers podiatrists.");
  assert.deepEqual(out.templates.councils, { asks: 1, searches: 2, found: 0, guidance: 0 });
});

test("3 · RR-334: article drafts — a question answered from facts checked on their page; an introduction checked block by block (a number or quote not on its page left out, guidance with a number left out, a blocked site never); the owner's word kept; nothing published", async () => {
  const facts = [
    fact({ key: "question|Pakistan|fees", country: "Pakistan", status: "confirmed", sourceUrl: "https://oet.com/test/fees", sourceTitle: "OET fees", value: { group: "fees", intent: "fees", question: "How much is the OET fee in Pakistan?", answer: "OET costs AUD 587 in Pakistan (OET's own page).", answerKind: "official", volume: 880, count: 4 } }),
    fact({ key: "question|Pakistan|fees~pay-rupees", country: "Pakistan", status: "confirmed", value: { group: "fees~pay-rupees", intent: "fees", question: "Can I pay the OET fee in rupees?", answer: "Payment is made online when you book.", answerKind: "guidance" } }),
    fact({ key: "question|Pakistan|booking", country: "Pakistan", status: "unconfirmed", value: { group: "booking", intent: "booking", question: "How can I register for your class?", answer: "x", answerKind: "guidance", removedBy: "question filter" } }),
  ];
  const [a] = answerDrafts({ product: "oet", facts, today: ON });
  assert.deepEqual([a.id, a.title, a.outline], ["oet|answer|pakistan-fees", "How much is the OET fee in Pakistan?", ["The answer", "Related questions", "Can I pay the OET fee in rupees?", "About AlmiOET"]]);
  assert.deepEqual(a.blocks[0].source, { url: "https://oet.com/test/fees", title: "OET fees", on: ON }); assert.equal(a.blocks[1].label, "general guidance");
  assert.deepEqual(a.links, [{ href: "https://almioet.almiworld.com/", text: "AlmiOET" }]);
  const pages = { "https://oet.com/about": { ok: true, url: "https://oet.com/about", title: "About OET", text: "OET is the English language test for healthcare professionals. It assesses the language communication skills of healthcare professionals who seek to register and practise in an English-speaking environment.", checkedOn: ON } };
  const data = { title: "OET: what it is, who it is for, pros and cons", blocks: [
    { section: "what", heading: "An English test for healthcare", text: "OET is an English test made for healthcare professionals.", kind: "official", quote: "OET is the English language test for healthcare professionals.", sourceUrl: "https://oet.com/about" },
    { section: "who", heading: "Nurses, doctors and more", text: "It is for healthcare professionals who want to register and practise abroad.", kind: "official", quote: "healthcare professionals who seek to register and practise in an English-speaking environment", sourceUrl: "https://oet.com/about" },
    { section: "why", heading: "A test in your own work", text: "Many candidates find it easier to prepare when the tasks look like their daily work.", kind: "guidance", quote: "", sourceUrl: "" },
    { section: "pros", heading: "Accepted in 12 countries", text: "OET is accepted in 12 countries.", kind: "official", quote: "OET is the English language test for healthcare professionals.", sourceUrl: "https://oet.com/about" },
    { section: "cons", heading: "Not everywhere", text: "Some boards take only IELTS; check yours, it can take 3 weeks.", kind: "guidance", quote: "", sourceUrl: "" },
    { section: "cons", heading: "An agent's list", text: "Agents say it is accepted widely.", kind: "guidance", quote: "", sourceUrl: "https://nle.ph/oet" },
  ] };
  const c = await checkIntro({ product: "oet", data, reader: readerOf(pages), today: ON });
  assert.deepEqual(c.draft.blocks.map((b) => [b.section, b.label]), [["what", "official"], ["who", "official"], ["why", "general guidance"]]);
  assert.deepEqual(c.dropped.map((d) => d.why), ["a number it states is not on its source page", "general guidance may state no number", "its source is a site the owner blocked"]);
  assert.deepEqual(c.draft.outline, ["What it is", "Who it is for", "Why it is needed", "About AlmiOET"]);
  const html = articleHtml(c.draft);
  assert.match(html, /Source: <a href="https:\/\/oet\.com\/about" rel="nofollow">About OET<\/a>, read 2026-10-27/); assert.match(html, /<span class="chip">general guidance<\/span>/); assert.match(html, /<a href="https:\/\/almioet\.almiworld\.com\/">AlmiOET<\/a>/);
  assert.match(introQuestion({ product: "visibility" }).system, /getting a business found on Google and in AI answers/);
  /* the owner's word: approved stays; the collector's next draft is refused */
  const store = cfMemoryStore();
  assert.deepEqual(await store.putArticle({ id: a.id, product: "oet", kind: "answer", title: a.title, body: a }, { at: `${ON}T10:00:00Z` }), { saved: true });
  assert.deepEqual(await store.decideArticle(a.id, { action: "approve", at: `${ON}T11:00:00Z` }), { ok: true, status: "approved" });
  assert.equal((await store.putArticle({ id: a.id, product: "oet", kind: "answer", title: "changed", body: { ...a, title: "changed" } }, { at: `${ON}T12:00:00Z` })).saved, false);
  const page = ownerArticles({ articles: await store.articles(), html: articleHtml });
  assert.match(page, /Nothing is published from here/); assert.match(page, /approved by you/); assert.match(page, /Outline: The answer → Related questions/);
});

test("guard · RR-334: a harness mark whose pid now belongs to another program (Windows reuses pids) holds no lock; a live node harness still does", async () => {
  const repo = mkdtempSync(join(tmpdir(), "rr334-lock-")), dir = join(repo, ".git", "almivisibility-harness-runs"); mkdirSync(dir, { recursive: true });
  const other = process.platform === "win32" ? spawn("ping", ["-n", "30", "127.0.0.1"], { stdio: "ignore", windowsHide: true }) : spawn("sleep", ["30"], { stdio: "ignore" });
  const harness = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)"], { stdio: "ignore" });
  try {
    await new Promise((r) => setTimeout(r, 500));
    writeFileSync(join(dir, `${other.pid}.json`), JSON.stringify({ pid: other.pid, file: "test/helpers/killed-by-its-timeout.mjs" }));
    assert.equal(isNode(other.pid), false); assert.deepEqual(liveRuns([repo]), [], "a reused pid is not a harness");
    writeFileSync(join(dir, `${harness.pid}.json`), JSON.stringify({ pid: harness.pid, file: "test/helpers/a-live-harness.mjs" }));
    assert.deepEqual(liveRuns([repo]).map((r) => r.file), ["test/helpers/a-live-harness.mjs"], "a live node harness still holds the lock");
  } finally { other.kill(); harness.kill(); rmSync(repo, { recursive: true, force: true }); }
});
