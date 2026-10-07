/**
 * RR-102 · THE FOUR CONTENT CHECKS' DECLARED BOUNDARIES, CROSSED IN BOTH DIRECTIONS AGAINST THEIR OWN CODE.
 *
 * F90's census (RR-100 §5) found four more registered checks raising actionable FAIL findings with no declared boundary: exact-duplicate,
 * thin-content, near-duplicate and template-dominance. Each now declares one; this file proves it exactly as #204 proved the other eight
 * (test/rr100-check-boundaries.test.mjs). For every declared firing condition, a minimal pair: JUST INSIDE must make the check's real run()
 * return a FAIL finding; JUST OUTSIDE (the same input with one fact moved across the line) must make it return no finding at all. The
 * numeric pairs sit ON the line: 349 vs 350 unique words, Jaccard 0.90 vs 0.89, shell share 0.75 vs 0.74.
 * DRIFT GUARD: the declared condition ids and this table's ids must be the SAME set, and each declared threshold must be the live constant.
 * Pure fixtures; nothing fetched or written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { NEAR_DUPLICATE_THRESHOLD, TEMPLATE_DOMINANCE_THRESHOLD } from "../src/audit/content-checks.mjs";
import { THIN_UNIQUE_WORD_FLOOR, measure, shingles } from "../src/audit/shell.mjs";
import { registeredChecks } from "../src/audit/check.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const CHECKS = new Map(registeredChecks().map((c) => [c.id, c]));
export const F90_CONTENT_DETECTORS = Object.freeze(["exact-duplicate", "thin-content", "near-duplicate", "template-dominance"]);

const P = "https://a.example/p";
const Q = "https://a.example/q";
const obs = (value = {}, extra = {}) => [{ observation_id: "o1", value, ...extra }];
const ctx = (over = {}) => ({ openedAt: "2026-09-30T00:00:00Z", ...over });
const run = async (id, { page = { canonical_url: P }, observations = obs(), siteContext = ctx() } = {}) => CHECKS.get(id).run({ page, observations, siteContext });

/* n distinct words; each is one word under shell.mjs's own word rule */
const ws = (n, prefix = "w") => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");
/* a page with recognisable chrome (<nav>) OUTSIDE an explicit <main>: shell = the nav's words, body = main's words */
const page = (bodyWords, shellWords = 10) => `<html><head><title>T</title></head><body><nav>${ws(shellWords, "s")}</nav><main><p>${ws(bodyWords)}</p></main></body></html>`;

/* exact-duplicate: byHash is the site's content_sha256 → [canonical URLs] map the runner builds */
const dup = (byHash) => ({ observations: obs({}, { content_sha256: "h1" }), siteContext: ctx({ byHash: new Map(byHash) }) });

/* thin-content: unique body words ON the floor */
const thin = (n) => ({ siteContext: ctx({ bodyHtml: page(n) }) });

/* near-duplicate: 107 body words give exactly 100 shingles; a peer holding k of them scores k/100 */
const NEAR_BODY = page(107);
const MINE = [...shingles(measure(NEAR_BODY).bodyText)];
const near = (k, url = Q) => ({ siteContext: ctx({ bodyHtml: NEAR_BODY, peers: [{ url, shingles: new Set(MINE.slice(0, k)) }] }) });

/* template-dominance: shell words / all words, ON the threshold */
const tmpl = (shell, body) => ({ siteContext: ctx({ bodyHtml: page(body, shell) }) });

/* each condition: one or more [justInside, justOutside] pairs */
const PAIRS = {
  "exact-duplicate": {
    "byte-identical-to-another-url": [
      [dup([["h1", [P, Q]]]), dup([["h1", [P]], ["h2", [Q]]])],
      /* the page's own URL filed twice under its hash is NOT another URL */
      [dup([["h1", [P, Q]]]), dup([["h1", [P, P]]])],
    ],
  },
  /* RR-194 · T-2: version 2's condition ids — the same lines, now each records a REVIEW SIGNAL (UNKNOWN), never a FAIL */
  "thin-content": {
    "below-unique-word-review-signal": [[thin(THIN_UNIQUE_WORD_FLOOR - 1), thin(THIN_UNIQUE_WORD_FLOOR)]],
  },
  "near-duplicate": {
    "body-similarity-at-or-above-review-signal": [
      [near(90), near(89)],
      /* an identical peer at this page's OWN url is skipped */
      [near(100, Q), near(100, P)],
    ],
  },
  "template-dominance": {
    "shell-share-at-or-above-review-signal": [[tmpl(75, 25), tmpl(74, 26)]],
  },
};

test("the fixtures sit exactly on each numeric line (a pair that is not on the line proves nothing)", () => {
  assert.equal(measure(page(THIN_UNIQUE_WORD_FLOOR - 1)).bodyUniqueWordCount, THIN_UNIQUE_WORD_FLOOR - 1);
  assert.equal(measure(page(THIN_UNIQUE_WORD_FLOOR)).bodyUniqueWordCount, THIN_UNIQUE_WORD_FLOOR);
  assert.equal(MINE.length, 100);
  assert.equal(90 / 100, NEAR_DUPLICATE_THRESHOLD);
  assert.equal(measure(page(25, 75)).shellShare, TEMPLATE_DOMINANCE_THRESHOLD);
  assert.ok(measure(page(26, 74)).shellShare < TEMPLATE_DOMINANCE_THRESHOLD);
  for (const h of [page(1), NEAR_BODY, page(25, 75)]) assert.equal(measure(h).confident, true);
});

test("every content detector behind F90's actionable findings declares a structured boundary", () => {
  for (const id of F90_CONTENT_DETECTORS) assert.ok(CHECKS.get(id)?.boundary, `${id} declares no boundary`);
});

test("DRIFT GUARD: each content check's declared conditions and the proved pairs are exactly the same set", () => {
  for (const id of F90_CONTENT_DETECTORS) {
    assert.deepEqual([...CHECKS.get(id).boundary.fires.map((f) => f.id)].sort(), Object.keys(PAIRS[id]).sort(), `${id}: a declared condition has no crossing proof, or a proved condition is not declared`);
  }
});

/* RR-194 · T-2: the declared condition is now a REVIEW SIGNAL's — the live constant still sits in it, on both sides of the line */
test("DRIFT GUARD: each declared review signal is the LIVE constant the code compares against, and says it is never a FAIL", () => {
  const when = (id) => CHECKS.get(id).boundary.fires[0].when;
  assert.match(when("thin-content"), new RegExp(`below the ${THIN_UNIQUE_WORD_FLOOR}-word review signal .*never a FAIL \\(void at ${THIN_UNIQUE_WORD_FLOOR} or more\\)`));
  assert.match(when("near-duplicate"), new RegExp(`at or above the ${NEAR_DUPLICATE_THRESHOLD} review signal .*never a FAIL \\(void below ${NEAR_DUPLICATE_THRESHOLD}\\)`));
  assert.match(when("template-dominance"), new RegExp(`at or above the ${TEMPLATE_DOMINANCE_THRESHOLD} review signal of the page's words .*never a FAIL \\(void below ${TEMPLATE_DOMINANCE_THRESHOLD}\\)`));
});

/* RR-194 · T-2: exact-duplicate still FAILs; the three version-2 checks "fire" by recording a REVIEW SIGNAL — UNKNOWN, its value carried */
const T2 = new Set(["thin-content", "near-duplicate", "template-dominance"]);
for (const id of F90_CONTENT_DETECTORS) {
  test(`BOTH DIRECTIONS · ${id}: just inside each declared condition it fires; just outside it does not`, async () => {
    for (const [cond, pairs] of Object.entries(PAIRS[id])) {
      for (const [inside, outside] of pairs) {
        const hit = await run(id, inside);
        assert.equal(hit?.verdict, T2.has(id) ? "UNKNOWN" : "FAIL", `${id} · ${cond}: just inside the boundary it did not fire`);
        if (T2.has(id)) assert.ok(hit.signal && hit.signal.decides === "nothing", `${id} · ${cond}: fired without its review signal`);
        /* F90: the finding names this check, stamped with the check's DECLARED live version — the stamp and the declaration cannot drift */
        assert.equal(hit.detector, id, `${id} · ${cond}: the finding names another detector`);
        assert.equal(hit.detector_version, CHECKS.get(id).version, `${id} · ${cond}: run() stamps a version other than the declared one`);
        assert.equal(await run(id, outside), null, `${id} · ${cond}: just outside the boundary it still fired`);
      }
    }
  });
}

test("CLEAN CONTROL: one page clean on all four at once raises nothing", async () => {
  const clean = { observations: obs({}, { content_sha256: "h1" }), siteContext: ctx({ bodyHtml: page(400, 10), byHash: new Map([["h1", [P]], ["h2", [Q]]]), peers: [{ url: Q, shingles: new Set(["x y z"]) }] }) };
  for (const id of F90_CONTENT_DETECTORS) assert.equal(await run(id, clean), null, `${id} fired on the clean control`);
});

test("an UNMEASURED input is never a finding across the boundary: a missing hash, a missing body and an unconfident split are UNKNOWN", async () => {
  assert.equal((await run("exact-duplicate", { siteContext: ctx({ byHash: new Map([["h1", [P, Q]]]) }) }))?.verdict, "UNKNOWN");
  const unrecognised = `<html><body><p>${ws(5)}</p></body></html>`; // no main/article and no chrome
  const empty = `<html><body><nav>${ws(80, "s")}</nav><main></main></body></html>`;
  for (const id of ["thin-content", "near-duplicate", "template-dominance"]) {
    for (const bodyHtml of [null, unrecognised, empty]) {
      const u = await run(id, { siteContext: ctx({ bodyHtml, peers: [{ url: Q, shingles: new Set(MINE) }] }) });
      assert.equal(u?.verdict, "UNKNOWN", `${id} on ${bodyHtml === null ? "no body" : "an unconfident split"}`);
      /* RR-194 · T-2: a could-not-answer UNKNOWN is never mistaken for a review signal — it carries a reason code and no signal */
      assert.ok(u.reason_code && u.signal === undefined, `${id}: an unmeasured input was recorded as a review signal`);
    }
  }
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
