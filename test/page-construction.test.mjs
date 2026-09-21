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
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs";
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

const judge = ({ pageSpecs, records }, requested = Object.keys(pageSpecs)) =>
  constructCandidates({ pageSpecs, variants: VARIANTS, records, requested, now: NOW });

/* ---- GREEN ---------------------------------------------------------------- */

test("🟢 GREEN: a family built to clear all four parts is ACCEPTED — and only an accepted candidate carries HTML", () => {
  const results = judge(family());
  for (const r of results) {
    assert.equal(r.verdict, ACCEPTED, `${r.slug}: ${JSON.stringify({ gaps: r.dataGaps, rejects: r.rejects, notTested: r.notTested })}`);
    assert.deepEqual(Object.values(r.parts).map((p) => p.state), [PASS, PASS, PASS, PASS]);
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

const runner = (...args) => spawnSync(process.execPath, ["bin/build-page.mjs", ...args], { cwd: REPO, encoding: "utf8" });

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
  const r = spawnSync(process.execPath, ["--import", probe, "bin/build-page.mjs", `--product=${SECOND}`, "--all-slugs"], { cwd: REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  assert.equal(r.status, 2, `${r.stdout.slice(-2000)}\n${r.stderr.split("\n").filter((l) => !l.startsWith("[probe:")).join("\n").slice(-2000)}`);
  const lines = r.stderr.split(/\r?\n/);
  const modules = lines.filter((l) => l.startsWith("[probe:module] ")).map((l) => l.slice("[probe:module] ".length).replace(/\\/g, "/"));
  const touched = lines.filter((l) => l.startsWith("[probe:fs:")).map((l) => ({ call: l.slice(10, l.indexOf("]")), path: l.slice(l.indexOf("] ") + 2).replace(/\\/g, "/") }));
  const slash = (p) => p.replace(/\\/g, "/");
  const SECOND_DIR = slash(subjectDir(SECOND));
  const FIRST_DIR = slash(subjectDir(FIRST));
  // the probe must be SEEING — or its silence proves nothing
  assert.ok(modules.some((u) => u.includes(`${SECOND_DIR}/facts/knots.mjs`)), "the probe did not see the second product's own facts load");
  assert.ok(modules.some((u) => u.includes("/src/page/construct.mjs")), "the probe did not see the construction path load");
  assert.deepEqual(modules.filter((u) => u.includes(`${FIRST_DIR}/`)), [], "the runner LOADED a module of the first product");
  const namesOnly = (t) => ["existsSync", "statSync"].includes(t.call) && (t.path.endsWith(FIRST_DIR) || t.path.endsWith(`${FIRST_DIR}/product.mjs`));
  assert.deepEqual(touched.filter((t) => t.path.includes(FIRST_DIR) && !namesOnly(t)), [], "the runner READ a file of the first product");
  const first = await subject(FIRST);
  const { records } = await loadRegistry(first.factsDir, first.productId);
  for (const rec of records) assert.ok(!r.stdout.includes(rec.id), `the runner printed first-product record ${rec.id}`);
  assert.doesNotMatch(r.stdout, new RegExp(FIRST));
});
