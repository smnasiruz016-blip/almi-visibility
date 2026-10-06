/**
 * F32 · DUPLICATE, THIN AND TEMPLATE DETECTION (acceptance _handoffs a0b9776, RR-87).
 *
 * Every expected value below is written by hand from the fixture, never computed with the logic under test:
 *   · overlap: 8-word shingles; an 11-word text has 4, a 10-word text 3; the Jaccard values 2/5 and 3/7 are counted by hand;
 *   · shell share: a 10-word shared nav beside a 10-word unique body is 13 shingles, of which the 3 inside the nav are shared.
 * Nothing here writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { detectDuplication, OVERLAP_REVIEW_TRIGGER, SEMANTIC_ASPECTS, MISSING } from "../src/page/duplication.mjs";
import { verifiedPages, readClientDuplication } from "../src/page/duplication-evidence.mjs";
import { RECOMMENDATION_FIELDS } from "../src/audit/content-checks.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- fixtures ---- */
const seq = (p, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${p}${from + i}`).join(" ");
const doc = (main, nav = "") => `<html><head><title>t</title></head><body>${nav ? `<nav>${nav}</nav>` : ""}<main>${main}</main></body></html>`;
const pg = (pageId, html, verified = true) => ({ pageId, html, verified });
const run = (pages, { reviews = [], valueRecords = [] } = {}) => detectDuplication({ pages, reviews, valueRecords });
const page = (r, id) => r.pages.find((p) => p.pageId === id);
const pair = (r, a, b) => r.pairs.find((p) => p.pair.includes(a) && p.pair.includes(b));
const ALL = [...SEMANTIC_ASPECTS];

/* A = w1..w11 (4 shingles) · B = w1..w9 z1 (3 shingles, 2 shared with A: J = 2/5 = 0.40) · C = w1..w10 z1..z3 (6 shingles, 3 shared with A: J = 3/7) */
const A = doc(seq("w", 1, 11)), B = doc(`${seq("w", 1, 9)} z1`), C = doc(`${seq("w", 1, 10)} ${seq("z", 1, 3)}`);

/* ================= C1 — exact duplication ================= */

test("C1 · identical main text is grouped, whatever the chrome and case; a different main text is not; an unreadable body is NOT MEASURED", () => {
  const r = run([pg("d", doc("Same body, text here now", "x1 x2")), pg("e", doc("same BODY text here now", "y1 y2 y3")), pg("f", doc("another body text entirely")), pg("g", "<html><body><div>no layout</div></body></html>")]);
  assert.deepEqual(r.exactGroups, [["d", "e"]]);
  assert.equal(page(r, "d").exact.state, "EXACT_DUPLICATE");
  assert.equal(page(r, "f").exact.state, "NOT_EXACT_DUPLICATE");
  assert.deepEqual(page(r, "g").exact, { state: "NOT_MEASURED", why: "UNRECOGNISED_LAYOUT" });
  /* firing control: one changed word ungroups */
  assert.deepEqual(run([pg("d", doc("same body text here now")), pg("e", doc("same body text here too"))]).exactGroups, []);
});

/* ================= C2 — textual overlap is a trigger, never a verdict ================= */

test("C2 · FIRING CONTROL: above 40 percent is REVIEW REQUIRED and nothing more; at or below it is BELOW TRIGGER — and neither is a semantic verdict", () => {
  const r = run([pg("A", A), pg("B", B), pg("C", C)]);
  assert.equal(OVERLAP_REVIEW_TRIGGER, 0.4);
  assert.equal(pair(r, "A", "B").overlap, 2 / 5);
  assert.equal(pair(r, "A", "B").textual, "BELOW_TRIGGER", "exactly 40 percent is not ABOVE 40 percent");
  assert.equal(pair(r, "A", "C").overlap, 3 / 7);
  assert.equal(pair(r, "A", "C").textual, "REVIEW_REQUIRED");
  for (const p of r.pairs) assert.equal(p.semantic.state, "NOT_JUDGED", "a percentage became a semantic verdict");
  for (const id of ["A", "B", "C"]) {
    assert.equal(page(r, id).semantic.state, "NOT_JUDGED");
    assert.equal(page(r, id).exact.state, "NOT_EXACT_DUPLICATE", "overlap became exact duplication");
    assert.equal(page(r, id).uniqueValue.state, "NOT_JUDGED", "overlap became a unique-value verdict");
  }
  assert.equal(page(r, "A").reviewRequiredPairs, 1);
  assert.equal(page(r, "B").reviewRequiredPairs, 0);
  assert.match(r.methods.overlap, /Jaccard similarity of 8-word shingles/);
});

/* ================= C3 — semantic duplication only on a recorded review ================= */

test("C3 · a recorded review decides; low overlap cannot rescue duplication; high overlap passes only with documented distinct value; a partial review does not count", () => {
  /* RR-192: a counted review is recorded with needsGuidance: false (C3 as amended); the guidance limb itself is T32-C3-AMENDED's */
  const dup = { pair: ["A", "B"], compared: ALL, duplicate: true, needsGuidance: false, ref: "review:ab" };
  const distinctNoValue = { pair: ["A", "C"], compared: ALL, duplicate: false, needsGuidance: false, ref: "review:ac" };
  const r1 = run([pg("A", A), pg("B", B), pg("C", C)], { reviews: [dup, distinctNoValue] });
  assert.deepEqual(pair(r1, "A", "B").semantic, { state: "DUPLICATE", ref: "review:ab" }, "low textual overlap rescued a semantic duplicate");
  assert.equal(pair(r1, "A", "C").semantic.state, "NOT_JUDGED");
  assert.match(pair(r1, "A", "C").semantic.missing, /documented distinct value/);
  assert.equal(page(r1, "A").semantic.state, "DUPLICATE");
  assert.equal(pair(r1, "B", "C").semantic.missing, MISSING.REVIEW);

  const r2 = run([pg("A", A), pg("C", C)], { reviews: [{ ...distinctNoValue, documentedDistinctValue: "worked examples differ" }] });
  assert.deepEqual(pair(r2, "A", "C").semantic, { state: "DISTINCT", ref: "review:ac" });
  assert.equal(page(r2, "A").semantic.state, "DISTINCT");

  const r3 = run([pg("A", A), pg("C", C)], { reviews: [{ ...dup, pair: ["C", "A"], compared: ALL.filter((a) => a !== "examples") }] });
  assert.equal(pair(r3, "A", "C").semantic.state, "NOT_JUDGED");
  assert.match(pair(r3, "A", "C").semantic.missing, /does not compare examples/);
});

/* ================= C4 — shared-shell dominance measured ================= */

test("C4 · each page's shared-shell share is measured by recurrence and reported with its method; nav-only is SHELL ONLY; no threshold decides", () => {
  const NAV = seq("n", 1, 10);
  const r = run([pg("p", doc(seq("a", 1, 10), NAV)), pg("q", doc(seq("b", 1, 10), NAV)), pg("s", doc("", NAV))]);
  assert.deepEqual(page(r, "p").shell, { state: "HAS_UNIQUE_TEXT", share: 3 / 13, method: r.methods.shell });
  assert.equal(page(r, "q").shell.share, 3 / 13);
  assert.deepEqual(page(r, "s").shell, { state: "SHELL_ONLY", share: 1, method: r.methods.shell });
  assert.deepEqual(page(r, "s").exact, { state: "NOT_MEASURED", why: "EMPTY_BODY" });
  /* a 99-percent-shell page with ONE unique shingle is still HAS_UNIQUE_TEXT: no dominance threshold is applied */
  const big = seq("n", 1, 400);
  const r2 = run([pg("u", doc("", `${big} unique1`)), pg("v", doc("", big))]);
  assert.equal(page(r2, "u").shell.state, "HAS_UNIQUE_TEXT");
  assert.ok(page(r2, "u").shell.share > 0.97);
  /* firing control: removing the sibling removes the recurrence */
  assert.equal(run([pg("s", doc("", NAV))]).pages[0].shell.state, "HAS_UNIQUE_TEXT");
});

/* ================= C5 — unique value is never a word count ================= */

test("C5 · FIRING CONTROL: a three-word page with unique text is NOT insufficient; only an exact duplicate, SHELL ONLY or a recorded record decides", () => {
  const r = run([pg("tiny", doc("three unique words")), pg("long", doc(seq("l", 1, 400))), pg("d1", doc("copy of text")), pg("d2", doc("Copy of text"))]);
  assert.deepEqual(page(r, "tiny").uniqueValue, { state: "NOT_JUDGED", missing: MISSING.VALUE }, "a short page became insufficient");
  assert.deepEqual(page(r, "long").uniqueValue, { state: "NOT_JUDGED", missing: MISSING.VALUE }, "a long page became sufficient");
  assert.deepEqual(page(r, "d1").uniqueValue, { state: "INSUFFICIENT", basis: "EXACT_DUPLICATE" });
  const nav = run([pg("s", doc("", seq("n", 1, 10))), pg("t", doc("x", seq("n", 1, 10)))]);
  assert.deepEqual(page(nav, "s").uniqueValue, { state: "INSUFFICIENT", basis: "SHELL_ONLY" });
  const rec = run([pg("tiny", doc("three unique words")), pg("long", doc(seq("l", 1, 400)))], { valueRecords: [{ pageId: "tiny", insufficient: false, ref: "gain:1" }, { pageId: "long", insufficient: true, ref: "gain:2" }] });
  assert.deepEqual(page(rec, "tiny").uniqueValue, { state: "SUFFICIENT", basis: "gain:1" });
  assert.deepEqual(page(rec, "long").uniqueValue, { state: "INSUFFICIENT", basis: "gain:2" });
  assert.throws(() => detectDuplication({ pages: [] }), /passed explicitly/);
});

/* ================= C6 — detection only; Row 25 and the legacy audit untouched ================= */

/* RR-192 · C6 AS AMENDED (F32 Acceptance Amendment 1): the test pins NO threshold value any more — the Row 25 and audit thresholds are not
 * F32's (they change under RTP-1, T-1 and T-2) — and asserts instead that F32 imports and reads none of the six constants and changes no gate. */
test("C6 AS AMENDED · no action field anywhere in the result; F32 imports and reads none of the six threshold constants and imports no gate; no threshold value is pinned", () => {
  const r = run([pg("A", A), pg("C", C)], { reviews: [{ pair: ["A", "C"], compared: ALL, duplicate: true, needsGuidance: false, ref: "r" }] });
  const keys = new Set();
  (function walk(o) { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { keys.add(k); walk(v); } })(r);
  for (const f of RECOMMENDATION_FIELDS) assert.equal(keys.has(f), false, `the result carries ${f}`);
  /* the CODE, comments removed — the module's comments quote V3 ("the 350-word threshold does not control") */
  const code = readFileSync(join(REPO, "src/page/duplication.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const name of ["MIN_UNIQUE_WORDS", "MIN_FACTS", "MAX_SIBLING_OVERLAP", "THIN_UNIQUE_WORD_FLOOR", "NEAR_DUPLICATE_THRESHOLD", "TEMPLATE_DOMINANCE_THRESHOLD"]) assert.doesNotMatch(code, new RegExp(`\\b${name}\\b`), `F32 imports or reads ${name}`);
  assert.doesNotMatch(code, /content-checks|\b350\b/, "F32 reads a legacy threshold");
  /* F32 changes no gate: it imports nothing but hashing and the shell measure — no gate, construction or decision module */
  assert.deepEqual([...code.matchAll(/from "([^"]+)"/g)].map((m) => m[1]).sort(), ["../audit/shell.mjs", "node:crypto"], "F32 imports a module that can change a gate");
  assert.match(code, /from "\.\.\/audit\/shell\.mjs"/, "control: the stripped code still holds the module's imports");
});

/* ================= C3 AS AMENDED — a review counts only when it needs no guidance (RR-192) ================= */

test("C3 AS AMENDED · a review recorded with needsGuidance: false decides as before; the same review with needsGuidance: true, and with the field absent, leaves the pair NOT JUDGED naming the missing guidance-free review", () => {
  const dup = { pair: ["A", "C"], compared: ALL, duplicate: true, ref: "review:ac" };
  const dist = { pair: ["A", "C"], compared: ALL, duplicate: false, documentedDistinctValue: "a different need", ref: "review:ac" };
  /* needsGuidance: false — decides exactly as before */
  assert.equal(pair(run([pg("A", A), pg("C", C)], { reviews: [{ ...dup, needsGuidance: false }] }), "A", "C").semantic.state, "DUPLICATE");
  assert.equal(pair(run([pg("A", A), pg("C", C)], { reviews: [{ ...dist, needsGuidance: false }] }), "A", "C").semantic.state, "DISTINCT");
  /* needsGuidance: true, and absent — HELD: NOT JUDGED, the missing guidance-free review named, never DUPLICATE and never DISTINCT */
  for (const [label, over] of [["guidance-dependent", { needsGuidance: true }], ["unmarked", {}]]) {
    for (const base of [dup, dist]) {
      const s = pair(run([pg("A", A), pg("C", C)], { reviews: [{ ...base, ...over }] }), "A", "C").semantic;
      assert.equal(s.state, "NOT_JUDGED", `a ${label} ${base.duplicate ? "DUPLICATE" : "DISTINCT"} review decided`);
      assert.equal(s.heldForGuidance, true);
      assert.ok(s.missing.includes(MISSING.GUIDANCE_FREE), `the ${label} review's missing fact is not named: ${s.missing}`);
    }
  }
});

/* ================= C7 — same client, verified bodies only, bound printed, no call-out ================= */

test("C7 · an unverified or absent body is NOT MEASURED, never measured as if it had one; verification is the body's OWN fingerprint", () => {
  const r = run([pg("A", A), pg("x", A, false), pg("y", "", true)]);
  assert.deepEqual(r.notMeasured, [{ pageId: "x", reason: "BODY_NOT_VERIFIED" }, { pageId: "y", reason: "NO_STORED_BODY" }]);
  assert.deepEqual(r.exactGroups, [], "an unverified copy was grouped");
  assert.equal(r.summary.population, 3);
  assert.equal(r.summary.measured, 1);
  const population = {
    pages: [{ pageId: "a", html: "h", bodyObservationId: "o2" }, { pageId: "b", html: "h", bodyObservationId: "o3" }, { pageId: "c", html: "h", bodyObservationId: "o4" }, { pageId: "d", html: "", bodyObservationId: null }],
    inventory: { pages: [
      { pageId: "a", fingerprints: [{ observationId: "o1", verified: false }, { observationId: "o2", verified: true }] },
      { pageId: "b", fingerprints: [{ observationId: "o1", verified: true }, { observationId: "o3", verified: false }] },
      { pageId: "c", fingerprints: [{ observationId: "o4", verified: null }] },
      { pageId: "d", fingerprints: [] },
    ] },
  };
  assert.deepEqual(verifiedPages(population).map((p) => p.verified), [true, false, false, false]);
});

test("REAL · the client's recorded pages, as they are — every page accounted for, no semantic verdict without a review, bound printed", () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const r = readClientDuplication({ tenantId, resolve });
  assert.equal(r.fault, null, r.bound);
  const s = r.summary;
  assert.ok(s.population > 0, "EMPTY real population");
  assert.ok(s.measured > 0, "no real page was measured — every recorded body read as unverified");
  assert.equal(s.measured + r.notMeasured.length, s.population);
  assert.equal(s.pairs, (s.measured * (s.measured - 1)) / 2);
  assert.deepEqual(Object.keys(s.semantic), ["NOT_JUDGED"], "a semantic verdict without a recorded review");
  for (const p of r.pages) {
    if (p.uniqueValue.state === "INSUFFICIENT") assert.ok(["EXACT_DUPLICATE", "SHELL_ONLY"].includes(p.uniqueValue.basis));
    assert.notEqual(p.uniqueValue.state, "SUFFICIENT");
  }
  assert.match(r.bound, /semantic reviews recorded 0/);
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(s)}`);
});

test("C7 · THE ENTRY POINT: in a declared world it prints counts only, with its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-duplication.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ page\(s\)/);
    assert.match(ok.stdout, /textual overlap/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · the detection and its evidence reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/duplication.mjs", "src/page/duplication-evidence.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
