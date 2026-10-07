/**
 * 🔴 RR-197 · the owner report as a GLOBAL read under F02 (owner approved, 7 Oct 2026; declaration 57e2d6a).
 *
 * F04 decides READ_OWNER_REPORT at GLOBAL_PRODUCT scope before anything is read: no actor, or a denied one (actor:model), refuses with
 * exit 5. A DRY RUN (no --confirm) writes NOTHING — no trail event, no report byte — even with every argument a real run needs.
 * Nothing here writes to the production trail, the report or a store (proved at the end).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { authorise } from "../src/governance/authorisation.mjs";
import { ACTIONS } from "../config/governance/authorisation.mjs";
import { EXCLUDED_ENTRY_POINTS } from "../tools/tenant-scope-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const PROTECTED = ["audit-trail/events.jsonl", "runs/report/index.html", "runs/audit/content-findings.jsonl", "runs/audit/supply-labels.jsonl"].map((f) => join(REPO, f));
const BEFORE = PROTECTED.map(sha);
const AUDIT_DIR = `.test-scratch/audit/rr197-${process.pid}-${randomBytes(3).toString("hex")}`;
let RUNS = 0;
const scratchTrail = () => { const root = join(REPO, AUDIT_DIR); if (!existsSync(root)) return 0; let n = 0; const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (e === "events.jsonl") n += readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).length; } }; walk(root); return n; };
const report = (args) => spawnSync(process.execPath, ["bin/report.mjs", ...args], { cwd: REPO, encoding: "utf8", env: { ...process.env, ALMIVISIBILITY_AUDIT_STORE: AUDIT_DIR, ALMIVISIBILITY_AUDIT_RUN: `rr197-${process.pid}-${++RUNS}` } });

test("RR-197 · the owner report's GLOBAL read is DECLARED (57e2d6a): one F04 action; the entry point named in the tenant-scope census", () => {
  assert.deepEqual(ACTIONS.READ_OWNER_REPORT, { family: "RESEARCH", resourceClass: "PROTECTED_TENANT_DATA" });
  assert.match(EXCLUDED_ENTRY_POINTS["bin/report.mjs"], /GLOBAL read declared under F02/);
  const src = readFileSync(join(REPO, "bin", "report.mjs"), "utf8");
  assert.match(src, /action: "READ_OWNER_REPORT"/);
  // the shared stores are no longer asked of a tenant; the product's subject root still is
  assert.ok(!/RESOURCES\.(evidenceStore|costLedger|crawlBatch|runArtefacts)\(/.test(src), "a shared store is still decided per tenant");
  assert.match(src, /RESOURCES\.subject\(PRODUCT_ID\)/);
  const ask = (actorRef) => authorise({ actorRef, action: "READ_OWNER_REPORT", scope: { scopeType: "GLOBAL_PRODUCT" }, resourceRef: "owner-report", now: "2026-10-07T00:00:00Z" }).allowed;
  assert.deepEqual([ask("actor:cc"), ask("actor:owner"), ask(null), ask("actor:model")], [true, true, false, false]);
});

test("RR-197 · CONTROL: no actor, or actor:model, is REFUSED before anything is read (exit 5) — even with --confirm; nothing is written", () => {
  for (const args of [["--confirm"], ["--confirm", "--actor=actor:model"], ["--actor=actor:model"]]) {
    const r = report(args);
    assert.equal(r.status, 5, `${args.join(" ")}: ${r.stderr}`);
    assert.match(r.stderr, /AUTHORISATION REFUSED — READ_OWNER_REPORT/);
  }
  assert.deepEqual(PROTECTED.map(sha), BEFORE);
});

test("RR-197 · a DRY RUN (no --confirm) with every argument a real run needs writes NOTHING to any trail and no report byte", () => {
  const before = scratchTrail();
  const r = report(["--product=almi-oet", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[dry-run\] would have written/);
  assert.equal(scratchTrail(), before, "a dry run appended to its trail");
  assert.deepEqual(PROTECTED.map(sha), BEFORE, "a dry run changed the production trail, the report or a store");
});

test("the production trail, the report and both stores are byte-identical after this file", () => {
  assert.deepEqual(PROTECTED.map(sha), BEFORE);
});
