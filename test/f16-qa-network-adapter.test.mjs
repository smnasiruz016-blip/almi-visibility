/**
 * F16 · THE CONFINED STACK EXCHANGE ADAPTER (RR-120; decision record _handoffs AlmiVisibility_RR-120_STACK_EXCHANGE_DECISION_2026-10-01.md).
 *
 * RECORDED FIXTURES ONLY, and SYNTHETIC: every title, link, name and date below is invented in the declared fixture shape. No provider
 * endpoint is called, and no real post is held. Every write goes through the PRODUCTION entry point (bin/source-intake.mjs --adapter) in a
 * CONFINED world, for TWO UNRELATED products (a home-solar installer and a dog-grooming salon). No reported figure comes from a fixture.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { DECLARATION, retrievalFrom, licenceVersionOf, LICENCE_URL, FIELD_MAP } from "../src/research/adapters/stack-exchange.mjs";
import { recordsFrom, sampleLines, admitSource, SCOPE_DISCLAIMER, VERIFIED } from "../src/research/source-adapter.mjs";
import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { COMPLETENESS_CLAIM, NOT_MEASURED } from "../src/research/public-questions.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT, inputPathRef } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-qa-${process.pid}`);
const ADAPTER_FILES = ["src/research/adapters/stack-exchange.mjs", "src/research/adapters/index.mjs"];

const SOLAR = { subject: "sunfield-solar", origin: "https://sunfield-solar.invalid", batch: "sunfield-solar-research", tenant: FIXTURE_TENANT };
const GROOM = { subject: "tidy-paws-grooming", origin: "https://tidy-paws.invalid", batch: "tidy-paws-research", tenant: SECOND_FIXTURE_TENANT };

const E = (iso) => Date.parse(iso) / 1000;
const post = (id, over = {}) => ({ question_id: id, title: `Synthetic fixture question ${id}?`, link: `https://fixture-qa.invalid/q/${id}`,
  creation_date: E("2021-03-01T10:00:00Z"), last_edit_date: E("2022-01-01T10:00:00Z"), owner: { display_name: `fixture-user-${id}` },
  body: `SYNTHETIC BODY ${id} — never stored`, score: 7, view_count: 100, tags: ["fixture"], ...over });
const recorded = (items, request = { site: "fixture-site", tagged: "fixture-tag", language: "en" }) => ({ recordedAt: "2026-10-01T09:00:00Z", request, response: { items } });
const ctx = { subject: "subj", origin: "https://subj.invalid" };
const run = (items, recheckItems = items, request) => recordsFrom(DECLARATION, retrievalFrom(recorded(items, request), recheckItems === null ? null : recorded(recheckItems)), ctx);

/* ================= the declaration ================= */

test("§3 · the adapter's declaration is admitted only on its quoted, dated clauses — and declares 4.0 alone", () => {
  assert.equal(admitSource(DECLARATION).admitted, true);
  for (const t of ["storage", "attribution", "licence"]) {
    assert.equal(DECLARATION.terms[t].status, VERIFIED);
    assert.equal(DECLARATION.terms[t].retrievedOn, "2026-10-01");
    assert.match(DECLARATION.terms[t].citation, /RR-120_STACK_EXCHANGE_DECISION/);
  }
  assert.deepEqual([...DECLARATION.licenceVersions], ["4.0"]);
  assert.deepEqual(Object.entries(FIELD_MAP).filter(([, f]) => f.status === VERIFIED).map(([k]) => k), ["postedAt"], "a field name was marked verified without a primary source");
});

/* ================= licence versions ================= */

test("§5 · FIRING CONTROL: mixed licence versions in one sample — each post carries its own; 2.5, 3.0 and a straddling post are REFUSED, never defaulted", () => {
  assert.deepEqual([licenceVersionOf(E("2010-06-01")), licenceVersionOf(E("2015-06-01")), licenceVersionOf(E("2019-06-01"))], ["2.5", "3.0", "4.0"]);
  assert.equal(licenceVersionOf(E("2018-05-01T23:59:59Z")), "3.0");
  assert.equal(licenceVersionOf(E("2018-05-02T00:00:00Z")), "4.0");
  assert.equal(licenceVersionOf(E("2017-01-01"), E("2020-01-01")), "3.0", "a straddling post was upgraded to the newer licence");
  const items = [post(1), post(2, { creation_date: E("2015-01-01"), last_edit_date: undefined }), post(3, { creation_date: E("2010-01-01"), last_edit_date: undefined }), post(4, { creation_date: E("2017-01-01"), last_edit_date: E("2020-01-01") })];
  const r = run(items);
  assert.deepEqual([r.records.length, r.retrieved, r.refused.LICENCE_VERSION_OUTSIDE_DECLARED_SET], [1, 4, 3]);
  assert.equal(r.records[0].value.licence.version, "4.0");
  assert.match(sampleLines(DECLARATION, r).join("\n"), /kept 1 of 4 retrieved[\s\S]*LICENCE_VERSION_OUTSIDE_DECLARED_SET 3/);
});

/* ================= attribution ================= */

test("§5 · FIRING CONTROL: missing or incomplete attribution is REFUSED; a kept record carries every element", () => {
  const r = run([post(1, { owner: {} }), post(2, { owner: { display_name: " " } }), post(3, { link: "" })]);
  assert.deepEqual([r.records.length, r.refused.ATTRIBUTION_ABSENT, r.refused.SOURCEURL_ABSENT], [0, 2, 1]);
  const v = run([post(5)]).records[0].value;
  for (const part of ["fixture-user-5", "https://fixture-qa.invalid/q/5", "the Stack Exchange Network", "CC BY-SA 4.0", LICENCE_URL, "unmodified"]) assert.ok(v.attribution.includes(part), `attribution lacks ${part}`);
});

/* ================= currency ================= */

test("§5 · FIRING CONTROL: a post deleted or changed since retrieval is REFUSED; with no recheck, currency is NOT MEASURED and nothing is kept", () => {
  const r = run([post(1), post(2), post(3), post(4)], [post(1), post(3, { title: "Synthetic fixture question 3, edited?" }), post(4, { last_edit_date: E("2026-09-30T00:00:00Z") })]);
  assert.deepEqual([r.records.length, r.refused.POST_DELETED_SINCE_RETRIEVAL, r.refused.POST_CHANGED_SINCE_RETRIEVAL], [1, 1, 2]);
  const none = run([post(1), post(2)], null);
  assert.deepEqual([none.records.length, none.retrieved, none.refused.CURRENCY_NOT_RECHECKED], [0, 2, 2]);
});

/* ================= only the fields F16 needs ================= */

test("§4 · FIRING CONTROL: only the mapped fields leave the adapter, and only the declared fields enter the record — never a body, a score or a whole response", () => {
  const item = retrievalFrom(recorded([post(1)]), recorded([post(1)])).items[0];
  assert.deepEqual(Object.keys(item).sort(), ["attribution", "country", "language", "licenceName", "licenceVersion", "observedAt", "postVersion", "postedAt", "sourceUrl", "wording", "wordingOrigin"]);
  const v = run([post(1)]).records[0].value;
  assert.deepEqual(Object.keys(v).sort(), ["attribution", "country", "dataPurpose", "kind", "language", "licence", "limits", "method", "origin", "original", "postVersion", "postedAt", "provenance", "reference", "source", "sourceId", "subject", "surface", "timeWindow", "topic"]);
  assert.doesNotMatch(JSON.stringify(v), /SYNTHETIC BODY|view_count|"score"/);
  assert.deepEqual([v.original, v.postedAt, v.postVersion, v.country], ["Synthetic fixture question 1?", "2021-03-01T10:00:00Z", "2022-01-01T10:00:00Z", NOT_MEASURED]);
});

/* ================= coverage ================= */

test("§6 · FIRING CONTROL: every output carries the scope disclaimer; an output or a declared coverage implying more than one source's scope THROWS", () => {
  const r = run([post(1)]);
  const lines = sampleLines(DECLARATION, r);
  assert.ok(lines.includes(SCOPE_DISCLAIMER));
  assert.ok(sampleLines(DECLARATION, run([])).includes(SCOPE_DISCLAIMER), "an empty sample lost its scope disclaimer");
  for (const l of lines) assert.doesNotMatch(l, COMPLETENESS_CLAIM);
  assert.match(r.coverage, /one network, one site/);
  const over = recordsFrom(DECLARATION, { ...retrievalFrom(recorded([post(1)]), recorded([post(1)])), coverageLimits: "covers all countries" }, ctx);
  assert.throws(() => sampleLines(DECLARATION, over), { code: "COVERAGE_OVERCLAIM" });
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
const intake = (W, c, ret, recheck, { adapter = "stack-exchange", batch = c.batch } = {}) => spawnSync(process.execPath, ["bin/source-intake.mjs", `--tenant=${c.tenant}`, `--actor=${W.actor}`, `--subject=${c.subject}`, `--research-batch=${batch}`, `--adapter=${adapter}`, `--retrieval=${ret}`, ...(recheck ? [`--recheck=${recheck}`] : []), "--confirm"], { cwd: REPO, encoding: "utf8", env: W.envWith() });
const stored = (W, batch) => { const p = join(W.root, "research", batch, "questions.jsonl"); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };

test("§5 · TWO UNRELATED PRODUCTS, ONE CODE PATH, THE PRODUCTION ENTRY POINT: own records written and read, an empty source is an EMPTY SAMPLE, every cross reach refused", () => {
  const W = declaredWorld({ secondTenantOrigins: [GROOM.origin] });
  try {
    declareClient(W, SOLAR);
    declareClient(W, GROOM);
    const sa = input(W, "sa.json", SOLAR.tenant, recorded([post(1), post(2), post(3, { creation_date: E("2015-01-01"), last_edit_date: undefined })]));
    const sr = input(W, "sr.json", SOLAR.tenant, recorded([post(1), post(2), post(3, { creation_date: E("2015-01-01"), last_edit_date: undefined })]));
    const ga = input(W, "ga.json", GROOM.tenant, recorded([]));
    const gr = input(W, "gr.json", GROOM.tenant, recorded([]));
    const a = intake(W, SOLAR, sa, sr), b = intake(W, GROOM, ga, gr);
    for (const x of [a, b]) assert.equal(x.status, 0, x.stdout + x.stderr);
    assert.match(a.stdout, /questions people wrote: kept 2 of 3 retrieved/);
    assert.match(a.stdout, /LICENCE_VERSION_OUTSIDE_DECLARED_SET 1/);
    assert.match(b.stdout, /EMPTY SAMPLE — 0 of 0 item\(s\) retrieved: no question is invented/);
    for (const x of [a, b]) {
      assert.ok(x.stdout.includes(SCOPE_DISCLAIMER));
      assert.doesNotMatch(x.stdout, COMPLETENESS_CLAIM);
      assert.doesNotMatch(x.stdout, /https?:\/\/|Synthetic fixture question|fixture-user|fixture-site/, "a report printed a URL, a title, a name or a site");
    }
    assert.deepEqual([stored(W, SOLAR.batch).length, stored(W, GROOM.batch).length], [2, 0]);
    const env = W.envWith();
    const resolve = createTenantResolver({ env });
    const both = [SOLAR.batch, GROOM.batch];
    assert.deepEqual([readClientQuestionRecords({ tenantId: SOLAR.tenant, resolve, batches: both, env }).records.length, readClientQuestionRecords({ tenantId: GROOM.tenant, resolve, batches: both, env }).records.length], [2, 0]);
    const cross = intake(W, SOLAR, sa, sr, { batch: GROOM.batch });
    assert.notEqual(cross.status, 0, "one product wrote into the other's batch");
    assert.match(cross.stdout + cross.stderr, /TENANT SCOPE REFUSED/);
    assert.equal(stored(W, GROOM.batch).length, 0, "the other product's batch changed");
    const unknown = intake(W, SOLAR, sa, sr, { adapter: "no-such-adapter" });
    assert.equal(unknown.status, 3);
    assert.match(unknown.stderr, /ADAPTER_UNKNOWN/);
  } finally { W.cleanup(); }
});

/* ================= neutrality, network ================= */

test("§4 · FIRING CONTROL: the adapter names no product, reaches no network and no sealed store — and each control fires", () => {
  const read = (f) => (existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null);
  for (const f of ADAPTER_FILES) assert.deepEqual(scanSource(read(f)).code, [], `${f} names a product`);
  assert.ok(scanSource(`${read(ADAPTER_FILES[0])}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0);
  assert.deepEqual(decisionCallPaths({ entries: ADAPTER_FILES }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: [ADAPTER_FILES[0]], read: (f) => (f === ADAPTER_FILES[0] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  const forbidden = (rd) => decisionCallPaths({ entries: ADAPTER_FILES, read: rd }).modules.filter((m) => /sealed-store-roots|sealed-paths|config\/evidence-roles|src\/heldout\//.test(m));
  assert.deepEqual(forbidden(read), []);
  assert.ok(forbidden((f) => (f === ADAPTER_FILES[0] ? `${read(f)}\nimport "../../governance/sealed-store-roots.mjs";\n` : read(f))).length > 0);
});

test("the test's own temporary inputs are removed, and none was ever inside the repository", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(existsSync(TMP), false);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
