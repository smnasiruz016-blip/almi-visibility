#!/usr/bin/env node
/**
 * THE CLIENT PRODUCT QUESTIONNAIRE — one product's answers, shown in plain words (owner answer A2, RR-250).
 *
 *   node bin/product-questionnaire.mjs --product=<id> --tenant=<id> --actor=<id>            every answer, in plain words
 *   node bin/product-questionnaire.mjs --product=<id> --tenant=<id> --actor=<id> --questions the four questions a client is asked
 *
 * READ-ONLY; nothing fetched or written. It prints the client's own answers to the person who must approve them — and says,
 * for each, whether it is the client's own word or INFERRED, and whether it is evidence yet. Contract: src/questionnaire/product-questionnaire.mjs.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { readProductQuestionnaire } from "../src/questionnaire/product-questionnaire-reader.mjs";
import { SECTIONS, plainWords, summarise, isApproved } from "../src/questionnaire/product-questionnaire.mjs";

const USAGE = "node bin/product-questionnaire.mjs --product=<id> [--questions]";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/product-questionnaire.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

console.log("CLIENT PRODUCT QUESTIONNAIRE — this product only; nothing fetched or written");
if (process.argv.includes("--questions")) {
  for (const [name, s] of Object.entries(SECTIONS)) console.log(`  ${name.padEnd(11)} ${s.question}`);
  process.exit(0);
}
const r = await readProductQuestionnaire(PRODUCT);
if (r.state === "NONE") { console.log("  state       NONE — this product has filed no questionnaire; nothing is assumed about it"); process.exit(0); }
if (r.state === "INVALID") {
  console.log(`  state       INVALID — ${r.faults.length} fault(s); no answer is evidence`);
  for (const f of r.faults) console.log(`    ${f.code} at ${f.path}`);
  process.exit(1);
}
const s = summarise(r.questionnaire);
console.log(`  state       READ — ${s.answers} answer(s) · evidence (APPROVED) ${r.approved} of ${s.answers} · withheld ${r.withheld} of ${s.answers}`);
for (const name of Object.keys(SECTIONS)) {
  const answers = r.questionnaire.answers.filter((a) => a.section === name);
  console.log(`  ${name} — ${answers.length} answer(s)`);
  for (const a of answers) console.log(`    [${a.basis}${isApproved(a) ? " · APPROVED" : ` · ${a.approval.state}, not evidence`}] ${plainWords(a)}`);
}
