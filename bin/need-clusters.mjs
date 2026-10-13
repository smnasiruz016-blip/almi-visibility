#!/usr/bin/env node
/**
 * 🔴 F12 · INTENT AND QUESTION CLUSTERING — one client's stored phrases and recorded questions into needs, by the grouping recorded in
 * its own research batch (acceptance _handoffs d960fa8). 🔴 NOTHING IS FETCHED and no meaning is judged here: the grouping is a recorded
 * judgement; this run holds it to its rules and refuses the whole of it when one is broken.
 *
 *   node bin/need-clusters.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--confirm]
 *
 * Read from the batch, by fixed name:
 *   search-phrases.jsonl               the stored phrase records (F11)
 *   questions.jsonl                    the recorded public questions
 *   research-derived-questions.jsonl   the recorded research-derived questions
 *   need-grouping.json               the recorded grouping: needs with their reason, maker and date; navigational wordings; no need yet
 *   need-sample.json                 (optional) which ten needs, and which of their wordings, are shown to the owner
 *   need-sample-answers.json         (optional) the owner's yes or no to each, in his own words
 * Written, only with --confirm and only into the batch's need-clusters.jsonl: one record per need, per navigational wording and for
 * "no need yet", and — when the owner's answers pass — one record per sample answer. No page, no page candidate.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { inputsOf, clusterInputs, clusterFaults, sampleItems, ownerSampleVerdict, realPopulation, PLACES } from "../src/discovery/need-clusters.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error("usage: node bin/need-clusters.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--confirm] — nothing read, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/need-clusters.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
/* every read below is of THIS batch, inside the RESEARCH store the gate decided: each names the batch directory on its own line */
const json = (name) => { try { return JSON.parse(readFileSync(join(batchDir, name), "utf8")); } catch { return null; } };
const phrases = existsSync(join(batchDir, "search-phrases.jsonl")) ? createJsonlStore(join(batchDir, "search-phrases.jsonl")).readAll() : [];
const publicQuestions = existsSync(join(batchDir, "questions.jsonl")) ? createJsonlStore(join(batchDir, "questions.jsonl")).readAll() : [];
const derivedQuestions = existsSync(join(batchDir, "research-derived-questions.jsonl")) ? createJsonlStore(join(batchDir, "research-derived-questions.jsonl")).readAll() : [];
const grouping = json("need-grouping.json");
if (grouping === null) { console.error("🔴 REFUSED — GROUPING_ABSENT: the batch holds no readable need-grouping.json; nothing is clustered without a recorded grouping; nothing written"); process.exit(3); }

const { inputs, unread } = inputsOf({ phrases, publicQuestions, derivedQuestions });
const C = clusterInputs({ inputs, unread, grouping, on: ON });
const tally = (xs) => Object.entries(xs.reduce((m, x) => ((m[x.code] = (m[x.code] ?? 0) + 1), m), {})).sort().map(([k, n]) => `${k} ${n}`).join(" · ");
console.log("F12 · INTENT AND QUESTION CLUSTERING — this subject only; the stored phrases, the recorded questions and the recorded grouping; nothing fetched · counts only");
console.log(`  inputs           ${inputs.length} read (not read ${unread.length})`);
if (C.refused.length) { console.error(`🔴 REFUSED — GROUPING_BREAKS_ITS_RULES: ${C.refused.length} refusal(s) — ${tally(C.refused)}; the whole grouping is refused; nothing written`); process.exit(3); }
const faults = clusterFaults({ records: C.records, inputs });
if (faults.length) { console.error(`🔴 REFUSED — CLUSTER_RECORDS_FAULTY: ${faults.length} fault(s) — ${tally(faults)}; nothing written`); process.exit(3); }
const n = C.counts;
console.log(`  phrases ${n.phrases} · questions ${n.questions}`);
console.log(`  places           in a need ${n.inNeed} · "${PLACES.NAVIGATIONAL}" ${n.navigational} (${n.navigationalWordings} wording(s)) · "${PLACES.NO_NEED_YET}" ${n.noNeedYet} · sum ${n.inNeed + n.navigational + n.noNeedYet} of ${n.inputs}`);
console.log(`  needs            ${n.needs} recorded (${n.needsHoldingAnInput} hold an input) · with country parts inside ${n.needsWithCountryParts} · different by a named fact ${n.needsDifferingByAFact} · a need is not a page`);
console.log(`  joins            ${Object.entries(n.joins).sort().map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`  labels           ${Object.entries(n.labels).sort().map(([k, v]) => `${k} ${v}`).join(" · ")} (a grouping is never OBSERVED)`);
console.log(`  real population  ${realPopulation({ counts: n, faults }).state}`);

const sample = json("need-sample.json"), answers = json("need-sample-answers.json");
let answerRecords = [];
if (sample === null) console.log("  owner's sample   NOT CHOSEN — no need-sample.json in the batch");
else {
  const S = sampleItems({ records: C.records, sample });
  if (S.refused.length) { console.error(`🔴 REFUSED — SAMPLE_BREAKS_ITS_RULES: ${tally(S.refused)}; nothing written`); process.exit(3); }
  const V = ownerSampleVerdict({ items: S.items, answers, on: ON });
  if (V.state === "REFUSED") { console.error(`🔴 REFUSED — OWNER_SAMPLE_NOT_PASSED: ${tally(V.refused)}; nothing written`); process.exit(3); }
  answerRecords = V.records;
  console.log(`  owner's sample   ${S.items.length} item(s) · ${V.state}${V.state === "PASSED" ? ` — yes ${V.records.filter((r) => r.answer === "yes").length} · no ${V.records.filter((r) => r.answer === "no").length} (each corrected)` : " — the row cannot pass until the owner answers"}`);
}

const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing kept"); process.exit(0); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const records = [...C.records, ...answerRecords];
const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "need-clusters.jsonl")), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_NEED_CLUSTERS", occurredAt: instant, correlationId: `run:need-clusters:${instant}`, discipline: "APPEND_IF_NEW" }));
if (!(g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED")) { console.error(`  🔴 ${g.outcome} — the cluster records did NOT persist`); process.exit(1); }
console.log(`  kept             ${records.length} record(s) handed to the batch's need-clusters store (${g.outcome}; a record already held is not written twice)`);
