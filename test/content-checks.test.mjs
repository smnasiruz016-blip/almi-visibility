import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { measure, extractBody, shingles, jaccard, SHELL_DEFINITION, THIN_UNIQUE_WORD_FLOOR } from "../src/audit/shell.mjs";
import {
  EXACT_DUPLICATE, THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE, ORPHAN_LINK,
  detectCannibalization, RECOMMENDATION_FIELDS, NEAR_DUPLICATE_THRESHOLD,
} from "../src/audit/content-checks.mjs";
import { buildInventory } from "../src/crawl/inventory.mjs";
import { targetPageId, canonicalUrl } from "../src/evidence/ids.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * 🔴 LAW-FIXTURE-1 — WHAT THESE FIXTURES ARE NOT.
 *
 * These pages are hand-built and structurally tidy: one <nav>, one <main>, no
 * inline SVG, no cookie banner, no framework hydration payload. Real pages in
 * the corpus carry all of those. So these do NOT test tolerance of messy
 * markup — the assertions at the foot run against the REAL 394-page corpus for
 * exactly that reason.
 */
const SHELL_WORDS = Array.from({ length: 2000 }, (_, i) => `navword${i % 50}`).join(" ");
const shellHeavy = (bodyWords) => `<!doctype html><html><head><title>t</title>
<script>var x=1;</script><style>.a{}</style></head><body>
<nav>${SHELL_WORDS}</nav><header>site header words here</header>
<main>${bodyWords}</main>
<footer>footer words here</footer></body></html>`;

const words = (n, seed = "body") => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(" ");
const CTX = (over = {}) => ({ openedAt: "2026-09-12T00:00:00.000Z", byHash: new Map(), peers: [], ...over });
const OBS = [{ observation_id: "o1", content_sha256: "hash-a" }];

/* ================================================================== *
 * 2B — 🔴 SHELL SUBTRACTION, TESTED AGAINST A SHELL-HEAVIER-THAN-BODY PAGE.
 * ================================================================== */

test("🔴 the shell is SUBTRACTED, not counted — a 2,000-word nav does not make a page fat", () => {
  const m = measure(shellHeavy(words(40)));
  assert.equal(m.bodyWordCount, 40, "the nav leaked into the body count");
  assert.ok(m.shellWordCount > 1900, `the shell should be ~2000 words, measured ${m.shellWordCount}`);
  assert.ok(m.shellShare > 0.9);
});

test("🔴 the CHROME path is exercised too — a page with NO <main> still has its nav subtracted", () => {
  /* A sabotage that emptied CHROME_ELEMENTS did NOT fail the first version of
   * this file, because every fixture wrapped its body in <main> and that path
   * never consults the chrome list. A test that cannot see a change is not
   * testing it. */
  const noMain = `<html><body><nav>${SHELL_WORDS}</nav><div>${words(30)}</div><footer>foot words</footer></body></html>`;
  const m = measure(noMain);
  assert.ok(m.confident, "chrome was recognised, so the split should be confident");
  assert.equal(m.bodyWordCount, 30, `the nav leaked into the body: got ${m.bodyWordCount} words`);
  assert.ok(m.shellWordCount > 1900);
});

test("🔴 script, style and head never count as prose", () => {
  const m = measure('<html><head><title>x</title></head><body><script>alert("a b c d e")</script><main>one two</main></body></html>');
  assert.equal(m.bodyWordCount, 2);
});

test("🔴 an unrecognisable layout is NOT CONFIDENT — and a check reading it must go UNKNOWN", async () => {
  const e = extractBody("<html><body><div>some words with no main and no chrome</div></body></html>");
  assert.equal(e.confident, false);
  assert.match(e.why, /indistinguishable/);

  const f = await THIN_CONTENT.run({
    page: { canonical_url: "https://e.example.com/x" },
    observations: OBS,
    siteContext: CTX({ bodyHtml: "<html><body><div>some words with no main and no chrome</div></body></html>" }),
  });
  assert.equal(f.verdict, "UNKNOWN");
  assert.equal(f.reason_code, "TOOL_FAILED");
});

/* RR-194 · T-2 (RTP-1 S10, P20, P21; PG-A1): version 2 decides nothing on 350 / 0.9 / 0.75 — the same fixture now records a REVIEW SIGNAL (UNKNOWN, its value carried in `signal`), never a FAIL */
test("the definition is printed in every result that uses it", async () => {
  const f = await THIN_CONTENT.run({
    page: { canonical_url: "https://e.example.com/x" },
    observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy(words(40)) }),
  });
  assert.ok(f.summary.includes(SHELL_DEFINITION), "the shell definition must travel with the number");
  assert.match(f.summary, new RegExp(`review signal: ${THIN_UNIQUE_WORD_FLOOR}`), "LAW-BOUND-1: the signal prints beside the result");
});

/* ================================================================== *
 * ITEM 12 — EVERY CHECK: FIRING FIXTURE **AND** SILENT CLEAN CONTROL.
 * ================================================================== */

/* RR-194 · T-2 (RTP-1 S10, P20, P21; PG-A1): version 2 decides nothing on 350 / 0.9 / 0.75 — the same fixture now records a REVIEW SIGNAL (UNKNOWN, its value carried in `signal`), never a FAIL */
test("🔴 THIN — FIRES (records a REVIEW SIGNAL, never a FAIL) on a 40-word body inside a 2,000-word shell", async () => {
  const f = await THIN_CONTENT.run({
    page: { canonical_url: "https://e.example.com/thin" }, observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy(words(40)) }),
  });
  assert.deepEqual([f.verdict, f.detector_version, f.signal.name, f.signal.value, f.signal.bound], ["UNKNOWN", "2", "unique-body-words", 40, THIN_UNIQUE_WORD_FLOOR]);
});

test("🔴 THIN — CLEAN CONTROL: the SAME 2,000-word shell with a 900-word body stays SILENT", async () => {
  const f = await THIN_CONTENT.run({
    page: { canonical_url: "https://e.example.com/fat" }, observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy(words(900)) }),
  });
  assert.equal(f, null, "🔴 FALSE POSITIVE: the shell is being counted as body");
});

test("🔴 THIN — an EMPTY body in raw HTML is UNKNOWN, never thin", async () => {
  // Found on the real corpus: body=0, shell=85. A client-rendered page looks
  // identical to an empty one without executing JavaScript.
  const f = await THIN_CONTENT.run({
    page: { canonical_url: "https://e.example.com/spa" }, observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy("") }),
  });
  assert.equal(f.verdict, "UNKNOWN");
  assert.equal(f.reason_code, "NEEDS_RENDERED_HTML");
});

test("🔴 EXACT DUPLICATE — FIRES on a shared hash, SILENT on distinct hashes", async () => {
  const byHash = new Map([["hash-a", ["https://e.example.com/a", "https://e.example.com/b"]]]);
  const fired = await EXACT_DUPLICATE.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS, siteContext: CTX({ byHash }),
  });
  assert.equal(fired.verdict, "FAIL");

  const silent = await EXACT_DUPLICATE.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS,
    siteContext: CTX({ byHash: new Map([["hash-a", ["https://e.example.com/a"]]]) }),
  });
  assert.equal(silent, null, "🔴 FALSE POSITIVE: a unique page was called a duplicate");
});

/* RR-194 · T-2 (RTP-1 S10, P20, P21; PG-A1): version 2 decides nothing on 350 / 0.9 / 0.75 — the same fixture now records a REVIEW SIGNAL (UNKNOWN, its value carried in `signal`), never a FAIL */
test("🔴 NEAR-DUPLICATE — FIRES (records a REVIEW SIGNAL, never a FAIL) on near-identical bodies", async () => {
  const a = shellHeavy(words(400));
  const b = shellHeavy(words(400) + " extraword");
  const peers = [{ url: "https://e.example.com/b", shingles: shingles(measure(b).bodyText) }];
  const f = await NEAR_DUPLICATE.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS,
    siteContext: CTX({ bodyHtml: a, peers }),
  });
  assert.deepEqual([f.verdict, f.signal.name, f.signal.bound, f.signal.value >= NEAR_DUPLICATE_THRESHOLD], ["UNKNOWN", "body-similarity", NEAR_DUPLICATE_THRESHOLD, true]);
  assert.match(f.summary, new RegExp(`review signal: ${NEAR_DUPLICATE_THRESHOLD}`));
});

test("🔴 NEAR-DUPLICATE — CLEAN CONTROL: an identical 2,000-word SHELL with different bodies stays SILENT", async () => {
  // This is the control that proves similarity is measured on BODY, not chrome.
  const a = shellHeavy(words(400, "alpha"));
  const b = shellHeavy(words(400, "beta"));
  const peers = [{ url: "https://e.example.com/b", shingles: shingles(measure(b).bodyText) }];
  const f = await NEAR_DUPLICATE.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS,
    siteContext: CTX({ bodyHtml: a, peers }),
  });
  assert.equal(f, null, "🔴 FALSE POSITIVE: two pages were called near-duplicates because they share a navigation");
});

/* RR-194 · T-2 (RTP-1 S10, P20, P21; PG-A1): version 2 decides nothing on 350 / 0.9 / 0.75 — the same fixture now records a REVIEW SIGNAL (UNKNOWN, its value carried in `signal`), never a FAIL */
test("🔴 TEMPLATE DOMINANCE — FIRES (records a REVIEW SIGNAL, never a FAIL) at 90% chrome, SILENT at 20%", async () => {
  const fired = await TEMPLATE_DOMINANCE.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy(words(100)) }),
  });
  assert.deepEqual([fired.verdict, fired.signal.name], ["UNKNOWN", "shell-share"]);

  const silent = await TEMPLATE_DOMINANCE.run({
    page: { canonical_url: "https://e.example.com/b" }, observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy(words(9000)) }),
  });
  assert.equal(silent, null);
});

test("jaccard on two empty sets is null, not 1 — nothing compared is not perfect similarity", () => {
  assert.equal(jaccard(new Set(), new Set()), null);
});

/* ================================================================== *
 * 2C — 🔴 ITEM 8: THESE LABELS DESCRIBE SUPPLY, NEVER DEMAND.
 * ================================================================== */

test("🔴 NO content check may emit a recommendation — 'thin' is not 'opportunity'", async () => {
  const findings = [];
  for (const [check, ctx] of [
    [THIN_CONTENT, CTX({ bodyHtml: shellHeavy(words(40)) })],
    [TEMPLATE_DOMINANCE, CTX({ bodyHtml: shellHeavy(words(100)) })],
    [EXACT_DUPLICATE, CTX({ byHash: new Map([["hash-a", ["https://e.example.com/a", "https://e.example.com/b"]]]) })],
    [ORPHAN_LINK, CTX({ inboundCount: 0 })],
  ]) {
    const f = await check.run({ page: { canonical_url: "https://e.example.com/a" }, observations: OBS, siteContext: ctx });
    if (f) findings.push(f);
  }
  assert.ok(findings.length >= 4, "the law would be vacuous with no findings to check");
  for (const f of findings) {
    for (const field of RECOMMENDATION_FIELDS) {
      assert.ok(!(field in f), `${f.issue_class} emitted "${field}" — a supply label was converted into a demand conclusion`);
    }
    const text = JSON.stringify(f).toLowerCase();
    assert.ok(!text.includes("opportunity"), `${f.issue_class} used the word "opportunity"`);
  }
});

/* ================================================================== *
 * ITEM 26 — 🔴 A JS-INJECTED LINK IS INVISIBLE. UNKNOWN, NEVER "MISSING".
 * ================================================================== */

test("🔴 ORPHAN — zero inbound edges yields UNKNOWN, never a FAIL", async () => {
  const f = await ORPHAN_LINK.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS, siteContext: CTX({ inboundCount: 0 }),
  });
  assert.equal(f.verdict, "UNKNOWN", "'we could not see it' and 'it is not there' are different facts");
  assert.equal(f.reason_code, "NEEDS_RENDERED_HTML");
  assert.match(f.summary, /This is not an orphan/);
});

test("🔴 ORPHAN — CLEAN CONTROL: a page with one inbound edge stays SILENT", async () => {
  const f = await ORPHAN_LINK.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS, siteContext: CTX({ inboundCount: 1 }),
  });
  assert.equal(f, null);
});

test("ORPHAN — no edge graph at all is UNKNOWN naming the missing input", async () => {
  const f = await ORPHAN_LINK.run({
    page: { canonical_url: "https://e.example.com/a" }, observations: OBS, siteContext: CTX({ inboundCount: null }),
  });
  assert.equal(f.reason_code, "MISSING_INPUT");
});

/* ================================================================== *
 * ITEM 13 — DETECTION MODE ONLY.
 * ================================================================== */

test("🔴 CANNIBALIZATION — FIRES when one query draws impressions on two URLs", () => {
  const f = detectCannibalization([
    { query: "oet nursing", url: "https://e.example.com/a", position: 4, impressions: 20 },
    { query: "oet nursing", url: "https://e.example.com/b", position: 9, impressions: 5 },
    { query: "solo", url: "https://e.example.com/c", position: 2, impressions: 9 },
  ]);
  assert.equal(f.length, 1);
  assert.equal(f[0].query, "oet nursing");
  assert.equal(f[0].urls.length, 2);
  assert.equal(f[0].positions.length, 2);
});

/* 🔴 D-GATEA-1 AND ITEM 12 (13 September 2026). Gate A could not see an identical PAIR because its
 * shell was learned from the pair itself. Item 12's near-duplicate check is a DIFFERENT metric: it
 * takes the body structurally (src/audit/shell.mjs) and compares it against every crawled page — it
 * never learns a shell from a template group. Both claims are proved here, not asserted. */
/* RR-194 · T-2 (RTP-1 S10, P20, P21; PG-A1): version 2 decides nothing on 350 / 0.9 / 0.75 — the same fixture now records a REVIEW SIGNAL (UNKNOWN, its value carried in `signal`), never a FAIL */
test("🔴 ITEM 12 is NOT blind to a pair: two identical bodies, and no other page at all, FIRE the near-duplicate check", async () => {
  const body = `<html><body><nav>home about</nav><main><p>${Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ")}</p></main></body></html>`;
  const { measure, shingles } = await import("../src/audit/shell.mjs");
  const peers = [{ url: "https://p.example.com/a", shingles: shingles(measure(body).bodyText) }, { url: "https://p.example.com/b", shingles: shingles(measure(body).bodyText) }];
  const f = await NEAR_DUPLICATE.run({ page: { canonical_url: "https://p.example.com/a", page_id: "pa" }, observations: [{ observation_id: "o1" }], siteContext: { openedAt: "t", bodyHtml: body, peers } });
  assert.ok(f, "an identical pair was not flagged by item 12's near-duplicate check");
  assert.deepEqual([f.verdict, f.signal.name], ["UNKNOWN", "body-similarity"]);
});

test("🔴 ITEM 12's near-duplicate metric does not share Gate A's shell — no import of src/gate-a", () => {
  const text = readFileSync(`${REPO}src/audit/content-checks.mjs`, "utf8");
  assert.doesNotMatch(text, /from\s+["'][^"']*gate-a\//, "item 12's checks now read Gate A's shell — its tick must be re-examined");
  assert.match(text, /from "\.\/shell\.mjs"/);
});

test("🔴 CANNIBALIZATION — CLEAN CONTROL: one query on one URL stays SILENT", () => {
  assert.deepEqual(detectCannibalization([{ query: "solo", url: "https://e.example.com/c", position: 2 }]), []);
});

test("🔴 ITEM 13 REPORT — FIRING: each overlap is printed with its QUERY, every competing URL and its POSITION, beside the number searched", async () => {
  const { reportCannibalization, DEMAND_WORDS } = await import("../src/audit/content-checks.mjs");
  const rows = [
    { query: "oet nursing", url: "https://e.example.com/a", position: 4, impressions: 20 },
    { query: "oet nursing", url: "https://e.example.com/b", position: 9.5, impressions: 5 },
    { query: "solo", url: "https://e.example.com/c", position: 2, impressions: 9 },
  ];
  const text = reportCannibalization({ findings: detectCannibalization(rows), queriesSearched: 2, rowsSearched: 3, source: "fixture" }).join("\n");
  assert.match(text, /\[bound: 2 queries searched · 3 query×page rows · fixture\]/);
  assert.match(text, /1 of 2 queries drew impressions on more than one URL/);
  assert.match(text, /query: "oet nursing"/);
  assert.match(text, /position 4\.0 · 20 impression\(s\) · https:\/\/e\.example\.com\/a/);
  assert.match(text, /position 9\.5 · 5 impression\(s\) · https:\/\/e\.example\.com\/b/);
  for (const w of DEMAND_WORDS) assert.ok(!text.toLowerCase().includes(w), `the overlap report said "${w}" — a measurement became a recommendation`);
});

test("🔴 ITEM 13 REPORT — CLEAN CONTROL: no overlap prints no query, and still states what was searched", async () => {
  const { reportCannibalization } = await import("../src/audit/content-checks.mjs");
  const text = reportCannibalization({ findings: [], queriesSearched: 1, rowsSearched: 1, source: "fixture" }).join("\n");
  assert.match(text, /0 of 1 queries drew impressions on more than one URL/);
  assert.doesNotMatch(text, /query: "/);
});

/* ================================================================== *
 * ITEM 14 — 🔴 NO BLIND REGENERATION. A REDISCOVERED URL KEEPS ITS ID.
 * ================================================================== */

test("🔴 ITEM 14: a rediscovered URL resolves to its EXISTING page_id, never a new record", () => {
  const first = buildInventory({
    observations: [{ observation_id: "o1", requested_url: "https://e.example.com/a", final_url: "https://e.example.com/a", observed_at: "2026-09-01T00:00:00.000Z" }],
    edges: [],
  });
  assert.equal(first.pages.length, 1);
  const originalId = first.pages[0].page_id;

  // The SAME url rediscovered later, in a different run, in a different form.
  const second = buildInventory({
    observations: [
      { observation_id: "o1", requested_url: "https://e.example.com/a", final_url: "https://e.example.com/a", observed_at: "2026-09-01T00:00:00.000Z" },
      { observation_id: "o2", requested_url: "HTTPS://E.EXAMPLE.COM/a/", final_url: "HTTPS://E.EXAMPLE.COM/a/", observed_at: "2026-09-12T00:00:00.000Z" },
    ],
    edges: [],
  });
  assert.equal(second.pages.length, 1, "🔴 BLIND REGENERATION: a rediscovered URL created a SECOND page record");
  assert.equal(second.pages[0].page_id, originalId, "the rediscovered page got a different id");
  assert.equal(second.pages[0].observations.length, 2, "both observations must attach to the one page");
  assert.equal(second.pages[0].first_seen, "2026-09-01T00:00:00.000Z", "first_seen must not be overwritten by the rediscovery");
});

test("ITEM 14: the guarantee rests on content-derived ids, and it is stated here explicitly", () => {
  // An undocumented guarantee is one refactor away from not existing.
  assert.equal(targetPageId("https://e.example.com/a"), targetPageId("HTTPS://E.EXAMPLE.COM/a/"));
  assert.notEqual(targetPageId("https://e.example.com/a"), targetPageId("https://e.example.com/a?v=2"));
  assert.equal(canonicalUrl("HTTPS://E.EXAMPLE.COM/a/"), "https://e.example.com/a");
});

/* ================================================================== *
 * AGAINST THE REAL CORPUS — LAW-FIXTURE-1.
 * ================================================================== */

const FINDINGS = `${REPO}runs/audit/content-findings.jsonl`;

test("🔴 REAL: the content findings carry no recommendation field anywhere", { skip: !existsSync(FINDINGS) }, () => {
  /* RR-195: the store now holds LIFECYCLE records too — the T-2 state changes (their `action` names the act that moved a finding, not a
   * recommendation) — so the law reads its FINDINGS: the issue records */
  const records = createJsonlStore(FINDINGS).readAll().filter((r) => r.record_type === "issue");
  assert.ok(records.length > 50, `only ${records.length} findings — this law would be weak`);
  for (const r of records) {
    for (const field of RECOMMENDATION_FIELDS) {
      assert.ok(!(field in r), `a real finding emitted "${field}"`);
    }
  }
});

test("🔴 REAL: every finding is FAIL or UNKNOWN — a check never emits PASS", { skip: !existsSync(FINDINGS) }, () => {
  /* RR-195: findings only — the store's T-2 state changes carry no verdict by design (src/evidence/lifecycle.mjs) */
  for (const r of createJsonlStore(FINDINGS).readAll().filter((x) => x.record_type === "issue")) {
    assert.ok(["FAIL", "UNKNOWN"].includes(r.verdict), `verdict ${r.verdict} escaped`);
    assert.ok(r.evidence?.length > 0, "a finding with no evidence reached the store");
  }
});

test("🔴 REAL: the UNKNOWN branch fired on real data — the first time it ever has", { skip: !existsSync(FINDINGS) }, () => {
  const unknowns = createJsonlStore(FINDINGS).readAll().filter((r) => r.verdict === "UNKNOWN");
  assert.ok(unknowns.length > 0, "no UNKNOWN on real data — item 50's UNKNOWN branch is still fixture-only");
  const reasons = new Set(unknowns.map((u) => u.reason_code));
  assert.ok(reasons.has("NEEDS_RENDERED_HTML"), "the rendered-HTML reason should fire on a RAW_HTML corpus");
});
