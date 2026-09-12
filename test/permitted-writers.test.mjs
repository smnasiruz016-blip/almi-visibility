/**
 * ITEM 14 · AMENDMENT 2 — THE REGISTER OF PERMITTED WRITERS, AND ITS TEETH.
 *
 * > "The six existing writers are permitted because they are declared, not
 * > because they are quiet."
 *
 * 🔴 THIS FILE RECORDS A FAILURE AGAINST ITEM 14 AND IS GREEN WHILE IT DOES.
 * Two write sites default to writing. The test pins exactly those two, so the
 * suite stays an honest measurement: fixing a writer turns a pin red and forces
 * the row to be re-run, and a THIRD ungated writer turns it red too.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { analyseWriters, gateOf, destinationFlagIn, REQUIRED_FIELDS } from "../tools/permitted-writers.mjs";
import { PERMITTED_PAGE_WRITERS } from "../config/permitted-page-writers.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const real = analyseWriters();

/** The registered files' REAL source, so an injected run differs from reality by one thing only. */
const realSources = () => PERMITTED_PAGE_WRITERS.map((e) => ({ file: e.file, text: readFileSync(REPO + e.file, "utf8") }));

/* ================================================================== *
 * (d) THE REGISTER RECONCILES WITH THE CENSUS — EXACTLY.
 * ================================================================== */

test("(d) 🔴 every page write the census finds is named in the register — no undeclared writer", () => {
  assert.deepEqual(real.undeclared, [], `undeclared page writers: ${real.undeclared.join(", ")} — add them to config/permitted-page-writers.mjs in a PR somebody reads`);
});

test("(d) 🔴 every register entry is still a real writer — no stale entry", () => {
  assert.deepEqual(real.stale, [], `stale register entries: ${real.stale.join(", ")} — remove them`);
});

test("(d) every entry declares the number of write sites the census finds in it", () => {
  assert.deepEqual(real.siteMismatch, []);
  const declared = PERMITTED_PAGE_WRITERS.reduce((n, e) => n + e.sites, 0);
  assert.equal(declared, real.census.hits.PAGE_WRITE.length, "the register's site total and the census disagree");
});

test("(d) 🔴 SEVEN writers, EIGHT sites — the count is declared, and changing it is a reviewed change", () => {
  assert.equal(PERMITTED_PAGE_WRITERS.length, 7);
  assert.equal(real.census.hits.PAGE_WRITE.length, 8);
  assert.equal(real.reconciles, true);
});

/**
 * 🔴 THE GATING FLAG IS NAMED PER WRITER — technical-owner ruling, 12 Sep 2026.
 * Six writers use write-law's --confirm; the crawler uses --live AND
 * --i-have-the-owners-green. Naming it stops the variation hiding, and each
 * named flag is checked to be REALLY parsed by that writer.
 */
test("🔴 every writer names the flag(s) that gate it, and each named flag appears in that writer's source", () => {
  for (const e of PERMITTED_PAGE_WRITERS) {
    assert.ok(Array.isArray(e.gateFlags) && e.gateFlags.length > 0, `${e.file} names no gating flag`);
    const src = readFileSync(`${REPO}${e.file}`, "utf8");
    for (const flag of e.gateFlags) {
      const parsed = flag === "--confirm" ? /writePermission\(/.test(src) : src.includes(`"${flag.slice(2)}"`);
      assert.ok(parsed, `${e.file} names ${flag} but its source does not parse it`);
    }
  }
  const crawl = PERMITTED_PAGE_WRITERS.find((e) => e.file === "bin/crawl.mjs");
  assert.deepEqual(crawl.gateFlags, ["--live", "--i-have-the-owners-green"]);
  assert.match(crawl.gateRuling, /TECHNICAL-OWNER RULING, 12 Sep 2026/);
  assert.equal(PERMITTED_PAGE_WRITERS.filter((e) => e.gateFlags.join() === "--confirm").length, 6);
  assert.match(readFileSync(`${REPO}PHASE_0_FROZEN_GAP_REGISTER.md`, "utf8"), /TECHNICAL-OWNER RULING — THE CRAWLER'S TWO FLAGS SATISFY "DRY-RUN BY DEFAULT"/);
});

test("(d) every entry states all four things — writes · where · gatedBy · why", () => {
  assert.deepEqual(real.incomplete, []);
  for (const e of PERMITTED_PAGE_WRITERS) {
    for (const k of REQUIRED_FIELDS) assert.ok(e[k].length > 20, `${e.file}: ${k} is too thin to be read by a human`);
  }
});

/**
 * 🔴 A REASON NOBODY CAN STATE IS WRITTEN AS UNKNOWN, NOT INVENTED. #49 had one:
 * nursing-chain. It was DETERMINED on 12 September 2026 (night) rather than
 * filled in — the chain half is superseded, the fetch half is load-bearing —
 * and the determination is a document, so the stated reason can be checked.
 */
test("🔴 no reason is UNKNOWN now — and the one that was is backed by its written determination", () => {
  assert.deepEqual(PERMITTED_PAGE_WRITERS.filter((e) => !e.whyKnown).map((e) => e.file), []);
  for (const e of PERMITTED_PAGE_WRITERS) assert.doesNotMatch(e.why, /^UNKNOWN\b/);
  const nc = PERMITTED_PAGE_WRITERS.find((e) => e.file === "bin/nursing-chain.mjs");
  assert.match(nc.why, /NURSING_CHAIN_SUPERSESSION\.md/);
  const doc = readFileSync(`${REPO}NURSING_CHAIN_SUPERSESSION.md`, "utf8");
  assert.match(doc, /Nothing was removed/);
  // The load-bearing claim, checked against the source rather than the prose:
  for (const reader of ["bin/profession-chain.mjs", "bin/placement-measure.mjs"]) {
    assert.match(readFileSync(`${REPO}${reader}`, "utf8"), /runs\/_profession-cache/, `${reader} no longer reads the cache — re-read the determination`);
  }
});

test("🔴 CONTROL: an entry whose reason is UNKNOWN must say so in its first word", () => {
  const liar = { ...PERMITTED_PAGE_WRITERS[0], whyKnown: false, why: "because it is useful" };
  assert.doesNotMatch(liar.why, /^UNKNOWN\b/, "the fixture must be the dishonest shape");
  const r = analyseWriters({ sources: realSources(), register: [...PERMITTED_PAGE_WRITERS.slice(1), liar] });
  // Reconciliation is about files, not honesty — the honesty rule is this file's own assertion.
  assert.equal(r.reconciles, true);
  assert.ok(!(liar.whyKnown === false && /^UNKNOWN\b/.test(liar.why)), "the dishonest entry is detectable");
});

/* ---- RED, BOTH DIRECTIONS, BY INJECTION ------------------------------ */

test("🔴 RED: a writer in the CODE and not in the REGISTER fails reconciliation", () => {
  const r = analyseWriters({
    sources: [...realSources(), { file: "bin/undeclared-writer.mjs", text: 'writeFileSync(join(out, "page.html"), html, "utf8");\n' }],
  });
  assert.deepEqual(r.undeclared, ["bin/undeclared-writer.mjs"]);
  assert.equal(r.reconciles, false);
});

test("🔴 RED: a writer in the REGISTER and not in the CODE is stale and fails reconciliation", () => {
  const r = analyseWriters({
    sources: realSources(),
    register: [...PERMITTED_PAGE_WRITERS, { ...PERMITTED_PAGE_WRITERS[0], file: "bin/long-gone.mjs" }],
  });
  assert.deepEqual(r.stale, ["bin/long-gone.mjs"]);
  assert.equal(r.reconciles, false);
});

test("🔴 RED: a new write site inside an already-registered writer fails reconciliation", () => {
  const sources = realSources();
  const i = sources.findIndex((s) => s.file === "bin/build-page.mjs");
  sources[i] = { ...sources[i], text: `${sources[i].text}\nwriteFileSync(join(outDir, "second.html"), html, "utf8");\n` };
  const r = analyseWriters({ sources });
  assert.deepEqual(r.siteMismatch, [{ file: "bin/build-page.mjs", declared: 1, found: 2 }]);
  assert.equal(r.reconciles, false);
});

test("CONTROL: the real sources injected unchanged reconcile exactly — the seam adds nothing", () => {
  const r = analyseWriters({ sources: realSources() });
  assert.equal(r.reconciles, true);
  assert.equal(r.sites.length, 8);
});

/* ================================================================== *
 * (d) DRY-RUN BY DEFAULT — MEASURED FROM THE SOURCE, NOT READ FROM A COMMENT.
 * ================================================================== */

/**
 * 🔴 ZERO SINCE 12 SEPTEMBER 2026 (night). #49 pinned TWO here and FAILED item
 * 14 on them: the owner report writer wrote on every run, and the chain runner
 * wrote its fetch cache with no flag. Both are now behind --confirm. The pin is
 * now ZERO, so a writer that defaults to writing turns this red at once.
 */
test("(d) 🔴 ZERO write sites DEFAULT TO WRITING — every one is dry-run by default", () => {
  assert.deepEqual(real.defaultsToWriting.map((s) => `${s.file}:${s.line} :: ${s.text}`), []);
});

test("(d) all EIGHT sites sit behind their declared gate", () => {
  const gated = real.sites.filter((s) => s.gated);
  assert.equal(gated.length, 8);
  for (const s of gated) assert.ok(s.by, `${s.file}:${s.line} is gated by nothing it can name`);
});

test("🔴 CONTROL: the gate finder FIRES on an ungated write and on a write in the wrong branch", () => {
  const top = ['const p = writePermission({ target: LOCAL, argv });', 'writeFileSync(out, html, "utf8");'];
  assert.equal(gateOf(top, 2, "permission.mayWrite").gated, false, "a top-level write was called gated");

  // The branch that runs when writing is NOT permitted gates nothing.
  const wrong = ["if (!permission.mayWrite) {", '  writeFileSync(out, html, "utf8");', "}"];
  assert.equal(gateOf(wrong, 2, "permission.mayWrite").gated, false, "a write inside if (!mayWrite) was called gated");

  // A condition on some OTHER variable is not the gate.
  const other = ["if (outDir) {", '  writeFileSync(out, html, "utf8");', "}"];
  assert.equal(gateOf(other, 2, "permission.mayWrite").gated, false);
});

test("CONTROL: the gate finder recognises the three real gate shapes", () => {
  assert.equal(gateOf(['if (permission.mayWrite) writeFileSync(f, b, "utf8");'], 1, "permission.mayWrite").gated, true);
  assert.equal(gateOf(["if (x) {", "  if (permission.mayWrite) {", '    writeFileSync(f, b, "utf8");', "  }", "}"], 3, "permission.mayWrite").gated, true);
  assert.equal(
    gateOf(["if (outDir) {", "  if (!permission.mayWrite) console.log(1);", "  else {", '    writeFileSync(f, b, "utf8");', "  }", "}"], 4, "permission.mayWrite").gated,
    true,
  );
  // A token that merely CONTAINS the gate's name is not the gate.
  assert.equal(gateOf(["if (alive) {", '  writeFileSync(f, b, "utf8");', "}"], 2, "live").gated, false);
});

/* ================================================================== *
 * (d) WRITES ONLY INSIDE THIS REPOSITORY — WHAT CAN AND CANNOT BE SEEN.
 * ================================================================== */

test("(d) 0 writes to a literal path outside this repository", () => {
  assert.deepEqual(real.census.hits.OUTSIDE_REPO_WRITE, []);
});

/**
 * 🔴 AND THE FLAG IS NOW CONFINED. Every one of the seven takes its destination
 * from an operator flag — detected in each file, not taken from the entry — and
 * since 12 September 2026 (night) every one refuses a path outside this
 * repository. `test/write-confinement.test.mjs` proves the refusal on a real
 * writer; this checks that the register says so for all seven.
 */
test("(d) 🔴 7 of 7 writers take an operator destination, and 7 of 7 are confined before their first write", () => {
  assert.deepEqual(real.destinationMismatch, []);
  assert.equal(PERMITTED_PAGE_WRITERS.filter((e) => e.destinationOverridable).length, 7);
  assert.deepEqual(real.unconfined, []);
  for (const e of PERMITTED_PAGE_WRITERS) assert.match(e.where, /confined by confineToRepo/, `${e.file}: the register does not state its confinement`);
});

test("CONTROL: the destination detector knows all three spellings, and a fixed path is not a flag", () => {
  assert.equal(destinationFlagIn('const out = arg("out", "x");'), true);
  assert.equal(destinationFlagIn('const outDir = flag("out");'), true);
  assert.equal(destinationFlagIn('argv.find((a) => a.startsWith("--out="))'), true);
  assert.equal(destinationFlagIn('const OUT = "runs/fixed.html";'), false);
});
