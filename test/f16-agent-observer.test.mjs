/**
 * F16 · WHO LOOKED — the PERSON and AGENT observer routes (RR-125; correction _handoffs eff72f9).
 *
 * Two unrelated synthetic clients (a garden-centre and a piano tuner) write through the PRODUCTION entry point
 * (bin/observe-question.mjs) in a CONFINED world and are read through the F16 reader. Every question, reference and role is synthetic;
 * no reported figure comes from a fixture. Nothing is fetched; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { validateSubmission, REQUIRED, SUBMITTABLE_OBSERVERS } from "../src/research/human-observation.mjs";
import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { intakeOne, intakeQuestions, reportLines, assertObserverSplit, OBSERVER_TYPES, NOT_AN_OBSERVATION, NOT_MEASURED, RECORD_TYPE } from "../src/research/public-questions.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { recordsFrom, SOURCE_KINDS, VERIFIED } from "../src/research/source-adapter.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT, inputPathRef } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-agent-${process.pid}`);

const GARDEN = { subject: "meadow-garden-centre", origin: "https://meadow-garden.invalid", batch: "meadow-garden-questions", tenant: FIXTURE_TENANT };
const PIANO = { subject: "keyline-piano-tuning", origin: "https://keyline-piano.invalid", batch: "keyline-piano-questions", tenant: SECOND_FIXTURE_TENANT };

const seen = (c, n, observerType, over = {}) => ({ category: "RESEARCHER_OBSERVATION", subject: c.subject, wording: `Synthetic observed question ${n}?`,
  source: "a public discussion forum", surface: "forum thread", reference: `https://forum.invalid/t/${n}`, observedAt: "2026-10-01T09:00:00Z",
  country: NOT_MEASURED, language: "en", method: "a directed public search, original page read", limits: "one session, one forum",
  observerRole: observerType === "AGENT_OBSERVED" ? "research agent" : "researcher", observerType, verifiedOn: "ORIGINAL_PAGE", ...over });
const ctx = { origin: "https://subj.invalid" };

/* ================= one bar, two observers ================= */

test("§3 · FIRING CONTROL: AGENT_OBSERVED is NOT a lower bar — the same required fields and the same reviewable reference; only WHO looked differs", () => {
  /* pinned HERE, not read from the code under test — a list taken from the module cannot catch the module dropping a field */
  assert.deepEqual([...REQUIRED.RESEARCHER_OBSERVATION], ["subject", "wording", "source", "surface", "country", "language", "method", "limits", "observerRole", "reference", "observedAt", "observerType", "verifiedOn"]);
  assert.deepEqual([...SUBMITTABLE_OBSERVERS], ["PERSON_OBSERVED", "AGENT_OBSERVED"]);
  assert.ok(validateSubmission(seen(GARDEN, 1, undefined), ctx).refusals.includes("OBSERVERTYPE_ABSENT"), "an observation with no observer type was accepted");
  for (const t of SUBMITTABLE_OBSERVERS) {
    assert.ok(validateSubmission(seen(GARDEN, 1, t), ctx).accepted, `${t} rejected a complete submission`);
    for (const f of REQUIRED.RESEARCHER_OBSERVATION) {
      const r = validateSubmission(seen(GARDEN, 1, t, { [f]: "" }), ctx);
      assert.equal(r.accepted, false, `${t}: missing ${f} was accepted`);
      assert.ok(r.refusals.includes(`${f.toUpperCase()}_ABSENT`), `${t}: missing ${f} refused for another reason`);
    }
    assert.deepEqual(validateSubmission(seen(GARDEN, 1, t, { reference: "seen it somewhere" }), ctx).refusals, ["REFERENCE_NOT_REVIEWABLE"], `${t} took an unreviewable reference`);
  }
  assert.deepEqual(validateSubmission(seen(GARDEN, 1, "SOURCE_ADAPTER_OBSERVED"), ctx).refusals, ["OBSERVER_TYPE_UNKNOWN"], "a hand submission claimed to be a source adapter");
  assert.deepEqual(validateSubmission(seen(GARDEN, 1, "HUMAN"), ctx).refusals, ["OBSERVER_TYPE_UNKNOWN"]);
});

test("§3 · FIRING CONTROL: a search-result LEAD is never an observation, on either route — refused by name", () => {
  for (const t of SUBMITTABLE_OBSERVERS) {
    assert.deepEqual(validateSubmission(seen(GARDEN, 1, t, { verifiedOn: "SEARCH_RESULT" }), ctx).refusals, ["LEAD_NOT_VERIFIED_ON_ORIGINAL_PAGE"], `${t} accepted a lead`);
    assert.ok(validateSubmission(seen(GARDEN, 1, t, { verifiedOn: undefined }), ctx).refusals.includes("VERIFIEDON_ABSENT"));
  }
});

/* ================= never relabelled ================= */

const stamped = (t) => validateSubmission(seen(GARDEN, 7, t), ctx).record;
test("§3 · FIRING CONTROL: an agent record can NEVER surface as PERSON_OBSERVED — a relabelling either way is malformed, never counted", () => {
  const agent = stamped("AGENT_OBSERVED"), person = stamped("PERSON_OBSERVED");
  assert.deepEqual([agent.value.provenance.observerType, agent.value.provenance.seenBy], ["AGENT_OBSERVED", OBSERVER_TYPES.AGENT_OBSERVED]);
  assert.deepEqual([person.value.provenance.observerType, person.value.provenance.seenBy], ["PERSON_OBSERVED", OBSERVER_TYPES.PERSON_OBSERVED]);
  const relabel = (r, observerType, seenBy) => ({ ...r, value: { ...r.value, provenance: { ...r.value.provenance, observerType, seenBy } } });
  const forged = [
    relabel(agent, "PERSON_OBSERVED", OBSERVER_TYPES.AGENT_OBSERVED),   // an agent's record whose type was edited to person
    relabel(agent, "AGENT_OBSERVED", OBSERVER_TYPES.PERSON_OBSERVED),   // an agent's record whose label was edited to person
    relabel(person, "AGENT_OBSERVED", OBSERVER_TYPES.PERSON_OBSERVED),  // a person relabelled as an agent
    relabel(agent, undefined, undefined),                               // an observation with no observer at all
  ];
  for (const f of forged) assert.equal(intakeOne(f).kind, null, "a relabelled or unattributed observation was accepted");
  const r = intakeQuestions([agent, person, ...forged]);
  assert.deepEqual([r.observerSplit.PERSON_OBSERVED, r.observerSplit.AGENT_OBSERVED, r.malformed], [1, 1, 4], "a forged record was counted as an observer type");
  assert.ok(reportLines(r, { limits: "fixture" }).some((l) => /OBSERVED: 2 of 6 .*by observer: PERSON_OBSERVED 1 · AGENT_OBSERVED 1 · SOURCE_ADAPTER_OBSERVED 0/.test(l)));
});

test("§3 · a source adapter's record counts under its OWN observer type, never as a person or an agent", () => {
  const decl = { sourceId: "fixture-forum", kind: SOURCE_KINDS.QUESTION_SOURCE, terms: Object.fromEntries(["storage", "attribution", "licence"].map((t) => [t, { status: VERIFIED, citation: "fixture clause — synthetic", retrievedOn: "2026-10-01" }])) };
  const item = { wording: "Synthetic adapter question?", wordingOrigin: "SOURCE_TEXT", sourceUrl: "https://forum.invalid/q/9", postVersion: "1", licenceName: "fixture", licenceVersion: "1", attribution: "fixture", observedAt: "2026-10-01T09:00:00Z", country: NOT_MEASURED, language: "en" };
  const recs = recordsFrom(decl, { topic: "t", coverageLimits: "one fixture", items: [item] }, { subject: "s", origin: "https://s.invalid", relevance: { profileId: "p", subject: "s", confirms: ["synthetic adapter question"] } }).records;
  const r = intakeQuestions(recs);
  assert.deepEqual([r.malformed, r.observerSplit.SOURCE_ADAPTER_OBSERVED, r.observerSplit.PERSON_OBSERVED, r.observerSplit.AGENT_OBSERVED], [0, 1, 0, 0]);
});

test("§3 · CLIENT_CLAIM and INFERRED stay their own types — never an observer, never in the observed split", () => {
  const claim = validateSubmission({ ...seen(GARDEN, 2, "PERSON_OBSERVED"), category: "CLIENT_CLAIM", recordedAt: "2026-10-01T09:00:00Z" }, ctx).record;
  const inferred = validateSubmission({ ...seen(GARDEN, 3, "AGENT_OBSERVED"), category: "INFERRED_SUGGESTION", basis: "our derivation", recordedAt: "2026-10-01T09:00:00Z" }, ctx).record;
  for (const r of [claim, inferred]) assert.deepEqual([r.value.provenance.observerType, r.value.provenance.seenBy], [NOT_AN_OBSERVATION, null]);
  const r = intakeQuestions([claim, inferred]);
  assert.deepEqual([r.lists.CLIENT_CLAIM.length, r.lists.INFERRED.length, r.lists.OBSERVED.length, Object.values(r.observerSplit).reduce((a, n) => a + n, 0)], [1, 1, 0, 0]);
});

/* ================= the split is never hidden ================= */

test("§3 · FIRING CONTROL: a report that counts OBSERVED without the split by observer type THROWS", () => {
  assert.throws(() => assertObserverSplit(["OBSERVED: 3 of 3 recorded question(s)"]), { code: "COMBINED_OBSERVED_COUNT_WITHOUT_SPLIT" });
  assert.throws(() => assertObserverSplit(["accepted by kind: OBSERVED 3 · INFERRED 0"]), { code: "COMBINED_OBSERVED_COUNT_WITHOUT_SPLIT" });
  assert.throws(() => assertObserverSplit(["OBSERVED: 3 — by observer: PERSON_OBSERVED 2 · AGENT_OBSERVED 1"]), { code: "COMBINED_OBSERVED_COUNT_WITHOUT_SPLIT" }, "a split missing one observer type passed");
  assert.doesNotThrow(() => assertObserverSplit(["OBSERVED: 3 — by observer: PERSON_OBSERVED 2 · AGENT_OBSERVED 1 · SOURCE_ADAPTER_OBSERVED 0", "INFERRED: 0"]));
  assert.ok(reportLines(intakeQuestions([]), { limits: "fixture" }).some((l) => /OBSERVED: 0 of 0 .*PERSON_OBSERVED 0 · AGENT_OBSERVED 0 · SOURCE_ADAPTER_OBSERVED 0/.test(l)));
  /* the report itself refuses a result whose split is missing — e.g. one built before observer types existed */
  assert.throws(() => reportLines({ ...intakeQuestions([]), observerSplit: {} }, { limits: "fixture" }), { code: "COMBINED_OBSERVED_COUNT_WITHOUT_SPLIT" });
});

/* ================= source and time window ================= */

test("§4 · FIRING CONTROL: source and time window are required at intake; a stored record without them reads NOT MEASURED, named", () => {
  for (const t of SUBMITTABLE_OBSERVERS) {
    assert.ok(validateSubmission(seen(GARDEN, 1, t, { source: "" }), ctx).refusals.includes("SOURCE_ABSENT"));
    assert.ok(validateSubmission(seen(GARDEN, 1, t, { observedAt: "" }), ctx).refusals.includes("OBSERVEDAT_ABSENT"));
  }
  const r = stamped("AGENT_OBSERVED");
  const gap = intakeOne({ ...r, value: { ...r.value, source: "", timeWindow: {} } });
  assert.deepEqual([gap.fields.source, gap.fields.timeWindow, gap.notMeasured.includes("source"), gap.notMeasured.includes("timeWindow")], [NOT_MEASURED, NOT_MEASURED, true, true]);
  const lines = reportLines(intakeQuestions([{ ...r, value: { ...r.value, source: "" } }]), { limits: "fixture" });
  assert.ok(lines.some((l) => /fields not captured \(NOT MEASURED\): source 1 of 1/.test(l)), "a missing source was not named");
});

/* ================= the production path, two clients ================= */

function declareClient(W, c) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  reg.subjects.push({ subjectId: c.subject, path: c.subject, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: c.batch }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: c.origin }] }] });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  mkdirSync(join(W.root, c.subject), { recursive: true });
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  for (const [kind, ref] of [["RESEARCH_BATCH", c.batch], ["SITE_ORIGIN", c.origin]]) {
    const a = att.attachments.find((x) => x.resourceKind === kind && x.resourceRef === ref);
    if (a) a.tenantId = c.tenant; else att.attachments.push({ ...att.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: c.tenant });
  }
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  mkdirSync(join(W.root, "research", c.batch), { recursive: true });
}
function submission(W, name, tenant, rows) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(rows));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: tenant });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}
const write = (W, c, file, batch = c.batch) => spawnSync(process.execPath, ["bin/observe-question.mjs", `--tenant=${c.tenant}`, `--actor=${W.actor}`, `--subject=${c.subject}`, `--research-batch=${batch}`, `--submission=${file}`, "--confirm"], { cwd: REPO, encoding: "utf8", env: W.envWith() });
const stored = (W, batch) => { const p = join(W.root, "research", batch, "questions.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };

test("§4 · BOTH ROUTES, THE PRODUCTION PATH, TWO CLIENTS: each keeps its observer type, reads only its own, shows the split, and every cross reach is refused", () => {
  const W = declaredWorld({ secondTenantOrigins: [PIANO.origin] });
  try {
    declareClient(W, GARDEN);
    declareClient(W, PIANO);
    const fg = submission(W, "garden.json", GARDEN.tenant, [seen(GARDEN, 1, "PERSON_OBSERVED"), seen(GARDEN, 2, "AGENT_OBSERVED"), seen(GARDEN, 3, "AGENT_OBSERVED"), seen(GARDEN, 4, "AGENT_OBSERVED", { verifiedOn: "SEARCH_RESULT" })]);
    const fp = submission(W, "piano.json", PIANO.tenant, [seen(PIANO, 5, "AGENT_OBSERVED")]);
    const a = write(W, GARDEN, fg), b = write(W, PIANO, fp);
    for (const x of [a, b]) assert.equal(x.status, 0, x.stdout + x.stderr);
    assert.match(a.stdout, /accepted by kind: OBSERVED 3 \(by observer: PERSON_OBSERVED 1 · AGENT_OBSERVED 2 · SOURCE_ADAPTER_OBSERVED 0\)/);
    assert.match(a.stdout, /LEAD_NOT_VERIFIED_ON_ORIGINAL_PAGE 1/);
    assert.match(a.stdout, /KEPT 3 of 4/);
    assert.doesNotMatch(a.stdout + b.stdout, /a person saw each observation/, "the output still claims every observer was a person");
    assert.deepEqual(stored(W, GARDEN.batch).map((r) => r.value.provenance.observerType).sort(), ["AGENT_OBSERVED", "AGENT_OBSERVED", "PERSON_OBSERVED"]);
    const env = W.envWith();
    const resolve = createTenantResolver({ env });
    const both = [GARDEN.batch, PIANO.batch];
    const g = intakeQuestions(readClientQuestionRecords({ tenantId: GARDEN.tenant, resolve, batches: both, env }).records);
    const p = intakeQuestions(readClientQuestionRecords({ tenantId: PIANO.tenant, resolve, batches: both, env }).records);
    assert.deepEqual([g.observerSplit.PERSON_OBSERVED, g.observerSplit.AGENT_OBSERVED, p.observerSplit.PERSON_OBSERVED, p.observerSplit.AGENT_OBSERVED], [1, 2, 0, 1], "one client's observations were read, counted or reported under another");
    const cross = write(W, GARDEN, fg, PIANO.batch);
    assert.notEqual(cross.status, 0, "one client wrote into the other's batch");
    assert.match(cross.stdout + cross.stderr, /TENANT SCOPE REFUSED/);
    assert.equal(stored(W, PIANO.batch).length, 1, "the other client's batch changed");
    assert.doesNotMatch(a.stdout + b.stdout, /Synthetic observed question|https?:\/\//, "a report printed a wording or a reference");
  } finally { W.cleanup(); }
});

test("the test's own temporary inputs are removed", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(existsSync(TMP), false);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
