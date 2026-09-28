/**
 * 🔴 GAP 2 · gsc-ingest REACHES ITS WRITE PATH — THE CONFINED SYNTHETIC SOURCE (owner ruling, 17 September 2026)
 *
 * The incident test for bin/gsc-ingest.mjs asserted only the dry-run banner, which the bin prints BEFORE it builds
 * its provider or runs the pipeline. Without credentials the run died right after that banner, and the case passed
 * on that death exactly as it would on a refused write. `--source=<file>` now stands in for Search Console with a
 * SYNTHETIC, MARKED source, resolved by the SAME confineToRepo as --store, so the real pipeline (src/search/ingest.mjs)
 * and the real store gate run with no network and no credentials. It chooses WHAT DATA, never WHETHER to write.
 *
 *   DEFAULT          — no --source: the real provider is still built (and, with no key configured, refuses).
 *   REACH            — synthetic source, no --confirm: every observation reaches store.appendIfNew on the dry-run
 *                      store, the run says what it would have written, the canonical stores are byte-identical.
 *   POSITIVE CONTROL — synthetic source, --confirm, a disposable --store: the same path writes 9 marked records
 *                      there, and only there. The cost ledger is never written by a synthetic run.
 *   NOT PERMISSION   — --source and --store without --confirm write nothing.
 *   COMMITTED STATE  — a synthetic run with --confirm and a store under runs/ is REFUSED.
 *   MARKER GUARD     — the committed evidence store holds ZERO marked records; the same guard FAILS on a store the
 *                      real bin wrote from the synthetic source.
 *
 * WHICH GATE FIRED is read from what the binary prints, never from the exit code alone:
 *   CONFINEMENT        — "REFUSED — --source|--store "<path>" resolves to … OUTSIDE this repository" (confineToRepo)
 *   SYNTHETIC-REFUSED  — "REFUSED — --source: …" (an unmarked source, or committed state as the target)
 *   AUTHORIZATION      — "[dry-run] would have written N evidence record(s) → …"
 *   WRITE              — "[synthetic source] wrote N evidence record(s) → …"
 * exactly one must be present; a run showing none never reached either gate — THE THIRD STATE, and a failure.
 *
 * 🔴 WHY THE TWO REACH LINES PROVE REACH: bin/gsc-ingest.mjs prints them only after `runIngest` has RETURNED — by then
 * every observation has been handed to store.appendIfNew, the pipeline's one write call — and after the cost-ledger
 * decision. A run that dies earlier (no key, a refused source, a failed request) cannot print either.
 *
 * 🔴 SECRETS: every spawned run gets GSC_SERVICE_ACCOUNT_KEY_FILE set to the EMPTY string. No key is created, read,
 * printed or compared, and a synthetic run never builds the real provider. Every synthetic run is preloaded with
 * test/support/no-network.mjs, and must show no refusal from it (its own positive control is below).
 * Fixtures live in git-ignored .test-scratch — never under runs/export, runs/evidence, runs/audit or runs/cost, where
 * test/ungated-writers.test.mjs's guardDir sweeps by pattern (D-SWEEP-1). Escape fixtures land in the test's own
 * OS temp directory.
 */
import { test } from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import {
  SYNTHETIC_MARKER, SYNTHETIC_PROPERTY, SYNTHETIC_TOTALS, SYNTHETIC_PAGE, SYNTHETIC_RECORDS, syntheticSource, writeSyntheticSource,
} from "./support/gsc-synthetic-source.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BIN = "bin/gsc-ingest.mjs";
const EVIDENCE = join(REPO, "runs", "evidence", "evidence.jsonl");
const LEDGER = join(REPO, "runs", "cost", "ledger.jsonl");
const NO_NETWORK = pathToFileURL(join(REPO, "test", "support", "no-network.mjs")).href;
const fingerprint = (f) => (existsSync(f) ? createHash("sha256").update(readFileSync(f)).digest("hex") : "ABSENT");
const lines = (f) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim() !== "") : []);

const SWEPT = ["export", "evidence", "audit", "cost"].map((d) => join(REPO, "runs", d) + sep);
function source(spec) {
  const s = writeSyntheticSource(REPO, "gsc-source-", spec);
  assert.ok(SWEPT.every((d) => !(s.dir + sep).startsWith(d)), `fixture ${s.dir} sits under a guardDir-swept directory`);
  return s;
}
const outsideDir = () => mkdtempSync(join(tmpdir(), "gsc-source-outside-"));

/** The committed-state guard: how many records in a store carry the synthetic marker. */
const markedRecords = (file) => lines(file).filter((l) => l.includes(SYNTHETIC_MARKER)).length;
function assertNoSynthetic(file) {
  const n = markedRecords(file);
  if (n !== 0) throw new Error(`${file} holds ${n} record(s) carrying the synthetic marker "${SYNTHETIC_MARKER}"`);
}

const CONFINEMENT = /REFUSED — --(?:source|store) "[^\n]*" resolves to [^\n]*, which is OUTSIDE this repository/;
const REFUSED = /REFUSED — --source: /;
const AUTHORIZATION = /\[dry-run\] would have written (\d+) evidence record\(s\) → ([^\n]*?) \(synthetic source: never the cost ledger\)/;
const WRITE = /\[synthetic source\] wrote (\d+) evidence record\(s\) → ([^\n]*?) — the cost ledger was not written/;

const run = (args, { preload = true } = {}) => spawnSync(process.execPath, WORLD.argv([...(preload ? ["--import", NO_NETWORK] : []), BIN, ...args]), {
  cwd: REPO, encoding: "utf8", timeout: 60_000, maxBuffer: 64 * 1024 * 1024,
  env: WORLD.envWith({ ...process.env, GSC_SERVICE_ACCOUNT_KEY_FILE: "" }),
});
function gateFired(r) {
  const seen = [
    CONFINEMENT.test(r.stderr) && "CONFINEMENT",
    !CONFINEMENT.test(r.stderr) && REFUSED.test(r.stderr) && "SYNTHETIC-REFUSED",
    AUTHORIZATION.test(r.stdout) && "AUTHORIZATION",
    WRITE.test(r.stdout) && "WRITE",
  ].filter(Boolean);
  assert.ok(seen.length <= 1, `more than one gate outcome printed (${seen.join(", ")})`);
  return seen[0] ?? "NEITHER";
}
const show = (r) => `\nstatus: ${r.status}\nstdout: ${r.stdout.slice(-2000)}\nstderr: ${r.stderr.slice(0, 2000)}`;
const noNetworkAsked = (r) => assert.doesNotMatch(r.stderr, /\[no-network\] refused/, "a synthetic run asked for the network");
const synthetic = (extra) => [`--property=${SYNTHETIC_PROPERTY}`, ...extra];

test("DEFAULT · without --source the bin still builds the real Search Console provider", () => {
  const src = readFileSync(join(REPO, BIN), "utf8");
  /* F77 R2 (RR-82): the provider is built exactly as before and then JOURNALED for its operation — the real one without --source. */
  assert.match(src, /const baseProvider = SOURCE === null \? liveProvider\(governor\) : syntheticProvider\(SOURCE, governor\);/);
  assert.match(src, /const \{ provider, counters: meteredCalls \} = journaledProvider\(\{ provider: baseProvider, operation, persist: persistJournal \}\);/);
  /* F03: the live provider is the real one, built only through the run's SEARCH_CONSOLE_API connector — its fetch, and the
   * key-file path read from the ONE variable that connector's declaration names. */
  assert.match(src, /return createGoogleSearchConsoleProvider\(\{ governor, fetchImpl: connector\.fetch, keyFilePath: process\.env\[connector\.credentialName\] \}\);/);
  assert.match(src, /const SOURCE = sourceArg === null \? null : confineToRepo\(sourceArg, \{ label: "--source" \}\);/);
});

test("🔴 THIRD STATE · with no --source and no key, the run dies BEFORE its write decision: the banner is there, no gate outcome is — the old assertion passed on exactly this", () => {
  const before = [fingerprint(EVIDENCE), fingerprint(LEDGER)];
  /* F03: the live path names its subject so the run passes the connector decision and reaches the provider. */
  const r = run(["--property=sc-domain:example.invalid", WORLD.subjectArg]);
  assert.notEqual(r.status, 0, show(r));
  assert.match(r.stdout, /\[dry-run\] no writes will happen/, "the banner the old incident case asserted");
  assert.match(r.stderr, /the connector's declared credential variable is not set/, "the real provider was not the one that stopped this run");
  assert.equal(gateFired(r), "NEITHER", show(r));
  assert.deepEqual([fingerprint(EVIDENCE), fingerprint(LEDGER)], before);
});

test("🔴 REACH · synthetic source, NO --confirm: every record reaches the store gate and is refused; the canonical stores are byte-identical", () => {
  const before = [fingerprint(EVIDENCE), fingerprint(LEDGER)];
  const s = source();
  try {
    const r = run(synthetic([`--source=${s.file}`]));
    assert.equal(r.status, 0, show(r));
    noNetworkAsked(r);
    assert.equal(gateFired(r), "AUTHORIZATION", show(r));
    const [, n, target] = r.stdout.match(AUTHORIZATION);
    assert.equal(Number(n), SYNTHETIC_RECORDS, "the run did not hand every observation to the store");
    assert.equal(target, EVIDENCE, "the refused write was not aimed at the canonical store");
    // consumption: these numbers exist only in the source file
    assert.match(r.stdout, new RegExp(`clicks=${SYNTHETIC_TOTALS.clicks}  impressions=${SYNTHETIC_TOTALS.impressions}`));
    assert.match(r.stdout, /cost ledger \(synthetic source, NEVER written\)/);
    assert.deepEqual([fingerprint(EVIDENCE), fingerprint(LEDGER)], before, "a refused synthetic run changed committed state");
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("CONTROL · synthetic source, --confirm, a disposable --store: the same path writes 9 marked records there, and only there", () => {
  const before = [fingerprint(EVIDENCE), fingerprint(LEDGER)];
  const s = source();
  const out = source();
  const store = join(out.dir, "store.jsonl");
  try {
    assert.equal(existsSync(store), false);
    const r = run(synthetic([`--source=${s.file}`, `--store=${store}`, "--confirm"]));
    assert.equal(r.status, 0, show(r));
    noNetworkAsked(r);
    assert.equal(gateFired(r), "WRITE", show(r));
    const [, n, target] = r.stdout.match(WRITE);
    assert.equal(Number(n), SYNTHETIC_RECORDS);
    assert.equal(target, store, "the run reported a different store than the one it was given");
    const records = lines(store).map((l) => JSON.parse(l));
    assert.equal(records.filter((x) => x.record_type === "observation").length, SYNTHETIC_RECORDS);
    assert.equal(markedRecords(store), lines(store).length, "a record written from the synthetic source does not carry the marker");
    assert.ok(records.some((x) => JSON.stringify(x.value ?? {}).includes(SYNTHETIC_PAGE)), "the source's page rows were not stored");
    /* F77 R2 (RR-82): beside the store the run writes ONE thing more — its operation journal, in the declared journal directory,
     * governed, and marked committed once the evidence is. Anything else beside the store is still a failure. */
    assert.deepEqual(readdirSync(out.dir).sort(), ["source.json", "store.jsonl", "store.jsonl.operations"], "the run wrote something beside its store");
    const journals = readdirSync(join(out.dir, "store.jsonl.operations"));
    assert.equal(journals.length, 1, "one operation, one journal");
    const journal = JSON.parse(readFileSync(join(out.dir, "store.jsonl.operations", journals[0]), "utf8"));
    assert.equal(journal.committed, true, "the journal was not marked committed after the evidence was");
    assert.equal(Object.values(journal.calls).every((c) => c.state === "ANSWERED"), true);
    assert.deepEqual([fingerprint(EVIDENCE), fingerprint(LEDGER)], before, "the run wrote committed state");
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
    rmSync(out.dir, { recursive: true, force: true });
  }
});

test("🔴 NOT PERMISSION · --source and --store WITHOUT --confirm write nothing — an absent store stays absent, a held store stays byte-identical", () => {
  const before = [fingerprint(EVIDENCE), fingerprint(LEDGER)];
  const s = source();
  const absent = join(s.dir, "absent.jsonl");
  const held = join(s.dir, "held.jsonl");
  try {
    const r1 = run(synthetic([`--source=${s.file}`, `--store=${absent}`]));
    assert.equal(gateFired(r1), "AUTHORIZATION", show(r1));
    assert.equal(Number(r1.stdout.match(AUTHORIZATION)[1]), SYNTHETIC_RECORDS);
    assert.equal(existsSync(absent), false, "a store was created without --confirm");

    assert.equal(gateFired(run(synthetic([`--source=${s.file}`, `--store=${held}`, "--confirm"]))), "WRITE");
    const fixture = fingerprint(held);
    const r2 = run(synthetic([`--source=${s.file}`, `--store=${held}`]));
    assert.equal(gateFired(r2), "AUTHORIZATION", show(r2));
    assert.equal(Number(r2.stdout.match(AUTHORIZATION)[1]), 0, "the held store's records were not recognised as present");
    assert.equal(fingerprint(held), fixture, "the store changed without --confirm");
    assert.deepEqual([fingerprint(EVIDENCE), fingerprint(LEDGER)], before);
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("🔴 COMMITTED STATE · a synthetic run with --confirm and a store under runs/ is refused before the provider is built", () => {
  const before = [fingerprint(EVIDENCE), fingerprint(LEDGER)];
  const s = source();
  try {
    for (const extra of [[], ["--store=runs/evidence/evidence.jsonl"]]) {
      const r = run(synthetic([`--source=${s.file}`, ...extra, "--confirm"]));
      assert.equal(r.status, 2, show(r));
      assert.equal(gateFired(r), "SYNTHETIC-REFUSED", show(r));
      assert.match(r.stderr, /may not write into committed state/);
      assert.doesNotMatch(r.stdout, /SITE TOTAL/, "the pipeline ran after the refusal");
    }
    assert.deepEqual([fingerprint(EVIDENCE), fingerprint(LEDGER)], before);
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("🔴 UNMARKED SOURCE · a source without the marker, or a property id without it, is refused and nothing runs", () => {
  const unmarked = source(syntheticSource({ marker: "something-else" }));
  const property = source(syntheticSource({ properties: [{ propertyId: "sc-domain:example.invalid", propertyType: "DOMAIN", permissionLevel: "siteFullUser" }] }));
  try {
    for (const [s, prop, why] of [[unmarked, SYNTHETIC_PROPERTY, /does not declare marker/], [property, "sc-domain:example.invalid", /must contain/]]) {
      const r = run([`--property=${prop}`, `--source=${s.file}`]);
      assert.equal(r.status, 2, show(r));
      assert.equal(gateFired(r), "SYNTHETIC-REFUSED", show(r));
      assert.match(r.stderr, why);
      assert.doesNotMatch(r.stdout, /SITE TOTAL/);
    }
  } finally {
    rmSync(unmarked.dir, { recursive: true, force: true });
    rmSync(property.dir, { recursive: true, force: true });
  }
});

test("🔴 CONFINEMENT · a --source outside the repository (absolute, and a ../ escape) is refused by the confinement gate", (t) => {
  const outside = outsideDir();
  const file = join(outside, "source.json");
  writeFileSync(file, JSON.stringify(syntheticSource()), "utf8");
  try {
    const r1 = run(synthetic([`--source=${file}`]));
    assert.equal(gateFired(r1), "CONFINEMENT", show(r1));
    assert.notEqual(r1.status, 0);
    const escape = relative(REPO, file); // lands in OUR temp directory, never beside the repository
    if (isAbsolute(escape)) return t.skip(`the temp directory is on another drive (${outside})`);
    assert.ok(escape.startsWith(`..${sep}`));
    assert.equal(resolve(REPO, escape), file);
    const r2 = run(synthetic([`--source=${escape}`]));
    assert.equal(gateFired(r2), "CONFINEMENT", show(r2));
    assert.notEqual(r2.status, 0);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test("🔴 CONFINEMENT · with a synthetic source and --confirm, a --store outside the repository is refused, and nothing is written there", () => {
  const before = [fingerprint(EVIDENCE), fingerprint(LEDGER)];
  const s = source();
  const outside = outsideDir();
  try {
    const r = run(synthetic([`--source=${s.file}`, `--store=${join(outside, "store.jsonl")}`, "--confirm"]));
    assert.equal(gateFired(r), "CONFINEMENT", show(r));
    assert.notEqual(r.status, 0);
    assert.deepEqual(readdirSync(outside), [], "something was written outside the repository");
    assert.deepEqual([fingerprint(EVIDENCE), fingerprint(LEDGER)], before);
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("CONTROL · the no-network preload does refuse a request, so a synthetic run's silence from it means none was asked", () => {
  const r = spawnSync(process.execPath, ["--import", NO_NETWORK, "--input-type=module", "-e", "try { await fetch('http://127.0.0.1:9/'); } catch {}"], { encoding: "utf8", timeout: 30_000 });
  assert.match(r.stderr, /\[no-network\] refused/);
});

test("🔴 MARKER GUARD · the committed evidence store holds ZERO records carrying the synthetic marker", () => {
  assert.ok(lines(EVIDENCE).length > 0, "the committed evidence store is empty — the guard would have nothing to read");
  assertNoSynthetic(EVIDENCE);
});

test("🔴 MARKER GUARD · POSITIVE CONTROL — the same guard FAILS on a store the real bin wrote from the synthetic source", () => {
  const s = source();
  const store = join(s.dir, "store.jsonl");
  try {
    assert.equal(gateFired(run(synthetic([`--source=${s.file}`, `--store=${store}`, "--confirm"]))), "WRITE");
    assert.equal(markedRecords(store), lines(store).length);
    assert.throws(() => assertNoSynthetic(store), /carrying the synthetic marker/);
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});

test("the synthetic sources and stores are created directly inside .test-scratch, outside every guardDir-swept directory", () => {
  const s = source();
  try {
    assert.equal(dirname(s.dir), join(REPO, ".test-scratch"));
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
});
