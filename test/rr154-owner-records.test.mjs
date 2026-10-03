/**
 * 🔴 RR-154 §1–§2 · THE OWNER'S TWO RECORDS, READ FROM THE MIGRATED CORPUS (_handoffs 3dba784).
 *
 *   O1 the owner's Stack Exchange source decision resolves CURRENT, OWNER-issued by the owner-decision inclusion rule — and the SAME record
 *      with its issuer removed resolves INVALID (ISSUER_UNDECLARED), so a lost issuer cannot read VALID
 *   O2 the earlier RR-120 Stack Exchange record is still in the corpus, unchanged in name, and still reads INVALID with its reason
 *      (ISSUER_UNDECLARED) — replaced by appending, never deleted or rewritten; and it never resolves CURRENT
 *   O3 the owner's ruling on datasets and page count resolves CURRENT, OWNER-issued; and the round's three records are mandatory reading
 */
import test from "node:test";
import assert from "node:assert/strict";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { resolve } from "../src/authority/register.mjs";
import { MANDATORY_READING } from "../config/governance/mandatory-reading.mjs";

const NOW = CORPUS_PROVENANCE.now;
const SCOPE = ["ALMIVISIBILITY"];
const DECISION = "_handoffs:AlmiVisibility_OWNER_DECISION_2026-10-03_RR-154_STACK_EXCHANGE_SOURCE.md";
const RULING = "_handoffs:AlmiVisibility_OWNER_RULING_2026-10-03_RR-154_DATASETS_AND_PAGE_COUNT.md";
const EARLIER = "_handoffs:AlmiVisibility_RR-120_STACK_EXCHANGE_DECISION_2026-10-01.md";
const find = (id) => AUTHORITY_CORPUS.find((r) => r.authorityId === id);
const lineFor = (res, id) => res.candidates.find((c) => c.authorityId === id);

test("O1 · the owner's Stack Exchange source decision reads CURRENT, issued by the OWNER — and the same record without its issuer reads INVALID", () => {
  const r = find(DECISION);
  assert.ok(r, "the owner's source decision is not in the corpus");
  assert.deepEqual([r.issuer.class, r.issuer.declaredBy], ["OWNER", "inclusion rule owner-ruling-decision-clarification"]);
  assert.equal(r.issuedAt, "2026-10-03");
  const res = resolve({ records: AUTHORITY_CORPUS, propositionId: r.propositionId, scope: SCOPE, now: NOW });
  assert.equal(res.outcome, "CURRENT", "the owner's source decision does not read VALID");
  assert.deepEqual(res.authority.authorityIds, [DECISION]);
  // CONTROL: the same record with its issuer undeclared is INVALID and never CURRENT
  const stripped = AUTHORITY_CORPUS.map((x) => (x.authorityId === DECISION ? { ...x, issuer: { class: null, declaredBy: "NOT DECLARED" } } : x));
  const c = resolve({ records: stripped, propositionId: r.propositionId, scope: SCOPE, now: NOW });
  assert.notEqual(c.outcome, "CURRENT", "CONTROL: a decision with no issuer read CURRENT");
  assert.match(lineFor(c, DECISION).reason, /ISSUER_UNDECLARED/);
});

test("O2 · the earlier RR-120 record is still readable, unchanged in name, and still INVALID with its reason — replaced by appending, never rewritten", () => {
  const r = find(EARLIER);
  assert.ok(r, "the earlier record was deleted from the corpus");
  assert.equal(r.sourceRef.path, "AlmiVisibility_RR-120_STACK_EXCHANGE_DECISION_2026-10-01.md");
  assert.deepEqual([r.issuer.class, r.issuer.declaredBy], [null, "NOT DECLARED"], "the earlier record gained an issuer — it was rewritten");
  const res = resolve({ records: AUTHORITY_CORPUS, propositionId: r.propositionId, scope: SCOPE, now: NOW });
  assert.notEqual(res.outcome, "CURRENT", "the issuer-less record now permits");
  const line = lineFor(res, EARLIER);
  assert.equal(line.disposition, "INVALID");
  assert.match(line.reason, /ISSUER_UNDECLARED/, "the earlier record's reason was lost");
  assert.notEqual(find(DECISION).propositionId, r.propositionId, "the new decision took the old record's proposition — the old reason would be hidden");
});

test("O3 · the owner's ruling on datasets and page count reads CURRENT, OWNER-issued; the round's three records are mandatory reading", () => {
  const r = find(RULING);
  assert.ok(r, "the owner's ruling is not in the corpus");
  assert.equal(r.issuer.class, "OWNER");
  assert.equal(resolve({ records: AUTHORITY_CORPUS, propositionId: r.propositionId, scope: SCOPE, now: NOW }).outcome, "CURRENT");
  const paths = new Set(MANDATORY_READING.map((m) => m.path));
  for (const p of ["AlmiVisibility_CC_COMMAND_2026-10-03_RR-154.md", RULING.slice(10), DECISION.slice(10)]) assert.ok(paths.has(p), `${p} is not mandatory reading`);
});
