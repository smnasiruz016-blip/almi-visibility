/**
 * RR-271 · A BUILT PAGE, PUBLISHED (src/page/publish-page.mjs) and the pages recorded as LIVE (bin/publish-pages.mjs).
 *
 * FIRING CONTROL: the published page is the build's page with exactly three changes — the noindex line made a canonical link to its own
 * address, the two stamps out — and each check of a served page turns FAIL on its own fault alone. PRODUCTION PATH: in a declared fixture
 * world, the bin records nothing without --confirm, refuses an address off the client's hosts or not the page's own, and records a page
 * once. REAL: every page of the pilot batch publishes cleanly; a page recorded as published was published from its own build.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { publishedHtml, publishChecks, publishedRecord, slugOf, PUBLISH, PUBLISH_REFUSE } from "../src/page/publish-page.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { STAMP } from "../src/page/test-exception.mjs";
import { publicationOf, PUBLICATION } from "../src/page/built-page-needs.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const URL1 = "https://fixture-world.invalid/guides/oet-for-testers";
const LD = '{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What score?","acceptedAnswer":{"@type":"Answer","text":"350."}}]}';
const page = (over = {}) => ({
  record_type: JOINED_RECORD, value: "testers", measurement_key: "joined_page_draft:000000000000000000000001", stamp: STAMP, itemList: [{ needId: "need-testers-1", questions: [] }],
  titleTrace: [{ part: "OET for Testers", from: "search-phrase:x", phrase: "oet for testers" }, { part: "2026", from: "date-fact:x" }],
  html: ["<!doctype html>", `<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${PUBLISH.NOINDEX}<title>OET for Testers 2026</title><style>p{}</style>`,
    `<script type="application/ld+json">${LD}</script></head><body>`, `<p class="stamp">${STAMP}</p>`, `<header><a href="https://fixture-world.invalid/">Home</a></header>`, "<main>",
    "<section class=\"hero\"><h1>OET for Testers 2026</h1></section>", "<p>What score? 350.</p>", "</main>", "<footer><p>Footer</p></footer>", `<p class="stamp">${STAMP}</p>`, "</body></html>", ""].join("\n"),
  ...over,
});

test("PUBLISH · FIRING CONTROL (RR-271): the published page is the build's page with its noindex line a canonical link to its own address and its two stamps out — nothing else; each check of a served page fails on its own fault alone; a build that is not exactly a test page is refused", () => {
  const r = page();
  const p = publishedHtml(r, { url: URL1 });
  assert.equal(p.state, "PUBLISHED");
  assert.equal(p.html, r.html.replace(PUBLISH.NOINDEX, `<link rel="canonical" href="${URL1}">`).replace(`<p class="stamp">${STAMP}</p>\n`, "").replace(`<p class="stamp">${STAMP}</p>\n`, ""), "the published page changed more than its robots line and its stamps");
  assert.deepEqual([p.html.includes("noindex"), p.html.includes(STAMP), p.sha256 === sha(p.html), p.html.includes(LD), p.html.includes("<h1>OET for Testers 2026</h1>")], [false, false, true, true, true]);
  const all = (html) => Object.entries(publishChecks({ record: r, html, url: URL1 })).filter(([, v]) => v.state !== "PASS").map(([k]) => k);
  assert.deepEqual(all(p.html), [], "CONTROL: the published page as built must pass every check");
  /* each fault alone */
  const faults = [
    [p.html.replace(`<link rel="canonical" href="${URL1}">`, `<link rel="canonical" href="${URL1}"><meta name="robots" content="noindex">`), ["noNoindex", "sameAsBuilt"]],
    [p.html.replace(`href="${URL1}"`, 'href="https://fixture-world.invalid/guides/other"'), ["canonicalOwnAddress", "sameAsBuilt"]],
    [p.html.replace(`<link rel="canonical" href="${URL1}">`, ""), ["canonicalOwnAddress", "sameAsBuilt"]],
    [p.html.replace("<header>", `<p class="stamp">${STAMP}</p>\n<header>`), ["noStamp", "sameAsBuilt"]],
    [p.html.replace('"text":"350."', '"text":"360."'), ["faqDataAsBuilt", "sameAsBuilt"]],
    [p.html.replace('"mainEntity":[', '"mainEntity":[,'), ["faqDataAsBuilt", "sameAsBuilt"]],
    [p.html.replace("<title>OET for Testers 2026</title>", "<title>OET for Testers</title>"), ["titleAsBuilt", "sameAsBuilt"]],
    [p.html.replace("<h1>OET for Testers 2026</h1>", "<h1>OET</h1>"), ["h1AsBuilt", "sameAsBuilt"]],
    [p.html.replace("<header><a href", "<header><a class=\"x\" href"), ["headerFooterAsBuilt", "sameAsBuilt"]],
    [p.html.replace("<p>Footer</p>", ""), ["headerFooterAsBuilt", "sameAsBuilt"]],
    [p.html.replace("<p>What score? 350.</p>", "<p>What score? 360.</p>"), ["sameAsBuilt"]],
  ];
  for (const [html, want] of faults) assert.deepEqual(all(html), want, `a fault did not fail its own check: ${want.join(", ")}`);
  /* refused: not https, a query or fragment, an address not written as written by the parser; not exactly one noindex line or two stamps */
  for (const url of ["http://fixture-world.invalid/guides/oet-for-testers", `${URL1}?x=1`, `${URL1}#a`, "https://FIXTURE-world.invalid/guides/oet-for-testers", "not a url"]) assert.equal(publishedHtml(r, { url }).reason, PUBLISH_REFUSE.NO_ADDRESS, url);
  assert.equal(publishedHtml(page({ html: r.html.replace(PUBLISH.NOINDEX, "") }), { url: URL1 }).reason, PUBLISH_REFUSE.NOINDEX_COUNT);
  assert.equal(publishedHtml(page({ html: r.html.replace(PUBLISH.NOINDEX, PUBLISH.NOINDEX + PUBLISH.NOINDEX) }), { url: URL1 }).reason, PUBLISH_REFUSE.NOINDEX_COUNT);
  assert.equal(publishedHtml(page({ html: r.html.replace(`<p class="stamp">${STAMP}</p>\n<header>`, "<header>") }), { url: URL1 }).reason, PUBLISH_REFUSE.STAMP_COUNT);
  assert.equal(publishedHtml({ ...r, record_type: "other" }, { url: URL1 }).reason, PUBLISH_REFUSE.NO_BUILD);
  /* the slug: the recorded H1 phrase */
  assert.deepEqual([slugOf(r), slugOf(page({ titleTrace: [{ part: "OET Pakistan" }] })), slugOf(page({ titleTrace: [] })), slugOf(page({ titleTrace: [{ part: " — " }] }))], ["oet-for-testers", "oet-pakistan", null, null]);
  /* the record: published where and when, a new record, PUBLISHED by the fields F10 reads */
  const rec = publishedRecord(r, { url: URL1, on: "2026-10-16" });
  assert.deepEqual([rec.publishedUrl, rec.publishedOn, rec.publishedSha256, rec.publishedFrom, rec.measurement_key !== r.measurement_key, rec.html === r.html, publicationOf(rec), publicationOf(r)], [URL1, "2026-10-16", p.sha256, r.measurement_key, true, true, PUBLICATION.PUBLISHED, PUBLICATION.UNPUBLISHED]);
  assert.equal(publishedRecord(r, { url: URL1, on: "soon" }).reason, PUBLISH_REFUSE.NO_DAY);
});

test("PUBLISH · PRODUCTION PATH (RR-271): in a declared fixture world, nothing is recorded without --confirm; an address off the client's hosts, or not the page's own, or a list with no owner decision, is refused with nothing written; a page is recorded as published once", () => {
  const BATCH = "fixture-publish";
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", BATCH]] });
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    mkdirSync(join(W.root, "fixture-tests"), { recursive: true });
    reg.subjects.push({ subjectId: "fixture-tests", path: "fixture-tests", members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: BATCH }], connectors: [] });
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    const b = join(W.root, "research", BATCH); mkdirSync(b, { recursive: true });
    writeFileSync(join(b, "joined-pages.jsonl"), JSON.stringify(page()) + "\n");
    const list = (pages, decision = "_handoffs:OWNER_DECISION_FIXTURE.md") => writeFileSync(join(b, "published-pages-2026-10-16.json"), JSON.stringify({ decision, pages }));
    const rows = () => readFileSync(join(b, "joined-pages.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.record_type === JOINED_RECORD);
    const run = (...extra) => spawnSync(process.execPath, ["bin/publish-pages.mjs", ...W.argv(["--subject=fixture-tests", `--research-batch=${BATCH}`, "--on=2026-10-16", "--published=published-pages-2026-10-16.json", ...extra])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    list([{ page: "testers", url: URL1 }]);
    const dry = run();
    assert.deepEqual([dry.status, /to record {8}1 page\(s\) PUBLISHED on 2026-10-16/.test(dry.stdout), /NOT WRITTEN/.test(dry.stdout), rows().length], [0, true, true, 1], dry.stdout + dry.stderr);
    for (const [pages, why, decision] of [[[{ page: "testers", url: "https://elsewhere.invalid/guides/oet-for-testers" }], /NOT_ON_A_DECLARED_HOST/], [[{ page: "testers", url: "https://fixture-world.invalid/guides/oet-for-others" }], /ADDRESS_IS_NOT_THE_PAGES_OWN/], [[{ page: "nobody", url: URL1 }], /NOT_A_BUILT_PAGE/], [[{ page: "testers", url: URL1 }], /PUBLISHED_LIST_UNREADABLE/, "no record"]]) {
      list(pages, decision);
      const r = run("--confirm");
      assert.deepEqual([r.status, why.test(r.stdout + r.stderr), rows().length], [3, true, 1], r.stdout + r.stderr);
    }
    list([{ page: "testers", url: URL1 }]);
    const ok = run("--confirm");
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const got = rows();
    assert.deepEqual([got.length, got[1].publishedUrl, got[1].publishedOn, got[1].publishedBy.decision, got[1].publishedSha256 === publishedHtml(page(), { url: URL1 }).sha256, publicationOf(got[1])], [2, URL1, "2026-10-16", "_handoffs:OWNER_DECISION_FIXTURE.md", true, PUBLICATION.PUBLISHED]);
    const again = run("--confirm");
    assert.deepEqual([again.status, /ALREADY_PUBLISHED/.test(again.stdout), rows().length], [3, true, 2], again.stdout + again.stderr);
  } finally { W.cleanup(); }
});

test("PUBLISH · REAL (RR-271): every page of the pilot batch publishes from its latest build with every check PASS, at an address ending in its own H1 phrase; a page recorded as published was published from its own build, with the sha256 of that page", () => {
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
  const file = join(dir, "joined-pages.jsonl");
  assert.ok(existsSync(file), "the pilot batch is not in the research store");
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === JOINED_RECORD);
  const latest = [...new Map(rows.map((r) => [r.value, r])).values()];
  assert.ok(latest.length >= 12, "EMPTY real population");
  for (const r of latest) {
    const url = r.publishedUrl ?? `https://site.invalid/guides/${slugOf(r)}`;
    const p = publishedHtml(r, { url });
    assert.equal(p.state, "PUBLISHED", `${r.value}: ${p.reason}`);
    assert.deepEqual(Object.entries(publishChecks({ record: r, html: p.html, url })).filter(([, v]) => v.state !== "PASS").map(([k]) => k), [], `${r.value}: a check fails`);
    if (r.publishedUrl) {
      assert.ok(new URL(r.publishedUrl).pathname.endsWith(`/${slugOf(r)}`), `${r.value}: published at an address that is not its own`);
      assert.equal(r.publishedSha256, p.sha256, `${r.value}: the recorded page is not the published build`);
      assert.ok(rows.some((x) => x.measurement_key === r.publishedFrom && x.html === r.html), `${r.value}: published from a build the batch does not hold`);
    }
  }
});
