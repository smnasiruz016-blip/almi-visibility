/**
 * 🔴 F05 · DECLARED CLAUSE-LEVEL SUPERSESSION (command _handoffs af4e9c8, Part B3, 28 Sep 2026).
 *
 * The register could not record that Amendment 7 superseded three clauses of Amendment 5 — every record carried empty
 * supersession arrays. src/authority/supersession.mjs now links a SUPERSEDES-CLAUSES block, declared in a committed record,
 * into those two fields, and refuses every block it cannot resolve. Each refusal below is a firing control; the real corpus
 * test proves the links landed on the real records and moved no status.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { declaredSupersessions, linkSupersessions, SupersessionRefused } from "../src/authority/supersession.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";

const rec = (id) => ({ authorityId: id, propositionId: id.toUpperCase(), status: "CURRENT", supersedes: [], supersededBy: [] });
const BLOCK = (by, target, clauses) => `prose\n\`\`\`\nSUPERSEDES-CLAUSES v1\nby: ${by}\ntarget: ${target}\nclauses: ${clauses}\nEND SUPERSEDES-CLAUSES\n\`\`\`\n`;
const code = (fn) => { try { fn(); return "NO_THROW"; } catch (e) { return e instanceof SupersessionRefused ? e.code : `OTHER:${e.message}`; } };

test("S1 · a declared block links both directions, clause by clause, and changes no status", () => {
  const recs = [rec("x:a5"), rec("x:a7"), rec("x:ruling")];
  const decl = declaredSupersessions(BLOCK("x:a7", "x:a5", "UNIVERSAL_MIN_UNIQUE_WORDS_350, OVERLAP_ABOVE_40_PERCENT")).map((d) => ({ declarer: "x:ruling", ...d }));
  const out = linkSupersessions(recs, decl);
  const a5 = out.find((r) => r.authorityId === "x:a5"), a7 = out.find((r) => r.authorityId === "x:a7");
  assert.deepEqual(a7.supersedes, ["x:a5#OVERLAP_ABOVE_40_PERCENT@x:ruling", "x:a5#UNIVERSAL_MIN_UNIQUE_WORDS_350@x:ruling"]);
  assert.deepEqual(a5.supersededBy, ["x:a7#OVERLAP_ABOVE_40_PERCENT@x:ruling", "x:a7#UNIVERSAL_MIN_UNIQUE_WORDS_350@x:ruling"]);
  assert.deepEqual(out.map((r) => r.status), ["CURRENT", "CURRENT", "CURRENT"], "a clause-level link must not change any status");
  assert.deepEqual(recs[0].supersededBy, [], "the input records are not mutated");
});

test("S2 · no block → no link (the negative control)", () => {
  assert.deepEqual(declaredSupersessions("a ruling that mentions SUPERSEDES-CLAUSES in prose only"), []);
});

test("S3 · every unresolvable declaration REFUSES the whole migration (firing controls)", () => {
  const recs = [rec("x:a5"), rec("x:a7"), rec("x:ruling")];
  const one = (by, target, declarer = "x:ruling") => [{ declarer, by, target, clauses: ["SOME_CLAUSE"] }];
  assert.equal(code(() => linkSupersessions(recs, one("x:a7", "x:missing"))), "SUPERSESSION_TARGET_UNKNOWN");
  assert.equal(code(() => linkSupersessions(recs, one("x:missing", "x:a5"))), "SUPERSESSION_BY_UNKNOWN");
  assert.equal(code(() => linkSupersessions(recs, one("x:a7", "x:a5", "x:nobody"))), "SUPERSESSION_DECLARER_UNKNOWN");
  assert.equal(code(() => linkSupersessions(recs, one("x:a7", "x:a7"))), "SUPERSESSION_SELF");
  assert.equal(code(() => linkSupersessions(recs, [...one("x:a7", "x:a5"), ...one("x:a7", "x:a5")])), "SUPERSESSION_DUPLICATE");
  assert.equal(code(() => linkSupersessions(recs, one("x:a7", "x:a5"))), "NO_THROW", "CONTROL: the lawful declaration passes");
});

test("S4 · a malformed block is refused, never half-read", () => {
  assert.equal(code(() => declaredSupersessions("SUPERSEDES-CLAUSES v1\nby: x:a7\ntarget: x:a5\nclauses: OK_CLAUSE\n")), "SUPERSESSION_BLOCK_MALFORMED", "unclosed");
  assert.equal(code(() => declaredSupersessions("SUPERSEDES-CLAUSES v1\nby: x:a7\ntarget: x:a5\nEND SUPERSEDES-CLAUSES")), "SUPERSESSION_BLOCK_MALFORMED", "target without clauses");
  assert.equal(code(() => declaredSupersessions("SUPERSEDES-CLAUSES v1\nby: x:a7\ntarget: x:a5\nclauses: lower_case\nEND SUPERSEDES-CLAUSES")), "SUPERSESSION_BLOCK_MALFORMED", "bad token");
  assert.equal(code(() => declaredSupersessions("SUPERSEDES-CLAUSES v1\nby: x:a7\nnote: stray\nEND SUPERSEDES-CLAUSES")), "SUPERSESSION_BLOCK_MALFORMED", "stray line");
  assert.equal(code(() => declaredSupersessions(BLOCK("x:a7", "x:a5", "OK_CLAUSE"))), "NO_THROW", "CONTROL: a well-formed block parses");
});

test("S5 · the REAL corpus carries the adoption ruling's six links, and they moved no status", () => {
  const A5R = "_handoffs:AlmiVisibility_OWNER_RULING_2026-09-13_AMENDMENT_5_PORTABLE_PAGE_CONSTRUCTION.md";
  const A5E = "engine:PASS_BOUNDARIES_AMENDMENT_5.md", A7 = "engine:PASS_BOUNDARIES_AMENDMENT_7.md";
  const DECL = "_handoffs:AlmiVisibility_OWNER_RULING_2026-09-28_V3_ADOPTION.md";
  const CLAUSES = ["OVERLAP_ABOVE_40_PERCENT_AUTOMATIC_REJECTION", "UNIVERSAL_MIN_UNIQUE_WORDS_350", "UNIVERSAL_MIN_VERIFIED_FACTS_5"];
  const get = (id) => AUTHORITY_CORPUS.find((r) => r.authorityId === id);
  assert.ok(get(DECL), "the adoption ruling is in the corpus");
  for (const t of [A5R, A5E]) assert.deepEqual([...get(t).supersededBy], CLAUSES.map((c) => `${A7}#${c}@${DECL}`), `${t} records exactly the three superseded clauses`);
  assert.deepEqual([...get(A7).supersedes], [A5R, A5E].sort().flatMap((t) => CLAUSES.map((c) => `${t}#${c}@${DECL}`)));
  for (const id of [A5R, A5E, A7]) assert.equal(get(id).status, "CURRENT", `${id}: a clause-level link leaves the record CURRENT`);
  const linked = AUTHORITY_CORPUS.filter((r) => r.supersedes.length || r.supersededBy.length).map((r) => r.authorityId).sort();
  assert.deepEqual(linked, [A5R, A5E, A7].sort(), "no other record carries a supersession link");
  const row25 = AUTHORITY_CORPUS.find((r) => r.propositionId === "CC_COMMAND_ROW25_PAGE_QUALITY_GATE");
  assert.deepEqual([...row25.supersededBy], [], "Row 25's narrower thresholds are NOT superseded (no named amendment)");
});
