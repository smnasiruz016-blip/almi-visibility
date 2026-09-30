/**
 * F45 · FACT CONFLICT, FRESHNESS AND RECOMPUTATION (acceptance _handoffs dcb9fbb, RR-94).
 *
 * Every expected state below is written by hand from its fixture. The real registry is read, never written; nothing is fetched; the
 * production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { assessFactHealth, factFreshness, recompute, FRESHNESS, RECOMPUTE } from "../src/facts/fact-health.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { subject } from "./support/subjects.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

let n = 0;
const fact = (over = {}) => ({
  id: `f${++n}`, claim: { subject: "s", predicate: `p${n}`, qualifier: null }, scope: "x", value: { value: 10 },
  life: { status: "active" }, freshness: { days: 180, rule: "r" }, verification: { checkedOn: "2026-01-01" }, checks: { factCheckedOn: "2026-01-01" }, ...over,
});
const real = async () => { const p = await subject("almi-oet"); return (await loadRegistry(p.factsDir, p.productId)).records; };

/* ================= C1 — contradictions, never auto-resolved ================= */

test("C1 · FIRING CONTROL: active records of one claim with differing values are CONTRADICTED, every one retained, none presented as current — on the REAL registry with one planted variant", async () => {
  const records = await real();
  const base = assessFactHealth(records, { on: "2026-09-30" });
  assert.equal(base.summary.contradicted, 0, "the real registry already holds a contradiction — this control's baseline moved");
  const victim = records.find((r) => typeof r.value?.value === "number" || typeof r.value?.value === "string");
  const planted = { ...victim, id: `${victim.id}-planted`, value: { ...victim.value, value: typeof victim.value.value === "number" ? victim.value.value + 1 : `${victim.value.value}-other` } };
  const r = assessFactHealth([...records, planted], { on: "2026-09-30" });
  assert.equal(r.summary.contradictionGroups, 1);
  assert.deepEqual(r.contradictions[0].records.map((x) => x.id).sort(), [victim.id, planted.id].sort(), "a contradicting record was dropped");
  for (const id of [victim.id, planted.id]) {
    const f = r.facts.find((x) => x.id === id);
    assert.deepEqual([f.presentation, f.reasons.includes("CONTRADICTED")], ["REVIEW_REQUIRED", true], "a winner was presented as current");
  }
  /* an identical value, a different qualifier, and a retired record are not contradictions */
  assert.equal(assessFactHealth([...records, { ...victim, id: "same" }], { on: "2026-09-30" }).summary.contradicted, 0);
  assert.equal(assessFactHealth([...records, { ...planted, claim: { ...planted.claim, qualifier: "other-qualifier" } }], { on: "2026-09-30" }).summary.contradicted, 0);
  assert.equal(assessFactHealth([...records, { ...planted, life: { ...planted.life, status: "retired" } }], { on: "2026-09-30" }).summary.contradicted, 0);
  /* a recorded settlement is reported as recorded — never inferred */
  assert.equal(base.summary.recordedSettlements, records.filter((x) => x.conflict).length);
  assert.ok(base.settlements.every((s) => ["RECORDED", "NOT RECORDED"].includes(s.settledBy)));
});

/* ================= C2 — expiry under the fact's own rule ================= */

test("C2 · each fact is exactly one of CURRENT, EXPIRED or NOT MEASURED, by its OWN rule from its OWN check date, on a STATED date", () => {
  const f = fact();
  assert.equal(factFreshness(f, { on: "2026-06-30" }).state, FRESHNESS.CURRENT, "the last day of its window read EXPIRED");
  assert.equal(factFreshness(f, { on: "2026-07-01" }).state, FRESHNESS.EXPIRED, "a fact past its window read CURRENT");
  assert.deepEqual(factFreshness(fact({ freshness: null }), { on: "2026-02-01" }), { state: FRESHNESS.NOT_MEASURED, missing: "a declared freshness rule (days)" });
  assert.deepEqual(factFreshness(fact({ verification: {}, checks: {} }), { on: "2026-02-01" }), { state: FRESHNESS.NOT_MEASURED, missing: "a recorded check date" });
  assert.equal(factFreshness(fact({ checks: { factCheckedOn: "2026-01-05" } }), { on: "2026-02-01" }).state, FRESHNESS.NOT_MEASURED, "two disagreeing check dates were resolved silently");
  /* an EARLIER recorded recheck date governs (fail closed); a LATER one never extends the rule */
  const earlier = factFreshness(fact({ checks: { factCheckedOn: "2026-01-01", recheckAfter: "2026-03-01" } }), { on: "2026-04-01" });
  assert.deepEqual([earlier.state, earlier.governedBy, earlier.windowsDisagree], [FRESHNESS.EXPIRED, "the earlier recorded recheck date", true]);
  assert.equal(factFreshness(fact({ checks: { factCheckedOn: "2026-01-01", recheckAfter: "2027-01-01" } }), { on: "2026-08-01" }).state, FRESHNESS.EXPIRED, "a later recorded recheck date extended the declared rule");
  assert.throws(() => factFreshness(f, {}), /stated/);
  assert.throws(() => assessFactHealth([f], { on: "tomorrow" }), /stated/);
});

/* ================= C3 — fails closed ================= */

test("C3 · an EXPIRED or NOT-MEASURED fact is never presented as current; the output carries no delete or noindex", () => {
  const r = assessFactHealth([fact(), fact({ freshness: null })], { on: "2026-12-01" });
  assert.deepEqual(r.facts.map((x) => x.presentation), ["REVIEW_REQUIRED", "REVIEW_REQUIRED"]);
  assert.ok(r.facts[0].reasons.includes("EXPIRED"));
  const ok = assessFactHealth([fact()], { on: "2026-02-01" });
  assert.deepEqual(ok.facts.map((x) => [x.presentation, x.reasons.length]), [["CURRENT", 0]], "a sound fact was not presented as current");
  for (const x of r.facts) assert.deepEqual(Object.keys(x).sort(), ["freshness", "id", "presentation", "reasons", "recompute"], "F45 carries an action beyond REVIEW REQUIRED");
  /* a retired fact is neither judged nor presented — it is counted as retired */
  const withRetired = assessFactHealth([fact(), fact({ life: { status: "retired" } })], { on: "2026-02-01" });
  assert.deepEqual([withRetired.facts.length, withRetired.summary.retiredNotJudged], [1, 1], "a retired fact was judged or presented");
});

/* ================= C4 — recomputation ================= */

test("C4 · a derived fact is recomputed MATCH / MISMATCH / NOT MEASURED; a bad input makes it — and what is built on it — REVIEW REQUIRED even when the arithmetic matches", () => {
  const a = fact({ value: { value: 30 } }), b = fact({ value: { value: 10 } });
  const d = fact({ value: { value: 3 }, derivation: { formula: "ratio", inputs: [a.id, b.id] } });
  const byId = new Map([a, b].map((x) => [x.id, x]));
  assert.equal(recompute(d, byId).state, RECOMPUTE.MATCH);
  assert.equal(recompute({ ...d, value: { value: 4 } }, byId).state, RECOMPUTE.MISMATCH, "a stored value that disagrees with its formula read MATCH");
  assert.deepEqual(recompute({ ...d, derivation: { ...d.derivation, inputs: [a.id, "missing"] } }, byId), { state: RECOMPUTE.NOT_MEASURED, missing: "a recorded input fact" });
  assert.deepEqual(recompute({ ...d, derivation: { ...d.derivation, formula: "median" } }, byId), { state: RECOMPUTE.NOT_MEASURED, missing: "a declared formula" });
  /* an expired input marks the derived fact, and what is derived from it, although the arithmetic matches */
  const oldA = { ...a, verification: { checkedOn: "2025-01-01" }, checks: { factCheckedOn: "2025-01-01" } };
  const d2 = fact({ value: { value: 6 }, derivation: { formula: "product", inputs: [d.id] }, freshness: { days: 180, rule: "r" } });
  d2.value.value = 3;
  /* d2 is listed BEFORE d, so only a walk that repeats until nothing grows can reach it */
  const r = assessFactHealth([oldA, b, d2, d], { on: "2026-02-01" });
  const got = (id) => r.facts.find((x) => x.id === id);
  assert.equal(got(d.id).recompute.state, RECOMPUTE.MATCH);
  assert.deepEqual([got(d.id).presentation, got(d.id).reasons.includes("AN INPUT IS NOT SOUND")], ["REVIEW_REQUIRED", true], "a derived fact on an expired input passed");
  assert.equal(got(d2.id).presentation, "REVIEW_REQUIRED", "the dependency walk stopped at the first derived fact");
});

/* ================= REAL ================= */

test("REAL · the client's recorded registry on the stated date: all three worlds recorded, every missing fact named, the derived fact recomputed", async () => {
  const records = await real();
  const r = assessFactHealth(records, { on: "2026-09-30" });
  assert.ok(r.summary.facts > 0, "EMPTY registry");
  assert.equal(r.facts.length, records.filter((x) => x.life?.status !== "retired").length);
  const worlds = { CURRENT: 0, EXPIRED: 0, NOT_MEASURED: 0, ...r.summary.freshness };
  assert.equal(worlds.CURRENT + worlds.EXPIRED + worlds.NOT_MEASURED, r.summary.facts, "a fact has no freshness state, or two");
  for (const f of r.facts.filter((x) => x.freshness.state === FRESHNESS.NOT_MEASURED)) assert.ok(f.freshness.missing, "a NOT MEASURED fact names no missing fact");
  for (const f of r.facts) assert.equal(f.presentation === "CURRENT", f.reasons.length === 0);
  assert.ok(r.summary.derived > 0 && Object.values(r.summary.recompute).reduce((a, b) => a + b, 0) === r.summary.derived, "the derived fact was not recomputed");
  console.log(`  REAL (count-only, on ${r.on}): ${JSON.stringify({ ...r.summary, threeWorlds: worlds })}`);
  /* the SAME real records on a later stated date — a positive control that expiry reaches real facts, never a result */
  const later = assessFactHealth(records, { on: "2027-04-01" });
  const judged = later.facts.filter((x) => x.freshness.state !== FRESHNESS.NOT_MEASURED);
  assert.ok(judged.length > 0 && judged.every((x) => x.freshness.state === FRESHNESS.EXPIRED && x.presentation === "REVIEW_REQUIRED"), "a real fact past its window stayed current");
});

/* ================= C5 — recorded data only ================= */

test("C5 · THE ENTRY POINT: with no stated date it refuses; in a declared world it prints its bound with the stated date, and writes nothing", async () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const noDate = spawnSync(process.execPath, WORLD.argv(["bin/fact-health.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(noDate.status, 1);
    assert.match(noDate.stderr, /--on=<YYYY-MM-DD> is required\. There is no default/);
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/fact-health.mjs", "--product=almi-oet", "--on=2026-09-30"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const r = assessFactHealth(await real(), { on: "2026-09-30" });
    assert.match(ok.stdout, new RegExp(`bound\\s+recorded registry only · ${r.summary.facts} active fact\\(s\\) .* judged on 2026-09-30 \\(stated\\) · nothing fetched or re-checked`));
    assert.match(ok.stdout, new RegExp(`presentation\\s+CURRENT ${r.summary.presentation.CURRENT ?? 0}`));
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C5 · the assessment loads no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/facts/fact-health.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
