/**
 * F16 · THE COLLECTOR STOPS ITSELF (RR-121; pilot proposal _handoffs AlmiVisibility_RR-121_API_SHAPE_AND_PILOT_2026-10-01.md).
 *
 * Every transport here is a RECORDED FIXTURE that counts its own calls — nothing reaches a network, and no transport that could exists in
 * the repository. Each stop (backoff, quota, the one-minute repeat rule, the run's cap) is proved by a call that did NOT happen. The last
 * test carries a collected run through the PRODUCTION entry point (bin/source-intake.mjs --adapter) into a confined store.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { createGovernor, identityOf } from "../src/research/request-governor.mjs";
import { collect, DOCUMENTED, SEARCH, BY_IDS } from "../src/research/adapters/stack-exchange-collector.mjs";
import { SCOPE_DISCLAIMER } from "../src/research/source-adapter.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { declaredWorld, FIXTURE_TENANT, inputPathRef } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f16-collector-${process.pid}`);
const FILES = ["src/research/request-governor.mjs", "src/research/adapters/stack-exchange-collector.mjs"];

/** A recorded-fixture transport: answers from a script, counts every call, and never reaches anything. */
const fixture = (answers) => { const calls = []; const t = async (method, params) => { calls.push({ method, params }); return answers[calls.length - 1] ?? { items: [] }; }; t.calls = calls; return t; };
const clockAt = (start = 1_000_000) => { let s = start; const c = () => s; c.advance = (d) => { s += d; }; return c; };
const E = (iso) => Date.parse(iso) / 1000;
const post = (id, over = {}) => ({ question_id: id, title: `Synthetic fixture question ${id}?`, link: `https://fixture-qa.invalid/q/${id}`, creation_date: E("2021-03-01T10:00:00Z"),
  owner: { display_name: `fixture-user-${id}` }, content_license: "CC BY-SA 4.0", body: "SYNTHETIC BODY — never stored", score: 3, ...over });

test("§4 · the documented numbers are the governor's numbers (throttle page, read 2026-10-01)", () => {
  assert.deepEqual({ ...DOCUMENTED }, { dedupeWindowSeconds: 60, ipRequestsPerSecondCutoff: 30, defaultDailyQuota: 10000 });
  assert.deepEqual([SEARCH, BY_IDS], ["/2.3/search/advanced", "/2.3/questions/{ids}"]);
});

test("§4 · FIRING CONTROL: BACKOFF is obeyed — the same method is refused until the wait has passed, and the transport is NOT called", async () => {
  const clock = clockAt(), t = fixture([{ items: [], backoff: 10 }, { items: [] }, { items: [] }]);
  const g = createGovernor({ cap: 10, dedupeWindowSeconds: 60, clock });
  await g.request(SEARCH, { site: "s", q: "a" }, t);
  clock.advance(5);
  assert.equal((await g.request(SEARCH, { site: "s", q: "b" }, t)).refused, "BACKOFF_IN_FORCE");
  assert.equal(t.calls.length, 1, "a request was sent during a backoff");
  assert.equal((await g.request(BY_IDS, { site: "s", ids: "1" }, t)).refused, null, "backoff on one method blocked another");
  clock.advance(5);
  assert.equal((await g.request(SEARCH, { site: "s", q: "b" }, t)).refused, null, "the method stayed blocked after the wait");
  assert.equal(t.calls.length, 3);
});

test("§4 · FIRING CONTROL: the QUOTA stops the collector before it exceeds it", async () => {
  const clock = clockAt(), t = fixture([{ items: [], quota_remaining: 1 }, { items: [], quota_remaining: 0 }, { items: [] }]);
  const g = createGovernor({ cap: 10, dedupeWindowSeconds: 60, clock });
  assert.equal((await g.request(SEARCH, { q: 1 }, t)).refused, null);
  assert.equal((await g.request(SEARCH, { q: 2 }, t)).refused, null);
  assert.equal((await g.request(SEARCH, { q: 3 }, t)).refused, "QUOTA_EXHAUSTED");
  assert.equal(t.calls.length, 2, "a request was sent with no quota remaining");
  assert.deepEqual(g.tally().refused, { QUOTA_EXHAUSTED: 1 });
});

test("§4 · FIRING CONTROL: a semantically identical request within one minute is refused by the collector itself — a credential never makes it different", async () => {
  const clock = clockAt(), t = fixture([]);
  const g = createGovernor({ cap: 10, dedupeWindowSeconds: DOCUMENTED.dedupeWindowSeconds, clock });
  await g.request(SEARCH, { site: "s", q: "x", page: 1 }, t);
  clock.advance(59);
  assert.equal((await g.request(SEARCH, { page: 1, q: "x", site: "s" }, t)).refused, "IDENTICAL_REQUEST_WITHIN_WINDOW", "parameter order made a request different");
  assert.equal((await g.request(SEARCH, { site: "s", q: "x", page: 1, key: "k2" }, t)).refused, "IDENTICAL_REQUEST_WITHIN_WINDOW", "a credential made a request different");
  assert.equal(t.calls.length, 1);
  clock.advance(1);
  assert.equal((await g.request(SEARCH, { site: "s", q: "x", page: 1 }, t)).refused, null, "the request stayed refused after a minute");
  assert.equal(identityOf(SEARCH, { key: "k", a: 1 }), identityOf(SEARCH, { a: 1, access_token: "t" }));
});

test("§4 · FIRING CONTROL: the run's own CAP stops it, whatever the source would allow", async () => {
  const clock = clockAt(), t = fixture([]);
  const g = createGovernor({ cap: 2, dedupeWindowSeconds: 60, clock });
  for (const q of [1, 2, 3, 4]) await g.request(SEARCH, { q }, t);
  assert.deepEqual([t.calls.length, g.tally().refused.REQUEST_CAP_REACHED], [2, 2]);
  assert.throws(() => createGovernor({ cap: 0, dedupeWindowSeconds: 60, clock }), /GOVERNOR_CAP_UNDECLARED/);
  assert.throws(() => createGovernor({ cap: 2, dedupeWindowSeconds: 0, clock }), /GOVERNOR_WINDOW_UNDECLARED/);
});

test("§4 · the collector makes exactly one search and one recheck of the ids it got; a backoff on the search stops it with nothing kept", async () => {
  const clock = clockAt(E("2026-10-01T09:00:00Z")), t = fixture([{ items: [post(1), post(2)] }, { items: [post(1), post(2)] }]);
  const run = await collect({ transport: t, clock, cap: 2, site: "fixture-site", q: "fixture", language: "en", pagesize: 100 });
  assert.deepEqual(t.calls.map((c) => c.method), [SEARCH, BY_IDS]);
  /* RR-126: the full-text method with q — the old title/tag parameters are gone */
  assert.deepEqual(Object.keys(t.calls[0].params).sort(), ["filter", "page", "pagesize", "q", "site"]);
  assert.equal(t.calls[0].params.q, "fixture");
  assert.equal(t.calls[1].params.ids, "1;2");
  assert.deepEqual([run.stoppedBy, run.recorded.response.items.length, run.recheck.response.items.length, run.tally.sent], [null, 2, 2, 2]);
  const empty = fixture([{ items: [] }]);
  const none = await collect({ transport: empty, clock, cap: 2, site: "fixture-site", q: "nothing", language: "en", pagesize: 100 });
  assert.deepEqual([empty.calls.length, none.recorded.response.items.length, none.stoppedBy], [1, 0, null], "an empty search was rechecked or padded");
  const tight = fixture([{ items: [post(1)] }]);
  const capped = await collect({ transport: tight, clock, cap: 1, site: "fixture-site", q: "capped", language: "en", pagesize: 100 });
  assert.deepEqual([tight.calls.length, capped.stoppedBy, capped.recheck], [1, "REQUEST_CAP_REACHED", null], "the recheck ran past the cap");
});

/* ================= the production path ================= */

const C = { subject: "harbour-kayak-hire", origin: "https://harbour-kayak.invalid", batch: "harbour-kayak-research", tenant: FIXTURE_TENANT };
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
function input(W, name, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: C.tenant });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}

test("§4 · A COLLECTED RUN THROUGH THE PRODUCTION ENTRY POINT: a deleted and an edited post refused, a missing creator refused, the rest kept with the SAMPLE limits", async () => {
  const clock = clockAt(E("2026-10-01T09:00:00Z"));
  const t = fixture([
    { items: [post(1), post(2), post(3), post(4, { owner: undefined })], quota_remaining: 9998 },
    { items: [post(1), post(3, { title: "Synthetic fixture question 3, edited?", last_edit_date: E("2026-10-01T08:59:00Z") }), post(4, { owner: undefined })] },
  ]);
  const run = await collect({ transport: t, clock, cap: 2, site: "fixture-site", q: "fixture", language: "en", pagesize: 100 });
  const W = declaredWorld();
  try {
    declareClient(W, C);
    const ret = input(W, "recorded.json", run.recorded), rec = input(W, "recheck.json", run.recheck);
    const r = spawnSync(process.execPath, ["bin/source-intake.mjs", `--tenant=${C.tenant}`, `--actor=${W.actor}`, `--subject=${C.subject}`, `--research-batch=${C.batch}`, "--adapter=stack-exchange", `--retrieval=${ret}`, `--recheck=${rec}`, `--relevance=${input(W, "relevance.json", { profileId: "fixture-profile", subject: C.subject, declaredAs: "FIXTURE", confirms: ["synthetic fixture question"] })}`, "--confirm"], { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /questions people wrote: kept 1 of 4 retrieved/);
    assert.match(r.stdout, /POST_DELETED_SINCE_RETRIEVAL 1/);
    assert.match(r.stdout, /POST_CHANGED_SINCE_RETRIEVAL 1/);
    assert.match(r.stdout, /CREATOR_ABSENT 1/);
    assert.ok(r.stdout.includes(SCOPE_DISCLAIMER));
    assert.match(r.stdout, /SAMPLE — not a census/);
    assert.doesNotMatch(r.stdout, /https?:\/\/|Synthetic fixture question|fixture-user|fixture-site/);
    const stored = readFileSync(join(W.root, "research", C.batch, "questions.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(stored.length, 1);
    assert.doesNotMatch(JSON.stringify(stored), /SYNTHETIC BODY|"score"/);
  } finally { W.cleanup(); }
});

test("§4 · FIRING CONTROL: the governor and the collector reach no network and name no product — and each control fires", () => {
  const read = (f) => (existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null);
  assert.deepEqual(decisionCallPaths({ entries: FILES }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: [FILES[1]], read: (f) => (f === FILES[1] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  for (const f of FILES) assert.deepEqual(scanSource(read(f)).code, [], `${f} names a product`);
  assert.ok(scanSource(`${read(FILES[0])}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0);
  assert.doesNotMatch(read(FILES[0]), /stack\s?exchange/i, "the source-neutral governor names a source");
});

test("the test's own temporary inputs are removed", () => {
  rmSync(TMP, { recursive: true, force: true });
  assert.equal(existsSync(TMP), false);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
