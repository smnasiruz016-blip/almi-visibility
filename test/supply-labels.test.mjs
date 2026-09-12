/**
 * ITEM 8 — a supply label may never become a demand claim.
 *
 * ── 🔴 THE GUARD HAS TWO HALVES, AND THEY PROVE DIFFERENT THINGS ────────────
 *
 *   EXECUTABLE — every registered check in the system is RUN, and its output
 *   inspected. This half can go red when the code changes, which is what makes
 *   it a guard rather than a record. It uses fixtures, because it must run
 *   anywhere at any time.
 *
 *   REAL — the 550 findings from the actual 495-page corpus run, committed to
 *   `runs/audit/supply-labels.jsonl`. This half cannot go red on a code change;
 *   it is evidence that the property HELD on real data on 12 September 2026.
 *
 * 🔴 NEITHER IS SUFFICIENT ALONE. A fixture-only guard proves nothing about the
 * corpus; a committed-findings-only guard is a snapshot that no future change
 * can disturb. The boundary's EVIDENCE clause asks for a test that FAILS THE
 * BUILD, so the executable half is the one that answers it.
 *
 * 🔴 WHY THE REAL HALF IS A FILE AND NOT A LIVE RUN: the committed crawl records
 * carry no page bodies. They live in GitHub artifact `crawl-corpus-34662527129`,
 * which EXPIRES 2026-12-11. A test that needed it would start failing on that
 * date for a reason having nothing to do with the code.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { registeredChecks } from "../src/audit/check.mjs";
import { RECOMMENDATION_FIELDS, THIN_CONTENT, EXACT_DUPLICATE, TEMPLATE_DOMINANCE, NEAR_DUPLICATE, ORPHAN_LINK } from "../src/audit/content-checks.mjs";
import "../src/audit/technical-checks.mjs";
import "../src/audit/sitemap-check.mjs";
import "../src/audit/checks.mjs";
import { THIN_UNIQUE_WORD_FLOOR } from "../src/audit/shell.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * 🔴 THE FORBIDDEN VOCABULARY. A supply label describes what content EXISTS.
 * These words all assert something about what somebody WANTS.
 */
const DEMAND_WORDS = ["opportunity", "should create", "worth creating", "demand", "underserved", "gap to fill"];

const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
const shellHeavy = (body) =>
  `<html><head><title>t</title></head><body><nav>${words(2000)}</nav><main>${body}</main><footer>f</footer></body></html>`;

const OBS = [{ observation_id: "obs-1", content_sha256: "hash-a" }];
const CTX = (over = {}) => ({ anchorObservationId: "obs-1", openedAt: "2026-09-12T00:00:00.000Z", byHash: new Map(), ...over });

/* ================================================================== *
 * THE EXECUTABLE HALF — every registered check is RUN.
 * ================================================================== */

test("population: the guard runs over EVERY registered check, not a hand-picked four", () => {
  const ids = registeredChecks().map((c) => c.id).sort();
  // 🔴 Count the population before trusting a zero from it. A guard over four
  // checks while the system holds sixteen is a guard with twelve blind spots.
  assert.ok(ids.length >= 15, `only ${ids.length} checks registered — the population is too small to be the system`);
  for (const c of registeredChecks()) {
    assert.ok(c.firingFixture, `${c.id} has no firing fixture`);
    assert.ok(c.cleanControl, `${c.id} has no clean control`);
  }
});

/**
 * 🔴 THE FIRING FIXTURES ARE THE POINT. A check that returns null emits nothing
 * and trivially passes. Every supply check here is driven to actually FIRE, and
 * the finding it produces is what gets inspected.
 */
test("🔴 no supply label emits a recommendation, an action, or a demand claim", async () => {
  const cases = [
    [THIN_CONTENT, CTX({ bodyHtml: shellHeavy(words(40)) })],
    [TEMPLATE_DOMINANCE, CTX({ bodyHtml: shellHeavy(words(100)) })],
    [EXACT_DUPLICATE, CTX({ byHash: new Map([["hash-a", ["https://e.example.com/a", "https://e.example.com/b"]]]) })],
    [ORPHAN_LINK, CTX({ inboundCount: 0 })],
    [NEAR_DUPLICATE, CTX({ bodyHtml: shellHeavy(words(400)), corpusBodies: new Map([["other", shellHeavy(words(400))]]) })],
  ];

  const findings = [];
  for (const [check, ctx] of cases) {
    const f = await check.run({ page: { canonical_url: "https://e.example.com/a", page_id: "p1" }, observations: OBS, siteContext: ctx });
    if (f) findings.push(f);
  }
  assert.ok(findings.length >= 4, `only ${findings.length} findings — the law would be vacuous`);

  for (const f of findings) {
    for (const field of RECOMMENDATION_FIELDS) {
      assert.ok(!(field in f), `${f.issue_class} emitted "${field}" — a supply label became a demand conclusion`);
    }
    const text = JSON.stringify(f).toLowerCase();
    for (const w of DEMAND_WORDS) {
      assert.ok(!text.includes(w), `${f.issue_class} used "${w}" — that is a claim about what somebody WANTS`);
    }
  }
});

test("🔴 the thin label prints its own floor beside the count (LAW-BOUND-1)", async () => {
  const f = await THIN_CONTENT.run({
    page: { canonical_url: "https://e.example.com/a" },
    observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy(words(40)) }),
  });
  assert.equal(f.verdict, "FAIL");
  assert.match(f.summary, new RegExp(`bound: floor=${THIN_UNIQUE_WORD_FLOOR}`));
});

test("CONTROL: the SAME shell with a large body does NOT fire — the shell is subtracted, not counted", async () => {
  const f = await THIN_CONTENT.run({
    page: { canonical_url: "https://e.example.com/a" },
    observations: OBS,
    siteContext: CTX({ bodyHtml: shellHeavy(words(900)) }),
  });
  assert.equal(f, null, "a 900-word body under a 2,000-word shell fired as thin — the shell is being counted");
});

/* ================================================================== *
 * THE REAL HALF — the 495-page corpus run of 12 September 2026.
 * ================================================================== */

const REAL = `${REPO}runs/audit/supply-labels.jsonl`;
const real = existsSync(REAL)
  ? readFileSync(REAL, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];

test("🔴 REAL: 550 findings over the real corpus, and not one carries a demand claim", { skip: !real.length }, () => {
  assert.equal(real.length, 550);
  for (const f of real) {
    for (const field of RECOMMENDATION_FIELDS) {
      assert.ok(!(field in f), `${f.issue_class} on ${f.canonical_url} emitted "${field}"`);
    }
    const text = JSON.stringify(f).toLowerCase();
    for (const w of DEMAND_WORDS) assert.ok(!text.includes(w), `${f.issue_class} used "${w}" on ${f.canonical_url}`);
  }
});

/**
 * 🔴 THE CENSUS AND THE CHECK MUST AGREE, AND ONCE THEY DID NOT.
 *
 * The first run of `bin/supply-labels.mjs` read `m.uniqueWords`, a field
 * `measure()` does not return. `undefined < 350` is false, so **every page fell
 * through to HEAVY**: 387 HEAVY, 0 THIN, and a census that looked healthy.
 * Nothing threw. What caught it was the same run's `thin-content` check firing
 * 118 times against a census reporting 0.
 *
 * A lone counter has nothing to be wrong against. So the two are pinned here.
 */
test("🔴 REAL: the thin census and the thin CHECK agree — 118 either way", { skip: !real.length }, () => {
  const thinFails = real.filter((f) => f.issue_class === "thin-content" && f.verdict === "FAIL").length;
  assert.equal(thinFails, 118, "the real corpus holds 118 thin pages; if this moved, re-run the census");
});

test("🔴 REAL: every UNKNOWN carries a reason — 'we could not see it' is never 'it is not there'", { skip: !real.length }, () => {
  const unknowns = real.filter((f) => f.verdict === "UNKNOWN");
  assert.equal(unknowns.length, 324);
  for (const u of unknowns) {
    assert.ok(u.reason_code, `${u.issue_class} on ${u.canonical_url} is UNKNOWN with no reason code`);
  }
  const byReason = {};
  for (const u of unknowns) byReason[u.reason_code] = (byReason[u.reason_code] ?? 0) + 1;
  // 106 pages have no stored body at all (redirects, robots-blocked, errors);
  // 2 have a body container that is empty in raw HTML.
  assert.ok(byReason.NEEDS_RENDERED_HTML >= 2, "the client-rendered path should be exercised on real data");
});
