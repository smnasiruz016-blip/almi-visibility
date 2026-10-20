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
import { chosenFor } from "./helpers/f35-chosen.mjs"; /* RR-179 (c): construction acts only on F35's decision */
import { judgeWhy, WHY_NOT_ENFORCED } from "../src/gate-a/why-this-url.mjs";
import { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "../src/gate-a/run.mjs";
import { MIN_FACTS } from "../src/gate-a/facts.mjs";
import { subject, subjectModule, subjectDir } from "./support/subjects.mjs";
/* RR-295: the old builder (src/page/construct.mjs) is removed; the verdict words its tests compared with, kept here as they were */
const ACCEPTED = "ACCEPTED", REFUSED = "REFUSED";
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

/* ---- F34 · the existing-page check, on the SAME family that is otherwise ACCEPTED ---------------------------------------
 * The GREEN family below clears every Gate A part. So each refusal here is the existing-page check's, and nothing else's. */
const existingPage = (pageId, html, extra = {}) => ({ pageId, tenantId: FIXTURE_TENANT, html, ...extra });
/* F39: a population whose bodies are VERIFIED (F31's fingerprint shape), so information gain can be judged against it */
const verified = (pop) => ({ ...pop, pages: pop.pages.map((p) => ({ ...p, bodyObservationId: `obs:${p.pageId}` })), inventory: { pages: pop.pages.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: `obs:${p.pageId}`, verified: true }] })) } });
/* F39: the recorded gain evidence plus a recorded review finding each candidate DISTINCT from each named current page (six aspects) */
const SIX = ["intent", "answer", "facts", "architecture", "examples", "userValue"];
const distinctFrom = (pageIds) => ({ ...GAIN_EVIDENCE, reviews: SLUGS.flatMap((s) => pageIds.map((id) => ({ pair: [`candidate:${s}`, id], compared: SIX, duplicate: false, needsGuidance: false /* RR-192: F32/F39 C3 as amended */, documentedDistinctValue: "fixture", ref: `rev:${s}:${id}` }))) });

/* ---- GREEN ---------------------------------------------------------------- */

/* ---- RED: one thing broken at a time ------------------------------------- */


/* ---- selection: no default ------------------------------------------------ */

/* ---- portability: the neutral product's REAL registry --------------------- */

/* ---- the real runner ------------------------------------------------------ */

const runner = (...args) => spawnSync(process.execPath, WORLD.argv(["bin/build-page.mjs", ...args]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });

/* --out must be INSIDE the repository (the runner confines it), so the OS temp directory is not an option here,
 * as it was for idempotency-retry. Not the repo root either: .test-scratch/, which .gitignore covers. */
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

/* ================= RR-179 · R4 — construction acts only on F35's decision; a compiled spec waits for F37; FS-A1 ================= */


/* RR-180: F37's acceptance is frozen (9516f2c) and its draft render built — R4e follows: the compiled spec is RENDERED and judged by F37's checks */