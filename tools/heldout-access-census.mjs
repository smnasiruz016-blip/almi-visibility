#!/usr/bin/env node
/**
 * 🔴 F07 · HELD-OUT ACCESS DECISIONS — CLASSIFIED BY EXECUTION, NOT BY READING SOURCE (23 September 2026).
 *
 *   node tools/heldout-access-census.mjs [--check]
 *
 * READ-ONLY. It runs every decision exit of the held-out lifecycle against a COUNTING STUB audit store held in memory
 * (nothing reaches disk) and a SYNTHETIC registry, and requires each decision to emit EXACTLY ONE event. A decision
 * that returns or throws without its event would be F07's "access is unrecorded" — and this finds it by running it.
 *
 * Why execution: in F08 a census that read source text called eight routed callers "bypassing" because their lines
 * LOOKED like writes. Text is not behaviour.
 */
import { createHash } from "node:crypto";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { freezeMechanism, requestHeldOutAccess, readHeldOutItem, scoreHeldOutEvaluation, populationCommitment, EVALUATION_ACTIONS } from "../src/heldout/lifecycle.mjs";

const h = (s) => createHash("sha256").update(s).digest("hex");
/** An in-memory audit store: append + readAll, enough for the lifecycle; it counts, it never writes a file. */
export function countingStore() {
  const events = [];
  let n = 0;
  return {
    events,
    append(draft) { n += 1; const e = { ...draft, eventId: h(`${n}`).slice(0, 32), recordedAt: draft.occurredAt }; events.push(e); return { status: "APPENDED", event: e, appended: true }; },
    readAll: () => ({ events: [...events] }),
  };
}
const ITEMS = ["i-1", "i-2", "i-3"];
export const SYNTHETIC_SET = Object.freeze({
  id: "synthetic:heldout-census-set", role: "HELD_OUT_EVIDENCE", sealed: true, mayEvaluate: true, mandatoryReadable: false,
  maySupplyExpectedAnswer: false, mayTrain: false, contentHash: populationCommitment(ITEMS), retiredReason: null,
  resource: Object.freeze({ root: "synthetic", pathPrefixes: Object.freeze(["synthetic-heldout/"]) }),
});
const REGISTRY = [SYNTHETIC_SET, { id: "synthetic:retired", role: "RETIRED_CONTAMINATED", sealed: false, resource: { root: "derived", derivation: {} } }];
/* A synthetic evaluator authority in the SHAPE of a real corpus record (cloned, then renamed), so the register resolves
 * it exactly as it resolves a real one. The first draft of this census hand-built the record, the register did not
 * resolve it, and every later exit was refused on authority — reaching none of the branches it named. */
const REAL = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
const AUTH = [{ ...REAL, authorityId: "synthetic:evaluator", propositionId: "SYNTHETIC_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "e".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
const MECH = { id: "synthetic-mechanism", v1: h("v1"), v2: h("v2") };
const audit = (store) => ({ store, actor: "census", softwareVersion: "census", correlationId: "run:heldout-census", authorityRef: { propositionId: "P", scope: ["S"] }, authorityHash: "d".repeat(64) });
const request = (over = {}) => ({ mechanismId: MECH.id, mechanismHash: MECH.v1, sealedSetId: SYNTHETIC_SET.id, populationCommitment: SYNTHETIC_SET.contentHash, protocolId: "synthetic-protocol", evaluatorAuthority: { propositionId: "SYNTHETIC_EVALUATOR", scope: ["ALMIVISIBILITY"] }, purpose: "census", at: "2026-09-23T12:00:00Z", ...over });

/**
 * Every decision exit, each run once on its own fresh store. `setup` builds the trail a decision needs (a freeze, a
 * grant) and its events are NOT counted; `decide` is the one decision under test, and must (a) reach the branch it names
 * — its code must be the EXPECTED one, or the probe proved nothing about that branch — and (b) emit exactly one event.
 */
export function runDecisionExits({ authorityRecords = AUTH } = {}) {
  const rows = [];
  const exit = (name, expected, setup, decide) => {
    const store = countingStore();
    const a = audit(store);
    const ctx = setup ? setup(a) : {};
    const before = store.events.length;
    let code = null;
    try { code = decide(a, ctx)?.code ?? "RETURNED"; } catch (e) { code = e.code ?? e.message; }
    const emitted = store.events.slice(before).length;
    rows.push({ name, expected, code, emitted });
  };
  const frozen = (a, hash = MECH.v1) => freezeMechanism({ audit: a, mechanismId: MECH.id, mechanismHash: hash, frozenAt: "2026-09-23T11:00:00Z" });
  const ask = (a, over) => requestHeldOutAccess({ audit: a, registry: REGISTRY, request: request(over), authorityRecords });
  const granted = (a) => { frozen(a); return { g: ask(a) }; };
  const read = (a, g, hash, path = "synthetic-heldout/i-1.txt") => readHeldOutItem({ audit: a, grant: g, currentMechanismHash: hash, registry: REGISTRY, root: "synthetic", base: "", path, read: () => { throw new Error("READ"); } });
  const score = (a, g, hash, outcomes) => scoreHeldOutEvaluation({ audit: a, grant: g, currentMechanismHash: hash, declaredItems: ITEMS, outcomes });

  exit("request · incomplete declaration", "FREEZE_DECLARATION_INCOMPLETE", null, (a) => ask(a, { protocolId: undefined }));
  exit("request · undeclared set", "SET_UNDECLARED", (a) => frozen(a), (a) => ask(a, { sealedSetId: "synthetic:none" }));
  exit("request · retired set", "SET_RETIRED_CONTAMINATED", (a) => frozen(a), (a) => ask(a, { sealedSetId: "synthetic:retired" }));
  exit("request · commitment mismatch", "POPULATION_COMMITMENT_MISMATCH", (a) => frozen(a), (a) => ask(a, { populationCommitment: h("wrong") }));
  exit("request · authority not current", "EVALUATOR_AUTHORITY_NOT_CURRENT", (a) => frozen(a), (a) => ask(a, { evaluatorAuthority: { propositionId: "NOBODY", scope: ["ALMIVISIBILITY"] } }));
  exit("request · mechanism never frozen", "MECHANISM_NOT_FROZEN", null, (a) => ask(a));
  exit("request · only another hash frozen", "MECHANISM_HASH_NOT_FROZEN", (a) => frozen(a, MECH.v2), (a) => ask(a));
  exit("request · frozen AFTER the request", "MECHANISM_FROZEN_AFTER_REQUEST", (a) => freezeMechanism({ audit: a, mechanismId: MECH.id, mechanismHash: MECH.v1, frozenAt: "2026-09-23T13:00:00Z" }), (a) => ask(a));
  exit("request · first access", "ACCESS_FIRST_ACCESS", (a) => frozen(a), (a) => ask(a));
  exit("request · rerun (same mechanism)", "ACCESS_RERUN", (a) => granted(a), (a) => ask(a));
  exit("request · after a mechanism change", "ACCESS_AFTER_MECHANISM_CHANGE", (a) => { granted(a); frozen(a, MECH.v2); }, (a) => ask(a, { mechanismHash: MECH.v2 }));
  exit("read · no grant", "NO_ACCESS_GRANT", null, (a) => read(a, null, MECH.v1));
  exit("read · mechanism changed (first attempt)", "MECHANISM_CHANGED_AFTER_ACCESS", (a) => granted(a), (a, { g }) => read(a, g, MECH.v2));
  exit("read · mechanism changed (repeat attempt)", "MECHANISM_CHANGED_AFTER_ACCESS", (a) => { const c = granted(a); try { read(a, c.g, MECH.v2); } catch {} return c; }, (a, { g }) => read(a, g, MECH.v2));
  exit("read · item outside the granted set", "ITEM_OUTSIDE_GRANTED_SET", (a) => granted(a), (a, { g }) => read(a, g, MECH.v1, "elsewhere/x.txt"));
  exit("score · mechanism changed", "MECHANISM_CHANGED_AFTER_ACCESS", (a) => granted(a), (a, { g }) => score(a, g, MECH.v2, new Map()));
  exit("score · population not accounted", "POPULATION_NOT_ACCOUNTED", (a) => granted(a), (a, { g }) => score(a, g, MECH.v1, new Map([["i-1", { verdict: "PASS" }]])));
  exit("score · complete population", "RETURNED", (a) => granted(a), (a, { g }) => score(a, g, MECH.v1, new Map(ITEMS.map((i) => [i, { verdict: "PASS" }]))));
  return rows;
}

export function heldoutAccessCensus() {
  const rows = runDecisionExits();
  const unrecorded = rows.filter((r) => r.emitted !== 1 || r.code !== r.expected);
  return { rows, total: rows.length, recorded: rows.length - unrecorded.length, unrecorded };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const c = heldoutAccessCensus();
  console.log(`HELD-OUT ACCESS DECISIONS — by execution, on a counting in-memory store and a synthetic registry`);
  for (const r of c.rows) console.log(`  ${r.emitted === 1 && r.code === r.expected ? "ok  " : "🔴  "} ${r.name.padEnd(42)} emitted ${r.emitted} · ${r.code}${r.code === r.expected ? "" : ` (EXPECTED ${r.expected})`}`);
  console.log(`  decision exits ${c.total} · reached their branch AND emitted exactly one event: ${c.recorded} · FAILED ${c.unrecorded.length}`);
  if (process.argv.includes("--check") && c.unrecorded.length) process.exit(1);
}
