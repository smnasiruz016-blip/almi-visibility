/**
 * 🔴 ITEM 53 — PORTABILITY, PROVED ON SOMETHING UNSEEN, WITH THE ISOLATION
 * ASSERTED DURING THAT SAME RUN.
 *
 * The first product is loaded INTO THE SAME PROCESS, private records and all,
 * before the neutral declared test product is run — otherwise "nothing leaked"
 * would be a statement about an empty room.
 */
import test from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { productFromArgv, availableProducts } from "../src/product-cli.mjs";
import { subjectModule, subjectDir } from "./support/subjects.mjs";
import { registeredProducts, coverage } from "../src/product.mjs";
import { loadRegistry, census } from "../src/facts/registry.mjs";
import { licencesVisibleTo, engineLicences, quotabilityState, licenceClause } from "../src/facts/licences.mjs";
import { declaredGaps } from "../src/facts/gaps.mjs";
import { validateRecord } from "../src/facts/validate.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NEUTRAL = "neutral-test-ferments";
const FIRST = "almi-oet";

/* ---- the first product, present and populated ---------------------------- */
const first = await productFromArgv([`--product=${FIRST}`]);
const firstRegistry = await loadRegistry(first.factsDir, first.productId);
const firstPrivateLicences = Object.keys(licencesVisibleTo(FIRST)).filter((k) => !(k in engineLicences()));
const firstGaps = declaredGaps(FIRST);
const firstIds = new Set(firstRegistry.records.map((r) => r.id));
const firstHosts = new Set(firstRegistry.records.map((r) => { try { return new URL(r.source.url).hostname; } catch { return null; } }).filter(Boolean));

/* ---- THE RUN: the generic core, given the neutral product ----------------- */
let run = null;
let runError = null;
try {
  const p = await productFromArgv([`--product=${NEUTRAL}`]);
  const reg = await loadRegistry(p.factsDir, p.productId);
  const c = census(reg.records, { productId: p.productId, now: new Date("2026-09-13T12:00:00Z") });
  run = { p, reg, c, cov: coverage(p.productId), gaps: declaredGaps(p.productId), visible: licencesVisibleTo(p.productId), output: JSON.stringify(c) };
} catch (e) {
  runError = e;
}

test("🔴 53 · THE DECLARATION — a neutral test product, declared as one, sharing no subject, axis, source or licence with the first", async () => {
  assert.ok(availableProducts().includes(NEUTRAL));
  const { PRODUCT, DECLARATION } = await subjectModule(NEUTRAL, "product.mjs");
  assert.equal(PRODUCT.declaredTestProduct, true);
  assert.equal(DECLARATION.row, 53);
  assert.notEqual(PRODUCT.axis.key, first.axis.key);
  assert.deepEqual(PRODUCT.variants.filter((v) => first.variants.includes(v)), []);
  assert.ok(runError === null, `the run did not complete: ${runError?.message}`);
  const subjects = new Set(run.reg.records.map((r) => r.claim.subject));
  const predicates = new Set(run.reg.records.map((r) => r.claim.predicate));
  assert.deepEqual(firstRegistry.records.filter((r) => subjects.has(r.claim.subject) || predicates.has(r.claim.predicate)).map((r) => r.id), [], "the test product was shaped around the first product's claims");
  assert.deepEqual(run.reg.records.filter((r) => firstHosts.has(new URL(r.source.url).hostname)).map((r) => r.id), []);
  assert.deepEqual(run.reg.records.filter((r) => r.licence !== "DECLARED-TEST-DATA").map((r) => r.id), []);
});

test("🔴 53 · THE RUN — the generic core INITIALIZES and DISCOVERS the neutral product with no first-product knowledge", () => {
  assert.equal(runError, null, `the core could not run the neutral product: ${runError?.stack}`);
  const { reg, c, cov, gaps } = run;
  assert.deepEqual(reg.files, ["drink-ferments.mjs", "vegetable-ferments.mjs"]);
  assert.equal(reg.records.length, 4);
  assert.equal(c.validation.valid, true, JSON.stringify(c.validation.invalidRecords.concat(c.validation.registryErrors), null, 1));
  assert.equal(c.total, 4);
  assert.deepEqual(Object.keys(c.bySubject).sort(), ["cabbage-brine", "fermented-paste", "sugar-water-ferment", "tea-ferment"]);
  assert.deepEqual(c.byStatus, { lead: 4 });
  assert.deepEqual(c.byQuotabilityState, { PERMITTED: 0, RESERVED: 4, PROHIBITED: 0, UNREAD: 0 });
  assert.deepEqual([cov.axis, cov.declared, cov.withAPage, cov.missing.length], ["ferment", 5, 0, 5]);
  assert.deepEqual(gaps.map((g) => g.claim), ["kimchi-brine.minimum-salt-by-weight.ferment=kimchi"]);
  assert.ok(registeredProducts().includes(FIRST) && registeredProducts().includes(NEUTRAL), "both products must be registered in this run");
});

test("🔴 53 · DURING THAT SAME RUN — nothing private of the first product crossed the boundary: evidence, facts, licences, gaps", () => {
  assert.equal(runError, null);
  // population first: an isolation check over an empty first product proves nothing
  assert.ok(firstRegistry.records.length > 0 && firstPrivateLicences.length > 0 && firstGaps.length > 0, "the first product is not populated — the no-leak half would be vacuous");

  // facts and evidence records
  for (const r of run.reg.records) assert.equal(r._productId, NEUTRAL);
  assert.deepEqual(run.reg.records.filter((r) => firstIds.has(r.id)).map((r) => r.id), [], "a first-product record was loaded into the neutral run");
  for (const id of firstIds) assert.ok(!run.output.includes(id), `the neutral census output names first-product record ${id}`);
  for (const host of firstHosts) assert.ok(!run.output.includes(host), `the neutral census output names first-product source host ${host}`);

  // licence terms — every accessor, not just the catalogue view
  for (const key of firstPrivateLicences) {
    assert.equal(key in run.visible, false, `first-product licence ${key} is visible to the neutral product`);
    assert.equal(quotabilityState(key, NEUTRAL), "UNREAD", `the state of ${key} leaked to the neutral product`);
    assert.equal(licenceClause(key, NEUTRAL), null, `the clause of ${key} leaked to the neutral product`);
    assert.ok(!run.output.includes(key), `the neutral census output names ${key}`);
  }
  // an attempt to borrow a first-product licence is refused by the validator itself
  const borrowed = validateRecord({ ...run.reg.records[0], licence: firstPrivateLicences[0] });
  assert.ok(borrowed.errors.some((e) => e.law === "F17"), "a neutral record could cite a first-product licence");

  // declared gaps
  assert.ok(run.gaps.every((g) => g.productId === NEUTRAL));
  for (const g of firstGaps) assert.ok(!run.output.includes(g.claim), `a first-product gap reached the neutral census: ${g.claim}`);
});

test("🔴 53 · COSTS AND LEARNING — neither class exists tied to a product, so there is nothing to leak and nothing proved isolated (item 54)", () => {
  const ledger = createJsonlStore(`${REPO}runs/cost/ledger.jsonl`).readAll();
  assert.deepEqual(ledger.filter((e) => e.product_id || e.productId || e.product).map((e) => e.entry_id), [], "a cost entry now names a product — item 54's input may exist; re-sit it");
  assert.deepEqual(ledger.filter((e) => JSON.stringify(e).includes(NEUTRAL)).map((e) => e.entry_id), [], "the run wrote a cost entry about the neutral product");
  const tracked = execFileSync("git", ["ls-files", "src", "bin", "runs", "products"], { cwd: REPO, encoding: "utf8" }).split("\n");
  assert.deepEqual(tracked.filter((f) => /learning/i.test(f)), [], "a learning record now exists — item 54's input may exist; re-sit it");
});

test("🔴 53 · THE SAME RUN THROUGH THE REAL ENTRY POINT — bin/facts.mjs loads no module of the first product and reads none of its files", () => {
  const probe = pathToFileURL(`${REPO}test/support/access-probe.mjs`).href;
  const r = spawnSync(process.execPath, WORLD.argv(["--import", probe, "bin/facts.mjs", "census", `--product=${NEUTRAL}`]), { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: WORLD.envWith() });
  assert.equal(r.status, 0, `the census of the neutral product exited ${r.status}:\n${r.stdout.slice(-2000)}\n${r.stderr.split("\n").filter((l) => !l.startsWith("[probe:")).join("\n").slice(-2000)}`);
  assert.match(r.stdout, /loaded 4 records from 2 files: drink-ferments\.mjs, vegetable-ferments\.mjs/);
  const lines = r.stderr.split(/\r?\n/);
  const modules = lines.filter((l) => l.startsWith("[probe:module] ")).map((l) => l.slice("[probe:module] ".length).replace(/\\/g, "/"));
  const touched = lines.filter((l) => l.startsWith("[probe:fs:")).map((l) => ({ call: l.slice(10, l.indexOf("]")), path: l.slice(l.indexOf("] ") + 2).replace(/\\/g, "/") }));
  // the probe must be SEEING — or its silence proves nothing
  // 🔴 Each product's folder is RESOLVED through the subject roots (owner ruling, 14 September 2026): the neutral
  // product in this repository's fixtures root, the first product in its own repository outside — never a path baked in.
  const slash = (p) => p.replace(/\\/g, "/");
  const NEUTRAL_DIR = slash(subjectDir(NEUTRAL));
  const FIRST_DIR = slash(subjectDir(FIRST));
  /* F02: the run goes through a DECLARED FIXTURE WORLD, whose root holds its own copy of the first product. Watch BOTH
   * places — the probe checking only the real one would be silent about the copy, and prove nothing. */
  const WORLD_FIRST_DIR = slash(join(WORLD.root, FIRST));
  assert.ok(existsSync(WORLD_FIRST_DIR), `the fixture world holds no copy of the first product at ${WORLD_FIRST_DIR} — the probe would watch nothing`);
  const FIRST_DIRS = [FIRST_DIR, WORLD_FIRST_DIR];
  assert.ok(!FIRST_DIR.startsWith(slash(REPO)), `the first product still resolves inside this repository: ${FIRST_DIR}`);
  assert.ok(modules.some((u) => u.includes(`${NEUTRAL_DIR}/facts/vegetable-ferments.mjs`)), "the probe did not see the neutral product's own facts load");
  assert.ok(touched.some((t) => t.path.includes(NEUTRAL_DIR)), "the probe did not see the neutral product's own files touched");
  assert.deepEqual(modules.filter((u) => FIRST_DIRS.some((d) => u.includes(`${d}/`))), [], "the run LOADED a module of the first product");
  // ⚠️ Discovering which products exist lists every subject root and checks each folder has a product.mjs —
  // names only. Anything that READS inside the first product's folder is a leak.
  const namesOnly = (t) => ["existsSync", "statSync"].includes(t.call) && FIRST_DIRS.some((d) => t.path.endsWith(d) || t.path.endsWith(`${d}/product.mjs`));
  assert.deepEqual(touched.filter((t) => FIRST_DIRS.some((d) => t.path.includes(d)) && !namesOnly(t)), [], "the run READ a file of the first product");
  for (const key of firstPrivateLicences) assert.ok(!r.stdout.includes(key), `the census printed first-product licence ${key}`);
  for (const id of firstIds) assert.ok(!r.stdout.includes(id), `the census printed first-product record ${id}`);
});
