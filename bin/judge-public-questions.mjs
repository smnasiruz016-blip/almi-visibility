#!/usr/bin/env node
/**
 * F16 · C15 · THE MEANING-JUDGEMENT ENTRY POINT (Acceptance Amendment 2, _handoffs 2a842c1; RR-157 §1).
 *
 *   node bin/judge-public-questions.mjs --tenant=<id> --actor=<id> --subject=<id> --research-batch=<id> --confirm
 *
 * 🔴 THERE IS NO DRY RUN, AND IT FETCHES NOTHING. It reads, from the subject's own declared research batch only: the items a collection run
 * HELD for judgement (held-for-judgement.jsonl), the judgements already recorded (meaning-judgements.jsonl), and the judge's drafts
 * (judgement-drafts.json — data of the batch, like its plan). Each draft is decided by src/research/meaning-judgement.mjs:
 * a judgement on the ORIGINAL POST, its reason QUOTED verbatim from that post, its judge's observer type named; CANDIDATE admits,
 * NOT_A_CANDIDATE rejects, UNKNOWN holds; residence only by quote; a second judgement only by naming the one it overturns.
 * Every judgement — admit, reject or hold — is recorded with its quote; an admitted question is appended once. Counts only.
 * Generic: it names no product, tenant, host or source.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { RECORD_TYPE } from "../src/research/public-questions.mjs";
import { decide, HELD_RECORD, JUDGEMENT_RECORD } from "../src/research/meaning-judgement.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch");
if (!SUBJECT || !BATCH) { console.error("usage: node bin/judge-public-questions.mjs --subject=<id> --research-batch=<id> --confirm — nothing read"); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.error("🔴 REFUSED — JUDGING_REQUIRES_CONFIRM: there is no dry run; nothing read"); process.exit(2); }

const SCOPE = scopedEntryPoint({ entry: "bin/judge-public-questions.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const members = lookupSubject(index, SUBJECT).entry?.members ?? [];
if (!members.some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === BATCH)) { console.error("🔴 REFUSED — BATCH_NOT_THIS_SUBJECTS: the subject does not declare this research batch"); process.exit(3); }
/* every read below is of THIS batch, inside the RESEARCH store the gate decided */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
const rows = (f) => (existsSync(join(batchDir, f)) ? createJsonlStore(join(batchDir, f)).readAll() : []);
const heldById = new Map(rows("held-for-judgement.jsonl").filter((r) => r.record_type === HELD_RECORD).map((r) => [r.held_id, r]));
const recorded = rows("meaning-judgements.jsonl").filter((r) => r.record_type === JUDGEMENT_RECORD);
const existingQuestions = new Set(rows("questions.jsonl").filter((r) => r.record_type === RECORD_TYPE).map((r) => r.question_id));
let drafts = [];
try { drafts = JSON.parse(readFileSync(join(batchDir, "judgement-drafts.json"), "utf8")); } catch { drafts = null; }
if (!Array.isArray(drafts)) { console.error("🔴 REFUSED — JUDGEMENT_DRAFTS_ABSENT: the batch holds no readable judgement-drafts.json; nothing written"); process.exit(3); }

const judgements = [], questions = [], counts = { ADMITTED: 0, REJECTED: 0, HELD: 0 }, refused = {}, judges = {};
const sofar = [...recorded];
for (const d of drafts) {
  const r = decide({ held: heldById.get(d?.heldId) ?? null, draft: d, subject: SUBJECT, recorded: sofar });
  if (r.outcome === "REFUSED") { refused[r.code] = (refused[r.code] ?? 0) + 1; continue; }
  judgements.push(r.judgement); sofar.push(r.judgement);
  counts[r.outcome] += 1;
  judges[r.judgement.value.judge.observerType] = (judges[r.judgement.value.judge.observerType] ?? 0) + 1;
  if (r.question && !existingQuestions.has(r.question.question_id)) { questions.push(r.question); existingQuestions.add(r.question.question_id); }
}

const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const append = (recs, file, action) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
  repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records: recs,
  targetClass: "GENERATED_CONFIG", action, occurredAt: instant, correlationId: `run:judge-public-questions:${instant}`, discipline: "APPEND_IF_NEW",
}));
const persisted = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
/* every judgement FIRST — admit, reject and hold alike, each with its quote — then the admitted questions */
if (judgements.length) { const g = append(judgements, "meaning-judgements.jsonl", "APPEND_MEANING_JUDGEMENTS"); if (!persisted(g)) { console.error(`  🔴 ${g.outcome} — the judgements did NOT persist; nothing else written`); process.exit(1); } }
if (questions.length) { const g = append(questions, "questions.jsonl", "APPEND_SOURCE_QUESTIONS"); if (!persisted(g)) { console.error(`  🔴 ${g.outcome} — the admitted questions did NOT persist`); process.exit(1); } }
console.log("F16 · MEANING JUDGEMENT — this tenant's subject only, judged on the original post, count-only; nothing fetched");
console.log(`  SAMPLE — judgements of one batch's held items; never every question in the world`);
console.log(`  drafts ${drafts.length} · recorded ${judgements.length} (admitted ${counts.ADMITTED} · rejected ${counts.REJECTED} · held as UNKNOWN ${counts.HELD}) · refused ${Object.values(refused).reduce((a, n) => a + n, 0)}${Object.keys(refused).length ? ` (${Object.entries(refused).map(([k, n]) => `${k} ${n}`).join(" · ")})` : ""}`);
console.log(`  judges by observer type: ${Object.entries(judges).map(([k, n]) => `${k} ${n}`).join(" · ") || "none"} — an agent's judgement is never a person's`);
console.log(`  observed questions admitted now ${questions.length} — each with its quoted reason; a reply is never an answer`);
