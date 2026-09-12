#!/usr/bin/env node
/**
 * HISSA 3 — export the 46 records for verification, and run items 16, 17, 46.
 *
 * 🔴 IT VERIFIES NOTHING. Verification means reading an official source and
 * judging the claim, which is research and belongs to a person. This exports
 * the questions and stops.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { loadRegistry } from "../src/facts/registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { detectConflicts, freshnessOf, markForReview, createFactCache } from "../src/facts/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const out = arg("out", `${REPO}runs/export/facts-for-verification.csv`);

const { records } = await loadRegistry(`${REPO}products/almi-oet/facts`, "almi-oet");
console.log(`records: ${records.length}`);

/* ---- PART 1 — THE EXPORT ------------------------------------------------ */

/**
 * What a verifier must go and READ. My judgement of the KIND of authority —
 * never a guessed URL, and UNKNOWN where I do not know.
 */
function whatWouldVerify(f) {
  const s = f.claim?.subject ?? "";
  const p = f.claim?.predicate ?? "";
  if (/nmc|nmbi|nmcn|pnmc|hcpc/.test(s)) {
    return `the regulator's own current registration/English-language requirements page for ${s.toUpperCase()}, read on the day`;
  }
  if (s === "oet") return "OET's own official published score/format documentation";
  if (/ukvi|immigration/.test(s)) return "the government department's own current immigration guidance page";
  if (/code-of-practice/.test(s)) return "the published code of practice document itself, at its current revision";
  if (/fee|cost/.test(p)) return "the issuing body's own current fee schedule — fees change without notice";
  return "UNKNOWN";
}

function whyItMatters(f) {
  const p = f.claim?.predicate ?? "";
  if (/minimum|score|grade/.test(p)) return "a candidate who prepares to the wrong threshold fails at the gate";
  if (/fee/.test(p)) return "a wrong fee is a wrong budget and a wrong decision about whether to apply";
  if (/validity|expiry/.test(p)) return "a wrong validity window means a test sat too early or too late";
  return "it is stated to users as fact on a public page";
}

const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.split('"').join('""')}"` : s;
};

const COLUMNS = [
  "fact_id", "claim", "value", "entity", "scope_jurisdiction",
  "current_source", "verificationState", "why_it_matters", "what_would_verify_it",
];

const rows = records.map((f) => ({
  fact_id: f.id,
  claim: `${f.claim?.subject} ${f.claim?.predicate}${f.claim?.qualifier ? " (" + f.claim.qualifier + ")" : ""}`,
  value: typeof f.value?.value === "string" ? f.value.value : JSON.stringify(f.value?.value),
  entity: f.claim?.subject ?? "UNKNOWN",
  scope_jurisdiction: [f.scope, f.locale?.destination, f.locale?.profession].filter(Boolean).join(" / ") || "UNKNOWN",
  current_source: f.source?.url ?? "UNKNOWN",
  verificationState: f.verificationState,
  why_it_matters: whyItMatters(f),
  what_would_verify_it: whatWouldVerify(f),
}));

const header = [
  "# AlmiVisibility — the 46 fact records, exported for VERIFICATION.",
  "# 🔴 NONE of these has been verified. Every row is UNVERIFIED and the value is NOT a verified fact.",
  "# 🔴 Nothing here was verified by the exporter: verification means reading an official source and",
  "#    judging the claim, which is research. This file is the list of questions, not the answers.",
  "# 'what_would_verify_it' is a judgement about the KIND of authority needed — never a guessed URL.",
  `# exported: ${new Date().toISOString()}   records: ${rows.length}`,
].join("\n");

const csv = [header, COLUMNS.join(","), ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, csv, "utf8");

const unknownVerify = rows.filter((r) => r.what_would_verify_it === "UNKNOWN").length;
console.log(`\nPART 1 — exported ${rows.length} rows → ${out}`);
console.log(`  every row UNVERIFIED: ${rows.every((r) => r.verificationState === "UNVERIFIED")}`);
console.log(`  'what would verify it' = UNKNOWN on ${unknownVerify} row(s) — stated, not guessed`);
console.log(`  🔴 NOTHING WAS VERIFIED. Verification is research and it is not this tool's.`);

/* ---- PART 2 — CONFLICT AND FRESHNESS ------------------------------------ */

const conflicts = detectConflicts(records);
console.log(`\nPART 2 — CONFLICT: ${conflicts.length} claim(s) with disagreeing values`);
for (const c of conflicts.slice(0, 5)) {
  console.log(`  ${c.claimKey}`);
  for (const r of c.records) console.log(`      ${r.id} = ${JSON.stringify(r.value)}  [${r.tier}]`);
  console.log(`      → ${c.resolvedState}. ${c.why}`);
}
if (conflicts.length === 0) console.log("  none — every claim has one value across the registry");

const fresh = records.map((f) => ({ id: f.id, ...freshnessOf(f) }));
const byState = {};
for (const r of fresh) byState[r.state] = (byState[r.state] ?? 0) + 1;
console.log(`\nPART 2 — FRESHNESS: ${Object.entries(byState).map(([k, v]) => `${k}=${v}`).join("  ")}`);
for (const r of fresh.filter((x) => x.state !== "USABLE").slice(0, 4)) console.log(`  ${r.state}  ${r.id} — ${r.why}`);

/* ---- 2C — THE DEPENDENCY WALK ------------------------------------------- */

const findings = [
  ...(existsSync(`${REPO}runs/audit/findings.jsonl`) ? createJsonlStore(`${REPO}runs/audit/findings.jsonl`).readAll() : []),
];
const bad = [...conflicts.flatMap((c) => c.records.map((r) => r.id)), ...fresh.filter((f) => f.state === "STALE").map((f) => f.id)];
if (bad.length) {
  const walk = markForReview({ facts: records, findings, badFactIds: bad, reason: conflicts.length ? "INPUT_CONFLICTED" : "INPUT_STALE" });
  console.log(`\nPART 2C — DEPENDENCY WALK: ${walk.total} dependent item(s) marked for review from ${walk.seeds.length} bad fact(s)`);
} else {
  console.log("\nPART 2C — DEPENDENCY WALK: no bad facts in the registry today, so nothing to mark.");
  console.log("  ⚠️ The walk is proved by fixture, not by real data. Stated rather than implied.");
}

/* ---- PART 4 — THE CACHE -------------------------------------------------- */

let sourceLookups = 0;
const cache = createFactCache({ facts: records, onLookup: () => { sourceLookups += 1; } });
for (const f of records) {
  const c = f.claim;
  cache.get({ subject: c.subject, predicate: c.predicate, qualifier: c.qualifier, scope: f.scope });
  cache.get({ subject: c.subject, predicate: c.predicate, qualifier: c.qualifier, scope: f.scope });
}
const s = cache.stats();
console.log(`\nPART 4 — CACHE over ${records.length} facts, each requested TWICE:`);
console.log(`  hits=${s.hits}  misses=${s.misses}  hitRate=${s.hitRate === null ? "n/a" : (s.hitRate * 100).toFixed(1) + "%"}`);
console.log(`  lookups that reached the source: ${s.lookupsReachingSource}`);
console.log(`  miss reasons: ${Object.entries(s.missReasons).map(([k, v]) => `${k}=${v}`).join("  ") || "none"}`);
console.log(`  [bound: freshness windows in use = ${s.bound.freshnessWindowDays.join(", ")} days]`);
console.log(`  🔴 ${s.bound.scopeRule}`);
