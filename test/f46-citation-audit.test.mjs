/**
 * F46 · SOURCE INTEGRITY AND CITATION AUDIT (acceptance _handoffs 2e76216, RR-96).
 *
 * Every expected result below is written by hand from its fixture. The real registry is read, never written; nothing is fetched; the
 * production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { auditCitation, auditCitations, fitCheck, authorityCheck, linkCheck, quotationCheck, fingerprintCheck, CITATION, NO_DECLARED_PERSON_CHECKERS } from "../src/facts/citation-audit.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { subject } from "./support/subjects.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const PERSON = "checker-declared-person", TOOL = "checker-undeclared";
const fact = (over = {}) => ({
  id: "f", claim: { subject: "s", predicate: "p", qualifier: null }, scope: "x", life: { status: "active" },
  source: { tier: 1, url: "u" },
  checks: { linkCheckOutcome: "pass", linkCheckedOn: "2026-09-10", quoteMatchOutcome: "pass", quoteMatchedOn: "2026-09-10", fingerprintOutcome: "pass", fingerprintCheckedOn: "2026-09-10" },
  verification: { sourceTier: "OFFICIAL", checkedOn: "2026-09-12", checkedBy: PERSON, verdict: "VERIFIED", elementsConfirmedKeys: ["a"], elementsNotFoundKeys: [] },
  ...over,
});
const withChecks = (c) => fact({ checks: { ...fact().checks, ...c } });
const withVerification = (v) => fact({ verification: { ...fact().verification, ...v } });
const real = async () => { const p = await subject("almi-oet"); return (await loadRegistry(p.factsDir, p.productId)).records; };

/* ================= C1 — five separate checks ================= */

test("C1 · every fact carries exactly one result per check, counted in five separate populations — no score, no combined pass", () => {
  const a = auditCitations([fact(), withChecks({ linkCheckOutcome: "could-not-check" })], { persons: [PERSON] });
  for (const k of ["link", "quotation", "fingerprint", "authority", "fit"]) assert.equal(Object.values(a[k]).reduce((x, y) => x + y, 0), 2, `${k} has a missing or doubled result`);
  assert.ok(!("score" in a) && !("passRate" in a) && !a.rows.some((r) => "score" in r), "the checks were combined into one number");
  /* a recorded failure to fetch is not a dead link; an unrecognised outcome fails closed */
  assert.equal(linkCheck(withChecks({ linkCheckOutcome: "could-not-check" })).result, "NOT_MEASURED", "a fetch that failed read as a dead link");
  assert.equal(linkCheck(withChecks({ linkCheckOutcome: "fail" })).result, "FAILED");
  assert.equal(quotationCheck(withChecks({ quoteMatchOutcome: "maybe" })).result, "NOT_MEASURED", "an unrecognised outcome was read as a result");
  assert.equal(quotationCheck(withChecks({ quoteMatchOutcome: "not-applicable" })).result, "NOT_APPLICABLE");
  assert.equal(fingerprintCheck(withChecks({ fingerprintOutcome: "mismatch" })).result, "MISMATCHED");
});

/* ================= C2 — a working link is not a correct citation ================= */

test("C2 · FIRING CONTROL: every mechanical check green with FIT unconfirmed is COULD-NOT-PROVE; only FIT CONFIRMED completes a proof; any recorded failure DISPROVES", () => {
  const unconfirmed = auditCitation(fact(), { persons: NO_DECLARED_PERSON_CHECKERS });
  assert.deepEqual([unconfirmed.checks.link.result, unconfirmed.checks.quotation.result, unconfirmed.checks.fingerprint.result, unconfirmed.checks.authority.result], ["WORKED", "MATCHED", "MATCHED", "ADMISSIBLE"]);
  assert.equal(unconfirmed.verdict, CITATION.COULD_NOT_PROVE, "a working link and matching checks were taken as a proved citation");
  assert.equal(auditCitation(fact(), { persons: [PERSON] }).verdict, CITATION.PROVED);
  for (const [f, why] of [
    [withChecks({ linkCheckOutcome: "fail" }), "a dead link"], [withChecks({ quoteMatchOutcome: "mismatch" }), "a quotation mismatch"],
    [withChecks({ fingerprintOutcome: "fail" }), "a fingerprint mismatch"], [fact({ source: { tier: 3 }, verification: { ...fact().verification, sourceTier: undefined } }), "an inadmissible tier"],
    [withVerification({ verdict: "CONFLICT" }), "a refuted fit"],
  ]) assert.equal(auditCitation(f, { persons: [PERSON] }).verdict, CITATION.DISPROVED, `${why} did not disprove the citation`);
  assert.equal(auditCitation(withChecks({ fingerprintOutcome: "could-not-check" }), { persons: [PERSON] }).verdict, CITATION.COULD_NOT_PROVE, "an unmeasured check was treated as passed");
});

/* ================= C3 — fit is a judgement ================= */

test("C3 · FIRING CONTROL: a claim whose words wholly overlap its source, with no person's verdict, is NEEDS A PERSON — similarity never decides FIT", () => {
  const overlap = fact({ evidence: { quotedSpan: "the fee is 100", ownWords: "the fee is 100" }, verification: { sourceTier: "OFFICIAL", checkedOn: "2026-09-12" } });
  assert.deepEqual(fitCheck(overlap, { persons: [PERSON] }), { result: "NEEDS_A_PERSON", reason: "no verdict is recorded" }, "word overlap decided FIT");
  const undeclared = fitCheck(withVerification({ checkedBy: TOOL }), { persons: [PERSON] });
  assert.deepEqual(undeclared, { result: "NEEDS_A_PERSON", reason: "the recorded verdict's checker is not declared a person", recordedVerdict: "VERIFIED" }, "a verdict by an undeclared checker decided FIT");
  assert.equal(fitCheck(withVerification({ verdict: "CONFLICT" }), { persons: [PERSON] }).result, "REFUTED");
  assert.equal(fitCheck(withVerification({ elementsNotFoundKeys: ["b"] }), { persons: [PERSON] }).result, "REFUTED");
  assert.match(fitCheck(withVerification({ verdict: "QUALIFIED" }), { persons: [PERSON] }).reason, /does not confirm every element/);
  assert.throws(() => fitCheck(fact(), {}), /passed explicitly/);
});

/* ================= C4 — authority ================= */

test("C4 · a source is ADMISSIBLE only as primary official (or SECONDARY VERIFIED) with a verification date; otherwise NOT ADMISSIBLE or NOT MEASURED", () => {
  assert.equal(authorityCheck(fact()).result, "ADMISSIBLE");
  assert.equal(authorityCheck(fact({ source: { tier: 1 }, verification: { checkedOn: "2026-09-12" } })).result, "ADMISSIBLE", "the numeric tier was not read by the engine's one tier reader");
  assert.equal(authorityCheck(fact({ source: { tier: 3 }, verification: { checkedOn: "2026-09-12" } })).result, "NOT_ADMISSIBLE", "a reputable secondary not labelled SECONDARY VERIFIED was admitted");
  assert.equal(authorityCheck(fact({ source: {}, verification: { sourceTier: "COMPETITOR_COMMUNITY", checkedOn: "2026-09-12" } })).result, "NOT_ADMISSIBLE", "competitor content was admitted");
  assert.deepEqual(authorityCheck(fact({ verification: { sourceTier: "OFFICIAL" } })), { result: "NOT_MEASURED", missing: "a recorded verification date (V3 §10.3)" });
  assert.equal(authorityCheck(fact({ source: { tier: 3 }, verification: { sourceTier: "OFFICIAL", checkedOn: "2026-09-12" } })).result, "NOT_MEASURED", "a disagreeing named and numeric tier was resolved silently");
  assert.deepEqual(authorityCheck(fact({ source: {}, verification: { checkedOn: "2026-09-12" } })), { result: "NOT_MEASURED", missing: "a recorded source tier" });
});

/* ================= REAL ================= */

test("REAL · the client's recorded registry: five populations reported separately; FIT needs a person throughout; no citation PROVED", async () => {
  const records = await real();
  const a = auditCitations(records, { persons: NO_DECLARED_PERSON_CHECKERS });
  assert.ok(a.facts > 0, "EMPTY registry");
  for (const k of ["link", "quotation", "fingerprint", "authority", "fit"]) assert.equal(Object.values(a[k]).reduce((x, y) => x + y, 0), a.facts);
  assert.deepEqual(a.fit, { NEEDS_A_PERSON: a.facts }, "FIT was decided without a person declared");
  assert.ok(!("PROVED" in a.verdicts), "a citation was proved without a person's judgement of fit");
  assert.ok((a.link.WORKED ?? 0) > 0, "no recorded link outcome was read — this check would be vacuous");
  const { rows, ...summary } = a;
  console.log(`  REAL (count-only): ${JSON.stringify(summary)}`);
});

/* ================= C5 — recorded data only ================= */

test("C5 · THE ENTRY POINT: in a declared world it prints the five checks apart, the recorded dates and the fresh-fetch gate, and writes nothing", async () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/citation-audit.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const a = auditCitations(await real(), { persons: NO_DECLARED_PERSON_CHECKERS });
    assert.match(ok.stdout, new RegExp(`bound\\s+recorded registry only · ${a.facts} active fact\\(s\\) · outcomes recorded .* not re-checked · checkers declared a person: 0 · nothing fetched`));
    for (const k of ["link", "quotation", "fingerprint", "authority", "fit", "citations"]) assert.match(ok.stdout, new RegExp(`\\n  ${k} +`), `the ${k} line is missing`);
    assert.match(ok.stdout, /gate\s+a fresh re-check needs a bounded fetch under its own authorisation/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C5 · the audit loads no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/facts/citation-audit.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
