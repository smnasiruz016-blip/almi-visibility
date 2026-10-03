/**
 * 🔴 RR-138 §4 · F30 · CHANGE DETECTION ON RECORDED OBSERVATIONS (acceptance _handoffs fdc9048). Clauses:
 *   C1 one client, any client · C2 the same page, twice · C3 clean measurements only · C4 a recorded rule · C5 no false change, noise
 *   suppressed · C6 recrawl timing per client · C7 denominators and INCOMPLETE.
 * No live call: the binary reads fixture batches in a declared fixture world; nothing is fetched, rendered or written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { changeCheck, compareObservations, recrawlDue, isCleanRun, uncleanReason, CHANGE_RULE, NOT_MEASURED } from "../src/audit/change-detection.mjs";
import { declaredWorld, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- a fixture compliant run: its record proves its bounds, and the ledger entry naming it proves it was kept ---- */
let seq = 0;
function crawlRun({ at, pages, origin = "https://one.invalid", run = {}, keep = true, obs = () => ({}) }) {
  const id = `run${(seq += 1).toString(16).padStart(12, "0")}`;
  const t = (s) => new Date(Date.parse(at) + s * 1000).toISOString();
  const records = pages.map((p, i) => {
    const o = { record_type: "observation", observation_id: `${id}-${i}`, observed_at: t(i + 1), method: "crawl.fetch", content_sha256: "a".repeat(64),
      value: { requested_url: `${origin}${p}`, final_url: `${origin}${p}`, status: 200, redirect_chain: [], robotsState: "ALLOWED", response_headers_subset: { "content-type": "text/html" }, truncated: false, error: null, skipped: false } };
    const over = obs(p, i) ?? {};
    return { ...o, ...over, value: { ...o.value, ...(over.value ?? {}) } };
  });
  records.push({ record_type: "crawl_run", run_id: id, started_at: t(0), finished_at: t(pages.length + 1), requestsIssued: pages.length, pacing: { ok: true, breaches: 0, gaps: pages.length }, ...run });
  const ledger = keep ? [{ record_type: "cost_entry", run_ref: `runs/crawl — crawl_run ${id}` }] : [];
  return { batch: id, records, ledger };
}
const DAY1 = "2026-10-01T00:00:00.000Z", DAY2 = "2026-10-02T00:00:00.000Z", NOW = "2026-10-03T00:00:00.000Z";
const SETTING = { subjectId: "x", everyHours: 24 };

test("C2 · C5 · the same page twice, identical values → UNCHANGED (no false change); one clean observation → NOT MEASURED, never UNCHANGED", () => {
  const r = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a", "/b"] }), crawlRun({ at: DAY2, pages: ["/a"] })], setting: SETTING, now: NOW });
  assert.deepEqual([r.pages, r.compared, r.unchanged, r.changed, r.notMeasured], [2, 1, 1, 0, 1]);
  assert.equal(r.incomplete, true, "a page with one observation left the population COMPLETE");
  const once = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] })], setting: SETTING, now: NOW });
  assert.deepEqual([once.unchanged, once.notMeasured], [0, 1], "a single observation read UNCHANGED");
});

test("C2 · two observations of DIFFERENT pages are never compared; one page at ONE time is not two observations", () => {
  const diff = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] }), crawlRun({ at: DAY2, pages: ["/b"] })], setting: null, now: NOW });
  assert.deepEqual([diff.pages, diff.compared, diff.notMeasured], [2, 0, 2], "two different pages were compared");
  /* the same page recorded twice at the same instant (two batches holding the same record) is ONE observation */
  const a = crawlRun({ at: DAY1, pages: ["/a"] });
  const same = changeCheck({ batches: [a, { ...a, batch: "copy" }], setting: null, now: NOW });
  assert.deepEqual([same.compared, same.notMeasured], [0, 1], "one page at one time was compared with itself");
});

test("C4 · a real recorded change IS flagged, with the changed fields named, by the recorded rule — one byte of difference is enough (no threshold)", () => {
  const r = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a", "/b"] }), crawlRun({ at: DAY2, pages: ["/a", "/b"], obs: (p) => (p === "/a" ? { content_sha256: `${"a".repeat(63)}b` } : { value: { status: 404 } }) })], setting: null, now: NOW });
  assert.deepEqual([r.compared, r.changed, r.unchanged], [2, 2, 0]);
  assert.deepEqual(r.fieldsChanged, { content_sha256: 1, status: 1 });
  assert.equal(r.rule, CHANGE_RULE, "the result does not carry the rule that decided it");
  assert.deepEqual([CHANGE_RULE.id, CHANGE_RULE.version], ["f30-material-change", "1"]);
  for (const [f, a, b] of [["final_url", { final_url: "https://one.invalid/x" }, {}], ["redirect_chain", { redirect_chain: [{ status: 301 }] }, {}], ["robots_state", { robotsState: "DISALLOWED" }, {}], ["x-robots-tag", { response_headers_subset: { "content-type": "text/html", "x-robots-tag": "noindex" } }, {}], ["content-type", { response_headers_subset: { "content-type": "text/plain" } }, {}]]) {
    const base = crawlRun({ at: DAY1, pages: ["/a"] }).records[0];
    assert.deepEqual(compareObservations(base, { ...base, value: { ...base.value, ...a, ...b } }).changed, [f], `a change in ${f} was not flagged`);
  }
});

test("C5 · noise suppressed: a field outside the rule (date, etag, timing) never makes a change; a field recorded on ONE side is NOT MEASURED for that field, never a change", () => {
  const base = crawlRun({ at: DAY1, pages: ["/a"] }).records[0];
  const noisy = { ...base, observed_at: DAY2, value: { ...base.value, timing_ms: 999, response_headers_subset: { "content-type": "text/html", date: "x", etag: "y" } } };
  assert.deepEqual(compareObservations(base, noisy), { state: "UNCHANGED", changed: [], notMeasured: [] });
  const oneSided = { ...base, value: { ...base.value, response_headers_subset: undefined } };
  const c = compareObservations(base, oneSided);
  assert.deepEqual([c.state, c.changed, c.notMeasured], ["UNCHANGED", [], ["x-robots-tag", "content-type"]], "a field one side did not record was read as a change");
  const r = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] }), crawlRun({ at: DAY2, pages: ["/a"], obs: () => ({ value: { response_headers_subset: undefined } }) })], setting: null, now: NOW });
  assert.deepEqual([r.unchanged, r.changed, r.fieldsNotMeasured, r.incomplete], [1, 0, 2, true], "a one-sided field left the population COMPLETE");
});

test("C3 · a SKIPPED, ERRORED, TRUNCATED or status-less observation never counts as either side — counted apart with its reason; CONTROL: the clean twin compares", () => {
  for (const [why, over] of [["SKIPPED", { value: { skipped: true } }], ["ERRORED", { value: { error: "ECONNRESET" } }], ["TRUNCATED", { value: { truncated: true } }], ["NO_SERVED_STATUS", { value: { status: null } }]]) {
    const r = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] }), crawlRun({ at: DAY2, pages: ["/a"], obs: () => over })], setting: null, now: NOW });
    assert.deepEqual([r.compared, r.notMeasured, r.excluded[why]], [0, 1, 1], `a ${why} observation was used as a second measurement`);
    assert.equal(uncleanReason({ ...crawlRun({ at: DAY1, pages: ["/a"], obs: () => over }).records[0] }), why);
  }
  const control = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] }), crawlRun({ at: DAY2, pages: ["/a"] })], setting: null, now: NOW });
  assert.deepEqual([control.compared, control.excluded], [1, {}], "CONTROL: two clean observations were not compared");
});

test("C3 · a NON-COMPLIANT run's observations never count: a pacing breach, unproved pacing, a dry run, no requests, or a collection NOT KEPT (no ledger entry naming it)", () => {
  const cases = [["pacing breach", { run: { pacing: { ok: true, breaches: 1 } } }], ["pacing not proved", { run: { pacing: { breaches: 0 } } }], ["dry run", { run: { dryRun: true } }], ["no requests", { run: { requestsIssued: 0 } }], ["not kept", { keep: false }]];
  for (const [what, opt] of cases) {
    const bad = crawlRun({ at: DAY2, pages: ["/a"], ...opt });
    assert.equal(isCleanRun(bad.records.find((r) => r.record_type === "crawl_run"), bad.ledger), false, `${what}: counted as clean`);
    const r = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] }), bad], setting: null, now: NOW });
    assert.deepEqual([r.compared, r.notMeasured, r.excluded.RUN_NOT_COMPLIANT], [0, 1, 1], `${what}: a non-compliant observation was compared`);
  }
  /* a ledger entry naming ANOTHER run is not this run's proof of keeping */
  const other = crawlRun({ at: DAY2, pages: ["/a"] });
  assert.equal(isCleanRun(other.records.find((r) => r.record_type === "crawl_run"), [{ record_type: "cost_entry", run_ref: "runs/crawl — crawl_run someone-else" }]), false);
});

test("C6 · recrawl timing only from the client's declared interval: none → NOT DECLARED; any interval accepted; DUE / NOT DUE from the last CLEAN observation", () => {
  assert.deepEqual(recrawlDue({ setting: null, lastCleanAt: DAY1, now: NOW }), { state: "NOT DECLARED" });
  assert.equal(recrawlDue({ setting: { everyHours: 0 }, lastCleanAt: DAY1, now: NOW }).state, "NOT DECLARED", "an invalid interval was given a default");
  assert.equal(recrawlDue({ setting: { everyHours: 24 }, lastCleanAt: DAY2, now: NOW }).state, "DUE");
  assert.equal(recrawlDue({ setting: { everyHours: 25 }, lastCleanAt: DAY2, now: NOW }).state, "NOT DUE");
  assert.equal(recrawlDue({ setting: { everyHours: 7 }, lastCleanAt: "2026-10-02T18:00:00.000Z", now: NOW }).dueAt, "2026-10-03T01:00:00.000Z", "a client's own interval was not used as declared");
  assert.equal(recrawlDue({ setting: { everyHours: 24 }, lastCleanAt: null, now: NOW }).state, NOT_MEASURED);
  /* only a CLEAN observation starts the clock: a later failed one does not reset it */
  const r = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] }), crawlRun({ at: "2026-10-02T23:00:00.000Z", pages: ["/a"], obs: () => ({ value: { error: "x" } }) })], setting: { everyHours: 24 }, now: NOW });
  assert.deepEqual(r.due, { DUE: 1 }, "a failed observation reset the recrawl clock");
  assert.deepEqual(changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] })], setting: null, now: NOW }).due, { "NOT DECLARED": 1 });
});

test("C7 · every count sums to its denominator; INCOMPLETE whenever a page or field is NOT MEASURED; CONTROL: a fully measured population is COMPLETE", () => {
  const r = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a", "/b", "/c"] }), crawlRun({ at: DAY2, pages: ["/a", "/b"], obs: (p) => (p === "/b" ? { content_sha256: "c".repeat(64) } : {}) })], setting: SETTING, now: NOW });
  assert.equal(r.unchanged + r.changed + r.notMeasured, r.pages);
  assert.equal(Object.values(r.due).reduce((a, b) => a + b, 0), r.pages);
  assert.equal(r.incomplete, true);
  const full = changeCheck({ batches: [crawlRun({ at: DAY1, pages: ["/a"] }), crawlRun({ at: DAY2, pages: ["/a"] })], setting: SETTING, now: NOW });
  assert.equal(full.incomplete, false, "CONTROL: a fully measured population read INCOMPLETE");
});

/* ---- C1 · the binary, two unrelated declared subjects (different registered domains), different tenants ---- */
const B_SUBJECT = "second-client-site", B_ORIGIN = "https://second-client.invalid";
function world({ settings = [{ subjectId: FIXTURE_SUBJECT, everyHours: 24, declaredOn: "2026-10-03", basis: "TEST" }] } = {}) {
  const A1 = crawlRun({ at: DAY1, pages: ["/a", "/b"], origin: FIXTURE_SUBJECT_ORIGIN }), A2 = crawlRun({ at: DAY2, pages: ["/a", "/b"], origin: FIXTURE_SUBJECT_ORIGIN, obs: (p) => (p === "/b" ? { content_sha256: "d".repeat(64) } : {}) });
  const B1 = crawlRun({ at: DAY1, pages: ["/x"], origin: B_ORIGIN }), B2 = crawlRun({ at: DAY2, pages: ["/x"], origin: B_ORIGIN });
  const ids = { a1: "chg-a1", a2: "chg-a2", b1: "chg-b1", b2: "chg-b2" };
  const WORLD = declaredWorld({ extra: [...Object.values(ids).map((b) => ["RESEARCH_BATCH", b]), ["SITE_ORIGIN", B_ORIGIN]], secondTenantOrigins: [B_ORIGIN] });
  const roots = JSON.parse(readFileSync(join(WORLD.root, "roots.json"), "utf8"));
  roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT).members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: ids.a1 }, { resourceKind: "RESEARCH_BATCH", resourceRef: ids.a2 });
  roots.subjects.push({ subjectId: B_SUBJECT, path: B_SUBJECT, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }, { resourceKind: "RESEARCH_BATCH", resourceRef: ids.b1 }, { resourceKind: "RESEARCH_BATCH", resourceRef: ids.b2 }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }] }] });
  writeFileSync(join(WORLD.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  mkdirSync(join(WORLD.root, B_SUBJECT), { recursive: true });
  const att = JSON.parse(readFileSync(join(WORLD.root, "tenancy", "attachments.json"), "utf8"));
  for (const x of att.attachments) if (x.resourceRef === ids.b1 || x.resourceRef === ids.b2) x.tenantId = SECOND_FIXTURE_TENANT;
  writeFileSync(join(WORLD.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2) + "\n");
  const research = roots.stores.find((s) => s.store === "RESEARCH").path;
  for (const [id, run] of [[ids.a1, A1], [ids.a2, A2], [ids.b1, B1], [ids.b2, B2]]) {
    mkdirSync(join(WORLD.root, research, id), { recursive: true });
    writeFileSync(join(WORLD.root, research, id, "crawl.jsonl"), run.records.map((r) => JSON.stringify(r)).join("\n") + "\n");
    writeFileSync(join(WORLD.root, research, id, "ledger.jsonl"), run.ledger.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }
  writeFileSync(join(WORLD.root, "tenancy", "recrawl-settings.json"), JSON.stringify({ schemaVersion: 1, settings }) + "\n");
  return WORLD;
}
const run = (WORLD, tenant, subject) => spawnSync(process.execPath, ["bin/change-check.mjs", `--subject=${subject}`, `--tenant=${tenant}`, "--actor=actor:cc", `--now=${NOW}`], { cwd: REPO, encoding: "utf8", timeout: 60000, env: WORLD.envWith() });
const line = (out, k) => out.split("\n").find((l) => l.trimStart().startsWith(k)) ?? "";

test("C1 · GENERIC — two unrelated declared subjects through the same binary, each reading only its own batches and its own setting; count-only output with the rule printed", () => {
  const WORLD = world();
  try {
    const a = run(WORLD, FIXTURE_TENANT, FIXTURE_SUBJECT), b = run(WORLD, SECOND_FIXTURE_TENANT, B_SUBJECT);
    assert.equal(a.status, 0, a.stderr.slice(-400));
    assert.equal(b.status, 0, b.stderr.slice(-400));
    assert.match(line(a.stdout, "rule"), /f30-material-change v1 — compares status, final_url, redirect_chain, robots_state, x-robots-tag, content-type, content_sha256/);
    assert.match(line(a.stdout, "compared"), /^\s*compared\s+2 of 2 page\(s\) · UNCHANGED 1 · CHANGED 1 \(fields: content_sha256 1\) · NOT MEASURED 0/);
    assert.match(line(b.stdout, "compared"), /^\s*compared\s+1 of 1 page\(s\) · UNCHANGED 1 · CHANGED 0/, "the second subject read the first subject's batches");
    /* C6: the first client's setting is its own; the second declared none and reads NOT DECLARED, never the first client's */
    /* the last clean observation is 2 s after DAY2, so a 24-hour interval falls due 2 s after NOW: NOT DUE — computed, not defaulted */
    assert.match(line(a.stdout, "recrawl"), /every 24 hour\(s\), declared by the client · NOT DUE 2 —/);
    assert.match(line(b.stdout, "recrawl"), /setting NOT DECLARED · NOT DECLARED 1/, "another client's setting was applied");
    assert.match(a.stdout.trimEnd().split("\n").at(-1), /^\s*population\s+COMPLETE · nothing fetched or written$/, "a fully measured client did not read COMPLETE");
    for (const out of [a.stdout, b.stdout]) assert.doesNotMatch(out, /https?:\/\/|\.invalid|\/a\b|\/x\b/, "the output carries a host or URL");
  } finally { WORLD.cleanup(); }
  assert.equal(trailSha(), TRAIL_BEFORE, "the production trail moved");
});

test("C1 · another tenant's subject is refused before anything is read; an undeclared subject is refused", () => {
  const WORLD = world();
  try {
    const cross = run(WORLD, FIXTURE_TENANT, B_SUBJECT);
    assert.equal(cross.status, 3, `another tenant's batches were read: ${cross.stdout.slice(0, 200)}`);
    assert.doesNotMatch(cross.stdout, /compared/);
    const none = run(WORLD, FIXTURE_TENANT, "nobody-declared");
    assert.equal(none.status, 3);
    /* CONTROL: the same subject under its own tenant runs */
    assert.equal(run(WORLD, SECOND_FIXTURE_TENANT, B_SUBJECT).status, 0);
  } finally { WORLD.cleanup(); }
});
