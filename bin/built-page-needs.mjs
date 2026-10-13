#!/usr/bin/env node
/**
 * 🔴 F10 · BUILT PAGES AGAINST THEIR NEEDS — one client's built, unpublished pages checked against its stored need records (F10
 * Acceptance Amendment 4, _handoffs c063d3b). 🔴 NOTHING IS FETCHED and no meaning is judged here: "same need" is read from the need
 * records F12 stored; a pair they cannot decide is CANNOT DECIDE.
 *
 *   node bin/built-page-needs.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--confirm]
 *
 * Read from the batch, by fixed name:
 *   joined-pages.jsonl                 every stored build of the pages
 *   built-page-needs.jsonl             (when present) this entry point's own earlier records — a cancelled build is no longer a page
 *   search-phrases.jsonl, questions.jsonl, research-derived-questions.jsonl, need-grouping.json, need-clusters.jsonl
 *                                      F12's inputs, its recorded grouping and its need store: only the records of the grouping as it
 *                                      stands, each one found in the store as derived, are read as need records
 *   page-audiences.json                (optional) the audience and the audience words declared for each page, with the day declared
 * Written, only with --confirm: the pair decisions, the cancellations and the moved questions into the batch's built-page-needs.jsonl,
 * and the new build of each survivor into joined-pages.jsonl. Counts only are printed — no page, question or wording.
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
import { inputsOf, clusterInputs } from "../src/discovery/need-clusters.mjs";
import { builtPages, pageSections, needIndex, runBuiltPages, storedNeedRecords, rowResult, PUBLICATION } from "../src/page/built-page-needs.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error("usage: node bin/built-page-needs.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--confirm] — nothing read, nothing written"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/built-page-needs.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
/* every read below is of THIS batch, inside the RESEARCH store the gate decided: each names the batch directory on its own line */
const json = (name) => { try { return JSON.parse(readFileSync(join(batchDir, name), "utf8")); } catch { return null; } };
const rows = (name) => (existsSync(join(batchDir, name)) ? createJsonlStore(join(batchDir, name)).readAll() : []);
const built = rows("joined-pages.jsonl"), own = rows("built-page-needs.jsonl");
const { inputs, unread } = inputsOf({ phrases: rows("search-phrases.jsonl"), publicQuestions: rows("questions.jsonl"), derivedQuestions: rows("research-derived-questions.jsonl") });
const grouping = json("need-grouping.json");
const derived = grouping === null ? null : clusterInputs({ inputs, unread, grouping, on: ON });
const N = storedNeedRecords({ derived, stored: rows("need-clusters.jsonl") });

console.log("F10 · BUILT PAGES AGAINST THEIR NEEDS — this subject only; the stored builds and the stored need records; nothing fetched · counts only");
if (N.refused) { console.error(`🔴 REFUSED — ${N.refused}: the need records of the grouping as it stands are not all in the need store; nothing is decided without them; nothing written`); process.exit(3); }
const pages = builtPages({ records: [...built, ...own], tenantId: SCOPE.tenantId, audiences: json("page-audiences.json")?.pages ?? {} });
const ix = needIndex(N.records);
const recorded = new Map(inputs.filter((i) => i.kind === "QUESTION").map((i) => [i.inputId.slice(i.inputId.indexOf(":") + 1), i.wording]));
const S = pageSections({ pages: pages.filter((p) => p.publication === PUBLICATION.UNPUBLISHED), recorded, needOf: (q) => ix.byQuestion.get(q)?.need ?? null });
const R = runBuiltPages({ pages, needRecords: N.records, on: ON });
const row = rowResult({ sections: S, run: R });
const tally = (xs) => Object.entries(xs.reduce((m, x) => ((m[x.code] = (m[x.code] ?? 0) + 1), m), {})).sort().map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log(`  need records     ${N.records.length} of the grouping as it stands, each found in the need store`);
console.log(`  pages            ${pages.length} as they stand · not yet published ${pages.filter((p) => p.publication === PUBLICATION.UNPUBLISHED).length} · left out ${R.excluded.length} (published, or no recorded publication state)`);
console.log(`  sections         PRESENT ${S.counts.present} of ${S.counts.pages} · ABSENT ${S.counts.absent} of ${S.counts.pages} · MORE THAN ONE ${S.counts.moreThanOne} of ${S.counts.pages} · faults ${tally(S.faults)}`);
console.log(`  cancelled        ${R.cancellations.length} page(s) · questions moved ${R.moves.length} (already held by the survivor ${R.moves.filter((m) => m.alreadyHeld).length}) · decided by ${tally(R.cancellations.map((c) => ({ code: c.decidedByStep })))}`);
const c = R.result.counts;
console.log(`  after the run    pages ${c.pages} · pairs ${c.pairs} · SAME NEED ${c.same} · DIFFERENT NEED ${c.different} (of those flagged REVIEW ${c.review}) · CANNOT DECIDE ${c.cannotDecide} · refused ${tally(R.refused)}`);
console.log(`  labels           every decision INFERRED: ${R.faults.length === 0} (a decision is never OBSERVED and never made from a score)`);
console.log(`  result           ${row.result} — ${row.why}${c.review ? ` · ${c.review} REVIEW pair(s) are in the record for the owner to decide; none was cancelled` : ""}`);

const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing kept"); process.exit(0); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const append = (records, file) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_BUILT_PAGE_NEEDS", occurredAt: instant, correlationId: `run:built-page-needs:${file}:${instant}`, discipline: "APPEND_IF_NEW" }));
const kept = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
const records = [...R.decisions, ...R.cancellations, ...R.moves];
const g = append(records, "built-page-needs.jsonl");
if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the records did NOT persist`); process.exit(1); }
if (R.rebuilt.length) { const h = append(R.rebuilt, "joined-pages.jsonl"); if (!kept(h)) { console.error(`  🔴 ${h.outcome} — the survivor's new build did NOT persist`); process.exit(1); } }
console.log(`  kept             ${records.length} record(s) in the batch's built-page-needs store · ${R.rebuilt.length} new build(s) of a survivor in the page store (a record already held is not written twice)`);
