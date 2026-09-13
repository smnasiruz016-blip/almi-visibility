/**
 * 🔴 ITEM 50 — THE REAL TRANSITION TEST, OVER THE WHOLE GOVERNED POPULATION.
 *
 * Boundary: no path converts UNKNOWN into PASS · the guard must govern REAL records ·
 * FAILURE: a label is absent or wrong, OR THE GUARD POLICES AN EMPTY POPULATION.
 *
 * #64 reconciled four records and named the rest: 32 VERIFIED labels that had reached
 * VERIFIED on 12 September without ever passing through the guard. Each now declares
 * its elements from its own value text and names the keys its verdict's own words
 * confirmed; the guard polices all 36. Every test reads the REAL registry through the
 * REAL validation path.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { validateRegistry } from "../src/facts/validate.mjs";
import { judgeLeavingUnknown, departuresWithoutJudgement, reconcileElements } from "../src/evidence/verdict.mjs";
import { UNKNOWN_REASONS } from "../src/facts/record.mjs";
import { classify } from "../src/checklist/classification.mjs";
import { forbiddenTextCensus, FORBIDDEN_PHRASE_HASHES, normaliseWords } from "../tools/forbidden-text-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
// The product is registered through the same entry point the CLI uses — its licence terms only exist once it is.
const product = await productFromArgv(["--product=almi-oet"]);
const { records } = await loadRegistry(product.factsDir, product.productId);
const { UNKNOWN_ON_2026_09_12 } = await import(pathToFileURL(`${REPO}products/almi-oet/facts/_verification-baseline-2026-09-12.mjs`).href);
const v = validateRegistry(records);
const byId = new Map(records.map((r) => [r.id, r]));
const judgementOf = (id) => v.guard.judgements.find((j) => j.id === id);
const lawsOf = (recs) => [...new Set(validateRegistry(recs).registryErrors.map((e) => e.law))].sort();
const withVerification = (id, patch) => records.map((r) => (r.id === id ? { ...r, verification: { ...r.verification, ...patch } } : r));
const sha = async (x) => (await import("node:crypto")).createHash("sha256").update(JSON.stringify(x)).digest("hex");

const LICENCE = "oet.content-licence-permits-stored-quotation";
const WRITING = "oet.writing-task-type.profession=nursing";
const SPEAKING = "oet.speaking-roleplay-setting.profession=nursing";
const GRADES = "oet.grade-bands-0-500";
const FOUR = [LICENCE, WRITING, SPEAKING, GRADES];

/* sha256 of JSON.stringify(value) and JSON.stringify(evidence) for each of the 32, measured 13 September 2026 BEFORE reconciliation. */
const BEFORE_RECONCILIATION = Object.freeze({
  "ie-nmbi.oet-minimum-grade.profession=nursing": ["02b964b8dc15c9cafede147ea65c337b00f579eefec3b531d5adce95c80a7fb4", "e591588d9ae1d08d8ae40ddbf4ad532128889c083c6ddf000dc4d781acf33d1f"],
  "ie-nmbi.oet-version-required.profession=nursing": ["746b39ed28c91a1f1d827ab1aac8f1b0b52a9176e9dcdb12d924da7467218acf", "481d453a1e7cc0a8a7ebfa752986d0d6e7f5dd8ee78ea8e7a04c5a03bc585bb4"],
  "ie-nmbi.recognised-english-speaking-countries": ["c858c28d9b3b8085eeb6e7180b89ae925c4b69d111b0f3c1833e5ebcb0dd3c77", "dbf9f79655193372ffbbbf272fac761bfb2fb7b0fec90daa7ba9132bc9d7e44b"],
  "ng-nmcn.issuing-body": ["839a988450a4c9bec8f663c3193d2667267628a6473bf5fa0b5ff7804618118e", "3b18a699fa5443d99a08277def9532333d0d787ae3245e2e8239ade93e46b0ec"],
  "oet.subtests-and-which-are-profession-specific": ["a71f0c3af395d0abc3cd99a3d7b285a91461589a220a5c9bd759b3b9980045c7", "6ce819813e463976a611a7624482e566d041eeefa5364f336fb6a233e392ed33"],
  "pk-pnmc.issuing-body": ["bd0b79285162c182f8bcf942526aa399a4c93406dc489cdee370880484632132", "b4169ed7caa3906c03fc3485be2eabe99404e7c0b34661947bb09b5966e408a8"],
  "pk-pnmc.verification-fee.destination=foreign": ["e07cbe8baeb08d0921b090e738ec8a21e29ef1d87b919db997afff0f5450faa0", "3b977dd51cf783a9fbf2c5bebc7f427eb964917c19307c0546907567a216ba5c"],
  "pk-pnmc.verification-fee.destination=domestic": ["1e0bccb45a352fda26c663802fd3b51a4a49351ecb61d201ee901f087221c0d8", "be31edf8341fccb6470c56b64c2bf6d0d24539cd54079fc31a35d5d99963d24a"],
  "pk-pnmc.verification-response-time": ["f3192b9fe64d697258eae48aaebf68f496e9c662408e4946d3bbab4e6a39246a", "56752805acd50bdbdfb326237334c264066cf36fcf3a6c044a770aa3e86b2c82"],
  "uk-code-of-practice.recruitment-list-membership.country=nigeria": ["c4917c00866120eec1a1024e4d8d1891590b363e91cdbeb23785743a1140ac54", "eb2ea5920fa6548fdfcc27d215c980693f7247372b78135b6ecfbe444700b16d"],
  "uk-code-of-practice.recruitment-list-membership.country=pakistan": ["18adcebdb7c29d0899e270dae7bf2a3e8cbc8947fe32fe5026294fcb9eada816", "eb2ea5920fa6548fdfcc27d215c980693f7247372b78135b6ecfbe444700b16d"],
  "uk-code-of-practice.recruitment-list-membership.country=kenya": ["fb1accd5ac45816e30a9dc1022c84599c24440de6d1d4945d06e6cd70f3815c0", "8819b275f1be2b44bb35e1ca554440e678e6cda0b966aff7d0e4c0a95c95c573"],
  "uk-code-of-practice.red-list-rule": ["4e7f84e9508f039674dd9dce01ce22154227bf6be289bd3078ac5ed2b1f20a85", "bdd6ed17e852c3072970df56d11ced30c6eac30ba550d899b1baaac8395a78cb"],
  "uk-code-of-practice.amber-list-rule": ["857226c509a1c8b7284e343f398aa2f3c595d48cf277e3e42dff3904f3e172ef", "d946fe5bcde7b2399364e6274ddfb0d707ccfd81ecdfc186d638bfcc676baad5"],
  "uk-code-of-practice.amber-list-countries": ["e47092b1a947d95ed9699f884a3e5322d5938a343b94e0ea46e029044b9726c0", "8e98779a5193136fdcd5060eaccbf2cf1b0c4cb369c197d9bb047433f04d03ef"],
  "uk-code-of-practice.red-list-country-count": ["ff11f995cdd8aac928a5d9fb8fd43ac077b8049b820c69870bb70aaacd5124fb", "993a6d21d093011f30eda8a669c7bb18eb086e409eaa83e303829af9d3ea3b16"],
  "uk-hcpc.oet-minimum-score.profession=speech-pathology": ["c1f03487757095b342058c56e018de5b5f4e1a960454e4155d423b3a6be4fc29", "27fef292ae707bdaab5beddec8b9580f8b84c75d345e30d20e3a773a7bb890bd"],
  "uk-hcpc.oet-score-differs-by-profession": ["427ac35a3d62cea895b35a9e604d92c1ee3c3d4e054d33cefdab0ad8b6952a54", "927b482a7b177ecb6025c9dabe7b3d0420f131a7e7f3570537bc3f9fd47e77ad"],
  "uk-hcpc.ielts-minimum.profession=speech-pathology": ["53a56712b48278e92a99e3c72019f2383dcf910cec42d5f73a77134f2cdc1618", "e896c6577e58d5bf3b85a5aab787247c8aa85107c14576d38b156893b09dafa7"],
  "uk-hcpc.accepted-english-tests": ["6bd7cdbecb8ef6c56087f3cded64ac2e49fb7c67675de5a6353f775a34d88ee4", "46b537511607918aa68a1082ae0980fc030ff5d5ac983a5aee4f2abf9b93ff1f"],
  "uk-hcpc.certificate-maximum-age": ["108d1b546acfdf313ef9ca148489613141408427f94b148d83823d363ac90c96", "5bd9e6e368ef4d435835f693365bb5fdc5426448be84952b5641d0f331a824ac"],
  "uk-hcpc.test-venue-requirement": ["bf58e49364aabb53eae3c24615fff83fe63986e037d25802fe739d1117524737", "794d68677a024354763644112969ad6759e52072c5e680d1822b61151173d1e0"],
  "uk-hcpc.oet-profession-version.profession=speech-pathology": ["2c41c7c5659567eced72b48d7422dabb4bf46d769d6f79d5247b943f4798fb77", "366c791b4d4bc791efe8d00ec52b1b5b42d3f213464b50f612ab5d35a5d2d239"],
  "uk-nmc.oet-minimum-grade.profession=nursing": ["6d7fafe8db028972bd096332de6d57369a520236257d4e5610768d8de97c4e09", "82130d6e450a019d5056cd08339a9bf5bfcfbda1edca57f250b744d3f7ebb108"],
  "uk-nmc.oet-combining-sittings.profession=nursing": ["18b85e1b20e8afc27452a239cb1424591b7ed8701b08b0bc2db2bf9d6139b59b", "4d17508ab595498f57e5998c91764600246380acd81910a671301bda7342e02d"],
  "uk-nmc.english-evidence-routes.profession=nursing": ["cb5776bb223d8d826f433a7b09c3313185b4d777526cae759d6664a53c2062ac", "8bc4c55b4842546ebcec02384d3042580a633abf0f49178adc99596def805944"],
  "uk-nmc.qualified-in-english-evidence.profession=nursing": ["a17607f03aa8ea93486b5565dce9f1c7f9afcee76c12d978d140f58a527f8ccd", "de9bc51e2e89979a5978b6dd9251a1b75994731489df1a29cb484d49cab194dd"],
  "uk-nmc.oet-profession-version.profession=nursing": ["28bde74378fbed0b7c76a3a5590b7fb4b059fbef9d81e8bed8c1f2e6b8f959c1", "729925af21f9b40967f59ef40ac092229e1bffc9d17a2e28240daee7fe73eac6"],
  "uk-nmc.oet-combining-sittings-floor.profession=nursing": ["4d9eec83dd871a349f4220a6368e210e094d408dbd3fc2e9fff244778f52fd4c", "7315617f2bd2016b8584a0485a4e648395ba1006cd2c5347fa7110dad7c417f9"],
  "uk-nmc.accepted-oet-delivery-modes.profession=nursing": ["e282d7c6ee401feec3dfc28395daa06ae85f634d18f30167ed23e4677a47ce59", "900197cd8338e8e9165034211a556fe8e56adf4521f1384b2bd13c01a45863dc"],
  "uk-ukvi.majority-english-speaking-countries": ["97244bb78ce97f7adb594a42b072858a8dd0eb5b70d346eed4c5043ac4ea9939", "f9721538f6818b32567bd0e726b196b1ea49732d758d97267f72213dfa33f86d"],
  "uk-ukvi.english-nationality-exemption.nationality=india": ["23cd6597b6c6214d7b2e058822bedc4d9931f01ce2e412a800b75300904af3b9", "5c5a13634474cb5f80ee709e222e493b3c51ae98de552c052a25d5f175fa45f8"],
});
const THIRTY_TWO = Object.keys(BEFORE_RECONCILIATION);

/* the 8 that returned to UNKNOWN — id → declared elements not named by their verdict */
const RETURNED = Object.freeze({
  "uk-code-of-practice.recruitment-list-membership.country=nigeria": 1,
  "uk-code-of-practice.recruitment-list-membership.country=pakistan": 1,
  "uk-code-of-practice.recruitment-list-membership.country=kenya": 1,
  "uk-code-of-practice.amber-list-rule": 1,
  "uk-nmc.oet-combining-sittings.profession=nursing": 4,
  "uk-nmc.qualified-in-english-evidence.profession=nursing": 1,
  "uk-ukvi.majority-english-speaking-countries": 18,
  "uk-ukvi.english-nationality-exemption.nationality=india": 1,
});
/* the 9 VERIFIED labels that rest on a reading the reconciliation cannot settle */
const AMBIGUOUS = Object.freeze([
  "ie-nmbi.recognised-english-speaking-countries", "pk-pnmc.verification-fee.destination=domestic", "pk-pnmc.verification-fee.destination=foreign",
  "uk-code-of-practice.red-list-rule", "uk-hcpc.accepted-english-tests", "uk-nmc.accepted-oet-delivery-modes.profession=nursing",
  "uk-nmc.english-evidence-routes.profession=nursing", "uk-nmc.oet-combining-sittings-floor.profession=nursing", "uk-nmc.oet-minimum-grade.profession=nursing",
]);

/* ---- the four #64 reconciled --------------------------------------------- */

test("🔴 50 · DIRECTION ONE — evidence arrived: the licence record left UNKNOWN THROUGH the guard, every declared element confirmed", () => {
  assert.equal(v.valid, true, JSON.stringify(v.registryErrors.concat(v.invalidRecords), null, 1));
  const j = judgementOf(LICENCE);
  assert.ok(j, "the licence record reached VERIFIED without the guard judging it");
  assert.deepEqual([j.from, j.asked, j.decision, j.declared, j.agrees], ["UNKNOWN", "VERIFIED", "ADVANCED_ON_NEW_MEASUREMENT", "VERIFIED", true]);
  assert.deepEqual([j.elements.listed, j.elements.confirmed, j.elements.notConfirmed], [1, 1, 0]);
  assert.deepEqual(j.reasons, []);
  const r = byId.get(LICENCE);
  assert.equal(r.verificationState, "VERIFIED");
  assert.ok(r.verification.checkedOn > r.verification.previous.checkedOn, "not a new measurement");
});

test("🔴 50 · DIRECTION TWO — evidence insufficient: writing, speaking and grade bands were ASKED to advance, REFUSED, and stay UNKNOWN", () => {
  const expected = {
    [WRITING]: { code: "PARTIAL_EVIDENCE", words: "PARTIAL EVIDENCE — three elements confirmed, three not found", listed: 6, confirmed: 3, notConfirmed: 3 },
    [SPEAKING]: { code: "PARTIAL_EVIDENCE", words: "PARTIAL EVIDENCE — one element confirmed, two not found", listed: 6, confirmed: 1, notConfirmed: 5 },
    [GRADES]: { code: "SOURCE_UNREACHABLE", words: "SOURCE UNREACHABLE — three pages returned 403", listed: 5, confirmed: 0, notConfirmed: 5 },
  };
  for (const [id, e] of Object.entries(expected)) {
    const j = judgementOf(id);
    assert.ok(j, `${id} was never put to the guard — "nobody tried" is not "the guard refused"`);
    assert.equal(j.asked, "VERIFIED", "the guard was not asked to advance it");
    assert.equal(j.decision, "REFUSED", `the guard advanced ${id} on insufficient evidence`);
    assert.deepEqual([j.declared, j.agrees], ["UNKNOWN", true]);
    assert.deepEqual([j.elements.listed, j.elements.confirmed, j.elements.notConfirmed], [e.listed, e.confirmed, e.notConfirmed], `${id}: the guard's derived counts`);
    const r = byId.get(id);
    assert.equal(r.verificationState, "UNKNOWN");
    assert.equal(r.verification.reason, e.code);
    assert.ok(e.code in UNKNOWN_REASONS);
    assert.equal(r.verification.verdictWords, e.words, "the verdict's reason is not in its exact words");
  }
  assert.match(judgementOf(WRITING).reasons.join(" | "), /3 of 6 declared element\(s\) not confirmed/);
  assert.match(judgementOf(GRADES).reasons.join(" | "), /the source was not read — 3 page\(s\) refused \(403\)/);
});

test("🔴 the writing record is CORRECTED, not re-verified: UNKNOWN, PARTIAL_EVIDENCE, same checker, date, source and previous", () => {
  const w = byId.get(WRITING).verification;
  assert.deepEqual([w.state, w.verdict, w.reason], ["UNKNOWN", "UNKNOWN", "PARTIAL_EVIDENCE"]);
  assert.deepEqual([w.checkedOn, w.checkedBy, w.sourceUrl, w.sourceTier, w.sourceRead], ["2026-09-13", "human:beta-g (Cowork)", "https://oet.com/ready/writing", "OFFICIAL", true]);
  assert.deepEqual([w.previous.state, w.previous.reason, w.previous.checkedOn], ["UNKNOWN", "SOURCE_UNREACHABLE", "2026-09-12"]);
  assert.equal(w.recheckAfter, undefined, "an UNKNOWN record carries no recheck date of a verification it does not have");
});

/* ---- 🔴 THE WHOLE GOVERNED POPULATION ------------------------------------ */

test("🔴 50 · THE WHOLE GOVERNED POPULATION — 36 real records judged: 25 advanced, 11 refused; NO VERIFIED label reached VERIFIED without the guard", () => {
  assert.deepEqual([v.guard.judged, v.guard.advanced, v.guard.refused], [36, 25, 11]);
  assert.deepEqual(v.guard.judgements.map((j) => j.id).sort(), [...FOUR, ...THIRTY_TWO].sort());
  const unguarded = records.filter((r) => r.verificationState === "VERIFIED" && !judgementOf(r.id)).map((r) => r.id);
  assert.deepEqual(unguarded, [], "a VERIFIED label never passed through the guard");
  assert.equal(records.filter((r) => r.verificationState === "VERIFIED").length, 25);
  assert.equal(UNKNOWN_ON_2026_09_12.length, 14);
  assert.deepEqual(departuresWithoutJudgement(records, UNKNOWN_ON_2026_09_12), []);
});

test("🔴 PART 1/3 · every one of the 32 declares its elements from its own value text — and F27 now polices all 36", () => {
  for (const id of THIRTY_TWO) {
    const r = byId.get(id);
    assert.ok(Array.isArray(r.claimElements) && r.claimElements.length > 0, `${id}: no declared element list`);
    for (const k of r.claimElements) assert.match(k, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${id}: ${k} is not a short stable key`);
    assert.deepEqual([r.verification.previous.state, r.verification.previous.checkedOn], ["UNVERIFIED", null], `${id}: its previous is not the never-checked state it came from`);
    for (const k of r.verification.elementsConfirmedKeys) assert.ok(r.claimElements.includes(k), `${id}: named key ${k} is not declared`);
  }
  const governed = records.filter((r) => judgeLeavingUnknown(r.id, r.verification, r.claimElements));
  assert.equal(governed.length, 36);
  assert.ok(governed.every((r) => Array.isArray(r.claimElements)), "a governed record has no element list");
  assert.deepEqual(lawsOf(records), []);
  // 🔴 counted from the lists, not from a shape heuristic: 23 of the 32 declare more than one element
  assert.equal(THIRTY_TWO.filter((id) => byId.get(id).claimElements.length > 1).length, 23);
});

test("🔴 PART 2 · the 8 whose verdicts named only part of their value returned to UNKNOWN / PARTIAL_EVIDENCE — their verdict wording UNTOUCHED", () => {
  for (const [id, notConfirmed] of Object.entries(RETURNED)) {
    const r = byId.get(id);
    const j = judgementOf(id);
    assert.equal(r.verificationState, "UNKNOWN", `${id} kept a label its verdict does not cover`);
    assert.equal(r.verification.reason, "PARTIAL_EVIDENCE");
    assert.equal(r.verification.verdict, "VERIFIED", "the verdict's own recorded wording was rewritten");
    assert.ok(typeof r.verification.note === "string" && r.verification.note.length > 5, `${id}: the verdict's note is gone`);
    assert.deepEqual([j.decision, j.declared, j.agrees, j.elements.notConfirmed], ["REFUSED", "UNKNOWN", true, notConfirmed], `${id}: derived counts`);
    assert.match(r.verification.reconciliation, /Nothing was re-verified/);
  }
  const stillVerified = THIRTY_TWO.filter((id) => !(id in RETURNED));
  assert.equal(stillVerified.length, 24);
  for (const id of stillVerified) assert.deepEqual([byId.get(id).verificationState, judgementOf(id).elements.notConfirmed], ["VERIFIED", 0], id);
});

test("🔴 PART 4 · 9 VERIFIED labels rest on a reading the reconciliation cannot settle — so item 50 STAYS FAILED", () => {
  const flagged = records.filter((r) => r.verification?.elementAmbiguity).map((r) => r.id).sort();
  assert.deepEqual(flagged, [...AMBIGUOUS].sort());
  for (const id of AMBIGUOUS) assert.equal(byId.get(id).verificationState, "VERIFIED", `${id}: flagged records are the labels in question`);
  const row = classify()[50];
  assert.equal(row.state, "FAILED", "item 50 was ticked while labels rest on an unsettled reading");
  assert.match(row.remainingPopulation, /9 of the 25 VERIFIED labels rest on a reading the reconciliation cannot settle/);
});

test("🔴 no value and no evidence amended across the 32 — each hashes exactly as before reconciliation", async () => {
  for (const [id, [value, evidence]] of Object.entries(BEFORE_RECONCILIATION)) {
    const r = byId.get(id);
    assert.equal(await sha(r.value), value, `${id}: its value changed`);
    assert.equal(await sha(r.evidence), evidence, `${id}: its evidence changed`);
  }
});

/* ---- the two guard edges this population needed, each proved both ways ---- */

const neverChecked = (over = {}) => ({ state: "VERIFIED", checkedOn: "2026-09-12", checkedBy: "human:x", sourceTier: "OFFICIAL", elementsConfirmedKeys: ["a", "b"], previous: { state: "UNVERIFIED", checkedOn: null }, ...over });

test("🔴 EDGE 1 · a never-checked record's first DATED check is its new measurement — an undated one is still refused", () => {
  assert.equal(judgeLeavingUnknown("x", neverChecked(), ["a", "b"]).decision, "ADVANCED_ON_NEW_MEASUREMENT");
  const undated = judgeLeavingUnknown("x", neverChecked({ checkedOn: undefined }), ["a", "b"]);
  assert.equal(undated.decision, "REFUSED");
  assert.match(undated.reasons.join(" "), /no NEW measurement/);
});

test("🔴 EDGE 2 · 'source read' is derived only from named elements — an explicit false, or a verdict that names nothing, refuses", () => {
  assert.equal(judgeLeavingUnknown("x", neverChecked(), ["a", "b"]).decision, "ADVANCED_ON_NEW_MEASUREMENT", "a verdict naming what it saw was not taken as read");
  const saidNotRead = judgeLeavingUnknown("x", neverChecked({ sourceRead: false }), ["a", "b"]);
  assert.equal(saidNotRead.decision, "REFUSED", "an explicit sourceRead: false was overridden");
  assert.match(saidNotRead.reasons.join(" "), /the source was not read/);
  const namesNothing = judgeLeavingUnknown("x", neverChecked({ elementsConfirmedKeys: [] }), ["a", "b"]);
  assert.equal(namesNothing.decision, "REFUSED");
  assert.match(namesNothing.reasons.join(" "), /records no read and names no element/);
});

/* ---- D-GUARD-1 · each limb ALONE, by injection ---------------------------- */

test("🔴 LIMB 1 · a supplied count is REFUSED (F25) and ignored — elementsNotFound: 0 on a record whose list says 3", () => {
  const recs = withVerification(WRITING, { elementsNotFound: 0 });
  assert.deepEqual(lawsOf(recs), ["F25"], "the supplied count tripped more — or less — than its own limb");
  const j = judgeLeavingUnknown(WRITING, recs.find((r) => r.id === WRITING).verification, byId.get(WRITING).claimElements);
  assert.equal(j.decision, "REFUSED", "a supplied 0 changed the guard's answer");
  assert.equal(j.elements.notConfirmed, 3);
});

test("🔴 LIMB 2 · a verdict key the record does not declare is STALE (F26) — and confirms nothing", () => {
  const w = byId.get(WRITING).verification;
  const recs = withVerification(WRITING, { elementsConfirmedKeys: [...w.elementsConfirmedKeys, "invented-element"] });
  assert.deepEqual(lawsOf(recs), ["F26"]);
  const j = judgeLeavingUnknown(WRITING, recs.find((r) => r.id === WRITING).verification, byId.get(WRITING).claimElements);
  assert.deepEqual([j.elements.confirmed, [...j.elements.stale]], [3, ["invented-element"]]);
});

test("🔴 LIMB 3 · an element the verdict leaves UNMENTIONED is NOT CONFIRMED — the record is refused advancement (F24)", () => {
  const recs = withVerification(LICENCE, { elementsConfirmedKeys: [] });
  assert.deepEqual(lawsOf(recs), ["F24"], "an unmentioned element was counted as confirmed by omission");
  const j = judgeLeavingUnknown(LICENCE, recs.find((r) => r.id === LICENCE).verification, byId.get(LICENCE).claimElements);
  assert.deepEqual([j.decision, j.elements.notConfirmed], ["REFUSED", 1]);
});

test("🔴 LIMB 4 · a governed record with NO element list is a FAILURE (F27) — and nothing of it counts as confirmed", () => {
  const recs = records.map((r) => (r.id === WRITING ? { ...r, claimElements: undefined } : r));
  assert.deepEqual(lawsOf(recs), ["F27"]);
  const j = judgeLeavingUnknown(WRITING, byId.get(WRITING).verification, undefined);
  assert.deepEqual([j.decision, j.elements.missingList, j.elements.confirmed], ["REFUSED", true, 0]);
});

test("reconciliation, stated once: declared ∩ named-confirmed; silence and contradiction are not confirmation", () => {
  const e = reconcileElements(["a", "b", "c"], { elementsConfirmedKeys: ["a", "c", "z"], elementsNotFoundKeys: ["c"] });
  assert.deepEqual([[...e.confirmed], [...e.notConfirmed], [...e.stale], [...e.contradictory]], [["a"], ["b", "c"], ["z"], ["c"]]);
  assert.equal(reconcileElements(undefined, {}).listed, null);
});

/* ---- 3C · the split was the sources' doing ------------------------------ */

test("🔴 3C · the four OET records were attempted IDENTICALLY in ONE pass by the same verifier", () => {
  const four = FOUR.map((id) => byId.get(id).verification);
  assert.equal(new Set(four.map((x) => x.pass)).size, 1);
  assert.match(four[0].pass, /attempted identically in one pass/);
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
  const hash = execFileSync(process.execPath, ["-e", `process.stdout.write(require("crypto").createHash("sha256").update(${JSON.stringify(words.join(" "))}).digest("hex"))`], { encoding: "utf8" });
  const r = forbiddenTextCensus({ sources: [{ file: "x.md", text: `before. ${planted.toUpperCase()}! after` }], hashes: [{ words: words.length, sha256: hash, what: "planted" }] });
  assert.equal(r.hits.length, 1);
  assert.equal(FORBIDDEN_PHRASE_HASHES.length, 5);
});

test("🔴 1A · every governed verification holds only declared fields — element keys, verdict, URL, dates, tier — no count, no quoted span", () => {
  const allowed = new Set(["state", "verdict", "reason", "verdictWords", "checkedOn", "checkedBy", "sourceUrl", "attempts", "sourceTier", "sourceRead", "elementsConfirmedKeys", "elementsNotFoundKeys", "recheckAfter", "recheckWindowDays", "pass", "note", "previous", "reconciledOn", "reconciliation", "elementAmbiguity"]);
  for (const id of [...FOUR, ...THIRTY_TWO]) {
    const r = byId.get(id);
    for (const k of Object.keys(r.verification)) assert.ok(allowed.has(k), `${id}: unexpected verification field ${k}`);
  }
  for (const id of FOUR) {
    assert.equal(byId.get(id).evidence.quotedSpan ?? null, null);
    assert.match(byId.get(id).verification.note, /no OET text/);
  }
});

/* PINNED AS HASHES, NOT READ FROM HISTORY — a depth-1 clone (and CI) does not have main's older commits. */
const ON_MAIN = Object.freeze({
  [LICENCE]: { value: "59eae93e7cd619eccde8e9f72894130cca17d4e2e13e9564996dfd04707011f5", evidence: "b6980e6d778e58aa7601d1f80e907b3eb1658ee1518cd7e46d9c0671e1832083" },
  [WRITING]: { value: "6349d5afbef13b5e19b0cbbc9afabe3735660acc89ae9c886e50423611fd70ee", evidence: "ae6f858e03c35ed2d918e583c6e6286d01a60cc98d6a06ef992904bfd15b6c4f" },
  [SPEAKING]: { value: "3307859cc7ce98608c10c34e126706632d0440ef2172addc147fb20447531b25", evidence: "3ceb60b9744185307d2ec3aa76013e9ce7583aca4dcf2fe01619e98226a1edf5" },
  [GRADES]: { value: "442f7939b076a8b1a9577865d448d22b816b736a096973c7f69a81eea37e52dc", evidence: "6bef225f82cbc681b57a5e1885ca532de9b75dfff606b42876d2f833a019822f" },
});

test("🔴 1C · the four OET records: no value amended and no evidence touched — each hashes exactly as on main", async () => {
  for (const id of FOUR) {
    const r = byId.get(id);
    assert.equal(await sha(r.value), ON_MAIN[id].value, `${id}: the value differs from main`);
    assert.equal(await sha(r.evidence), ON_MAIN[id].evidence, `${id}: the evidence differs from main`);
  }
});
