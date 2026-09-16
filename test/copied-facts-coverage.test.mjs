/**
 * 🔴 WHAT THE COPY CHECK CAN AND CANNOT JUDGE — PINNED, SO SILENCE CANNOT COME BACK.
 *
 * `findCopiedFacts` used to `continue` past every value it could not judge. A skip with no record
 * is indistinguishable from a clean result, so §5A read "no copied facts" while most of the
 * population had never been examined. It now returns three accounted populations, and these tests
 * pin them EXACTLY — not as floors. A pin loosened into a floor is a permission, not a test.
 *
 * 🔴 THE ADVERSARIAL CONTROLS BELOW EXIST TO KEEP A REJECTED METHOD REJECTED. Substring matching
 * on numbers and booleans, and a fixed-window scan, were each MEASURED and found to produce false
 * COPIED findings. A false COPIED is a §5A REFUSAL of a legitimate page, so these are not
 * hypotheticals — they are the failure this detector must never ship.
 */
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { loadRegistry } from "../src/facts/registry.mjs";
import { findCopiedFacts } from "../src/page/render.mjs";
import { availableProducts } from "../src/product-cli.mjs";
import { subject } from "./support/subjects.mjs";

/* findCopiedFacts reads exactly three fields; these fixtures carry nothing else, on purpose. */
const recordOf = (id, { value, ownWords, quotedSpan } = {}) => ({
  id,
  value: value === undefined ? undefined : { value },
  evidence: { ownWords, quotedSpan },
});
const specOf = (framing) => ({ intro: "An introduction that states no fact.", sections: [{ heading: "Heading", framing, claims: [] }] });

const categorise = (reason) =>
  /^a number/.test(reason) ? "numeric"
  : /^a boolean/.test(reason) ? "boolean"
  : /^under \d+ characters/.test(reason) ? "short-string"
  : /^first \d+ characters checked/.test(reason) ? "long-tail"
  : "other-type";

/* ================================================================== *
 * THE ADVERSARIAL CONTROLS — a detector that flags everything is worthless.
 * ================================================================== */

describe("🔴 CONTROL: a number is never matched by substring, because that was measured and it is unsound", () => {
  for (const [label, framing] of [
    ["a longer number CONTAINING the value", "the limit is 110000 units and nothing here is copied"],
    ["a reference number containing the value", "reference 2100009 applies to this page"],
    ["an unrelated longer numeric occurrence", "call 10000 for the helpline, which is not this fact"],
  ]) {
    test(`${label} does NOT make the value COPIED`, () => {
      const records = [recordOf("num.fixture", { value: 10000 })];
      const { copied, clean, notTested } = findCopiedFacts(specOf(framing), records);
      assert.deepEqual(copied, [], "a number was reported copied on a substring collision — the §5A refusal would be false");
      assert.deepEqual(clean, [], "a number was reported CLEAN, which claims a judgement the detector cannot make");
      assert.equal(notTested.length, 1);
      assert.equal(categorise(notTested[0].reason), "numeric");
    });
  }
});

test('🔴 CONTROL: ordinary framing containing the word "false" does NOT make a boolean value COPIED', () => {
  const records = [recordOf("bool.fixture", { value: false })];
  const framing = "It is false to say that a source may always be quoted; the terms decide.";
  const { copied, clean, notTested } = findCopiedFacts(specOf(framing), records);
  assert.deepEqual(copied, [], '"false" is ordinary language — matching it would refuse any page that uses the word');
  assert.deepEqual(clean, []);
  assert.equal(notTested.length, 1);
  assert.equal(categorise(notTested[0].reason), "boolean");
});

/**
 * 🔴 THE MEASURED WINDOW FALSE POSITIVE, KEPT AS A CONTROL (16 September 2026).
 *
 * A fixed 40-character / stride-20 window reported this record as COPIED into both declared specs.
 * The shared run — " not permit its wording to be reproduced" — is exactly 40 characters, equal to
 * the window; it begins mid-clause and joins two DIFFERENT subjects (the record describes one
 * publisher's terms; the framing states an editorial practice); it appears in 0 other fact records
 * and in BOTH specs as shared boilerplate. The window constituted the match rather than sampling a
 * run that existed independently. The method was rejected. This proves it stays rejected.
 */
test("🔴 CONTROL: shared editorial boilerplate does NOT become a §5A copy", () => {
  const ownWords =
    "A source's own intellectual property terms do not permit its wording to be reproduced or stored in a " +
    "retrieval system. Facts from it are therefore recorded in our own words with a link and a date.";
  const framing =
    "Every statement below is followed by the source it came from and the date that source was last checked. " +
    "Where a source does not permit its wording to be reproduced, the requirement is stated in our own words.";
  const records = [recordOf("boilerplate.fixture", { value: true, ownWords })];
  const { copied, notTested } = findCopiedFacts(specOf(framing), records);
  assert.deepEqual(copied, [], "a 40-character run of shared editorial phrasing was reported as a copied fact");
  assert.equal(notTested.filter((n) => n.field === "ownWords").length, 1, "the unexamined tail must be declared, not passed over");
});

/* ================================================================== *
 * THE THIRD STATE — never silently CLEAN, never a REJECT.
 * ================================================================== */

test("🔴 a value longer than the probe whose first 60 characters are clean is NOT_TESTED, never CLEAN", () => {
  const long = `${"A distinctive opening sentence that is comfortably past sixty characters. "}${"and a tail that the probe never reads. ".repeat(3)}`;
  const records = [recordOf("tail.fixture", { value: long })];
  const { copied, clean, notTested } = findCopiedFacts(specOf("Framing that shares nothing with the record."), records);
  assert.deepEqual(copied, []);
  assert.deepEqual(clean, [], "a partially checked value was called CLEAN — that is the silence this change removes");
  assert.equal(notTested.length, 1);
  assert.equal(categorise(notTested[0].reason), "long-tail");
  assert.match(notTested[0].reason, /tail beyond character 60 is NOT checked/);
});

test("CLEAN is reserved for a value the probe covers ENTIRELY and did not find", () => {
  const whole = "A value of forty-five characters exactly here"; // >= 40 and <= 60: fully covered
  assert.ok(whole.length >= 40 && whole.length <= 60, `fixture length ${whole.length} no longer exercises the case`);
  const records = [recordOf("clean.fixture", { value: whole })];
  const { copied, clean, notTested } = findCopiedFacts(specOf("Framing that shares nothing."), records);
  assert.deepEqual(copied, []);
  assert.equal(clean.length, 1);
  assert.deepEqual(notTested, []);
});

test("🔴 detection is UNCHANGED — a real copy is still COPIED", () => {
  const value = "A sentence planted verbatim into the framing of a page spec, which is exactly what §5A forbids.";
  const records = [recordOf("copy.fixture", { value })];
  const { copied, clean, notTested } = findCopiedFacts(specOf(`Some framing. ${value} More framing.`), records);
  assert.equal(copied.length, 1);
  assert.equal(copied[0].claimId, "copy.fixture");
  assert.deepEqual(clean, []);
  assert.deepEqual(notTested, []);
});

test("🔴 EVERY present field is accounted for — a skip with no record is the defect itself", () => {
  const records = [
    recordOf("a", { value: 10000 }),
    recordOf("b", { value: false }),
    recordOf("c", { value: "short" }),
    recordOf("d", { value: "A value of forty-five characters exactly here" }),
    recordOf("e", { value: "x".repeat(200), ownWords: "y".repeat(200), quotedSpan: "z".repeat(200) }),
  ];
  const { copied, clean, notTested } = findCopiedFacts(specOf("Unrelated framing."), records);
  // 4 single-field records + 1 record carrying all three = 7 present field-instances
  assert.equal(copied.length + clean.length + notTested.length, 7);
});

/* ================================================================== *
 * THE REAL POPULATION — EXACT COUNTS, measured 16 September 2026.
 * ================================================================== */

describe("🔴 the measured split of the first product, pinned exactly", () => {
  test("46 values accounted: COPIED 0 · CLEAN 1 · NOT_TESTED 45 (numeric 12 · boolean 1 · short-string 5 · long-tail 27)", async () => {
    const id = availableProducts()[0];
    const p = await subject(id);
    const { records } = await loadRegistry(p.factsDir, p.productId);
    const [slug, spec] = Object.entries(p.pageSpecs)[0];
    const { copied, clean, notTested } = findCopiedFacts(spec, records);

    const vCopied = copied.filter((x) => x.field === "value");
    const vClean = clean.filter((x) => x.field === "value");
    const vNot = notTested.filter((x) => x.field === "value");
    assert.equal(vCopied.length + vClean.length + vNot.length, 46, `${id}/${slug}: the value population is no longer 46`);
    assert.equal(vCopied.length, 0);
    assert.equal(vClean.length, 1, "🔴 exactly ONE of 46 values is fully checked — do not pad this");
    assert.equal(vNot.length, 45);

    const cat = {};
    for (const n of vNot) cat[categorise(n.reason)] = (cat[categorise(n.reason)] ?? 0) + 1;
    assert.deepEqual(cat, { numeric: 12, boolean: 1, "short-string": 5, "long-tail": 27 });
  });

  test("92 field-instances per spec: COPIED 0 · CLEAN 2 · NOT_TESTED 90", async () => {
    const p = await subject(availableProducts()[0]);
    const { records } = await loadRegistry(p.factsDir, p.productId);
    for (const [slug, spec] of Object.entries(p.pageSpecs)) {
      const { copied, clean, notTested } = findCopiedFacts(spec, records);
      assert.equal(copied.length + clean.length + notTested.length, 92, slug);
      assert.equal(copied.length, 0, slug);
      assert.equal(clean.length, 2, slug);
      assert.equal(notTested.length, 90, slug);
    }
  });

  /**
   * 🔴 SIX AT FIELD LEVEL, FIVE AMONG VALUES — AND THAT IS NOT A DISCREPANCY.
   * The sixth short string is a quotedSpan under 40 characters (19 quotedSpans, 1 of them short).
   * Pinned with its reason so nobody later "fixes" the difference into agreement.
   */
  test("short-string is 6 at field level and 5 among values — the sixth is a short quotedSpan", async () => {
    const p = await subject(availableProducts()[0]);
    const { records } = await loadRegistry(p.factsDir, p.productId);
    const [, spec] = Object.entries(p.pageSpecs)[0];
    const { notTested } = findCopiedFacts(spec, records);
    const short = notTested.filter((n) => categorise(n.reason) === "short-string");
    assert.equal(short.length, 6);
    assert.equal(short.filter((n) => n.field === "value").length, 5);
    assert.deepEqual(short.filter((n) => n.field !== "value").map((n) => n.field), ["quotedSpan"]);
  });
});
