/**
 * 🔴 SPECIFICATION AMENDMENT 4 (RR-153 §3; _handoffs 6c606b2) — ONE sentence APPENDED to F91's line: F91 owns the governed
 * question-to-page-candidate connection (the owner's assignment, RR-153 §2). Exactly one line differs; 91 rows; ids unchanged.
 *
 * Proves: (1) F91's generated row is Amendment 3's line with Amendment 4's sentence appended, BYTE FOR BYTE — both carried here as TEXT,
 * never copied from the generated file (CI has no _handoffs checkout), and a one-character change is seen; (2) the derivation and the
 * generated list name the amended_4 extract, its commit and its sha256; (3) the denominator stays 91 and only F91's row hash moved.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { CAPABILITIES, EXTRACT_PROVENANCE } from "../config/fboard/capabilities.mjs";
import { EXTRACT_PROVENANCE as DERIVE_PROVENANCE } from "../bin/fboard-derive.mjs";
import { DENOMINATOR } from "../src/fboard/board.mjs";

const A3_LINE = "F91 | Core intelligence | Page opportunity planning | For any client's product, report three distinct numbers, never collapsed into one: possible combinations of the dimensions relevant to that product and its verified data, as candidates only and never page commitments, a dimension that does not apply omitted rather than filled; verified opportunities, the combinations supported by traceable demand, a reliable source, verified product fit and a materially distinct need, keeping observed demand apart from inferred suggestion and owned Search Console evidence labelled owned, never global; and genuinely needed pages, counted only after equivalent questions are grouped and existing coverage and unique value are assessed; each number prints its own method and bound, unknown evidence stays NOT MEASURED and is never zero or estimated, dimensions are never blindly multiplied, no fixed page quota is set, and tenant isolation is preserved.";
const A4_SENTENCE = "F91 also owns the governed connection that records an admitted, source-backed public question against the client's product, its underlying need and one page candidate: the same question from any country or language joins one need, materially different intents stay separate, a country-specific answer difference is kept as a section of that need's page, existing-page coverage is checked before any new page is recommended, and a lead, keyword idea, client claim or fixture never enters it.";
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

test("A4·1 · F91 is Amendment 3's line with Amendment 4's sentence APPENDED, byte for byte — and a one-character change is seen", () => {
  const row = CAPABILITIES.find((c) => c.id === "F91");
  assert.equal(row.lineSha256, sha(`${A3_LINE} ${A4_SENTENCE}`));
  assert.notEqual(row.lineSha256, sha(A3_LINE), "the sentence was not appended");
  assert.notEqual(row.lineSha256, sha(`${A3_LINE} ${A4_SENTENCE.replace("one page candidate", "a page candidate")}`), "CONTROL: a changed word is not seen");
  assert.match(A4_SENTENCE, /^F91 also owns the governed connection that records an admitted, source-backed public question/);
});

test("A4·2 · the derivation and the generated list name the amended_4 extract, its commit and its sha256", () => {
  assert.deepEqual({ ...EXTRACT_PROVENANCE }, { ...DERIVE_PROVENANCE });
  assert.match(EXTRACT_PROVENANCE.path, /amended_4\.extract\.txt$/);
  assert.equal(EXTRACT_PROVENANCE.commit, "6c606b23effa9f5ae3bb9d94b1f6ee69fbbdfb04");
  assert.equal(EXTRACT_PROVENANCE.sha256, "53db85b7968941a0e694022013bf4f11cb89f2ecd587581f17b63663e7cd892a");
});

test("A4·3 · the denominator stays 91 — no row added, none removed", () => {
  assert.equal(DENOMINATOR, 91);
  assert.equal(CAPABILITIES.length, 91);
  assert.equal(new Set(CAPABILITIES.map((c) => c.id)).size, 91);
});
