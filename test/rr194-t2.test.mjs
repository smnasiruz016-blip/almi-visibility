/**
 * 🔴 RR-194 · R6b part 1 — T-2 (RTP-1 §17 S10, P20, P21, P24; the owner's PG-A1) and bin/t2-reassess.mjs, on FIXTURES ONLY.
 *
 * The real findings stores are NEVER written here: every run works on copies of their COMMITTED records in git-ignored .test-scratch,
 * inside a DECLARED FIXTURE WORLD (test/helpers/declared-world.mjs), and every governed event goes to a confined synthetic trail. The
 * production trail and both real stores are hashed before and after (the last test). One test per behaviour and per refusal; one run's
 * exact trail appends are MEASURED in the fixture world and printed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE, T2_VERSION, REVIEW_SIGNAL_JUSTIFICATIONS } from "../src/audit/content-checks.mjs";
import { planReassessment, REFUSAL, T2_DETECTORS } from "../src/audit/t2-reassessment.mjs";
import { lifecycleOf } from "../src/evidence/lifecycle.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (p) => (existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : "ABSENT");
const REAL = { trail: join(REPO, "audit-trail", "events.jsonl"), content: join(REPO, "runs/audit/content-findings.jsonl"), labels: join(REPO, "runs/audit/supply-labels.jsonl") };
const BEFORE = Object.fromEntries(Object.entries(REAL).map(([k, p]) => [k, sha(p)]));
const lines = (p) => readFileSync(p, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
const records = (p) => lines(p).map((l) => JSON.parse(l));
/* RR-195: the fixtures are the stores AS THEY STOOD BEFORE the 15 real runs (the live stores now hold the runs' supersessions, so their
 * version-1 FAILs are no longer OPEN). The stores are APPEND-ONLY, so that state is exactly each file's first N lines — proved byte for byte
 * against the pre-run blob's sha256 (main e45943f9, resolved from git when pinned), with no git history read (CI checks out at depth 1). */
const PRE_LINES = { content: [471, "5f34f3cb9a66217369bdd905e2be6940d49bf10f1fe16593909c65e6d09b88a1"], labels: [550, "2db7f0d104dd83e8d52da352becb73b4fcd98dacf47b4675b108667ae1721481"] };
const prefix = (p, [n, want]) => { const b = Buffer.from(readFileSync(p, "utf8").replace(/\r\n/g, "\n").split("\n").slice(0, n).join("\n") + "\n", "utf8"); if (createHash("sha256").update(b).digest("hex") !== want) throw new Error(`${p}: its first ${n} lines are not the pre-run store`); return b; };
const PRE = { content: prefix(REAL.content, PRE_LINES.content), labels: prefix(REAL.labels, PRE_LINES.labels) };
const parse = (buf) => buf.toString("utf8").split(/\r?\n/).filter((l) => l.trim() !== "").map((l) => JSON.parse(l));
const COMMITTED = { content: parse(PRE.content), labels: parse(PRE.labels) };
const STORES = () => [{ name: "runs/audit/content-findings.jsonl", records: COMMITTED.content }, { name: "runs/audit/supply-labels.jsonl", records: COMMITTED.labels }];
const NOW = "2026-10-07T00:00:00.000Z";
const ACT = { now: NOW, actor: "actor:cc", action: "test" };

/* every page the real crawl batch records (page_id → URL) — the fixture world's partition covers exactly these */
const PAGES = new Map(batchJsonlFiles().flatMap((p) => createJsonlStore(p.path ?? p).readAll()).filter((r) => r.record_type === "page").map((r) => [r.page_id, r.canonical_url]));
const T2_FAILS = (recs) => [...lifecycleOf(recs).issues.values()].filter((e) => T2_DETECTORS.includes(e.issue.detector) && e.issue.detector_version === "1" && e.issue.verdict === "FAIL" && e.state === "OPEN");

/* ================= T-2: the version-2 checks never FAIL ================= */
const words = (n, p = "w") => Array.from({ length: n }, (_, i) => `${p}${i}`).join(" ");
const page = (body, nav = words(30, "n")) => `<html><body><nav>${nav}</nav><main>${body}</main></body></html>`;
const ctx = (bodyHtml, peers) => ({ page: { canonical_url: "https://fixture.invalid/a" }, observations: [{ observation_id: "o1" }], siteContext: { bodyHtml, openedAt: NOW, peers } });

test("T2-CHECKS · version 2: below 350 / at 0.9 / at 0.75 each records a REVIEW SIGNAL (UNKNOWN, its value carried) — never a FAIL; the clean side records nothing", async () => {
  for (const c of [THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE]) assert.equal(c.version, T2_VERSION, `${c.id} is not version 2`);
  const thin = await THIN_CONTENT.run(ctx(page(words(40))));
  assert.deepEqual([thin.verdict, thin.detector_version, thin.signal.name, thin.signal.value, thin.signal.bound, thin.signal.decides], ["UNKNOWN", "2", "unique-body-words", 40, 350, "nothing"]);
  assert.equal(thin.signal.justification, REVIEW_SIGNAL_JUSTIFICATIONS["thin-content"]);
  assert.equal(await THIN_CONTENT.run(ctx(page(words(400)))), null, "a page past the signal recorded something");
  const body = words(200, "b");
  const { shingles } = await import("../src/audit/shell.mjs");
  const near = await NEAR_DUPLICATE.run(ctx(page(body), [{ url: "https://fixture.invalid/b", shingles: shingles(body) }]));
  assert.deepEqual([near.verdict, near.signal.name, near.signal.value >= 0.9], ["UNKNOWN", "body-similarity", true]);
  const tpl = await TEMPLATE_DOMINANCE.run(ctx(page(words(10), words(300, "n"))));
  assert.deepEqual([tpl.verdict, tpl.signal.name, tpl.signal.value >= 0.75], ["UNKNOWN", "shell-share", true]);
  for (const r of [thin, near, tpl]) assert.equal(evidenceStateOf(r).state, "UNKNOWN", "a review signal placed as anything but UNKNOWN (reached, not established)");
});

/* ================= the plan (pure) ================= */
test("T2-PLAN · selects only the OPEN version-1 FAILs on the run's OWN tenant's pages: 125 here (118 thin · 5 near · 2 template), the rest left to their own runs", () => {
  const all = planReassessment({ stores: STORES(), tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: () => "t:a", ...ACT });
  assert.deepEqual([all.refused.length, all.selected, all.byDetector], [0, 125, { "thin-content": 118, "near-duplicate": 5, "template-dominance": 2 }]);
  /* a tenant owning ONE origin's pages selects exactly that origin's findings and leaves the others */
  const ids = new Set(T2_FAILS(COMMITTED.content).map((e) => e.issue.target_page_id));
  const origin = new URL(PAGES.get([...ids][0])).origin;
  const own = new Map([...PAGES].filter(([, u]) => new URL(u).origin === origin));
  const expected = T2_FAILS(COMMITTED.content).filter((e) => own.has(e.issue.target_page_id)).length;
  const one = planReassessment({ stores: STORES(), tenantId: "t:a", pagesOfTenant: own, tenantOfUrl: () => "t:a", ...ACT });
  assert.deepEqual([one.selected, one.skipped], [expected, 125 - expected]);
  assert.ok(expected > 0 && expected < 125, "the control would be vacuous");
});

test("T2-PLAN · both stores move together: each finding's replacement and state change go to EVERY store holding its copy — the same replacement id in both", () => {
  const p = planReassessment({ stores: STORES(), tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: () => "t:a", ...ACT });
  const byStore = Object.fromEntries(p.writes.map((w) => [w.store, w]));
  assert.deepEqual([byStore["runs/audit/content-findings.jsonl"].replacements.length, byStore["runs/audit/supply-labels.jsonl"].replacements.length], [125, 120]);
  const cIds = new Set(byStore["runs/audit/content-findings.jsonl"].replacements.map((r) => r.issue_id));
  for (const r of byStore["runs/audit/supply-labels.jsonl"].replacements) assert.ok(cIds.has(r.issue_id), "a copy's replacement differs between the stores");
});

test("T2-PLAN · each replacement is a version-2 REVIEW SIGNAL naming the old finding, its RECORDED value carried; each state change OPEN → SUPERSEDED names the replacement; no FAIL is re-recorded", () => {
  const p = planReassessment({ stores: STORES(), tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: () => "t:a", ...ACT });
  for (const { old, replacement } of p.pairs) {
    assert.deepEqual([replacement.verdict, replacement.detector, replacement.detector_version, replacement.supersedes], ["UNKNOWN", old.detector, "2", old.issue_id]);
    if (old.detector === "thin-content") assert.equal(replacement.signal.value, Number(old.summary.match(/^(\d+) unique body words/)[1]));
  }
  for (const w of p.writes) for (const c of w.changes) {
    assert.deepEqual([c.from, c.to], ["OPEN", "SUPERSEDED"]);
    assert.ok(w.replacements.some((r) => r.issue_id === c.superseded_by && r.supersedes === c.issue_id), "a supersession nobody can follow");
  }
  assert.equal(p.writes.flatMap((w) => w.replacements).some((r) => r.verdict === "FAIL"), false);
});

test("T2-PLAN · REFUSES a finding whose page resolves to ANOTHER tenant — the whole run, nothing planned", () => {
  const p = planReassessment({ stores: STORES(), tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: (u) => (u === [...PAGES.values()].find((x) => x === PAGES.get(T2_FAILS(COMMITTED.content)[0].issue.target_page_id)) ? "t:b" : "t:a"), ...ACT });
  assert.equal(p.writes.length, 0);
  assert.ok(p.refused.length >= 1 && p.refused.every((r) => r.code === REFUSAL.OTHER_TENANT));
});

test("T2-PLAN · REFUSES when the copies of one finding read differently in the two stores — the whole run, nothing planned", () => {
  const thin = T2_FAILS(COMMITTED.labels).find((e) => e.issue.detector === "thin-content").issue;
  const tampered = [...COMMITTED.labels, { record_type: "issue_state_change", issue_id: thin.issue_id, from: "OPEN", to: "CLOSED", changed_at: NOW, reason: "r", evidence: ["o"], action: "a", actor: "x", superseded_by: null }];
  const p = planReassessment({ stores: [{ name: "runs/audit/content-findings.jsonl", records: COMMITTED.content }, { name: "runs/audit/supply-labels.jsonl", records: tampered }], tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: () => "t:a", ...ACT });
  assert.deepEqual([p.writes.length, p.refused.map((r) => r.code)], [0, [REFUSAL.COPIES_DIFFER]]);
});

test("T2-PLAN · REFUSES a finding whose recorded value cannot be read back — never invents one", () => {
  const recs = COMMITTED.content.map((r) => (r.record_type === "issue" && r.detector === "near-duplicate" && r.detector_version === "1" && r.verdict === "FAIL" ? { ...r, summary: "unreadable" } : r));
  const p = planReassessment({ stores: [{ name: "runs/audit/content-findings.jsonl", records: recs }], tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: () => "t:a", ...ACT });
  assert.equal(p.writes.length, 0);
  assert.ok(p.refused.length === 5 && p.refused.every((r) => r.code === REFUSAL.VALUE_UNREADABLE));
});

test("T2-PLAN · a re-run plans nothing for a finding that has already moved", () => {
  const p = planReassessment({ stores: STORES(), tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: () => "t:a", ...ACT });
  const after = STORES().map((s) => { const w = p.writes.find((x) => x.store === s.name); return { ...s, records: [...s.records, ...(w ? [...w.replacements, ...w.changes] : [])] }; });
  for (const s of after) assert.deepEqual(lifecycleOf(s.records).errors, [], `${s.name}: the appended lifecycle is not lawful`);
  const again = planReassessment({ stores: after, tenantId: "t:a", pagesOfTenant: PAGES, tenantOfUrl: () => "t:a", ...ACT });
  assert.deepEqual([again.selected, again.writes.length, again.refused.length], [0, 0, 0]);
});

/* ================= the entry point, spawned in the fixture world ================= */
const SCRATCH = join(REPO, ".test-scratch", `rr194-${process.pid}-${randomBytes(3).toString("hex")}`);
mkdirSync(SCRATCH, { recursive: true });
const AUDIT_RUN = `rr194-${process.pid}-${randomBytes(3).toString("hex")}`;
let RUNS = 0;
const AUDIT_DIR = `.test-scratch/audit/rr194-${process.pid}-${randomBytes(3).toString("hex")}`;
function stores(tag) {
  const c = join(SCRATCH, `${tag}-content.jsonl`), l = join(SCRATCH, `${tag}-labels.jsonl`);
  writeFileSync(c, PRE.content); writeFileSync(l, PRE.labels);
  return { c, l, args: [`--content-store=${c}`, `--labels-store=${l}`] };
}
const trailLines = () => { const root = join(REPO, AUDIT_DIR); if (!existsSync(root)) return 0; let n = 0; const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (e === "events.jsonl") n += lines(p).length; } }; walk(root); return n; };
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
const run = (args, world = WORLD, { tenant = true } = {}) => spawnSync(process.execPath, ["bin/t2-reassess.mjs", ...(tenant ? world.argv(args) : args)], { cwd: REPO, encoding: "utf8", env: { ...world.envWith(), ALMIVISIBILITY_AUDIT_STORE: AUDIT_DIR, ALMIVISIBILITY_AUDIT_RUN: `${AUDIT_RUN}-${++RUNS}` /* one run directory PER spawned run (two same-tenant runs in one second share event ids — EVENT_ID_CONFLICT, fail closed); set HERE, so the child does not own (and delete) the run directory — its events can be counted */ } });

test("T2-BIN · REFUSES with no --tenant: stopped at the gate before anything is read; both stores byte-identical", () => {
  const s = stores("notenant");
  const before = [sha(s.c), sha(s.l)];
  const r = run([...s.args, "--actor=actor:cc", "--confirm"], WORLD, { tenant: false });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /TENANT|tenant/);
  assert.doesNotMatch(r.stdout, /selected \(OPEN version-1 FAILs/);
  assert.deepEqual([sha(s.c), sha(s.l)], before);
});

test("T2-BIN · REFUSES to write with no --confirm: a dry run that reports what it would append; both stores byte-identical", () => {
  const s = stores("dry");
  const before = [sha(s.c), sha(s.l)];
  const r = run(s.args);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[dry-run\] would have appended 490 records — add --confirm/);
  assert.deepEqual([sha(s.c), sha(s.l)], before);
});

let measured = null;
test("T2-BIN · --confirm: the tenant's 125 findings superseded in BOTH stores (+250 content, +240 labels), lawful lifecycles, F90's view consistent — and THE TRAIL APPENDS OF ONE RUN, MEASURED", () => {
  const s = stores("confirm");
  const n0 = [lines(s.c).length, lines(s.l).length];
  const t0 = trailLines();
  const r = run([...s.args, "--confirm"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  measured = trailLines() - t0;
  assert.deepEqual([lines(s.c).length - n0[0], lines(s.l).length - n0[1]], [250, 240]);
  for (const p of [s.c, s.l]) assert.deepEqual(lifecycleOf(records(p)).errors, []);
  assert.deepEqual([T2_FAILS(records(s.c)).length, T2_FAILS(records(s.l)).length], [0, 0], "a version-1 FAIL is still OPEN");
  assert.match(r.stdout, /evidence-state transitions recorded: 125 of 125/);
  assert.ok(measured > 0, "the run appended nothing to its trail");
  console.log(`  MEASURED (fixture world): one confirmed run over 125 findings appended ${measured} event(s) to its trail`);
  /* a re-run appends nothing to either store */
  const n1 = [lines(s.c).length, lines(s.l).length];
  const again = run([...s.args, "--confirm"]);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /nothing to re-assess/);
  assert.deepEqual([lines(s.c).length, lines(s.l).length], n1);
});

test("T2-BIN · ONE TENANT: in a two-tenant world the run touches only its own tenant's findings; the other tenant's stay OPEN", () => {
  const ids = new Set(T2_FAILS(COMMITTED.content).map((e) => e.issue.target_page_id));
  const origin = new URL(PAGES.get([...ids][0])).origin;
  const theirs = T2_FAILS(COMMITTED.content).filter((e) => new URL(PAGES.get(e.issue.target_page_id)).origin === origin).map((e) => e.issue.issue_id);
  const W2 = declaredWorld({ secondTenantOrigins: [origin] });
  try {
    const s = stores("two");
    const r = run([...s.args, "--confirm"], W2);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const open = new Set(T2_FAILS(records(s.c)).map((e) => e.issue.issue_id));
    assert.deepEqual([...open].sort(), [...theirs].sort(), "the run moved another tenant's finding, or left its own");
    assert.match(r.stdout, new RegExp(`selected \\(OPEN version-1 FAILs on this tenant's pages\\): ${125 - theirs.length}`));
  } finally { W2.cleanup(); }
});

test("T2-BIN · REFUSES when the copies differ across the two stores: exit 2, the code named, nothing written", () => {
  const s = stores("differ");
  const thin = T2_FAILS(records(s.l)).find((e) => e.issue.detector === "thin-content").issue;
  appendFileSync(s.l, JSON.stringify({ record_type: "issue_state_change", issue_id: thin.issue_id, from: "OPEN", to: "CLOSED", changed_at: NOW, reason: "r", evidence: ["o"], action: "a", actor: "x", superseded_by: null }) + "\n");
  const before = [sha(s.c), sha(s.l)];
  const r = run([...s.args, "--confirm"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, new RegExp(REFUSAL.COPIES_DIFFER));
  assert.deepEqual([sha(s.c), sha(s.l)], before);
});

test("T2-CENSUS · a SHARED run store's tenant PARTITION names the READS family — RUN_STORE only: a CRAWL_BATCH partition alone leaves a store read UNSCOPED; the real bin is SCOPED", async () => {
  const { classifyEntryPoint } = await import("../tools/tenant-scope-census.mjs");
  const ep = (resources) => [
    'import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";',
    'import { RESOURCES } from "../src/tenancy/scoped-run.mjs";',
    'import { createJsonlStore } from "../src/evidence/store.mjs";',
    `const SCOPE = scopedEntryPoint({ entry: "bin/planted.mjs", governed: true, resources: [${resources}] });`,
    'const recs = createJsonlStore(`${REPO}runs/audit/content-findings.jsonl`).readAll();',
  ].join("\n");
  assert.equal(classifyEntryPoint("bin/planted.mjs", ep('RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)')).cls, "UNSCOPED", "a crawl-batch partition satisfied a store read");
  assert.equal(classifyEntryPoint("bin/planted.mjs", ep('RESOURCES.collectionPartition("RUN_STORE", "runs/audit/content-findings.jsonl")')).cls, "SCOPED");
  assert.equal(classifyEntryPoint("bin/t2-reassess.mjs", readFileSync(join(REPO, "bin/t2-reassess.mjs"), "utf8")).cls, "SCOPED");
});

test("the production trail and both REAL findings stores are byte-identical after this file", () => {
  if (measured !== null) console.log(`  trail appends per confirmed run (fixture, 125 findings): ${measured}`);
  assert.deepEqual(Object.fromEntries(Object.entries(REAL).map(([k, p]) => [k, sha(p)])), BEFORE);
});
