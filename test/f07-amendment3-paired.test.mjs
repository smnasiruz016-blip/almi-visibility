/**
 * 🔴 F07 · AMENDMENT 3 (governance 264c680, contract 06634cdf…) — THE PAIRED RELEASE: three count-only aggregates (abstentions,
 * discordant pairs, discordant pairs correct both ways), a real ABSTAIN distinct from NO, set/key PREFLIGHT before the claim, and a
 * seven-token ceiling for a paired protocol.
 *
 * These proofs drive the SAME function the production route calls (src/heldout/lifecycle.mjs scoreClassification), never a copy.
 * Every firing control runs on CONSTRUCTED, non-sensitive stand-ins registered only inside scratch trees and in-memory audit
 * stores, removed afterwards; item ids carry a per-run nonce so no constructed id is ever a tracked string.
 *
 * 🔴 THE REAL POPULATION IS ZERO: no HELD_OUT_EVIDENCE and no MARKING_KEY is registered, so these limbs are NOT_MEASURED on real
 * material (F06). The production audit trail is hashed before and after.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { createHash, randomBytes } from "node:crypto";
import { join } from "node:path";

import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { storeFiles } from "../src/governance/sealed-store-roots.mjs";
import {
  populationCommitment, mechanismHash, freezeMechanism, requestHeldOutAccess, scoreClassification, keyCommitment, parsePairStructure,
  LINKED_ACTIONS, EVALUATION_ACTIONS, MAX_PAIRED_PROTOCOL_TOKENS,
} from "../src/heldout/lifecycle.mjs";
import { countingStore } from "../tools/heldout-access-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const PROD = ["audit-trail/events.jsonl", "audit-trail/head.json"].map((p) => join(REPO, p));
const prodHashes = () => PROD.map((p) => sha(fs.readFileSync(p)));
const PROD_BEFORE = prodHashes();

/* ── Constructed, non-sensitive stand-ins: five needs, five candidates; five matched pairs and five re-pairs ── */
const NONCE = randomBytes(4).toString("hex");
const n = (i) => `sn${NONCE}${i}`, c = (i) => `sc${NONCE}${i}`;
const M = (i) => `${n(i)}>${c(i)}`;                       // matched pair i
const R = (i) => `${n(i + 1)}>${c(i)}|${M(i)}`;          // re-pair: candidate i with need i+1, drawn from matched pair i
const ITEMS = [1, 2, 3, 4, 5].flatMap((i) => [M(i), R(i)]);
const PROTOCOL = Object.freeze({ classes: ["LIKELY"], exclusions: ["SKIP"], paired: Object.freeze({ cls: "LIKELY" }) });
const L = ["LIKELY"], N = [];
const KEY_ROWS = [
  { item: M(1), classes: L }, { item: R(1), classes: N },   // discordant
  { item: M(2), classes: L }, { item: R(2), classes: L },   // concordant
  { item: M(3), classes: N }, { item: R(3), classes: L },   // discordant
  { item: M(4), classes: L }, { item: R(4), classes: N },   // discordant
  { item: M(5), classes: L }, { item: R(5), exclusion: "SKIP" }, // excluded — never a discordant unit
];
const YES = { classes: ["LIKELY"] }, NO = { classes: [] }, ABSTAIN = { abstain: true };
const OUTPUTS = () => new Map([[M(1), YES], [R(1), NO], [M(2), YES], [R(2), ABSTAIN], [M(3), NO], [R(3), YES], [M(4), YES], [R(4), YES], [M(5), ABSTAIN], [R(5), NO]]);
/* Worked by hand from the ten rows above (R5 excluded, so D = 9):
 *   LIKELY truth {M1,M2,R2,R3,M4,M5}; positive {M1,M2,R3,M4,R4} (an ABSTAIN is not-positive)
 *     → tp 4 (M1,M2,R3,M4) · fp 1 (R4) · fn 2 (R2,M5) · tn 2 (R1,M3)
 *   abstentions 2 (R2, M5 — both inside D) · discordant pairs 3 (1, 3, 4) · correct both ways 2 (1, 3; pair 4 is wrong on R4) */
const EXPECTED = { tables: { LIKELY: { tp: 4, fp: 1, fn: 2, tn: 2 } }, denominator: 9, declared: 10, abstentions: 2, discordantPairs: 3, discordantBothCorrect: 2 };
const KEY_TEXT = KEY_ROWS.map((r) => JSON.stringify(r)).join("\n") + "\n";
const TENANTS = Object.freeze(["tenant:" + "c3".repeat(16)]);

const MECH = mechanismHash({ "mechanism.mjs": "export const m = (x) => x; // synthetic amendment-3 mechanism" });
const SCORER = mechanismHash({ "scorer.mjs": "export const s = (x) => x; // synthetic amendment-3 scorer" });
const REAL_OWNER = AUTHORITY_CORPUS.find((r) => r.status === "CURRENT" && r.issuer?.class === "OWNER");
const AUTH = [...AUTHORITY_CORPUS, { ...REAL_OWNER, authorityId: "synthetic:f07a3-evaluator", propositionId: "SYNTHETIC_F07A3_EVALUATOR", scope: ["ALMIVISIBILITY"], supersedes: [], supersededBy: [], contentHash: "e".repeat(64), issuedAt: "2026-01-01", effectiveFrom: "2026-01-01" }];
const lifeAudit = () => ({ store: countingStore(), actor: "test/f07a3", softwareVersion: "engine:test", correlationId: `run:f07a3:${Math.random()}`, authorityRef: { propositionId: "OWNER_RULING_HELDOUT_ROLE_SCOPE", scope: ["ALMIVISIBILITY"] }, authorityHash: "d".repeat(64) });

/** A world: the paired SET under a tracked prefix of a scratch tree; the KEY under a tracked prefix ("G") or in a governed
 * sealed store outside the tree ("S"). */
function world(shape = "G", { keyText = KEY_TEXT, items = ITEMS } = {}) {
  const tree = fs.mkdtempSync(join(REPO, ".test-scratch", "f07a3-"));
  fs.mkdirSync(join(tree, "sealed-set"), { recursive: true });
  fs.writeFileSync(join(tree, "sealed-set", "items.txt"), items.join("\n") + "\n");
  const store = shape === "S" ? fs.mkdtempSync(join(os.tmpdir(), "f07a3-store-")) : null;
  const keyBase = shape === "S" ? store : tree;
  const keyRel = shape === "S" ? "keys/labels.jsonl" : "sealed-key/labels.jsonl";
  fs.mkdirSync(join(keyBase, keyRel.split("/")[0]), { recursive: true });
  fs.writeFileSync(join(keyBase, keyRel), keyText);
  const treeFiles = () => fs.readdirSync(tree, { recursive: true }).map(String).filter((p) => fs.statSync(join(tree, p)).isFile()).map((p) => p.replace(/\\/g, "/")).sort();
  const SET = Object.freeze({
    id: "synthetic:f07a3-set", role: "HELD_OUT_EVIDENCE", resource: Object.freeze({ root: "t", pathPrefixes: Object.freeze(["sealed-set/"]) }),
    scope: "constructed stand-in", source: "test", provenance: "test", capturedAt: "2026-09-26", contentHash: populationCommitment(items),
    mandatoryReadable: false, mayTrain: false, mayEvaluate: true, maySupplyExpectedAnswer: false, sealed: true, retiredReason: null, tenantScope: TENANTS,
  });
  const KEY = Object.freeze({
    ...SET, id: "synthetic:f07a3-key", role: "MARKING_KEY", resource: Object.freeze({ root: shape === "S" ? "vault" : "t", pathPrefixes: Object.freeze([keyRel.split("/")[0] + "/"]) }),
    contentHash: keyCommitment({ [keyRel]: Buffer.from(keyText) }), maySupplyExpectedAnswer: true, mayEvaluate: false, linkedSet: SET.id, tenantScope: TENANTS,
    labelVocabulary: Object.freeze([...PROTOCOL.classes, ...PROTOCOL.exclusions]),
  });
  const roots = { t: tree, ...(store ? { vault: store } : {}) };
  const filesOf = (r) => (r === "t" ? treeFiles() : r === "vault" ? storeFiles(store) : []);
  const cleanup = () => { fs.rmSync(tree, { recursive: true, force: true }); if (store) fs.rmSync(store, { recursive: true, force: true }); };
  return { tree, store, keyRel, keyBase, SET, KEY, registry: [SET, KEY], roots, filesOf, foreignRoots: store ? { vault: store } : {}, cleanup };
}
function frozenAudit() {
  const a = lifeAudit();
  freezeMechanism({ audit: a, mechanismId: "synthetic-f07a3-mechanism", mechanismHash: MECH, frozenAt: "2026-09-26T11:00:00Z" });
  freezeMechanism({ audit: a, mechanismId: "synthetic-f07a3-scorer", mechanismHash: SCORER, frozenAt: "2026-09-26T11:00:00Z" });
  return a;
}
const grantFor = (a, w) => requestHeldOutAccess({ audit: a, registry: w.registry, authorityRecords: AUTH, request: {
  mechanismId: "synthetic-f07a3-mechanism", mechanismHash: MECH, sealedSetId: w.SET.id, populationCommitment: w.SET.contentHash,
  protocolId: "synthetic-protocol-a3", evaluatorAuthority: { propositionId: "SYNTHETIC_F07A3_EVALUATOR", scope: ["ALMIVISIBILITY"] },
  purpose: "assessment", at: "2026-09-26T12:00:00Z", keySetId: w.KEY.id, keyCommitment: w.KEY.contentHash, scorerId: "synthetic-f07a3-scorer", scorerHash: SCORER } });
const score = (a, w, g, over = {}) => scoreClassification({ audit: a, grant: g, currentMechanismHash: MECH, registry: w.registry, roots: w.roots, filesOf: w.filesOf, outputs: OUTPUTS(), protocol: PROTOCOL, foreignRoots: w.foreignRoots, ...over });
const events = (a, action) => a.store.events.filter((e) => e.action === action);
const released = (a) => events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "RECORDED");
/** The only fields a release may carry — Amendment 2's aggregate fields plus, for a paired protocol, Amendment 3's three. */
const A2_FIELDS = /^(family|mechanismId|mechanismHash|sealedSetId|scorerId|scorerHash|keySetId|combination|claimEventId|grantEventId|declared|denominator|evidenceState|untouched|c_[A-Z0-9_]+|x_[A-Z0-9_]+)$/;
const A3_FIELDS = ["abstentions", "discordantPairs", "discordantBothCorrect"];

/* ═══ REAL — the population, stated ═══════════════════════════════════════════════════════════════════════════════════════ */

test("F07A3 · REAL · the real registry holds 2 HELD_OUT_EVIDENCE (F10's sealed sets) and 0 MARKING_KEY — the paired limbs stay NOT_MEASURED on real material until a real key exists", () => {
  /* At Amendment 3's verification it held 0 and 0 (that record stays true). since 27 Sep 2026 (F10's one selection, sealed and registered in storage S — engine cecf880 and its registration commit): 2 sealed sets, no key yet — so no real paired
   * run has happened, and the paired limbs are still NOT_MEASURED on real material. */
  assert.deepEqual(["HELD_OUT_EVIDENCE", "MARKING_KEY"].map((r) => EVIDENCE_ROLE_REGISTRY.filter((e) => e.role === r).length), [2, 0]);
});

/* ═══ L7 · THE PAIRED RELEASE ═════════════════════════════════════════════════════════════════════════════════════════════ */

test("F07A3 · L7 · a paired run releases EXACTLY the hand-worked tables and the three aggregates — identical in both key shapes — within the ceiling, and nothing tied to an item", () => {
  const out = [];
  for (const shape of ["G", "S"]) {
    const w = world(shape);
    try {
      const a = frozenAudit();
      const r = score(a, w, grantFor(a, w));
      assert.deepEqual({ tables: r.tables, denominator: r.denominator, declared: r.declared, abstentions: r.abstentions, discordantPairs: r.discordantPairs, discordantBothCorrect: r.discordantBothCorrect }, EXPECTED, `shape ${shape}: the release differs from the hand-worked counts`);
      const ev = released(a);
      assert.equal(ev.length, 1);
      assert.deepEqual(A3_FIELDS.map((f) => ev[0].metadata[f]), ["2", "3", "2"], `shape ${shape}: the recorded aggregates differ`);
      assert.deepEqual(Object.keys(ev[0].metadata).filter((k) => !A2_FIELDS.test(k) && !A3_FIELDS.includes(k)), [], "the release carries a field beyond the declared aggregates");
      assert.ok(Object.keys(ev[0].metadata).length <= 24, "the paired release exceeds the one-event metadata ceiling");
      const everything = JSON.stringify([r, a.store.events]);
      for (const x of [NONCE, ...ITEMS]) assert.ok(!everything.includes(x), `shape ${shape}: an item, pair or partner identity crossed out of the boundary`);
      out.push(JSON.stringify(r.tables) + r.abstentions + r.discordantPairs + r.discordantBothCorrect);
    } finally { w.cleanup(); }
  }
  assert.equal(out[0], out[1], "the two key shapes scored differently");
});

test("F07A3 · L7 · an UNPAIRED protocol releases no paired field and accepts no ABSTAIN — its release is Amendment 2's, unchanged", () => {
  const w = world("G");
  try {
    const unpaired = { classes: PROTOCOL.classes, exclusions: PROTOCOL.exclusions };
    const a = frozenAudit();
    const plain = new Map([...OUTPUTS()].map(([i, o]) => [i, o.abstain ? NO : o]));
    const r = score(a, w, grantFor(a, w), { protocol: unpaired, outputs: plain });
    assert.deepEqual(A3_FIELDS.map((f) => [r[f], released(a)[0].metadata[f]]), [[undefined, undefined], [undefined, undefined], [undefined, undefined]], "an unpaired run released a paired aggregate");
    assert.deepEqual(r.tables, EXPECTED.tables, "CONTROL: the unpaired tables differ from the paired ones on the same answers");
    const b = frozenAudit();
    assert.throws(() => score(b, w, grantFor(b, w), { protocol: unpaired }), { code: "INPUT_INCONSISTENT" }, "an ABSTAIN was accepted under an unpaired protocol, where no count could show it");
  } finally { w.cleanup(); }
});

/* ═══ L6 · ABSTAIN IS NEVER NO ════════════════════════════════════════════════════════════════════════════════════════════ */

test("F07A3 · L6 · an ABSTAIN stays in D, is not-positive, is counted as an abstention and NEVER as a negative answer — CONTROL: the same run with each ABSTAIN replaced by NO counts ZERO abstentions", () => {
  const w = world("G");
  try {
    const a = frozenAudit();
    const r = score(a, w, grantFor(a, w));
    assert.equal(r.denominator, 9, "an ABSTAIN left the denominator");
    assert.ok(r.abstentions >= 2, "an ABSTAIN was not counted as an abstention");
    assert.ok(r.abstentions <= 2, "a NO was counted as an abstention");
    const w2 = world("G");
    try {
      const b = frozenAudit();
      const asNo = new Map([...OUTPUTS()].map(([i, o]) => [i, o.abstain ? NO : o]));
      const q = score(b, w2, grantFor(b, w2), { outputs: asNo });
      assert.deepEqual([q.denominator, q.abstentions], [9, 0], "CONTROL: a NO was counted as an abstention — ABSTAIN and NO cannot be told apart");
      assert.deepEqual(q.tables, r.tables, "an ABSTAIN was scored differently from not-positive in the table");
    } finally { w2.cleanup(); }
    for (const [why, bad] of [["ABSTAIN with classes", { abstain: true, classes: [] }], ["abstain false", { abstain: false }], ["no answer shape", {}]]) {
      const c = frozenAudit();
      const outs = OUTPUTS(); outs.set(M(1), bad);
      assert.throws(() => score(c, w, grantFor(c, w), { outputs: outs }), { code: "INPUT_INCONSISTENT" }, `${why}: an invalid answer was scored`);
      assert.equal(events(c, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "INVALID").length, 1, `${why}: an invalid OUTPUT did not invalidate the claimed run`);
    }
  } finally { w.cleanup(); }
});

/* ═══ L8 · THE PAIR STRUCTURE ═════════════════════════════════════════════════════════════════════════════════════════════ */

test("F07A3 · L8 · a malformed, duplicate or dangling pair structure is REFUSED before the claim, named by code only — CONTROL: the well-formed set claims and scores", () => {
  const cases = [
    ["an id without a pair", [...ITEMS.slice(0, 9), `loose${NONCE}`], "PAIR_STRUCTURE_MALFORMED"],
    ["a re-pair of a different candidate", [...ITEMS.slice(0, 9), `${n(6)}>${c(6)}|${M(5)}`], "PAIR_STRUCTURE_MALFORMED"],
    ["a re-pair with its own need", [...ITEMS.slice(0, 9), `${n(5)}>${c(5)}|${M(5)}`], "PAIR_DUPLICATE"],
    ["a re-pair duplicating a matched pair", [...ITEMS, `${n(2)}>${c(1)}`], "PAIR_DUPLICATE"],
    ["a re-pair whose matched partner is absent", [...ITEMS.filter((i) => i !== M(5)), `${n(5)}>${c(9)}`], "PAIR_DANGLING"],
  ];
  for (const [why, items, code] of cases) {
    assert.deepEqual(parsePairStructure(items), { fault: code }, `${why}: the parser did not name ${code}`);
    const rows = items.map((i) => JSON.stringify({ item: i, classes: [] })).join("\n") + "\n";
    const w = world("G", { items, keyText: rows });
    try {
      const a = frozenAudit();
      const outs = new Map(items.map((i) => [i, NO]));
      assert.throws(() => score(a, w, grantFor(a, w), { outputs: outs }), { code }, `${why}: expected ${code}`);
      assert.deepEqual([events(a, LINKED_ACTIONS.CLAIMED).length, released(a).length], [0, 0], `${why}: a bad pair structure spent the run or released a result`);
      assert.ok(!JSON.stringify(a.store.events).includes(NONCE), `${why}: the refusal echoed an id`);
    } finally { w.cleanup(); }
  }
  assert.equal(parsePairStructure(ITEMS).links.length, 5, "CONTROL: the well-formed set's five re-pairs were not linked");
});

/* ═══ L10 · PREFLIGHT BEFORE THE CLAIM ════════════════════════════════════════════════════════════════════════════════════ */

test("F07A3 · L10 · an INCOMPLETE key is REFUSED before the claim and the run stays UNSPENT — CONTROL: a complete key claims", () => {
  const partial = KEY_ROWS.slice(0, 9).map((r) => JSON.stringify(r)).join("\n") + "\n";
  const w = world("S", { keyText: partial });
  try {
    const a = frozenAudit();
    assert.throws(() => score(a, w, grantFor(a, w)), { code: "INPUT_MISSING" }, "an incomplete key was scored");
    assert.deepEqual([events(a, LINKED_ACTIONS.CLAIMED).length, events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "REFUSED").length], [0, 1], "an incomplete key SPENT the run, or was not refused");
  } finally { w.cleanup(); }
  const ok = world("S");
  try {
    const a = frozenAudit();
    score(a, ok, grantFor(a, ok));
    assert.equal(events(a, LINKED_ACTIONS.CLAIMED).length, 1, "CONTROL: the complete key did not claim");
  } finally { ok.cleanup(); }
});

test("F07A3 · L10 · a key changed after the grant is REFUSED and the SAME combination is still unspent: restored, the same grant claims once and scores", () => {
  const w = world("G");
  try {
    const a = frozenAudit();
    const g = grantFor(a, w);
    const path = join(w.keyBase, w.keyRel);
    fs.writeFileSync(path, KEY_TEXT.replace(JSON.stringify(KEY_ROWS[0]), JSON.stringify({ item: M(1), classes: N })));
    assert.throws(() => score(a, w, g), { code: "KEY_CHANGED_SINCE_GRANT" });
    assert.equal(events(a, LINKED_ACTIONS.CLAIMED).length, 0, "a changed key spent the run");
    fs.writeFileSync(path, KEY_TEXT);
    assert.deepEqual(score(a, w, g).tables, EXPECTED.tables, "the restored key could not score — the refused request had consumed the run");
    assert.deepEqual([events(a, LINKED_ACTIONS.CLAIMED).length, released(a).length], [1, 1]);
    assert.throws(() => score(a, w, g), { code: "SCORING_ALREADY_CLAIMED" }, "CONTROL: the once-only run could run twice");
  } finally { w.cleanup(); }
});

test("F07A3 · L10 · a MISSING output still INVALIDATES the claimed run in a paired protocol — it is never a NO and never an ABSTAIN", () => {
  const w = world("G");
  try {
    const a = frozenAudit();
    const outs = OUTPUTS(); outs.delete(R(3));
    assert.throws(() => score(a, w, grantFor(a, w), { outputs: outs }), { code: "INPUT_MISSING" });
    assert.deepEqual([events(a, LINKED_ACTIONS.CLAIMED).length, events(a, EVALUATION_ACTIONS.SCORED).filter((e) => e.outcome === "INVALID").length, released(a).length], [1, 1, 0]);
  } finally { w.cleanup(); }
});

/* ═══ L5 · THE CEILING ════════════════════════════════════════════════════════════════════════════════════════════════════ */

test("F07A3 · L5 · a paired protocol carries at most SEVEN tokens, and names one of its own classes — CONTROL: seven tokens claim", () => {
  const w = world("G");
  try {
    const toks = (k) => Array.from({ length: k - 1 }, (_, i) => `X${i}`);
    for (const [why, protocol] of [
      ["eight tokens", { classes: ["LIKELY"], exclusions: ["SKIP", ...toks(7)], paired: { cls: "LIKELY" } }],
      ["a class the protocol does not declare", { ...PROTOCOL, paired: { cls: "OTHER" } }],
      ["an extra paired field", { ...PROTOCOL, paired: { cls: "LIKELY", partner: "x" } }],
      ["a paired value that is not an object", { ...PROTOCOL, paired: "LIKELY" }],
    ]) {
      const a = frozenAudit();
      assert.throws(() => score(a, w, grantFor(a, w), { protocol }), { code: "PROTOCOL_INVALID" }, `${why} was accepted`);
      assert.equal(events(a, LINKED_ACTIONS.CLAIMED).length, 0, `${why}: the run was spent`);
    }
    assert.equal(MAX_PAIRED_PROTOCOL_TOKENS, 7);
    const a = frozenAudit();
    const seven = { classes: ["LIKELY"], exclusions: ["SKIP", ...toks(6)], paired: { cls: "LIKELY" } };
    const r = score(a, w, grantFor(a, w), { protocol: seven });
    assert.equal(r.discordantPairs, 3, "CONTROL: a seven-token paired protocol did not score");
    assert.ok(Object.keys(released(a)[0].metadata).length <= 24, "a seven-token paired release exceeds the metadata ceiling");
  } finally { w.cleanup(); }
});

/* ═══ Residue and the production trail ═══════════════════════════════════════════════════════════════════════════════════ */

test("F07A3 · residue: every constructed tree and store is removed", () => {
  const inTree = fs.existsSync(join(REPO, ".test-scratch")) ? fs.readdirSync(join(REPO, ".test-scratch")).filter((x) => x.startsWith("f07a3-")) : [];
  const inTmp = fs.readdirSync(os.tmpdir()).filter((x) => x.startsWith("f07a3-store-"));
  assert.deepEqual([inTree, inTmp], [[], []]);
});

test("F07A3 · the production audit trail is byte-identical after every proof in this file", () => {
  assert.deepEqual(prodHashes(), PROD_BEFORE);
});
