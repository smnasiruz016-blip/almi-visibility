#!/usr/bin/env node
/**
 * ROW 60 — THE CONSEQUENCE REGISTER AND THE OWNER'S LAW, CHECKED OVER THE REAL STORE.
 *
 *   node bin/consequence-census.mjs          report only — it reads, prints and exits; it writes nothing
 *
 * Every limb is its own, so a sabotage can be shown to trip exactly one:
 *
 *   scale                  the scale holds levels only — no UNCLASSIFIED, UNKNOWN, INFORMATIONAL or OBSERVATION (A4)
 *   missing · stale        the register against the finding classes actually in the store, line by line
 *   entry                  a partial entry (any of the six parts), a level off the scale or unruled, a bad escalation
 *   part-c                 a recommendation no class-keyed entry can reach keeps its declared gap and stays UNCLASSIFIED
 *   cross-level-amplifier  volume ranked a weaker level above a stronger one (A3)
 *   amplifier              inside one level, less volume ranked above more (A3)
 *   unclassified-ordered   an UNCLASSIFIED consequence ranked — as low, or on any fallback (A4)
 *   nearest-class          a consequence applied a class its own evidence does not link
 *   partial                an item missing from the order, or placed twice
 *   determinism            the same evidence ordered differently when presented in a different order (A2)
 *   basis · entries · level · unclassified-ranked   every presented priority's basis and entries (Amendment 3)
 *
 * The order is checked from the REGISTER, independently of the code that produced it.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { lifecycleOf } from "../src/evidence/lifecycle.mjs";
import {
  reconcileRegister, priorityCensus, scaleErrors, consequenceFor, orderByConsequence, orderErrors, determinismErrors, UNCLASSIFIED,
} from "../src/audit/consequence.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER, UNREACHABLE_RECOMMENDATIONS } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (dir) => readdirSync(join(REPO, dir)).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, dir, f)).readAll());
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const audit = read("runs/audit");
const everything = walk(join(REPO, "runs")).sort().flatMap((p) => createJsonlStore(p).readAll());

const errors = [];
const add = (xs) => errors.push(...xs);

/* ---- the scale ---- */
add(scaleErrors(SEVERITY_SCALE));

/* ---- the register, line by line ---- */
const rec = reconcileRegister({ records: audit, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE });
add(rec.missing.map((k) => ({ limb: "missing", id: k, why: "a class in use has no register entry" })));
add(rec.stale.map((k) => ({ limb: "stale", id: k, why: "a register entry for a class not in use" })));
add(rec.invalid.map((x) => ({ limb: "entry", id: x.class, why: x.why })));
if (rec.vacuous) add([{ limb: "missing", why: "VACUOUS — no finding class is in use" }]);

/* ---- the classes, ordered consequence-first; volume = distinct issues still OPEN after every state change ---- */
const life = lifecycleOf(everything);
const openByClass = new Map();
for (const [id, i] of life.issues) {
  if ((i.state ?? "OPEN") !== "OPEN") continue;
  const k = i.issue?.issue_class;
  if (typeof k === "string") openByClass.set(k, (openByClass.get(k) ?? 0) + 1);
}
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

/* ---- the presented recommendations ---- */
const links = audit.filter((r) => r.record_type === "recommendation_evidence");
const fields = computeRecommendationFields({
  recommendations: audit.filter((r) => r.record_type === "draft_recommendation"),
  links,
  records: [...audit, ...read("runs/evidence"), ...read("runs/crawl")],
  ledger: createJsonlStore(join(REPO, "runs", "cost", "ledger.jsonl")).readAll(),
  consequenceRegister: CONSEQUENCE_REGISTER,
  consequenceScale: SEVERITY_SCALE,
});
const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
add(pc.errors);

// Linked classes are read from the evidence links here, not from the fields — the law stands outside its territory.
const issueClass = new Map(audit.filter((r) => r.record_type === "issue").map((r) => [r.issue_id, r.issue_class]));
const linkedClassesOf = (id) => [...new Set((links.filter((l) => l.recommendation_id === id).at(-1)?.issues ?? []).map((i) => issueClass.get(i)).filter(Boolean))];
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
console.log("ROW 60 — CONSEQUENCE REGISTER AND THE OWNER'S LAW (ruled 14 September 2026)\n");
console.log(`SCALE, strongest first: ${SEVERITY_SCALE.map((s) => s.level).join(" > ")}   (UNCLASSIFIED is a state, not a level)`);
console.log(`CLASSES IN USE: ${rec.classesInUse.length} · register entries: ${rec.entries} · UNCLASSIFIED: ${rec.unclassified.length}\n`);
console.log("CONSEQUENCE-FIRST ORDER — volume (open issues) only amplifies inside a level:");
console.log("| rank | finding class | level | open |");
console.log("|---|---|---|---|");
for (const r of classOrder.ranked) console.log(`| ${r.rank} | ${r.id} | ${r.level}${CONSEQUENCE_REGISTER[r.id]?.escalatedFrom ? ` (escalated from ${CONSEQUENCE_REGISTER[r.id].escalatedFrom})` : ""} | ${r.volume} |`);
for (const u of classOrder.unranked) console.log(`| — | ${u.id} | UNCLASSIFIED → ${u.route} | ${openByClass.get(u.id) ?? 0} |`);

console.log(`\nPRESENTED RECOMMENDATIONS CHECKED: ${pc.checked}`);
for (const f of fields) {
  const p = f.priority;
  const w = p.consequenceWeightedRank;
  const entries = p.consequence.entries.map((e) => `${e.issue_class}=${e.level}`).join(", ") || "none";
  console.log(`  ${f.recommendation_id}: consequence-weighted ${w.state === "DERIVED" ? `${w.rank} of ${w.of} at ${w.level}` : `UNKNOWN → ${w.route}`} · volume rank ${p.state === "DERIVED" ? `${p.rank} of ${p.of}` : "UNKNOWN"} · basis ${p.basisKind} · entries ${entries}`);
}
for (const [id, e] of Object.entries(UNREACHABLE_RECOMMENDATIONS)) console.log(`  PART C ${id}: ${e.level} — ${e.gap} Needs: ${e.needs.join("; ")}.`);

console.log(`\n${errors.length ? "🔴" : "✅"} ERRORS: ${errors.length}`);
for (const e of errors) console.log(`   [${e.limb}] ${e.id ?? ""} ${e.why}`);
console.log(`LIMBS TRIPPED: ${[...new Set(errors.map((e) => e.limb))].join(", ") || "none"}`);

console.log("\n🔴 UNCLASSIFIED NEVER DEFAULTS TO LOW. It is UNKNOWN, never ranked, and routed to owner review.");
const ok = errors.length === 0 && rec.ok && pc.ok;
console.log(ok ? "\n✅ the scale, the register, the order and every presented priority hold" : "\n🔴 CENSUS FAILED");
process.exit(ok ? 0 : 1);
