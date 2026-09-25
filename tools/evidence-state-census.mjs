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
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { subjectIndex } from "../src/subject-roots.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { readFileSync } from "node:fs";
import { LEGACY_MARKET_MEASUREMENT, LEGACY_MARKET_ELEMENTS, readLegacyMarketMeasurement } from "../src/evidence/legacy-artefacts.mjs";
import { measureMarket } from "../src/discovery/market-measurement.mjs";
import { placeCheckOutcome, CHECK_FIELDS, PLACED_OUTCOMES, UNMAPPED_OUTCOME } from "../src/evidence/verdict.mjs";

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
    try { const P = await productFromArgv(["node", "census", `--product=${id}`], { scope: censusSubjectScope(id) }); const { records } = await loadRegistry(P.factsDir, P.productId); pops.push({ name: `facts:product-${pops.filter((x) => x.name.startsWith("facts:")).length + 1}`, kind: "records", records }); }
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

/* ================================================================== *
 * 🔴 F06 CORRECTION (owner ruling, 24 September 2026) — THE POPULATIONS F06's CENSUS NEVER COUNTED.
 *
 * F06's census counted `runs/**\/*.jsonl` and each fact as ONE item placed by its verificationState. It never read
 * runs/discovery/*.json, where Row 7's canonical-state writer puts its artefact, and never placed a fact's three CHECK
 * OUTCOMES, which OUTCOME_ALIASES collapsed. These are those populations, each item carried with:
 *   state          the placed canonical state, or UNMAPPED
 *   basis          the POSITIVE structure that placed it (never the label alone)
 *   notPerformed   the structure independently proves the measurement was not performed
 *   inapplicable   the stored outcome declares the check not applicable
 * Four zeros are required, each with a firing control that runs the SAME counting code over the pre-correction
 * reading: UNKNOWN for an unmeasured item · NOT_APPLICABLE collapsed into UNKNOWN · an automatic mapping with no
 * positive basis · a remainder. UNMAPPED is a lawful answer here, counted and reasoned, never a failure.
 * ================================================================== */

/** Every tracked runs/discovery artefact, declared by how it is read. An undeclared one fails the census. */
export const DISCOVERY_ARTEFACTS = Object.freeze({
  [LEGACY_MARKET_MEASUREMENT.path]: Object.freeze({ reading: "LEGACY_COMPAT", writer: "src/discovery/market-measurement.mjs (canonical: label() checks LABELS = EVIDENCE_STATES)" }),
  "runs/discovery/localized-reasoning-2026-09-21.json": Object.freeze({
    reading: "DOMAIN_VOCABULARY",
    writer: "src/discovery/local-reasoning.mjs · src/discovery/localized-thinking.mjs — neither checks the canonical set",
    fields: Object.freeze(["$.localReasoning.groups[].members[].state (memberState, class H)", "$.countries[].status (ABOVE_FLOOR / UNKNOWN)"]),
  }),
  "runs/discovery/localized-thinking-2026-09-15.json": Object.freeze({
    reading: "DOMAIN_VOCABULARY",
    writer: "src/discovery/localized-thinking.mjs — does not check the canonical set",
    fields: Object.freeze(["$.countries[].status (ABOVE_FLOOR / UNKNOWN)"]),
  }),
  "runs/discovery/search-language-2026-09-15.json": Object.freeze({ reading: "NO_STATE_LITERALS" }),
});

/** The bases a correction item may be placed on. Anything else placed automatically is an ambiguous mapping. */
export const POSITIVE_BASES = Object.freeze(["CHECK_RAN", "DECLARED_SOURCE_QUOTABLE", "CHECK_REACHED", "DECLARED_DERIVED_FACT", "DECLARED_MEASURED_FALSE", "CANONICAL_WRITER_LITERAL"]);

/** The pre-correction table, frozen here ONLY as the firing controls' input. Never used to place anything. */
export const PRE_CORRECTION_OUTCOME_ALIASES = Object.freeze({ pass: "PASS", fail: "FAIL", "could-not-check": "UNKNOWN", "not-applicable": "UNKNOWN" });

const CANONICAL_LITERALS = Object.freeze([...EVIDENCE_STATES]);
const isDeclaredDerived = (r) => r?.kind === "derived" && Array.isArray(r?.derivation?.inputs) && r.derivation.inputs.length > 0 && (r.source === undefined || r.source === null);

/** Row 7's nine labelled elements of a result, read by the live writer's own literal (a current, canonical result). */
export function currentMarketItems(result) {
  return LEGACY_MARKET_ELEMENTS.map((el) => {
    const node = el.at(result);
    const literal = node?.[el.field];
    const placed = CANONICAL_LITERALS.includes(literal);
    return { path: el.path, original: literal, state: placed ? literal : UNMAPPED, basis: placed ? "CANONICAL_WRITER_LITERAL" : null, unmapped: !placed, notPerformed: el.deferred === true && node?.measured === false, inapplicable: false };
  });
}

/** The 15 September artefact through the compatibility adapter. */
export function legacyMarketItems(artefact, elements) {
  return elements.map((e, i) => {
    const node = LEGACY_MARKET_ELEMENTS[i].at(artefact);
    return { path: e.path, original: e.originalState, state: e.canonicalEvidenceState, basis: e.basis ?? null, unmapped: e.unmapped === true, why: e.why, notPerformed: LEGACY_MARKET_ELEMENTS[i].deferred === true && node?.measured === false, inapplicable: false };
  });
}

/** Every check outcome of every fact, placed from the record's structure. */
export function checkOutcomeItems(records) {
  const items = [];
  for (const r of records) {
    for (const field of CHECK_FIELDS) {
      const p = placeCheckOutcome({ record: r, field });
      items.push({ path: field, original: p.originalOutcome, state: p.state, basis: p.basis ?? null, unmapped: p.unmapped === true, why: p.why, notPerformed: isDeclaredDerived(r) && p.originalOutcome !== "pass" && p.originalOutcome !== "fail", inapplicable: p.originalOutcome === "not-applicable" });
    }
  }
  return items;
}

/** The pre-correction reading of the same items: the stored label (or the old table) decides alone. Controls only. */
export function preCorrectionReading(items, { checks = false } = {}) {
  return items.map((i) => {
    const state = checks ? PRE_CORRECTION_OUTCOME_ALIASES[i.original] : i.original;
    return { ...i, state, basis: "LABEL_ALONE", unmapped: false };
  });
}

/** The four required zeros, counted by ONE function over any reading. */
export function correctionZeros(items) {
  const placedOrUnmapped = items.filter((i) => [...CANONICAL_LITERALS, ...PLACED_OUTCOMES, UNMAPPED, UNMAPPED_OUTCOME].includes(i.state)).length;
  return {
    unknownForUnmeasured: items.filter((i) => i.notPerformed && i.state === "UNKNOWN").length,
    notApplicableCollapsedIntoUnknown: items.filter((i) => i.inapplicable && i.state === "UNKNOWN").length,
    ambiguousAutomaticMappings: items.filter((i) => !i.unmapped && !POSITIVE_BASES.includes(i.basis)).length,
    remainder: items.length - placedOrUnmapped,
  };
}

/** Synthetic items for the controls, independent of any external root (never counted as real). */
const CONTROL_RECORDS = Object.freeze([
  { id: "control-derived", kind: "derived", derivation: { inputs: ["a"] }, checks: { linkCheckOutcome: "could-not-check", quoteMatchOutcome: "could-not-check", fingerprintOutcome: "could-not-check" } },
  { id: "control-licence", sourceQuotable: false, checks: { linkCheckOutcome: "pass", quoteMatchOutcome: "not-applicable", fingerprintOutcome: "could-not-check" } },
]);

/** Each zero must be CAPABLE of firing: the same counter, fed the pre-correction reading, and a dropped placement. */
export function correctionControls({ legacyItems }) {
  const synthetic = checkOutcomeItems(CONTROL_RECORDS);
  const oldChecks = correctionZeros(preCorrectionReading(synthetic, { checks: true }));
  const oldLegacy = correctionZeros(preCorrectionReading(legacyItems));
  const dropped = correctionZeros([...synthetic.slice(1), { ...synthetic[0], state: undefined }]);
  return {
    unknownForUnmeasuredFires: oldChecks.unknownForUnmeasured > 0 && oldLegacy.unknownForUnmeasured === 3,
    notApplicableCollapseFires: oldChecks.notApplicableCollapsedIntoUnknown > 0,
    ambiguousMappingFires: oldChecks.ambiguousAutomaticMappings > 0 && oldLegacy.ambiguousAutomaticMappings === legacyItems.length,
    remainderFires: dropped.remainder === 1,
  };
}

/** The correction populations, from the tracked tree and each product's registry. */
export async function correctionPopulations({ env = process.env } = {}) {
  const pops = [];
  const undeclared = [];
  const domain = [];
  const tracked = execFileSync("git", ["-C", REPO, "ls-files", "runs/discovery"], { encoding: "utf8" }).trim().split("\n").filter((p) => p.endsWith(".json"));
  for (const p of tracked) {
    const d = DISCOVERY_ARTEFACTS[p];
    if (!d) { undeclared.push(p); continue; }
    if (d.reading === "LEGACY_COMPAT") {
      const { artefact, elements } = readLegacyMarketMeasurement(REPO);
      pops.push({ name: `legacy:${p}`, items: legacyMarketItems(artefact, elements) });
    } else if (d.reading === "DOMAIN_VOCABULARY") {
      domain.push({ path: p, ...domainVocabularyCounts(JSON.parse(readFileSync(join(REPO, p), "utf8"))) });
    }
  }
  const store = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  pops.push({ name: "current:measureMarket(runs/evidence/evidence.jsonl)", items: currentMarketItems(measureMarket(store)) });
  const unavailable = [];
  let index = new Map();
  try { index = subjectIndex(); } catch (e) { unavailable.push({ name: "checks:*", why: e.message.slice(0, 120) }); }
  let n = 0;
  for (const [id, { root }] of index) {
    if (root.kind !== "external") continue;
    n += 1;
    try { const P = await productFromArgv(["node", "census", `--product=${id}`], { scope: censusSubjectScope(id) }); const { records } = await loadRegistry(P.factsDir, P.productId); pops.push({ name: `checks:product-${n}`, items: checkOutcomeItems(records), records }); }
    catch (e) { unavailable.push({ name: `checks:product-${n}`, why: e.message.slice(0, 80) }); }
  }
  return { pops, undeclared, domain, unavailable, tracked: tracked.length };
}

/** A domain-vocabulary artefact is measured, never placed: its literals and what its structure says about each. */
export function domainVocabularyCounts(a) {
  const members = (a?.localReasoning?.groups ?? []).flatMap((g) => g.members ?? []);
  const countries = a?.countries ?? [];
  const t = (xs, f) => xs.reduce((o, x) => { const k = f(x); o[k] = (o[k] ?? 0) + 1; return o; }, {});
  return {
    members: t(members, (m) => `${m.state}${m.state === "UNKNOWN" ? (Array.isArray(m.readStates) && m.readStates.length === 0 ? " · no read attempt recorded" : " · read attempt recorded") : ""}`),
    countries: t(countries, (c) => `${c.status}${c.status === "UNKNOWN" ? (c.humanRows > 0 ? " · rows read, below the floor" : " · no rows read") : ""}`),
  };
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

  const cp = await correctionPopulations();
  console.log("\nF06 CORRECTION · THE POPULATIONS F06's CENSUS NEVER COUNTED — runs/discovery and every fact's check outcomes\n");
  console.log(`  tracked runs/discovery/*.json: ${cp.tracked} · undeclared: ${cp.undeclared.length}${cp.undeclared.length ? ` (${cp.undeclared.join(", ")})` : ""}`);
  const all = [];
  for (const p of cp.pops) {
    all.push(...p.items);
    const dist = {};
    for (const i of p.items) { const key = `${i.original}→${i.state}`; dist[key] = (dist[key] ?? 0) + 1; }
    const z = correctionZeros(p.items);
    console.log(`  ${p.name.padEnd(64)} ${String(p.items.length).padStart(4)} · ${Object.entries(dist).sort().map(([s, n]) => `${s} ${n}`).join(" · ")} · UNMAPPED ${p.items.filter((i) => i.unmapped).length} · remainder ${z.remainder}`);
    const why = {}; for (const i of p.items.filter((x) => x.unmapped)) why[`${i.path} · ${i.why}`] = (why[`${i.path} · ${i.why}`] ?? 0) + 1;
    for (const [w, n] of Object.entries(why)) console.log(`      UNMAPPED ${n} · ${w.slice(0, 190)}`);
  }
  for (const u of cp.unavailable) console.log(`  NOT MEASURED here — ${u.name}: ${u.why}`);
  for (const d of cp.domain) console.log(`  domain vocabulary, measured not placed — ${d.path}: members ${JSON.stringify(d.members)} · countries ${JSON.stringify(d.countries)}`);
  const zeros = correctionZeros(all);
  const legacyPop = cp.pops.find((p) => p.name.startsWith("legacy:"));
  const kc = correctionControls({ legacyItems: legacyPop?.items ?? [] });
  const realChecks = cp.pops.filter((p) => p.name.startsWith("checks:")).flatMap((p) => p.items);
  const realOld = correctionZeros(preCorrectionReading(realChecks, { checks: true }));
  console.log(`\n  TOTAL ${all.length} items · zeros ${JSON.stringify(zeros)}`);
  console.log(`  controls (each must fire): ${JSON.stringify(kc)}`);
  console.log(`  the pre-correction table over the REAL check outcomes (control, not a placement): ${JSON.stringify(realOld)}`);
  const okc = cp.undeclared.length === 0 && Object.values(zeros).every((n) => n === 0) && Object.values(kc).every(Boolean) && Boolean(legacyPop);
  process.exit(ok && okc ? 0 : 1);
}
