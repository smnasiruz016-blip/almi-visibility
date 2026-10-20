/* RR-296 · the ONE builder makes NEW pages (and still rebuilds existing ones), and the daily article feature.
 * The TEST PROJECT (test/fixtures/rr296-test-project.mjs — a neutral subject made only for testing) beside the 12 stored guides as the pages
 * that already stand. Nothing is published, fetched or attached to a product. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { planNewPages, servedBy, NEW_PAGE_REFUSAL, buildNewPages } from "../src/page/one-builder.mjs";
import { articleSettings, settingsView, articlesForDay, PUBLISH_MODE, ARTICLE_SETTINGS_DEFAULT } from "../src/page/articles.mjs";
import { HERE, newPageRun, articleRun, DAYS, P } from "./support/rr296-proof.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const fails = (r) => Object.values(r.gates).flatMap((g) => (g.checks ?? []).filter((c) => c.result !== "PASS").map((c) => `${g.gate}: ${c.reason ?? c.name}`));

/* ---- A · the new-page path ------------------------------------------------------------------------------------------------- */
test("A · PLAN (pure): a planned, sourced need is NEW; the same answer as a standing page is a SECTION of it; unplanned and unsourced are REFUSED, named; only planned paths are served", () => {
  const c = P.CLAIMS[0];
  const plan = planNewPages({ needs: P.NEEDS({ question: "What does the exam cost to sit?", claim: c }), existing: [{ id: "https://widgetry.example/old", url: "https://widgetry.example/old", claimIds: ["w-zz"], questions: ["Old?"] }] });
  assert.deepEqual(plan.map((p) => [p.needId, p.kind]), [["n-fee", "NEW"], ["n-valid", "NEW"], ["n-existing", "SECTION"], ["n-merged", "REFUSED"], ["n-unsourced", "REFUSED"]]);
  /* the same answer as an EARLIER NEW need is a section of that new page — never a second page */
  assert.match(plan[2].reason, /same as \/guides\/widgetry-exam-fee — a section of that page, never a duplicate page/);
  assert.equal(plan[3].reason, NEW_PAGE_REFUSAL.NOT_PLANNED);
  assert.equal(plan[4].reason, NEW_PAGE_REFUSAL.NOT_SOURCED);
  const pages = buildNewPages({ plan, keyFacts: P.KEY_FACTS, quotationOf: P.quotationOf, design: P.DESIGN, stamp: null, on: "2026-10-20", site: P.SITE });
  assert.equal(pages.length, 2);
  const serve = servedBy(pages);
  assert.deepEqual([serve("/guides/widgetry-exam-fee").status, serve("/guides/widgetry-results-validity/").status, serve("/guides/not-planned").status, serve("/anything").status], [200, 200, 404, 404]);
  /* the page method: the client's own design (its logo, header and links) → key-fact cards → Q&A, each answer sourced and dated */
  const h = pages[0].html, at = (re) => h.search(re);
  assert.ok(at(/<header/) >= 0 && at(/<header/) < at(/class="cards"/) && at(/class="cards"/) < at(/<footer/), "the page order");
  assert.ok(h.includes("Widgetry Prep") && h.includes("https://widgetry.example/contact") && h.includes("https://board.widgetry.example/fees") && h.includes("2026-10-18"));
});

test("A · REAL: on the test project, 2 NEW pages pass all five gates; 1 need joins the doctors' guide as a SECTION (that page rebuilt, passing); refusals named; unplanned URLs 404", { skip: HERE ? false : "the stored guides are not on this machine" }, () => {
  const r = newPageRun();
  const res = (url) => r.results.find((x) => x.id === url);
  assert.deepEqual(r.pages.map((p) => p.url), ["https://widgetry.example/guides/widgetry-exam-fee", "https://widgetry.example/guides/widgetry-results-validity"]);
  for (const p of r.pages) assert.equal(res(p.url).pass, true, `${p.url}: ${fails(res(p.url)).join(" | ")}`);
  assert.deepEqual(r.sections.map((s) => [s.needId, s.into]), [["n-existing", "https://almioet.almiworld.com/guides/oet-for-doctors"]]);
  assert.ok(r.rebuilt.questions.includes("What does the doctors' exam cost to sit?"), "the merged question is not asked on the existing page");
  assert.equal(res(r.rebuilt.url).pass, true, fails(res(r.rebuilt.url)).join(" | "));
  assert.deepEqual(r.plan.filter((p) => p.kind === "REFUSED").map((p) => p.needId), ["n-merged", "n-unsourced"]);
  assert.equal(r.serve("/guides/not-planned").status, 404);
  console.log(`  NEW ${r.pages.length} · SECTION ${r.sections.length} · REFUSED ${r.plan.filter((p) => p.kind === "REFUSED").length} · gates: ${[...r.pages, r.rebuilt].map((p) => `${new URL(p.url).pathname} ${res(p.url).pass ? "PASS" : "FAIL"}`).join(" · ")}`);
});

/* ---- B · articles -------------------------------------------------------------------------------------------------------------- */
test("B · SETTINGS: 1 article per day and AUTO after the gates by default; the client may change both; a value out of range is refused, named; the view is what the client sees", () => {
  assert.deepEqual({ ...ARTICLE_SETTINGS_DEFAULT }, { articlesPerDay: 1, publishMode: "AUTO_AFTER_GATES" });
  assert.equal(articleSettings({}).valid, true);
  assert.equal(articleSettings({ articlesPerDay: 3, publishMode: PUBLISH_MODE.REVIEW_FIRST }).valid, true);
  for (const bad of [{ articlesPerDay: -1 }, { articlesPerDay: 1.5 }, { articlesPerDay: 21 }, { publishMode: "PUBLISH_ALL" }]) assert.equal(articleSettings(bad).valid, false, JSON.stringify(bad));
  const v = settingsView(articleSettings({ publishMode: PUBLISH_MODE.REVIEW_FIRST }));
  assert.ok(v.some((l) => /\( \) Publish automatically after every gate passes/.test(l)) && v.some((l) => /\(•\) Show me first/.test(l)));
  assert.doesNotMatch(v.join("\n"), /\bwill (rank|be cited|appear)\b|guarantee/i);
});

test("B · REAL: 3 days, one article each, every one passing the five gates and the duplicate check; day 4 has no worthy topic → NO article, with its one-line reason; AUTO queues through the publishing control, REVIEW FIRST waits", { skip: HERE ? false : "the stored guides are not on this machine" }, () => {
  const np = newPageRun();
  const auto = articleRun({ newPages: np });
  assert.deepEqual(auto.map((d) => d.day), DAYS);
  assert.deepEqual(auto.slice(0, 3).map((d) => d.articles.map((a) => a.topicId)), [["t-online"], ["t-attempts"], ["t-id"]]);
  for (const d of auto.slice(0, 3)) {
    const [a] = d.articles;
    assert.equal(a.gates, "PASS — all five, and not a duplicate");
    assert.equal(a.publish.cohort, "MAY_PUBLISH");
    assert.match(a.publish.state, /^QUEUED TO PUBLISH \(held — no product is attached; nothing goes live\)$/);
    assert.ok(a.publish.sitemap.includes(a.url));
    assert.doesNotMatch(a.html, /\bwill (rank|be cited)\b|guaranteed? (to )?(rank|citation)/i);
  }
  assert.equal(auto[3].articles.length, 0, "a filler article was made");
  assert.equal(auto[3].none, "no article — none of 5 topic(s) is worthy today: 4 already answered by a page or an earlier article; 1 no recorded question (never made up)");
  /* the opinion appears only under its label, never in the FAQ data */
  const id = auto[2].articles[0].html;
  assert.match(id, /<strong>General view — not an official fact:<\/strong> Arriving early can make exam day calmer\./);
  const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(id)[1];
  assert.doesNotMatch(ld, /Arriving early/);
  /* REVIEW FIRST: the same articles, held for the client's approval — the publishing control refuses a cohort with no approval */
  const review = articleRun({ settings: { publishMode: PUBLISH_MODE.REVIEW_FIRST }, newPages: np });
  for (const d of review.slice(0, 3)) assert.deepEqual([d.articles[0].publish.cohort, d.articles[0].publish.state], ["REFUSED", "WAITING FOR THE CLIENT'S APPROVAL"]);
  /* the client's number: 2 a day makes two on day 1; 0 pauses */
  assert.equal(articleRun({ settings: { articlesPerDay: 2 }, newPages: np })[0].articles.length, 2);
  assert.match(articleRun({ settings: { articlesPerDay: 0 }, newPages: np })[0].none, /paused/);
  console.log(`  ${auto.map((d) => `${d.day}: ${d.articles.length ? d.articles[0].question : d.none}`).join(" | ")}`);
});

test("B · NEVER MADE UP (pure): a topic with no recorded question is never used; no topics → no article, said in one line", () => {
  const r = articlesForDay({ day: "2026-10-21", settings: {}, topics: [P.TOPICS[4]], existing: [], design: P.DESIGN, site: P.SITE });
  assert.deepEqual([r.articles.length, r.none], [0, "no article — none of 1 topic(s) is worthy today: 1 no recorded question (never made up)"]);
  assert.equal(articlesForDay({ day: "2026-10-21", settings: {}, topics: [], site: P.SITE }).none, "no article — no real question of this product is recorded");
});

/* ---- the runner: build-page builds NEW pages from a batch's planned needs ------------------------------------------------- */
test("A · THE RUNNER: build-page, --confirm, a batch with one stored page and planned needs — the NEW page is built and judged; the same-answer need becomes a SECTION; unplanned and unsourced are refused by name", () => {
  const BATCH = "rr296-new-pages-batch";
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", BATCH]] });
  const out = (mkdirSync(join(REPO, ".test-scratch"), { recursive: true }), mkdtempSync(join(REPO, ".test-scratch", "rr296-")));
  try {
    const dir = join(W.root, "research", BATCH);
    mkdirSync(dir, { recursive: true });
    const guide = { record_type: "joined_page_draft", value: "alpha", title: "Fixture guide alpha", publishedUrl: "https://site.fixture.invalid/guides/alpha",
      itemList: [{ needId: "n-alpha", needKey: "n-alpha", heading: { wording: "What does alpha cost?" }, questions: [{ questionId: "q-alpha", wording: "What does alpha cost?" }], claims: [P.CLAIMS[0]], statements: [] }] };
    writeFileSync(join(dir, "joined-pages.jsonl"), JSON.stringify(guide) + "\n");
    writeFileSync(join(dir, "planned-needs.json"), JSON.stringify({ site: "https://site.fixture.invalid", needs: P.NEEDS({ question: "How much is alpha?", claim: P.CLAIMS[0] }) }));
    const r = spawnSync(process.execPath, W.argv(["bin/build-page.mjs", "--product=almi-oet", `--research-batch=${BATCH}`, `--out=${out}`, "--confirm"]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.match(r.stdout, /planned needs {9}5 · NEW 1 · SECTION 2 · REFUSED 2/, r.stdout + r.stderr);
    assert.match(r.stdout, /SECTION n-fee — its answer is the same as https:\/\/site\.fixture\.invalid\/guides\/alpha/);
    assert.match(r.stdout, /🔴 REFUSED n-merged — not a planned need/);
    assert.match(r.stdout, /guides-widgetry-results-validity — (PASSES ALL FIVE GATES|REFUSED)/, "the NEW page was not built and judged");
    const written = readdirSync(out);
    assert.ok(written.every((f) => /^guides-(alpha|widgetry-results-validity)\./.test(f)), `written: ${written.join(", ")}`);
  } finally { rmSync(out, { recursive: true, force: true }); W.cleanup(); }
});

test("B · THE GATES DECIDE (pure): a topic whose page fails a gate (here: no key-fact card) makes NO article — and the day says which gate", () => {
  const r = articlesForDay({ day: "2026-10-21", settings: {}, topics: [P.TOPICS[0]], existing: [], design: P.DESIGN, keyFacts: [], quotationOf: P.quotationOf, site: P.SITE });
  assert.equal(r.articles.length, 0, "an article that fails a gate was made");
  assert.match(r.none, /^no article — none of 1 topic\(s\) is worthy today: 1 failed a gate \(/);
});
