/**
 * 🔴 ITEM 50 — THE REAL TRANSITION TEST.
 *
 * Boundary: no path converts UNKNOWN into PASS · the guard must govern REAL records ·
 * FAILURE: a label is absent or wrong, OR THE GUARD POLICES AN EMPTY POPULATION.
 *
 * Four real records, verified in one pass on 13 September 2026, give the guard both
 * directions at once: two whose evidence is sufficient and two whose evidence is not.
 * Every test here reads the REAL registry through the REAL validation path.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { validateRegistry } from "../src/facts/validate.mjs";
import { judgeLeavingUnknown, departuresWithoutJudgement } from "../src/evidence/verdict.mjs";
import { UNKNOWN_REASONS } from "../src/facts/record.mjs";
import { forbiddenTextCensus, FORBIDDEN_PHRASE_HASHES, normaliseWords } from "../tools/forbidden-text-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
// The product is registered through the same entry point the CLI uses — its licence terms only exist once it is.
const product = await productFromArgv(["--product=almi-oet"]);
const { records } = await loadRegistry(product.factsDir, product.productId);
const { UNKNOWN_ON_2026_09_12 } = await import(pathToFileURL(`${REPO}products/almi-oet/facts/_verification-baseline-2026-09-12.mjs`).href);
const v = validateRegistry(records);
const byId = new Map(records.map((r) => [r.id, r]));
const judgementOf = (id) => v.guard.judgements.find((j) => j.id === id);

const LICENCE = "oet.content-licence-permits-stored-quotation";
const WRITING = "oet.writing-task-type.profession=nursing";
const SPEAKING = "oet.speaking-roleplay-setting.profession=nursing";
const GRADES = "oet.grade-bands-0-500";

test("🔴 50 · DIRECTION ONE — evidence arrived: the two VERIFIED verdicts left UNKNOWN THROUGH the guard, on a new measurement", () => {
  assert.equal(v.valid, true, JSON.stringify(v.registryErrors.concat(v.invalidRecords), null, 1));
  for (const id of [LICENCE, WRITING]) {
    const j = judgementOf(id);
    assert.ok(j, `${id} reached VERIFIED without the guard judging it — a transition that bypasses the guard is no evidence the guard works`);
    assert.deepEqual([j.from, j.asked, j.decision, j.declared, j.agrees], ["UNKNOWN", "VERIFIED", "ADVANCED_ON_NEW_MEASUREMENT", "VERIFIED", true]);
    assert.deepEqual(j.reasons, []);
    const r = byId.get(id);
    assert.equal(r.verificationState, "VERIFIED");
    assert.equal(r.verification.previous.state, "UNKNOWN");
    assert.ok(r.verification.checkedOn > r.verification.previous.checkedOn, "not a new measurement");
  }
});

test("🔴 50 · DIRECTION TWO — evidence insufficient: the two UNKNOWN verdicts were ASKED to advance, REFUSED, and stay UNKNOWN with their reasons", () => {
  for (const [id, code, words] of [[SPEAKING, "PARTIAL_EVIDENCE", "PARTIAL EVIDENCE — one element confirmed, two not found"], [GRADES, "SOURCE_UNREACHABLE", "SOURCE UNREACHABLE — three pages returned 403"]]) {
    const j = judgementOf(id);
    assert.ok(j, `${id} was never put to the guard — "nobody tried" is not "the guard refused"`);
    assert.equal(j.asked, "VERIFIED", "the guard was not asked to advance it");
    assert.equal(j.decision, "REFUSED", `the guard advanced ${id} on insufficient evidence`);
    assert.ok(j.reasons.length > 0, "a refusal without its reason");
    assert.deepEqual([j.declared, j.agrees], ["UNKNOWN", true]);
    const r = byId.get(id);
    assert.equal(r.verificationState, "UNKNOWN");
    assert.equal(r.verification.reason, code);
    assert.ok(code in UNKNOWN_REASONS);
    assert.equal(r.verification.verdictWords, words, "the verdict's reason is not in its exact words");
  }
  assert.match(judgementOf(SPEAKING).reasons.join(" | "), /2 element\(s\) of the claim not found/);
  assert.match(judgementOf(GRADES).reasons.join(" | "), /the source was not read — 3 page\(s\) refused \(403\)/);
});

test("🔴 50 · THE POPULATION IS REAL AND NOT EMPTY — 4 real records judged leaving UNKNOWN: 2 advanced, 2 refused", () => {
  assert.deepEqual([v.guard.judged, v.guard.advanced, v.guard.refused], [4, 2, 2]);
  assert.deepEqual(v.guard.judgements.map((j) => j.id).sort(), [LICENCE, GRADES, SPEAKING, WRITING].sort());
  // no record that was UNKNOWN on 12 Sep has left it by any path the guard did not judge
  assert.equal(UNKNOWN_ON_2026_09_12.length, 14);
  assert.deepEqual(departuresWithoutJudgement(records, UNKNOWN_ON_2026_09_12), []);
});

test("🔴 RED (injection): a record DECLARED past a refusal, a sufficient record HELD BACK, and a departure with no judgement are each caught", () => {
  const forced = records.map((r) => (r.id === SPEAKING ? { ...r, verificationState: "VERIFIED", verification: { ...r.verification, state: "VERIFIED" } } : r));
  assert.ok(validateRegistry(forced).registryErrors.some((e) => e.law === "F24" && e.message.includes(SPEAKING) && /REFUSES/.test(e.message)), "a forced transition was accepted");
  const blocked = records.map((r) => (r.id === LICENCE ? { ...r, verificationState: "UNKNOWN", verification: { ...r.verification, state: "UNKNOWN" } } : r));
  assert.ok(validateRegistry(blocked).registryErrors.some((e) => e.law === "F24" && e.message.includes(LICENCE) && /may not be blocked/.test(e.message)), "a blocked sufficient verdict was accepted");
  const bypass = records.map((r) => (r.id === GRADES ? { ...r, verificationState: "VERIFIED", verification: { state: "VERIFIED", checkedOn: "2026-09-13" } } : r));
  assert.deepEqual(departuresWithoutJudgement(bypass, UNKNOWN_ON_2026_09_12), [GRADES], "a record left UNKNOWN with no previous verification and nobody noticed");
});

test("the guard's rule, one condition at a time — each missing piece alone refuses", () => {
  const base = { state: "VERIFIED", checkedOn: "2026-09-13", checkedBy: "human:x", sourceTier: "OFFICIAL", sourceRead: true, elementsConfirmed: 2, elementsNotFound: 0, previous: { state: "UNKNOWN", checkedOn: "2026-09-12" } };
  assert.equal(judgeLeavingUnknown("ok", base).decision, "ADVANCED_ON_NEW_MEASUREMENT");
  for (const over of [{ checkedOn: "2026-09-12" }, { checkedBy: "someone" }, { sourceTier: "SECONDARY" }, { sourceRead: false }, { elementsConfirmed: 0 }, { elementsNotFound: 1 }, { elementsNotFound: null }]) {
    assert.equal(judgeLeavingUnknown("x", { ...base, ...over }).decision, "REFUSED", JSON.stringify(over));
  }
  assert.equal(judgeLeavingUnknown("x", { ...base, previous: { state: "VERIFIED", checkedOn: "2026-09-12" } }), null, "a record not leaving UNKNOWN is outside the population");
});

/* ---- 3C · the split was the sources' doing ------------------------------ */

test("🔴 3C · all four were attempted IDENTICALLY in ONE pass — the two-and-two split is the sources', not the tester's", () => {
  const four = [LICENCE, WRITING, SPEAKING, GRADES].map((id) => byId.get(id).verification);
  assert.equal(new Set(four.map((x) => x.pass)).size, 1);
  assert.match(four[0].pass, /attempted identically in one pass/);
  assert.match(four[0].pass, /what the sources gave, not a choice/);
  assert.deepEqual([...new Set(four.map((x) => x.checkedOn))], ["2026-09-13"]);
  assert.deepEqual([...new Set(four.map((x) => x.checkedBy))], ["human:beta-g (Cowork)"]);
});

/* ---- 1A · NO OET TEXT ---------------------------------------------------- */

test("🔴 1A · NO OET TEXT IN THE REPOSITORY — the policy wording it had quoted, found by hash, occurs nowhere in the current tree", () => {
  const r = forbiddenTextCensus();
  assert.ok(r.scanned > 200, `only ${r.scanned} files scanned`);
  assert.deepEqual(r.hits, [], `stored OET wording: ${r.hits.map((h) => `${h.file}@${h.wordIndex}`).join(", ")}`);
});

test("CONTROL: the census DOES find a phrase it holds the hash of — so its zero means something", () => {
  const planted = "a harmless test phrase nobody wrote down anywhere";
  const words = normaliseWords(planted);
  const sha = execFileSync(process.execPath, ["-e", `process.stdout.write(require("crypto").createHash("sha256").update(${JSON.stringify(words.join(" "))}).digest("hex"))`], { encoding: "utf8" });
  const r = forbiddenTextCensus({ sources: [{ file: "x.md", text: `before. ${planted.toUpperCase()}! after` }], hashes: [{ words: words.length, sha256: sha, what: "planted" }] });
  assert.equal(r.hits.length, 1);
  assert.equal(FORBIDDEN_PHRASE_HASHES.length, 5);
});

test("🔴 1A · the four records store only verdict, source URL, read date, tier and counts — no quoted span, no OET wording in any verification field", () => {
  const allowed = new Set(["state", "verdict", "reason", "verdictWords", "checkedOn", "checkedBy", "sourceUrl", "attempts", "sourceTier", "sourceRead", "elementsConfirmed", "elementsNotFound", "recheckAfter", "recheckWindowDays", "pass", "note", "previous"]);
  for (const id of [LICENCE, WRITING, SPEAKING, GRADES]) {
    const r = byId.get(id);
    assert.equal(r.evidence.quotedSpan ?? null, null);
    for (const k of Object.keys(r.verification)) assert.ok(allowed.has(k), `${id}: unexpected verification field ${k}`);
    assert.match(r.verification.note, /no OET text/);
  }
});

test("🔴 1C · no verdict was re-judged and no value amended — the values are byte-identical to main", () => {
  const before = execFileSync("git", ["show", "9995edd:products/almi-oet/facts/oet.mjs"], { cwd: REPO, encoding: "utf8" });
  for (const id of [LICENCE, WRITING, SPEAKING, GRADES]) {
    const value = byId.get(id).value.value;
    assert.ok(before.includes(typeof value === "string" ? value : `value: ${value},`), `${id}: the value differs from main`);
  }
});
