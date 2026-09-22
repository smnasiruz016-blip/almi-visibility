#!/usr/bin/env node
/**
 * 🔴 F05 — THE CURRENT AUTHORITY REGISTER'S PRODUCTION ENTRY POINT.
 *
 *   node bin/authority-resolve.mjs --proposition=<id> --scope=<A/B/…> [--now=YYYY-MM-DD] [--require]
 *   node bin/authority-resolve.mjs --census [--now=YYYY-MM-DD]
 *
 * Resolves over the migrated real corpus (config/authority/corpus.mjs). Prints the outcome and every candidate's
 * disposition with its reason. `--require` exits 1 unless the outcome is CURRENT: ABSENT, OPEN_CONFLICT and INVALID
 * never permit. `--census` gives every record one disposition and exits 1 unless the remainder is zero.
 * Prints ids, dispositions and hashes only — never governance prose.
 */
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { resolve, permits } from "../src/authority/register.mjs";
import { census } from "../src/authority/corpus.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const now = arg("now") ?? CORPUS_PROVENANCE.now;
console.log(`corpus: ${AUTHORITY_CORPUS.length} records · governance ${CORPUS_PROVENANCE.governanceCommit.slice(0, 12)} · engine ${CORPUS_PROVENANCE.engineCommit.slice(0, 12)} · now ${now}`);

if (process.argv.includes("--census")) {
  const c = census(AUTHORITY_CORPUS, now);
  console.log(`census: total ${c.total} · ${Object.entries(c.counts).map(([k, v]) => `${k} ${v}`).join(" · ")} · remainder ${c.remainder}`);
  process.exit(c.remainder === 0 ? 0 : 1);
}

const propositionId = arg("proposition");
const scopeArg = arg("scope");
const res = resolve({ records: AUTHORITY_CORPUS, propositionId, scope: scopeArg ? scopeArg.split("/") : null, now });
console.log(`${res.outcome} · ${propositionId ?? "(no proposition)"} · [${scopeArg ?? "(no scope)"}]`);
if (res.authority) console.log(`  authority ${res.authority.authorityIds.join(", ")} · content ${res.authority.contentHash} · effective ${res.authority.effectiveFrom}`);
for (const r of res.reasons ?? []) console.log(`  refused: ${r}`);
for (const l of res.candidates) console.log(`  ${l.disposition.padEnd(14)} ${l.authorityId} — ${l.reason}`);
if (process.argv.includes("--require") && !permits(res)) { console.log("NO CURRENT AUTHORITY — nothing may be applied, passed or defaulted"); process.exit(1); }
