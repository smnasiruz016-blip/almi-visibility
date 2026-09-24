#!/usr/bin/env node
/**
 * ROW 3 — KEYWORD & SEARCH-LANGUAGE DISCOVERY, THE OWNED HALF, OVER THE STORE.
 *
 *   node bin/search-language.mjs           report only — it reads, prints and exits; it writes nothing
 *   node bin/search-language.mjs --json    print the search-language records as JSON (redirect to store them)
 *   node bin/search-language.mjs --check   the report, and exit 1 naming every limb that fails
 *
 * The discovery reads ONLY the store. The comparison with the hand-written row-5 lexicon happens HERE, AFTER discovery,
 * as a measurement in both directions — never fed back, never used to tune a rule.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { discoverSearchLanguage, searchLanguageErrors, heldOutRecheck, LIMITS } from "../src/discovery/search-language.mjs";
import { keywordUrlCensus, forbiddenReferences } from "../tools/keyword-url-census.mjs";
import { loadSubjectPackage } from "../src/subject-package.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

// the repository root from this file's own path — no URL is constructed in a consumer of the search-language module
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/search-language.mjs", governed: false, resources: [RESOURCES.evidenceStore()] });
/* F02 relocation: the discovery configuration belongs to a declared SUBJECT PACKAGE, named by --subject (no default).
 * The package is located, never trusted for scope: the gate above already decided every resource this run reads. */
const SUBJECT = await loadSubjectPackage(process.argv.find((a) => a.startsWith("--subject="))?.slice("--subject=".length));
const { LEXICON } = SUBJECT.module.INTENT_LEXICON;
const STORE = join(REPO, "runs", "evidence", "evidence.jsonl");
const storeRecords = createJsonlStore(STORE).readAll();
const result = discoverSearchLanguage(storeRecords);

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

const walk = (dir, rel) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : n.endsWith(".mjs") ? [`${rel}${n}`] : []));
const sources = new Map([...walk(join(REPO, "src"), "src/"), ...walk(join(REPO, "bin"), "bin/")].map((f) => [f, readFileSync(join(REPO, f), "utf8")]));
const census = keywordUrlCensus(sources);
const lexiconRefs = forbiddenReferences(sources.get("src/discovery/search-language.mjs"), ["intent-lexicon", "intent-reference"]);
const errors = searchLanguageErrors({ records: result.records, storeRecords });
const held = heldOutRecheck(result.records, readFileSync(STORE, "utf8"));

const c = result.counts;
console.log("ROW 3 — KEYWORD & SEARCH-LANGUAGE DISCOVERY · THE OWNED HALF\n");
for (const [k, o] of Object.entries(result.input)) console.log(`[input: ${k.padEnd(12)} ${o.observation_id} · ${o.method} · ingested ${o.observed_at} · ${o.rows} rows]`);
console.log(`\noperator strings excluded from people's wording: ${result.operators.excluded} — ${result.operators.why}`);
console.log(`\nRECORDS: ${c.records} pieces of real wording, every one with a pointer to each owned row it came from`);
console.log(`  LONG_TAIL ${c.LONG_TAIL} · SYNONYM ${c.SYNONYM} · ABBREVIATION ${c.ABBREVIATION} · LOCAL ${c.LOCAL} · UNCLASSIFIED ${c.UNCLASSIFIED}  (a record may carry more than one kind)`);
console.log(`\nSYNONYMS discovered (${result.relations.synonyms.length}):`);
for (const s of result.relations.synonyms) console.log(`  ${s.words.join(" ↔ ")} — ${s.pairs} query pairs, same landing page`);
console.log(`ABBREVIATIONS discovered (${result.relations.abbreviations.length}):`);
for (const a of result.relations.abbreviations) console.log(`  ${a.short} = ${a.long} — ${a.pairs} query pair(s) sharing a landing page`);
console.log(`LOCAL words discovered (${result.relations.localWords.length}):`);
for (const l of result.relations.localWords) console.log(`  ${l.word} — ${l.country} ×${l.rows} (country share ${l.countryShare}, p ${l.probability})`);
console.log(`VARIANT forms (${result.relations.variants.length}, not one of the four kinds):`);
for (const v of result.relations.variants) console.log(`  ${v.words.join(" ↔ ")} — ${v.form}, ${v.pairs} pair(s)`);

// ── AFTER discovery: the hand-written lexicon, measured in both directions. Nothing here reaches back into the rules.
const groups = new Map();
const add = (label, surface) => { if (!surface || /[_<]/.test(surface)) return; groups.set(label, new Set([...(groups.get(label) || []), surface])); };
for (const [word, target] of Object.entries(LEXICON.synonyms)) {
  const t = Array.isArray(target) ? target.at(-1) : target;
  add(t, word);
  add(t, t);
}
for (const [from, to] of LEXICON.phrases) if (to && !to.includes(" ")) { add(to, from); add(to, to); }
// a lexicon form is "in the owned queries" only as a WHOLE word or phrase — "equiv" inside "equivalent" is not
const occurs = (m) => result.records.some((r) => ` ${r.original} `.includes(` ${m} `));
const claimed = new Set();
const groupReport = [];
for (const [label, set] of groups) {
  const members = [...set].filter(occurs).sort();
  if (members.length < 2) continue;
  const pairs = [];
  for (let i = 0; i < members.length; i += 1) for (let j = i + 1; j < members.length; j += 1) pairs.push([members[i], members[j]].sort().join(" ↔ "));
  pairs.forEach((p) => claimed.add(p));
  groupReport.push({ label, members, pairs });
}
const discovered = new Map([
  ...result.relations.synonyms.map((s) => [s.words.join(" ↔ "), "SYNONYM"]),
  ...result.relations.abbreviations.map((a) => [[a.short, a.long].sort().join(" ↔ "), "ABBREVIATION"]),
  ...result.relations.variants.map((v) => [v.words.join(" ↔ "), `VARIANT (${v.form})`]),
]);
const evidenceOnly = [...discovered].filter(([k]) => !claimed.has(k));
const lexiconOnly = [...claimed].filter((k) => !discovered.has(k)).sort();
console.log("\nTHE HAND-WRITTEN ROW-5 LEXICON, MEASURED AFTERWARDS — A FINDING, NEVER A TARGET");
console.log(`  pairs the lexicon claims (both forms occur in the owned queries): ${claimed.size}`);
console.log(`  pairs the evidence yields: ${discovered.size}`);
console.log(`  🔴 the EVIDENCE yields and the lexicon never named: ${evidenceOnly.length}`);
for (const [k, kind] of evidenceOnly) console.log(`    ${k}  [${kind}]`);
console.log(`  🔴 the LEXICON claims and the evidence does not support: ${lexiconOnly.length}`);
for (const k of lexiconOnly) console.log(`    ${k}`);
console.log(`  both: ${[...discovered.keys()].filter((k) => claimed.has(k)).length}`);
const supported = groupReport.filter((g) => g.pairs.some((p) => discovered.has(p)));
console.log(`  by lexicon GROUP (forms the lexicon maps to one canonical, at least two present): ${groupReport.length} groups · ${supported.length} with at least one evidenced pair · ${groupReport.length - supported.length} with none`);
for (const g of groupReport) console.log(`    ${g.pairs.some((p) => discovered.has(p)) ? "evidenced" : "🔴 no evidence"} — ${g.members.join(", ")}`);

console.log(`\nHELD-OUT RE-CHECK (traceability, read from the raw store text): ${held.resolved} of ${held.sample} resolve byte for byte, completely · failures ${held.failures.length}`);
for (const f of held.failures) console.log(`  🔴 ${JSON.stringify(f.original)} — ${f.why}`);
console.log(`\nKEYWORD→URL CENSUS: consumers ${census.consumers.join(", ") || "(none)"} · URL-shaped constructions in them: ${census.breaches.length}`);
for (const b of census.breaches) console.log(`  🔴 ${b.file}:${b.line} ${b.shape} — ${b.text}`);
console.log(`NO-LEXICON LAW: src/discovery/search-language.mjs names ${lexiconRefs.length ? lexiconRefs.join(", ") : "neither the row-5 lexicon nor its reference"} in code`);

console.log("\n🔴 LIMITS:");
for (const l of LIMITS) console.log(`  · ${l}`);
console.log("  · the keyword→URL census reads code: it cannot see a page written by hand, wording copied out of the records, a consumer outside src/ and bin/, a computed import, or a path held as text and run by another module");

const failures = [...errors, ...census.breaches.map((b) => ({ limb: "keyword-to-url", why: `${b.file}:${b.line} ${b.shape}` })), ...lexiconRefs.map((r) => ({ limb: "lexicon-referenced", why: `the discovery module names ${r}` })), ...held.failures.map((f) => ({ limb: "held-out", why: `${f.original}: ${f.why}` }))];
console.log(`\nERRORS: ${failures.length}`);
for (const e of failures) console.log(`  🔴 [${e.limb}] ${e.why}`);
if (process.argv.includes("--check") && failures.length) {
  console.log(`\nFAILED LIMBS: ${[...new Set(failures.map((e) => e.limb))].join(", ")}`);
  process.exit(1);
}
