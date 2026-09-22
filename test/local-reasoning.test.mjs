/**
 * 🔴 ROW 4 — LOCAL REASONING. THE THIRD STATE MUST FAIL.
 *
 * Phrasing is researched from owned query rows; reasoning from public primary sources, read in a browser and stored in
 * the source's own words. These tests hold the judge to the owner's letters exactly as committed (A–M, _handoffs
 * a732a07): finding nothing is K or D — never A or B; a hang is M — never G; cross-tenant evidence is H — never UNKNOWN
 * and never a pass; a supported difference justifies CONTENT and never a URL.
 *
 * Fixtures here are CONTROLS. The real evidence is the batch in the declared external root, judged at the bottom.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { localizedThinking, ROW3_STORED } from "../src/discovery/localized-thinking.mjs";
import {
  judgeReasoning, goalTenancy, row4Verdict, withEvidenceClasses, tallyReasoning, reasoningRecordErrors, readReasoningBatch,
  OUTCOMES, SEPARATE_URL, READ_METHOD, REFUSALS,
} from "../src/discovery/local-reasoning.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { HARD_CODED_PATTERNS } from "../config/discovery/axis-candidates.mjs";
import { countryUrlCensus, reachesDecisionPaths } from "../tools/country-url-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T1 = "tenant:11111111111111111111111111111111";
const T2 = "tenant:22222222222222222222222222222222";
const LIMB_A_ZERO = { construction: 0, acceptance: 0, recommendation: 0 };

/* ── CONTROLS: a neutral declared vocabulary, no real product, no real place ── */
const row = (country, impressions = 1) => ({ country, impressions, source: { observation_id: "fixture", row: 0 } });
const sameWording = (goal, wording, countries) => ({ goal, kind: "SAME_WORDING", wordings: [{ original: wording, countries: countries.map((c) => row(c)) }], links: [] });
const differentWording = (goal, byWording, links = []) => ({ goal, kind: "DIFFERENT_WORDING", wordings: Object.entries(byWording).map(([w, cs]) => ({ original: w, countries: cs.map((c) => row(c)) })), links });
const tenancyOf = (goals, tenantId = T1) => new Map(goals.map((g) => [g.goal, { state: "RESOLVED", tenantId }]));

let seq = 0;
function rec({ wordings, locality, holds = true, claim = "the declared authority permits the activity in this locality", tenantId = T1, readState = "READ", evidenceClass = "FIXTURE", usefulContent = "SUPPORTED", separateUrl = SEPARATE_URL, drop = [], source = {} }) {
  seq += 1;
  const r = {
    record_type: "observation",
    observation_id: `fixture-${seq}`,
    method: READ_METHOD,
    value: {
      goal: { wordings },
      locality,
      tenantId,
      evidenceClass,
      reasoning: {
        readState,
        source: { url: "https://authority.invalid/rules", authority: "a declared test authority", tier: "PRIMARY_OFFICIAL", sourceDate: "not stated", retrievedOn: "2031-01-01", readMethod: "BROWSER_RENDERED_TEXT", ...source },
        propositions: [{ url: "https://authority.invalid/rules", text: "The activity is permitted where the register lists a post." }],
        finding: { claim, holds },
        derivation: "DIRECT",
        explains: "a constraint on the goal in this locality",
      },
      usefulContent: { difference: usefulContent, basis: "control" },
      separateUrl,
    },
  };
  for (const path of drop) {
    const parts = path.split(".");
    let o = r;
    for (const p of parts.slice(0, -1)) o = o[p];
    delete o[parts.at(-1)];
  }
  return r;
}
const judge = (goals, records, tenancy = tenancyOf(goals)) => withEvidenceClasses(judgeReasoning({ goals, records, tenancy }), records);
const outcomeOf = (j, goal) => j.groups.find((g) => g.goal === goal).outcome;

/* ═════════ THE THREE-WORLD PROOFS ═════════ */

test("1 · wording differs, reasoning positively evidenced as THE SAME → B — and never B on nothing", () => {
  const g = differentWording("X1", { "alpha form": ["p1"], "beta form": ["p2"] });
  const w = ["alpha form", "beta form"];
  assert.equal(outcomeOf(judge([g], [rec({ wordings: w, locality: "p1" }), rec({ wordings: w, locality: "p2" })]), "X1"), "B");
  assert.equal(outcomeOf(judge([g], []), "X1"), "D", "finding nothing is D, never B");
});

test("2 · wording differs, reasoning evidenced as materially DIFFERENT → C", () => {
  const g = differentWording("X2", { "alpha form": ["p1"], "beta form": ["p2"] });
  const w = ["alpha form", "beta form"];
  const j = judge([g], [rec({ wordings: w, locality: "p1", holds: true }), rec({ wordings: w, locality: "p2", holds: false })]);
  assert.equal(outcomeOf(j, "X2"), "C");
  assert.equal(j.groups[0].reasonCode, "DIFFERENT_REASON_EVIDENCED");
});

test("3 · wording differs, reasoning unavailable → D (UNKNOWN), and one locality evidenced is still D, never C", () => {
  const g = differentWording("X3", { "alpha form": ["p1"], "beta form": ["p2"] });
  const j = judge([g], [rec({ wordings: ["alpha form", "beta form"], locality: "p1" })]);
  assert.equal(outcomeOf(j, "X3"), "D");
  assert.deepEqual(j.groups[0].members.map((m) => m.state), ["EVALUATED", "UNKNOWN"]);
});

test("4 · country differs but nothing justifies separate content → E, and the URL is never recommended", () => {
  const g = sameWording("X4", "shared form", ["p1", "p2"]);
  const j = judge([g], [rec({ wordings: ["shared form"], locality: "p1", holds: true, usefulContent: "NOT_SUPPORTED" }), rec({ wordings: ["shared form"], locality: "p2", holds: false, usefulContent: "NOT_SUPPORTED" })]);
  assert.equal(outcomeOf(j, "X4"), "J");
  assert.equal(j.groups[0].urlAxis, "E");
  assert.equal(j.groups[0].separateUrl, "NOT_RECOMMENDED");
});

test("5 · a supported difference justifies different CONTENT (F) — and still NOT a separate URL; a record asking for one is refused", () => {
  const g = sameWording("X5", "shared form", ["p1", "p2"]);
  const j = judge([g], [rec({ wordings: ["shared form"], locality: "p1", holds: true }), rec({ wordings: ["shared form"], locality: "p2", holds: false })]);
  assert.equal(j.groups[0].urlAxis, "F");
  assert.equal(j.groups[0].separateUrl, "NOT_RECOMMENDED");
  const asks = rec({ wordings: ["shared form"], locality: "p1", separateUrl: "RECOMMENDED" });
  assert.ok(reasoningRecordErrors(asks).some((e) => e.code === REFUSALS.URL_REQUESTED));
});

test("6 · cross-tenant evidence → H, INVALID — never UNKNOWN, never a pass", () => {
  const g = sameWording("X6", "shared form", ["p1", "p2"]);
  const recs = [rec({ wordings: ["shared form"], locality: "p1", tenantId: T2, evidenceClass: "REAL" }), rec({ wordings: ["shared form"], locality: "p2", tenantId: T2, holds: false, evidenceClass: "REAL" })];
  const j = judge([g], recs);
  assert.equal(outcomeOf(j, "X6"), "H");
  assert.equal(j.groups[0].reasonCode, "INVALID_CROSS_TENANT");
  assert.ok(j.groups[0].members.every((m) => m.state === "INVALID"));
  assert.equal(row4Verdict({ judged: j, limbA: LIMB_A_ZERO }).verdict, "NOT_PASS");
  // and a goal whose own scope is undeclared is H too — tenancy is declared, never assumed
  const undeclared = judge([g], recs.map((r) => ({ ...r, value: { ...r.value, tenantId: T1 } })), new Map([["X6", { state: "UNDECLARED", tenantId: null }]]));
  assert.equal(outcomeOf(undeclared, "X6"), "H");
});

test("7 · two lawful sources conflict in one locality → I, CONFLICTING — both kept, no silent pick", () => {
  const g = sameWording("X7", "shared form", ["p1", "p2"]);
  const j = judge([g], [
    rec({ wordings: ["shared form"], locality: "p1", holds: true }),
    rec({ wordings: ["shared form"], locality: "p1", holds: false, source: { url: "https://second-authority.invalid/rules" } }),
    rec({ wordings: ["shared form"], locality: "p2", holds: true }),
  ]);
  assert.equal(outcomeOf(j, "X7"), "I");
  const p1 = j.groups[0].members.find((m) => m.locality === "p1");
  assert.equal(p1.state, "INVALID");
  assert.equal(p1.reasoning.length, 2, "both readings are reported");
});

test("8 · source removed → refused (NO_SOURCE), the member is INVALID, and no PASS", () => {
  const g = sameWording("X8", "shared form", ["p1", "p2"]);
  const recs = [rec({ wordings: ["shared form"], locality: "p1", evidenceClass: "REAL", drop: ["value.reasoning.source"] }), rec({ wordings: ["shared form"], locality: "p2", holds: false, evidenceClass: "REAL" })];
  const j = judge([g], recs);
  assert.ok(j.refused[0].errors.some((e) => e.code === REFUSALS.NO_SOURCE));
  assert.notEqual(outcomeOf(j, "X8"), "J");
  assert.equal(row4Verdict({ judged: j, limbA: LIMB_A_ZERO }).verdict, "NOT_PASS");
});

test("9 · provenance removed → refused (NO_PROVENANCE), and no PASS", () => {
  const g = sameWording("X9", "shared form", ["p1", "p2"]);
  for (const drop of ["value.reasoning.source.authority", "value.reasoning.source.retrievedOn", "value.reasoning.source.tier", "value.reasoning.source.readMethod", "value.reasoning.propositions"]) {
    const recs = [rec({ wordings: ["shared form"], locality: "p1", evidenceClass: "REAL", drop: [drop] }), rec({ wordings: ["shared form"], locality: "p2", holds: false, evidenceClass: "REAL" })];
    const j = judge([g], recs);
    assert.ok(j.refused.length === 1 && j.refused[0].errors.some((e) => e.code === REFUSALS.NO_PROVENANCE), drop);
    assert.equal(row4Verdict({ judged: j, limbA: LIMB_A_ZERO }).verdict, "NOT_PASS", drop);
  }
});

test("10 · query wording presented as its own reasoning source → refused (WORDING_AS_REASON)", () => {
  const g = sameWording("X10", "shared form", ["p1", "p2"]);
  const asProposition = rec({ wordings: ["shared form"], locality: "p1" });
  asProposition.value.reasoning.propositions = [{ url: "https://authority.invalid/rules", text: "shared form" }];
  const asSource = rec({ wordings: ["shared form"], locality: "p1", source: { method: "gsc.searchAnalytics.query:country-query" } });
  const j = judge([g], [asProposition, asSource]);
  assert.equal(j.refused.length, 2);
  assert.ok(j.refused.every((x) => x.errors.some((e) => e.code === REFUSALS.WORDING_AS_REASON)));
});

test("11 · a fixture-only population is never a real-evidence PASS — and untagged evidence counts as nothing", () => {
  const g = sameWording("X11", "shared form", ["p1", "p2"]);
  const recs = [rec({ wordings: ["shared form"], locality: "p1" }), rec({ wordings: ["shared form"], locality: "p2", holds: false })];
  const j = judge([g], recs);
  assert.equal(outcomeOf(j, "X11"), "J", "the control reaches J…");
  const v = row4Verdict({ judged: j, limbA: LIMB_A_ZERO });
  assert.equal(v.verdict, "NOT_PASS", "…and still earns nothing, because it is a fixture");
  assert.ok(v.reasons.some((r) => r.code === "NO_COMPLETE_REAL_GROUP"));
  const untagged = judgeReasoning({ goals: [g], records: recs.map((r) => ({ ...r, value: { ...r.value, evidenceClass: "REAL" } })), tenancy: tenancyOf([g]) });
  assert.equal(row4Verdict({ judged: untagged, limbA: LIMB_A_ZERO }).verdict, "NOT_PASS", "evidence classes never applied → nothing counts");
  const real = judge([g], recs.map((r) => ({ ...r, value: { ...r.value, evidenceClass: "REAL" } })));
  assert.equal(row4Verdict({ judged: real, limbA: LIMB_A_ZERO }).verdict, "PASS", "the same shape tagged REAL passes — the fixture flag is what refused it");
});

test("12 · a path that constructs, accepts or recommends by country is caught by the limb (a) guard", () => {
  const SOURCES = new Map([["src/discovery/local-reasoning.mjs", 'export const x = 1;\n'], ["bin/localized-thinking.mjs", 'import { x } from "../src/discovery/local-reasoning.mjs";\n']]);
  const built = new Map([...SOURCES, ["bin/country-pages.mjs", 'import { judgeReasoning } from "../src/discovery/local-reasoning.mjs";\nconst country = "p1";\nconst path = `/${country}/guide`;\n']]);
  assert.ok(countryUrlCensus(built).breaches.some((b) => b.file === "bin/country-pages.mjs"), "construction");
  const accepts = new Map([...SOURCES, ["src/discovery/local-reasoning.mjs", 'import { constructCandidates } from "../page/construct.mjs";\n']]);
  assert.ok(reachesDecisionPaths(accepts, ["src/discovery/local-reasoning.mjs"]).hits.length > 0, "acceptance");
  const recommends = new Map([...SOURCES, ["src/discovery/local-reasoning.mjs", 'import { verdictOf } from "./axis-discovery.mjs";\n']]);
  assert.ok(reachesDecisionPaths(recommends, ["src/discovery/local-reasoning.mjs"]).hits.length > 0, "recommendation");
  assert.equal(row4Verdict({ judged: { groups: [], refused: [], orphans: [] }, limbA: { construction: 1, acceptance: 0, recommendation: 0 } }).reasons.some((r) => r.code === "LIMB_A_NOT_PROVED_NOT_MET"), true);
});

/* ═════════ THE SAME-WORDING ROUTE (owner decision, 21 Sep 2026) ═════════ */

test("🔴 SAME WORDING, reasoning UNKNOWN stays K — never A, never J; one locality evidenced is still K", () => {
  const g = sameWording("S1", "shared form", ["p1", "p2", "p3"]);
  assert.equal(outcomeOf(judge([g], []), "S1"), "K");
  assert.equal(outcomeOf(judge([g], [rec({ wordings: ["shared form"], locality: "p1" })]), "S1"), "K");
});

test("🔴 SAME WORDING, reasoning supported and different reaches J; the same reason positively evidenced is A", () => {
  const g = sameWording("S2", "shared form", ["p1", "p2"]);
  assert.equal(outcomeOf(judge([g], [rec({ wordings: ["shared form"], locality: "p1", holds: true }), rec({ wordings: ["shared form"], locality: "p2", holds: false })]), "S2"), "J");
  assert.equal(outcomeOf(judge([g], [rec({ wordings: ["shared form"], locality: "p1" }), rec({ wordings: ["shared form"], locality: "p2" })]), "S2"), "A");
});

test("🔴 M IS NOT G: a hang is NOT_READ (M); a refusal is G; neither is ever a finding", () => {
  const g = sameWording("S3", "shared form", ["p1", "p2"]);
  const hang = judge([g], [rec({ wordings: ["shared form"], locality: "p1", readState: "NOT_READ" }), rec({ wordings: ["shared form"], locality: "p2", readState: "NOT_READ" })]);
  assert.equal(outcomeOf(hang, "S3"), "M");
  assert.ok(hang.groups[0].members.every((m) => m.state === "UNKNOWN"));
  const refusal = judge([g], [rec({ wordings: ["shared form"], locality: "p1", readState: "REFUSED" }), rec({ wordings: ["shared form"], locality: "p2", readState: "REFUSED" })]);
  assert.equal(outcomeOf(refusal, "S3"), "G");
  const oneHung = judge([g], [rec({ wordings: ["shared form"], locality: "p1", readState: "NOT_READ" })]);
  assert.equal(outcomeOf(oneHung, "S3"), "K", "one hung locality among untried ones is not M");
});

test("🔴 L: wording that varies WITHIN a locality, and singular/plural alone (owner clause 4), are not local phrasing", () => {
  const within = differentWording("L1", { "alpha form": ["p1", "p2"], "alpha forms": ["p1", "p3"] });
  assert.equal(outcomeOf(judge([within], []), "L1"), "L");
  const plural = differentWording("L2", { "alpha form": ["p1"], "alpha forms": ["p2"] }, [{ a: "alpha form", b: "alpha forms", relation: "VARIANT", form: "plural" }]);
  const j = judge([plural], [rec({ wordings: ["alpha form", "alpha forms"], locality: "p1", holds: true }), rec({ wordings: ["alpha form", "alpha forms"], locality: "p2", holds: false })]);
  assert.equal(outcomeOf(j, "L2"), "L", "even with records, plural-only variation is not locality-attributable");
  assert.equal(j.groups[0].reasonCode, "PLURAL_ONLY_NOT_LOCALITY_ATTRIBUTABLE");
  assert.ok(j.groups[0].members.every((m) => m.state === "NOT_APPLICABLE"));
});

test("🔴 THE LETTERS ARE THE OWNER'S, UNCHANGED — A carries the POSITIVELY EVIDENCED guard", () => {
  assert.deepEqual(Object.keys(OUTCOMES), ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"]);
  assert.match(OUTCOMES.A, /POSITIVELY EVIDENCED/);
  assert.match(OUTCOMES.B, /POSITIVELY EVIDENCED/);
  assert.equal(OUTCOMES.J, "SAME WORDING · DIFFERENT SUPPORTED REASON");
  assert.equal(OUTCOMES.K, "SAME WORDING · REASON UNKNOWN");
});

test("🔴 MISSING and MALFORMED fields are refused, one refusal each — no default reads a record softer", () => {
  const base = { wordings: ["shared form"], locality: "p1" };
  for (const drop of ["value.locality", "value.tenantId", "value.evidenceClass", "value.goal", "value.reasoning.finding", "value.reasoning.derivation", "value.reasoning.explains", "value.usefulContent"]) {
    assert.ok(reasoningRecordErrors(rec({ ...base, drop: [drop] })).length > 0, drop);
  }
  const malformed = rec(base);
  malformed.method = "something.else";
  assert.ok(reasoningRecordErrors(malformed).some((e) => e.code === REFUSALS.MALFORMED_FIELD));
  const secondary = rec({ ...base, source: { tier: "SECONDARY" } });
  assert.ok(reasoningRecordErrors(secondary).some((e) => e.code === REFUSALS.NO_PROVENANCE), "a secondary source never stands in a record");
});

test("🔴 GOAL TENANCY is resolved by the shared declared-host partition — unmapped, undeclared and ambiguous all refuse", () => {
  const goals = [sameWording("T1", "one", ["p1", "p2"]), sameWording("T2", "two", ["p1", "p2"]), sameWording("T3", "three", ["p1", "p2"]), sameWording("T4", "four", ["p1", "p2"])];
  const rows = [
    { query: "one", url: "https://a.invalid/x" },
    { query: "two", url: "https://b.invalid/x" },
    { query: "three", url: "https://a.invalid/y" }, { query: "three", url: "https://c.invalid/y" },
  ];
  const resolve = ({ resourceRef }) => ({ "https://a.invalid": { state: "RESOLVED", tenantId: T1 }, "https://c.invalid": { state: "RESOLVED", tenantId: T2 } }[resourceRef] ?? { state: "UNDECLARED", tenantId: null });
  const t = goalTenancy({ goals, queryPageRows: rows, resolve });
  assert.deepEqual(["T1", "T2", "T3", "T4"].map((k) => t.get(k).state), ["RESOLVED", "UNDECLARED", "AMBIGUOUS", "UNMAPPED"]);
  assert.equal(t.get("T1").tenantId, T1);
  assert.throws(() => goalTenancy({ goals, queryPageRows: rows }), /resolver is required/);
});

test("🔴 ARITHMETIC — every group in one letter, every member in one state, remainder zero", () => {
  const goals = [sameWording("A1", "one", ["p1", "p2"]), differentWording("A2", { "x a": ["p1"], "x b": ["p2"] }), differentWording("A3", { "y a": ["p1", "p2"], "y b": ["p1"] })];
  const t = tallyReasoning(judge(goals, [rec({ wordings: ["one"], locality: "p1" }), rec({ wordings: ["one"], locality: "p2", holds: false })]));
  assert.equal(t.groupRemainder, 0);
  assert.equal(t.memberRemainder, 0);
  assert.deepEqual([t.letters.J, t.letters.D, t.letters.L], [1, 1, 1]);
});

test("🔴 THE BATCH REFUSES RATHER THAN SHORTENS — absent, tampered and miscounted batches all throw, by name", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { createHash } = await import("node:crypto");
  const { SUBJECT_ROOTS_ENV } = await import("../src/subject-roots.mjs");
  const root = mkdtempSync(join(tmpdir(), "reasoning-batch-"));
  try {
    const env = { [SUBJECT_ROOTS_ENV]: root };
    assert.throws(() => readReasoningBatch({ batchId: "capture-0001", env }), /REASONING_BATCH_UNAVAILABLE/);
    const dir = join(root, "research", "capture-0001");
    mkdirSync(dir, { recursive: true });
    const text = `${JSON.stringify({ record_type: "observation", observation_id: "a" })}\n`;
    const sha = createHash("sha256").update(text, "utf8").digest("hex");
    writeFileSync(join(dir, "records.jsonl"), text, "utf8");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ files: [{ name: "records.jsonl", sha256: sha }], recordCounts: { "records.jsonl": 1 } }), "utf8");
    assert.equal(readReasoningBatch({ batchId: "capture-0001", env }).records.length, 1, "control: the intact batch reads");
    writeFileSync(join(dir, "records.jsonl"), `${text}${text}`, "utf8");
    assert.throws(() => readReasoningBatch({ batchId: "capture-0001", env }), /REASONING_BATCH_INVALID: records\.jsonl hashes/);
    writeFileSync(join(dir, "records.jsonl"), text, "utf8");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ files: [{ name: "records.jsonl", sha256: sha }], recordCounts: { "records.jsonl": 2 } }), "utf8");
    assert.throws(() => readReasoningBatch({ batchId: "capture-0001", env }), /REASONING_BATCH_INVALID: 1 records/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ═════════ THE REAL EVIDENCE — the declared external batch, through the production path ═════════ */

test("🟢 REAL — the declared batch is read by its manifest hash, and the production path judges G13 J on six READ primary-source records", () => {
  const store = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  const row3 = JSON.parse(readFileSync(join(REPO, ...ROW3_STORED.split("/")), "utf8"));
  const result = localizedThinking({ storeRecords: store, row3, estatePatterns: HARD_CODED_PATTERNS });
  const qp = store.find((o) => o.observation_id === "c97334fdd102df8e");
  const tenancy = goalTenancy({ goals: result.goals, queryPageRows: qp.value.rows, resolve: createTenantResolver() });
  assert.equal([...tenancy.values()].filter((x) => x.state === "RESOLVED").length, 37, "37 of 37 goals resolve to one declared tenant");
  const batch = readReasoningBatch();
  assert.equal(batch.sha256, batch.manifest.files[0].sha256);
  assert.equal(batch.records.length, 6);
  assert.ok(batch.records.every((r) => r.value.evidenceClass === "REAL"));
  const judged = withEvidenceClasses(judgeReasoning({ goals: result.goals, records: batch.records, tenancy }), batch.records);
  // 🔴 22 Sep 2026: G13's wording belongs to a retired held-out population and may not appear in test source — the group is selected by its six localities, never by its wording
  const g13 = judged.groups.find((g) => JSON.stringify(g.members.map((m) => m.locality)) === JSON.stringify(["gha", "ind", "kor", "nga", "nzl", "usa"]));
  assert.equal(g13.outcome, "J");
  assert.equal(g13.urlAxis, "F");
  assert.equal(g13.separateUrl, "NOT_RECOMMENDED");
  assert.deepEqual(g13.members.map((m) => [m.locality, m.rows, m.impressions, m.state]), [["gha", 1, 1, "EVALUATED"], ["ind", 1, 1, "EVALUATED"], ["kor", 1, 1, "EVALUATED"], ["nga", 1, 1, "EVALUATED"], ["nzl", 1, 2, "EVALUATED"], ["usa", 1, 1, "EVALUATED"]]);
  assert.deepEqual(g13.members.map((m) => m.reasoning[0].holds), [false, false, true, false, false, true]);
  const t = tallyReasoning(judged);
  assert.deepEqual([t.groups, t.letters.D, t.letters.J, t.letters.K, t.letters.L, t.groupRemainder], [37, 2, 1, 24, 10, 0]);
  assert.deepEqual([t.memberTotal, t.members.EVALUATED, t.members.UNKNOWN, t.members.NOT_APPLICABLE, t.members.INVALID, t.memberRemainder], [95, 6, 63, 26, 0, 0]);
  assert.deepEqual([judged.refused.length, judged.orphans.length], [0, 0]);
});

test("🟢 REAL — limb (a) on row 4's own path is 0 across all three verbs, and the verdict over the real batch is PASS on G13 alone", () => {
  const walk = (dir, rel) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : n.endsWith(".mjs") ? [`${rel}${n}`] : []));
  const read = (files) => files.map((f) => [f, readFileSync(join(REPO, f), "utf8")]);
  const SOURCES = new Map(read([...walk(join(REPO, "src"), "src/"), ...walk(join(REPO, "bin"), "bin/")]));
  const GRAPH = new Map([...SOURCES, ...read(walk(join(REPO, "config"), "config/")), ...read(walk(join(REPO, "tools"), "tools/"))]);
  const census = countryUrlCensus(SOURCES);
  assert.deepEqual(census.consumers, ["bin/localized-thinking.mjs", "src/discovery/local-reasoning.mjs", "src/discovery/localized-thinking.mjs"]);
  assert.deepEqual(census.breaches, [], census.breaches.map((b) => `${b.file}:${b.line} ${b.shape}`).join("\n"));
  const decisions = reachesDecisionPaths(GRAPH, ["src/discovery/localized-thinking.mjs", "src/discovery/local-reasoning.mjs", "bin/localized-thinking.mjs"]);
  assert.deepEqual(decisions.hits, []);
  assert.deepEqual(decisions.unread, []);
  const store = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
  const row3 = JSON.parse(readFileSync(join(REPO, ...ROW3_STORED.split("/")), "utf8"));
  const result = localizedThinking({ storeRecords: store, row3, estatePatterns: HARD_CODED_PATTERNS });
  const tenancy = goalTenancy({ goals: result.goals, queryPageRows: store.find((o) => o.observation_id === "c97334fdd102df8e").value.rows, resolve: createTenantResolver() });
  const batch = readReasoningBatch();
  const judged = withEvidenceClasses(judgeReasoning({ goals: result.goals, records: batch.records, tenancy }), batch.records);
  const v = row4Verdict({ judged, limbA: { construction: census.breaches.length, acceptance: decisions.hits.length, recommendation: decisions.hits.length } });
  assert.equal(v.verdict, "PASS", JSON.stringify(v.reasons));
  assert.deepEqual(v.completeGroups, [judged.groups.find((g) => JSON.stringify(g.members.map((m) => m.locality)) === JSON.stringify(["gha", "ind", "kor", "nga", "nzl", "usa"])).goal]);
});
