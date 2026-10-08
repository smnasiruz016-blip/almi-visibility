/**
 * 🔴 RR-216 · F92 · IMAGE AND VIDEO VISIBILITY (acceptance _handoffs 06cdb82, approved by its hash 12c52f31…, contract 70f54ee5…).
 *
 * ONE TEST PER EVIDENCE LINE of the frozen acceptance (C1–C7 and [ALL]); each FAILURE limb has its sabotage in test/helpers/rr216-sabotage.mjs,
 * naming the test it turns red. FIXTURE PAGES ONLY (RR-177): hand-written fixture bodies on a fixture origin, and the RR-184 fixture chain
 * (planning rows by F91's and F16's own functions, F35's own decision, F37's own render) for the new page. The one real read is C6's
 * count-only control on the recorded inventory SHAPES (records, edges, sitemap records, declarations; no page body). Nothing here writes to
 * the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { judgeDraft, CRITERIA, VERDICT, CANNOT_DECIDE, NOT_JUDGED, NO_LAWFUL_JUDGE, ASSESSMENTS, JUDGEMENTS, POPULATION, MAX_REPAIR_ROUNDS } from "../src/page/quality-judgements.mjs";
import { renderCompiledDraft, PROMISE } from "../src/page/draft-render.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { constructCandidates, decisionsForConstruction } from "../src/page/construct.mjs";
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { SIGNAL, VIDEO_HOSTS, DESCRIPTION_CRITERION, DECORATIVE_NOT_DECIDED, NO_LAWFUL_JUDGE as F92_NO_JUDGE, NO_SITEMAP_MEDIA, NO_MEDIA_NEED, STANDING, mediaOf, assessMedia, auditMedia, recommendationOf, planForDraft } from "../src/page/media-visibility.mjs";
import { readClientMedia, sitemapMediaOf, mediaNeedOf } from "../src/page/media-visibility-evidence.mjs";
import { assessPage as f26AssessPage } from "../src/audit/accessibility.mjs";
import { scopeCompleteness } from "../src/crawl/scope-completeness.mjs";
import { readTenantPartition, readPartitionEdges } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { declaredScope } from "../src/page/existing-page-population.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-10-06", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr216-fixture", S = "rr216-fixture-subject";
const MODULE = "src/page/quality-judgements.mjs";
const code = (f) => readFileSync(join(REPO, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

/* ---- fixture planning rows, by F91's and F16's own functions (the RR-180 fixture, renamed) ---- */
const POSSIBLE = possibleCombinations({ dimensions: [{ key: "axis", values: ["one", "two"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const PRODUCT = Object.freeze({ productId: S, axis: { key: "axis" }, variants: ["one", "two"], pageSpecs: {} });
const relevant = (q) => assessmentRecord({ question: q, draft: { verdict: "RELEVANT", declarationVersion: "fixture-v1", meaningTest: "within the declared field", reason: "about the declared product", source: { kind: "METHOD", ref: "fixture-method" } }, at: AT }).record;
const rd = (queryId, wording) => researchDerivedQuestion({ subject: S, queryId, route: ROUTES.CLIENT_AI, wording, providerId: "fixture-provider", at: AT });
const observed = (id, wording) => ({ record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
  value: { subject: S, kind: "OBSERVED", original: wording, sourceId: "fixture", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
const related = (name, path) => ({ kind: "RELATED", name, link: `https://related.fixture.invalid/${path}`, readOn: "2026-10-02" });
const CENTRAL = { claimId: "c-central", states: "OTHER", text: "A fixture licence renewal takes about four weeks.", source: related("a related fixture source", "a"), supports: { finding: "SUPPORTS", ref: "finding:central" } };
const BODY = { claimId: "c-body", central: false, states: "RESPONSIBLE_BODY_RULE", body: "Fixture Licensing Board", text: "The Fixture Licensing Board requires the renewal form.", source: { kind: "RESPONSIBLE_BODY", body: "Fixture Licensing Board", name: "Fixture Licensing Board", link: "https://board.fixture.invalid/renewal", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "finding:body" } };
const UNSUPPORTED = { claimId: "c-unknown", central: false, states: "OTHER", text: "The renewal fee is lower this year.", source: related("another fixture source", "b"), supports: { finding: "DOES_NOT_SUPPORT", ref: "finding:unknown" } };
const Q1 = rd("formed-1", "How long does a fixture licence renewal take?");
const Q2 = observed("obs-2", "How long is the renewal of a fixture licence?");
const Q3 = rd("formed-3", "What do people often ask about fixture licence renewals?");
function planning({ population, judgements = [], claims = [CENTRAL, BODY, UNSUPPORTED], grouped = true }) {
  const same = (q) => ({ questionId: Q1.question_id, judgementRef: `same:${q.question_id}`, reason: "the same meaning and need" });
  const records = grouped ? [Q1, Q2, Q3] : [Q1];
  const conn = connectQuestions({ subject: S, possible: POSSIBLE, records, assessments: (grouped ? [Q1, Q3] : [Q1]).map(relevant), on: ON, drafts: [
    { questionId: Q1.question_id, combination: { axis: "one" }, answer: { claims } },
    ...(grouped ? [{ questionId: Q2.question_id, combination: { axis: "one" }, sameAs: same(Q2) }, { questionId: Q3.question_id, combination: { axis: "one" }, sameAs: same(Q3) }] : []),
  ] });
  assert.deepEqual(conn.refused, [], "a fixture question was refused by F91's own writer");
  return [...conn.records, ...coverageRecords({ subject: S, rows: conn.records, tenantId: T, population, judgements, on: ON })];
}
/* two fixture pages with VERIFIED bodies (never the 27 set aside) */
const page = (id, h1) => ({ pageId: id, tenantId: T, html: `<article><h1>${h1}</h1><p>Fixture body text about ${h1.toLowerCase()} and nothing else of the subject.</p></article>`, bodyObservationId: `obs:${id}` });
const PAGES = [page("fixture-page-a", "Fixture opening hours"), page("fixture-page-b", "Fixture contact details")];
const POP = { tenantId: T, coverageState: "COMPLETE", pages: PAGES, inventory: { pages: PAGES.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: p.bodyObservationId, verified: true }] })) } };
const doesNotCover = (qs) => coverageJudgementRecords(qs.flatMap((q) => PAGES.map((p) => ({ questionId: q.question_id, pageId: p.pageId, verdict: "DOES_NOT_COVER", reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } }))), { on: ON }).records;
/* 🔴 RR-208 (F37 Acceptance Amendment 2, C8): the draft reads its links and URL ONLY from F94's plan for its need. FIXTURE RESTATE ONLY — the same
 * targets as the earlier `links` fixture (page a out, page b in, the same URL), now in F94's plan shape for the chosen need; every assertion is unchanged. */
const PLAN_OF = (decision, over = {}) => Object.freeze({ feature: "F94", planned: true, subject: { kind: "NEW_PAGE", ref: `F35:CREATE:${decision?.subject?.needId}` },
  url: { state: "PROPOSED", url: "https://fixture-world.invalid/renewal", readFrom: ["fixture-page-a", "fixture-page-b"] },
  linksOut: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-a" }, extends: [], targetStatus: "WORKING" }],
  linksIn: [{ pageId: "fixture-page-b", url: "https://fixture-world.invalid/contact", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-b" }, extends: [], targetStatus: "NOT MEASURED" }],
  bound: { state: "COMPLETE", text: "the fixture inventory (RR-177)", counts: null }, complete: true, claims: { urlUnique: true }, ...over });
const ASPECTS = ["intent", "answer", "facts", "architecture", "examples", "userValue"];
function chosen({ claims, grouped = true } = {}) {
  const rows = planning({ population: POP, judgements: doesNotCover(grouped ? [Q1, Q2, Q3] : [Q1]), claims, grouped });
  const needId = rows.find((r) => r.record_type === CONNECTION).needId;
  const reviews = PAGES.map((p) => ({ needId, against: p.pageId, verdict: "DISTINCT", needsGuidance: false, ref: `review:${p.pageId}` }));
  const g = decideGroupedNeeds({ tenantId: T, product: PRODUCT, population: POP, planningRows: rows, duplicationReviews: reviews });
  assert.equal(g.compiled.forConstruction.length, 1, "F35 did not choose the fixture need — every test below would judge nothing");
  return { g, d: g.compiled.forConstruction[0] };
}
const gainFor = (slug, withGain = true) => ({
  gainRecords: withGain ? [{ pageId: `candidate:${slug}`, kind: "USEFUL_COMPARISON", adds: "the renewal time and the form answered in one place", ref: `gain:${slug}` }] : [],
  competitorComparisons: withGain ? [{ pageId: `candidate:${slug}`, competitorsCompared: 1, gainBeyond: true, ref: `cmp:${slug}` }] : [],
  reviews: PAGES.map((p) => ({ pair: [`candidate:${slug}`, p.pageId], compared: ASPECTS, duplicate: false, documentedDistinctValue: "a different need", needsGuidance: false, ref: `f32:${p.pageId}` })),
});
/** The production path: construction judges F35's chosen spec; the draft is F37's own render of it; F40 reads both. */
function judged(c, { plan = PLAN_OF(c.d.decision), withGain = true, population = POPULATION.FIXTURE, judgements = [], repeatJustifications = [], round = 0, previous = null, spec = c.d.spec, draft = null } = {}) {
  /* construction is handed the SAME spec the draft renders (a changed spec rides in F35's construction set) */
  const compiled = { ...c.g.compiled, forConstruction: c.g.compiled.forConstruction.map((x) => (x.slug === c.d.slug ? { ...x, spec } : x)) };
  const r = constructCandidates({ pageSpecs: {}, variants: PRODUCT.variants, records: [], requested: [c.d.slug], tenantId: T, existingPages: POP, gainEvidence: gainFor(c.d.slug, withGain), decisions: decisionsForConstruction({ compiled }).decisions, plans: [plan].filter(Boolean), now: NOW })[0];
  const d = draft ?? renderCompiledDraft({ spec, decision: c.d.decision, plan });
  return { r, d, q: judgeDraft({ spec, decision: c.d.decision, draft: d, parts: r.parts, population, judgements, repeatJustifications, round, previous }) };
}
const fixtureJudgement = (name, verdict) => ({ name, verdict, criterionId: CRITERIA[name].id, observation: `the fixture judge's recorded observation of the rendered draft (${verdict})`, source: { kind: "FIXTURE", ref: `fixture-judge:${name}` } });
const PASSING_JUDGEMENTS = [fixtureJudgement("engaging", VERDICT.PASS), fixtureJudgement("hookable", VERDICT.PASS)];
const justifyAll = (html) => [...new Set([...html.matchAll(/<div class="claim" data-claim-id="([^"]+)">/g)].map((m) => m[1]))].map((claimId) => ({ claimId, adds: "the answer restated under the question's own wording for a reader who arrives at that question", ref: `fixture-justification:${claimId}` }));

/* ---- RR-216 · F92 · the fixture site (never the 27 pages): one tenant, one origin; bodies written by hand ---- */
const MV = "src/page/media-visibility.mjs", ME = "src/page/media-visibility-evidence.mjs";
const A = "https://media-fixture.invalid";
const PAGE = `${A}/guides/renewal`;
const T2 = "tenant:rr216-other";
const COMPLETE_INV = { state: "COMPLETE", bound: "the fixture inventory (RR-177)" };
const INCOMPLETE_INV = { state: "INCOMPLETE", bound: "the fixture inventory, one listed URL unobserved (RR-177)" };
const html = (head = "", body = "") => `<html lang="en"><head><title>Fixture</title>${head}</head><body><h1>A fixture page</h1>${body}</body></html>`;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const pg = (pageId, path, h = html(), tenantId = T) => ({ pageId, tenantId, url: `${A}${path}`, html: h });
const LAWFUL = new Set(Object.values(SIGNAL));
const IMG = '<img src="/img/chart.png" alt="A chart of renewal steps">';
const FIX_J = (src, over = {}) => ({ pageId: "p1", src, criterionId: DESCRIPTION_CRITERION, observation: "the text names what the image shows", verdict: "PASS", source: { kind: "FIXTURE" }, ...over });

/* ================= C1 ================= */
test("T92-C1 · F92 C1 THE MEDIA A PAGE RELIES ON: img, picture, video with a source and an iframe on a declared host — listed with resolved srcs; another host — not listed; decorative claims listed, never media or findings; no media — NO MEDIA; script- and style-inserted media NOT MEASURED", () => {
  const body = `${IMG}<picture><source srcset="/img/a.webp"><img src="/img/a.jpg" alt="Steps"></picture><video controls><source src="/v/intro.mp4"></video><iframe src="https://www.youtube.com/embed/abc" title="Intro"></iframe><iframe src="https://maps.example.invalid/x"></iframe>`;
  const r = mediaOf(html("", body), PAGE);
  assert.deepEqual(r.media.map((m) => [m.kind, m.src]), [["image", `${A}/img/chart.png`], ["image", `${A}/img/a.jpg`], ["video", `${A}/v/intro.mp4`], ["video", "https://www.youtube.com/embed/abc"]], "a relied-on medium was missed, or one listed that the body does not hold");
  const deco = mediaOf(html("", '<img src="/x.png" alt=""><img src="/y.png" alt="y" aria-hidden="true"><svg aria-hidden="true"><path d="M0"/></svg>'), PAGE);
  assert.deepEqual([deco.media.length, deco.decorative.map((d) => d.kind)], [0, ["image", "image", "inline-svg"]], "a decorative claim was counted as relied-on media");
  for (const d of deco.decorative) assert.equal(d.why, DECORATIVE_NOT_DECIDED);
  const none = assessMedia({ pageId: "p0", url: PAGE, html: html("", "<p>Only words.</p>") });
  assert.deepEqual([none.media, none.items.length], [SIGNAL.NO_MEDIA, 0], "a page with no media was reported as a finding");
  assert.match(none.notInBody, /^NOT MEASURED — media a script or a style inserts/);
  assert.equal(assessMedia({ pageId: "p0", url: PAGE, html: html("", '<div style="background-image:url(/bg.png)"></div><script>document.write("<img src=/s.png>")</script>') }).media, SIGNAL.NO_MEDIA, "script- or style-inserted media was reported measured");
  assert.deepEqual(VIDEO_HOSTS.includes("maps.example.invalid"), false);
});

/* ================= C2 ================= */
test("T92-C2 · F92 C2 DESCRIBED, READ FROM F26: an image with no alt — a finding naming F26; a non-empty alt — PRESENT; per-image results equal F26's own page counts; F92 never counts alt itself; a video described by a VideoObject, a captions track or an iframe title — PRESENT; with none — a finding; nothing is written", () => {
  const body = `${IMG}<img src="/img/b.png">`;
  const r = assessMedia({ pageId: "p1", url: PAGE, html: html("", body) });
  assert.deepEqual(r.items.map((i) => i.described.signal), [SIGNAL.PRESENT, SIGNAL.FINDING], "an image with no alt carries no finding");
  assert.match(r.items[1].described.why, /F26's img-alt check/);
  const f26 = f26AssessPage(html("", body));
  assert.deepEqual([r.items.filter((i) => i.described.signal === SIGNAL.FINDING).length, r.items.filter((i) => i.described.signal === SIGNAL.PRESENT).length], [f26.machine["img-alt"], f26.person["alt-adequate"]], "F92's alt presence differs from F26's result");
  /* F92's code names "alt" nowhere but F26's own result fields ("img-alt", "alt-adequate"), the word "alternative" and its standing's
   * "alt text" — so no alt attribute is counted or read but through F26 */
  const ALT = /(?<!img-)alt(?!-adequate|ernative| text)/i;
  assert.doesNotMatch(code(MV), ALT, "F92 counts alt attributes itself instead of reading F26");
  for (const planted of ['const a = attrOf(t, "alt");', "if (/\\balt\\s*=/.test(tag)) return 1;"]) assert.match(planted, ALT, "the census cannot see a planted alt count");
  const vo = html(ld({ "@type": "VideoObject", name: "Intro", description: "How renewal works", contentUrl: `${A}/v/intro.mp4` }), '<video src="/v/intro.mp4"></video>');
  const cap = html("", '<video src="/v/b.mp4"><track kind="captions" src="/v/b.vtt"></video>');
  const ifr = html("", '<iframe src="https://player.vimeo.com/video/1" title="Walkthrough"></iframe>');
  for (const h of [vo, cap, ifr]) assert.equal(assessMedia({ pageId: "p1", url: PAGE, html: h }).items[0].described.signal, SIGNAL.PRESENT);
  const bare = assessMedia({ pageId: "p1", url: PAGE, html: html("", '<video src="/v/c.mp4"><track kind="chapters" src="/v/c.vtt"></video>') });
  assert.equal(bare.items[0].described.signal, SIGNAL.FINDING, "a video with no declared description marker was reported described");
  assert.doesNotMatch(code(MV), /export function (write|add|generate|suggest|invent)\w*/i);
});

/* ================= C3 ================= */
test("T92-C3 · F92 C3 TRUTHFUL AND ADEQUATE — A RECORDED JUDGEMENT ONLY: a fixture judgement in a fixture run is carried; in a real run, from an unregistered provider, from a person, or absent — NOT MEASURED with the missing judge named; a perfect-looking alt is still NOT MEASURED", () => {
  const src = `${A}/img/chart.png`;
  const run = (judgements, population = "FIXTURE", registeredProviders = []) => assessMedia({ pageId: "p1", url: PAGE, html: html("", IMG), judgements, population, registeredProviders }).items[0].judged;
  assert.deepEqual([run([FIX_J(src)]).signal, run([FIX_J(src)]).source.kind], [SIGNAL.PRESENT, "FIXTURE"]);
  assert.equal(run([FIX_J(src, { verdict: "FAIL" })]).signal, SIGNAL.FINDING);
  assert.equal(run([FIX_J(src)], "REAL").signal, SIGNAL.NOT_MEASURED, "a fixture judgement was carried into a real run");
  assert.equal(run([FIX_J(src, { source: { kind: "AGENT", provider: "p-x", callRef: "call:1" } })], "REAL").signal, SIGNAL.NOT_MEASURED, "an unregistered provider's judgement was accepted");
  assert.equal(run([FIX_J(src, { source: { kind: "AGENT", provider: "p-x" } })], "REAL", ["p-x"]).signal, SIGNAL.NOT_MEASURED, "a judgement with no recorded call was accepted");
  assert.equal(run([FIX_J(src, { source: { kind: "AGENT", provider: "p-x", callRef: "call:1" } })], "REAL", ["p-x"]).signal, SIGNAL.PRESENT, "CONTROL: a registered provider's recorded call is lawful");
  assert.equal(run([FIX_J(src, { source: { kind: "PERSON" } })]).signal, SIGNAL.NOT_MEASURED, "a person's word was accepted as a judgement");
  const none = run([], "REAL");
  assert.deepEqual([none.signal, none.why], [SIGNAL.NOT_MEASURED, F92_NO_JUDGE], "a description was reported truthful without a recorded judgement");
  const perfect = assessMedia({ pageId: "p1", url: PAGE, html: html("", '<img src="/img/p.png" alt="A clear labelled diagram of the five renewal steps, from application to approval">') }).items[0].judged;
  assert.equal(perfect.signal, SIGNAL.NOT_MEASURED, "adequacy was inferred from the text itself");
});

/* ================= C4 ================= */
test("T92-C4 · F92 C4 DISCOVERABLE AND CONSISTENT: structured and og media that match the visible media — CONSISTENT; naming media the page does not show — a finding; a video with a VideoObject — no finding, with none — a finding; a recorded sitemap media entry is compared; the real capture shape (URL strings only) — NOT MEASURED", () => {
  const ok = assessMedia({ pageId: "p1", url: PAGE, html: html(`${ld({ "@type": "Article", image: { "@type": "ImageObject", contentUrl: `${A}/img/chart.png` } })}<meta property="og:image" content="${A}/img/chart.png">`, IMG) });
  assert.deepEqual(ok.consistency.structured.map((x) => [x.from, x.signal]), [["ImageObject.contentUrl", SIGNAL.CONSISTENT], ["og:image", SIGNAL.CONSISTENT]]);
  const bad = assessMedia({ pageId: "p1", url: PAGE, html: html(`<meta property="og:image" content="${A}/img/hero.png">${ld({ "@type": "Article", image: `${A}/img/other.png` })}`, IMG) });
  assert.deepEqual(bad.consistency.structured.map((x) => x.signal), [SIGNAL.FINDING, SIGNAL.FINDING], "a named media URL no visible media carries was reported consistent");
  const vid = assessMedia({ pageId: "p1", url: PAGE, html: html(ld({ "@type": "VideoObject", name: "Intro", description: "d", contentUrl: `${A}/v/intro.mp4` }), '<video src="/v/intro.mp4"></video>') });
  assert.deepEqual(vid.consistency.videos.map((v) => v.signal), [SIGNAL.PRESENT]);
  const lone = assessMedia({ pageId: "p1", url: PAGE, html: html("", '<video src="/v/lone.mp4"></video>') });
  assert.deepEqual(lone.consistency.videos.map((v) => v.signal), [SIGNAL.FINDING], "a video with no structured or sitemap metadata carried no finding");
  const smVideo = assessMedia({ pageId: "p1", url: PAGE, html: html("", '<video src="/v/lone.mp4"></video>'), sitemapMedia: [{ pageUrl: PAGE, mediaUrl: `${A}/v/lone.mp4`, kind: "video" }] });
  assert.deepEqual([smVideo.consistency.videos[0].signal, smVideo.consistency.sitemap.signal], [SIGNAL.PRESENT, SIGNAL.CONSISTENT]);
  const smWrong = assessMedia({ pageId: "p1", url: PAGE, html: html("", IMG), sitemapMedia: [{ pageUrl: PAGE, mediaUrl: `${A}/img/gone.png`, kind: "image" }] });
  assert.equal(smWrong.consistency.sitemap.signal, SIGNAL.FINDING);
  assert.deepEqual([ok.consistency.sitemap.signal, ok.consistency.sitemap.why], [SIGNAL.NOT_MEASURED, NO_SITEMAP_MEDIA], "sitemap consistency was decided with no media entries recorded");
  assert.equal(sitemapMediaOf([{ record_type: "observation", value: { origin: A, urls: [PAGE], urlsStored: 1 } }]), null, "the real capture shape (URL strings only) was read as media entries");
  assert.deepEqual(sitemapMediaOf([{ record_type: "observation", value: { media: [{ pageUrl: PAGE, mediaUrl: `${A}/img/chart.png`, kind: "image" }] } }]).length, 1);
});

/* ================= C5 ================= */
test("T92-C5 · F92 C5 MEDIA RECOMMENDED ONLY WHERE A RECORDED NEED ASKS: a need naming a media format — the recommendation names the need and its record; no such record — NOT MEASURED; every chosen need's spec carries none; F92 writes, fetches or inserts no media", () => {
  const yes = recommendationOf({ needId: "need-1", mediaFormat: "diagram", ref: "need-record:need-1" });
  assert.deepEqual([yes.signal, yes.needId, yes.format, yes.ref], [SIGNAL.PRESENT, "need-1", "diagram", "need-record:need-1"]);
  for (const n of [null, { needId: "need-2" }, { needId: "need-3", mediaFormat: "diagram" }]) assert.deepEqual([recommendationOf(n).signal, recommendationOf(n).why], [SIGNAL.NOT_MEASURED, NO_MEDIA_NEED], "media was recommended with no recorded need naming a media format");
  const page = assessMedia({ pageId: "p0", url: PAGE, html: html("", "<p>Words.</p>") });
  assert.equal(page.recommendation.signal, SIGNAL.NOT_MEASURED, "media was recommended for a page by default");
  const c = chosen();
  assert.equal(mediaNeedOf(c.d.spec), null, "a chosen need's spec was read as naming a media format");
  const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: null });
  const plan = planForDraft({ draft: d, need: mediaNeedOf(c.d.spec) });
  assert.deepEqual([plan.media, plan.recommendation.signal], [SIGNAL.NO_MEDIA, SIGNAL.NOT_MEASURED]);
  assert.equal(planForDraft({ draft: d, need: { needId: c.d.spec.subject, mediaFormat: "video", ref: "need-record:x" } }).recommendation.format, "video", "CONTROL: a recorded need's format was not carried");
  assert.ok(!/<img\b|<video\b/i.test(JSON.stringify(plan)), "F92 inserted media into its plan");
});

/* ================= C6 ================= */
function realVerdict(resolve, tenantId) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve });
  const sm = readTenantPartition({ batchId: SITEMAP_BATCH_ID, tenantId, resolve });
  const declared = declaredScope({ tenantId });
  return scopeCompleteness({ origins: declared.origins, observations: part.records.filter((r) => r.record_type === "observation"), sitemaps: sm.records.filter((r) => r.record_type === "observation"), edges: readPartitionEdges({ batchId: BATCH_ID, observationIds: part.observationIds }), freshnessRule: declared.freshnessRule, now: new Date() });
}
const SITE = [pg("p1", "/guides/renewal", html("", IMG)), pg("p2", "/guides/fees", html("", "<p>Fees.</p>")), pg("p3", "/guides/video", html("", '<video src="/v/lone.mp4"></video>'))];
function spyWorld() {
  const asked = [];
  const pagesOf = { [T]: SITE, [T2]: [pg("b1", "/b", html("", IMG), T2)] };
  const io = {
    population: ({ tenantId }) => { asked.push(tenantId); return { population: { pages: (pagesOf[tenantId] ?? []).map((p) => ({ pageId: p.pageId, tenantId: p.tenantId, html: p.html })), completeness: INCOMPLETE_INV }, fault: null }; },
    partition: ({ tenantId }) => { asked.push(tenantId); return { records: (pagesOf[tenantId] ?? []).map((p) => ({ record_type: "page", page_id: p.pageId, canonical_url: p.url })), observationIds: [] }; },
    sitemap: ({ tenantId }) => { asked.push(tenantId); return { records: [{ record_type: "observation", value: { origin: A, urls: SITE.map((p) => p.url) } }] }; },
  };
  return { io, asked };
}
test("T92-C6 · F92 C6 NEVER INVENTED; THE BOUND; ONE TENANT; READ-ONLY: every signal lawful with its evidence or reason; no real tenant's inventory is COMPLETE, so no real result says the site has no media; a COMPLETE fixture may; a two-tenant world reads only its own tenant; F92 calls out to nothing and writes nothing", () => {
  const a = auditMedia({ tenantId: T, pages: SITE, completeness: INCOMPLETE_INV });
  for (const r of a.results) {
    assert.ok(LAWFUL.has(r.media));
    for (const i of r.items) for (const k of ["described", "judged"]) assert.ok(LAWFUL.has(i[k].signal) && (i[k].signal === SIGNAL.PRESENT || (typeof i[k].why === "string" && i[k].why !== "")), `${r.pageId}.${k} has no lawful signal or reason`);
    assert.ok(LAWFUL.has(r.recommendation.signal) && LAWFUL.has(r.consistency.sitemap.signal));
  }
  const resolve = createTenantResolver();
  const tenants = (readDeclarations().tenants ?? []).map((t) => t.tenantId).filter((id) => declaredScope({ tenantId: id }).origins.length > 0);
  assert.ok(tenants.length > 0, "no real tenant was read — the control would prove nothing");
  const tally = {};
  const bare = [SITE[1]];
  for (const id of tenants) {
    const v = realVerdict(resolve, id);
    tally[v.state] = (tally[v.state] ?? 0) + 1;
    assert.notEqual(v.state, "COMPLETE");
    const x = auditMedia({ tenantId: T, pages: bare, completeness: v });
    assert.deepEqual([x.site.siteHasNoMedia, x.bound.state], [SIGNAL.NOT_MEASURED, v.state], "a real result said the site has no media");
  }
  console.log(`  REAL (count-only, records only): ${tenants.length} tenant(s) · ${Object.entries(tally).map(([k, x]) => `${k} ${x}`).join(" · ")} · no result claims a page the inventory does not hold`);
  assert.equal(auditMedia({ tenantId: T, pages: bare, completeness: COMPLETE_INV }).site.siteHasNoMedia, true, "CONTROL: a COMPLETE fixture could not decide it");
  const W = spyWorld();
  const r = readClientMedia({ tenantId: T, chosen: [], io: W.io });
  assert.deepEqual([...new Set(W.asked)], [T], "a read asked for another tenant");
  assert.deepEqual([r.audit.pages, r.audit.bound.state, r.audit.bound.text, r.sitemapMediaRecorded], [3, "INCOMPLETE", INCOMPLETE_INV.bound, false], "a result lacks its bound");
  const mixed = auditMedia({ tenantId: T, pages: [...SITE, pg("b1", "/b", html("", IMG), T2)], completeness: COMPLETE_INV });
  assert.deepEqual([mixed.refused.map((x) => x.pageId), mixed.pages], [["b1"], 3], "another tenant's page was read into the audit");
  for (const m of [MV, ME]) assert.deepEqual(decisionCallPaths({ entries: [m] }).faults, [], `${m} can call out`);
  const planted = decisionCallPaths({ entries: [MV], read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === MV ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  const WRITES = /from "node:fs"|writeFileSync|appendFileSync|createWriteStream|createJsonlStore|recordDecision|recordPartition|publish\(/;
  for (const m of [MV, ME]) assert.doesNotMatch(code(m), WRITES, `${m} writes or records`);
  assert.match('import { writeFileSync } from "node:fs";', WRITES, "the census cannot see a planted write");
  assert.ok(code(ME).includes(`${"read"}ExistingPagePopulation({ scope: { tenantId }, resolve, env, now })`), "F31's reader is handed a scope that can record");
  for (const m of [MV, ME]) assert.doesNotMatch(code(m), /construct\.mjs|\/render\.mjs|site-plan/, `${m} imports a page producer or F94's plan`);
});

/* ================= C7 ================= */
const OTHER_ROWS = Object.freeze({
  "src/audit/accessibility.mjs": "0c2055097adf4f7d6385b855dcb984460a96a484b991444049e1e37bbd580c80",
  "src/audit/accessibility-reader.mjs": "4fdff36a21ffda10fc4798a92848907710ca5a58cb68e7a711b74b45049813f7",
  "src/page/structured-data.mjs": "4c259ac7398b4ab4f763ba892033a9abebb173d0a91d7849f86a55a48a413171",
  "src/page/structured-data-evidence.mjs": "b3b8b7055e7bbb7804dfa50ba2eaf79ecf67c009fddf10cee9dc065a4a30f0bb",
  "src/audit/indexability-signals.mjs": "83299713c50af0e92e95d18280d1e6ba66310cead5acb3eeadf5ca19febf146a",
  "src/audit/indexability-reader.mjs": "ece3a59630ac652ea555f88c14b56c0ff2a17f4eac043723b13957b007b6d9b3",
  "src/adapter/sitemap-subject.mjs": "a40673d45c94c5559465bd0aa0396e7d8753628983d26972821e712478b8ec05",
  "src/page/draft-render.mjs": "fa5ebe27a4dbc8499be502bdfc302b8f584b0ca12b436f95f99f962a99c54a3b",
  "src/page/construct.mjs": "24d1fc41da3ada728b5218d33a54d510994df9f9a72a001e9ceafe97dd440b4f",
  "bin/build-page.mjs": "dd4adb6a99ce4ae648278ed3ca8fda8f9c711ce6295c3d48256dfbd3d3cb3211",
  "src/page/answer-first.mjs": "b5f49a4990243970152ddc1af14dbe6e73b0cb692d512b41b10f68a282114a1f",
  "src/page/answer-first-evidence.mjs": "7f5e9748bfa666ad97edd4c758999b1f1eedb3ad52aadc9a0b447e64d0ca8c2d",
  "src/page/quality-judgements.mjs": "f4511418885bfbb3994e842dd6ba42610e49b8e6368401f0791ca79cb482fda2",
  "src/page/content-brief.mjs": "5771c6955fcc621430391b9c34a525a74673e81a3ff4d3b05cf429d358ad5c06",
  "src/page/content-brief-evidence.mjs": "b1af103909fa3ef4782686380c4d1c5e14c473f5e73e1080f29fb1c06c37abe6",
  "src/page/trust-signals.mjs": "b0373dab2e1f0060da5292d411fffed5c6e88b3c78932996d5685a9510fab1bf",
  "src/page/trust-signals-evidence.mjs": "5db0b688ed794a259c7ba3788efaeb0cd9852955f71c690660f7ec2dd679af82",
  "bin/trust-signals.mjs": "e93057fde7f82d5f0893342dd0d158858b95b572cd13ca679a96cd99dbe8ceea",
  "src/page/site-plan.mjs": "8f3101e2bd7fa717bcdb92a15282e408e948699cd0934121da850c767643a393",
  "src/page/site-plan-evidence.mjs": "07130708a534f699c241b8f9696fa85ca10c919a1525b66cf08e98a2f5d40992",
});
const lfSha = (f) => createHash("sha256").update(readFileSync(join(REPO, f), "utf8").replace(/\r\n/g, "\n")).digest("hex");
const mjsUnder = (dir) => readdirSync(join(REPO, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? mjsUnder(`${dir}/${e.name}`) : e.name.endsWith(".mjs") ? [`${dir}/${e.name}`] : []));
test("T92-C7 · F92 C7 CHANGES NO OTHER ROW: F21, F26, F37, F38, F40, F41, F48, F93 and F94 byte for byte at base dcd9450e; nothing but F92's own entry point imports F92", () => {
  for (const [f, sha] of Object.entries(OTHER_ROWS)) assert.equal(lfSha(f), sha, `${f} changed — F92 changes no other row's code`);
  const importers = ["src", "bin", "tools"].flatMap(mjsUnder).filter((f) => ![ME, "bin/media-visibility.mjs"].includes(f) && /media-visibility(-evidence)?\.mjs["']/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(importers, [], "another row's code reads F92's findings");
  assert.match(STANDING, /changes no other row/);
});

/* ================= [ALL] ================= */
test("T92-ALL · F92 [ALL]: no proof reads a page body of the 27 pages set aside or a real run's output; a run reports only the findings it produced — the census fires on a planted real read", () => {
  const REAL = /readPartitionBodies|readExistingPagePopulation|\bREADERS\b|readClientActionEvidence\(|readClientBriefs\(|first-real-crawl|spawnSync|execFileSync/;
  const src = readFileSync(new URL(import.meta.url), "utf8").replace(/const REAL = [^\n]*\n/, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, REAL, "an F92 proof reads a page body or a real run's output");
  assert.match(`const p = ${"read"}ExistingPagePopulation({ scope });`, REAL, "the census cannot see a planted real read");
  for (const call of src.match(/readClientMedia\([^;]*;/g) ?? []) assert.match(call, /io: W\.io/, "a proof runs F92's reader on real data");
  const W = spyWorld();
  const c = chosen();
  const r = readClientMedia({ tenantId: T, chosen: [c.d], io: W.io });
  assert.deepEqual([r.plans.length, r.audit.measured], [1, 3]);
  const m = r.audit.results.filter((x) => x.measured);
  const recount = (f) => m.reduce((o, x) => { for (const k of f(x)) o[k] = (o[k] ?? 0) + 1; return o; }, {});
  assert.deepEqual(r.audit.counts.media, recount((x) => [x.media]), "the reported media counts are not the results'");
  assert.deepEqual(r.audit.counts.described, recount((x) => x.items.map((i) => i.described.signal)), "the reported described counts are not the results'");
  assert.deepEqual(r.audit.counts.videos, recount((x) => x.consistency.videos.map((v) => v.signal)), "the reported video counts are not the results'");
});

test("R92-BOARD · F92 moves only through the production validator and the audit trail: frozen and started under its own acceptance, VERIFIED-PASS only with a REAL VERIFIED event, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const row = DECLARED.F92;
  assert.deepEqual(row.events.slice(0, 2).map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION"]);
  assert.equal(row.events[0].ruling.commit, "06cdb828a1c8591674ca44f639c82a7a79537f5b");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F92" && e.occurredAt.startsWith("2026-10-08")), "F92's movement is not in the trail");
  if (row.state === "VERIFIED-PASS") {
    const v = row.events.find((e) => e.kind === "VERIFIED");
    assert.equal(v.population, "REAL");
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(row.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
