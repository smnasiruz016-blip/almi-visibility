/**
 * F27 C5 · HEADERS JUDGED BY THE PAGE'S OWN TYPE AND BEHAVIOUR (Acceptance Amendment 2, _handoffs 258141f).
 *
 * Proved: no header is mandatory for every page — each applies only where the page's own record calls for it; a header the collector never
 * recorded is NOT MEASURED, named, never ABSENT; ABSENT is reached only through a record whose collector recorded that header; frame
 * protection behind a recorded CSP is NOT MEASURED (a value is never read); the declaration and its reuse of the provenance rule are the
 * ones live. Records here are SYNTHETIC; the real result comes from bin/transport-security.mjs over the real partitions.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { applies, judgeHeader, assessHeaders } from "../src/audit/header-assessment.mjs";
import { auditTransport } from "../src/audit/transport-security.mjs";
import { HEADER_DECLARATION } from "../config/security/header-declaration.mjs";
import { EVIDENCE_TYPES } from "../src/crawl/provenance.mjs";
import { transportPages } from "../src/audit/transport-security-reader.mjs";
import { readTenantPartition, readPartitionBodies } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const doc = (body) => `<!doctype html><html><head><title>T</title></head><body>${body}</body></html>`;
/* a v0.1 crawl observation: its collector recorded only five names, none a security header */
const crawlObs = { record_type: "observation", collector: "src/crawl/crawler.mjs", collector_version: "0.1", value: { response_headers_subset: { "content-type": "text/html" } } };
/* a header record whose collector DID record the security names — present ones listed in headers, the rest absent */
const headerRec = (present) => ({ record_type: EVIDENCE_TYPES.HEADERS, value: { collected: HEADER_DECLARATION.headers.map((h) => h.name), headers: Object.fromEntries(present.map((h) => [h, "x"])) } });
const page = (over = {}) => ({ url: "https://site.invalid/a", fetched: true, html: doc("<p>text</p>"), truncated: false, observation: crawlObs, ...over });
const H = (name) => HEADER_DECLARATION.headers.find((h) => h.name === name);

test("C5 · FIRING CONTROL: a header applies only where the page's own record calls for it — never one list for every page", () => {
  assert.equal(applies("SERVED_OVER_HTTPS", page()), true);
  assert.equal(applies("SERVED_OVER_HTTPS", page({ url: "http://site.invalid/a" })), false);
  assert.equal(applies("HTML_RUNS_SCRIPT", page()), false, "a page with no script was required to carry a CSP");
  assert.equal(applies("HTML_RUNS_SCRIPT", page({ html: doc("<script>x()</script>") })), true);
  assert.equal(applies("HTML_RUNS_SCRIPT", page({ html: doc('<button onclick="x()">b</button>') })), true);
  assert.equal(applies("HTML_EMBEDS_FRAMES_OR_POWERFUL_APIS", page()), false);
  assert.equal(applies("HTML_EMBEDS_FRAMES_OR_POWERFUL_APIS", page({ html: doc('<iframe src="/x"></iframe>') })), true);
  /* the record cannot show it: no body, or a truncated body without the behaviour — NOT MEASURED, never guessed */
  assert.equal(applies("HTML_PAGE", page({ html: null })), null);
  assert.equal(applies("HTML_RUNS_SCRIPT", page({ truncated: true })), null);
  assert.throws(() => applies("EVERY_PAGE", page()), { code: "HEADER_CONDITION_UNDECLARED" });
});

test("C5 · FIRING CONTROL: a header the collector never recorded is NOT MEASURED, named — never ABSENT, never 0", () => {
  const s = judgeHeader(page(), H("strict-transport-security"));
  assert.equal(s.state, "NOT MEASURED");
  assert.match(s.why, /did not record strict-transport-security/);
  const a = assessHeaders([page(), page()], HEADER_DECLARATION);
  const hsts = a.per.find((h) => h.name === "strict-transport-security");
  assert.deepEqual([hsts.PRESENT, hsts.ABSENT, hsts["NOT MEASURED"], hsts.of], [0, 0, 2, 2]);
  assert.equal(a.verdict, "COULD-NOT-PROVE", "a population of unmeasured headers read PROVED or DISPROVED");
});

test("C5 · FIRING CONTROL: ABSENT only where the collector recorded the header and the response had none — and an applicable ABSENT disproves", () => {
  const withHsts = page({ observation: headerRec(["strict-transport-security", "x-content-type-options", "referrer-policy", "x-frame-options"]) });
  const without = page({ observation: headerRec([]) });
  assert.equal(judgeHeader(withHsts, H("strict-transport-security")).state, "PRESENT");
  assert.equal(judgeHeader(without, H("strict-transport-security")).state, "ABSENT");
  assert.equal(assessHeaders([withHsts], HEADER_DECLARATION).verdict, "PROVED", "every applicable header measured and present did not read PROVED");
  assert.equal(assessHeaders([withHsts, without], HEADER_DECLARATION).verdict, "DISPROVED");
  assert.equal(assessHeaders([], HEADER_DECLARATION).verdict, "COULD-NOT-PROVE", "an empty population read PROVED");
});

test("C5 · FIRING CONTROL: frame protection behind a recorded CSP is NOT MEASURED — a header value is never read", () => {
  const cspOnly = page({ observation: headerRec(["content-security-policy"]) });
  const s = judgeHeader(cspOnly, H("x-frame-options"));
  assert.equal(s.state, "NOT MEASURED");
  assert.match(s.why, /frame-ancestors is a value never read/);
  assert.equal(judgeHeader(page({ observation: headerRec(["x-frame-options"]) }), H("x-frame-options")).state, "PRESENT");
  assert.equal(judgeHeader(page({ observation: headerRec([]) }), H("x-frame-options")).state, "ABSENT");
});

test("C5 · the declaration is CC's under the owner's express delegation; X-XSS-Protection is never credited; isolation headers are not assessed", () => {
  assert.match(HEADER_DECLARATION.declaredBy, /owner's express delegation/);
  assert.equal(HEADER_DECLARATION.amendment.commit, "258141f75f5a89880711e2180a7765c88cc42243");
  assert.ok(!HEADER_DECLARATION.headers.some((h) => h.name === "x-xss-protection"));
  assert.deepEqual(HEADER_DECLARATION.notAssessed, ["cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy"]);
  assert.ok(HEADER_DECLARATION.headers.every((h) => h.appliesWhen && h.appliesWhen !== "ANY_FETCHED_RESPONSE" || h.name === "x-content-type-options"), "a page-type header was made mandatory for every response");
});

test("C5 · FIRING CONTROL: on a REAL partition, every fetched page carries the observation of its OWN stored body — never another's, never none", () => {
  const resolve = createTenantResolver();
  const d = readDeclarations();
  const tenantId = (d.tenants?.tenants ?? d.tenants)[0].tenantId;
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve });
  const bodies = readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds });
  const fetched = transportPages(part.records, bodies).filter((p) => p.fetched);
  assert.ok(fetched.length > 0, "an empty real population would prove nothing");
  assert.ok(fetched.every((p) => p.observation && p.observation.record_type === "observation"), "a fetched page reached the audit without its own observation");
  const ids = new Set(part.records.filter((r) => r.record_type === "observation").map((o) => o.observation_id));
  assert.ok(fetched.every((p) => ids.has(p.observation.observation_id)), "a page carried an observation from outside its partition");
});

test("C5 · the audit judges each page by its OWN observation, and names every unmeasured header in the population's absences", () => {
  const a = auditTransport({ pages: [page()], headerNames: { "content-type": 1 }, fetchedObservations: 1 });
  assert.equal(a.parts.headers.declaredBy, HEADER_DECLARATION.declaredBy);
  assert.ok(a.absent.some((s) => /^header strict-transport-security: NOT MEASURED on 1 of 1 fetched page\(s\)/.test(s)));
  /* reuse proved: the assessment reads headers only through the provenance rule, never its own copy of it */
  const src = readFileSync(join(REPO, "src/audit/header-assessment.mjs"), "utf8");
  assert.match(src, /import \{ recordedHeader \} from "\.\.\/crawl\/provenance\.mjs"/);
  assert.doesNotMatch(src, /response_headers_subset|\.collected\b/, "the assessment re-implements the provenance rule");
});
