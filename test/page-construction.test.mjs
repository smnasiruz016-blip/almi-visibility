/**
 * ROW 61 — SAFE LOCAL PAGE CONSTRUCTION. THE REFUSAL IS THE DELIVERABLE, SO IT IS WHAT IS PROVED.
 *
 * GREEN is a synthetic three-spec family built to clear all four frozen parts of Gate A. Every RED below is
 * that GREEN with ONE thing broken — short, fact-poor, overlapping, a one-variable-swap rationale, no
 * rationale, too small a family — and each must come back REFUSED with no HTML to write. A gate seen only
 * refusing could be a gate that refuses everything; a gate seen only passing could be a gate that is not
 * wired in. Both directions, on the same fixture.
 *
 * Then the real runner, on the real products: it must refuse, exit non-zero and write nothing.
 */
import test from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { fact } from "../src/facts/record.mjs";
import { loadRegistry, primaryFacts } from "../src/facts/registry.mjs";
import { constructCandidates, selectCandidates, ACCEPTED, REFUSED, PASS, FAIL, NOT_TESTED, PAGE_ONE } from "../src/page/construct.mjs";
import { judgeWhy, WHY_NOT_ENFORCED } from "../src/gate-a/why-this-url.mjs";
import { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "../src/gate-a/run.mjs";
import { MIN_FACTS } from "../src/gate-a/facts.mjs";
import { subject, subjectModule, subjectDir } from "./support/subjects.mjs";
const NEUTRAL = await subject("neutral-test-ferments");

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NOW = new Date("2026-09-14T00:00:00Z");
const VARIANTS = ["alpha", "beta", "gamma"];

/* ---- the synthetic family ------------------------------------------------ */

const SYLLABLES = ["ka", "lo", "mi", "ne", "pu", "ra", "si", "to", "vu", "we", "xa", "yo", "zi", "bo", "cu", "de", "fa", "gi", "ho", "ju"];
/** `count` distinct words, disjoint between pages because each page owns a leading syllable. */
const wordsFor = (page, count, offset = 0) =>
  Array.from({ length: count }, (_, i) => {
    const n = i + offset;
    return `${SYLLABLES[page]}${SYLLABLES[n % 20]}${SYLLABLES[Math.floor(n / 20) % 20]}${SYLLABLES[Math.floor(n / 400) % 20]}`;
  }).join(" ");

const verifiedRecord = (variant, i) =>
  fact({
    verification: { state: "VERIFIED", checkedOn: "2026-09-10", checkedBy: "fixture" },
    id: `fixture-subject.claim-${i}.axis=${variant}`,
    claim: { subject: "fixture-subject", predicate: `claim-${i}`, qualifier: `axis=${variant}` },
    scope: "destination",
    value: { value: `fixture value ${variant} ${i}`, valueType: "text", unit: null },
    source: { url: `https://example.org/fixture/${variant}/${i}`, label: "fixture", publisher: "fixture", tier: 1, documentRef: null },
    sourceMachineReadable: true,
    sourceMachineReadableBasis: "fixture",
    sourceQuotable: false,
    sourceQuotableBasis: "fixture",
    licence: "proprietary-no-reuse",
    sourceDocumentClass: "general",
    evidence: { quotedSpan: null, quoteLocation: null, ownWords: `Fixture statement ${i} for ${variant}.` },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable", fingerprintCheckedOn: "2026-09-10", fingerprintOutcome: "pass" },
    pageFingerprint: "a".repeat(64),
    queue: "AUTOMATED",
    freshness: { rule: "machine-fingerprint", days: 180 },
    life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
    provenance: { route: "R3", acquiredBy: "fixture" },
  });

const WHY = {
  alpha: { humanNeed: "a first-time applicant in the alpha region who must choose between two filing routes before a deadline", distinctValue: "sets the two routes side by side with the one condition that decides between them" },
  beta: { humanNeed: "a returning practitioner who lost a certificate and needs to know whether an older result can still be used", distinctValue: "explains the expiry rule and the single exception that keeps an old result valid" },
  gamma: { humanNeed: "an employer checking a candidate's documents who cannot tell which of three evidence forms is acceptable", distinctValue: "a checklist of acceptable evidence with what each one does not prove" },
};

function family({ pages = VARIANTS, words = 420, claims = MIN_FACTS } = {}) {
  const pageSpecs = {};
  const records = [];
  pages.forEach((variant, p) => {
    for (let i = 0; i < MIN_FACTS; i += 1) records.push(verifiedRecord(variant, i));
    pageSpecs[variant] = {
      slug: variant,
      variant,
      title: `Fixture page ${variant}`,
      intro: "Fixture framing shared by every page of the family.",
      sections: [{ heading: "Body", framing: wordsFor(p, words), claims: Array.from({ length: claims }, (_, i) => `fixture-subject.claim-${i}.axis=${variant}`) }],
      whyThisUrlDeservesToExist: WHY[variant],
    };
  });
  return { pageSpecs, records };
}

/* F34: the synthetic family's tenant is DECLARED to have no existing page (a COMPLETE, empty population), so these tests judge
 * Gate A alone; the existing-page check itself is proved in test/f34-no-blind-regeneration.test.mjs. */
const FIXTURE_TENANT = "tenant:gate-a-fixture";
const NO_EXISTING_PAGE = Object.freeze({ tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [], inventory: { pages: [] } });
/* F39 (_handoffs 90e798d): ACCEPTED also needs original information gain ESTABLISHED. Every fixture candidate is handed a RECORDED
 * gain record and a RECORDED competitor comparison, written by hand, so these tests still judge Gate A alone; F39 itself is proved in
 * test/f39-information-gain.test.mjs. With no current page there is no sibling pair to review. */
const SLUGS = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "sauerkraut"];
const GAIN_EVIDENCE = Object.freeze({
  gainRecords: SLUGS.map((s) => ({ pageId: `candidate:${s}`, kind: "USEFUL_COMPARISON", adds: "a fixture's recorded gain", ref: `gain:fixture:${s}` })),
  competitorComparisons: SLUGS.map((s) => ({ pageId: `candidate:${s}`, competitorsCompared: 1, gainBeyond: true, ref: `cmp:fixture:${s}` })),
  reviews: [],
});
const judge = ({ pageSpecs, records }, requested = Object.keys(pageSpecs)) =>
  constructCandidates({ pageSpecs, variants: VARIANTS, records, requested, tenantId: FIXTURE_TENANT, existingPages: NO_EXISTING_PAGE, gainEvidence: GAIN_EVIDENCE, now: NOW });

/* ---- F34 · the existing-page check, on the SAME family that is otherwise ACCEPTED ---------------------------------------
 * The GREEN family below clears every Gate A part. So each refusal here is the existing-page check's, and nothing else's. */
const existingPage = (pageId, html, extra = {}) => ({ pageId, tenantId: FIXTURE_TENANT, html, ...extra });
/* F39: a population whose bodies are VERIFIED (F31's fingerprint shape), so information gain can be judged against it */
const verified = (pop) => ({ ...pop, pages: pop.pages.map((p) => ({ ...p, bodyObservationId: `obs:${p.pageId}` })), inventory: { pages: pop.pages.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: `obs:${p.pageId}`, verified: true }] })) } });
/* F39: the recorded gain evidence plus a recorded review finding each candidate DISTINCT from each named current page (six aspects) */
const SIX = ["intent", "answer", "facts", "architecture", "examples", "userValue"];
const distinctFrom = (pageIds) => ({ ...GAIN_EVIDENCE, reviews: SLUGS.flatMap((s) => pageIds.map((id) => ({ pair: [`candidate:${s}`, id], compared: SIX, duplicate: false, documentedDistinctValue: "fixture", ref: `rev:${s}:${id}` }))) });

test("F34 · C1 · construction with NO existing-page population refuses every candidate — never built as though the site were empty", () => {
  const { pageSpecs, records } = family();
  const results = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: Object.keys(pageSpecs), tenantId: FIXTURE_TENANT, now: NOW });
  assert.equal(results.length, 3);
  for (const r of results) {
    assert.equal(r.verdict, REFUSED, r.slug);
    assert.equal(r.html, null, `${r.slug}: a candidate was produced without an existing-page check`);
    assert.equal(r.parts.existingPage.outcome, "REFUSED");
    /* F36 (RR-87) made part 4 refuse this too — so F34 asserts ITS OWN part, or a break in it would hide behind part 4 */
    assert.equal(r.parts.existingPage.state, NOT_TESTED, `${r.slug}: the existing-page part itself did not refuse`);
    assert.match(r.parts.existingPage.reason, /EXISTING_PAGE_POPULATION_UNAVAILABLE/);
  }
  const other = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["alpha"], tenantId: FIXTURE_TENANT, existingPages: { tenantId: "tenant:someone-else", coverageState: "COMPLETE", pages: [] }, now: NOW });
  assert.equal(other[0].verdict, REFUSED, "another tenant's population decided this tenant's candidate");
  assert.match(other[0].parts.existingPage.reason, /OF_ANOTHER_TENANT/);
});

test("F34 · C2 · a candidate whose intent an existing page serves is never ACCEPTED — the outcome names that page", () => {
  const { pageSpecs, records } = family();
  const pop = verified({ tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [existingPage("aaaaaaaaaaaaaaaa", "<h1>All about alpha</h1><p>An existing page.</p>")] });
  /* F39: beta is accepted only with its recorded gain and a recorded review finding it DISTINCT from that page */
  const [alpha, beta] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["alpha", "beta"], tenantId: FIXTURE_TENANT, existingPages: pop, gainEvidence: distinctFrom(["aaaaaaaaaaaaaaaa"]), now: NOW });
  assert.equal(alpha.verdict, REFUSED);
  assert.equal(alpha.html, null, "a new page was produced for an intent an existing page serves");
  assert.equal(alpha.parts.existingPage.outcome, "KEEP"); /* F34 C7 (RR-174): a served need is KEEP / NO NEW PAGE (M1, M3) */
  assert.equal(alpha.parts.existingPage.state, FAIL, "the existing-page part itself did not refuse the covered candidate");
  assert.equal(alpha.parts.existingPage.matched, 1);
  assert.deepEqual(alpha.parts.existingPage.existingPages, ["aaaaaaaaaaaaaaaa"]);
  /* 🔴 F33 (RR-84 §4.2): that page's headline names a DIFFERENT registered need, the population is COMPLETE — so it does NOT block
   * beta, which goes on to Gate A and is ACCEPTED. Until F33 this was F34's broad hold (MONITOR). */
  assert.equal(beta.parts.existingPage.outcome, "NOT_COVERED");
  assert.equal(beta.verdict, ACCEPTED, "an unrelated existing page blocked a genuinely new page merely because the tenant owns pages");
  assert.deepEqual(beta.parts.existingPage.existingPages, ["aaaaaaaaaaaaaaaa"], "the decision must name the page it judged");
});

test("F36 · C1 · construction reaches the one right-to-exist function: ACCEPTED exactly when right-to-exist AND information gain are ESTABLISHED", () => {
  const { pageSpecs, records } = family();
  const empty = verified({ tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [] });
  const [ok] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["alpha"], tenantId: FIXTURE_TENANT, existingPages: empty, gainEvidence: GAIN_EVIDENCE, now: NOW });
  assert.equal(ok.parts.whyThisUrl.rightToExist.outcome, "ESTABLISHED");
  assert.equal(ok.parts.whyThisUrl.state, PASS);
  const covering = verified({ tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [existingPage("dddddddddddddddd", "<h1>Alpha</h1>")] });
  const [cov] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["alpha"], tenantId: FIXTURE_TENANT, existingPages: covering, now: NOW });
  assert.equal(cov.parts.whyThisUrl.rightToExist.outcome, "REFUSED");
  assert.match(cov.parts.whyThisUrl.rightToExist.parts.notServed.reason, /COVERS_THE_NEED/);
  /* part 4 keeps Gate A's meaning (specificity) — the covered need is refused through part 5, and the candidate with it */
  assert.equal(cov.parts.whyThisUrl.state, PASS);
  assert.equal(cov.verdict, REFUSED, "a candidate whose need is covered was accepted");
  /* EQUIVALENCE, since F39 (RR-90) added a sixth part: across every population here, ACCEPTED holds exactly when the right-to-exist
   * outcome is ESTABLISHED AND original information gain is ESTABLISHED. F36 C1 (ESTABLISHED before any page) is the necessary half,
   * asserted on its own. Each world is judged with, and without, recorded gain evidence. */
  const worlds = [empty, covering, verified({ tenantId: FIXTURE_TENANT, coverageState: "PARTIAL", pages: [] }), null, verified({ tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [existingPage("eeeeeeeeeeeeeeee", "<h1>Beta</h1>")] })];
  let bothEstablished = 0;
  for (const pop of worlds) for (const gainEvidence of [distinctFrom(["dddddddddddddddd", "eeeeeeeeeeeeeeee"]), null]) for (const c of constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: Object.keys(pageSpecs), tenantId: FIXTURE_TENANT, existingPages: pop, gainEvidence, now: NOW })) {
    const both = c.parts.whyThisUrl.rightToExist.outcome === "ESTABLISHED" && c.parts.informationGain.outcome === "ESTABLISHED";
    assert.equal(c.verdict === ACCEPTED, both, `${c.slug}: ACCEPTED and (right-to-exist AND information gain ESTABLISHED) disagree`);
    if (c.verdict === ACCEPTED) assert.equal(c.parts.whyThisUrl.rightToExist.outcome, "ESTABLISHED", "F36 C1: accepted without an ESTABLISHED right to exist");
    if (both) bothEstablished++;
  }
  assert.ok(bothEstablished > 0, "VACUOUS: no candidate was ever accepted, so the equivalence proves nothing");
  /* and an ESTABLISHED right to exist with no recorded gain evidence is NOT accepted — F39 is a part of its own */
  const [noGain] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["alpha"], tenantId: FIXTURE_TENANT, existingPages: empty, now: NOW });
  assert.equal(noGain.parts.whyThisUrl.rightToExist.outcome, "ESTABLISHED");
  assert.equal(noGain.verdict, REFUSED, "a page was accepted without its information gain being judged");
  /* recorded gain, but no recorded competitor comparison: information gain CANNOT DECIDE, so nothing is accepted */
  const [noCmp] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["alpha"], tenantId: FIXTURE_TENANT, existingPages: empty, gainEvidence: { ...GAIN_EVIDENCE, competitorComparisons: [] }, now: NOW });
  assert.equal(noCmp.parts.informationGain.outcome, "CANNOT_DECIDE");
  assert.equal(noCmp.verdict, REFUSED, "a candidate was accepted with its competitor baseline unmeasured");
  /* a population handed in WITHOUT verified bodies is never read as "no other current page" */
  const [noInv] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["alpha"], tenantId: FIXTURE_TENANT, existingPages: { tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [] }, gainEvidence: GAIN_EVIDENCE, now: NOW });
  assert.equal(noInv.verdict, REFUSED, "a candidate was accepted against current pages whose bodies were never verified");
  assert.match(noInv.parts.informationGain.reason, /verified bodies were not handed in/);
  const bare = { ...pageSpecs, alpha: { ...pageSpecs.alpha, whyThisUrlDeservesToExist: undefined } };
  /* handed recorded gain evidence, so ONLY part 4 can refuse it — F39's part must not be the reason (RR-90: F39 masked this once) */
  const [none] = constructCandidates({ pageSpecs: bare, variants: VARIANTS, records, requested: ["alpha"], tenantId: FIXTURE_TENANT, existingPages: empty, gainEvidence: GAIN_EVIDENCE, now: NOW });
  assert.equal(none.parts.whyThisUrl.rightToExist.outcome, "REFUSED");
  assert.equal(none.parts.whyThisUrl.state, FAIL, "part 4 itself did not refuse a candidate with no reason");
  assert.equal(none.verdict, REFUSED);
  assert.equal(none.html, null, "a candidate with no right to exist was produced");
});

test("F34 · C4 · an existing page of unknown quality is protected; one with a recorded defect is routed to IMPROVE, never regenerated", () => {
  const { pageSpecs, records } = family();
  const unknown = { tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [existingPage("bbbbbbbbbbbbbbbb", "<h1>gamma</h1>")] };
  const [u] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["gamma"], tenantId: FIXTURE_TENANT, existingPages: unknown, now: NOW });
  assert.equal(u.html, null, "an unmeasured existing page was treated as bad and recreated");
  assert.equal(u.parts.existingPage.outcome, "KEEP"); /* F34 C7 (RR-174): a served need is KEEP / NO NEW PAGE (M1, M3) */
  const defect = { tenantId: FIXTURE_TENANT, coverageState: "COMPLETE", pages: [existingPage("cccccccccccccccc", "<h1>alpha</h1>"), existingPage("bbbbbbbbbbbbbbbb", "<h1>gamma</h1>", { recordedDefect: "a recorded measurement names a stale fact" })] };
  const [d] = constructCandidates({ pageSpecs, variants: VARIANTS, records, requested: ["gamma"], tenantId: FIXTURE_TENANT, existingPages: defect, now: NOW });
  assert.equal(d.html, null, "a page with a recorded defect was regenerated instead of repaired");
  assert.equal(d.parts.existingPage.outcome, "IMPROVE");
  assert.equal(d.parts.existingPage.existingPages[0], "bbbbbbbbbbbbbbbb", "IMPROVE must name the defective existing page first");
});

/* ---- GREEN ---------------------------------------------------------------- */

test("🟢 GREEN: a family built to clear all four parts is ACCEPTED — and only an accepted candidate carries HTML", () => {
  const results = judge(family());
  for (const r of results) {
    assert.equal(r.verdict, ACCEPTED, `${r.slug}: ${JSON.stringify({ gaps: r.dataGaps, rejects: r.rejects, notTested: r.notTested })}`);
    /* F34 added a fifth part — the existing-page check — which passes here only because the fixture tenant is declared empty; F39
     * added a sixth — original information gain — which passes only on the fixture's RECORDED gain and competitor comparison. */
    assert.deepEqual(Object.values(r.parts).map((p) => p.state), [PASS, PASS, PASS, PASS, PASS, PASS]);
    assert.equal(r.parts.informationGain.outcome, "ESTABLISHED");
    assert.equal(r.parts.existingPage.outcome, "NO_EXISTING_PAGE");
    assert.equal(r.parts.completeness.state, PASS);
    assert.ok(r.parts.completeness.supersededUniqueWords >= MIN_UNIQUE_WORDS, "the superseded figure is still measured and reported");
    assert.ok(r.parts.facts.value >= MIN_FACTS);
    assert.ok(r.parts.overlap.value <= MAX_SIBLING_OVERLAP);
    assert.equal(r.parts.overlap.comparedWith, 2, "not measured against EVERY sibling");
    assert.ok(typeof r.html === "string" && r.html.includes('data-claim-id="'));
    // passing Gate A is not permission to create a page
    assert.equal(r.pageOne.state, "UNSATISFIED");
  }
});

/* ---- RED: one thing broken at a time ------------------------------------- */

const refusedOn = (r, part, state) => {
  assert.equal(r.verdict, REFUSED, `${r.slug} was accepted`);
  assert.equal(r.html, null, `${r.slug}: a refused candidate still carries HTML — the runner could write it`);
  assert.equal(r.trace, null);
  assert.equal(r.parts[part].state, state, `${r.slug}: ${part} is ${r.parts[part].state}, expected ${state}`);
};

test("🔴 SUPERSEDED BY AMENDMENT 7 — a SHORT but complete page is now ACCEPTED, and that loss is deliberate", () => {
  /* Until 21 September 2026 this fixture was REFUSED for falling under 350 unique words. Amendment 7
   * replaced the floor with completeness, so a page that answers its declared coverage passes however
   * short it is. The loss is recorded in amendment 7 §4; it is not a side effect, and this test keeps
   * the fixture so the change stays visible. */
  const f = family();
  f.pageSpecs.alpha.sections[0].framing = wordsFor(0, 60);
  const [r] = judge(f, ["alpha"]);
  assert.equal(r.verdict, ACCEPTED, JSON.stringify({ gaps: r.dataGaps, rejects: r.rejects, notTested: r.notTested }));
  /* the superseded measurement is still TAKEN and reported — only its power to reject is gone */
  assert.ok(r.parts.completeness.supersededUniqueWords < MIN_UNIQUE_WORDS, "the old figure is no longer measured");
  assert.equal(r.parts.completeness.state, PASS);
});

test("🔴 SUPERSEDED BY AMENDMENT 7 — four SUPPORTED claims is now ACCEPTED, and that loss is deliberate", () => {
  /* The ≥5 floor refused this fixture. Amendment 7 judges support claim by claim instead: four
   * claims, all supported, is a supported page. Recorded in amendment 7 §4 as a deliberate loss. */
  const f = family();
  f.pageSpecs.alpha.sections[0].claims = f.pageSpecs.alpha.sections[0].claims.slice(0, MIN_FACTS - 1);
  const [r] = judge(f, ["alpha"]);
  assert.equal(r.verdict, ACCEPTED, JSON.stringify({ gaps: r.dataGaps, rejects: r.rejects, notTested: r.notTested }));
  assert.equal(r.parts.facts.state, PASS);
  assert.deepEqual(r.parts.facts.unsupported, []);
  /* and the superseded count is still reported, below the old floor */
  assert.ok(r.parts.facts.supersededCount < MIN_FACTS, "the old count is no longer reported");
});

test("🔴 RED: FACT-POOR by STATE — five records cited but one is not VERIFIED; the record count does not count", () => {
  const f = family();
  const i = f.records.findIndex((r) => r.id === "fixture-subject.claim-4.axis=alpha");
  const { verification, ...rest } = f.records[i];
  f.records[i] = fact({ ...rest, verificationState: "UNVERIFIED", checks: { ...rest.checks, factCheckedOn: null, factCheckedBy: null } });
  const [r] = judge(f, ["alpha"]);
  refusedOn(r, "facts", FAIL);
  assert.equal(r.parts.facts.value, 4);
  assert.match(r.parts.facts.notVerified.join(" "), /claim-4\.axis=alpha \(UNVERIFIED/);
});

test("🔴 RED: OVERLAPPING — a sibling carrying the same body is REFUSED on overlap, named", () => {
  const f = family();
  f.pageSpecs.beta.sections[0].framing = f.pageSpecs.alpha.sections[0].framing;
  const [r] = judge(f, ["alpha"]);
  refusedOn(r, "overlap", FAIL);
  assert.equal(r.parts.overlap.against, "beta");
  assert.ok(r.parts.overlap.value > MAX_SIBLING_OVERLAP);
});

test("🔴 RED: WHY — a sibling's rationale with the variant swapped is a template, not a reason", () => {
  const f = family();
  f.pageSpecs.beta.whyThisUrlDeservesToExist = {
    humanNeed: WHY.alpha.humanNeed.replace("alpha", "beta"),
    distinctValue: WHY.alpha.distinctValue,
  };
  const [r] = judge(f, ["alpha"]);
  refusedOn(r, "whyThisUrl", FAIL);
  assert.match(r.parts.whyThisUrl.reason, /variant swapped — a template/);
});

test("🔴 RED: WHY — no rationale is a DATA GAP; a need that names only the variant is REJECTED", () => {
  const f = family();
  delete f.pageSpecs.alpha.whyThisUrlDeservesToExist;
  refusedOn(judge(f, ["alpha"])[0], "whyThisUrl", FAIL);
  assert.ok(judge(f, ["alpha"])[0].dataGaps.some((x) => x.part === "whyThisUrl"));
  const g = family();
  g.pageSpecs.alpha.whyThisUrlDeservesToExist = { humanNeed: "alpha", distinctValue: "something" };
  const [r] = judge(g, ["alpha"]);
  refusedOn(r, "whyThisUrl", FAIL);
  assert.match(r.parts.whyThisUrl.reason, /names nothing but the variant/);
});

test("🔴 WHY — near-identical is measured, and what is NOT enforced is said", () => {
  const siblings = [{ slug: "beta", spec: { whyThisUrlDeservesToExist: { humanNeed: `${WHY.alpha.humanNeed} today`, distinctValue: WHY.alpha.distinctValue } } }];
  const near = judgeWhy("alpha", { whyThisUrlDeservesToExist: WHY.alpha }, siblings, VARIANTS);
  assert.equal(near.state, FAIL);
  assert.match(near.reason, /near-identical to beta/);
  assert.match(WHY_NOT_ENFORCED, /NOT ENFORCED/);
  assert.match(WHY_NOT_ENFORCED, /residue of GATE-4 stays OPEN/);
});

test("🔴 BLOCKED / NOT TESTED — a two-spec family cannot learn a shell; both parts say so, and the candidate is REFUSED", () => {
  const [r] = judge(family({ pages: ["alpha", "beta"] }), ["alpha"]);
  refusedOn(r, "overlap", NOT_TESTED);
  assert.equal(r.parts.overlap.state, NOT_TESTED);
  assert.match(r.parts.overlap.reason, /shared shell is learned from at least 3/);
  /* 🔴 AND COMPLETENESS IS NOW JUDGEABLE WITHOUT A SHELL — amendment 7 reads the spec's declared
   * coverage, not the rendered word count, so a two-spec family no longer blocks that part. */
  assert.equal(r.parts.completeness.state, PASS);
  /* 🔴 ONE blocked part now, not two. Under the superseded floor BOTH the word count and the overlap
   * needed a learned shell, so a two-spec family blocked them together. Completeness is read from the
   * spec's declared coverage, so only overlap is still unmeasurable — and the candidate is still
   * REFUSED on it, which is the part of this test that matters. */
  assert.equal(r.notTested.length, 1);
  assert.equal(r.verdict, REFUSED);
});

test("🔴 BLOCKED / NOT TESTED — a family of one has no sibling: overlap and distinctness are never a pass", () => {
  const [r] = judge(family({ pages: ["alpha"] }), ["alpha"]);
  assert.equal(r.verdict, REFUSED);
  assert.equal(r.parts.overlap.state, NOT_TESTED);
  assert.equal(r.parts.whyThisUrl.state, NOT_TESTED);
});

/* ---- selection: no default ------------------------------------------------ */

test("🔴 NO DEFAULT: neither --slug nor --all-slugs is refused; both together is refused; an undeclared slug is refused", () => {
  const { pageSpecs } = family();
  assert.throws(() => selectCandidates(pageSpecs, {}), /--slug=<slug> or --all-slugs is required/);
  assert.throws(() => selectCandidates(pageSpecs, { slug: "alpha", allSlugs: true }), /choose one/);
  assert.throws(() => selectCandidates(pageSpecs, { slug: "delta" }), /not a declared page spec/);
  assert.deepEqual(selectCandidates(pageSpecs, { slug: "beta" }), ["beta"]);
  assert.deepEqual(selectCandidates(pageSpecs, { allSlugs: true }), ["alpha", "beta", "gamma"]);
});

/* ---- portability: the neutral product's REAL registry --------------------- */

test("🔴 PORTABILITY: the neutral declared test product walks the same path and is REFUSED — no fact invented", async () => {
  const { records } = await loadRegistry(NEUTRAL.factsDir, NEUTRAL.productId);
  // Declared HERE, in the test, so row 53's product descriptor stays exactly as row 53 measured it.
  const pageSpecs = {
    sauerkraut: { slug: "sauerkraut", variant: "sauerkraut", title: "declared test", intro: "declared test framing", sections: [{ heading: "h", framing: "declared test framing", claims: ["cabbage-brine.minimum-salt-by-weight.ferment=sauerkraut"] }] },
  };
  const [r] = constructCandidates({ pageSpecs, variants: NEUTRAL.variants, records, requested: ["sauerkraut"], now: NOW });
  assert.equal(r.verdict, REFUSED);
  assert.equal(r.html, null);
  assert.equal(r.parts.facts.value, 0);
  assert.ok(r.dataGaps.some((g) => g.part === "facts"));
  assert.match(r.rejects.find((x) => x.part === "render").reason, /status "lead" may not reach a reader/);
  assert.equal(records.filter((x) => x.verificationState === "VERIFIED").length, 0);
});

/* ---- the real runner ------------------------------------------------------ */

const runner = (...args) => spawnSync(process.execPath, WORLD.argv(["bin/build-page.mjs", ...args]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });

test("🔴 RUNNER: no slug stops with exit 1 and names the declared specs", () => {
  const r = runner("--product=almi-oet");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--slug=<slug> or --all-slugs is required/);
  assert.equal(runner("--product=almi-oet", "--slug=not-declared").status, 1);
  assert.equal(runner("--product=almi-oet", "--slug=x", "--all-slugs").status, 1);
});

/* --out must be INSIDE the repository (the runner confines it), so the OS temp directory is not an option here,
 * as it was for idempotency-retry. Not the repo root either: .test-scratch/, which .gitignore covers. */
test("🔴 RUNNER FAILS CLOSED: the real product, every declared spec, --confirm given — REFUSED, exit 2, and NOTHING written", () => {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const out = mkdtempSync(join(REPO, ".test-scratch", "row61-"));
  try {
    const r = runner("--product=almi-oet", "--all-slugs", `--out=${out}`, "--confirm");
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, /ACCEPTED 0 of 2 candidate\(s\)/);
    assert.match(r.stdout, /\[refused\] nothing written for /);
    assert.match(r.stdout, /DATA GAP {3}facts: \d+ of \d+ cited claim\(s\) lack a fresh approved source/);
    assert.match(r.stdout, new RegExp(PAGE_ONE.id));
    assert.deepEqual(readdirSync(out), [], "a refused candidate was written");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("🔴 RUNNER: the neutral product declares no page spec — DATA GAP, exit 2, nothing constructed", () => {
  const r = runner("--product=neutral-test-ferments", "--all-slugs");
  assert.equal(r.status, 2);
  assert.match(r.stdout, /DATA GAP — neutral-test-ferments declares no page spec/);
});

/* ---- 🔴 THE MISSING LEG: a SECOND DECLARED product, its OWN DECLARED specs, through the real runner ----
 * Owner ruling, 15 September 2026 (_handoffs/AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15.md): a second declared
 * neutral test product with an evidence-bearing page spec; row 53's product is not touched. Its specs hold claim ids
 * only, its records are declared test data at status `lead` — so Gate A must REFUSE inside the construction path. */

const SECOND = "neutral-test-knots";
const FIRST = "almi-oet";

test("🔴 61 · THE SECOND DECLARED PRODUCT — declared as one, sharing no subject, axis, variant, source host or licence with the first product or with row 53's product; nothing in it is VERIFIED", async () => {
  const second = await subject(SECOND);
  const { DECLARATION } = await subjectModule(SECOND, "product.mjs");
  assert.equal(second.declaredTestProduct, true);
  assert.equal(DECLARATION.row, 61);
  assert.ok(Object.keys(second.pageSpecs).length >= 1, "the second product declares no page spec — the leg would be refused at the runner again");
  assert.deepEqual(NEUTRAL.pageSpecs, {}, "row 53's product gained a page spec — row 53's frozen input changed");
  const { records } = await loadRegistry(second.factsDir, second.productId);
  assert.equal(records.filter((r) => r.verificationState === "VERIFIED").length, 0, "the declared test product carries a VERIFIED record — evidence was manufactured");
  assert.deepEqual([...new Set(records.map((r) => r.life.status))], ["lead"]);
  assert.deepEqual([...new Set(records.map((r) => r.licence))], ["DECLARED-TEST-DATA"]);
  for (const other of [await subject(FIRST), NEUTRAL]) {
    const theirs = (await loadRegistry(other.factsDir, other.productId)).records;
    assert.notEqual(second.axis.key, other.axis.key);
    assert.deepEqual(second.variants.filter((v) => other.variants.includes(v)), []);
    const subjects = new Set(records.map((r) => r.claim.subject));
    const predicates = new Set(records.map((r) => r.claim.predicate));
    assert.deepEqual(theirs.filter((r) => subjects.has(r.claim.subject) || predicates.has(r.claim.predicate)).map((r) => r.id), [], `shaped around ${other.productId}'s claims`);
    /* 🔴 SOURCE HOSTS ARE A PROPERTY OF SOURCE-BEARING RECORDS (F28). Row 61's boundary asks that
     * the second declared product share no "source host or licence" with the first — and a derived
     * record carries neither, because F28 forbids it a `source` at all. It cannot share a host it
     * does not have, and asking would throw on the `source.url` that is lawfully absent. The floor
     * below keeps the narrowing from emptying the comparison. */
    const theirHosts = primaryFacts(theirs);
    assert.ok(theirHosts.length > 0, `${other.productId} has no source-bearing records — the host comparison would be vacuous`);
    const hosts = new Set(theirHosts.map((r) => new URL(r.source.url).hostname));
    if (other.productId === FIRST) assert.deepEqual(primaryFacts(records).filter((r) => hosts.has(new URL(r.source.url).hostname)).map((r) => r.id), []);
  }
  // every spec holds claim ids that resolve in ITS OWN registry — ids, never a value
  const own = new Set(records.map((r) => r.id));
  for (const [slug, spec] of Object.entries(second.pageSpecs)) {
    const ids = spec.sections.flatMap((s) => s.claims);
    assert.ok(ids.length > 0, `${slug} cites no claim`);
    assert.deepEqual(ids.filter((id) => !own.has(id)), [], `${slug} cites a claim its own registry does not hold`);
  }
});

test("🔴 61 · RUNNER ON THE SECOND DECLARED PRODUCT — every declared spec REFUSED inside the construction path, DATA GAP and BLOCKED recorded, exit 2, and --confirm writes NOTHING", async () => {
  const second = await subject(SECOND);
  const slugs = Object.keys(second.pageSpecs);
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const out = mkdtempSync(join(REPO, ".test-scratch", "row61-second-"));
  try {
    const r = runner(`--product=${SECOND}`, "--all-slugs", `--out=${out}`, "--confirm");
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`SAFE LOCAL PAGE CONSTRUCTION — product ${SECOND}`));
    assert.match(r.stdout, new RegExp(`declared page specs {3}${slugs.length} {3}requested ${slugs.length}`));
    assert.match(r.stdout, new RegExp(`ACCEPTED 0 of ${slugs.length} candidate\\(s\\)`));
    for (const slug of slugs) {
      assert.match(r.stdout, new RegExp(`🔴 ${slug} — REFUSED`));
      assert.match(r.stdout, new RegExp(`\\[refused\\] nothing written for ${slug}`));
    }
    assert.equal((r.stdout.match(/DATA GAP {3}facts: /g) ?? []).length, slugs.length, "amendment 7's fact-sufficiency rule did not refuse every spec");
    assert.match(r.stdout, /lack a fresh approved source|does not declare that it makes no material factual claim/);
    assert.equal((r.stdout.match(/BLOCKED \/ NOT TESTED {2}overlap: /g) ?? []).length, slugs.length);
    assert.equal((r.stdout.match(/§5A fact text copied into the spec: 0/g) ?? []).length, slugs.length);
    assert.doesNotMatch(r.stdout, /(completeness|overlap|facts) +PASS/, "a part that could not be exercised was reported as a pass");
    assert.deepEqual(readdirSync(out), [], "a refused candidate was written");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("🔴 61 · ANY DECLARED SLUG OF ANY DECLARED PRODUCT — each slug of both products judged ALONE through the runner", async () => {
  for (const id of [FIRST, SECOND]) {
    const p = await subject(id);
    for (const slug of Object.keys(p.pageSpecs)) {
      const r = runner(`--product=${id}`, `--slug=${slug}`);
      assert.equal(r.status, 2, `${id} --slug=${slug}: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout, /declared page specs {3}\d+ {3}requested 1/);
      assert.match(r.stdout, new RegExp(`🔴 ${slug} — REFUSED`));
      assert.match(r.stdout, /ACCEPTED 0 of 1 candidate\(s\)/);
    }
  }
});

test("🔴 61 · findCopiedFacts is clean on EVERY spec of EVERY declared product — read from the subject roots, not a list written here", async () => {
  const { availableProducts } = await import("../src/product-cli.mjs");
  const { findCopiedFacts } = await import("../src/page/render.mjs");
  const ids = availableProducts();
  for (const id of [FIRST, SECOND, NEUTRAL.productId]) assert.ok(ids.includes(id), `${id} is not declared in any subject root`);
  let specs = 0;
  for (const id of ids) {
    const p = await subject(id);
    const { records } = await loadRegistry(p.factsDir, p.productId);
    for (const [slug, spec] of Object.entries(p.pageSpecs)) {
      specs += 1;
      assert.deepEqual(findCopiedFacts(spec, records).copied, [], `${id}/${slug} copies fact text into the spec`);
    }
  }
  assert.ok(specs >= 4, `only ${specs} spec(s) checked — the law would be vacuous`);
});

test("🔴 61 · THE SAME RUN THROUGH THE REAL RUNNER — bin/build-page.mjs on the second product loads no module of the first product, reads none of its files, and prints none of its records", async () => {
  const probe = pathToFileURL(`${REPO}test/support/access-probe.mjs`).href;
  const r = spawnSync(process.execPath, WORLD.argv(["--import", probe, "bin/build-page.mjs", `--product=${SECOND}`, "--all-slugs"]), { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, env: WORLD.envWith() });
  assert.equal(r.status, 2, `${r.stdout.slice(-2000)}\n${r.stderr.split("\n").filter((l) => !l.startsWith("[probe:")).join("\n").slice(-2000)}`);
  const lines = r.stderr.split(/\r?\n/);
  const modules = lines.filter((l) => l.startsWith("[probe:module] ")).map((l) => l.slice("[probe:module] ".length).replace(/\\/g, "/"));
  const touched = lines.filter((l) => l.startsWith("[probe:fs:")).map((l) => ({ call: l.slice(10, l.indexOf("]")), path: l.slice(l.indexOf("] ") + 2).replace(/\\/g, "/") }));
  const slash = (p) => p.replace(/\\/g, "/");
  const SECOND_DIR = slash(subjectDir(SECOND));
  const FIRST_DIR = slash(subjectDir(FIRST));
  /* F02: the run goes through a DECLARED FIXTURE WORLD, whose root holds its own copy of the first product. Watch BOTH
   * places — the probe checking only the real one would be silent about the copy, and prove nothing. */
  const WORLD_FIRST_DIR = slash(join(WORLD.root, FIRST));
  assert.ok(existsSync(WORLD_FIRST_DIR), `the fixture world holds no copy of the first product at ${WORLD_FIRST_DIR} — the probe would watch nothing`);
  const FIRST_DIRS = [FIRST_DIR, WORLD_FIRST_DIR];
  // the probe must be SEEING — or its silence proves nothing
  assert.ok(modules.some((u) => u.includes(`${SECOND_DIR}/facts/knots.mjs`)), "the probe did not see the second product's own facts load");
  assert.ok(modules.some((u) => u.includes("/src/page/construct.mjs")), "the probe did not see the construction path load");
  assert.deepEqual(modules.filter((u) => FIRST_DIRS.some((d) => u.includes(`${d}/`))), [], "the runner LOADED a module of the first product");
  const namesOnly = (t) => ["existsSync", "statSync"].includes(t.call) && FIRST_DIRS.some((d) => t.path.endsWith(d) || t.path.endsWith(`${d}/product.mjs`));
  assert.deepEqual(touched.filter((t) => FIRST_DIRS.some((d) => t.path.includes(d)) && !namesOnly(t)), [], "the runner READ a file of the first product");
  const first = await subject(FIRST);
  const { records } = await loadRegistry(first.factsDir, first.productId);
  for (const rec of records) assert.ok(!r.stdout.includes(rec.id), `the runner printed first-product record ${rec.id}`);
  assert.doesNotMatch(r.stdout, new RegExp(FIRST));
});
