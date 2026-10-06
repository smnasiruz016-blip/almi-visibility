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
import { tokensWithKind, uniqueWordsByKind } from "../src/gate-a/text-kind.mjs";
import { tokensOf, textOf } from "../src/gate-a/tokens.mjs";
import { computeShells, uniqueWords, residualTokens, SHELL_DOC_FREQUENCY } from "../src/gate-a/shell.mjs";
import { judgeFact, countFacts, FACT_FRESHNESS_DAYS, urlShapeProblem } from "../src/gate-a/facts.mjs";
import { shingles, jaccard, exactAllPairs, maxAgainstPopulation, strategyFor, EXACT_ALL_PAIRS_MAX_GROUP } from "../src/gate-a/overlap.mjs";
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

  /* RR-192 · T-1 (RTP-1 S8; PG-A1): five facts is a REVIEW SIGNAL — reported, never a pass; countFacts carries no "passes" any more */
  test("RR-192 T-1: four qualifying facts does not reach the five-fact signal and five does — a labelled signal, never a pass", () => {
    const four = [good, good, good, good];
    assert.equal(countFacts(four, NOW).reachesSignal, false);
    assert.equal(countFacts([...four, good], NOW).reachesSignal, true);
    assert.equal("passes" in countFacts(four, NOW), false, "countFacts still reports a pass");
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

/* RR-192 · T-1 (RTP-1 S8; PG-A1): D2-A's "reject here and STOP" is retired — no stage stops on a number any more. */
describe("🔴 RR-192 · T-1 — no stage stops on 350, five facts or 0.40", () => {
  const thin = (id) => ({ id, html: `<p>short page ${id} with far too few words</p>`, whyThisUrl: "x", facts: [] });

  test("🔴 a page below the 350-word signal is measured on every stage and never rejected for it", () => {
    const out = runGateA([thin("a"), thin("b"), thin("c")], { now: NOW });
    const a = out.results.find((r) => r.id === "a");
    assert.equal(a.belowUniqueWordsSignal, true, "the signal is reported");
    assert.ok(!["uniqueWords", "facts", "overlap"].includes(a.rejectedAt), `rejected on a number: ${a.rejectedAt}`);
    assert.notEqual(a.facts, null, "facts were not computed");
    assert.notEqual(a.maxOverlap, null, "overlap was not computed");
    assert.equal("uniquePass" in a || "factsPass" in a || "overlapPass" in a, false, "a pass field survives");
  });

  test("🔴 and the report says every page reached the overlap stage — none was eliminated before it", () => {
    const out = runGateA([thin("a"), thin("b"), thin("c")], { now: NOW });
    assert.equal(out.reachedOverlap, 3);
    assert.equal(out.eliminatedBefore, 0);
  });

  test("an empty group is VACUOUS, and says so rather than passing", () => {
    assert.equal(runGateA([], { now: NOW }).vacuous, true);
  });

  /* RR-192 · T-1: the figures are reported as SIGNALS, not thresholds — a run carries its signals, never a bar */
  test("signals are reported with the result, never as thresholds", () => {
    const out = runGateA([thin("a")], { now: NOW });
    assert.equal(out.signals.MIN_UNIQUE_WORDS, MIN_UNIQUE_WORDS);
    assert.equal(out.signals.MAX_SIBLING_OVERLAP, 0.4);
    assert.equal("thresholds" in out, false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 🔴 PROSE vs TABULAR — a MEASUREMENT, not a gate. No threshold is asserted
// here because none exists: the owner ruled distribution first, bar afterwards.
// ───────────────────────────────────────────────────────────────────────────
describe("🔴 prose vs tabular — the decomposition, and what it refuses to do", () => {
  test("a token's kind comes from its NEAREST enclosing element", () => {
    const { tokens, kinds } = tokensWithKind(
      "<h2>Grades</h2><p>Some <b>argument</b> here</p><ul><li>Row <span>one</span></li></ul><div>stray</div>",
    );
    const kindOf = (w) => kinds[tokens.indexOf(w)];
    assert.equal(kindOf("grades"), "heading");
    assert.equal(kindOf("argument"), "prose", "a <b> inside a <p> is still prose");
    assert.equal(kindOf("one"), "list", "a <span> inside an <li> is list text");
    assert.equal(kindOf("stray"), "other", "a bare div declares nothing — it must not be flattered into prose");
  });

  test("🔴 RED: text in a bare div is NOT counted as prose", () => {
    const { tokens, kinds } = tokensWithKind("<div>alpha beta gamma</div>");
    assert.equal(tokens.length, 3);
    assert.ok(kinds.every((k) => k === "other"));
    // The red: if `other` were folded into `prose`, this page would report three
    // prose words it has not earned.
    assert.notEqual(kinds[0], "prose");
  });

  test("🔴 the token stream is IDENTICAL to tokensOf — or the split is not the gate's number", () => {
    const html = "<p>One two</p><ul><li>Three</li><li>Four five</li></ul><h3>Six</h3>";
    assert.deepEqual(tokensWithKind(html).tokens, tokensOf(html));
  });

  test("🔴 the four kinds SUM to uniqueWords, exactly", () => {
    const html = "<p>alpha beta</p><li>gamma delta</li><h2>epsilon</h2><div>zeta</div>";
    const { tokens, kinds } = tokensWithKind(html);
    const shell = new Map([["alpha", 1]]);
    const r = uniqueWordsByKind(tokens, kinds, shell);
    assert.equal(r.counts.prose + r.counts.list + r.counts.heading + r.counts.other, r.total);
    assert.equal(r.total, uniqueWords(tokens, shell), "must equal what the gate already reports");
  });

  test("🔴 RED: a page can reach a big uniqueWords on LIST TEXT ALONE — the hole this measures", () => {
    const rows = Array.from({ length: 200 }, (_, i) => `<li>organisation ${i} listening b reading b</li>`).join("");
    const { tokens, kinds } = tokensWithKind(`<p>short intro</p><ul>${rows}</ul>`);
    const r = uniqueWordsByKind(tokens, kinds, new Map());
    assert.ok(r.total > 350, "the page clears Gate A's bar");
    assert.ok(r.counts.prose < 10, "on two words of prose");
    // That is the defect: the bar is satisfiable by a data table.
  });

  test("unbalanced markup does not corrupt every token after it", () => {
    const { tokens, kinds } = tokensWithKind("<li>inside</li></p><p>after</p>");
    assert.equal(kinds[tokens.indexOf("inside")], "list");
    assert.equal(kinds[tokens.indexOf("after")], "prose");
  });

  test("script and style content is not text at all", () => {
    const { tokens } = tokensWithKind("<p>keep</p><script>var drop = 1;</script><style>.drop{}</style>");
    assert.deepEqual(tokens, ["keep"]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 🔴 THE DENOMINATOR RULE — a gate may not build its denominator out of its
// own output. Found by the nursing/from-india acceptance test, where overlap
// against SURVIVORS returned a perfect 0.0000 with a survivor population of 0.
// ───────────────────────────────────────────────────────────────────────────
describe("🔴 overlap is scored against the PUBLISHED population, never the survivors", () => {
  // The fixture reproduces the real shape: a long body SHARED by the corridor
  // pages but NOT by the whole group, so it survives the shell (df >= 98%) and
  // shows up as uniqueWords — exactly how a 469-row organisation list behaved.
  const SHARED_BODY = Array.from({ length: 420 }, (_, i) => `clause${i}`).join(" ");
  const OUTSIDERS = 20; // enough that the shared body is under 98% document frequency

  const freshFacts = () =>
    Array.from({ length: 5 }, (_, i) => ({
      value: `v${i}`, sourceUrl: `https://example.gov/page-${i}`, tier: 1,
      verifiedDate: new Date().toISOString().slice(0, 10),
    }));

  /** One page with five good facts, `siblingCount` near-identical factless siblings. */
  function corpus(siblingCount) {
    const group = [
      { id: "india", html: `<p>${SHARED_BODY} india</p>`, facts: freshFacts(), whyThisUrl: "the corridor page" },
    ];
    for (let i = 0; i < siblingCount; i++) {
      group.push({ id: `sib${i}`, html: `<p>${SHARED_BODY} country${i}</p>`, facts: [], whyThisUrl: "x" });
    }
    for (let i = 0; i < OUTSIDERS; i++) {
      group.push({
        id: `other${i}`,
        html: `<p>${Array.from({ length: 30 }, (_, k) => `unrelated${i}x${k}`).join(" ")}</p>`,
        facts: [], whyThisUrl: "x",
      });
    }
    return group;
  }

  /* RR-192 · T-1: no sibling is eliminated at facts any more, so every page reaches stage 3; the near-identical page is REVIEW_REQUIRED
   * (P20: a recorded substance review decides), never a free KEEP and never a REJECT on the percentage */
  test("🔴 RED: the last one standing does NOT get a free pass — above the 0.40 signal it is REVIEW_REQUIRED", () => {
    const out = runGateA(corpus(190));
    const india = out.results.find((r) => r.id === "india");
    assert.equal(out.reachedOverlap, 1 + 190 + OUTSIDERS, "every page reached stage 3");
    assert.equal(out.overlapPopulation, 1 + 190 + OUTSIDERS, "judged against the whole published group");
    assert.equal(india.comparedWith, 190 + OUTSIDERS, "every published page");
    assert.ok(india.maxOverlap > 0.4, `near-identical siblings must score high, got ${india.maxOverlap}`);
    assert.equal(india.overlapAboveReviewSignal, true);
    assert.equal(india.verdict, "REVIEW_REQUIRED");
    assert.equal(india.rejectedAt, null, "rejected on a percentage");
  });

  test("🔴 THE DIFFERENCE ITSELF — survivors-only says 0.0000, the published population does not", () => {
    // This is the defect, kept alive as a test so it cannot come back quietly.
    // Same page, same corpus, two denominators.
    const survivor = { id: "india", residual: [`${SHARED_BODY} india`].join(" ").split(" ") };
    const siblings = Array.from({ length: 190 }, (_, i) => ({
      id: `sib${i}`, residual: `${SHARED_BODY} country${i}`.split(" "),
    }));

    // (a) the OLD rule: compare the survivors with each other. There is one.
    const survivorsOnly = exactAllPairs([survivor]);
    assert.equal(survivorsOnly[0].maxOverlap, 0, "the last one standing scores a perfect 0.0000");
    assert.equal(survivorsOnly[0].against, null, "against nobody at all");

    // (b) the NEW rule: compare it with every PUBLISHED sibling.
    const [againstPopulation] = maxAgainstPopulation([survivor], [survivor, ...siblings]);
    assert.equal(againstPopulation.comparedWith, 190);
    assert.ok(againstPopulation.maxOverlap > 0.9, `near-identical, got ${againstPopulation.maxOverlap}`);

    // 🔴 The gap between the two numbers IS the bug.
    assert.ok(
      againstPopulation.maxOverlap - survivorsOnly[0].maxOverlap > 0.9,
      "the same page, the same day, judged 0.0000 or ~0.99 depending only on the denominator",
    );
  });

  test("🔴 and the gate does not get EASIER as it rejects more", () => {
    // The same survivor, in groups where more and more siblings were rejected.
    const scores = [10, 50, 190].map((n) => {
      const r = runGateA(corpus(n)).results.find((x) => x.id === "india");
      return r.maxOverlap;
    });
    // Under the old rule every one of these was 0. Under the new rule the score
    // is a property of the PAGES, so rejecting more siblings cannot improve it.
    for (const s of scores) assert.ok(s > 0.4, `expected a high score, got ${s}`);
    assert.ok(Math.max(...scores) - Math.min(...scores) < 0.05, "the score must not drift with rejection count");
  });

  test("a genuinely different page still passes, against the same full population", () => {
    const group = corpus(190);
    group[0].html = `<p>${Array.from({ length: 420 }, (_, i) => `distinct${i}`).join(" ")}</p>`;
    const india = runGateA(group).results.find((r) => r.id === "india");
    assert.ok(india.maxOverlap < 0.4, `a genuinely different page must score low, got ${india.maxOverlap}`);
    assert.equal(india.verdict, "KEEP");
  });

  test("🔴 an empty comparison population is FLAGGED, never scored as zero", () => {
    // Tested on the unit, because runGateA cannot reach it — see the next test.
    const [only] = maxAgainstPopulation(
      [{ id: "alone", residual: ["a", "b", "c", "d", "e", "f"] }],
      [{ id: "alone", residual: ["a", "b", "c", "d", "e", "f"] }],
    );
    assert.equal(only.comparedWith, 0);
    assert.equal(only.vacuous, true, "zero comparisons is an empty population, not a score");
    assert.equal(only.maxOverlap, 0, "the number is 0, but `vacuous` is what the caller must read");
  });

  /* RR-192 · T-1: a one-page group's 0 unique words is reported as a signal, not a rejection; its overlap is VACUOUS — flagged, never scored */
  test("a ONE-PAGE group: the shell eats it (0 unique words, the signal reported) and its overlap is VACUOUS — never a rejection on the number", () => {
    const out = runGateA([
      { id: "india", html: `<p>${SHARED_BODY} india</p>`, facts: freshFacts(), whyThisUrl: "x" },
    ]);
    const only = out.results[0];
    assert.equal(only.uniqueWords, 0);
    assert.equal(only.belowUniqueWordsSignal, true);
    assert.equal(only.rejectedAt, null);
    assert.equal(only.overlapVacuous, true, "a page alone has nothing to differ from — flagged");
    assert.equal(only.overlapAboveReviewSignal, null);
  });

  /* RR-192 · T-1: with no stage stopping, every page is scored — the two numbers are now equal, and both are still shown */
  test("reachedOverlap and overlapPopulation are reported together", () => {
    const out = runGateA(corpus(190));
    const n = 1 + 190 + OUTSIDERS;
    assert.deepEqual([out.reachedOverlap, out.overlapPopulation, out.overlapComparisons], [n, n, n * (n - 1)]);
  });
});
