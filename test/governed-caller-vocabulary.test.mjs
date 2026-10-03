/**
 * 🔴 F08 §3 · THE CALLER CENSUS'S SITE VOCABULARY — GROUNDED IN EXECUTION, AND SEEN TO REFUSE.
 *
 * The census now calls a ledger "handed to the boundary", "only read", or a store "a collector" rather than a write.
 * Those are claims about what the real modules DO, so they are measured here by running the real modules under an
 * instrumented filesystem — with a positive control proving the instrument sees a real write at all. Then every
 * control §3 names is planted as a FIXED INPUT (in memory, never in bin/) and the census must name it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createJsonlStore, createDryRunStore } from "../src/evidence/store.mjs";
import { createCostLedger, COST_ENTRY_TYPE } from "../src/cost/ledger.mjs";
import {
  census, bypasses, auditStoreExempt, nonMutating, classifySite, writeSitesOf, derivedWriterExports, WRITER_NAMES, CALLER_CLASSES, SITE_CLASSES,
} from "../tools/governed-caller-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* ── THE INSTRUMENT ── every filesystem mutation primitive, counted while `fn` runs, restored in finally. */
const MUTATORS = ["writeFileSync", "appendFileSync", "mkdirSync", "rmSync", "renameSync", "unlinkSync", "copyFileSync", "cpSync", "createWriteStream", "rmdirSync"];
function mutationsDuring(fn) {
  const orig = Object.fromEntries(MUTATORS.map((m) => [m, fs[m]]));
  const seen = [];
  try {
    for (const m of MUTATORS) fs[m] = (...a) => { seen.push(m); return orig[m](...a); };
    syncBuiltinESMExports();
    fn();
  } finally {
    for (const m of MUTATORS) fs[m] = orig[m];
    syncBuiltinESMExports();
  }
  return seen;
}
const probeDir = () => fs.mkdtempSync(join(tmpdir(), "vocab-probe-"));
const measurement = (k) => ({ record_type: "observation", measurement_key: k, observation_id: `o-${k}` });
const costEntry = (id) => ({ record_type: COST_ENTRY_TYPE, entry_id: id });

test("V1 · EXECUTION: constructing, reading and collecting write NOTHING — and the instrument DOES see a real write", () => {
  const d = probeDir();
  try {
    const ledgerPath = join(d, "sub", "ledger.jsonl");
    const storePath = join(d, "sub2", "store.jsonl");
    assert.deepEqual(mutationsDuring(() => createCostLedger(ledgerPath)), [], "constructing a ledger wrote");
    assert.deepEqual(mutationsDuring(() => createCostLedger(ledgerPath).readAll()), [], "reading an absent ledger wrote");
    assert.deepEqual(mutationsDuring(() => createJsonlStore(storePath)), [], "constructing a store wrote");
    assert.deepEqual(mutationsDuring(() => {
      const c = createDryRunStore(storePath);
      c.appendIfNew(measurement("a")); c.appendIfNew(measurement("a")); c.appendWithoutDedupe({ record_type: "run" }); c.appendAllWithoutDedupe([{ record_type: "run" }]);
    }), [], "a collector's appends wrote");
    // POSITIVE CONTROLS — the same instrument, a real write: it must be seen, or every zero above is worthless.
    const realStore = mutationsDuring(() => createJsonlStore(storePath).appendWithoutDedupe({ record_type: "run" }));
    assert.ok(realStore.includes("appendFileSync"), `a real store append was not seen: ${realStore}`);
    const realLedger = mutationsDuring(() => createCostLedger(ledgerPath).append(costEntry("e1")));
    assert.ok(realLedger.includes("appendFileSync"), `a real ledger append was not seen: ${realLedger}`);
    // and reading a ledger that now EXISTS still writes nothing
    assert.deepEqual(mutationsDuring(() => createCostLedger(ledgerPath).readAll()), []);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test("V2 · the writer vocabulary is DERIVED from src/ — it holds the two writers the hand-written list missed, and it finds a planted one", () => {
  for (const n of ["runReplayPass", "createPaidProviderGate", "createCostLedger", "runIngest", "runRobotsAndDnsAudit", "persistCrawlObservations", "recordCandidates", "auditAuthorityMigration"]) {
    assert.ok(WRITER_NAMES.includes(n), `${n} is not in the derived writer vocabulary`);
  }
  assert.ok(!WRITER_NAMES.some((n) => /^governed|executeGovernedWrite/.test(n)), "a boundary helper was counted as a writer");
  // CONTROL — a fixed input: a new writer, and a function that writes only by calling it, must both be found.
  const files = { "src/zz/a.mjs": "export function plantedWriter(store, r) {\n  store.append(r);\n}\nexport function innocent(x) {\n  return x;\n}\n", "src/zz/b.mjs": "export function wrapsIt(store) {\n  return plantedWriter(store, {});\n}\n" };
  const found = derivedWriterExports({ files: Object.keys(files), read: (f) => files[f] }).map((w) => w.name);
  assert.deepEqual(found, ["plantedWriter", "wrapsIt"]);
});

/* ── FIXED-INPUT PLANTS ── one synthetic entry point each; nothing is written into bin/. */
const HEAD = 'import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";\nconst permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));\n';
const plant = (name, body) => ({ file: `bin/zz-vocab-${name}.mjs`, text: HEAD + body });
const row = (src) => census({ sources: [src] })[0];

test("V3 · §3 CONTROL 1 — a planted DIRECT durable write is NAMED, as a bypass", () => {
  const r = row(plant("direct", 'import { writeFileSync } from "node:fs";\nif (permission.mayWrite) writeFileSync("runs/generated/x.json", "{}");\n'));
  assert.equal(r.callerClass, "DIRECT_DURABLE_WRITE");
  assert.equal(bypasses([r]).length, 1);
  assert.equal(r.siteDetail[0].cls, "DIRECT_DURABLE_WRITE");
});

test("V4 · §3 CONTROL 2 — a PARTIALLY routed caller is NAMED: one boundary call cannot hide a surviving direct write", () => {
  const r = row(plant("partial", 'import { writeFileSync } from "node:fs";\nimport { executeGovernedWrite } from "../src/governance/governed-write.mjs";\nimport { governedFileWrite } from "../src/governance/governed-run.mjs";\nexecuteGovernedWrite(governedFileWrite({ repo: ".", permission, target: "runs/a.json", targetClass: "RUN_EVIDENCE", bytes: "{}", action: "A", occurredAt: "2026-09-23T00:00:00Z", correlationId: "c" }));\nif (permission.mayWrite) writeFileSync("runs/b.json", "{}");\n'));
  assert.equal(r.callerClass, "PARTIALLY_ROUTED");
  assert.equal(r.directSites, 1);
  assert.equal(r.routed, false);
  assert.equal(bypasses([r]).length, 1);
});

test("V5 · §3 CONTROL 3 — a NON-audit caller that claims the audit-store exemption is REJECTED, in every shape", () => {
  const shapes = {
    "an audit-store writer handed an ordinary store": 'import { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";\nimport { createJsonlStore } from "../src/evidence/store.mjs";\nconst ev = writeGateEvent({});\nrecordCandidates({ store: createJsonlStore("runs/x.jsonl"), candidates: [] });\n',
    "a real audit store PLUS a durable write": 'import { writeFileSync } from "node:fs";\nimport { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";\nimport { productionAuditStore } from "../src/audit-trail/wiring.mjs";\nconst ev = writeGateEvent({});\nrecordCandidates({ store: productionAuditStore({ repo: "." }), candidates: [] });\nwriteFileSync("runs/x.json", "{}");\n',
    "an exemption DECLARED in a comment": '// CHECKED_AUDIT_STORE_EXEMPTION — audit-store internal write\nimport { writeFileSync } from "node:fs";\nwriteFileSync("runs/x.json", "{}");\n',
    /* The dangerous one: a caller that ALSO reaches the boundary needs no file-level condition A for an audit-store
     * site, so only the site rule stands between an arbitrary `.store` and a routed verdict. */
    "a ROUTED caller whose audit-store writer is handed an arbitrary `.store`": 'import { executeGovernedWrite } from "../src/governance/governed-write.mjs";\nimport { recordCandidates } from "../src/audit-trail/recorder.mjs";\nexecuteGovernedWrite(x);\nrecordCandidates({ store: other.store, candidates: [] });\n',
    "an arbitrary `.store` property handed in as the audit store": 'import { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";\nconst ev = writeGateEvent({});\nrecordCandidates({ store: other.store, candidates: [] });\n',
    "<x>.audit.store where <x> is not a governed helper": 'import { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";\nconst ctx = somethingElse();\nconst ev = writeGateEvent({});\nrecordCandidates({ store: ctx.audit.store, candidates: [] });\n',
    "the write-gate event AFTER the mutation": 'import { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";\nimport { productionAuditStore } from "../src/audit-trail/wiring.mjs";\nrecordCandidates({ store: productionAuditStore({ repo: "." }), candidates: [] });\nconst ev = writeGateEvent({});\n',
  };
  for (const [label, body] of Object.entries(shapes)) {
    const r = row(plant(label.replace(/\W+/g, "-").slice(0, 30), body));
    assert.equal(r.auditStoreExempt, false, `${label}: the exemption was granted`);
    assert.equal(bypasses([r]).length, 1, `${label}: not counted as a bypass (${r.callerClass})`);
  }
  // CONTROL — the real exempt caller still earns it, so the refusals above are about the shapes, not a dead rule.
  const real = census().find((x) => x.file === "bin/audit-trail.mjs");
  assert.equal(real.callerClass, "CHECKED_AUDIT_STORE_EXEMPTION");
  assert.equal(real.auditStoreExempt, true);
});

test("V6 · the SITE rule, both directions, on fixed inputs — constructor, collector, scratch, unknown, and a string that only NAMES a writer", () => {
  const cases = [
    ["ledger handed to the boundary", 'import { executeGovernedWrite } from "../src/governance/governed-write.mjs";\nexecuteGovernedWrite(governedStoreAppend({\n  repo: ".", permission, store: createCostLedger("runs/cost/l.jsonl"), records: [],\n}));\n', "BOUNDARY_ROUTED"],
    ["ledger appended to directly", 'const L = createCostLedger("runs/cost/l.jsonl");\nL.append({});\n', "DIRECT_DURABLE_WRITE"],
    ["ledger only read", 'const n = createCostLedger("runs/cost/l.jsonl").readAll().length;\n', "READ_ONLY"],
    ["ledger handed to something unknown", 'const L = createCostLedger("runs/cost/l.jsonl");\nmystery(L);\n', "UNKNOWN"],
    ["library writer given a collector", 'const store = createDryRunStore("runs/e.jsonl");\nawait runIngest({ store, days: 1 });\n', "COLLECTOR_OR_LIBRARY_WRITE"],
    ["library writer given a durable store", 'const store = createJsonlStore("runs/e.jsonl");\nawait runIngest({ store, days: 1 });\n', "DIRECT_DURABLE_WRITE"],
    ["library writer given an OS-scratch store", 'const tmp = mkdtempSync(join(tmpdir(), "x-"));\nconst s = createJsonlStore(join(tmp, "a.jsonl"));\nawait runReplayPass({ store: s });\n', "COLLECTOR_OR_LIBRARY_WRITE"],
    ["removing OS scratch this process minted", 'const tmp = mkdtempSync(join(tmpdir(), "x-"));\nrmSync(tmp, { recursive: true });\n', "SCRATCH_OUTSIDE_REPOSITORY"],
    ["removing a repository directory", 'const tmp = join(REPO, "runs", "x");\nrmSync(tmp, { recursive: true });\n', "DIRECT_DURABLE_WRITE"],
  ];
  for (const [label, body, want] of cases) {
    const text = HEAD + body;
    const sites = writeSitesOf(text);
    assert.ok(sites.length >= 1, `${label}: the site was not even seen`);
    const got = sites.map((s) => classifySite(text, s).cls);
    assert.ok(got.includes(want), `${label}: expected ${want}, got ${got.join(", ")}`);
  }
  // 🔴 UNKNOWN FAILS CLOSED: a caller holding an unsettled site is counted as a bypass, never as routed or quiet.
  const unknown = row(plant("unknown", 'import { executeGovernedWrite } from "../src/governance/governed-write.mjs";\nexecuteGovernedWrite(x);\nconst L = createCostLedger("runs/cost/l.jsonl");\nmystery(L);\n'));
  assert.equal(unknown.callerClass, "UNKNOWN");
  assert.equal(bypasses([unknown]).length, 1, "an UNKNOWN caller was not counted as a bypass");
  // A writer NAMED inside a string is not a use of the ledger: the census once read `ledger${…}` as one.
  const text = HEAD + 'import { executeGovernedWrite } from "../src/governance/governed-write.mjs";\nconst ledger = createCostLedger("runs/cost/l.jsonl");\nconsole.log(`ledger${permission.mayWrite ? "" : " [dry-run]"}`);\nexecuteGovernedWrite(governedStoreAppend({\n  repo: ".", permission, store: ledger, records: [],\n}));\n';
  const s = writeSitesOf(text).find((x) => /createCostLedger/.test(x.text));
  assert.equal(classifySite(text, s).cls, "BOUNDARY_ROUTED");
  assert.equal(classifySite(text.replace("console.log(`ledger${", "record(ledger, `${"), s).cls, "UNKNOWN", "control: a real use beside it must not be ignored");
});

test("V7 · the REAL population: 46 governed = 45 routed + 1 checked exemption + 0 non-mutating + 0 bypass, remainder 0 — every collector's caller commits through the boundary", () => {
  const rows = census();
  const governed = rows.filter((r) => r.cls === "GOVERNED_STATE_CHANGE");
  /* 58/40 → 59/41 on 23 September, for a MEASURED reason: F07 added one production entry point,
   * bin/heldout-evaluation.mjs, whose every write is an audit event — it earns the checked audit-store exemption by
   * the same two derived conditions as bin/audit-trail.mjs. No existing caller moved class.
   * 59/41 → 60/42 on 24 September, for a MEASURED reason: F01 added one production entry point,
   * bin/project-intake.mjs, which writes declarations only through the boundary (BOUNDARY_ROUTED). No existing caller
   * moved class.
   * 60/42 → 61/43 on 24 September (F02 post-merge), for a MEASURED reason: one production entry point,
   * bin/declare-attachment.mjs, which writes a structurally proved attachment only through the boundary
   * (BOUNDARY_ROUTED). No existing caller moved class.
   * 61/43 → 62/44 on 25 September (F02 disposition), for a MEASURED reason: one production entry point,
   * bin/retire-attachment.mjs, which retires an attachment proved unlawful only through the boundary (BOUNDARY_ROUTED).
   * No existing caller moved class.
   * 62/44 → 63/45 on 25 September (F04), for a MEASURED reason: one production entry point, bin/approval.mjs, which
   * records an approval event only through the boundary (BOUNDARY_ROUTED). No existing caller moved class.
   * 63/45 → 65/46 on 27 September (F10 selection and packet), for a MEASURED reason: two production entry points.
   * bin/f10-select.mjs seals the one selection only through the boundary (BOUNDARY_ROUTED). bin/f10-label.mjs is
   * READ_ONLY_DIAGNOSTIC: it writes only the owner's own progress into storage S — never a governed engine store and never
   * the audit trail, so a label never enters the trail. No existing caller moved class. */
  /* 65/46 → 66/47 on 28 September (Part D1), for a MEASURED reason: one production entry point, bin/f10-register-key.mjs, whose
   * one write (the governed key measurement) goes only through the boundary (BOUNDARY_ROUTED). No existing caller moved class. */
  /* 66/47 → 67/47 on 29 September (F21, RR-86), for a MEASURED reason: one production entry point, bin/indexability-audit.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partitions and prints counts; it writes nothing and records nothing. No existing
   * caller moved class. */
  /* 67/47 → 68/47 on 29 September (F35, RR-88), for a MEASURED reason: one production entry point, bin/page-actions.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partitions and the shared robots store and prints counts; it writes nothing and
   * records nothing. No existing caller moved class. */
  /* 68/47 → 69/47 on 29 September (F32, RR-87), for a MEASURED reason: one production entry point, bin/page-duplication.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partitions and prints counts; it writes nothing and records nothing. No existing
   * caller moved class. */
  /* 69/47 → 70/47 on 29 September (F39, RR-90), for a MEASURED reason: one production entry point, bin/page-information-gain.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partitions and prints counts; it writes nothing and records nothing. No existing
   * caller moved class. */
  /* 70/47 → 71/47 on 29 September (F41, RR-87 continuous build), for a MEASURED reason: one production entry point,
   * bin/page-briefs.mjs, READ_ONLY_DIAGNOSTIC — it reads one client's partitions and the shared robots store and prints counts; it
   * writes nothing and records nothing. No existing caller moved class. */
  /* 71/47 → 72/47 on 29 September (F43, RR-91), for a MEASURED reason: one production entry point, bin/page-decay.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partitions and the shared evidence store and prints counts; it writes nothing and
   * records nothing. No existing caller moved class. */
  /* 72/47 → 73/47 on 29 September (F82, RR-92), for a MEASURED reason: one production entry point, bin/page-indexation.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partitions and the shared evidence store and prints counts; it writes nothing and
   * records nothing. No existing caller moved class. */
  /* 73/47 → 74/47 on 29 September (F48, RR-92), for a MEASURED reason: one production entry point, bin/page-structured-data.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partitions and prints counts; it writes nothing and records nothing. No existing
   * caller moved class. */
  /* 74/47 → 75/47 on 29 September (F78, RR-93), for a MEASURED reason: one production entry point, bin/cost-by-tenant.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads the recorded cost ledgers and prints one tenant's totals; it writes nothing and records nothing.
   * No existing caller moved class. */
  /* 75/47 → 76/47 on 29 September (F79, RR-93 continuous build), for a MEASURED reason: one production entry point,
   * bin/evidence-cache.mjs, READ_ONLY_DIAGNOSTIC — it reads the evidence store and prints one tenant's cache answers; it writes nothing
   * and records nothing. No existing caller moved class. */
  /* 76/47 → 77/47 on 29 September (F55, RR-93 continuous build), for a MEASURED reason: one production entry point,
   * bin/ai-crawler-access.mjs, READ_ONLY_DIAGNOSTIC — it reads one client's partitions and the robots store and prints counts; it
   * fetches nothing, writes nothing and records nothing. No existing caller moved class. */
  /* 77/47 → 78/47 on 30 September (F45, RR-94), for a MEASURED reason: one production entry point,
   * bin/fact-health.mjs, READ_ONLY_DIAGNOSTIC — it reads one product's fact registry and prints counts on a stated date; it
   * fetches nothing, writes nothing and records nothing. No existing caller moved class. */
  /* 78/47 → 79/47 on 30 September (F26, RR-95), for a MEASURED reason: one production entry point, bin/accessibility.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's stored bodies and prints counts; it fetches, renders, writes and records nothing.
   * No existing caller moved class. */
  /* 79/47 → 80/47 on 30 September (F46, RR-96), for a MEASURED reason: one production entry point, bin/citation-audit.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one product's fact registry and prints counts; it fetches, writes and records nothing.
   * No existing caller moved class. */
  /* 80/47 → 81/47 on 30 September (F47, RR-96), for a MEASURED reason: one production entry point, bin/entity-map.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one product's registry and one client's stored bodies and prints counts; it fetches, writes and
   * records nothing. No existing caller moved class. */
  /* 81/47 → 82/47 on 30 September (F20, RR-96), for a MEASURED reason: one production entry point, bin/url-audit.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's crawl partition, stored bodies and link edges and prints counts; it fetches, writes and
   * records nothing. No existing caller moved class. */
  /* 82/47 → 83/47 on 30 September (F29, RR-96), for a MEASURED reason: one production entry point, bin/issue-priority.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partition, the recorded findings and its owned page rows and prints counts; it fetches,
   * writes and records nothing. No existing caller moved class. */
  /* 83/47 → 84/47 on 30 September (F73, RR-97), for a MEASURED reason: one production entry point, bin/recommendation-explain.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads the recorded recommendations and audit stores and prints counts; it fetches, writes and records
   * nothing. No existing caller moved class. */
  /* 84/47 → 85/47 on 30 September (F90, RR-102), for a MEASURED reason: one production entry point, bin/finding-falsifiability.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads the tracked findings stores and the registered checks and prints counts; it fetches, re-runs,
   * writes and records nothing. No existing caller moved class. */
  /* 85/47 → 86/47 on 30 September (F75, RR-103), for a MEASURED reason: one production entry point, bin/task-tickets.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partition, the tracked findings stores and the registered checks and prints counts;
   * it fetches, re-runs, writes, files, sends and records nothing. No existing caller moved class. */
  /* 86/47 → 87/47 on 1 October (F23, RR-111), for a MEASURED reason: one production entry point, bin/link-audit.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's crawl partition and stored bodies and prints counts; it fetches, renders, follows,
   * writes and records nothing. No existing caller moved class. */
  /* 87/47 → 88/47 on 1 October (F27, RR-111), for a MEASURED reason: one production entry point, bin/transport-security.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's crawl partition and stored bodies and prints counts; it fetches, renders, writes and
   * records nothing. No existing caller moved class. */
  /* 88/47 → 89/47 on 1 October (F91, RR-113), for a MEASURED reason: one production entry point, bin/page-opportunities.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one product's descriptor and fact registry and prints counts; it fetches, renders, writes and
   * records nothing. No existing caller moved class. */
  /* 89/47 → 90/47 on 1 October (F44, RR-113 §9), for a MEASURED reason: one production entry point, bin/fact-supply.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one product's fact registry and prints counts; it fetches, re-checks, writes and records
   * nothing. No existing caller moved class. */
  /* 90/47 → 91/47 on 1 October (F16, RR-114), for a MEASURED reason: one production entry point, bin/public-questions.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's named research batches through its partition and prints counts; it fetches,
   * harvests, writes and records nothing. No existing caller moved class. */
  /* 91/47 → 92/48 on 1 October (RR-116), for a MEASURED reason: one production entry point, bin/observe-question.mjs, a GOVERNED
   * writer routed through the boundary (BOUNDARY_ROUTED) — it appends a person's public-question observations into the client's own
   * declared research batch. No existing caller moved class. */
  /* 92/48 → 93/49 on 1 October (RR-118), for a MEASURED reason: one production entry point, bin/source-intake.mjs, a GOVERNED writer
   * routed through the boundary (BOUNDARY_ROUTED) — it keeps one retrieval from one ADMITTED source in the client's own research batch.
   * No existing caller moved class. */
  /* 93/49 → 94/49 on 2 October (RR-129 §2), for a MEASURED reason: one production entry point, bin/page-law.mjs, READ_ONLY_DIAGNOSTIC —
   * it prints the owner's effective page law from the authority register; it reads no store, writes nothing and records nothing. No
   * existing caller moved class. (An earlier edit this round reverted this pin on a wrong belief that the census skips it; the full
   * suite measured 94.) */
  /* 94/49 → 95/49 on 2 October (F87, RR-129 §4), for a MEASURED reason: one production entry point, bin/watchman.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads the recorded cost ledger, evidence store, run stores, crawl batch and trail and prints counts; it
   * fetches, runs, retries, sends, writes and records nothing. No existing caller moved class. */
  /* 95/49 → 96/49 on 2 October (F87, RR-130 §2), for a MEASURED reason: one production entry point, bin/operations-overview.mjs,
   * READ_ONLY_DIAGNOSTIC — the engine operator's cross-tenant overview: F04-authorised at GLOBAL_PRODUCT scope, it prints counts and
   * state codes only; it fetches, writes and records nothing. No existing caller moved class. */
  /* 96/49 → 97/49 on 2 October (F13, RR-131 §3), for a MEASURED reason: one production entry point, bin/context-axes.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one product's registry and its tenant's crawl partition and prints dimension keys and counts; it
   * fetches, writes and records nothing. No existing caller moved class. */
  /* 97/49 → 98/49 on 2 October (F81, RR-132 §3), for a MEASURED reason: one production entry point, bin/search-performance.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's partition of the owned Search Console store and prints counts and rates; it pulls,
   * fetches, writes and records nothing. No existing caller moved class. */
  /* 98/49 → 99/49 on 2 October (F22, RR-137 §3), for a MEASURED reason: one production entry point, bin/render-audit.mjs,
   * READ_ONLY_DIAGNOSTIC — it renders one client's stored pages and prints source-against-render counts; it writes and records
   * nothing, and is offline unless a reviewed bounded request gives it --live-render. No existing caller moved class. */
  /* 99/49 → 100/49 on 2 October (F25, RR-137 §4), for a MEASURED reason: one production entry point, bin/mobile-audit.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one client's stored pages, renders them at declared viewports and prints counts; it writes and
   * records nothing, and is offline unless a reviewed bounded request gives it --live-render. No existing caller moved class. */
  /* 100/49 → 101/50 on 2 October (RR-138 §2), for a MEASURED reason: one production entry point, bin/render-collect.mjs,
   * GOVERNED_STATE_CHANGE, ROUTED — the shared live render collection; it writes its evidence and bodies only through the governed
   * boundary (APPEND_RENDER_EVIDENCE, WRITE_RENDER_BODY), and only on the owner's reviewed GREEN. No existing caller moved class. */
  /* 101/50 → 102/50 on 3 October (F16, RR-146 §2), for a MEASURED reason: one production entry point, bin/research-routes.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one product's F13 axes and fact registry and prints route, applicability and plan counts; it fetches,
   * writes and records nothing. No existing caller moved class (bin/source-intake.mjs's route mode stays GOVERNED, ROUTED). */
  /* 102/50 → 103/50 on 3 October (F62, RR-149 §5), for a MEASURED reason: one production entry point, bin/applicability.mjs,
   * READ_ONLY_DIAGNOSTIC — it reads one product's F13 axes and fact registry and prints the derived declaration's counts; it fetches,
   * writes and records nothing (head CI 37144288646 on dc53932 went red on this pin: 103 !== 102). No existing caller moved class. */
  /* 103/50 → 104/51 on 3 October (F62, RR-150 §3), for a MEASURED reason, moved in the SAME commit as the change: one production entry
   * point, bin/applicability-assess.mjs, GOVERNED — it writes PROPOSED applicability assessments and confirmations into a research batch's
   * applicability store only through the governed boundary (APPEND_APPLICABILITY_ASSESSMENTS), only with --confirm. No existing caller
   * moved class. */
  /* 104/51 → 105/52 on 4 October (F91, RR-153 §4), for a MEASURED reason, moved in the SAME commit as the change: one production entry
   * point, bin/demand-connect.mjs, GOVERNED — it writes question-to-page-candidate connections into a research batch's planning store only
   * through the governed boundary (APPEND_PLANNING_DEMAND), only with --confirm. No existing caller moved class. */
  assert.equal(rows.length, 105);
  assert.equal(governed.length, 52);
  assert.equal(rows.filter((r) => r.cls === "READ_ONLY_DIAGNOSTIC").length, 53);
  const by = Object.fromEntries(CALLER_CLASSES.map((c) => [c, governed.filter((r) => r.callerClass === c).length]));
  /* 43/2 → 44/1 on 26 September (F10), for a MEASURED reason: bin/heldout-evaluation.mjs now routes its scoring run through the
   * boundary (BOUNDARY_ROUTED); no entry point was added and no other caller moved class. */
  /* 44/1 → 45/1 on 27 September: bin/f10-select.mjs (BOUNDARY_ROUTED) joined; no other caller moved class. */
  /* 45/1 → 46/1 on 28 September: bin/f10-register-key.mjs (BOUNDARY_ROUTED) joined; bin/heldout-evaluation.mjs stays BOUNDARY_ROUTED. */
  /* 49 → 50 BOUNDARY_ROUTED on 3 October (RR-150): bin/applicability-assess.mjs, the one new governed caller above */
  /* 50 → 51 BOUNDARY_ROUTED on 4 October (RR-153): bin/demand-connect.mjs, the one new governed caller above */
  assert.deepEqual(by, { BOUNDARY_ROUTED: 51, DIRECT_DURABLE_WRITE: 0, COLLECTOR_OR_LIBRARY_WRITE: 0, CHECKED_AUDIT_STORE_EXEMPTION: 1, READ_ONLY: 0, PARTIALLY_ROUTED: 0, UNKNOWN: 0 });
  assert.equal(bypasses(rows).length, 0);
  assert.equal(governed.filter((r) => r.routed).length + auditStoreExempt(rows).length + nonMutating(rows).length + bypasses(rows).length, governed.length);
  const sites = governed.flatMap((r) => r.siteDetail.map((s) => ({ ...s, file: r.file, reaches: r.reachesBoundary })));
  assert.equal(sites.filter((s) => s.cls === "DIRECT_DURABLE_WRITE" || s.cls === "UNKNOWN").length, 0);
  for (const s of sites.filter((x) => x.cls === "COLLECTOR_OR_LIBRARY_WRITE")) assert.ok(s.reaches, `${s.file}:${s.line} collects, but its caller never reaches the boundary`);
  assert.ok(sites.every((s) => SITE_CLASSES.includes(s.cls)));
});

test("V8 · the plants never touched the repository — bin/ holds no planted file, and the census's real sources are unchanged", () => {
  const status = execFileSync("git", ["-C", REPO, "status", "--porcelain", "bin"], { encoding: "utf8" });
  assert.ok(!/zz-vocab-/.test(status), "a planted entry point reached the working tree");
  const tracked = execFileSync("git", ["-C", REPO, "ls-files", "bin"], { encoding: "utf8" });
  assert.ok(!/zz-vocab-/.test(tracked));
  const hash = (f) => createHash("sha256").update(fs.readFileSync(join(REPO, f))).digest("hex");
  const blob = (f) => createHash("sha256").update(execFileSync("git", ["-C", REPO, "show", `HEAD:${f}`])).digest("hex");
  for (const f of ["bin/audit-trail.mjs", "bin/replay-crawl.mjs"]) assert.equal(hash(f), blob(f), `${f} differs from HEAD after the plants`);
});
