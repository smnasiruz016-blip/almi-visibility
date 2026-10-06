/**
 * 🔴 RR-192 · R6a — T-1 (RTP-1 §17 S8 and S9; the owner's PG-A1, _handoffs b5b616e): Gate A's and ROW25's three numbers — 350 unique words,
 * five facts, 0.40 overlap — are RETIRED AS DECIDERS and survive only as labelled REVIEW SIGNALS; and F32 / F39 move through the board under
 * their Acceptance Amendments 1 (F32 C3 and C6 as amended, F39 C3 as amended; their own tests are in f32-duplication and f39-information-gain).
 *
 * T-1's behaviour is proved where it lives (gate-a, gate-a-pairs, existing-pages, page-quality-row25, v3-adoption-code-match — each restated
 * test carries an RR-192 note). This file holds what no behaviour test can see: a COPY of a number re-declared, or a decider re-imported,
 * anywhere in src. T-2's numbers (the audit checks' 350 / 0.9 / 0.75) are R6b's and are not judged here. Nothing here writes to the trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const code = (rel) => readFileSync(join(REPO, rel), "utf8").replace(/\r\n/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const walk = (dir) => readdirSync(join(REPO, dir)).flatMap((n) => { const rel = `${dir}/${n}`; return statSync(join(REPO, rel)).isDirectory() ? walk(rel) : rel.endsWith(".mjs") ? [rel] : []; });
const SRC = walk("src");
const THREE = /\b(MIN_UNIQUE_WORDS|MIN_FACTS|MAX_SIBLING_OVERLAP)\b/;

test("T1-SIGNALS · every line of src code that reads 350 / five facts / 0.40 by name reads it as a SIGNAL — never as a pass, a stop or a verdict", () => {
  const offenders = [];
  let reads = 0;
  for (const rel of SRC) {
    for (const line of code(rel).split("\n")) {
      if (!THREE.test(line) || /^\s*export const (MIN_UNIQUE_WORDS|MIN_FACTS|MAX_SIBLING_OVERLAP) = /.test(line) || /^\s*import /.test(line)) continue;
      reads += 1;
      if (!/Signal|signals:/.test(line)) offenders.push(`${rel}: ${line.trim().slice(0, 140)}`);
    }
  }
  assert.ok(reads >= 4, `the census saw only ${reads} reads — it would pass on nothing`);
  assert.deepEqual(offenders, [], "a retired number is read as a decider");
});

test("T1-SIGNALS · FIRING CONTROL: the census refuses the retired decider it replaced", () => {
  const line = "    const uniquePass = unique >= MIN_UNIQUE_WORDS;";
  assert.ok(THREE.test(line) && !/Signal|signals:/.test(line), "the census would not see the old stop");
});

test("T1-NO-COPY · no module outside Gate A's own definitions declares its own copy of 0.4 / 0.40 or 350 or five facts as a constant — axis-discovery, why-this-url and construction read the one home", () => {
  const COPY = /^\s*(export\s+)?const\s+[A-Z0-9_]+\s*=\s*(0\.40?|350|5)\s*;/;
  const HOMES = new Set(["src/gate-a/run.mjs", "src/gate-a/facts.mjs", "src/gate-a/adaptive.mjs", "src/page/duplication.mjs"]); // adaptive's and F32's own 0.40 review triggers (P20; F32 C2)
  const T2 = new Set(["src/audit/shell.mjs", "src/audit/content-checks.mjs"]); // T-2 (R6b)
  const copies = [];
  for (const rel of SRC) {
    if (HOMES.has(rel) || T2.has(rel)) continue;
    for (const line of code(rel).split("\n")) if (COPY.test(line) && /(OVERLAP|UNIQUE|WORD|FACT|SIBLING|DUPLICATE|THRESHOLD)/.test(line)) copies.push(`${rel}: ${line.trim()}`);
  }
  assert.deepEqual(copies, [], "a module re-declares a retired number");
  /* the three modules T-1 moved off Gate A's deciders */
  assert.doesNotMatch(code("src/discovery/axis-discovery.mjs"), /=\s*0\.4\b|=\s*0\.9\b/, "axis-discovery keeps a local copy");
  assert.match(code("src/discovery/axis-discovery.mjs"), /import \{ OVERLAP_REVIEW_TRIGGER \} from "\.\.\/gate-a\/adaptive\.mjs";/);
  assert.match(code("src/gate-a/why-this-url.mjs"), /export const WHY_NEAR_IDENTICAL = OVERLAP_REVIEW_TRIGGER;/);
  for (const rel of ["src/gate-a/why-this-url.mjs", "src/page/construct.mjs", "src/discovery/axis-discovery.mjs"]) assert.doesNotMatch(code(rel), THREE, `${rel} still reads a retired decider`);
});

test("T1-NO-COPY · FIRING CONTROL: a re-declared copy is seen", () => {
  const COPY = /^\s*(export\s+)?const\s+[A-Z0-9_]+\s*=\s*(0\.40?|350|5)\s*;/;
  const line = "export const GATE_A_MAX_SIBLING_OVERLAP = 0.4;";
  assert.ok(COPY.test(line) && /(OVERLAP|UNIQUE|WORD|FACT|SIBLING|DUPLICATE|THRESHOLD)/.test(line));
});

test("R192-BOARD · F32 and F39 move only through the production validator and the audit trail: each reopened by its own amendment on 6 Oct, VERIFIED-PASS only with a REAL VERIFIED event after it, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const [f, n] of [["F32", 7], ["F39", 7]]) {
    const row = DECLARED[f];
    const i = row.events.findIndex((e) => e.kind === "ACCEPTANCE_AMENDED" && e.on === "2026-10-06" && /_ACCEPTANCE_AMENDMENT_1_2026-10-06/.test(e.ruling?.path ?? ""));
    assert.ok(i >= 0 && row.events[i + 1]?.kind === "REOPENED", `${f}'s amendment and REOPENED are not on the board`);
    assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "REOPENED" && e.metadata?.featureId === f && e.occurredAt.startsWith("2026-10-06")), `${f}'s REOPENED is not in the trail`);
    if (row.state === "VERIFIED-PASS") {
      const v = row.events.filter((e) => e.kind === "VERIFIED").at(-1);
      assert.ok(row.events.indexOf(v) > i + 1 && v.population === "REAL");
      assert.ok(Object.keys(v.clauses).length >= n && Object.values(v.clauses).every((x) => x === "PROVED"), `${f}: a clause not PROVED`);
    } else assert.equal(row.state, "IN-PROGRESS");
  }
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
