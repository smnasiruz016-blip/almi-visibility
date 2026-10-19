/**
 * F24 · Core Web Vitals and page speed (acceptance _handoffs AlmiVisibility_F24_ACCEPTANCE_2026-10-19.md; RR-291, light proof; owner answer
 * Q2). C1–C3 with firing controls; C1 and C3 REAL — the local lab over the client's own stored page HTML (offline, nothing fetched).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { labRecord, speedFinding, KIND, NOT_MEASURED, LAB_BOUND } from "../src/render/lab-speed.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("C1 · a lab measurement carries its tool, device, date and bound; one without them is refused", () => {
  const r = labRecord({ url: "u", metrics: { lcpMs: 10 }, tool: "chromium", on: "2026-10-19" });
  assert.deepEqual([r.kind, r.tool, r.device, r.on, r.bound], [KIND.LAB, "chromium", "desktop-1366x768", "2026-10-19", LAB_BOUND]);
  /* FIRING CONTROLS */
  assert.throws(() => labRecord({ url: "u", metrics: {}, tool: "", on: "2026-10-19" }));
  assert.throws(() => labRecord({ url: "u", metrics: {}, tool: "t", on: "today" }));
});

test("C2 + C3 · lab and field are separate kinds, never averaged; no field data reads NOT MEASURED, never a lab figure or 0", () => {
  const lab = labRecord({ url: "u", metrics: { lcpMs: 100 }, tool: "t", on: "2026-10-19" });
  const field = { kind: KIND.FIELD, url: "u", metrics: { lcpMs: 2500 } };
  const f = speedFinding("u", [lab, field]);
  assert.equal(f.lab.metrics.lcpMs, 100);
  assert.equal(f.field.metrics.lcpMs, 2500);
  assert.ok(!("lcpMs" in f), "a merged figure");
  /* FIRING CONTROL: without the field record the field is NOT MEASURED — the lab figure is not put in its place */
  assert.equal(speedFinding("u", [lab]).field, NOT_MEASURED);
  assert.equal(speedFinding("v", [lab]).lab, NOT_MEASURED);
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "live-pages.jsonl"));
test("REAL · C1 and C3 · the local lab over the client's stored pages: tool, device, date and bound printed; field data NOT MEASURED", { skip: HERE ? false : "the declared batch is not on this machine", timeout: 240_000 }, (t) => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=page-speed", "--subject=almi-oet", `--research-batch=${BATCH}`, "--on=2026-10-19", "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", timeout: 230_000 });
  assert.equal(r.status, 0, r.stderr);
  /* a machine with no browser (CI) proves nothing here: an explicit SKIP with its reason, never a pass */
  if (/LAB {2}NOT MEASURED/.test(r.stdout)) { t.skip(`no browser on this machine: ${r.stdout.trim().split(/\r?\n/).pop().trim()}`); return; }
  const n = Number(/LAB {4}(\d+) page\(s\)/.exec(r.stdout)?.[1]);
  assert.ok(n >= 10, `EMPTY or shrunken real population: ${n}`);
  assert.match(r.stdout, /tool chromium .* · device desktop-1366x768 · date 2026-10-19/);
  assert.match(r.stdout, /bound {2}the stored HTML document alone/);
  assert.match(r.stdout, /FIELD {2}NOT MEASURED/);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 5).map((l) => l.trim()).join(" | ")}`);
});
