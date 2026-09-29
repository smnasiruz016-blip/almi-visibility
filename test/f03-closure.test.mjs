/**
 * 🔴 F03 CLOSURE — the two lawful board movements, their audit record, and the portability rows, on the closure tree.
 *
 *   Command: _handoffs 62347c6 (AlmiVisibility_CC_COMMAND_2026-09-25_F03_CLOSE.md) · evidence: _handoffs 511d808.
 *
 * F03 moved UNASSESSED → IN-PROGRESS → VERIFIED-PASS, never in one jump, each movement carrying the F-board's own event
 * kind and an explicit reason code (owner ruling 29ef6d74…, §12: no historical changeKind vocabulary), the frozen
 * acceptance's hashes, merged engine #157, data #13 and #11, and exact-SHA main CI 36102818055.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { DECLARED } from "../config/fboard/f-board.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { declaredSubjectIds, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { availableProductSubjects } from "../src/subject-roots.mjs";
import { decideForTenant } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const MERGED = "04912681a009d37e48621637356c5bd2383c6416";
const DATA = ["997cc99fdf0d3f7ceff1702682cc18a96b200a82", "f321b2b133355a9e5f4c88f007713e199f62b646"];
const CI_RUN = "36102818055";
const EVIDENCE_SHA = "8774d8b85c94054882cd90d3853150010f5e2fc21db3f7260dacff62764426ba";
/** The outcome digest exact-SHA main CI 36102818055 printed (F03-R7-FINGERPRINT), over 105 rows. */
const CI_OUTCOME_DIGEST = "8996b167e0089133";

/** The two-movement law, as a function the control can hand a stand-in row. */
function twoMovementFaults(row) {
  const f = [];
  const moves = row.events.filter((e) => e.from !== undefined);
  const [m1, m2] = moves;
  if (moves.length !== 2) f.push(`expected exactly two movements, found ${moves.length}`);
  if (!(m1?.kind === "IMPLEMENTATION" && m1.from === "UNASSESSED" && m1.to === "IN-PROGRESS" && m1.reason === "ACCEPTANCE_FROZEN_AND_IMPLEMENTATION_MEASURED")) f.push("movement 1 is not UNASSESSED → IN-PROGRESS · ACCEPTANCE_FROZEN_AND_IMPLEMENTATION_MEASURED");
  if (!(m2?.kind === "VERIFIED" && m2.from === "IN-PROGRESS" && m2.to === "VERIFIED-PASS" && m2.reason === "RETEST_PASSED_ON_MERGED_MAIN" && m2.population === "REAL")) f.push("movement 2 is not IN-PROGRESS → VERIFIED-PASS · RETEST_PASSED_ON_MERGED_MAIN · REAL");
  if (row.events.findIndex((e) => e.kind === "ACCEPTANCE_FROZEN") !== 0) f.push("the freeze record does not come first");
  for (const m of moves) {
    if (m.acceptanceUnchanged?.ruling !== ACCEPTANCES.F03.ruling.sha256 || m.acceptanceUnchanged?.contract !== ACCEPTANCES.F03.contractSha256) f.push(`${m.kind} does not reference the frozen acceptance's hashes`);
    if (m.mergedSha !== MERGED || JSON.stringify(m.dataMergedShas) !== JSON.stringify(DATA) || m.ciRun !== CI_RUN || m.ciConclusion !== "success" || m.pullRequest !== 157) f.push(`${m.kind} does not reference the merged SHAs, PR and CI run`);
    if (Object.hasOwn(m, "changeKind")) f.push(`${m.kind} carries the historical changeKind vocabulary (owner ruling 29ef6d74, §12)`);
  }
  if (m2 && m2.evidenceRecord?.sha256 !== EVIDENCE_SHA) f.push("movement 2 does not name its evidence record by hash");
  return f;
}

test("F03 · CLOSE · 1 · two lawful movements, in order, each naming the acceptance, the merged SHAs and the CI run — never a jump", () => {
  const row = DECLARED.F03;
  assert.equal(row.state, "VERIFIED-PASS");
  assert.deepEqual(twoMovementFaults(row), []);
  // CONTROL: a row that JUMPS (the VERIFIED movement alone, from UNASSESSED) is caught by the same function
  const jump = { ...row, events: [row.events[0], { ...row.events[2], from: "UNASSESSED" }] };
  assert.ok(twoMovementFaults(jump).length >= 2, "a jump from UNASSESSED straight to VERIFIED-PASS was not caught");
  // CONTROL: a movement carrying changeKind is caught
  assert.ok(twoMovementFaults({ ...row, events: [row.events[0], row.events[1], { ...row.events[2], changeKind: "work" }] }).some((x) => /changeKind/.test(x)));
});

test("F03 · CLOSE · 2 · both movements (and the freeze record) are in the production trail as BOARD_TRANSITION events carrying their references", () => {
  const events = productionAuditStore({ repo: REPO }).readAll().events.filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F03");
  assert.deepEqual(events.map((e) => `${e.action}:${e.metadata.from}->${e.metadata.to}`), ["ACCEPTANCE_FROZEN:->", "IMPLEMENTATION:UNASSESSED->IN-PROGRESS", "VERIFIED:IN-PROGRESS->VERIFIED-PASS"]);
  for (const e of events.slice(1)) assert.deepEqual([e.metadata.pullRequest, e.metadata.mergedSha, e.metadata.ciRun, e.metadata.ciConclusion], ["157", MERGED, CI_RUN, "success"]);
  assert.equal(events[2].metadata.evidenceRecordSha256, EVIDENCE_SHA);
  assert.equal(events[2].metadata.population, "REAL");
  // CONTROL: the same filter finds another closed row's transitions — the three above are not an empty filter talking
  assert.ok(productionAuditStore({ repo: REPO }).readAll().events.filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F02").length >= 2);
});

test("F03 · CLOSE · 3 · the board validates clean, and every other named row is unchanged", () => {
  const b = buildBoard(CAPABILITIES, DECLARED);
  assert.deepEqual(boardErrors(b, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } }), []);
  const state = (id) => b.find((r) => r.featureId === id).state;
  for (const id of ["F01", "F02", "F03", "F05", "F06", "F08"]) assert.equal(state(id), "VERIFIED-PASS", id);
  assert.equal(state("F07"), "IN-PROGRESS", "F07 reopened 28 Sep (test/f07-closure.test.mjs owns it)");
  assert.equal(state("F40"), "BLOCKED-BY-AUTHORITY");
  assert.equal(state("F79"), "VERIFIED-PASS", "F79 moved 29 Sep 2026 under its own acceptance (RR-93, _handoffs f34f3af) — test/f79-evidence-cache.test.mjs owns it");
  const p = progress(b);
  assert.equal(p.passed, b.filter((r) => r.state === "VERIFIED-PASS").length);
  assert.equal(p.passed, 22); /* F79 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance f34f3af) — the board reads 22/90 */ /* F48 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 8d03429) — the board reads 21/90 */ /* F82 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 25c7f49) — the board reads 20/90 */ /* F43 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-91, acceptance 6c7627a) — the board reads 19/90 */ /* F41 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 454396e) — the board reads 18/90 */ /* F39 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-90, acceptance 90e798d) — the board reads 17/90 */ /* F32 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance a0b9776) — the board reads 16/90 */ /* F35 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-88, acceptance da659bd) — the board reads 15/90 */ /* F36 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 2635153) — the board reads 14/90 */ /* F21 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-86, acceptance 804ebd1) — the board reads 13/90 */ /* F31 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-85, acceptance 3a8f7ba) — the board reads 12/90 */ /* F33 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-84, acceptance 9dc9bc2) — the board reads 11/90 */ /* F34 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-83, acceptance 53f74b4) — the board reads 10/90 */ /* F77 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-82, Amendment 1 b443e5e) — the board reads 9/90 */ // F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, _handoffs be583fa) - the board reads 8/89. F09 moved to VERIFIED-PASS on 25 Sep 2026 (close-out 2601cb3), measured on its closure tree. measured on the closure tree after the two movements were written — never predicted. F04 moved to VERIFIED-PASS on 25 Sep 2026 under its Amendment 1 (test/f04-amendment-zero-population.test.mjs owns that movement).
});

test("F03 · CLOSE · R7 rows · every portability outcome row, printed, reproduces the digest exact-SHA main CI recorded", (t) => {
  const r = createTenantResolver();
  /* 🔴 F09 (25 Sep 2026) added one tenant and one site-only subject. This pin records what exact-SHA main CI measured for the
   * F03-ERA population, so it is still computed over exactly that population — selected STRUCTURALLY, never by name: the
   * tenants declared before 25 September, and the subjects that carry a product module. It must reproduce the CI digest
   * unchanged: F09's onboarding changed none of the existing outcomes. The whole current population is reported beside it. */
  const allTenants = r.declarations.tenants.filter((x) => x.status === "ACTIVE");
  const tenants = allTenants.filter((x) => String(x.declaredOn) < "2026-09-25").map((x) => x.tenantId);
  const productSubjects = new Set(availableProductSubjects());
  const rows = [];
  let wholeRows = 0;
  for (const id of declaredSubjectIds(r.roots)) wholeRows += allTenants.length * (1 + lookupSubject(r.roots, id).entry.connectors.length);
  t.diagnostic(`F03-R7-WHOLE-POPULATION rows ${wholeRows} · subjects ${declaredSubjectIds(r.roots).length} · tenants ${allTenants.length}`);
  for (const id of declaredSubjectIds(r.roots).filter((x) => productSubjects.has(x))) {
    for (const tn of tenants) rows.push(`${id}|${tn}|SUBJECT|${decideForTenant(r, tn, RESOURCES.subject(id)).outcome}`);
    for (const c of lookupSubject(r.roots, id).entry.connectors) for (const tn of tenants) rows.push(`${id}|${tn}|${c.kind}|${decideForTenant(r, tn, RESOURCES.connector(id, c.kind)).outcome}`);
  }
  rows.sort();
  // printed with the tenant shortened to a digest — the row identity, never a list of every tenant's id in a log
  for (const row of rows) { const [s, tn, k, o] = row.split("|"); t.diagnostic(`F03-R7-ROW ${s} | ${createHash("sha256").update(tn).digest("hex").slice(0, 10)} | ${k} | ${o}`); }
  const digest = createHash("sha256").update(rows.join("\n")).digest("hex").slice(0, 16);
  t.diagnostic(`F03-R7-ROWS ${rows.length} · digest ${digest}`);
  assert.equal(rows.length, 105);
  assert.equal(digest, CI_OUTCOME_DIGEST, "the outcomes here differ from the ones exact-SHA main CI recorded");
});
