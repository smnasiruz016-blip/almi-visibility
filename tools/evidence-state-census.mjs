#!/usr/bin/env node
/**
 * 🔴 F06 · THE EVIDENCE-STATE CENSUS — every real governed population, read through its PRODUCTION reader and placed by
 * the production adapter, with exact arithmetic and a firing control for every zero (24 September 2026).
 *
 *   node tools/evidence-state-census.mjs     counts only; exit 1 on an unmapped item, a forbidden conversion, a remainder,
 *                                            or a control that fails to fire
 *
 * READ-ONLY. It classifies stored records and appends nothing: a classification is neither an access nor a governed
 * change (owner ruling, 23 September 2026). Sealed paths are excluded by the registry BEFORE any read, and counted. A
 * population whose reader is unavailable here (no external root declared) is reported NOT MEASURED — never 0 — and its
 * absence is not a pass. Prints counts, states and reason codes only: never a value, a URL or a record's text.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { EVIDENCE_STATES, evidenceStateFaults, UNMAPPED, serializeEvidenceState, parseEvidenceState } from "../src/evidence/evidence-state.mjs";
import { evidenceStateOf, adapterContext, costPartStates } from "../src/evidence/evidence-state-adapters.mjs";
import { isSealed } from "../src/governance/sealed-paths.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { declaredObservationSources } from "../src/crawl/observation-batch.mjs";
import { readReasoningBatch } from "../src/discovery/local-reasoning.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { subjectIndex } from "../src/subject-roots.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * THE GOVERNED POPULATIONS, each through the reader production uses:
 *   engine    every git-tracked record store under runs/ (runs/**\/*.jsonl) — the evidence, audit, cost, render and
 *             replay stores; sealed paths excluded unread and counted
 *   batches   every declared external observation batch (src/crawl/observation-batch.mjs declaredObservationSources)
 *   research  the declared reasoning batch (src/discovery/local-reasoning.mjs readReasoningBatch)
 *   facts     every product's fact registry (src/product-cli.mjs availableProducts → src/facts/registry.mjs loadRegistry)
 *   costParts each ledger entry's money, provider calls and founder time (src/cost/ledger.mjs), as items of their own
 */
export async function governedPopulations({ env = process.env } = {}) {
  const pops = [];
  const tracked = execFileSync("git", ["-C", REPO, "ls-files", "runs"], { encoding: "utf8" }).trim().split("\n").filter((p) => p.endsWith(".jsonl"));
  const sealedExcluded = tracked.filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p));
  for (const p of tracked.filter((x) => !sealedExcluded.includes(x))) pops.push({ name: `engine:${p}`, kind: "records", records: createJsonlStore(join(REPO, p)).readAll() });
  const unavailable = [];
  try { for (const s of declaredObservationSources({ env })) pops.push({ name: `batch:${s.canonical}`, kind: "records", records: createJsonlStore(s.path).readAll() }); }
  catch (e) { unavailable.push({ name: "batch:*", why: e.code ?? e.message }); }
  try { const b = readReasoningBatch({ env }); pops.push({ name: `research:${b.locator}`, kind: "records", records: b.records }); }
  catch (e) { unavailable.push({ name: "research:*", why: e.code ?? e.message }); }
  /* Only a product in an EXTERNAL subject root is a real population. The engine's own `fixtures` root holds declared
   * test material (config/subject-roots.mjs), which is never counted as real evidence — it is excluded and counted. */
  let index = new Map();
  const fixtureProducts = [];
  try { index = subjectIndex(); } catch (e) { unavailable.push({ name: "facts:*", why: e.message.slice(0, 120) }); }
  for (const [id, { root }] of index) {
    if (root.kind !== "external") { fixtureProducts.push(id); continue; }
    try { const P = await productFromArgv(["node", "census", `--product=${id}`]); const { records } = await loadRegistry(P.factsDir, P.productId); pops.push({ name: `facts:product-${pops.filter((x) => x.name.startsWith("facts:")).length + 1}`, kind: "records", records }); }
    catch (e) { unavailable.push({ name: `facts:${id.length}-char-id`, why: e.message.slice(0, 80) }); }
  }
  const ledger = pops.find((x) => x.name === "engine:runs/cost/ledger.jsonl");
  if (ledger) pops.push({ name: "costParts:runs/cost/ledger.jsonl", kind: "costParts", records: ledger.records });
  return { pops, sealedExcluded: sealedExcluded.length, fixtureProducts: fixtureProducts.length, unavailable };
}

/** Place every item of every population. Returns the arithmetic, the unmapped reasons and the forbidden conversions. */
export function census({ pops }) {
  const rows = [];
  const unmapped = [];
  const forbidden = [];
  for (const pop of pops) {
    const dist = Object.fromEntries([...EVIDENCE_STATES, UNMAPPED].map((s) => [s, 0]));
    let items = 0;
    if (pop.kind === "costParts") {
      for (const e of pop.records) for (const [part, s] of Object.entries(costPartStates(e))) {
        items += 1;
        dist[s.unmapped ? UNMAPPED : s.state] += 1;
        if (s.unmapped) unmapped.push({ pop: pop.name, why: s.why });
        else forbidden.push(...conversionFaults(s, part === "money" ? { amount: e.money.amount } : { amount: e[part][part === "providerCalls" ? "total" : "seconds"] }, pop.name));
      }
    } else {
      const ctx = adapterContext(pop.records);
      for (const r of pop.records) {
        items += 1;
        const s = evidenceStateOf(r, ctx);
        dist[s.unmapped ? UNMAPPED : s.state] += 1;
        if (s.unmapped) unmapped.push({ pop: pop.name, type: r.record_type ?? "fact", why: s.why });
        else forbidden.push(...conversionFaults(s, r, pop.name));
      }
    }
    const placed = Object.values(dist).reduce((a, b) => a + b, 0);
    rows.push({ name: pop.name, items, dist, remainder: items - placed });
  }
  const total = rows.reduce((a, r) => a + r.items, 0);
  const byState = Object.fromEntries([...EVIDENCE_STATES, UNMAPPED].map((s) => [s, rows.reduce((a, r) => a + r.dist[s], 0)]));
  return { rows, total, byState, remainder: total - Object.values(byState).reduce((a, b) => a + b, 0), unmapped, forbidden };
}

/**
 * THE FORBIDDEN CONVERSIONS, checked BY EXECUTION on every placed item (never by reading source text):
 *   STATE_INVALID               the placed state fails the model's own validation (absent, multiple, coupled, malformed)
 *   SERIALISATION_UNSTABLE      the state does not round-trip through its stable serialisation
 *   NOT_MEASURED_AS_ZERO        a NOT_MEASURED item whose record carries a measured zero (a 0 count or amount)
 *   UNKNOWN_AS_PASS             an UNKNOWN item whose record reads PASS
 *   INFERENCE_AS_OBSERVATION    an OBSERVED item placed by a derivation rule
 *   RECOMMENDATION_AS_EVIDENCE  an OBSERVED or INFERRED item that is a drafted recommendation
 *   NOT_APPLICABLE_WITHOUT_REASON
 */
export function conversionFaults(s, record, where) {
  const out = [];
  const f = (code) => out.push({ where, code, rule: s.meta?.assignedBy ?? "?" });
  if (evidenceStateFaults(s).length) f("STATE_INVALID");
  try { if (serializeEvidenceState(parseEvidenceState(serializeEvidenceState(s))) !== serializeEvidenceState(s)) f("SERIALISATION_UNSTABLE"); } catch { f("SERIALISATION_UNSTABLE"); }
  const v = record?.value && typeof record.value === "object" ? record.value : {};
  if (s.state === "NOT_MEASURED" && (v.rowCount === 0 || record?.amount === 0 || s.meta.value !== undefined)) f("NOT_MEASURED_AS_ZERO");
  if (s.state === "UNKNOWN" && [record?.verdict, record?.outcome, v.result].includes("PASS")) f("UNKNOWN_AS_PASS");
  if (s.state === "OBSERVED" && !/^(observation|resighting\.observation|source|fact\.checked|cost_entry\.part\.(providerCalls|founderTime))$/.test(s.meta.assignedBy)) f("INFERENCE_AS_OBSERVATION");
  if (record?.record_type === "draft_recommendation" && s.state !== "RECOMMENDED") f("RECOMMENDATION_AS_EVIDENCE");
  if (s.state === "NOT_APPLICABLE" && !s.meta.applicabilityReason) f("NOT_APPLICABLE_WITHOUT_REASON");
  return out;
}

/** Controls: each check above must be CAPABLE of the other verdict, shown on synthetic items (never counted as real). */
export function controls() {
  const r = {};
  r.unmappedFires = evidenceStateOf({ record_type: "synthetic_unplaceable" }).unmapped === true && evidenceStateOf({}).unmapped === true;
  const nm = evidenceStateOf({ record_type: "issue", verdict: "UNKNOWN", reason_code: "MISSING_INPUT", issue_class: "c", evidence: ["o"], detector: "d", opened_at: "2026-09-24" });
  r.zeroFires = conversionFaults(nm, { value: { rowCount: 0 } }, "control").some((x) => x.code === "NOT_MEASURED_AS_ZERO");
  const un = evidenceStateOf({ record_type: "issue", verdict: "UNKNOWN", issue_class: "c", evidence: ["o"], detector: "human-verification", opened_at: "2026-09-24" });
  r.passFires = conversionFaults(un, { verdict: "PASS" }, "control").some((x) => x.code === "UNKNOWN_AS_PASS");
  const inf = evidenceStateOf({ record_type: "page", observations: ["o"], last_seen: "2026-09-24" });
  r.inferenceFires = conversionFaults({ state: "OBSERVED", meta: { ...inf.meta, evidenceRef: "x", sourceId: "y", observedAt: "2026-09-24" } }, {}, "control").some((x) => x.code === "INFERENCE_AS_OBSERVATION" || x.code === "STATE_INVALID");
  r.recommendationFires = conversionFaults(inf, { record_type: "draft_recommendation" }, "control").some((x) => x.code === "RECOMMENDATION_AS_EVIDENCE");
  r.reasonlessNaFires = conversionFaults({ state: "NOT_APPLICABLE", meta: { checkId: "c", scope: "s", assignedBy: "control", ruleVersion: "f06-1" } }, {}, "control").some((x) => x.code === "NOT_APPLICABLE_WITHOUT_REASON");
  return r;
}


if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const { pops, sealedExcluded, fixtureProducts, unavailable } = await governedPopulations();
  const c = census({ pops });
  const k = controls();
  console.log("F06 · EVIDENCE-STATE CENSUS — every governed population, placed by the production adapter\n");
  for (const r of c.rows) console.log(`  ${r.name.padEnd(64)} ${String(r.items).padStart(5)} · ${EVIDENCE_STATES.map((s) => `${s}=${r.dist[s]}`).join(" ")} ${UNMAPPED}=${r.dist[UNMAPPED]} · remainder ${r.remainder}`);
  console.log(`\n  sealed paths excluded unread: ${sealedExcluded}`);
  for (const u of unavailable) console.log(`  NOT MEASURED here — ${u.name}: ${u.why}`);
  console.log(`\n  TOTAL ${c.total} = ${[...EVIDENCE_STATES, UNMAPPED].map((s) => `${s} ${c.byState[s]}`).join(" + ")} · remainder ${c.remainder}`);
  const byWhy = {}; for (const u of c.unmapped) byWhy[`${u.pop} · ${u.type ?? ""} · ${u.why}`] = (byWhy[`${u.pop} · ${u.type ?? ""} · ${u.why}`] ?? 0) + 1;
  for (const [w, n] of Object.entries(byWhy)) console.log(`  UNMAPPED ${n} · ${w.slice(0, 200)}`);
  const fcount = {}; for (const f of c.forbidden) fcount[f.code] = (fcount[f.code] ?? 0) + 1;
  console.log(`  forbidden conversions: ${c.forbidden.length} ${JSON.stringify(fcount)}`);
  console.log(`  controls (each must fire): ${JSON.stringify(k)}`);
  const ok = c.remainder === 0 && c.unmapped.length === 0 && c.forbidden.length === 0 && Object.values(k).every(Boolean);
  process.exit(ok ? 0 : 1);
}
