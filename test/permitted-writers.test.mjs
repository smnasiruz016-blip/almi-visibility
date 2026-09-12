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

test("(d) every entry states all four things — writes · where · gatedBy · why", () => {
  assert.deepEqual(real.incomplete, []);
  for (const e of PERMITTED_PAGE_WRITERS) {
    for (const k of REQUIRED_FIELDS) assert.ok(e[k].length > 20, `${e.file}: ${k} is too thin to be read by a human`);
  }
});

/**
 * 🔴 A REASON NOBODY CAN STATE IS WRITTEN AS UNKNOWN, NOT INVENTED. Exactly one
 * is unknown today, and the field says so in its first word.
 */
test("🔴 an unstated reason says UNKNOWN in its first word — never an invented one", () => {
  const unknown = PERMITTED_PAGE_WRITERS.filter((e) => !e.whyKnown);
  assert.deepEqual(unknown.map((e) => e.file), ["bin/nursing-chain.mjs"]);
  for (const e of unknown) assert.match(e.why, /^UNKNOWN\b/);
  for (const e of PERMITTED_PAGE_WRITERS.filter((x) => x.whyKnown)) assert.doesNotMatch(e.why, /^UNKNOWN\b/);
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
 * 🔴 ITEM 14 FAILS HERE. These two write sites have no gate at all:
 *   - the owner report writer writes on every run;
 *   - the chain runner writes its cache of fetched sibling pages whenever a
 *     sibling is not already cached, with no flag.
 * Pinned by file and by the text of the write, so a THIRD cannot join them
 * quietly and a FIX cannot leave the row FAILED quietly either.
 */
test("(d) 🔴 exactly TWO write sites DEFAULT TO WRITING — item 14's FAILURE condition is met", () => {
  const ungated = real.defaultsToWriting.map((s) => `${s.file} :: ${s.text}`).sort();
  assert.deepEqual(ungated, [
    'bin/nursing-chain.mjs :: writeFileSync(cached, res.body, "utf8");',
    'bin/report.mjs :: writeFileSync(out, html, "utf8");',
  ]);
});

test("(d) the other six sites each sit behind their declared gate", () => {
  const gated = real.sites.filter((s) => s.gated);
  assert.equal(gated.length, 6);
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
 * 🔴 AND WHAT THAT ZERO DOES NOT COVER. Every one of the seven takes its
 * destination from an operator flag, and nothing contains that path to this
 * repository. The register must say so, and says it truthfully — the flag is
 * DETECTED in each file, not taken from the entry.
 */
test("(d) 🔴 7 of 7 writers let an operator flag choose the destination — declared, and checked against the source", () => {
  assert.deepEqual(real.destinationMismatch, []);
  assert.equal(PERMITTED_PAGE_WRITERS.filter((e) => e.destinationOverridable).length, 7);
});

test("CONTROL: the destination detector knows all three spellings, and a fixed path is not a flag", () => {
  assert.equal(destinationFlagIn('const out = arg("out", "x");'), true);
  assert.equal(destinationFlagIn('const outDir = flag("out");'), true);
  assert.equal(destinationFlagIn('argv.find((a) => a.startsWith("--out="))'), true);
  assert.equal(destinationFlagIn('const OUT = "runs/fixed.html";'), false);
});
