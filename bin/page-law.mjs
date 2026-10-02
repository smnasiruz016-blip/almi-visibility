#!/usr/bin/env node
/**
 * THE OWNER'S PAGE LAW, AS IT GOVERNS TODAY (RR-128; RR-129 §2).
 *
 *   node bin/page-law.mjs [--now=YYYY-MM-DD]      READ-ONLY; reads the committed authority register only; writes nothing
 *
 * Prints the eight clauses, each with the record it comes from: clauses 4 and 6 from Amendment 1, the rest from the law. Refuses — exit 1,
 * nothing printed as law — when either record is not CURRENT or a carried text is not the register's record (src/governance/page-law.mjs).
 */
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { effectivePageLaw } from "../src/governance/page-law.mjs";

const now = process.argv.find((a) => a.startsWith("--now="))?.slice(6) ?? CORPUS_PROVENANCE.now;
let law;
try { law = effectivePageLaw({ records: AUTHORITY_CORPUS, now }); } catch (e) {
  console.error(`🔴 REFUSED — ${e.code ?? e.name}: ${e.message} — no law is served rather than a superseded one`);
  process.exit(1);
}
console.log(`THE OWNER'S PAGE LAW · effective on ${now} · 8 clauses`);
for (let n = 1; n <= 8; n += 1) console.log(`  ${n}. [${law[n].source}] ${law[n].text}`);
