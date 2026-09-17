#!/usr/bin/env node
/**
 * ROW 5 — INTENT & QUESTION CLUSTERING, OVER THE REAL QUERY PULL IN THE STORE.
 *
 *   node bin/intent-clusters.mjs            report only — it reads, prints and exits; it writes nothing
 *   node bin/intent-clusters.mjs --check    the same, and exit 1 naming every limb that fails
 *
 * Prints both populations with their counts (and every operator row with its kind), the clusters with every
 * member's original wording, each slot type's explicit ruling, and the held-out check with its misses named.
 *
 * 🔴 The limit is printed with the result.
 */
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { row5 } from "../src/discovery/row5.mjs";
import { LEXICON } from "../config/discovery/intent-lexicon.mjs";
import { INTENT_REFERENCE, AMBIGUOUS, AMENDMENTS, REFERENCE_AUTHOR } from "../config/discovery/intent-reference.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const records = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const r = row5({ records, lexicon: LEXICON, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS });

const { population: p, heldOut: h, record } = r;
console.log("ROW 5 — INTENT & QUESTION CLUSTERING\n");
console.log(`[input: observation ${r.input.observationId} · ${r.input.method} · observed ${r.input.observedAt} · window ${r.input.window} · ${r.input.rowCount} rows]`);
console.log(`\nPOPULATION — ${p.total} query rows, every one in exactly one population`);
console.log(`  rule: ${p.rule}`);
console.log(`  HUMAN    ${p.human.length}`);
console.log(`  OPERATOR ${p.operators.length}`);
for (const o of p.operators) console.log(`    ${o.kind.padEnd(22)} impressions ${String(o.impressions).padStart(3)}  ${JSON.stringify(o.query)}`);
const kinds = {};
for (const o of p.operators) kinds[o.kind] = (kinds[o.kind] || 0) + 1;
for (const [k, n] of Object.entries(kinds)) console.log(`  ${k}: ${n} — form: ${p.operators.find((o) => o.kind === k).form}; INFERRED: ${p.operators.find((o) => o.kind === k).inference}`);

console.log(`\nREFERENCE — ${Object.keys(INTENT_REFERENCE).length} intents · ${Object.keys(AMBIGUOUS).length} ambiguous (scored in neither direction) · ${AMENDMENTS.length} amendment(s) after the first run`);
console.log(`  author: ${REFERENCE_AUTHOR}`);
for (const a of AMENDMENTS) console.log(`  amended: ${a.queries.join(" · ")} — ${a.from} → ${a.to} — broke ${a.brokenRule}`);

console.log(`\nHELD-OUT CHECK — ran: ${h.ran} · rule: ${h.rule}`);
console.log(`  in-sample ${h.inSample} queries → ${h.inSampleClusters.length} clusters · held out ${h.heldOut} · threshold ${h.threshold}`);
console.log(`  HIT ${h.hits} · MISS ${h.misses} · UNSCORED ${h.unscored}`);
for (const m of h.missed) console.log(`  🔴 MISS ${JSON.stringify(m.original)} — ${m.why}`);

const sizes = record.map((c) => c.size);
console.log(`\nRECORD — ${record.length} clusters over ${sizes.reduce((a, b) => a + b, 0)} human queries (in-sample clusters + held-out placements)`);
console.log(`  sizes: ${sizes.join(" ")}`);
console.log(`  singletons: ${sizes.filter((s) => s === 1).length} · clusters of 2+: ${sizes.filter((s) => s > 1).length}`);
for (const c of record.filter((x) => x.size > 1)) {
  console.log(`\n  ${c.id} · ${c.size} members · ${c.impressions} impressions`);
  for (const [t, v] of Object.entries(c.slots)) console.log(`    slot ${t}: ${v.length} value(s) [${v.join(", ")}] — ${c.slotRulings[t].ruling}`);
  for (const m of c.members) console.log(`    · ${JSON.stringify(m.original)}${m.heldOut ? ` [held out: ${m.placement.verdict}]` : ""}`);
}

/* 🔴 THE ACCEPTANCE COMPARISON, AND THE POPULATION IT DOES NOT JUDGE — printed together so neither can be read
 * without the other. The held-out HIT/MISS line above is the SCORER's observation; this is ACCEPTANCE. */
const rec = { merged: r.errors.filter((e) => e.limb === "record-merged").length, split: r.errors.filter((e) => e.limb === "record-split").length };
console.log(`\nFULL-REFERENCE ACCEPTANCE — the whole record against the reference (in-sample clusters + held-out placements)`);
console.log(`  distinct-intent merges: ${rec.merged} · identical-intent splits: ${rec.split}`);
console.log(`  RULE-EXCLUDED — ${r.ruleExcluded.members.length} ${r.ruleExcluded.rule}-AMBIGUOUS member(s), ${r.ruleExcluded.state}: ${r.ruleExcluded.why}`);
for (const q of r.ruleExcluded.members) console.log(`    · ${JSON.stringify(q)} — neither passed nor failed by any limb`);

console.log(`\n🔴 LIMIT: ${r.limit}`);
console.log(`\nERRORS: ${r.errors.length}`);
for (const e of r.errors) console.log(`  🔴 [${e.limb}] ${e.why}`);
if (process.argv.includes("--check") && r.errors.length) {
  console.log(`\nFAILED LIMBS: ${[...new Set(r.errors.map((e) => e.limb))].join(", ")}`);
  process.exit(1);
}
