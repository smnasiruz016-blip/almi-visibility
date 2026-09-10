/**
 * GATE A — RED FIRST, FOR EVERY MEASUREMENT.
 *
 * The rule this project runs on: **a gate is trusted only once its red has been
 * FORCED.** So each check below is shown FAILING something it must fail, before
 * it is shown passing something it must pass. A test file that only demonstrates
 * green proves the code runs, not that it measures.
 *
 * Zero dependencies — node:test, so `node --test` is the whole toolchain.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { writePermission, LOCAL, PRODUCTION } from "../src/write-law.mjs";
import { tokensOf, textOf } from "../src/gate-a/tokens.mjs";
import { computeShells, uniqueWords, residualTokens, SHELL_DOC_FREQUENCY } from "../src/gate-a/shell.mjs";
import { judgeFact, countFacts, FACT_FRESHNESS_DAYS, urlShapeProblem } from "../src/gate-a/facts.mjs";
import { shingles, jaccard, exactAllPairs, strategyFor, EXACT_ALL_PAIRS_MAX_GROUP } from "../src/gate-a/overlap.mjs";
import { runGateA, MIN_UNIQUE_WORDS } from "../src/gate-a/run.mjs";

const NOW = new Date("2026-09-10T00:00:00Z");

// ───────────────────────── THE WRITE LAW ─────────────────────────────────────

describe("🔴 the write law — PRODUCTION needs both, never either", () => {
  test("RED: --confirm alone does NOT permit a PRODUCTION write", () => {
    const p = writePermission({ target: PRODUCTION, argv: ["--confirm"], env: {} });
    assert.equal(p.mayWrite, false);
    assert.match(p.reason, /ALLOW_PROD_WRITE=1 was NOT set/);
  });

  test("RED: ALLOW_PROD_WRITE=1 alone does NOT permit a PRODUCTION write", () => {
    const p = writePermission({ target: PRODUCTION, argv: [], env: { ALLOW_PROD_WRITE: "1" } });
    assert.equal(p.mayWrite, false);
    assert.match(p.reason, /--confirm was NOT given/);
  });

  test("RED: neither is the default, and the default is dry-run", () => {
    assert.equal(writePermission().mayWrite, false);
    assert.equal(writePermission().mode, "DRY-RUN");
  });

  test("RED: the DEFAULT target is production — a caller who forgets gets the strict rule", () => {
    assert.equal(writePermission({ argv: ["--confirm"] }).mayWrite, false);
  });

  test("RED: an unknown target is refused, never widened", () => {
    const p = writePermission({ target: "prod-ish", argv: ["--confirm"], env: { ALLOW_PROD_WRITE: "1" } });
    assert.equal(p.mayWrite, false);
    assert.match(p.reason, /unknown write target/);
  });

  test("GREEN: both together permit a production write", () => {
    const p = writePermission({ target: PRODUCTION, argv: ["--confirm"], env: { ALLOW_PROD_WRITE: "1" } });
    assert.equal(p.mayWrite, true);
    assert.equal(p.mode, "WRITE");
  });

  test("ALLOW_PROD_WRITE must be exactly \"1\" — not \"true\", not \"yes\"", () => {
    for (const v of ["true", "yes", "TRUE", "0", ""]) {
      assert.equal(
        writePermission({ target: PRODUCTION, argv: ["--confirm"], env: { ALLOW_PROD_WRITE: v } }).mayWrite,
        false,
        v,
      );
    }
  });
});

describe("🔴 a LOCAL write needs --confirm and NOT the production flag", () => {
  // The correction: --out writes a report file on this machine. Demanding
  // ALLOW_PROD_WRITE for it would have made the very first run of this tool type
  // the production flag — and a safety flag typed every day stops being a signal
  // and becomes a keystroke, already sitting in the shell history on the day it
  // was supposed to stop someone.
  test("GREEN: --confirm alone is enough for a local write", () => {
    const p = writePermission({ target: LOCAL, argv: ["--confirm"], env: {} });
    assert.equal(p.mayWrite, true);
    assert.match(p.reason, /stays on this machine/);
  });

  test("🔴 RED: --confirm is still REQUIRED — the tightening is not a loosening", () => {
    assert.equal(writePermission({ target: LOCAL, argv: [], env: {} }).mayWrite, false);
    assert.equal(writePermission({ target: LOCAL, argv: [], env: { ALLOW_PROD_WRITE: "1" } }).mayWrite, false);
  });

  test("🔴 RED: and the local rule must NEVER let a production write through", () => {
    // The classification belongs to the caller and is named at the call site.
    // This asserts the two targets cannot be confused by the same arguments.
    const args = { argv: ["--confirm"], env: {} };
    assert.equal(writePermission({ target: LOCAL, ...args }).mayWrite, true);
    assert.equal(writePermission({ target: PRODUCTION, ...args }).mayWrite, false);
  });
});

// ───────────────────────── TOKENS ────────────────────────────────────────────

describe("tokens — the rendered page, not the source", () => {
  test("RED: script and style CONTENT must not become words", () => {
    const html = "<p>real words here</p><script>var stolen='words words words'</script><style>.a{color:red}</style>";
    const t = tokensOf(html);
    assert.deepEqual(t, ["real", "words", "here"]);
  });

  test("counts are kept — this is a multiset, not a set", () => {
    assert.deepEqual(tokensOf("<p>a a a b</p>"), ["a", "a", "a", "b"]);
  });

  test("word-internal punctuation survives; edge punctuation does not", () => {
    assert.deepEqual(tokensOf("<p>(nurse's) sitemap-index, B2.</p>"), ["nurse's", "sitemap-index", "b2"]);
  });

  test("entities are decoded rather than left as words", () => {
    assert.equal(textOf("<p>a&nbsp;b &amp; c</p>"), "a b & c");
  });
});

// ───────────────────────── SHELL ─────────────────────────────────────────────

describe("🔴 shell — and why definition A's failure direction is a FALSE PASS", () => {
  // Four pages that share "the shared shell words" and differ in one token each.
  const base = "the shared shell words are here";
  const pages = [
    tokensOf(`<p>${base} alpha</p>`),
    tokensOf(`<p>${base} beta</p>`),
    tokensOf(`<p>${base} gamma</p>`),
    tokensOf(`<p>${base} delta</p>`),
  ];

  test("with every page carrying the shell, A and B agree", () => {
    const s = computeShells(pages);
    assert.equal(s.sizeA, 6);
    assert.equal(s.sizeB, 6);
  });

  test("🔴 RED: ONE odd page drops a shell word — A shrinks, B does not", () => {
    // The fifth page is missing the word "shell". Under A the whole group loses
    // it; under B (98% of 5 -> 5 pages needed) ... it also loses it. So push the
    // group past the rounding boundary to show the real difference.
    const many = [];
    for (let i = 0; i < 100; i++) many.push(tokensOf(`<p>${base} w${i}</p>`));
    many.push(tokensOf("<p>the shared words are here odd</p>")); // missing "shell"

    const s = computeShells(many);
    assert.equal(s.shellA.has("shell"), false, "A drops it because ONE page lacks it");
    assert.equal(s.shellB.has("shell"), true, "B keeps it — 100 of 101 pages is above 98%");
    assert.ok(s.sizeA < s.sizeB, "A's shell is SMALLER");
  });

  test("🔴 and a smaller shell means MORE unique words — the false pass", () => {
    const many = [];
    for (let i = 0; i < 100; i++) many.push(tokensOf(`<p>${base} w${i}</p>`));
    many.push(tokensOf("<p>the shared words are here odd</p>"));
    const s = computeShells(many);
    const page = many[0];
    assert.ok(
      uniqueWords(page, s.shellA) > uniqueWords(page, s.shellB),
      "A reports MORE unique words than B for the same page — that is the direction that lets a thin page through",
    );
  });

  test("on a group under ~50, B IS A — the knob does nothing, and it says so", () => {
    const twelve = [];
    for (let i = 0; i < 12; i++) twelve.push(tokensOf(`<p>${base} w${i}</p>`));
    const s = computeShells(twelve);
    assert.equal(s.minPagesForShell, 12, "ceil(0.98 * 12) = 12 — every page");
    assert.equal(s.bEqualsA, true);
    assert.equal(s.sizeA, s.sizeB);
  });

  test("an empty group is reported as empty, not as a shell of nothing", () => {
    assert.equal(computeShells([]).empty, true);
  });

  test("residual is multiset subtraction, in page order", () => {
    const group = [tokensOf("<p>a a b c</p>"), tokensOf("<p>a a b d</p>")];
    const s = computeShells(group);
    assert.deepEqual(residualTokens(group[0], s.shellB), ["c"]);
  });

  test("SHELL_DOC_FREQUENCY is a named constant, not an inline number", () => {
    assert.equal(SHELL_DOC_FREQUENCY, 0.98);
  });
});

// ───────────────────────── FACTS ─────────────────────────────────────────────

describe("🔴 facts — all four fields, and the freshness window that did not exist", () => {
  const good = { value: "Grade B", sourceUrl: "https://www.nmc.org.uk/english-language-requirements/", tier: 1, verifiedDate: "2026-08-31" };

  test("GREEN: all four fields present and fresh", () => {
    assert.equal(judgeFact(good, NOW).counts, true);
  });

  for (const [field, broken] of [
    ["value", { ...good, value: "" }],
    ["sourceUrl", { ...good, sourceUrl: undefined }],
    ["tier", { ...good, tier: undefined }],
    ["verifiedDate", { ...good, verifiedDate: undefined }],
  ]) {
    test(`RED: missing ${field} disqualifies the fact`, () => {
      const j = judgeFact(broken, NOW);
      assert.equal(j.counts, false);
      assert.ok(j.reasons.length > 0);
    });
  }

  test("🔴 RED: a bare home page is not a source for a specific claim", () => {
    assert.ok(urlShapeProblem("https://www.nmc.org.uk/"));
    assert.equal(judgeFact({ ...good, sourceUrl: "https://www.nmc.org.uk/" }, NOW).counts, false);
  });

  test(`🔴 RED: a fact verified ${FACT_FRESHNESS_DAYS + 1} days ago is stale`, () => {
    const stale = new Date(NOW.getTime() - (FACT_FRESHNESS_DAYS + 1) * 86_400_000);
    const j = judgeFact({ ...good, verifiedDate: stale.toISOString().slice(0, 10) }, NOW);
    assert.equal(j.counts, false);
    assert.match(j.reasons.join(" "), /window is 180/);
  });

  test("and one day inside the window still counts — the boundary is where it says", () => {
    const edge = new Date(NOW.getTime() - FACT_FRESHNESS_DAYS * 86_400_000);
    assert.equal(judgeFact({ ...good, verifiedDate: edge.toISOString().slice(0, 10) }, NOW).counts, true);
  });

  test("🔴 D5 RED: a shell fact does not count towards a page's five", () => {
    assert.equal(judgeFact({ ...good, inShell: true }, NOW).counts, false);
  });

  test("🔴 factChecked is ALWAYS zero — link check and fact check are not the same thing", () => {
    const c = countFacts([{ ...good, linkChecked: true }, { ...good, linkChecked: true }], NOW);
    assert.equal(c.linkChecked, 2);
    assert.equal(c.factChecked, 0, "nothing in this pipeline reads a source and confirms a value");
  });

  test("RED: four qualifying facts is not five", () => {
    const four = [good, good, good, good];
    assert.equal(countFacts(four, NOW).passes, false);
    assert.equal(countFacts([...four, good], NOW).passes, true);
  });
});

// ───────────────────────── OVERLAP ───────────────────────────────────────────

describe("🔴 overlap — on the residual, and honest about its strategy", () => {
  test("identical text overlaps 1, disjoint text overlaps 0", () => {
    const a = shingles("one two three four five six seven".split(" "));
    const b = shingles("one two three four five six seven".split(" "));
    const c = shingles("alpha beta gamma delta epsilon zeta eta".split(" "));
    assert.equal(jaccard(a, b), 1);
    assert.equal(jaccard(a, c), 0);
  });

  test("🔴 RED: word order matters — shingles catch what bare words miss", () => {
    const a = shingles("one two three four five six".split(" "));
    const b = shingles("six five four three two one".split(" "));
    assert.equal(jaccard(a, b), 0, "same words, different order — bare-word overlap would say 1");
  });

  test("every page is compared with EVERY sibling, and told which one", () => {
    const pages = [
      { id: "p1", residual: "aaa bbb ccc ddd eee fff".split(" ") },
      { id: "p2", residual: "aaa bbb ccc ddd eee fff".split(" ") },
      { id: "p3", residual: "zzz yyy xxx www vvv uuu".split(" ") },
    ];
    const out = exactAllPairs(pages);
    assert.equal(out.find((o) => o.id === "p1").maxOverlap, 1);
    assert.equal(out.find((o) => o.id === "p1").against, "p2");
    assert.equal(out.find((o) => o.id === "p3").maxOverlap, 0);
  });

  test("🔴 a tiny residual is FLAGGED as noisy, not silently scored", () => {
    const pages = [
      { id: "a", residual: "one two three four five six".split(" ") },
      { id: "b", residual: "one two three four five six".split(" ") },
    ];
    assert.equal(exactAllPairs(pages)[0].noisy, true, "6 residual words is noise wearing a number's clothes");
  });

  test("the strategy is chosen by group size, and says whether it is COMPLETE", () => {
    assert.equal(strategyFor(610).kind, "exact-all-pairs");
    assert.equal(strategyFor(610).complete, true);
    assert.equal(strategyFor(610).pairs, 185_745);
    assert.equal(strategyFor(EXACT_ALL_PAIRS_MAX_GROUP + 1).kind, "minhash-lsh");
    assert.equal(strategyFor(EXACT_ALL_PAIRS_MAX_GROUP + 1).complete, false, "LSH is NOT complete and must not claim to be");
    assert.match(strategyFor(237_413).note, /NOT YET IMPLEMENTED/);
  });
});

// ───────────────────────── THE ORDER (D2-A) ──────────────────────────────────

describe("🔴 D2-A — the order is part of the gate", () => {
  const thin = (id) => ({ id, html: `<p>short page ${id} with far too few words</p>`, whyThisUrl: "x", facts: [] });

  test("🔴 a page rejected on uniqueWords never has its facts or overlap computed", () => {
    const out = runGateA([thin("a"), thin("b"), thin("c")], { now: NOW });
    const a = out.results.find((r) => r.id === "a");
    assert.equal(a.verdict, "REJECT");
    assert.equal(a.rejectedAt, "uniqueWords");
    assert.equal(a.facts, null, "facts were NOT computed for an already-rejected page");
    assert.equal(a.maxOverlap, null, "overlap was NOT computed either");
  });

  test("🔴 and the report says how many pages reached the quadratic stage", () => {
    const out = runGateA([thin("a"), thin("b"), thin("c")], { now: NOW });
    assert.equal(out.reachedOverlap, 0);
    assert.equal(out.eliminatedBefore, 3);
  });

  test("an empty group is VACUOUS, and says so rather than passing", () => {
    assert.equal(runGateA([], { now: NOW }).vacuous, true);
  });

  test("thresholds are reported with the result, so a run carries its own bar", () => {
    const out = runGateA([thin("a")], { now: NOW });
    assert.equal(out.thresholds.MIN_UNIQUE_WORDS, MIN_UNIQUE_WORDS);
    assert.equal(out.thresholds.MAX_SIBLING_OVERLAP, 0.4);
  });
});
