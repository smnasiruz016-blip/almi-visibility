/**
 * F16 · THE SOURCE-ADAPTER BOUNDARY (RR-118; eligibility record _handoffs 2a4ef7d).
 *
 * Every write goes through the PRODUCTION entry point (bin/source-intake.mjs) inside a CONFINED world, for TWO UNRELATED products (a
 * garden-irrigation business and a ceramics studio) through the SAME code. The source declarations here are SYNTHETIC — their "verified"
 * citations are fixture text that drives the boundary, never a claim about any real provider. No reported figure comes from a fixture.
 * Nothing is fetched; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { admitSource, recordsFrom, sampleLines, SOURCE_KINDS, VERIFIED, NOT_VERIFIED, KEYWORD_SIGNAL } from "../src/research/source-adapter.mjs";
import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { intakeQuestions, COMPLETENESS_CLAIM, NOT_MEASURED, RECORD_TYPE } from "../src/research/public-questions.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT, inputPathRef } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-source-${process.pid}`);
const PATH = ["src/research/source-adapter.mjs", "bin/source-intake.mjs"];

const IRRIGATION = { subject: "riverside-irrigation", origin: "https://riverside-irrigation.invalid", batch: "riverside-irrigation-research", tenant: FIXTURE_TENANT };
const CERAMICS = { subject: "hilltop-ceramics", origin: "https://hilltop-ceramics.invalid", batch: "hilltop-ceramics-research", tenant: SECOND_FIXTURE_TENANT };

const terms = (status = VERIFIED) => Object.fromEntries(["storage", "attribution", "licence"].map((t) => [t, { status, citation: status === VERIFIED ? `fixture citation for ${t} — synthetic, for a test` : null }]));
const QSOURCE = { sourceId: "fixture-forum", kind: SOURCE_KINDS.QUESTION_SOURCE, terms: terms() };
const KSOURCE = { sourceId: "fixture-keywords", kind: SOURCE_KINDS.KEYWORD_SOURCE, terms: terms() };
const q = (n, over = {}) => ({ wording: `Fixture question number ${n}?`, wordingOrigin: "SOURCE_TEXT", sourceUrl: `https://forum.invalid/q/${n}`, postVersion: "1", licenceName: "fixture-licence", licenceVersion: "1.0", attribution: "fixture author, via the fixture forum", observedAt: "2026-10-01T09:00:00Z", country: NOT_MEASURED, language: "en", ...over });
const k = (n, over = {}) => ({ idea: `fixture idea ${n}`, licenceName: "fixture-licence", licenceVersion: "1.0", attribution: "fixture keyword source", observedAt: "2026-10-01T09:00:00Z", country: "XX", language: "en", ...over });
const retrieval = (items, topic = "a fixture topic") => ({ topic, coverageLimits: "one fixture retrieval, first page only", items });
const ctx = { subject: "subj", origin: "https://subj.invalid" };

/* ================= admission ================= */

test("§4 · FIRING CONTROL: a source is admitted only when storage, attribution and licence are each VERIFIED from a primary source with a citation", () => {
  assert.equal(admitSource(QSOURCE).admitted, true);
  for (const t of ["storage", "attribution", "licence"]) {
    const unverified = { ...QSOURCE, terms: { ...QSOURCE.terms, [t]: { status: NOT_VERIFIED, citation: null } } };
    assert.deepEqual(admitSource(unverified).refusals, [`${t.toUpperCase()}_TERM_NOT_VERIFIED`], `${t} NOT VERIFIED was admitted`);
    const uncited = { ...QSOURCE, terms: { ...QSOURCE.terms, [t]: { status: VERIFIED, citation: " " } } };
    assert.deepEqual(admitSource(uncited).refusals, [`${t.toUpperCase()}_TERM_HAS_NO_CITATION`], `${t} without a citation was admitted`);
  }
  assert.ok(admitSource({ ...QSOURCE, kind: "SNIPPETS" }).refusals.includes("SOURCE_KIND_UNKNOWN"));
  const blocked = recordsFrom({ ...QSOURCE, terms: terms(NOT_VERIFIED) }, retrieval([q(1)]), ctx);
  assert.deepEqual([blocked.admitted, blocked.records.length], [false, 0], "a refused source's records were kept");
});

/* ================= every field, the snippet rule ================= */

test("§4 · FIRING CONTROL: a missing required field REFUSES the item; a snippet is never the author's wording", () => {
  for (const f of ["wording", "sourceUrl", "postVersion", "licenceName", "licenceVersion", "attribution", "observedAt", "country", "language"]) {
    const r = recordsFrom(QSOURCE, retrieval([q(1, { [f]: "" })]), ctx);
    assert.equal(r.records.length, 0, `${f} missing, yet kept`);
    assert.equal(r.refused[`${f.toUpperCase()}_ABSENT`], 1, `${f} missing, refused for another reason`);
  }
  const snip = recordsFrom(QSOURCE, retrieval([q(1, { wordingOrigin: "SNIPPET" })]), ctx);
  assert.deepEqual([snip.records.length, snip.refused.SNIPPET_IS_NOT_THE_AUTHORS_WORDING], [0, 1], "a snippet was stored as an author's wording");
  assert.equal(recordsFrom(QSOURCE, { ...retrieval([q(1)]), coverageLimits: "" }, ctx).refused.COVERAGE_LIMITS_ABSENT, 1);
  assert.equal(recordsFrom(QSOURCE, { ...retrieval([q(1)]), topic: "" }, ctx).refused.TOPIC_ABSENT, 1);
  assert.equal(recordsFrom(QSOURCE, retrieval([q(1)]), { subject: "subj", origin: null }).refused.SUBJECT_HAS_NO_DECLARED_SITE_ORIGIN, 1);
  assert.equal(recordsFrom(QSOURCE, retrieval([q(1, { observedAt: "last week" })]), ctx).refused.OBSERVEDAT_NOT_A_TIME, 1);
  const kept = recordsFrom(QSOURCE, retrieval([q(1)]), ctx).records[0].value;
  assert.deepEqual([kept.original, kept.reference, kept.postVersion, kept.licence.version, kept.attribution, kept.topic, kept.limits].map(Boolean), Array(7).fill(true));
});

/* ================= two kinds, never merged ================= */

test("§4 · FIRING CONTROL: a keyword idea is a SEPARATE type with its own evidence state — never a question, never totalled with one", () => {
  const qs = recordsFrom(QSOURCE, retrieval([q(1), q(2)]), ctx).records;
  const ks = recordsFrom(KSOURCE, retrieval([k(1), k(2), k(3)]), ctx).records;
  assert.ok(qs.every((r) => r.record_type === RECORD_TYPE && r.value.kind === "OBSERVED"));
  assert.ok(ks.every((r) => r.record_type === KEYWORD_SIGNAL && !("original" in r.value)), "a keyword idea was shaped as a question");
  assert.deepEqual([evidenceStateOf(qs[0]).state, evidenceStateOf(ks[0]).state], ["OBSERVED", "INFERRED"]);
  const f16 = intakeQuestions([...qs, ...ks]);
  assert.equal(f16.population, 2, "keyword ideas were counted as questions people asked");
  assert.match(sampleLines(KSOURCE, recordsFrom(KSOURCE, retrieval([k(1)]), ctx)).join(" "), /keyword signals \(generated ideas, never questions\): kept 1 of 1/);
});

/* ================= empty is empty; NOT MEASURED is not 0 ================= */

test("§5 · FIRING CONTROL: an empty retrieval is an honest EMPTY sample (0 of 0); no retrieval is NOT MEASURED — never one for the other", () => {
  const empty = recordsFrom(QSOURCE, retrieval([]), ctx);
  assert.deepEqual([empty.retrieved, empty.records.length], [0, 0]);
  const el = sampleLines(QSOURCE, empty);
  assert.match(el.join(" "), /EMPTY SAMPLE — 0 of 0 item\(s\) retrieved: no question is invented, no keyword idea stands in/);
  assert.doesNotMatch(el.join(" "), /NOT MEASURED/, "an empty retrieval was reported NOT MEASURED");
  const none = recordsFrom(QSOURCE, null, ctx);
  assert.equal(none.retrieved, NOT_MEASURED);
  const nl = sampleLines(QSOURCE, none);
  assert.match(nl.join(" "), /retrieved: NOT MEASURED — no retrieval was supplied/);
  assert.doesNotMatch(nl.join(" "), /\b0 of 0\b|EMPTY SAMPLE/, "NOT MEASURED was reported as 0");
  for (const l of [...el, ...nl]) assert.doesNotMatch(l, COMPLETENESS_CLAIM);
  assert.ok(el[0].startsWith("SAMPLE — ") && nl[0].startsWith("SAMPLE — "));
});

/* ================= two unrelated products, the production path ================= */

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
function input(W, name, tenant, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: tenant });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}
const intake = (W, c, src, ret, batch = c.batch, subject = c.subject) => spawnSync(process.execPath, ["bin/source-intake.mjs", `--tenant=${c.tenant}`, `--actor=${W.actor}`, `--subject=${subject}`, `--research-batch=${batch}`, `--source=${src}`, `--retrieval=${ret}`, "--confirm"], { cwd: REPO, encoding: "utf8", env: W.envWith() });
const stored = (W, batch, file) => { const p = join(W.root, "research", batch, file); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };

test("§6 · TWO UNRELATED PRODUCTS, ONE CODE PATH: each keeps its own questions and keyword signals apart, reads only its own, and every cross reach is refused", () => {
  const W = declaredWorld({ secondTenantOrigins: [CERAMICS.origin] });
  try {
    declareClient(W, IRRIGATION);
    declareClient(W, CERAMICS);
    const qa = input(W, "qa.json", IRRIGATION.tenant, QSOURCE), ra = input(W, "ra.json", IRRIGATION.tenant, retrieval([q(1), q(2), q(3, { wordingOrigin: "SNIPPET" })], "drip irrigation for small gardens"));
    const ka = input(W, "ka.json", IRRIGATION.tenant, KSOURCE), rka = input(W, "rka.json", IRRIGATION.tenant, retrieval([k(1), k(2)], "drip irrigation for small gardens"));
    const qb = input(W, "qb.json", CERAMICS.tenant, QSOURCE), rb = input(W, "rb.json", CERAMICS.tenant, retrieval([q(9)], "beginner pottery classes"));
    const a1 = intake(W, IRRIGATION, qa, ra), a2 = intake(W, IRRIGATION, ka, rka), b1 = intake(W, CERAMICS, qb, rb);
    for (const r of [a1, a2, b1]) assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(a1.stdout, /questions people wrote: kept 2 of 3 retrieved/);
    assert.match(a1.stdout, /SNIPPET_IS_NOT_THE_AUTHORS_WORDING 1/);
    assert.match(a2.stdout, /keyword signals \(generated ideas, never questions\): kept 2 of 2 retrieved/);
    assert.deepEqual([stored(W, IRRIGATION.batch, "questions.jsonl").length, stored(W, IRRIGATION.batch, "keyword-signals.jsonl").length, stored(W, CERAMICS.batch, "questions.jsonl").length], [2, 2, 1]);
    const env = W.envWith();
    const resolve = createTenantResolver({ env });
    const both = [IRRIGATION.batch, CERAMICS.batch];
    const ra2 = readClientQuestionRecords({ tenantId: IRRIGATION.tenant, resolve, batches: both, env });
    const rb2 = readClientQuestionRecords({ tenantId: CERAMICS.tenant, resolve, batches: both, env });
    assert.deepEqual([ra2.records.length, rb2.records.length], [2, 1], "a product read or counted the other's questions, or a keyword signal was counted as a question");
    const cross = intake(W, IRRIGATION, qa, ra, CERAMICS.batch);
    assert.notEqual(cross.status, 0, "one product wrote into the other's batch");
    assert.match(cross.stdout + cross.stderr, /TENANT SCOPE REFUSED/);
    assert.notEqual(intake(W, IRRIGATION, qa, ra, IRRIGATION.batch, CERAMICS.subject).status, 0, "one product wrote under the other's subject");
    assert.equal(stored(W, CERAMICS.batch, "questions.jsonl").length, 1, "the other product's batch changed");
    for (const r of [a1, a2, b1]) { assert.doesNotMatch(r.stdout, COMPLETENESS_CLAIM); assert.doesNotMatch(r.stdout, /https?:\/\/|Fixture question/, "a report printed a URL or a wording"); }
  } finally { W.cleanup(); }
});

test("§4 · THE PRODUCTION PATH REFUSES an unverified source — nothing it returns is kept", () => {
  const W = declaredWorld({ secondTenantOrigins: [CERAMICS.origin] });
  try {
    declareClient(W, IRRIGATION);
    const src = input(W, "unverified.json", IRRIGATION.tenant, { ...QSOURCE, terms: terms(NOT_VERIFIED) });
    const ret = input(W, "ret.json", IRRIGATION.tenant, retrieval([q(1)]));
    const r = intake(W, IRRIGATION, src, ret);
    assert.equal(r.status, 3, r.stdout + r.stderr);
    assert.match(r.stdout, /source REFUSED — STORAGE_TERM_NOT_VERIFIED · ATTRIBUTION_TERM_NOT_VERIFIED · LICENCE_TERM_NOT_VERIFIED — nothing it returns may be kept/);
    assert.equal(stored(W, IRRIGATION.batch, "questions.jsonl").length, 0);
  } finally { W.cleanup(); }
});

test("§5 · FIRING CONTROL: a TEST_PILOT batch stamps every kept record and the output carries the marking; an undeclared purpose is refused", () => {
  const W = declaredWorld({ secondTenantOrigins: [CERAMICS.origin] });
  try {
    declareClient(W, IRRIGATION);
    writeFileSync(join(W.root, "research", IRRIGATION.batch, "batch.json"), JSON.stringify({ purpose: "TEST_PILOT" }));
    const src = input(W, "pq.json", IRRIGATION.tenant, QSOURCE), ret = input(W, "pr.json", IRRIGATION.tenant, retrieval([q(1)]));
    const r = intake(W, IRRIGATION, src, ret);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /TEST \/ PILOT DATA — this batch is declared TEST_PILOT/);
    assert.equal(stored(W, IRRIGATION.batch, "questions.jsonl")[0].value.dataPurpose, "TEST_PILOT", "the marking is not in the data itself");
    writeFileSync(join(W.root, "research", IRRIGATION.batch, "batch.json"), JSON.stringify({ purpose: "PRODUCTION" }));
    const u = intake(W, IRRIGATION, src, ret);
    assert.equal(u.status, 3);
    assert.match(u.stderr, /BATCH_PURPOSE_UNDECLARED/);
  } finally { W.cleanup(); }
});

test("§7 · FIRING CONTROL: when the governed commit FAILS (an uncommitted outcome, without throwing), nothing is reported KEPT", () => {
  const W = declaredWorld({ secondTenantOrigins: [CERAMICS.origin] });
  let target = null;
  try {
    declareClient(W, IRRIGATION);
    target = join(W.root, "research", IRRIGATION.batch, "questions.jsonl");
    writeFileSync(target, "");
    chmodSync(target, 0o444);
    const src = input(W, "lq.json", IRRIGATION.tenant, QSOURCE), ret = input(W, "lr.json", IRRIGATION.tenant, retrieval([q(1)]));
    const r = intake(W, IRRIGATION, src, ret);
    assert.notEqual(r.status, 0, "a failed commit exited as a success");
    assert.doesNotMatch(r.stdout, /KEPT/, "KEPT was printed although the commit did not happen");
    assert.match(r.stderr, /(FAILED_BEFORE_COMMIT|RECOVERY_REQUIRED) — 1 public_question record\(s\) did NOT persist; 0 kept before it/);
    chmodSync(target, 0o666);
    assert.equal(readFileSync(target, "utf8"), "", "a record persisted through a failed commit");
  } finally { if (target && existsSync(target)) chmodSync(target, 0o666); W.cleanup(); }
});

/* ================= neutrality, sealed, network ================= */

test("§4 · FIRING CONTROL: the boundary names no product and no provider — and the controls fire when one is planted", () => {
  const PROVIDERS = /stack\s?exchange|stackoverflow|\bbrave\b|google|custom search|keyword planner|\bads\b|bing|serp/i;
  for (const f of PATH) {
    const t = readFileSync(join(REPO, f), "utf8");
    assert.deepEqual(scanSource(t).code, [], `${f} names a product`);
    assert.doesNotMatch(t, PROVIDERS, `${f} names a provider`);
  }
  assert.ok(scanSource(`${readFileSync(join(REPO, PATH[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0, "the product scanner did not fire");
  assert.match(`${readFileSync(join(REPO, PATH[0]), "utf8")}\nconst P = "stackexchange";\n`, PROVIDERS, "the provider control did not fire");
});

test("§4 · FIRING CONTROL: the boundary reaches no sealed store, no held-out module and no network — and the controls fire", () => {
  const read = (f) => (existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null);
  const forbidden = (rd) => decisionCallPaths({ entries: [PATH[0]], read: rd }).modules.filter((m) => /sealed-store-roots|sealed-paths|synthetic-sealed-fixture|config\/evidence-roles|src\/heldout\/|intent-clusters/.test(m) || /evidence\.jsonl|runs\/evidence/.test(rd(m) ?? ""));
  assert.deepEqual(forbidden(read), []);
  assert.ok(forbidden((f) => (f === PATH[0] ? `${read(f)}\nimport "../governance/sealed-store-roots.mjs";\n` : read(f))).length > 0);
  assert.deepEqual(decisionCallPaths({ entries: [PATH[0]] }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: [PATH[0]], read: (f) => (f === PATH[0] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the test's own temporary inputs are removed, and none was ever inside the repository", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(existsSync(TMP), false);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
