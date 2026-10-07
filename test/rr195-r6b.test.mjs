/**
 * 🔴 RR-195 · R6b part 2 — the 15 named T-2 re-assessment runs, proved on the REAL stores they wrote (read only here).
 *
 * TRAP CONTROL: the same real F90 census WITHOUT the runs' records (each store's pre-run prefix — append-only, so the first N lines, proved
 * by the pre-run blob's sha256) and under the LIVE version-2 registry DISPROVES with exactly 125 findings missing their METHOD — so it is the
 * runs that keep F90 PROVED, not a quirk of the census.
 * REVIEW SIGNALS ON ALL 125: every superseded version-1 FAIL has, in every store holding its copy, ONE version-2 replacement that names it,
 * is UNKNOWN (never FAIL) and carries the value that FAIL itself recorded as a labelled review signal, with its justification.
 * Nothing here writes to a store or the trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readFalsifiabilityCensus } from "../src/audit/f90-falsifiability-reader.mjs";
import { falsifiabilityCensus } from "../src/audit/f90-falsifiability.mjs";
import { registeredChecks } from "../src/audit/check.mjs";
import { lifecycleOf } from "../src/evidence/lifecycle.mjs";
import { REVIEW_SIGNAL_JUSTIFICATIONS } from "../src/audit/content-checks.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const FILES = ["audit-trail/events.jsonl", "runs/audit/content-findings.jsonl", "runs/audit/supply-labels.jsonl"];
const BEFORE = FILES.map((f) => sha(readFileSync(join(REPO, f))));
const STORE = { "runs/audit/content-findings.jsonl": [471, "5f34f3cb9a66217369bdd905e2be6940d49bf10f1fe16593909c65e6d09b88a1"], "runs/audit/supply-labels.jsonl": [550, "2db7f0d104dd83e8d52da352becb73b4fcd98dacf47b4675b108667ae1721481"] };
const lines = (f) => readFileSync(join(REPO, f), "utf8").replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
const records = (ls) => ls.map((l) => JSON.parse(l));
const T2 = new Set(["thin-content", "near-duplicate", "template-dominance"]);
const VALUE = { "thin-content": (s) => Number(s.match(/^(\d+) unique body words/)[1]), "near-duplicate": (s) => Number(s.match(/body similarity ([0-9]*\.[0-9]+) to /)[1]), "template-dominance": (s) => Number(s.match(/shell is (\d+)% of the page's words/)[1]) / 100 };

test("F90 after the 15 runs: PROVED on the real stores, 403 actionable, 0 not falsifiable, no store unreadable", () => {
  const { census } = readFalsifiabilityCensus();
  assert.deepEqual([census.verdict, census.refutations.length, census.notFalsifiable, census.population.unreadable.length], ["PROVED", 403, 0, 0], census.why);
});

test("TRAP CONTROL · the same real census without the runs' records, under the live version-2 checks, DISPROVES with exactly 125 METHOD missing (118 thin · 5 near · 2 template)", () => {
  const { census: live } = readFalsifiabilityCensus();
  const stores = live.population.stores.map((name) => {
    const ls = lines(name);
    if (!STORE[name]) return { name, records: records(ls), unparseable: 0 };
    const [n, want] = STORE[name];
    const prefix = ls.slice(0, n);
    assert.equal(sha(Buffer.from(`${prefix.join("\n")}\n`, "utf8")), want, `${name}: its first ${n} lines are not the pre-run store`);
    return { name, records: records(prefix), unparseable: 0 };
  });
  const c = falsifiabilityCensus({ stores, checks: registeredChecks() });
  const byClass = Object.fromEntries(Object.entries(c.byClass).filter(([, v]) => v.notFalsifiable).map(([k, v]) => [k, v.notFalsifiable]));
  assert.deepEqual([c.verdict, c.notFalsifiable, c.byMissingPart.METHOD], ["DISPROVED", 125, 125]);
  assert.deepEqual(byClass, { "thin-content": 118, "near-duplicate": 5, "template-dominance": 2 });
});

test("REVIEW SIGNALS ON ALL 125 · every superseded version-1 FAIL has, in every store holding its copy, one version-2 UNKNOWN replacement naming it and carrying ITS recorded value as a labelled review signal", () => {
  let checked = 0;
  const seen = new Set();
  for (const name of Object.keys(STORE)) {
    const recs = records(lines(name));
    const { issues } = lifecycleOf(recs);
    const old = [...issues.values()].filter((e) => T2.has(e.issue.detector) && e.issue.detector_version === "1" && e.issue.verdict === "FAIL");
    assert.equal(old.filter((e) => e.state === "OPEN").length, 0, `${name}: a version-1 FAIL is still OPEN`);
    for (const e of old) {
      const repl = recs.filter((r) => r.record_type === "issue" && r.supersedes === e.issue.issue_id);
      assert.equal(repl.length, 1, `${name}: ${e.issue.issue_id} has ${repl.length} replacement(s)`);
      const r = repl[0];
      assert.deepEqual([e.state, r.verdict, r.detector, r.detector_version, r.signal.decides], ["SUPERSEDED", "UNKNOWN", e.issue.detector, "2", "nothing"]);
      assert.equal(r.signal.value, VALUE[e.issue.detector](e.issue.summary), `${e.issue.issue_id}: the replacement does not carry the value the finding recorded`);
      assert.equal(r.signal.justification, REVIEW_SIGNAL_JUSTIFICATIONS[e.issue.detector]);
      assert.match(r.summary, /^REVIEW SIGNAL/);
      checked += 1;
      seen.add(e.issue.issue_id);
    }
  }
  assert.deepEqual([seen.size, checked], [125, 245], "not every one of the 125 (in its 245 store copies) was checked");
});

test("the production trail and both stores are byte-identical after this file", () => {
  assert.deepEqual(FILES.map((f) => sha(readFileSync(join(REPO, f)))), BEFORE);
});
