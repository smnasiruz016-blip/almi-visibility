/**
 * F46 · SOURCE INTEGRITY AND CITATION AUDIT (acceptance _handoffs 2e76216, RR-96; C3 amended by owner decision 3, RR-283 —
 * _handoffs AlmiVisibility_F46_F62_ACCEPTANCE_AMENDMENT_DECISION_3_2026-10-17.md: FIT stands on the verbatim official text, or it is
 * CHECKED_NOT_FOUND; no person is required).
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

import { auditCitation, auditCitations, fitCheck, authorityCheck, linkCheck, quotationCheck, fingerprintCheck, CITATION } from "../src/facts/citation-audit.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { subject } from "./support/subjects.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const CHECKER = "engine:checker";
const fact = (over = {}) => ({
  id: "f", claim: { subject: "s", predicate: "p", qualifier: null }, scope: "x", life: { status: "active" },
  source: { tier: 1, url: "u" },
  checks: { linkCheckOutcome: "pass", linkCheckedOn: "2026-09-10", quoteMatchOutcome: "pass", quoteMatchedOn: "2026-09-10", fingerprintOutcome: "pass", fingerprintCheckedOn: "2026-09-10" },
  verification: { sourceTier: "OFFICIAL", checkedOn: "2026-09-12", checkedBy: CHECKER, verdict: "VERIFIED", elementsConfirmedKeys: ["a"], elementsNotFoundKeys: [] },
  ...over,
});
const withChecks = (c) => fact({ checks: { ...fact().checks, ...c } });
const withVerification = (v) => fact({ verification: { ...fact().verification, ...v } });
const real = async () => { const p = await subject("almi-oet"); return (await loadRegistry(p.factsDir, p.productId)).records; };

/* ================= C1 — five separate checks ================= */

test("C1 · every fact carries exactly one result per check, counted in five separate populations — no score, no combined pass", () => {
  const a = auditCitations([fact(), withChecks({ linkCheckOutcome: "could-not-check" })]);
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
  /* a working link, an admissible tier and a matching fingerprint, but no verbatim quotation of the official text: FIT is not confirmed */
  const unconfirmed = auditCitation(withChecks({ quoteMatchOutcome: "not-applicable" }));
  assert.deepEqual([unconfirmed.checks.link.result, unconfirmed.checks.quotation.result, unconfirmed.checks.fingerprint.result, unconfirmed.checks.authority.result], ["WORKED", "NOT_APPLICABLE", "MATCHED", "ADMISSIBLE"]);
  assert.equal(unconfirmed.verdict, CITATION.COULD_NOT_PROVE, "a working link and matching checks were taken as a proved citation");
  assert.equal(auditCitation(fact()).verdict, CITATION.PROVED);
  for (const [f, why] of [
    [withChecks({ linkCheckOutcome: "fail" }), "a dead link"], [withChecks({ quoteMatchOutcome: "mismatch" }), "a quotation mismatch"],
    [withChecks({ fingerprintOutcome: "fail" }), "a fingerprint mismatch"], [fact({ source: { tier: 3 }, verification: { ...fact().verification, sourceTier: undefined } }), "an inadmissible tier"],
    [withVerification({ verdict: "CONFLICT" }), "a refuted fit"],
  ]) assert.equal(auditCitation(f).verdict, CITATION.DISPROVED, `${why} did not disprove the citation`);
  assert.equal(auditCitation(withChecks({ fingerprintOutcome: "could-not-check" })).verdict, CITATION.COULD_NOT_PROVE, "an unmeasured check was treated as passed");
});

/* ================= C3 (amended, owner decision 3) — fit stands on the verbatim official text ================= */

test("C3 · FIRING CONTROL: a claim whose words wholly overlap its source, with no matched verbatim quotation, is CHECKED_NOT_FOUND — similarity never decides FIT; a matched verbatim quotation with no checker at all is CONFIRMED", () => {
  const overlap = fact({ evidence: { quotedSpan: "the fee is 100", ownWords: "the fee is 100" }, checks: { ...fact().checks, quoteMatchOutcome: "not-applicable", quoteMatchedOn: null }, verification: { sourceTier: "OFFICIAL", checkedOn: "2026-09-12", sourceUrl: "u2" } });
  assert.deepEqual(fitCheck(overlap), { result: "CHECKED_NOT_FOUND", notFound: "a word-for-word quotation of the official text that states it", pagesChecked: ["u", "u2"], on: "2026-09-12" }, "word overlap decided FIT, or the line names no missing thing, page or date");
  /* who checked is never a condition: no checker at all, and the matched verbatim quotation decides */
  const { checkedBy, ...noChecker } = fact().verification;
  assert.deepEqual(fitCheck(fact({ verification: noChecker })), { result: "CONFIRMED", on: "2026-09-10", recordedVerdict: "VERIFIED" }, "FIT asked who checked it");
  assert.equal(fitCheck(withVerification({ checkedBy: "human:someone" })).result, "CONFIRMED");
  assert.equal(fitCheck(withVerification({ verdict: "CONFLICT" })).result, "REFUTED", "a recorded conflict with the official text did not refute");
  /* an element the official text does not state is CHECKED_NOT_FOUND, never REFUTED, never inferred */
  const unstated = fitCheck(withVerification({ elementsNotFoundKeys: ["b"] }));
  assert.equal(unstated.result, "CHECKED_NOT_FOUND", "an unstated element was refuted or inferred");
  assert.match(unstated.notFound, /does not state: b/);
  assert.equal(fitCheck(withChecks({ quoteMatchOutcome: "mismatch" })).notFound, "the recorded quotation, word for word, in the official text");
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

test("REAL · the client's recorded registry: five populations reported separately; FIT stands on a matched verbatim quotation of the official text or is CHECKED_NOT_FOUND, each line naming its page and date", async () => {
  const records = await real();
  const a = auditCitations(records);
  assert.ok(a.facts > 0, "EMPTY registry");
  for (const k of ["link", "quotation", "fingerprint", "authority", "fit"]) assert.equal(Object.values(a[k]).reduce((x, y) => x + y, 0), a.facts);
  /* every FIT is read from the record's own quote match, never from who checked it */
  for (const r of a.rows) assert.ok(r.checks.fit.result !== "CONFIRMED" || r.checks.quotation.result === "MATCHED", `FIT of ${r.id} was CONFIRMED without a matched verbatim quotation`);
  assert.ok(!a.rows.some((r) => "NEEDS_A_PERSON" === r.checks.fit.result), "a FIT still asks for a person");
  for (const r of a.rows.filter((x) => x.checks.fit.result === "CHECKED_NOT_FOUND")) assert.ok(r.checks.fit.notFound && (r.checks.fit.pagesChecked.length > 0 || /no source page is recorded/.test(r.checks.fit.notFound)), `the CHECKED_NOT_FOUND line of ${r.id} names no missing thing or no page`);
  assert.equal(a.rows.filter((r) => r.checks.fit.result === "CONFIRMED").length, a.rows.filter((r) => r.checks.quotation.result === "MATCHED" && r.checks.fit.result !== "REFUTED" && !(records.find((f) => f.id === r.id)?.verification?.elementsNotFoundKeys?.length > 0)).length, "a FIT was CONFIRMED without a matched verbatim quotation, or one with it was not");
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
    const a = auditCitations(await real());
    assert.match(ok.stdout, new RegExp(`bound\\s+recorded registry only · ${a.facts} active fact\\(s\\) · outcomes recorded .* not re-checked · FIT stands on the verbatim official text, no person required \\(owner decision 3\\) · nothing fetched`));
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
