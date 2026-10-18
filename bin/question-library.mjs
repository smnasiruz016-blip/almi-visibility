#!/usr/bin/env node
/**
 * F50 · PROMPT AND ANSWER-QUESTION LIBRARY (acceptance _handoffs AlmiVisibility_F50_ACCEPTANCE_2026-10-18.md, RR-284; beta-g decision C).
 *
 *   node bin/question-library.mjs --subject=<id> --research-batch=<id> --capabilities=capabilities-YYYY-MM-DD.json
 *        --judgements=coverage-judgements-YYYY-MM-DD.json --on=<YYYY-MM-DD> --tenant=<id> --actor=<id>      prints counts; writes nothing
 *   ... --confirm     also keeps the library as a NEW version in the batch's question-library.jsonl when it changed (never over an old one)
 *
 * Each merged question of the batch's pages, with its original wordings (source and date), its evidence answer or DATA GAP, and — kept
 * apart — whether the product covers it, judged only from capability records found word for word in the engine's stored read of the
 * product's own page (src/research/question-library.mjs). The stored page texts are joined from the private sources root. Nothing is
 * fetched or published.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { privateSourcesRoot, withPrivateTexts } from "../src/facts/private-texts.mjs";
import { normaliseText } from "../src/facts/quote-match.mjs";
import { verifyCapabilities, buildLibrary, gapsOf, fieldCounts, nextVersionRecord, readVersions, libraryVersion, COVERAGE, ANSWER } from "../src/research/question-library.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), CAPS = arg("capabilities"), JUDGED = arg("judgements"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^capabilities-\d{4}-\d{2}-\d{2}\.json$/.test(CAPS ?? "") || !/^coverage-judgements-\d{4}-\d{2}-\d{2}\.json$/.test(JUDGED ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) {
  console.error("usage: node bin/question-library.mjs --subject=<id> --research-batch=<id> --capabilities=capabilities-YYYY-MM-DD.json --judgements=coverage-judgements-YYYY-MM-DD.json --on=<YYYY-MM-DD> [--confirm] — nothing read"); process.exit(2);
}
const CONFIRM = process.argv.includes("--confirm");
/* governed only when it may write: a counting run records nothing on the trail */
const SCOPE = scopedEntryPoint({ entry: "bin/question-library.mjs", governed: CONFIRM, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(join(batchDir, CAPS)) || !existsSync(join(batchDir, JUDGED))) { console.error("🔴 REFUSED — FILE_NOT_FILED: the batch files no such capabilities or judgements file; nothing read"); process.exit(3); }
const PRIVATE = privateSourcesRoot(process.env);
/* bound on a line that names the RESEARCH store: these are THIS research batch's own texts, decided by RESOURCES.researchBatch above */
const privateBatchDir = join(PRIVATE.dir ?? "", relative(lookupStore(index, "RESEARCH").rootPath, batchDir));
const json = (f) => JSON.parse(readFileSync(join(batchDir, f), "utf8"));
const rows = (f) => { try { return readFileSync(join(batchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const privateRows = (f) => { try { return readFileSync(join(privateBatchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };

const reads = withPrivateTexts(rows("source-reads.jsonl"), privateRows("source-reads.jsonl"), { privateRoot: PRIVATE.state });
const latest = new Map(); for (const r of reads) if (r.record_type === "source_page_read") latest.set(r.url, r);
const caps = json(CAPS).capabilities ?? [];
const v = verifyCapabilities(caps, (u) => latest.get(u) ?? null, { contains: (text, says) => normaliseText(text).includes(normaliseText(says)) });
const records = new Map(); for (const r of [...rows("questions.jsonl"), ...rows("research-derived-questions.jsonl")]) records.set(r.question_id, r);
const entries = buildLibrary({ pages: json("page-drafts.json").pages, recordOf: (id) => records.get(id) ?? null, judgements: json(JUDGED).judgements ?? [], verified: v.verified });
/* the product's own names, from the host of its own pages — never written into the engine */
const productNames = [...new Set(caps.map((c) => { try { return new URL(c.url).host.split(".")[0]; } catch { return null; } }).filter(Boolean))];
const g = gapsOf(entries, { productNames });
const fc = fieldCounts(entries);
const count = (k, s) => entries.filter((e) => e[k].state === s).length;
console.log("F50 · QUESTION LIBRARY — nothing fetched or published");
console.log(`  capabilities     ${caps.length} filed (SELF-SOURCED) · verified word for word in the stored read ${v.verified.length} · refused ${v.refused.length}${v.refused.length ? ` (${[...new Set(v.refused.map((x) => x.refused))].join(", ")})` : ""}${PRIVATE.state !== "DECLARED" ? " — the private texts are not here" : ""}`);
console.log(`  questions        ${entries.length} · wordings kept ${entries.reduce((s, e) => s + e.wordings.length, 0)} · named missing ${entries.reduce((s, e) => s + e.wordingsMissing.length, 0)}`);
console.log(`  answers          ${ANSWER.ANSWERED} ${count("answer", ANSWER.ANSWERED)} · ${ANSWER.DATA_GAP} ${count("answer", ANSWER.DATA_GAP)}`);
console.log(`  coverage         ${Object.values(COVERAGE).map((s) => `${s} ${count("coverage", s)}`).join(" · ")}`);
console.log(`  gaps             ${g.gaps.length} · answered on the product's behalf ${g.answeredForProduct.length}`);
console.log(`  fields           intent recorded ${fc.intent.recorded} · locale recorded ${fc.locale.recorded} · stage recorded ${fc.stage.recorded} (of ${entries.length}; the rest NOT RECORDED)`);
const VERSIONS = "question-library.jsonl";
const versions = readVersions(rows(VERSIONS));
const rec = nextVersionRecord(versions, entries, { on: ON });
console.log(`  version          ${libraryVersion(entries)} · stored versions ${versions.length} · ${rec ? "a NEW version" : "unchanged since the latest stored version"}`);
if (rec && CONFIRM) {
  const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
  const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const w = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, VERSIONS)), records: [rec],
    targetClass: "GENERATED_CONFIG", action: "APPEND_QUESTION_LIBRARY_VERSION", occurredAt: instant, correlationId: `run:question-library:${instant}`, discipline: "APPEND_IF_NEW" }));
  console.log(`  kept             ${w.outcome === "COMMITTED" || w.outcome === "ALREADY_COMMITTED" ? `version ${rec.version} appended to the batch's ${VERSIONS} [${w.outcome}]` : `🔴 ${w.outcome} — the version did NOT persist`}`);
  if (!(w.outcome === "COMMITTED" || w.outcome === "ALREADY_COMMITTED")) process.exitCode = 1;
}
