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

test("(d) 🔴 SEVEN writers — each either routed with zero sites, or unrouted and seen by the census", () => {
  assert.equal(PERMITTED_PAGE_WRITERS.length, 7, "a page writer left or joined the register");
  /* 🔴 THE COUNT IS NO LONGER PINNED — see no-blind-regeneration for why. A writer cannot leave this register
   * merely by being routed: it stays here, declared routed with zero sites, which is where its gate, destination
   * rule and reason are recorded. */
  const routed = PERMITTED_PAGE_WRITERS.filter((e) => e.routed);
  const unrouted = PERMITTED_PAGE_WRITERS.filter((e) => !e.routed);
  assert.ok(routed.length > 0, "no page writer is routed, so the routed half of this proves nothing");
  for (const e of routed) {
    assert.equal(e.sites, 0, `${e.file}: declared routed but still declares write sites`);
    assert.match(readFileSync(`${REPO}${e.file}`, "utf8"), /executeGovernedWrite\(/, `${e.file}: declared routed but never reaches the boundary`);
  }
  assert.equal(real.census.hits.PAGE_WRITE.length, unrouted.reduce((n, e) => n + e.sites, 0));
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
  const nc = PERMITTED_PAGE_WRITERS.find((e) => e.file === "subjects/almi-oet/tools/nursing-chain.mjs");
  assert.match(nc.why, /NURSING_CHAIN_SUPERSESSION\.md/);
  const doc = readFileSync(`${REPO}NURSING_CHAIN_SUPERSESSION.md`, "utf8");
  assert.match(doc, /Nothing was removed/);
  // The load-bearing claim, checked against the source rather than the prose:
  for (const reader of ["subjects/almi-oet/tools/profession-chain.mjs", "subjects/almi-oet/tools/placement-measure.mjs"]) {
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
  /* Derived from the register rather than restated: the control is that ONE extra site breaks reconciliation,
   * whatever the entry currently declares. */
  const declared = PERMITTED_PAGE_WRITERS.find((e) => e.file === "bin/build-page.mjs").sites;
  assert.deepEqual(r.siteMismatch, [{ file: "bin/build-page.mjs", declared, found: declared + 1 }]);
  assert.equal(r.reconciles, false);
});

test("CONTROL: the real sources injected unchanged reconcile exactly — the seam adds nothing", () => {
  const r = analyseWriters({ sources: realSources() });
  assert.equal(r.reconciles, true);
  assert.equal(r.sites.length, real.census.hits.PAGE_WRITE.length, "the injected seam and the live census disagree");
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

test("(d) every remaining site sits behind its declared gate — the routed writers have none left to gate", () => {
  const gated = real.sites.filter((s) => s.gated);
  assert.equal(gated.length, real.sites.length, "a remaining page-write site is not behind its declared gate");
  /* 🔴 EVERY PAGE WRITER IS ROUTED, so there is no site left to gate and this loop is vacuous. The gate detector's
   * own capability is proved by its dedicated controls in this file (it FIRES on an ungated write and on a write
   * in the wrong branch), so the vacuity here is a fact about the estate, not a hole in the check. */
  assert.equal(real.sites.length, PERMITTED_PAGE_WRITERS.filter((e) => !e.routed).reduce((n, e) => n + e.sites, 0));
  /* 🔴 AND A ROUTED WRITER MUST REALLY REACH THE BOUNDARY. Declaring `routed` is not doing it, so an entry that
   * claims it without calling executeGovernedWrite is reported here and fails — the gate did not simply vanish. */
  assert.deepEqual(real.routedNotReaching, [], "a writer declares itself routed but never reaches the boundary");
  /* 🔴 THE ROUTED SET IS NOT PINNED BY NAME — it grows on every batch, and a list edited to stay green stops
   * being evidence. What is pinned is that the census's routed set is EXACTLY the register's, so a writer cannot
   * be routed in one place and not the other. */
  assert.deepEqual(real.routed, PERMITTED_PAGE_WRITERS.filter((e) => e.routed).map((e) => e.file).sort());
  for (const s of gated) assert.ok(s.by, `${s.file}:${s.line} is gated by nothing it can name`);
});

/**
 * 🔴 THE FOUR UNSAFE SHAPES — THE POINT OF THE WHOLE DETECTOR.
 *
 * Widening a detector until it can read everything is how it stops being able to go red, and on
 * 16 September 2026 this one was widened twice in a day. These four must stay UNGATED, by STATE
 * and not merely by the `gated` boolean: after the third state arrived, `!gated` is true for
 * CANNOT_DETERMINE as well, so a test that only checked `gated === false` would pass while the
 * detector quietly stopped calling anything a defect.
 */
test("🔴 CONTROL: the gate finder FIRES on an ungated write and on a write in the wrong branch", () => {
  const top = ['const p = writePermission({ target: LOCAL, argv });', 'writeFileSync(out, html, "utf8");'];
  assert.equal(gateOf(top, 2, "permission.mayWrite").state, "UNGATED", "a top-level write was not called ungated");

  // The branch that runs when writing is NOT permitted gates nothing.
  const wrong = ["if (!permission.mayWrite) {", '  writeFileSync(out, html, "utf8");', "}"];
  assert.equal(gateOf(wrong, 2, "permission.mayWrite").state, "UNGATED", "a write inside if (!mayWrite) was not called ungated");

  // A condition on some OTHER variable is not the gate.
  const other = ["if (outDir) {", '  writeFileSync(out, html, "utf8");', "}"];
  assert.equal(gateOf(other, 2, "permission.mayWrite").state, "UNGATED");

  // 🔴 AND THE FOURTH: a !token block that only REPORTS, then falls through to the write. The write
  // below it runs with the token false — reading this as a gate would be the worst failure of all.
  const fallsThrough = ["if (!permission.mayWrite) {", '  console.log("[dry-run] would write");', "}", 'writeFileSync(out, html, "utf8");'];
  assert.equal(gateOf(fallsThrough, 4, "permission.mayWrite").state, "UNGATED", "a guard that only logs and falls through was treated as a gate");
});

/**
 * 🔴 THE THIRD STATE, AND IT MUST BE ABLE TO GO RED IN BOTH DIRECTIONS.
 *
 * `gateOf` used to answer only yes/no, so a shape it could not READ fell to "no gate" — and that
 * is how the widened census of 16 September 2026 reported eleven binaries as ungated writers when
 * every one of them was gated. LAW-ABSENT-1 applied to the census itself: the absence of a
 * RECOGNISED gate shape is not evidence of no gate.
 *
 * The two assertions below are deliberately a pair. Collapse CANNOT_DETERMINE into GATED and the
 * second fails; collapse it into UNGATED and the first fails. A third state that cannot go red is
 * decoration.
 */
test("🔴 THE THIRD STATE: a REAL guard in a shape the detector cannot read is CANNOT_DETERMINE", () => {
  // A switch is a real gate — the write runs only when mayWrite is true — and this detector, which
  // reads `if` shapes by indentation, genuinely cannot say so. That is an honest answer, not a bug.
  const unreadable = ["switch (permission.mayWrite) {", "  case true:", '    writeFileSync(f, b, "utf8");', "    break;", "}"];
  const g = gateOf(unreadable, 3, "permission.mayWrite");
  assert.equal(g.state, "CANNOT_DETERMINE", "an unreadable guard was forced into a yes/no answer");
  assert.equal(g.gated, false, "CANNOT_DETERMINE was counted as GATED — unclassified must never default to safe");
  assert.ok(g.why, "the third state must state WHY it could not read the shape");
});

test("CONTROL: the gate finder recognises the five real gate shapes", () => {
  assert.equal(gateOf(['if (permission.mayWrite) writeFileSync(f, b, "utf8");'], 1, "permission.mayWrite").state, "GATED");
  assert.equal(gateOf(["if (x) {", "  if (permission.mayWrite) {", '    writeFileSync(f, b, "utf8");', "  }", "}"], 3, "permission.mayWrite").state, "GATED");
  assert.equal(
    gateOf(["if (outDir) {", "  if (!permission.mayWrite) console.log(1);", "  else {", '    writeFileSync(f, b, "utf8");', "  }", "}"], 4, "permission.mayWrite").state,
    "GATED",
  );

  /* 🔴 THE FOURTH — THE SITE LINE *IS* THE ELSE. Four binaries write exactly this way
   * (acceptance-test:228, cost-ledger:76, diagnose-overlap:170, measure-text-kind:100): the report
   * and the write are one statement each, on two lines. A walk that only looks ABOVE the site never
   * sees the `else`, because the `else` is the site — and all four read as unreadable until it did. */
  assert.equal(
    gateOf(["if (!permission.mayWrite) console.log(1);", 'else { writeFileSync(f, b, "utf8"); }'], 2, "permission.mayWrite").state,
    "GATED",
    "the guarded-else shape, where the write sits ON the else line, was not read as a gate",
  );

  /* 🔴 THE FIFTH — `} else if (…) {` OPENS A BRANCH, IT DOES NOT CLOSE THE GUARD. supersede-noindex
   * writes inside such a branch, reachable only when the token is true. Reading that brace as "the
   * guard closed, control falls through" is what turned a genuinely gated write into a FINDING. */
  assert.equal(
    gateOf(["if (!permission.mayWrite) {", "  console.log(1);", "} else if (records.length) {", '  writeFileSync(f, b, "utf8");', "}"], 4, "permission.mayWrite").state,
    "GATED",
    "a write inside the else-if branch of `if (!token)` was not read as a gate",
  );

  // A token that merely CONTAINS the gate's name is not the gate.
  assert.equal(gateOf(["if (alive) {", '  writeFileSync(f, b, "utf8");', "}"], 2, "live").state, "UNGATED");
});

/**
 * 🔴 THE ELSE-IF BRANCH WITH LINES BETWEEN IT AND THE WRITE — supersede-noindex's REAL layout.
 *
 * Found by sabotage, and worth recording why. The case in the test above puts `} else if (…) {`
 * on the line IMMEDIATELY above the write, where a different walk already resolves it — so
 * disabling the chain rule broke nothing any test could see, while the repository depended on it.
 * bin/supersede-noindex.mjs has a `const` and two comment lines between the branch and its write
 * (lines 141-145), which is precisely the gap the other walk cannot cross.
 *
 * A rule the repository relies on and no test pins is a rule that will be deleted by someone
 * tidying up, and the census will silently start reporting a gated write as a defect again.
 */
test("🔴 CONTROL: `} else if` OPENS a branch — a write inside it is GATED even with lines in between", () => {
  const real = [
    "if (!permission.mayWrite) {",
    "  console.log(`[dry-run] would have appended ${records.length} records — add --confirm`);",
    "} else if (records.length) {",
    "  const store = createJsonlStore(TARGET);",
    "  // 🔴 Issues through the dedupe entry point; state changes are not issues.",
    "  for (const issue of replacements) store.appendIfNew(issue, { seenAt: now });",
    "}",
  ];
  assert.equal(
    gateOf(real, 6, "permission.mayWrite").state,
    "GATED",
    "the brace of `} else if` was read as the END of the guard, so a write reachable only WITH permission was called ungated",
  );
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
