#!/usr/bin/env node
/**
 * F46 · SOURCE INTEGRITY AND CITATION AUDIT — one product's registry; five checks reported separately; count-only.
 *
 *   node bin/citation-audit.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched; writes nothing
 *
 * 🔴 A WORKING LINK IS NOT A CORRECT CITATION, and FIT is a person's judgement (RR-96). Every outcome is a dated recording, not a fresh
 * check: re-checking a link or a page today needs a bounded fetch under its own authorisation (bin/source-integrity.mjs) — not run here.
 * Audit: src/facts/citation-audit.mjs.
 */
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { auditCitations, NO_DECLARED_PERSON_CHECKERS } from "../src/facts/citation-audit.mjs";

const USAGE = "node bin/citation-audit.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/citation-audit.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);

const a = auditCitations(records, { persons: NO_DECLARED_PERSON_CHECKERS });
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
const span = a.recordedOn.length ? `${a.recordedOn[0]}..${a.recordedOn.at(-1)}` : "none";
console.log("F46 · SOURCE INTEGRITY AND CITATION AUDIT — recorded registry only, count-only, five checks kept apart");
console.log(`  bound            recorded registry only · ${a.facts} active fact(s) · outcomes recorded ${span}, not re-checked · checkers declared a person: ${NO_DECLARED_PERSON_CHECKERS.length} · nothing fetched`);
console.log(`  link             ${fmt(a.link)}`);
console.log(`  quotation        ${fmt(a.quotation)}`);
console.log(`  fingerprint      ${fmt(a.fingerprint)}`);
console.log(`  authority        ${fmt(a.authority)}`);
console.log(`  fit              ${fmt(a.fit)} — recorded verdicts beside it (not a judgement): ${fmt(a.fitRecordedVerdictsBeside)}`);
console.log(`  citations        ${fmt(a.verdicts)} — a working link is not a correct citation; no score is formed`);
console.log(`  gate             a fresh re-check needs a bounded fetch under its own authorisation (bin/source-integrity.mjs) — not run`);
