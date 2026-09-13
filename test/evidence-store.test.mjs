import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createJsonlStore, STORE_INTERFACE } from "../src/evidence/store.mjs";
import { makeObservation, makeIssue, makeSource, SOURCE_TIERS, tierRank, ISSUE_VERDICTS } from "../src/evidence/records.mjs";
import { targetPageId, canonicalUrl, observationId, sha256Hex } from "../src/evidence/ids.mjs";
import { TRANSITIONS, allEdges, canTransition, transition, CHECK_OUTCOMES } from "../src/evidence/transitions.mjs";


const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const tmp = () => mkdtempSync(join(tmpdir(), "almivis-evidence-"));

const OBS = () =>
  makeObservation({
    observed_at: "2026-09-11T00:00:00.000Z",
    method: "gsc.searchAnalytics.query",
    target: { kind: "property", ref: "sc-domain:example.com" },
    content_sha256: sha256Hex("payload"),
    value: { rowCount: 3 },
    collector: "test",
    collector_version: "1",
  });

/* ================================================================== *
 * C1 — AN ISSUE WITH NO EVIDENCE CANNOT BE CONSTRUCTED.
 * ================================================================== */

test("🔴 C1: an Issue with an EMPTY evidence array throws at construction", () => {
  assert.throws(
    () =>
      makeIssue({
        issue_class: "thin-content",
        canonical_url: "https://example.com/a",
        verdict: "FAIL",
        severity: "medium",
        evidence: [],
        opened_at: "2026-09-11T00:00:00.000Z",
        detector: "none",
        detector_version: "0",
      }),
    /at least one observation_id/,
  );
});

test("🔴 C1: an Issue with a MISSING evidence field throws — not defaulted to []", () => {
  assert.throws(
    () =>
      makeIssue({
        issue_class: "thin-content",
        canonical_url: "https://example.com/a",
        verdict: "FAIL",
        severity: "medium",
        opened_at: "2026-09-11T00:00:00.000Z",
        detector: "none",
        detector_version: "0",
      }),
    /at least one observation_id/,
  );
});

test("C1: an Issue WITH evidence constructs, and freezes its evidence list", () => {
  const obs = OBS();
  const issue = makeIssue({
    issue_class: "thin-content",
    canonical_url: "https://example.com/a",
    verdict: "FAIL",
    severity: "medium",
    evidence: [obs.observation_id],
    opened_at: "2026-09-11T00:00:00.000Z",
    detector: "none",
    detector_version: "0",
  });
  assert.equal(issue.evidence.length, 1);
  assert.throws(() => issue.evidence.push("sneaked-in"), TypeError);
});

test("🔴 'PASS' is not a verdict an Issue can hold — a PASS is not an issue", () => {
  assert.deepEqual([...ISSUE_VERDICTS], ["FAIL", "UNKNOWN"]);
  assert.throws(
    () =>
      makeIssue({
        issue_class: "x", canonical_url: "https://example.com/a", verdict: "PASS", severity: "low",
        evidence: ["abc"], opened_at: "t", detector: "d", detector_version: "1",
      }),
    /a PASS is not an issue/,
  );
});

/* ================================================================== *
 * C2 — NO UPDATE, NO DELETE.
 * ================================================================== */

test("🔴 C2: the store exposes NO update and NO delete — asserted by enumerating the interface", () => {
  const dir = tmp();
  try {
    const store = createJsonlStore(join(dir, "e.jsonl"));
    assert.deepEqual(Object.keys(store).sort(), [...STORE_INTERFACE].sort());
    for (const forbidden of ["update", "delete", "remove", "set", "patch", "put", "truncate", "clear", "drop"]) {
      assert.equal(store[forbidden], undefined, `the store must not expose ${forbidden}()`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("C2: the store instance is frozen — an update cannot be bolted on at runtime", () => {
  const dir = tmp();
  try {
    const store = createJsonlStore(join(dir, "e.jsonl"));
    assert.throws(() => {
      store.update = () => "gotcha";
    }, TypeError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("C2: a correction is a NEW record carrying supersedes — the original survives", () => {
  const dir = tmp();
  try {
    const store = createJsonlStore(join(dir, "e.jsonl"));
    const obs = OBS();
    store.appendWithoutDedupe(obs);
    const first = makeIssue({
      issue_class: "x", canonical_url: "https://example.com/a", verdict: "FAIL", severity: "low",
      evidence: [obs.observation_id], opened_at: "t1", detector: "d", detector_version: "1",
    });
    store.appendWithoutDedupe(first);
    store.appendWithoutDedupe(
      makeIssue({
        issue_class: "x", canonical_url: "https://example.com/a", verdict: "UNKNOWN", severity: "low",
        evidence: [obs.observation_id], opened_at: "t2", detector: "d", detector_version: "2",
        supersedes: first.issue_id,
      }),
    );
    const all = store.readAll();
    assert.equal(all.length, 3, "the corrected record must still be there");
    assert.ok(all.some((r) => r.issue_id === first.issue_id), "history was rewritten");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("append is append-only across store instances — a reopen does not truncate", () => {
  const dir = tmp();
  const file = join(dir, "e.jsonl");
  try {
    createJsonlStore(file).appendWithoutDedupe(OBS());
    createJsonlStore(file).appendWithoutDedupe({ record_type: "observation", observation_id: "second" });
    assert.equal(createJsonlStore(file).count(), 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * C3 — UNKNOWN NEVER BECOMES PASS (DoD §170).
 * ================================================================== */

test("🔴 C3: NO UNKNOWN -> PASS EDGE EXISTS ANYWHERE IN THE TRANSITION TABLE", () => {
  const offending = allEdges().filter((e) => e.from === "UNKNOWN" && e.to === "PASS");
  assert.deepEqual(offending, [], "an UNKNOWN -> PASS edge exists — DoD §170 is breached");
});

test("🔴 C3: the enumeration covers EVERY outcome pair — the law is not sampled", () => {
  // A test that only checked UNKNOWN->PASS would pass if a second table existed
  // elsewhere. This asserts the table is total over the declared outcome set.
  const declared = new Set(Object.keys(TRANSITIONS));
  assert.deepEqual([...declared].sort(), [...CHECK_OUTCOMES].sort(), "an outcome has no row in TRANSITIONS");
  for (const from of CHECK_OUTCOMES) {
    for (const to of CHECK_OUTCOMES) {
      assert.equal(typeof canTransition(from, to), "boolean", `${from}->${to} is undecided`);
    }
  }
});

test("C3: transition() THROWS on UNKNOWN -> PASS and names the rule", () => {
  assert.throws(() => transition("UNKNOWN", "PASS"), /UNKNOWN never becomes PASS/);
});

test("C3: UNKNOWN may become FAIL, and PASS may become UNKNOWN — the law is not 'freeze everything'", () => {
  assert.equal(transition("UNKNOWN", "FAIL"), "FAIL");
  assert.equal(transition("PASS", "UNKNOWN"), "UNKNOWN");
  assert.equal(transition("FAIL", "PASS"), "PASS", "a re-measured failure may legitimately pass");
});

/* ================================================================== *
 * C4 — IDS ARE CONTENT-DERIVED, NOT SEQUENTIAL.
 * ================================================================== */

test("🔴 C4: the same URL yields the same page id by two independent paths", () => {
  const url = "https://example.com/a/b";
  // Path 1: through the public helper. Path 2: recomputed from the canonical
  // form with the bare hash. If the helper ever grows a counter or a salt,
  // these two disagree here.
  assert.equal(targetPageId(url), sha256Hex(canonicalUrl(url)).slice(0, 16));
});

test("C4: ids are stable across calls and independent of insertion order", () => {
  const a = targetPageId("https://example.com/x");
  const b = targetPageId("https://example.com/y");
  assert.equal(targetPageId("https://example.com/x"), a);
  assert.notEqual(a, b);
});

test("C4: canonicalisation folds case, fragment and trailing slash — but NOT query params", () => {
  const base = targetPageId("https://example.com/a");
  assert.equal(targetPageId("HTTPS://EXAMPLE.COM/a"), base);
  assert.equal(targetPageId("https://example.com/a#frag"), base);
  assert.equal(targetPageId("https://example.com/a/"), base);
  // 🔴 A page with a query parameter is a DIFFERENT page. Merging them would be
  // unrecoverable in an append-only store.
  assert.notEqual(targetPageId("https://example.com/a?v=2"), base);
});

test("C4: query parameter ORDER does not change identity", () => {
  assert.equal(targetPageId("https://example.com/a?x=1&y=2"), targetPageId("https://example.com/a?y=2&x=1"));
});

test("🔴 C4: field boundaries cannot collide — ('ab','c') and ('a','bc') differ", () => {
  const one = observationId({ target: "ab", method: "c", observedAt: "t", contentSha256: "h" });
  const two = observationId({ target: "a", method: "bc", observedAt: "t", contentSha256: "h" });
  assert.notEqual(one, two, "a concatenation without a separator lets two records share an id");
});

test("C4: the same observation built twice has the same id — re-running the ingest is idempotent", () => {
  assert.equal(OBS().observation_id, OBS().observation_id);
});

/* ================================================================== *
 * C5 — RETIRED 12 SEPTEMBER 2026, AND REPLACED.
 *
 * 🔴 The rule was "zero detectors", enforced by counting detector files. It
 * ended because checklist items 10, 12 and 13 ARE detectors — keeping it would
 * have forbidden the product.
 *
 * It is REPLACED, not dropped. What C5 was really protecting was never "no
 * code": it was that a detector must not be built from the answers. That is now
 * the SEALED CORPUS CENSUS in `tools/sealed-corpus-census.mjs`, tested in
 * `test/audit-checks.test.mjs`, and wired into `bin/product-boundary.mjs`.
 *
 * ⚠️ The old census and its tests are DELETED rather than left passing. A file
 * counter pointed at `src/detectors/` would still have read 0 for ever — the
 * detectors live in `src/audit/` — and a check that cannot fail is the pattern
 * this project hunts.
 * ================================================================== */

/* ================================================================== *
 * PROVENANCE (§14) AND THE FROZEN TIER ORDER (§623).
 * ================================================================== */

test("the source tier order is frozen and ranked, most authoritative first", () => {
  assert.deepEqual(
    [...SOURCE_TIERS],
    ["OFFICIAL", "OWNED_GSC_ANALYTICS", "VERIFIED_ALMIWORLD", "REPUTABLE_SECONDARY", "COMPETITOR_COMMUNITY", "AGENT_INFERENCE"],
  );
  assert.ok(tierRank("OFFICIAL") < tierRank("AGENT_INFERENCE"));
  assert.throws(() => tierRank("MADE_UP"), /unknown source tier/);
});

test("🔴 provenance is a TYPE: an observation cannot be built without when, how and of-what", () => {
  const good = {
    observed_at: "2026-09-11T00:00:00.000Z",
    method: "m",
    target: { kind: "url", ref: "https://example.com/a" },
    content_sha256: "abc",
    value: 1,
    collector: "c",
    collector_version: "1",
  };
  for (const field of ["observed_at", "method", "content_sha256", "collector", "collector_version"]) {
    assert.throws(() => makeObservation({ ...good, [field]: undefined }), new RegExp(field));
  }
  assert.throws(() => makeObservation({ ...good, target: { kind: "guess", ref: "x" } }), /target.kind/);
});

test("recheck_after defaults to null, not to a date nobody chose", () => {
  const s = makeSource({
    source_id: "s1", source_url: "https://example.com", source_tier: "OFFICIAL", publisher: "p",
    retrieved_at: "2026-09-11T00:00:00.000Z",
  });
  assert.equal(s.recheck_after, null);
});

test("the store refuses a record with no record_type — an unlabelled row is unreadable later", () => {
  const dir = tmp();
  try {
    assert.throws(() => createJsonlStore(join(dir, "e.jsonl")).appendWithoutDedupe({ a: 1 }), /record_type/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a corrupt line names its line number rather than failing anonymously", () => {
  const dir = tmp();
  const file = join(dir, "e.jsonl");
  try {
    const store = createJsonlStore(file);
    store.appendWithoutDedupe(OBS());
    writeFileSync(file, JSON.stringify(OBS()) + "\n{ not json\n", { flag: "w" });
    assert.throws(() => store.readAll(), /line 2 is not valid JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
