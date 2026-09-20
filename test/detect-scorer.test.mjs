/**
 * THE SCORER, UNDER AMENDMENT 2 — and every way a run can fail to earn a pass.
 *
 * 🔴 THE ONE PROPERTY THIS FILE EXISTS FOR: a run that measured NOTHING must not score as a run
 * that found nothing wrong. Every test below is a different route to that same mistake — a CLEAN on
 * a required defect, an UNKNOWN standing in for a verdict, a detector that crashed, a detector that
 * returned nothing at all — and each one must end in FAIL.
 *
 * All fixtures are synthetic. Subjects are letters; nothing here is copied from any corpus.
 */
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { score } from "../src/detect/score.mjs";
import { runDetectors } from "../src/detect/run.mjs";
import { finding, clean, unknown, notApplicable } from "../src/detect/outcome.mjs";

const RUN_AT = "2026-09-20T00:00:00.000Z";
const wrap = (key, name, outcomes) => ({ runAt: RUN_AT, detectors: [{ key, name, outcomes }] });
const REDS = [{ id: "R1", detectorKey: "A", subject: "s1" }];
const CONTROLS = [{ id: "C1", subject: "k1" }];

const F = (subject) => finding({ detector: "d", subject, defectClass: "c", evidence: ["e"], summary: "s" });
const C = (subject) => clean({ detector: "d", subject, checked: ["e"], summary: "s" });
const U = (subject) => unknown({ detector: "d", subject, reasonCode: "INPUT_ABSENT", detail: "nothing supplied" });

describe("required RED", () => {
  test("a matching FINDING is DETECTED", () => {
    const r = score({ findings: wrap("A", "d", [F("s1"), C("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.reds[0].result, "DETECTED");
    assert.equal(r.pass, true);
  });
  test("🔴 CLEAN on a required RED is MISSED and the run FAILS", () => {
    const r = score({ findings: wrap("A", "d", [C("s1"), C("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.reds[0].result, "MISSED");
    assert.equal(r.pass, false);
  });
  test("🔴 UNKNOWN on a required RED is NOT DETECTED and the run FAILS", () => {
    const r = score({ findings: wrap("A", "d", [U("s1"), C("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.reds[0].result, "NOT_DETECTED_UNKNOWN");
    assert.equal(r.pass, false);
  });
  test("🔴 a detector that produced NOTHING for the class scores NO_OUTPUT, never a pass", () => {
    const r = score({ findings: wrap("Z", "d", [C("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.reds[0].result, "NO_OUTPUT");
    assert.equal(r.pass, false);
  });

  test("🔴 A FINDING SOMEWHERE ELSE DOES NOT TICK THIS RED — the false-pass machine, closed", () => {
    /* Discovery over a real repository makes every comparator report something. Scored loosely,
     * that alone would tick all six without the engine going near the planted defect. */
    const r = score({
      findings: wrap("A", "d", [F("some-other-subject"), F("another-unrelated"), C("k1")]),
      requiredReds: REDS, controls: CONTROLS,
    });
    assert.equal(r.reds[0].result, "NO_OUTPUT");
    assert.match(r.reds[0].evidence, /no outcome naming s1/);
    assert.match(r.reds[0].evidence, /2 finding\(s\) about other subjects/);
    assert.equal(r.pass, false);
  });

  test("a finding that NAMES the locator in its evidence does tick it, even under another subject", () => {
    const hit = finding({ detector: "d", subject: "page-url", defectClass: "c", evidence: ["derived from s1"], summary: "s" });
    const r = score({ findings: wrap("A", "d", [hit, C("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.reds[0].result, "DETECTED");
  });
});

describe("clean control", () => {
  test("CLEAN is UNFLAGGED", () => {
    assert.equal(score({ findings: wrap("A", "d", [F("s1"), C("k1")]), requiredReds: REDS, controls: CONTROLS }).controls[0].result, "UNFLAGGED");
  });
  test("🔴 a FINDING on a control is a FALSE POSITIVE and the run FAILS even with every RED found", () => {
    const r = score({ findings: wrap("A", "d", [F("s1"), F("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.controls[0].result, "FALSE_POSITIVE");
    assert.equal(r.detected, 1, "the RED was still detected…");
    assert.equal(r.pass, false, "…and one control false positive is still FAIL");
  });
  test("🔴 UNKNOWN on a control is UNEVALUATED — FAIL, and NOT counted as a false positive", () => {
    const r = score({ findings: wrap("A", "d", [F("s1"), U("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.controls[0].result, "UNEVALUATED");
    assert.equal(r.falsePositives, 0, "blindness must not be reported as noise");
    assert.equal(r.unevaluated, 1);
    assert.equal(r.pass, false);
  });
  test("🔴 a control whose every comparator found nothing applicable is UNEVALUATED, never unflagged", () => {
    /* NOT_APPLICABLE is unscored — but a page on which NOTHING was positively examined was not
     * examined, and Amendment 2 is explicit that a skipped input never earns unflagged. */
    const NA = (subject) => notApplicable({ detector: "d", subject, reasonCode: "NO_CANDIDATE_OF_THIS_KIND", examined: ["looked"], summary: "nothing of this kind" });
    const r = score({ findings: wrap("A", "d", [F("s1"), NA("k1"), NA("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.controls[0].result, "UNEVALUATED");
    assert.equal(r.unflagged, 0);
    assert.equal(r.falsePositives, 0, "blindness is still not noise");
    assert.equal(r.pass, false);
  });

  test("🔴 an operator-supplied answer map in the bundle is IGNORED — the output comes from the detectors", () => {
    const planted = [finding({ detector: "planted", subject: "s1", defectClass: "c", evidence: ["e"], summary: "planted answer" })];
    const result = runDetectors({ bundle: { __answers: { A: planted }, claimProducer: { claims: [], producers: [], bindings: {} } }, runAt: RUN_AT });
    const a = result.detectors.find((d) => d.key === "A");
    assert.equal(a.outcomes.some((o) => o.detector === "planted"), false, "the runner honoured an answer map handed to it in the bundle");
  });

  test("🔴 no output at all about a control never earns unflagged", () => {
    const r = score({ findings: wrap("A", "d", [F("s1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.controls[0].result, "NO_OUTPUT");
    assert.equal(r.pass, false);
  });
});

describe("🔴 the vacuous pass, closed from every direction", () => {
  test("zero false positives on zero evaluated controls is NOT a pass", () => {
    const r = score({ findings: wrap("A", "d", [F("s1"), U("k1")]), requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.falsePositives, 0);
    assert.equal(r.unflagged, 0, "nothing was positively left clean");
    assert.equal(r.pass, false);
  });
  test("an entirely empty findings output fails on both limbs", () => {
    const r = score({ findings: { runAt: RUN_AT, detectors: [] }, requiredReds: REDS, controls: CONTROLS });
    assert.equal(r.detected, 0);
    assert.equal(r.unflagged, 0);
    assert.equal(r.pass, false);
  });
  test("an absent findings output, or absent expectations, is refused rather than scored", () => {
    assert.throws(() => score({ requiredReds: REDS, controls: CONTROLS }), /findings output is required/);
    assert.throws(() => score({ findings: wrap("A", "d", [F("s1")]) }), /neither has an empty default/);
  });
  test("🔴 a detector that THROWS is recorded as UNKNOWN and still fails — it never disappears", () => {
    /* An input that throws when it is READ — the shape of a file that cannot be parsed. The runner
     * must turn that into a recorded UNKNOWN, not let it escape and truncate the whole output. */
    const bundle = { get claimProducer() { throw new Error("the input could not be read"); } };
    const result = runDetectors({ bundle, runAt: RUN_AT });
    const a = result.detectors.find((d) => d.key === "A");
    assert.equal(a.outcomes.length, 1);
    assert.equal(a.outcomes[0].outcome, "UNKNOWN");
    assert.equal(a.outcomes[0].subject, "(detector threw)");
    assert.match(a.outcomes[0].detail, /the detector threw: the input could not be read/);
    assert.equal(result.detectors.length, 6, "a throw must not shorten the output");
    assert.equal(score({ findings: result, requiredReds: REDS, controls: CONTROLS }).pass, false);
  });

  test("🔴 a detector that returns an EMPTY list is recorded as UNKNOWN, never as silence", () => {
    /* countData over an empty statement list legitimately produces no rows. An empty array read as
     * "nothing wrong" is the vacuous pass in its purest form, so the runner must fill it. */
    const result = runDetectors({ bundle: { countData: { statements: [], collections: {} } }, runAt: RUN_AT });
    const e = result.detectors.find((d) => d.key === "E");
    assert.equal(e.outcomes.length, 1, "an empty result must not stay empty");
    assert.equal(e.outcomes[0].outcome, "UNKNOWN");
    assert.equal(e.outcomes[0].reasonCode, "INPUT_ABSENT");
    assert.match(e.outcomes[0].detail, /examined nothing/);
  });
  test("🔴 a detector handed nothing reports UNKNOWN rather than contributing silence", () => {
    const result = runDetectors({ bundle: {}, runAt: RUN_AT });
    assert.equal(result.detectors.length, 6, "all six must appear in the output even with an empty bundle");
    for (const d of result.detectors) {
      assert.ok(d.outcomes.length > 0, `${d.key} produced no rows`);
      assert.ok(d.outcomes.every((o) => o.outcome === "UNKNOWN"), `${d.key} claimed something on an empty bundle`);
    }
  });
  test("the runner refuses an absent bundle and an undeclared clock", () => {
    assert.throws(() => runDetectors({ runAt: RUN_AT }), /a bundle is required/);
    assert.throws(() => runDetectors({ bundle: {} }), /does not read a clock/);
  });
});
