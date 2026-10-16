/**
 * RR-273 · THE GUIDES HUB (src/page/guides-hub.mjs), built and recorded as LIVE (bin/guides-hub.mjs), and checked alone by F23's bounded
 * link check (bin/link-status.mjs --hub).
 *
 * FIRING CONTROL: the hub lists each LIVE page by its own H1 and two-line intro, word for word, under the guides' own style, header and
 * footer, a title composed from one recorded phrase, its own canonical, no noindex, no FAQ data and an ItemList of the guides; each check of
 * a served hub turns FAIL on its own fault alone. PRODUCTION PATH: in a declared fixture world, the bin writes nothing without --confirm,
 * refuses a hub off the client's hosts or a phrase not recorded, records the hub built and then LIVE once; the link check's hub-only plan
 * is the hub's address and its guides, and no LIVE hub means no request. REAL: the pilot batch's hub builds with every check PASS; a hub
 * recorded is the hub the engine builds from the stored records.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { heroOf, hubEntries, designOf, hubTitle, hubPage, hubChecks, hubRecord, publishedHubRecord, hubLinkPage, itemListOf, HUB_RECORD, HUB_REFUSE } from "../src/page/guides-hub.mjs";
import { PUBLISH, publishedHtml } from "../src/page/publish-page.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { STAMP } from "../src/page/test-exception.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const HOST = "https://fixture-world.invalid";
const HUB = `${HOST}/guides`;
const PHRASE = { phraseId: "sp-1", page: "x", text: "OET exam preparation" };
const page = (value, h1, n, over = {}) => ({
  record_type: JOINED_RECORD, value, measurement_key: `joined_page_draft:${value}`, stamp: STAMP, publishedUrl: `${HOST}/guides/oet-for-${value}`, publishedSha256: `sha-${value}`,
  assets: [{ name: "assets/logo.png", file: "design/logo.png", sha256: "x" }],
  html: ["<!doctype html>", `<html lang="en"><head><meta charset="utf-8">${PUBLISH.NOINDEX}<title>${h1}</title><style>p{}</style>`,
    "<script type=\"application/ld+json\">{\"@type\":\"FAQPage\"}</script></head><body>", `<p class="stamp">${STAMP}</p>`, '<header><img src="assets/logo.png"><a href="https://fixture-world.invalid/">Home</a></header>', "<main>",
    `<section class="hero"><h1>${h1}</h1><p>The product line.</p><p>${n} questions answered below, each with its source.</p><a class="cta" href="${HOST}/signup">Start</a></section>`, "</main>", "<footer><p>Footer</p></footer>", `<p class="stamp">${STAMP}</p>`, "</body></html>", ""].join("\n"),
  ...over,
});
const PAGES = [page("testers", "OET for Testers 2026: Score &amp; Cost", 3), page("makers", "OET for Makers 2026", 4)];

test("HUB · FIRING CONTROL (RR-273): each LIVE page listed by its own H1 and intro word for word, under the guides' own design, a title from one recorded phrase, its own canonical, no noindex, no FAQ data, an ItemList of the guides; each check fails on its own fault alone", () => {
  const L = hubEntries(PAGES), design = designOf(PAGES), T = hubTitle({ phrase: PHRASE, entries: L.entries });
  assert.deepEqual([L.state, L.entries.length, L.entries[0].h1, L.entries[0].intro, design.state, T.state, T.title, T.trace[0].from], ["LISTED", 2, "OET for Testers 2026: Score &amp; Cost", ["<p>The product line.</p>", "<p>3 questions answered below, each with its source.</p>"], "DESIGN", "COMPOSED", "OET Exam Preparation", "search-phrase:sp-1"]);
  const p = hubPage({ entries: L.entries, design, title: T.title, url: HUB });
  assert.equal(p.state, "BUILT");
  const pub = publishedHtml(PAGES[0], { url: PAGES[0].publishedUrl }).html;
  assert.deepEqual([p.html.includes('<header><img src="assets/logo.png">'), p.html.includes("<footer><p>Footer</p></footer>"), p.html.includes(`<base href="${HUB}/">`), p.html.includes(`<link rel="canonical" href="${HUB}">`), p.html.includes("noindex"), p.html.includes("FAQPage"), p.html.includes(STAMP), pub.includes('<header><img src="assets/logo.png">')], [true, true, true, true, false, false, false, true]);
  assert.deepEqual(itemListOf(L.entries).itemListElement.map((x) => [x.position, x.url, x.name]), [[1, PAGES[0].publishedUrl, "OET for Testers 2026: Score & Cost"], [2, PAGES[1].publishedUrl, "OET for Makers 2026"]]);
  const args = { entries: L.entries, design, title: T.title, url: HUB };
  const all = (html) => Object.entries(hubChecks({ ...args, html })).filter(([, v]) => v.state !== "PASS").map(([k]) => k);
  assert.deepEqual(all(p.html), [], "CONTROL: the hub as built must pass every check");
  const faults = [
    [p.html.replace("<title>OET Exam Preparation</title>", "<title>OET Guides</title>"), ["titleAndOneH1", "sameAsBuilt"]],
    [p.html.replace("</section>\n<section class=\"guide\">", "</section>\n<h1>x</h1><section class=\"guide\">"), ["titleAndOneH1", "sameAsBuilt"]],
    [p.html.replace(`<h2><a href="${PAGES[1].publishedUrl}">OET for Makers 2026</a></h2>`, "<h2>OET for Makers 2026</h2>"), ["everyGuideLinkedOnce", "ownH1AndIntroWordForWord", "sameAsBuilt"]],
    [p.html.replace("<p>4 questions answered below, each with its source.</p>", "<p>4 questions answered.</p>"), ["ownH1AndIntroWordForWord", "sameAsBuilt"]],
    [p.html.replace(`<link rel="canonical" href="${HUB}">`, ""), ["canonicalOwnAddress", "sameAsBuilt"]],
    [p.html.replace(`<link rel="canonical" href="${HUB}">`, `<link rel="canonical" href="${HUB}/x">`), ["canonicalOwnAddress", "sameAsBuilt"]],
    [p.html.replace("<title>", '<meta name="robots" content="noindex"><title>'), ["noNoindex", "sameAsBuilt"]],
    [p.html.replace("</head>", '<script type="text/plain">FAQPage</script></head>'), ["noFaqData", "sameAsBuilt"]],
    [p.html.replace('"position":2', '"position":3'), ["itemListOfTheGuides", "sameAsBuilt"]],
    [p.html.replace("<footer><p>Footer</p></footer>", "<footer><p>Footer</p><a href=\"/x\">x</a></footer>"), ["headerFooterAsTheGuides", "sameAsBuilt"]],
    [p.html.replace(`<base href="${HUB}/">`, `<base href="${HOST}/">`), ["logoFromTheGuidesFolder", "sameAsBuilt"]],
    [p.html.replace("<main>", "<main><!-- -->"), ["sameAsBuilt"]],
  ];
  for (const [html, want] of faults) assert.deepEqual(all(html), want, `a fault did not fail its own check: ${want.join(", ")}`);
  /* refused: a page not LIVE, a hero not an H1 and two lines, guides of two designs, a phrase not recorded, an address not https */
  assert.equal(hubEntries([page("a", "A", 1, { publishedUrl: undefined })]).reason, HUB_REFUSE.NO_PAGES);
  assert.equal(hubEntries([]).reason, HUB_REFUSE.NO_PAGES);
  assert.equal(hubEntries([page("a", "A", 1, { html: PAGES[0].html.replace("<p>The product line.</p>", "") })]).reason, HUB_REFUSE.NO_HERO);
  assert.equal(heroOf("<section class=\"hero\"><h1>A</h1><p>one</p></section>"), null);
  assert.equal(designOf([PAGES[0], page("b", "B", 1, { html: PAGES[0].html.replace("<p>Footer</p>", "<p>Other</p>") })]).reason, HUB_REFUSE.MIXED_DESIGN);
  assert.equal(hubTitle({ phrase: { phraseId: "", text: "x" }, entries: L.entries }).reason, HUB_REFUSE.NO_TITLE);
  for (const url of ["http://fixture-world.invalid/guides", `${HUB}?a=1`, "nope"]) assert.equal(hubPage({ ...args, url }).reason, HUB_REFUSE.NO_ADDRESS, url);
  /* the record: built, then LIVE once with the decision; the link page: the hub's own list only */
  const rec = hubRecord({ ...args, trace: T.trace, subject: "s", assets: PAGES[0].assets, on: "2026-10-16" });
  assert.deepEqual([rec.record_type, rec.url, rec.html, rec.entries.map((e) => e.from), rec.publishedUrl], [HUB_RECORD, HUB, p.html, ["joined_page_draft:testers", "joined_page_draft:makers"], undefined]);
  const live = publishedHubRecord(rec, { on: "2026-10-16", decision: "_handoffs:D.md" });
  assert.deepEqual([live.publishedUrl, live.publishedOn, live.publishedSha256, live.publishedFrom, live.publishedBy.decision, live.measurement_key !== rec.measurement_key], [HUB, "2026-10-16", rec.sha256, rec.measurement_key, "_handoffs:D.md", true]);
  assert.equal(publishedHubRecord(rec, { on: "2026-10-16", decision: "no" }).reason, HUB_REFUSE.NO_DECISION);
  assert.equal(publishedHubRecord({ ...rec, html: rec.html + " " }, { on: "2026-10-16", decision: "_handoffs:D.md" }).reason, HUB_REFUSE.NOT_A_HUB);
  const lp = hubLinkPage({ records: [rec, live], url: HUB, hosts: ["fixture-world.invalid"] });
  assert.deepEqual([[...lp.html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]), lp.canonical, lp.html.includes("Home")], [[PAGES[0].publishedUrl, PAGES[1].publishedUrl], HUB, false]);
  assert.deepEqual([hubLinkPage({ records: [rec], url: HUB, hosts: ["fixture-world.invalid"] }), hubLinkPage({ records: [rec, live], url: HUB, hosts: ["elsewhere.invalid"] })], [null, null]);
});

test("HUB · PRODUCTION PATH (RR-273): in a declared fixture world, nothing is written without --confirm; a hub off the client's hosts or a phrase not recorded is refused; the hub is recorded built, then LIVE once; the link check plans the hub alone and makes no request for a hub not LIVE", () => {
  const BATCH = "fixture-hub";
  const W = declaredWorld({ extra: [["RESEARCH_BATCH", BATCH]] });
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    mkdirSync(join(W.root, "fixture-tests"), { recursive: true });
    reg.subjects.push({ subjectId: "fixture-tests", path: "fixture-tests", members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: BATCH }], connectors: [] });
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    const b = join(W.root, "research", BATCH); mkdirSync(b, { recursive: true });
    writeFileSync(join(b, "joined-pages.jsonl"), PAGES.map((p) => JSON.stringify(p)).join("\n") + "\n");
    writeFileSync(join(b, "search-phrases.json"), JSON.stringify([PHRASE]));
    const hubs = () => (existsSync(join(b, "guides-hub.jsonl")) ? readFileSync(join(b, "guides-hub.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
    const run = (bin, ...extra) => spawnSync(process.execPath, [bin, ...W.argv(["--subject=fixture-tests", `--research-batch=${BATCH}`, "--on=2026-10-16", ...extra])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const hub = (...extra) => run("bin/guides-hub.mjs", ...extra);
    const dry = hub(`--url=${HUB}`, "--title-phrase=sp-1");
    assert.deepEqual([dry.status, /listed 2/.test(dry.stdout), /every check PASS/.test(dry.stdout), /NOT WRITTEN/.test(dry.stdout), hubs().length], [0, true, true, true, 0], dry.stdout + dry.stderr);
    for (const [extra, why] of [[["--url=https://elsewhere.invalid/guides", "--title-phrase=sp-1"], /HUB_NOT_ON_A_DECLARED_HOST/], [[`--url=${HUB}`, "--title-phrase=sp-9"], /NO_TITLE_FROM_A_RECORDED_PHRASE/], [[`--url=${HUB}`, "--record-live", "--decision=_handoffs:D.md"], /NO_HUB_BUILT/]]) {
      const r = hub(...extra, "--confirm");
      assert.deepEqual([r.status, why.test(r.stdout + r.stderr), hubs().length], [3, true, 0], r.stdout + r.stderr);
    }
    /* the link check before the hub is LIVE: refused, no request */
    const early = run("bin/link-status.mjs", `--hub=${HUB}`);
    assert.deepEqual([early.status, /NO_LIVE_HUB.*NO REQUEST WAS MADE/.test(early.stderr)], [3, true], early.stdout + early.stderr);
    const built = hub(`--url=${HUB}`, "--title-phrase=sp-1", "--confirm");
    assert.deepEqual([built.status, hubs().length, hubs()[0].publishedUrl], [0, 1, undefined], built.stdout + built.stderr);
    const noDecision = hub(`--url=${HUB}`, "--record-live", "--decision=nothing", "--confirm");
    assert.deepEqual([noDecision.status, /NO_OWNER_DECISION/.test(noDecision.stderr), hubs().length], [3, true, 1], noDecision.stdout + noDecision.stderr);
    const live = hub(`--url=${HUB}`, "--record-live", "--decision=_handoffs:OWNER_DECISION_FIXTURE.md", "--confirm");
    assert.deepEqual([live.status, hubs().length, hubs()[1].publishedUrl, hubs()[1].publishedBy.decision, hubs()[1].sha256 === hubs()[0].sha256], [0, 2, HUB, "_handoffs:OWNER_DECISION_FIXTURE.md", true], live.stdout + live.stderr);
    const again = hub(`--url=${HUB}`, "--record-live", "--decision=_handoffs:OWNER_DECISION_FIXTURE.md", "--confirm");
    assert.deepEqual([again.status, /ALREADY_PUBLISHED/.test(again.stderr), hubs().length], [3, true, 2], again.stdout + again.stderr);
    /* the hub-only plan: the hub's own address and its two guides — nothing of the header or footer, no request without --live */
    const plan = run("bin/link-status.mjs", `--hub=${HUB}`);
    assert.deepEqual([plan.status, /hub only/.test(plan.stdout), /plan +2 link occurrence\(s\) · 3 distinct address\(es\) on 1 host\(s\)/.test(plan.stdout), /NOT RUN — no --live/.test(plan.stdout)], [0, true, true, true], plan.stdout + plan.stderr);
  } finally { W.cleanup(); }
});

test("HUB · REAL (RR-273): the pilot batch's hub builds from its LIVE pages with every check PASS, each guide by its own H1 and intro; a hub recorded in the batch is the hub the engine builds from the stored records", () => {
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
  const file = join(dir, "joined-pages.jsonl");
  assert.ok(existsSync(file), "the pilot batch is not in the research store");
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === JOINED_RECORD);
  const live = [...new Map(rows.filter((r) => typeof r.publishedUrl === "string").map((r) => [r.value, r])).values()];
  assert.ok(live.length >= 12, "EMPTY real population");
  const L = hubEntries(live), design = designOf(live);
  const phrase = JSON.parse(readFileSync(join(dir, "search-phrases.json"), "utf8")).find((p) => p.phraseId === "sp-063");
  const T = hubTitle({ phrase, entries: L.entries });
  assert.deepEqual([L.state, design.state, T.state], ["LISTED", "DESIGN", "COMPOSED"]);
  const url = new URL("/guides", live[0].publishedUrl).href;
  const p = hubPage({ entries: L.entries, design, title: T.title, url });
  assert.deepEqual(Object.entries(hubChecks({ html: p.html, entries: L.entries, design, title: T.title, url })).filter(([, v]) => v.state !== "PASS").map(([k]) => k), []);
  for (const r of live) assert.ok(p.html.includes(`<h1>${heroOf(r.html).h1}</h1>`) === false && p.html.includes(`>${heroOf(r.html).h1}</a></h2>${heroOf(r.html).intro.join("")}`), `${r.value}: not listed by its own H1 and intro`);
  const hubFile = join(dir, "guides-hub.jsonl");
  if (existsSync(hubFile)) {
    const recs = readFileSync(hubFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === HUB_RECORD);
    for (const r of recs) assert.equal(r.html, hubPage({ entries: L.entries, design, title: T.title, url: r.url }).html, "a recorded hub is not the hub the engine builds from the stored records");
  }
});
