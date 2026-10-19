/**
 * F80 · API, webhooks and exports (acceptance _handoffs AlmiVisibility_F80_ACCEPTANCE_2026-10-19.md; RR-291, light proof; owner answer Q7).
 * C1–C3 with firing controls; REAL: one tenant's export, and the same subject asked under another tenant refused by the scope gate.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tenantExport, schemaFaults, EXPORT_SCHEMA, API_ACTIONS } from "../src/export/tenant-exports.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const row = { url: "https://s.example/a", check: "title", category: "CONTENT", weight: 3, result: "FAIL", finding: "f", action: "a", evidenceId: "e" };

test("C1 · JSON and CSV for one tenant, read-only: the API has no write action and the module no write call", () => {
  const e = tenantExport({ tenantId: "tenant:t", results: [row, { ...row, check: "lang", result: "NOT MEASURED", finding: undefined, action: undefined, evidenceId: undefined }], generatedAt: "2026-10-19", bounds: { pages: 1 } });
  assert.equal(e.state, "EXPORTED");
  assert.equal(JSON.parse(e.json).rows.length, 2);
  assert.match(e.csv, /^# visibility-check-results 1\.0\.0 · tenant:t/);
  assert.match(e.csv, /DOES NOT COVER: any other tenant's records/);
  assert.deepEqual([...API_ACTIONS], ["EXPORT_JSON", "EXPORT_CSV"]);
  const src = readFileSync(join(REPO, "src/export/tenant-exports.mjs"), "utf8");
  assert.ok(!/writeFile|appendFile|createWriteStream|executeGovernedWrite|fetch\(/.test(src), "a write or request in the export module");
});

test("C2 · a stable, versioned schema: every row checked; drift is a named fault and refuses the export", () => {
  assert.deepEqual(schemaFaults([row]), []);
  assert.equal(JSON.parse(tenantExport({ tenantId: "t", results: [row], generatedAt: "d", bounds: { b: 1 } }).json).schema.version, EXPORT_SCHEMA.version);
  /* FIRING CONTROLS: a wrong type, a value outside the list and an unknown field each fault */
  assert.match(schemaFaults([{ ...row, weight: "3" }])[0], /weight is string/);
  assert.match(schemaFaults([{ ...row, result: "MAYBE" }])[0], /not one of/);
  assert.match(schemaFaults([{ ...row, extra: 1 }])[0], /not in schema/);
  assert.equal(tenantExport({ tenantId: "t", results: [{ ...row, result: "MAYBE" }], generatedAt: "d", bounds: { b: 1 } }).state, "REFUSED");
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "live-pages.jsonl"));
const run = (tenant) => spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=export", "--subject=almi-oet", `--research-batch=${BATCH}`, "--on=2026-10-19", `--tenant=${tenant}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
test("REAL · C1–C3 · the tenant's own export on the versioned schema; the same subject under another tenant is refused before any read", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const mine = run("tenant:93b991d5afa33b16ccb9166b249593b6");
  assert.equal(mine.status, 0, mine.stderr);
  const rows = Number(/rows (\d+)/.exec(mine.stdout)?.[1]);
  assert.ok(rows > 0, "EMPTY real population");
  assert.match(mine.stdout, /schema visibility-check-results 1\.0\.0/);
  const other = run("tenant:7dca5e2bc05217d695662a63017b1c9a");
  assert.equal(other.status, 3);
  assert.match(other.stderr, /CROSS_TENANT_REFUSED/);
  assert.equal(other.stdout, "");
  console.log(`  REAL: ${mine.stdout.split(/\r?\n/)[1].trim()} | another tenant: CROSS_TENANT_REFUSED, nothing printed`);
});
