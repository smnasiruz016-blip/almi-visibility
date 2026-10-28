/**
 * RR-335 · VISIBILITY COMPLETE (owner GREEN, 28 Oct 2026) — light proof of the changed code:
 *   1 F40 is a gate of the live builder (joinPages, bin/build-joined-pages.mjs): the frozen rules decide technical (the page's own links)
 *     and distinct value (F35's CREATE); a page whose only open items are the AI judge's two verdicts WAITS; a recorded FAIL fails it;
 *   2 every built page carries at least 3 internal links from the filed link plan — a page without them FAILS and is never written;
 *   3 the site's article drafts: the page-law checks first (no AI), then the AI judge — inside the daily cap, its call id and cost recorded,
 *     a draft not judged waits; /owner/articles shows each draft's state, the pages waiting and the cost a page;
 *   4 the storage default is a 10 GB cost guard (Neon's Launch plan) — a default only: Vercel's NEON_STORAGE_LIMIT_MB still decides.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chosen } from "./helpers/f40-fixture.mjs";
import { joinPages, linksCheck, MIN_INTERNAL_LINKS } from "../src/page/joined-page.mjs";
import { renderCompiledDraft, PROMISE as F37_PROMISE } from "../src/page/draft-render.mjs";
import { judgeDraft, CRITERIA, VERDICT, POPULATION, AI_JUDGED } from "../src/page/quality-judgements.mjs";
import { articleChecks, articleQuality, judgeQuestion, judgementsOf, JUDGE_CRITERIA, PROMISE, ARTICLES } from "../site/articles.mjs";
import { runCountryFacts } from "../site/cf-collector.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { ownerArticles } from "../site/pages.mjs";
import { COLLECTOR, storageLimitOf } from "../site/kw-collector.mjs";

const THREE = Object.freeze([{ href: "/guides", label: "All guides" }, { href: "/guides/fees", label: "Fees" }, { href: "/articles/renewal", label: "An article" }]);
const agent = (name, verdict, callRef = "msg_fixture_1") => ({ name, verdict, criterionId: CRITERIA[name].id, observation: "what the page shows", source: { kind: "AGENT", provider: "anthropic", callRef } });
const build = (c, { judgements = [], related = THREE, providers = ["anthropic"] } = {}) => joinPages({ construction: [{ slug: c.d.slug, decision: c.d.decision, spec: c.d.spec }], stamp: "TEST PAGE",
  renderNeed: ({ spec, decision }) => renderCompiledDraft({ spec, decision, plan: null }), relatedFor: () => related, judge: () => ({ population: "REAL", registeredProviders: providers, judgements }) })[0];

test("1 · RR-335: F40 judges every need of the live builder's page — the frozen rules decide technical and distinct value; waiting for the AI judge, never refused; a recorded FAIL fails the page", () => {
  const c = chosen();
  const waiting = build(c);
  assert.deepEqual([waiting.checks.engaging.state, waiting.checks.engaging.waiting], ["NOT MEASURED", true], "a page with no judgement was not left waiting");
  assert.match(waiting.checks.engaging.why, /^waiting for the AI judge: engaging, hookable — the deterministic checks passed$/);
  assert.deepEqual(waiting.itemList[0].quality.waitingFor, ["engaging", "hookable"]);
  assert.equal(build(c, { judgements: [agent("engaging", "PASS"), agent("hookable", "PASS")] }).checks.engaging.state, "PASS");
  assert.equal(build(c, { judgements: [agent("engaging", "FAIL"), agent("hookable", "PASS")] }).checks.engaging.state, "FAIL", "a judge's FAIL was not carried");
  /* the judge must be a registered provider with its recorded call — else the page still waits */
  const noCall = build(c, { judgements: [agent("engaging", "PASS", ""), agent("hookable", "PASS", "")] }).checks.engaging;
  assert.deepEqual([noCall.state, noCall.waiting], ["NOT MEASURED", true], "a judgement with no recorded call was accepted");
  assert.notEqual(build(c, { judgements: [agent("engaging", "PASS"), agent("hookable", "PASS")], providers: [] }).checks.engaging.state, "PASS", "an unregistered provider's verdicts passed the page");
  /* the frozen rules win: F37's per-need technical (NOT MEASURED, no F94 plan) does not block; the page's own links decide */
  const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: null });
  const q = (frozen) => judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: d, parts: { draft: { checks: d.checks } }, population: POPULATION.REAL, judgements: [agent("engaging", "PASS"), agent("hookable", "PASS")], registeredProviders: ["anthropic"], frozen });
  assert.equal(q(null).gate.verdict, VERDICT.NOT_MEASURED, "CONTROL: without the frozen rules F40 reads F37's NOT MEASURED technical and F39's missing gain");
  assert.equal(q({ technical: linksCheck(THREE), distinct: { state: "PASS" } }).gate.verdict, VERDICT.PASS);
  assert.equal(q({ technical: linksCheck([]), distinct: { state: "PASS" } }).assessments.technicalIndexability.verdict, VERDICT.FAIL, "a page with no links passed F40's technical assessment");
  assert.deepEqual(AI_JUDGED, ["engaging", "hookable"]);
  /* the builder refuses a FAIL and keeps a waiting page */
  const bin = readFileSync(new URL("../bin/build-joined-pages.mjs", import.meta.url), "utf8");
  assert.match(bin, /judge, relatedFor:/, "the live builder does not hand F40 its judge");
  assert.match(bin, /REFUSED — F40_QUALITY: /); assert.match(bin, /waiting for the AI judge/);
});

test("2 · RR-335: every built page carries at least 3 internal links (the hub, related pages, an article) from the filed plan — a page without them FAILS, named, and the builder writes nothing", () => {
  assert.equal(MIN_INTERNAL_LINKS, 3);
  const c = chosen();
  assert.equal(build(c).checks.internalLinks.state, "PASS");
  const none = build(c, { related: [] }), two = build(c, { related: THREE.slice(0, 2) }), dup = build(c, { related: [THREE[0], THREE[0], THREE[1]] });
  for (const [name, p, n] of [["none", none, 0], ["two", two, 2], ["the same link twice", dup, 2]]) {
    assert.equal(p.checks.internalLinks.state, "FAIL", `${name}: a page with too few links was not failed`);
    assert.match(p.checks.internalLinks.why, new RegExp(`^${n} internal link\\(s\\) — every page needs at least 3: the hub, its related pages and an article`));
  }
  assert.match(none.html, /<\/main>|<\/article>|<\/body>/, "the page still renders, so its failure is the check's");
  assert.match(readFileSync(new URL("../bin/build-joined-pages.mjs", import.meta.url), "utf8"), /REFUSED — TOO_FEW_INTERNAL_LINKS: \$\{unlinked\.join\(" \| "\)\}; no page written`\); process\.exit\(3\);/);
});

const DRAFT = Object.freeze({ id: "oet|answer|pakistan-fees", product: "oet", kind: "answer", title: "How much is the OET fee in Pakistan?", outline: ["The answer"],
  blocks: [{ heading: "The answer", text: "OET costs AUD 587 in Pakistan.", label: "official", source: { url: "https://oet.com/test/fees", title: "OET fees", on: "2026-10-28" } }, { heading: "Can I pay in rupees?", text: "Payment is made online when you book.", label: "general guidance", source: null }],
  links: [{ href: "https://almioet.almiworld.com/", text: "AlmiOET" }] });

test("3 · RR-335: an article draft — the page-law checks first, no AI; only a passing draft is judged, inside the daily cap, its call id and cost recorded; not judged → waiting; the owner's page shows it", async () => {
  /* the site's copies are F40's and F37's own words */
  for (const n of AI_JUDGED) assert.deepEqual([JUDGE_CRITERIA[n].id, JUDGE_CRITERIA[n].criterion], [CRITERIA[n].id, CRITERIA[n].criterion], `${n}: the site judges by other words than F40's`);
  assert.equal(PROMISE.source, F37_PROMISE.source, "the site's promise rule is not F37's");
  assert.equal(articleQuality(DRAFT).state, "WAITING");
  assert.deepEqual(Object.values(articleChecks({ ...DRAFT, blocks: [DRAFT.blocks[0], { ...DRAFT.blocks[1], text: DRAFT.blocks[0].text }] })).map((c) => c.state), ["PASS", "PASS", "FAIL"]);
  assert.equal(articleQuality({ ...DRAFT, blocks: [{ ...DRAFT.blocks[0], text: "OET will rank first on Google for you." }] }).state, "FAIL");
  assert.equal(articleQuality({ ...DRAFT, blocks: [{ ...DRAFT.blocks[0], text: "" }] }).state, "FAIL");
  assert.deepEqual(judgementsOf({ engaging: { verdict: "PASS", observation: "x" }, hookable: { verdict: "PASS", observation: "y" } }, null), [], "a verdict with no call id was recorded");
  assert.match(judgeQuestion(DRAFT).prompt, /^engaging: Engaging: a reader who arrives/); assert.match(judgeQuestion(DRAFT).prompt, /OET costs AUD 587 in Pakistan\./);

  /* the collector: only the passing draft is asked about; its verdicts, call id and cost recorded */
  const store = cfMemoryStore(), at = "2026-10-28T09:00:00Z";
  await store.putArticle({ id: DRAFT.id, product: "oet", kind: "answer", title: DRAFT.title, body: DRAFT }, { at });
  const bad = { ...DRAFT, id: "oet|answer|bad", blocks: [{ ...DRAFT.blocks[0], text: "We guarantee a pass." }] };
  await store.putArticle({ id: bad.id, product: "oet", kind: "answer", title: "bad", body: bad }, { at });
  for (const t of ["fee", "centres"]) await store.setTask("*", t, { day: "2026-10-28", state: "done" });
  const asked = [];
  const ai = async (q) => { asked.push(q.template ?? null); return q.template === "judge" ? { ok: true, data: { engaging: { verdict: "PASS", observation: "the answer leads" }, hookable: { verdict: "PASS", observation: "the title is the question" } }, usd: 0.00042, searches: 0, callId: "msg_fixture_9" } : { ok: false, why: "not asked in this test", usd: 0, searches: 0 }; };
  const reader = { read: async (u) => ({ ok: false, url: u, why: "the page answered 404", checkedOn: "2026-10-28" }), raw: async () => null, sitemapOf: async () => ({ ok: true, urls: [] }), requests: () => 0 };
  await runCountryFacts({ store, env: { ANTHROPIC_API_KEY: "test-key-invented-not-real-0000000" }, ai, reader, now: () => Date.parse("2026-10-28T10:00:00Z"), budgetMs: 1e9, countries: [], products: ["oet"] });
  assert.equal(asked.filter((x) => x === "judge").length, 1, "the judge was asked about a draft that failed the page-law checks, or not at all");
  const arts = new Map((await store.articles()).map((a) => [a.id, a]));
  assert.deepEqual([arts.get(DRAFT.id).body.judged.callId, arts.get(DRAFT.id).body.judged.usd, arts.get(DRAFT.id).body.judged.judgements.map((j) => j.source.callRef)], ["msg_fixture_9", 0.00042, ["msg_fixture_9", "msg_fixture_9"]]);
  assert.equal(arts.get(bad.id).body.judged, undefined);
  const page = ownerArticles({ articles: [...arts.values()], html: () => "" });
  assert.match(page, /Quality \(F40\): 1 pass · <b>0 waiting for the AI judge<\/b> · 1 fail · AI judge cost \$0\.0004 a page \(\$0\.0004 for 1\)/);
  assert.match(page, /quality FAIL<\/b> — noPromise: it promises a ranking or a result/);
  assert.ok(ARTICLES.judgedPerDay > 0);
});

test("4 · RR-335: the storage default is a 10 GB cost guard (Neon's Launch plan) — a default only; Vercel's NEON_STORAGE_LIMIT_MB still decides", () => {
  assert.equal(COLLECTOR.storageLimitMb, 10240);
  assert.equal(storageLimitOf({ NEON_STORAGE_LIMIT_MB: "20480" }), 20480);
  assert.equal(storageLimitOf({}), 10240);
});
