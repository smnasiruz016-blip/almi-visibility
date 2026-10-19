/**
 * F14 · Demand evidence research (acceptance _handoffs AlmiVisibility_F14_ACCEPTANCE_2026-10-19.md; RR-291, light proof). C1–C3 on fixtures
 * with firing controls, and C1–C2 REAL on the declared batch through bin/visibility-parts.mjs (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describeDemand, demandEvidence, admitDemandRecord, FIELDS, SEARCH_FIELDS } from "../src/research/demand-observation-evidence.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ctx = { population: "batch b", runs: new Map([["r1", { searchesUsed: 4, dailyCap: 20 }]]), exports: [] };
const seen = { record_type: "search_phrase", measurement_key: "k1", source: "CLIENT_AI_GOOGLE", label: "OBSERVED", kind: "AUTOCOMPLETE", place: "Iceland", language: "en", date: "2026-10-13", runId: "r1", caveat: "seen from one place" };

test("C1 · every demand observation shows method, date, population, limitation and confidence; a missing one is NAMED, never filled in", () => {
  const d = describeDemand(seen, ctx);
  assert.deepEqual(d.missing, []);
  for (const f of FIELDS) assert.ok(d[f], f);
  assert.equal(d.limitation, "seen from one place");
  /* FIRING CONTROL: no population given → population is named missing, not invented */
  assert.deepEqual(describeDemand(seen, { ...ctx, population: "" }).missing, ["population"]);
  /* a record with no label has no confidence: named */
  assert.ok(describeDemand({ ...seen, label: undefined }, ctx).missing.includes("confidence"));
});

test("C2 · a public-search observation also carries surface, ecosystem, country, language, window, bound and OBSERVED/INFERRED; gaps named", () => {
  const d = describeDemand(seen, ctx);
  assert.deepEqual(d.missingSearch, []);
  assert.equal(d.publicSearch.observedOrInferred, "OBSERVED");
  assert.match(d.publicSearch.bound, /4 search\(es\) used of a daily cap of 20/);
  /* FIRING CONTROL: a "NOT REPORTED" country and no run → country and bound named missing */
  assert.deepEqual([...describeDemand({ ...seen, place: "NOT REPORTED", runId: "none" }, ctx).missingSearch].sort(), ["bound", "country"]);
  /* an AI suggestion is not a public-search observation */
  assert.equal(describeDemand({ ...seen, source: "AI_SUGGESTION", label: "INFERRED" }, ctx).publicSearch, undefined);
});

test("C3 · a new record missing any required field is REFUSED with the field named", () => {
  const full = { method: "m", date: "2026-10-19", population: "p", limitation: "l", confidence: "c" };
  assert.equal(admitDemandRecord(full).state, "ACCEPTED");
  for (const f of FIELDS) assert.deepEqual(admitDemandRecord({ ...full, [f]: "" }).missing, [f], f);
  const search = { ...full, publicSearch: true, surface: "s", ecosystem: "e", country: "c", language: "l", window: "w", bound: "b", observedOrInferred: "OBSERVED" };
  assert.equal(admitDemandRecord(search).state, "ACCEPTED");
  for (const f of SEARCH_FIELDS) assert.ok(admitDemandRecord({ ...search, [f]: "" }).missing.includes(f), f);
  /* FIRING CONTROL: a label that is neither OBSERVED nor INFERRED is refused */
  assert.equal(admitDemandRecord({ ...search, observedOrInferred: "MAYBE" }).state, "REFUSED");
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "search-phrases.jsonl"));
test("REAL · C1 and C2 · every demand observation of the declared batch described; C1 gaps 0; C2 gaps named by field (count-only)", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=demand-evidence", "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const total = Number(/demand observations (\d+)/.exec(r.stdout)?.[1]);
  assert.ok(total > 1000, `EMPTY or shrunken real population: ${total}`);
  assert.match(r.stdout, /C1 five fields\s+missing by name: none/);
  assert.match(r.stdout, /C2 public search\s+\d+ record\(s\) · missing by name: /);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 4).map((l) => l.trim()).join(" | ")}`);
});
