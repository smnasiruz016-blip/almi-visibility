/**
 * 🔴 AUDIT_STORE_ONLY_PRIMITIVES — THE OWNER'S EIGHT CONDITIONS, PROVED AGAINST THE PRODUCTION IMPLEMENTATION.
 *
 *   _handoffs/AlmiVisibility_OWNER_RULING_2026-09-24_AUDIT_STORE_ONLY_PRIMITIVES.md
 *
 * One section per condition (ASP-C1 … ASP-C8). Every proof carries a control able to return the opposite verdict,
 * every zero a firing control, every count its denominator and remainder.
 *
 * NOTHING HERE WRITES INTO THE REPOSITORY OR TOUCHES THE PRODUCTION TRAIL. Stand-in entry points are handed to the
 * census in memory (`census({ sources })`); stand-in module text is handed to the verifier and the census through
 * `read` / `primitiveRead`; execution proofs hand each primitive an in-memory store; the only filesystem writes are
 * inside an OS temp directory this file mints and removes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  AUDIT_STORE_ONLY_PRIMITIVES, verifyAuditStorePrimitive, verifyRegistry, codeText,
} from "../tools/audit-store-primitives.mjs";
import {
  census, bypasses, auditStoreExempt, checkVerdict, derivedWriterExports, WRITER_NAMES, PRIMITIVE_VERIFICATION, AUDIT_STORE_REACHING,
} from "../tools/governed-caller-census.mjs";
import { assertDeclaredAuditLocation, productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { recordCandidates } from "../src/audit-trail/recorder.mjs";
import { auditAuthorityMigration } from "../src/audit-trail/callers.mjs";
import { recordGateDecisions, freezeMechanism, requestHeldOutAccess, scoreHeldOutEvaluation } from "../src/heldout/lifecycle.mjs";
import { recordEvidenceStateTransitions } from "../src/evidence/evidence-state.mjs";
import { recordDeclarationDecisions } from "../src/intake/intake.mjs";
import { persistCrawlObservations } from "../src/crawl/persist.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const real = (f) => fs.readFileSync(join(REPO, f), "utf8");
const REAL = census();
const GOVERNED = REAL.filter((r) => r.cls === "GOVERNED_STATE_CHANGE");

/* ── stand-in entry points, built from parts so this file is never itself read as one ─────────────────────────── */
const HEAD = [
  'import { dirname, join } from "node:path";',
  'import { fileURLToPath } from "node:url";',
  'import { recordCandidates, writeGateEvent } from "../src/audit-trail/recorder.mjs";',
  'import { productionAuditStore } from "../src/audit-trail/wiring.mjs";',
  'import { governedAuditContext } from "../src/governance/governed-run.mjs";',
  'import { persistCrawlObservations } from "../src/crawl/persist.mjs";',
  'import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";',
  'const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");',
  "const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));",
  '  const drafts = [{ family: "D", draft: writeGateEvent({ permission, target: "local", action: "WRITE_AUDIT_TRAIL_STORE" }) }];',
];
const standIn = (body, { head = HEAD } = {}) => [{ file: "bin/zz-asp-stand-in.mjs", text: [...head, ...body, ""].join("\n") }];
const rowOf = (sources, opts = {}) => {
  const rows = census({ sources, ...opts });
  const row = rows.find((r) => r.file === "bin/zz-asp-stand-in.mjs");
  return { row, rows, bypass: bypasses(rows).length, sites: row.siteDetail.map((s) => s.cls) };
};
const OWN_STORE = "const store = productionAuditStore({ repo: REPO });";
const PRIMITIVE_CALL = "const result = recordCandidates({ store, candidates, corpus: CORPUS });";
const WELL_FORMED = () => standIn([OWN_STORE, PRIMITIVE_CALL]);

/* ── an in-memory audit store, and a filesystem instrument with its own positive control ─────────────────────── */
const memoryStore = () => {
  const events = [];
  return {
    events,
    append: (draft) => { events.push(draft); return { status: "APPENDED", event: { eventId: `mem-${events.length}` } }; },
    readAll: () => ({ events: [...events] }),
  };
};
const MUTATORS = ["writeFileSync", "appendFileSync", "mkdirSync", "rmSync", "renameSync", "unlinkSync", "copyFileSync", "cpSync", "createWriteStream", "rmdirSync", "openSync", "writeSync", "symlinkSync", "truncateSync"];
function fsMutationsDuring(fn) {
  const orig = Object.fromEntries(MUTATORS.map((m) => [m, fs[m]]));
  const seen = [];
  try {
    for (const m of MUTATORS) fs[m] = (...a) => { seen.push(`${m} ${String(a[0])}`); return orig[m](...a); };
    syncBuiltinESMExports();
    try { fn(); } catch (e) { if (!e?.code && !/HeldOut|MECHANISM/.test(String(e?.message))) throw e; }
  } finally {
    for (const m of MUTATORS) fs[m] = orig[m];
    syncBuiltinESMExports();
  }
  return seen;
}
const AUDIT_CTX = (store) => ({ store, actor: "test/asp", softwareVersion: "engine:test", correlationId: `run:asp:${Math.random()}`, authorityRef: { propositionId: "P", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });
const HEX = (c) => c.repeat(64);

/** Each declared primitive, EXECUTED with an in-memory store. Keyed by name so the population is checked, not assumed. */
const EXECUTE = {
  recordCandidates: (s) => recordCandidates({ store: s, candidates: [{ family: "D", sourceId: "asp-1", draft: { eventType: "WRITE_GATE_DECISION", occurredAt: "2026-09-24T00:00:00Z", authorityHashOverride: HEX("a") } }], corpus: AUTHORITY_CORPUS }),
  auditAuthorityMigration: (s) => auditAuthorityMigration({ store: s, records: AUTHORITY_CORPUS, provenance: { now: CORPUS_PROVENANCE.now, governanceCommit: "g", engineCommit: "e" }, permission: { mayWrite: false }, counts: {}, softwareVersion: "engine:test", actor: "test/asp" }),
  recordGateDecisions: (s) => recordGateDecisions({ audit: AUDIT_CTX(s), drafts: [{ eventType: "WRITE_GATE_DECISION" }] }),
  freezeMechanism: (s) => freezeMechanism({ audit: AUDIT_CTX(s), mechanismId: "asp-mechanism", mechanismHash: HEX("b"), frozenAt: "2026-09-24T00:00:00Z" }),
  requestHeldOutAccess: (s) => requestHeldOutAccess({ audit: AUDIT_CTX(s), registry: [], request: {} }),
  scoreHeldOutEvaluation: (s) => scoreHeldOutEvaluation({ audit: AUDIT_CTX(s), grant: { allowed: true, eventId: "g-1", untouched: false, status: "RERUN", request: { mechanismId: "asp-mechanism", mechanismHash: HEX("b"), sealedSetId: "asp-set" } }, currentMechanismHash: HEX("c"), declaredItems: [], outcomes: new Map() }),
  recordEvidenceStateTransitions: (s) => recordEvidenceStateTransitions({ audit: AUDIT_CTX(s), drafts: [{ eventType: "EVIDENCE_STATE_TRANSITION", metadata: { fromRef: "a", toRef: "b" } }] }),
  recordDeclarationDecisions: (s) => recordDeclarationDecisions({ audit: AUDIT_CTX(s), drafts: [{ eventType: "DECLARATION_DECISION", correlationId: "c", metadata: { declarationId: "d", from: "VALIDATED", to: "ACCEPTED" } }] }),
};

/* The real lifecycle module, one line changed — the stand-in for "a registered primitive changed". */
const LIFE = "src/heldout/lifecycle.mjs";
const GATE_BODY = "export function recordGateDecisions({ audit, drafts }) {\n  return drafts.map((d) => audit.store.append(d));";
const lifeWith = (replacement, extraImport = "") => {
  const t = real(LIFE).replace(/\r\n/g, "\n");
  assert.ok(t.includes(GATE_BODY), "the stand-in's anchor is absent from the real module — the variant would prove nothing");
  return (extraImport ? `${extraImport}\n` : "") + t.replace(GATE_BODY, replacement);
};
const readWith = (file, text) => (f) => (f === file ? text : real(f));

/* ═══ POPULATION ═════════════════════════════════════════════════════════════════════════════════════════════════ */

test("ASP-POP · the registry population: declared 8 = verified 8 + unverified 0, every entry a {name, module} the module really exports", () => {
  assert.equal(AUDIT_STORE_ONLY_PRIMITIVES.length, 8);
  assert.equal(PRIMITIVE_VERIFICATION.length, 8);
  const verified = PRIMITIVE_VERIFICATION.filter((v) => v.verified).length;
  assert.equal(verified + PRIMITIVE_VERIFICATION.filter((v) => !v.verified).length, AUDIT_STORE_ONLY_PRIMITIVES.length, "remainder is not zero");
  assert.deepEqual(PRIMITIVE_VERIFICATION.filter((v) => !v.verified).map((v) => `${v.name}: ${v.faults.join(" | ")}`), []);
  /* The execution table covers exactly the declared population — not a sample of it. */
  assert.deepEqual(Object.keys(EXECUTE).sort(), AUDIT_STORE_ONLY_PRIMITIVES.map((e) => e.name).sort());
  /* The census's registered set is DERIVED from the verified entries, and nothing else. */
  for (const e of AUDIT_STORE_ONLY_PRIMITIVES) assert.ok(AUDIT_STORE_REACHING.test(`${e.name}(`), `${e.name} is verified but not registered`);
  assert.equal(AUDIT_STORE_REACHING.test("readHeldOutItem("), false, "the de-registered name is still registered");
});

/* ═══ C1 · the registered primitive can write only to the declared audit store ═══════════════════════════════════ */

test("ASP-C1a · EXECUTION · every registered primitive appends ≥1 event to the store it is handed and makes ZERO filesystem writes", () => {
  for (const e of AUDIT_STORE_ONLY_PRIMITIVES) {
    const s = memoryStore();
    const writes = fsMutationsDuring(() => EXECUTE[e.name](s));
    assert.deepEqual(writes, [], `${e.name} wrote to the filesystem: ${writes.join(", ")}`);
    assert.ok(s.events.length >= 1, `${e.name} appended nothing — the execution did not reach its emission, so its zero proves nothing`);
  }
});

test("ASP-C1a · CONTROL · the same instrument SEES a real product writer's filesystem write", () => {
  const dir = fs.mkdtempSync(join(tmpdir(), "asp-c1-"));
  try {
    const store = createJsonlStore(join(dir, "crawl.jsonl"));
    const writes = fsMutationsDuring(() => persistCrawlObservations(store, [{ record_type: "observation", observation_id: "o-1", measurement_key: "k-1", observed_at: "2026-09-24T00:00:00Z" }]));
    assert.ok(writes.length >= 1, "the instrument saw nothing from a writer that writes — every zero above is worthless");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("ASP-C1b · STATIC · the proof reads every reachable function and refuses a write to anything but the handed audit store", () => {
  for (const v of PRIMITIVE_VERIFICATION) assert.ok(v.reached.length >= 1 && v.reached[0] === `${v.module}#${v.name}`, `${v.name} was not read from its module`);
  const variants = {
    "append to a module-level product store": GATE_BODY.replace("audit.store.append(d)", "PRODUCT_STORE.append(d)"),
    "append to a store that is not its parameter's": GATE_BODY.replace("{ audit, drafts }) {\n", "{ audit, drafts }) {\n  const other = audit.product;\n").replace("audit.store.append(d)", "other.append(d)"),
    "a filesystem write": GATE_BODY.replace("{\n", "{\n  writeFileSync(\"config/x.json\", \"1\");\n"),
  };
  for (const [label, body] of Object.entries(variants)) {
    const r = verifyAuditStorePrimitive({ name: "recordGateDecisions", module: LIFE }, { read: readWith(LIFE, lifeWith(body)) });
    assert.equal(r.verified, false, `${label}: still verified`);
  }
  /* CONTROL: the unchanged module, through the same path, verifies — the rule can say yes. */
  assert.equal(verifyAuditStorePrimitive({ name: "recordGateDecisions", module: LIFE }, { read: readWith(LIFE, lifeWith(GATE_BODY)) }).verified, true);
});

test("ASP-C1c · CALL SITE · a caller-chosen location, an alternate root or a spread cannot make a primitive's store 'the audit store'", () => {
  const relocated = {
    "at: a product path": 'const store = productionAuditStore({ repo: REPO, at: { eventsPath: "config/fboard/x.jsonl", headPath: "config/fboard/h.json" } });',
    "an alternate repo root": 'const store = productionAuditStore({ repo: "../almi-visibility-data" });',
    "a repo bound to something else": 'const OTHER = "C:/elsewhere";\nconst store = productionAuditStore({ repo: OTHER });',
    "a caller-built env": "const store = governedAuditContext({ repo: REPO, env: { NODE_TEST_CONTEXT: \"child-v8\" } });",
    "a spread argument": "const store = productionAuditStore({ ...opts, repo: REPO });",
    "a reassignable binding": "let store = productionAuditStore({ repo: REPO });",
  };
  for (const [label, line] of Object.entries(relocated)) {
    const c = rowOf(standIn([line, PRIMITIVE_CALL]));
    assert.equal(c.row.auditStoreExempt, false, `${label}: still exempt`);
    assert.equal(c.bypass, 1, `${label}: not counted as a bypass`);
  }
  const ok = rowOf(WELL_FORMED());
  assert.deepEqual([ok.row.auditStoreExempt, ok.bypass], [true, 0], "CONTROL: the well-formed caller no longer earns it — every refusal above would be vacuous");
});

test("ASP-C1d · RUNTIME · the production store refuses to append through a symlinked or junctioned audit-trail directory", () => {
  const base = fs.mkdtempSync(join(tmpdir(), "asp-junction-"));
  try {
    const plain = join(base, "plain"); fs.mkdirSync(plain);
    const linked = join(base, "linked"); fs.mkdirSync(linked);
    const elsewhere = join(base, "product-store"); fs.mkdirSync(elsewhere);
    fs.symlinkSync(elsewhere, join(linked, "audit-trail"), "junction");
    assert.doesNotThrow(() => assertDeclaredAuditLocation(plain), "CONTROL: a plain repository is refused — the check cannot say yes");
    assert.throws(() => assertDeclaredAuditLocation(linked), /AUDIT_STORE_LOCATION_REFUSED/);
    const store = productionAuditStore({ repo: linked, forbiddenSubstrings: [] });
    assert.throws(() => store.append({ eventType: "WRITE_GATE_DECISION" }), /AUDIT_STORE_LOCATION_REFUSED/, "the check is not on the production append path");
    assert.deepEqual(fs.readdirSync(elsewhere), [], "something was written through the junction");
    /* The REAL engine checkout passes the same check, so the production trail is not refused by this repair. */
    assert.doesNotThrow(() => assertDeclaredAuditLocation(REPO));
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

/* ═══ C2 · it cannot mutate a project, declaration, evidence record or any other product state ═════════════════ */

test("ASP-C2 · a primitive handed a decision's METADATA records it and performs NONE of the decision's product mutation", () => {
  /* The intake recorder is handed an ACCEPTED decision: it appends the event and writes nothing (C1a's instrument). */
  const s = memoryStore();
  const writes = fsMutationsDuring(() => EXECUTE.recordDeclarationDecisions(s));
  assert.deepEqual([writes.length, s.events.length, s.events[0].metadata.to], [0, 1, "ACCEPTED"]);
  /* CONTROL, opposite verdict: a primitive that ALSO performs the product mutation — even through the governed boundary —
   * is not an audit-store-only primitive, and the proof says so. */
  const INTAKE = "src/intake/intake.mjs";
  const t = real(INTAKE).replace(/\r\n/g, "\n");
  const anchor = "export function recordDeclarationDecisions({ audit, drafts }) {\n";
  assert.ok(t.includes(anchor));
  for (const [label, extra, imp] of [
    ["writes the declaration through the governed boundary", "  executeGovernedWrite(drafts[0].metadata.write);\n", 'import { executeGovernedWrite } from "../governance/governed-write.mjs";'],
    ["persists a product record", "  persistCrawlObservations({ store: drafts[0].store, records: [] });\n", 'import { persistCrawlObservations } from "../crawl/persist.mjs";'],
  ]) {
    const mixed = `${imp}\n${t.replace(anchor, anchor + extra)}`;
    const r = verifyAuditStorePrimitive({ name: "recordDeclarationDecisions", module: INTAKE }, { read: readWith(INTAKE, mixed) });
    assert.equal(r.verified, false, `${label}: verified as audit-store-only`);
  }
});

/* ═══ C3 · it emits through the governed audit-store path ═════════════════════════════════════════════════════════ */

test("ASP-C3 · REAL · every production primitive site hands in the entry point's OWN audit store: 9 sites = 9 proved + 0 other, remainder 0", () => {
  const sites = GOVERNED.flatMap((r) => r.siteDetail.filter((s) => AUDIT_STORE_REACHING.test(s.text)).map((s) => ({ file: r.file, ...s })));
  /* 7 → 8 sites, 5 → 6 files on 27 Sep 2026 (F10), for a MEASURED reason: bin/f10-select.mjs records its write-gate decisions through
   * the same primitive, on the entry point's OWN audit context, exactly as bin/heldout-evaluation.mjs does.
   * 8 → 9 sites, files unchanged, on 27 Sep 2026 (F08 incident): bin/audit-trail.mjs gap records its AUDIT_CORRECTION through recordCandidates,
   * on its OWN production audit store, exactly as its record subcommand does (the direct store.append it first had was a BYPASS). */
  assert.equal(sites.length, 9);
  const proved = sites.filter((s) => s.cls === "CHECKED_AUDIT_STORE_EXEMPTION");
  assert.equal(proved.length + sites.filter((s) => s.cls !== "CHECKED_AUDIT_STORE_EXEMPTION").length, sites.length);
  assert.deepEqual(sites.filter((s) => s.cls !== "CHECKED_AUDIT_STORE_EXEMPTION").map((s) => `${s.file}:${s.line} ${s.cls} ${s.why}`), []);
  assert.deepEqual([...new Set(sites.map((s) => s.file))].sort(), ["bin/audit-trail.mjs", "bin/authority-migrate.mjs", "bin/f10-select.mjs", "bin/heldout-evaluation.mjs", "bin/project-intake.mjs", "bin/supersede-noindex.mjs"]);
});

test("ASP-C3 · CONTROLS · an emission path that is replaced, chosen or merely NAMED is not the governed audit-store path", () => {
  const replaced = {
    "a ternary": "const store = flag ? productionAuditStore({ repo: REPO }) : declarationStore;",
    "Object.assign replacing append": "const store = Object.assign(productionAuditStore({ repo: REPO }), { append: productAppend });",
    "a context whose store is overridden": "const store = { ...governedAuditContext({ repo: REPO }), store: productStore };",
    "a trailing member access": "const store = productionAuditStore({ repo: REPO }).other;",
  };
  for (const [label, line] of Object.entries(replaced)) {
    const c = rowOf(standIn([line, PRIMITIVE_CALL]));
    assert.equal(c.row.auditStoreExempt, false, `${label}: exempt`);
    assert.equal(c.bypass, 1, `${label}: not a bypass`);
  }
  const spread = rowOf(standIn(["const store = { ...governedAuditContext({ repo: REPO, correlationId }), actor: \"bin/x\" };", "const result = recordCandidates({ store, candidates, corpus: CORPUS });"]));
  assert.deepEqual([spread.row.auditStoreExempt, spread.bypass], [true, 0], "CONTROL: the real spread-context form (bin/heldout-evaluation.mjs) no longer earns it");
});

/* ═══ C4 · every production caller remains visible to the caller census ═══════════════════════════════════════════ */

test("ASP-C4 · REAL · every production file that names a declared primitive is a GOVERNED census row, one site per call — 6 files, 9 calls, remainder 0", () => {
  const names = AUDIT_STORE_ONLY_PRIMITIVES.map((e) => e.name);
  const grep = (dir) => execFileSync("git", ["-C", REPO, "grep", "-nE", `\\b(${names.join("|")})\\(`, "--", dir], { encoding: "utf8" }).split("\n").filter(Boolean);
  const binCalls = grep("bin").filter((l) => !/^\S+:\d+:\s*(\/\/|\*)/.test(l));
  /* 7 → 8 sites, 5 → 6 files on 27 Sep 2026 (F10), for a MEASURED reason: bin/f10-select.mjs records its write-gate decisions through
   * the same primitive, on the entry point's OWN audit context, exactly as bin/heldout-evaluation.mjs does.
   * 8 → 9 calls on 27 Sep 2026: bin/audit-trail.mjs gap (see ASP-C3). */
  assert.equal(binCalls.length, 9);
  for (const l of binCalls) {
    const [file, line] = l.split(":");
    const row = REAL.find((r) => r.file === file);
    assert.ok(row && row.cls === "GOVERNED_STATE_CHANGE", `${file} calls a primitive and is not a governed census row`);
    assert.ok(row.siteDetail.some((s) => s.line === Number(line)), `${file}:${line} calls a primitive and is not a census site`);
  }
  /* No src/ module outside a primitive's own calls one — so bin/ is the whole production caller population. */
  const srcCalls = grep("src").filter((l) => !/^\S+:\d+:\s*(\/\/|\*)/.test(l) && !/\bfunction\s+\w+\s*\(/.test(l));
  const outside = srcCalls.filter((l) => !AUDIT_STORE_ONLY_PRIMITIVES.some((e) => l.startsWith(`${e.module}:`)));
  assert.deepEqual(outside, []);
  /* Registration never shrinks the denominator: exempt callers stay governed rows. */
  assert.equal(GOVERNED.filter((r) => r.routed).length + auditStoreExempt(REAL).length + bypasses(REAL).length, GOVERNED.length);
});

test("ASP-C4 · CONTROLS · a caller that renames a primitive or a writer is refused, never read past as a diagnostic", () => {
  const noLaw = HEAD.filter((l) => !/writePermission|writeGateEvent\(|recordCandidates, writeGateEvent/.test(l));
  const aliased = rowOf(standIn(['import { recordCandidates as rc } from "../src/audit-trail/recorder.mjs";', OWN_STORE, "rc({ store: declarationStore, candidates, corpus: CORPUS });"], { head: noLaw }));
  assert.equal(aliased.row.cls, "GOVERNED_STATE_CHANGE", "an aliased caller is invisible — read as a diagnostic");
  assert.equal(aliased.bypass, 1);
  const dyn = rowOf(standIn(['const { persistCrawlObservations: keep } = await import("../src/crawl/persist.mjs");', "keep({ store: crawlStore, records });"], { head: noLaw }));
  assert.equal(dyn.bypass, 1, "a renaming destructure of a dynamic import hides the writer");
  /* CONTROL: the same caller, unaliased, is visible — so the alias, not the call, is what the refusal reads. */
  const plain = rowOf(standIn(['import { recordCandidates } from "../src/audit-trail/recorder.mjs";', OWN_STORE, "recordCandidates({ store: declarationStore, candidates, corpus: CORPUS });"], { head: noLaw }));
  assert.equal(plain.row.cls, "GOVERNED_STATE_CHANGE");
  assert.deepEqual(plain.sites, ["DIRECT_DURABLE_WRITE"]);
});

/* ═══ C5 · adding an unregistered recorder turns the census RED ══════════════════════════════════════════════════ */

test("ASP-C5 · an unregistered recorder handed the audit store is a BYPASS; the same call to a registered primitive is not", () => {
  const unregistered = rowOf(standIn([OWN_STORE, "persistCrawlObservations({ store, records });"]));
  assert.deepEqual([unregistered.row.auditStoreExempt, unregistered.bypass], [false, 1]);
  assert.ok(checkVerdict(unregistered.rows).some((w) => w.startsWith("BYPASS bin/zz-asp-stand-in.mjs")), "--check would stay green");
  const registered = rowOf(WELL_FORMED());
  assert.deepEqual([registered.row.auditStoreExempt, registered.bypass], [true, 0], "CONTROL: the registered primitive is refused too — the census cannot tell them apart");
});

test("ASP-C5 · a NEW recorder is a writer however its receiver is named — so its caller cannot stay invisible", () => {
  const files = ["src/zz/recorder.mjs"];
  const shapes = {
    "audit.store.append": "export function recordThings({ audit, drafts }) {\n  return drafts.map((d) => audit.store.append(d));\n}\n",
    "an alias receiver": "export function recordThings({ audit, drafts }) {\n  const t = audit.store;\n  return drafts.map((d) => t.append(d));\n}\n",
    "a nested receiver": "export function recordThings({ ctx, drafts }) {\n  return drafts.map((d) => ctx.sink.trail.appendIfNew(d));\n}\n",
  };
  for (const [label, text] of Object.entries(shapes)) {
    assert.ok(derivedWriterExports({ files, read: () => text }).some((w) => w.name === "recordThings"), `${label}: not derived as a writer`);
  }
  assert.equal(derivedWriterExports({ files, read: () => "export function readThings({ audit }) {\n  return audit.store.readAll();\n}\n" }).length, 0, "CONTROL: a reader is derived as a writer — the rule cannot say no");
  /* F07 Amendment 2 (governance 051feb9) added two real writers to the lifecycle — readHeldOutDerivation and scoreClassification —
   * each recording to the audit store it is handed AND reading sealed material or running a caller-supplied function, so each is
   * a MIXED writer, named below in C6 and proved to FAIL the audit-store-only proof. The population is measured, 15 -> 17. */
  /* Part D1 (28 Sep 2026): the governed key reader measureKey (src/heldout/key-registration.mjs) records to the audit store it is
   * handed AND reads a sealed store — a MIXED writer, named in C6 and proved to FAIL the audit-store-only proof. Its governed route
   * (src/governance/governed-key-measurement.mjs) sits in the boundary module directory, like governed-scoring. Measured 17 -> 18. */
  assert.equal(WRITER_NAMES.length, 18, "the widened rule changed the real writer population");
});

/* ═══ C6 · registering a function that also performs a non-audit write turns the proof RED ═══════════════════════ */

test("ASP-C6 · every real non-audit writer, registered, FAILS the proof — and the census's --check verdict goes RED", () => {
  const mixed = [
    { name: "persistCrawlObservations", module: "src/crawl/persist.mjs" },
    { name: "runIngest", module: "src/search/ingest.mjs" },
    { name: "runReplayPass", module: "src/crawl/replay.mjs" },
    { name: "createCostLedger", module: "src/cost/ledger.mjs" },
    { name: "createPaidProviderGate", module: "src/cost/paid-provider-gate.mjs" },
    { name: "runRobotsAndDnsAudit", module: "src/audit/run-audit.mjs" },
    { name: "readHeldOutItem", module: LIFE },
    // F07 Amendment 2 (governance 051feb9): the evaluator's derived-set reader and the aggregate scorer — mixed writers too.
    { name: "readHeldOutDerivation", module: LIFE },
    { name: "scoreClassification", module: LIFE },
    // Part D1 (28 Sep 2026): the governed key reader — a sealed read plus audit events — a mixed writer too.
    { name: "measureKey", module: "src/heldout/key-registration.mjs" },
  ];
  /* The population: every derived writer that is not declared, plus the de-registered name. Nothing sampled. */
  const declared = new Set(AUDIT_STORE_ONLY_PRIMITIVES.map((e) => e.name));
  assert.deepEqual(WRITER_NAMES.filter((n) => !declared.has(n)).sort(), mixed.map((m) => m.name).sort());
  for (const entry of mixed) {
    const v = verifyRegistry({ entries: [...AUDIT_STORE_ONLY_PRIMITIVES, entry] });
    const it = v.find((x) => x.name === entry.name);
    assert.equal(it.verified, false, `${entry.name} passed the audit-store-only proof`);
    assert.ok(checkVerdict(REAL, v).includes(`UNVERIFIED_PRIMITIVE ${entry.name}`), `${entry.name}: --check stays green`);
  }
  /* A same-named function in a module that does not export it is not the primitive. */
  assert.equal(verifyAuditStorePrimitive({ name: "recordCandidates", module: "src/crawl/persist.mjs" }).verified, false);
  /* CONTROL: the declared registry, over the real tree, gives an EMPTY verdict — --check can be green. */
  assert.deepEqual(checkVerdict(REAL), []);
});

test("ASP-C6 · a registered NAME imported from another module is not the primitive — refused at the call site", () => {
  const head = HEAD.map((l) => (l.includes("recordCandidates, writeGateEvent") ? 'import { writeGateEvent } from "../src/audit-trail/recorder.mjs";\nimport { recordCandidates } from "../src/crawl/persist.mjs";' : l));
  const c = rowOf(standIn([OWN_STORE, PRIMITIVE_CALL], { head }));
  assert.deepEqual([c.row.auditStoreExempt, c.bypass, c.sites[0]], [false, 1, "UNKNOWN"], "a same-named import from another module earned the exemption");
  const local = rowOf(standIn(["function recordCandidates(o) { return o; }", OWN_STORE, PRIMITIVE_CALL], { head: head.map((l) => l.replace('import { recordCandidates } from "../src/crawl/persist.mjs";', "")) }));
  assert.equal(local.bypass, 1, "a locally defined function of the same name is exempt");
  assert.deepEqual([rowOf(WELL_FORMED()).row.auditStoreExempt], [true], "CONTROL");
});

/* ═══ C7 · changing a registered primitive so it writes another target turns the census RED ══════════════════════ */

test("ASP-C7 · a registered primitive CHANGED to write elsewhere: the real census over the real bin/ goes RED", () => {
  const changes = {
    "a filesystem write": lifeWith(GATE_BODY.replace("{\n", "{\n  writeFileSync(join(\"config\", \"fboard\", \"x.json\"), \"1\");\n")),
    "an append to a product store": lifeWith(GATE_BODY.replace("audit.store.append(d)", "PRODUCT_STORE.append(d)")),
    "a call to a product writer": lifeWith(GATE_BODY.replace("audit.store.append(d)", "persistCrawlObservations({ store: audit.store, records: [d] })"), 'import { persistCrawlObservations } from "../crawl/persist.mjs";'),
    "a caller-supplied sink": lifeWith(GATE_BODY.replace("{ audit, drafts }", "{ audit, drafts, sink = () => {} }").replace("audit.store.append(d)", "sink(d)")),
  };
  for (const [label, text] of Object.entries(changes)) {
    const rows = census({ primitiveRead: readWith(LIFE, text) });
    const heldout = rows.find((r) => r.file === "bin/heldout-evaluation.mjs");
    assert.ok(bypasses(rows).some((r) => r.file === "bin/heldout-evaluation.mjs"), `${label}: bin/heldout-evaluation.mjs is not a bypass`);
    assert.equal(heldout.auditStoreExempt, false, `${label}: the changed primitive's caller is still exempt`);
    assert.ok(checkVerdict(rows, verifyRegistry({ read: readWith(LIFE, text) })).includes("UNVERIFIED_PRIMITIVE recordGateDecisions"), `${label}: --check stays green`);
  }
  /* CONTROL: the same path handed the UNCHANGED text gives the real, green census. */
  const same = census({ primitiveRead: readWith(LIFE, lifeWith(GATE_BODY)) });
  assert.deepEqual(bypasses(same).map((r) => r.file), []);
  /* Since F10 (26 Sep 2026) the evaluator also routes one write through the boundary (the scoring run), so the clean caller is
   * BOUNDARY_ROUTED — and every primitive site in it is still a CHECKED audit-store site. The fired half above is unchanged. */
  const hc = same.find((r) => r.file === "bin/heldout-evaluation.mjs");
  assert.equal(hc.callerClass, "BOUNDARY_ROUTED");
  assert.ok(hc.siteDetail.length === 3 && hc.siteDetail.every((s) => s.cls === "CHECKED_AUDIT_STORE_EXEMPTION"), "a primitive site in the clean evaluator is not a checked audit-store site");
});

/* ═══ C8 · a caller that invokes the primitive still cannot bypass its own governed mutation boundary ═════════════ */

test("ASP-C8 · a caller's own product write is a bypass wherever it sits — its own line, the primitive's line, or inside the primitive's arguments", () => {
  const smuggled = {
    "its own line": [OWN_STORE, PRIMITIVE_CALL, "declarationStore.append(record);"],
    "the primitive's line": [OWN_STORE, "const result = recordCandidates({ store, candidates, corpus: CORPUS }); declarationStore.append(record);"],
    "inside the arguments, audit store named first": [OWN_STORE, "recordCandidates({ store: store, candidates: persistCrawlObservations({ store: crawlStore, records }), corpus: CORPUS });"],
    "a filesystem write on the primitive's line": [OWN_STORE, "recordCandidates({ store, candidates, corpus: CORPUS }); writeFileSync(target, bytes);"],
  };
  for (const [label, body] of Object.entries(smuggled)) {
    const c = rowOf(standIn(body));
    assert.equal(c.row.auditStoreExempt, false, `${label}: exempt`);
    assert.equal(c.bypass, 1, `${label}: not a bypass`);
    assert.equal(c.row.exemption.targetsOnlyAuditStore, false, `${label}: condition A still reads the NAME, not the site's verdict`);
  }
  /* A caller that routes its product write through the boundary AND keeps a direct one is PARTIALLY_ROUTED. */
  const partial = rowOf(standIn([OWN_STORE, PRIMITIVE_CALL, "executeGovernedWrite(args);", "declarationStore.append(record);"]));
  assert.equal(partial.row.callerClass, "PARTIALLY_ROUTED");
  /* CONTROL: the primitive alone is exempt. */
  assert.deepEqual([rowOf(WELL_FORMED()).bypass, rowOf(WELL_FORMED()).row.auditStoreExempt], [0, true]);
});

test("ASP-C8 · REAL · the 6 production callers of a primitive: 5 route every product write through the boundary, 1 writes nothing but the audit store", () => {
  const callers = ["bin/audit-trail.mjs", "bin/authority-migrate.mjs", "bin/f10-select.mjs", "bin/heldout-evaluation.mjs", "bin/project-intake.mjs", "bin/supersede-noindex.mjs"].map((f) => REAL.find((r) => r.file === f));
  const routed = callers.filter((r) => r.callerClass === "BOUNDARY_ROUTED");
  const exempt = callers.filter((r) => r.callerClass === "CHECKED_AUDIT_STORE_EXEMPTION");
  /* 3/2 → 4/1 on 26 Sep 2026 (F10): bin/heldout-evaluation.mjs now also routes its scoring run through the boundary. */
  /* 4/1 → 5/1 on 27 Sep 2026 (F10): bin/f10-select.mjs seals the one selection only through the boundary. */
  assert.deepEqual([routed.length, exempt.length, callers.length - routed.length - exempt.length], [5, 1, 0]);
  for (const r of callers) assert.deepEqual(r.siteDetail.filter((s) => s.cls === "DIRECT_DURABLE_WRITE" || s.cls === "UNKNOWN").map((s) => s.line), [], `${r.file} keeps a direct write`);
  for (const r of exempt) assert.ok(r.siteDetail.every((s) => s.cls === "CHECKED_AUDIT_STORE_EXEMPTION"), `${r.file} is exempt with a non-audit site`);
});

/* ═══ the code scan the proof stands on ══════════════════════════════════════════════════════════════════════════ */

test("ASP-SCAN · prose is blanked, code is kept — and a scan that cannot end cleanly fails closed", () => {
  const s = codeText('const a = "writeFileSync(x)"; // appendFileSync(y)\nconst re = /[/*"]/; writeFileSync(p, `t${mkdirSync(q)}t`);\n/* rmSync(z) */\n');
  assert.equal(s.ok, true);
  assert.ok(!/writeFileSync\(x\)|appendFileSync|rmSync/.test(s.text), "prose survived the scan");
  assert.ok(/writeFileSync\(p/.test(s.text) && /mkdirSync\(q\)/.test(s.text), "code after a regex literal, or inside ${}, was hidden");
  assert.equal(codeText('const s = "unterminated;\n').ok, false, "an unterminated string scanned clean");
  assert.equal(codeText("const t = `open ${x\n").ok, false, "an unterminated template scanned clean");
});
