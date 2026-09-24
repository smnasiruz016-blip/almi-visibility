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
import { INTENT_REFERENCE, AMBIGUOUS, AMENDMENTS, REFERENCE_AUTHOR, REFERENCE_STATUS } from "../config/discovery/intent-reference.mjs";
import { scopedEntryPoint, RESOURCES } from "../src/tenancy/scoped-run.mjs";

/**
 * 🔴 DRAIN BEFORE EXIT — `process.exit()` tears the process down with asynchronous stdout writes
 * still pending, so the LAST thing printed is the first thing lost. On a terminal that rarely
 * shows; on a PIPE it does, and `spawnSync` gives this command a pipe.
 *
 * OBSERVED, 18 September 2026, main CI run 35292702919 on `e112cdc`: the `--check` failure branch
 * printed `FAILED LIMBS: record-split` and exited 1, and the reader received everything EXCEPT that
 * final line — while the acceptance block printed just above it arrived intact. The branch had never
 * executed on the real store before #114, because `r.errors.length` was 0; making acceptance
 * fail-capable made this latent truncation reachable, and a test depended on the line it drops.
 *
 * Same shape, same fix and the same bounded wait as `bin/build-page.mjs`'s helper (see its header):
 * the zero-length write's callback fires after every earlier write has been handled, and the timer
 * is a floor under the worst case, never a substitute for the drain. `process.exitCode` is NOT used
 * — it makes exit wait on the event loop, and a command that hangs is worse than one that truncates.
 */
const DRAIN_TIMEOUT_MS = 5000;
function exitAfterDrain(code) {
  let exited = false;
  const go = () => {
    if (exited) return;
    exited = true;
    process.exit(code);
  };
  const timer = setTimeout(go, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  process.stdout.write("", go);
}

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/intent-clusters.mjs", governed: false, repoUrl: import.meta.url, resources: [RESOURCES.evidenceStore()] });
const records = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const r = row5({ records, lexicon: LEXICON, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS, referenceStatus: REFERENCE_STATUS });

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

if (r.scoring.state === "REFUSED") {
  console.log(`\nREFERENCE — 🔴 SCORING REFUSED: ${r.scoring.code} — ${r.scoring.why}`);
  if (REFERENCE_STATUS) console.log(`  status: ${REFERENCE_STATUS.role} · retired set ${REFERENCE_STATUS.retiredSetFingerprint} (${REFERENCE_STATUS.population}) · original blob ${REFERENCE_STATUS.originalBlob} — Git history only, never evidence`);
} else {
  console.log(`\nREFERENCE — ${Object.keys(INTENT_REFERENCE).length} intents · ${Object.keys(AMBIGUOUS ?? {}).length} ambiguous (scored in neither direction) · ${AMENDMENTS.length} amendment(s) after the first run`);
  console.log(`  author: ${REFERENCE_AUTHOR}`);
  for (const a of AMENDMENTS) console.log(`  amended: ${a.queries.join(" · ")} — ${a.from} → ${a.to} — broke ${a.brokenRule}`);
}

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
if (r.scoring.state === "REFUSED") console.log(`  🔴 NOT MEASURED — ${r.scoring.code}: merges and splits cannot be counted without a lawful reference, and this is not a pass`);
else console.log(`  distinct-intent merges: ${rec.merged} · identical-intent splits: ${rec.split}`);
console.log(`  RULE-EXCLUDED — ${r.ruleExcluded.members.length} ${r.ruleExcluded.rule}-AMBIGUOUS member(s), ${r.ruleExcluded.state}: ${r.ruleExcluded.why}`);
for (const q of r.ruleExcluded.members) console.log(`    · ${JSON.stringify(q)} — neither passed nor failed by any limb`);

/* 🔴 EVERY REMAINING SPLIT, WITH THE REASON CODE ITS STRUCTURE EARNS. An UNKNOWN token is printed as UNKNOWN — this
 * runner never says what a word means. */
if (r.splitCauses === null) console.log(`\nSPLIT CAUSES — 🔴 UNAVAILABLE (${r.scoring.code}): no split can be named without a lawful reference`);
else console.log(`\nSPLIT CAUSES — ${r.splitCauses.length} split intent(s), each member standing apart with its named reason code(s)`);
for (const s of r.splitCauses ?? []) {
  console.log(`  ${s.intent} · in-sample ${s.inSample} · held out ${s.heldOut} · ${s.codes.join(" · ")}`);
  for (const a of s.apart) console.log(`    · ${JSON.stringify(a.original)} — ${a.codes.join(" · ")}${a.unknownTokens.length ? ` · UNKNOWN: ${a.unknownTokens.join(", ")}` : ""}${a.bestSimilarity === null ? "" : ` · best ${a.bestSimilarity}`}`);
}

console.log(`\n🔴 LIMIT: ${r.limit}`);
console.log(`\nERRORS: ${r.errors.length}`);
for (const e of r.errors) console.log(`  🔴 [${e.limb}] ${e.why}`);
if (process.argv.includes("--check") && r.errors.length) {
  console.log(`\nFAILED LIMBS: ${[...new Set(r.errors.map((e) => e.limb))].join(", ")}`);
  exitAfterDrain(1);
}
