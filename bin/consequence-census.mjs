#!/usr/bin/env node
/**
 * ROW 60 — THE CONSEQUENCE REGISTER, THE OWNER'S LAW AND THE CLASS SPLITS, CHECKED OVER THE REAL STORE.
 *
 *   node bin/consequence-census.mjs          report only — it reads, prints and exits; it writes nothing
 *
 * Every limb is its own, so a sabotage can be shown to trip exactly one:
 *
 *   scale                  the scale holds levels only — no UNCLASSIFIED, UNKNOWN, INFORMATIONAL or OBSERVATION (A4)
 *   missing · stale        the register against the SPLIT classes actually in the store, line by line
 *   entry                  a partial entry (any of the six parts), a level off the scale or unruled, a bad escalation
 *   half-level             a half of a split class arriving with a level, or with its parent's ruling
 *   signal                 a half with no stored signal, or a record matching no half or more than one
 *   identity · state · reopened   the split changing an issue's id, evidence, opened_at or state
 *   misnamed · mixed       a class of checks that never ran named as a defect, or a bundle nobody split
 *   part-c                 a recommendation no class-keyed entry can reach keeps its declared gap and stays UNCLASSIFIED
 *   cross-level-amplifier  volume ranked a weaker level above a stronger one (A3)
 *   amplifier              inside one level, less volume ranked above more (A3)
 *   unclassified-ordered   an UNCLASSIFIED consequence ranked — as low, or on any fallback (A4)
 *   nearest-class          a consequence applied a class its own evidence does not link
 *   partial                an item missing from the order, or placed twice
 *   determinism            the same evidence ordered differently when presented in a different order (A2)
 *   basis · entries · level · unclassified-ranked   every presented priority's basis and entries (Amendment 3)
 *
 * The order and the split are checked from the REGISTER and the STORE, independently of the code that produced them.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import {
  reconcileRegister, priorityCensus, scaleErrors, consequenceFor, orderByConsequence, orderErrors, determinismErrors, UNCLASSIFIED,
} from "../src/audit/consequence.mjs";
import { classOf, splitView, splitErrors, isUnmeasured } from "../src/audit/class-split.mjs";
import { coverageErrors, blastRadiusErrors, voidEscalationErrors, populationOf } from "../src/audit/coverage.mjs";
import { COVERAGE_REGISTER } from "../config/coverage-register.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";
import { populationErrors, fourWay, impressionsForClass, POPULATIONS } from "../src/audit/populations.mjs";
import { readFileSync as readText, existsSync as exists } from "node:fs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER, UNREACHABLE_RECOMMENDATIONS, SUPERSEDED_ENTRIES } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";
import { CLASS_SPLITS, UNMEASURED_REASON_CODES } from "../config/class-splits.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/consequence-census.mjs", governed: false, resources: [RESOURCES.runArtefacts("run stores"), RESOURCES.evidenceStore(), RESOURCES.costLedger(), RESOURCES.crawlBatch(BATCH_ID)] });
const read = (dir) => readdirSync(join(REPO, dir)).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, dir, f)).readAll());
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const audit = read("runs/audit");
const everything = walk(join(REPO, "runs")).sort().flatMap((p) => createJsonlStore(p).readAll());

const errors = [];
const add = (xs) => errors.push(...xs);

/* ---- the scale ---- */
add(scaleErrors(SEVERITY_SCALE));

/* ---- the split: every issue in the store, as row 60 counts it ---- */
const { view } = splitView(everything, CLASS_SPLITS);
add(splitErrors({ records: everything, splits: CLASS_SPLITS, unmeasuredCodes: UNMEASURED_REASON_CODES, view }));

/* ---- the register, line by line, against the split classes ---- */
const rec = reconcileRegister({ records: audit, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE, splits: CLASS_SPLITS });
add(rec.missing.map((k) => ({ limb: "missing", id: k, why: "a class in use has no register entry" })));
add(rec.stale.map((k) => ({ limb: "stale", id: k, why: "a register entry for a class not in use" })));
add(rec.invalid.map((x) => ({ limb: "entry", id: x.class, why: x.why })));
add(rec.inherited.map((x) => ({ limb: "half-level", id: x.class, why: x.why })));
if (rec.vacuous) add([{ limb: "missing", why: "VACUOUS — no finding class is in use" }]);
for (const [k, e] of Object.entries(SUPERSEDED_ENTRIES)) {
  if (CONSEQUENCE_REGISTER[k]) add([{ limb: "stale", id: k, why: "a superseded class still has a live register entry" }]);
  if (JSON.stringify([...e.supersededBy]) !== JSON.stringify(CLASS_SPLITS[k]?.halves.map((h) => h.class))) add([{ limb: "entry", id: k, why: "a superseded entry does not name exactly the halves its split declares" }]);
}

/* ---- the classes, ordered consequence-first; volume = distinct issues still OPEN ---- */
const openByClass = new Map();
for (const v of view.values()) if (v.state === "OPEN") openByClass.set(v.class, (openByClass.get(v.class) ?? 0) + 1);
const classItems = rec.classesInUse.map((k) => ({
  id: k,
  consequence: consequenceFor([k], CONSEQUENCE_REGISTER, SEVERITY_SCALE),
  volume: openByClass.get(k) ?? 0,
  appliedClasses: [k],
  linkedClasses: [k],
}));
const classOrder = orderByConsequence({ items: classItems, scale: SEVERITY_SCALE });
add(orderErrors({ order: classOrder, items: classItems, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE }));
add(determinismErrors({ items: classItems, scale: SEVERITY_SCALE }));

/* ---- 🔴 an unmeasured check is not a finding: the coverage population, kept apart; and volume that is not real ---- */
add(coverageErrors({ coverage: COVERAGE_REGISTER, register: CONSEQUENCE_REGISTER, view, unmeasuredCodes: UNMEASURED_REASON_CODES, orderIds: [...classOrder.ranked.map((r) => r.id), ...classOrder.unranked.map((u) => u.id)] }));
add(blastRadiusErrors({ register: CONSEQUENCE_REGISTER, view, unmeasuredCodes: UNMEASURED_REASON_CODES }));
add(voidEscalationErrors({ register: CONSEQUENCE_REGISTER, superseded: SUPERSEDED_ENTRIES, view, unmeasuredCodes: UNMEASURED_REASON_CODES }));

/* ---- 🔴 Option A — three live populations and one archive; the decisions on record surfaced on the owner's report ---- */
const REPORT = join(REPO, "runs", "report", "index.html");
const registers = { register: CONSEQUENCE_REGISTER, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL };
// A finding class with NO register entry is already `missing` above; its issues landing in no population is the same
// defect seen twice, so it is reported once — under `missing`. An issue in TWO populations is always reported.
add(populationErrors({
  view,
  records: everything,
  ...registers,
  orderIds: [...classOrder.ranked.map((r) => r.id), ...classOrder.unranked.map((u) => u.id)],
  reportHtml: exists(REPORT) ? readText(REPORT, "utf8") : "",
}).filter((e) => {
  // …and the four totals falling short by exactly the issues of those classes is the same defect a third time.
  const homeless = [...view.values()].filter((v) => rec.missing.includes(v.class)).length;
  if (e.limb === "population-membership" && e.count === 0 && rec.missing.includes(e.class)) return false;
  if (e.limb === "population-sum" && homeless > 0 && e.shortfall === homeless) return false;
  return true;
}));

/* ---- the presented recommendations ---- */
const links = audit.filter((r) => r.record_type === "recommendation_evidence");
const fields = computeRecommendationFields({
  recommendations: audit.filter((r) => r.record_type === "draft_recommendation"),
  links,
  records: [...audit, ...read("runs/evidence"), ...batchJsonlFiles().flatMap((p) => createJsonlStore(p).readAll())],
  ledger: createJsonlStore(join(REPO, "runs", "cost", "ledger.jsonl")).readAll(),
  consequenceRegister: CONSEQUENCE_REGISTER,
  consequenceScale: SEVERITY_SCALE,
  classSplits: CLASS_SPLITS,
  classPopulations: Object.fromEntries([
    ...Object.keys(COVERAGE_REGISTER).map((k) => [k, "COVERAGE GAP"]),
    ...Object.keys(DECISION_REGISTER).map((k) => [k, "DECISION ON RECORD"]),
    ...Object.keys(AUDIT_TRAIL).map((k) => [k, "AUDIT TRAIL"]),
  ]),
});
const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
add(pc.errors);

// Linked classes are read from the evidence links and the stored issues here, not from the fields.
const issueById = new Map(audit.filter((r) => r.record_type === "issue").map((r) => [r.issue_id, r]));
const linkedClassesOf = (id) => [...new Set((links.filter((l) => l.recommendation_id === id).at(-1)?.issues ?? []).map((i) => issueById.get(i)).filter(Boolean).map((i) => classOf(i, CLASS_SPLITS).class))];
const recItems = fields.map((f) => ({
  id: f.recommendation_id,
  appliedClasses: f.priority.consequence.entries.map((e) => e.issue_class),
  linkedClasses: linkedClassesOf(f.recommendation_id),
  volume: f.priority.state === "DERIVED" ? Number(f.priority.basis.match(/^(\d+) search impressions/)?.[1] ?? NaN) : null,
}));
const recOrder = {
  ranked: fields
    .filter((f) => f.priority.consequenceWeightedRank.state === "DERIVED")
    .map((f) => ({ id: f.recommendation_id, ...f.priority.consequenceWeightedRank, volume: recItems.find((i) => i.id === f.recommendation_id).volume }))
    .sort((a, b) => a.rank - b.rank),
  unranked: fields.filter((f) => f.priority.consequenceWeightedRank.state !== "DERIVED").map((f) => ({ id: f.recommendation_id })),
};
add(orderErrors({ order: recOrder, items: recItems, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE }));

/* ---- Part C ---- */
for (const [id, e] of Object.entries(UNREACHABLE_RECOMMENDATIONS)) {
  if (!fields.some((f) => f.recommendation_id === id)) add([{ limb: "part-c", id, why: "a Part C entry names a recommendation the store does not hold" }]);
  if (e.level !== UNCLASSIFIED) add([{ limb: "part-c", id, why: `Part C is UNCLASSIFIED / UNKNOWN as ruled — got ${e.level}` }]);
  if (typeof e.gap !== "string" || !e.gap.trim() || !Array.isArray(e.needs) || e.needs.length === 0) add([{ limb: "part-c", id, why: "Part C must name its exact gap and what it needs before it can be executable" }]);
  if (linkedClassesOf(id).length) add([{ limb: "part-c", id, why: "its evidence now links a finding class — it is no longer unreachable, and its Part C entry is stale" }]);
}

/* ---- print ---- */
console.log("ROW 60 — CONSEQUENCE REGISTER, THE OWNER'S LAW AND THE CLASS SPLITS (14 September 2026)\n");
console.log(`SCALE, strongest first: ${SEVERITY_SCALE.map((s) => s.level).join(" > ")}   (UNCLASSIFIED is a state, not a level)`);

const all = [...view.values()];
const notRun = all.filter((v) => isUnmeasured(v, UNMEASURED_REASON_CODES));
console.log(`\nTHE STORE: ${all.length} distinct issues · ${all.filter((v) => v.verdict === "FAIL").length} FAIL (a defect found) · ${notRun.length} CHECKS THAT NEVER RAN (verdict UNKNOWN with ${UNMEASURED_REASON_CODES.join(" / ")}) · ${all.length - notRun.length - all.filter((v) => v.verdict === "FAIL").length} other UNKNOWN`);
console.log("\nTHE SPLITS — each half by its stored signal (distinct · open · not run):");
for (const s of Object.values(CLASS_SPLITS)) {
  const members = all.filter((v) => v.storedClass === s.parent);
  console.log(`  ${s.parent} — ${members.length} distinct · ${members.filter((v) => v.state === "OPEN").length} open`);
  for (const h of s.halves) {
    const m = members.filter((v) => v.class === h.class);
    console.log(`     ${h.class.padEnd(48)} ${String(m.length).padStart(4)} distinct · ${String(m.filter((v) => v.state === "OPEN").length).padStart(4)} open · ${String(m.filter((v) => isUnmeasured(v, UNMEASURED_REASON_CODES)).length).padStart(4)} not run   when ${JSON.stringify(h.when)}`);
  }
}

const four = fourWay(view, registers);
console.log(`\n🔴 FOUR POPULATIONS — every distinct issue in exactly one:`);
for (const p of POPULATIONS) console.log(`  ${p.padEnd(20)} ${String(four.totals[p]).padStart(5)} distinct · ${String(four.open[p]).padStart(5)} open`);
console.log(`  ${"= the store".padEnd(20)} ${String(POPULATIONS.reduce((n, p) => n + four.totals[p], 0)).padStart(5)} of ${four.distinct} distinct issues · unplaced ${four.unplaced}`);
for (const [k, e] of Object.entries(DECISION_REGISTER)) {
  const imp = impressionsForClass(k, { view, records: everything });
  console.log(`  DECISION ON RECORD ${k}: ${e.count} issues · ${imp.state === "MEASURED" ? `${imp.impressions} search impressions on ${imp.pagesJoined} of ${imp.pages} pages` : imp.reason} · waits on ${e.awaits}`);
}
for (const [k, e] of Object.entries(AUDIT_TRAIL)) console.log(`  AUDIT TRAIL ${k}: ${e.count} issues, none open — ${e.why}`);
const findings = all.filter((v) => CONSEQUENCE_REGISTER[v.class]);
console.log(`\n🔴 THE LIVE POPULATIONS, NEVER RANKED TOGETHER:`);
console.log(`  FINDINGS  ${findings.length} distinct issues · ${findings.filter((v) => v.state === "OPEN").length} open · ${rec.classesInUse.length} classes — each ranked by its declared consequence`);
console.log(`  COVERAGE  ${notRun.length} checks that never ran · ${Object.keys(COVERAGE_REGISTER).length} classes — never a finding, never a level, never ranked`);
const pop = populationOf(view, UNMEASURED_REASON_CODES);
for (const [k, e] of Object.entries(COVERAGE_REGISTER)) console.log(`     ${k.padEnd(46)} ${String(pop.get(k)?.notRun ?? 0).padStart(4)} (register ${e.count}) · ${e.reasonCodes.join(" / ")} · missing: ${e.missing}`);
console.log(`\nCLASSES IN USE (findings): ${rec.classesInUse.length} · register entries: ${rec.entries} · UNCLASSIFIED: ${rec.unclassified.length} · superseded: ${Object.keys(SUPERSEDED_ENTRIES).length}\n`);
console.log("CONSEQUENCE-FIRST ORDER — volume (open issues) only amplifies inside a level:");
console.log("| rank | finding class | level | open |");
console.log("|---|---|---|---|");
for (const r of classOrder.ranked) console.log(`| ${r.rank} | ${r.id} | ${r.level}${CONSEQUENCE_REGISTER[r.id]?.escalatedFrom ? ` (escalated from ${CONSEQUENCE_REGISTER[r.id].escalatedFrom})` : ""} | ${r.volume} |`);
for (const u of classOrder.unranked) console.log(`| — | ${u.id} | UNCLASSIFIED → ${u.route} | ${openByClass.get(u.id) ?? 0} |`);

console.log(`\nPRESENTED RECOMMENDATIONS CHECKED: ${pc.checked}`);
for (const f of fields) {
  const p = f.priority;
  const w = p.consequenceWeightedRank;
  const entries = p.consequence.entries.map((e) => `${e.issue_class}=${e.population ? `${e.population} (not a finding)` : e.level}`).join(", ") || "none";
  console.log(`  ${f.recommendation_id}: consequence-weighted ${w.state === "DERIVED" ? `${w.rank} of ${w.of} at ${w.level}` : `UNKNOWN → ${w.route}`} · volume rank ${p.state === "DERIVED" ? `${p.rank} of ${p.of}` : "UNKNOWN"} · basis ${p.basisKind} · entries ${entries}`);
}
for (const [id, e] of Object.entries(UNREACHABLE_RECOMMENDATIONS)) console.log(`  PART C ${id}: ${e.level} — ${e.gap} Needs: ${e.needs.join("; ")}.`);

console.log(`\n${errors.length ? "🔴" : "✅"} ERRORS: ${errors.length}`);
for (const e of errors.slice(0, 40)) console.log(`   [${e.limb}] ${e.id ?? ""} ${e.why}`);
if (errors.length > 40) console.log(`   … and ${errors.length - 40} more`);
console.log(`LIMBS TRIPPED: ${[...new Set(errors.map((e) => e.limb))].join(", ") || "none"}`);

console.log("\n🔴 UNCLASSIFIED NEVER DEFAULTS TO LOW. It is UNKNOWN, never ranked, and routed to owner review.");
const ok = errors.length === 0 && rec.ok && pc.ok;
console.log(ok ? "\n✅ the scale, the split, the register, the order and every presented priority hold" : "\n🔴 CENSUS FAILED");
process.exit(ok ? 0 : 1);
