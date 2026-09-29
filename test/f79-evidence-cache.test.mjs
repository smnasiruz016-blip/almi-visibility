/**
 * F79 · EVIDENCE CACHE BEFORE RE-RESEARCH (acceptance _handoffs f34f3af, Amendment 1 60dee9b; RR-93).
 *
 * Every expected answer below is written by hand from its fixture. Tamper controls run on confined copies in a temp dir, never the
 * production store. Nothing here collects, calls or writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { lookup, integrityOf, propertyTenant, MISS } from "../src/evidence/evidence-cache.mjs";
import { readRecordedReuse, recordedRepeats, declaredOrigins, EVIDENCE_STORE } from "../src/evidence/evidence-cache-real.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { declaredWorld, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const sha = (b) => createHash("sha256").update(b).digest("hex");

/* ---- a stand-in world: exactly these declarations resolve ---- */
const A = "tenant:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", B = "tenant:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const DECLARED = { "SITE_ORIGIN|https://a.example": A, "SITE_ORIGIN|https://b.example": B };
const resolve = ({ resourceKind, resourceRef }) => (DECLARED[`${resourceKind}|${resourceRef}`] ? { state: "RESOLVED", tenantId: DECLARED[`${resourceKind}|${resourceRef}`] } : { state: "UNDECLARED" });
const ORIGINS = [{ host: "a.example", tenantId: A }, { host: "shop.a.example", tenantId: A }, { host: "b.example", tenantId: B }, { host: "x.shared.example", tenantId: A }, { host: "y.shared.example", tenantId: B }];
const W1 = { startDate: "2026-08-15", endDate: "2026-09-12" }, W2 = { startDate: "2026-08-16", endDate: "2026-09-13" };
let n = 0;
const rec = ({ ref = "https://a.example/", method = "m:page-rows", window = W1, at = "2026-09-12T10:00:00Z", extra = {}, raw_ref = null } = {}) => {
  const value = { ...(window ?? {}), requestCount: 3, rows: [n], ...extra };
  n++;
  return { record_type: "observation", observation_id: `o${n}`, measurement_key: `k${n}`, observed_at: at, method, target: { kind: "property", ref }, content_sha256: sha(JSON.stringify(value)), raw_ref, value };
};
const req = (r, window = W1) => ({ method: r.method, target: r.target, window });
const CTX = (records, over = {}) => ({ tenantId: A, records, resolve, origins: ORIGINS, freshnessRule: null, sourceChanges: [], readRaw: () => null, ...over });

/* ================= C1 — one lookup, one answer ================= */

test("C1 · ONE lookup gives ONE answer: HIT with the one record that serves it, or MISS with the failed test named — re-research reported, never run", () => {
  const r = rec();
  const hit = lookup(req(r), CTX([r]));
  assert.deepEqual([hit.answer, hit.record, hit.requestCount], ["HIT", r.observation_id, 3]);
  const none = lookup({ method: "m:other", target: r.target, window: W1 }, CTX([r]));
  assert.deepEqual([none.answer, none.miss, none.reResearch], ["MISS", MISS.NOT_HELD, "REQUIRED — not run"]);
  /* two valid records of the same measurement and window: ONE answer, the most recent */
  const older = rec({ at: "2026-09-11T10:00:00Z" }), newer = rec({ at: "2026-09-12T11:00:00Z" });
  assert.equal(lookup(req(older), CTX([older, newer])).record, newer.observation_id);
  for (const a of [none, lookup(req(r), CTX([r], { tenantId: B }))]) assert.ok(a.miss && a.why && !("record" in a), "a miss without its named test, or a miss carrying a record");
  assert.throws(() => lookup(req(r), { ...CTX([r]), sourceChanges: undefined }), /passed explicitly/);
});

/* ================= C2 — scope is F02 ================= */

test("C2 · FIRING CONTROL: another tenant's record, a domain property spanning tenants, and an unresolvable property are never served — F02 tenant-isolation conformance", () => {
  const theirs = rec({ ref: "https://b.example/" });
  const spanning = rec({ ref: "sc-domain:shared.example" });
  const undeclared = rec({ ref: "https://c.example/" });
  const star = rec({ ref: "*" });
  for (const [r, why] of [[theirs, /another tenant/], [spanning, /spans 2 tenants/], [undeclared, /UNDECLARED/], [star, /no resolvable property/]]) {
    const a = lookup(req(r), CTX([r]));
    assert.deepEqual([a.answer, a.miss], ["MISS", MISS.OUTSIDE_SCOPE], `${r.target.ref} was served outside the requesting tenant's partition`);
    assert.match(a.why, why);
  }
  /* the control: a domain property whose declared origins are ONE tenant's is that tenant's, and served to it — and to no other */
  const own = rec({ ref: "sc-domain:a.example" });
  assert.deepEqual(propertyTenant(own.target.ref, { resolve, origins: ORIGINS }), { tenantId: A });
  assert.equal(lookup(req(own), CTX([own])).answer, "HIT");
  assert.equal(lookup(req(own), CTX([own], { tenantId: B })).miss, MISS.OUTSIDE_SCOPE);
});

/* ================= C3 — freshness ================= */

test("C3 · a windowed record serves only its own window; an undeclared age is NOT MEASURED, never fresh; a later source change forces a miss", () => {
  const r = rec();
  assert.equal(lookup(req(r, W2), CTX([r])).miss, MISS.OUTSIDE_WINDOW, "a record served another window");
  assert.equal(lookup(req(r, null), CTX([r])).miss, MISS.OUTSIDE_WINDOW);
  const unwindowed = rec({ method: "m:list", window: null });
  const u = lookup(req(unwindowed, null), CTX([unwindowed]));
  assert.deepEqual([u.answer, u.miss], ["MISS", MISS.FRESHNESS_NOT_DECLARED], "an undeclared age read fresh");
  assert.match(u.why, /NOT MEASURED/);
  /* a DECLARED rule decides age — both ways */
  assert.equal(lookup(req(unwindowed, null), CTX([unwindowed], { freshnessRule: { fresh: () => true } })).answer, "HIT");
  assert.equal(lookup(req(unwindowed, null), CTX([unwindowed], { freshnessRule: { fresh: () => false } })).miss, MISS.EXPIRED, "an expired record was served, or named as if no rule were declared");
  /* a recorded source-change signal later than the record forces a miss; an earlier one does not */
  const later = [{ targetRef: r.target.ref, at: "2026-09-13T00:00:00Z", ref: "signal-1" }];
  const earlier = [{ targetRef: r.target.ref, at: "2026-09-01T00:00:00Z", ref: "signal-0" }];
  assert.equal(lookup(req(r), CTX([r], { sourceChanges: later })).miss, MISS.SOURCE_CHANGED, "a source change was ignored");
  assert.equal(lookup(req(r), CTX([r], { sourceChanges: earlier })).answer, "HIT");
});

/* ================= C4 — integrity ================= */

test("C4 · FIRING CONTROL: tamper is never a hit — inline content and a raw file, each hashed against the recorded hash, on confined copies", () => {
  const dir = mkdtempSync(join(tmpdir(), "f79-"));
  try {
    const inline = rec();
    assert.deepEqual(integrityOf(inline, { readRaw: () => null }), { ok: true, via: "inline content" });
    const tampered = { ...inline, value: { ...inline.value, rows: [999] } };
    const t = lookup(req(tampered), CTX([tampered]));
    assert.deepEqual([t.answer, t.miss], ["MISS", MISS.INTEGRITY_FAILED], "tampered inline content was served");
    /* no content at all (and so no window): under a declared rule that would call it fresh, integrity is what refuses it */
    const bare = { ...inline, value: undefined };
    assert.equal(lookup(req(bare, null), CTX([bare], { freshnessRule: { fresh: () => true } })).miss, MISS.INTEGRITY_FAILED);
    /* a raw-file record: served when the file hashes to the recorded hash; refused when it is missing or altered */
    const bytes = Buffer.from("recorded raw bytes");
    writeFileSync(join(dir, "raw.bin"), bytes);
    const raw = { ...rec(), raw_ref: "raw.bin", content_sha256: sha(bytes) };
    const readRaw = (p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p)) : null);
    assert.equal(lookup(req(raw), CTX([raw], { readRaw })).answer, "HIT");
    writeFileSync(join(dir, "raw.bin"), Buffer.from("altered raw bytes"));
    assert.equal(lookup(req(raw), CTX([raw], { readRaw })).miss, MISS.INTEGRITY_FAILED, "an altered raw file was served");
    rmSync(join(dir, "raw.bin"));
    assert.match(lookup(req(raw), CTX([raw], { readRaw })).why, /missing/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ================= REAL — the recorded store and its repeat requests ================= */

test("REAL · every recorded repeat request is answered once; under F02 no declared tenant is served a property-level record it does not alone own", () => {
  const resolveReal = createTenantResolver();
  const records = createJsonlStore(EVIDENCE_STORE).readAll();
  const reps = recordedRepeats(records);
  assert.ok(reps.length > 0, "EMPTY population of recorded repeats — C5 would be COULD-NOT-PROVE");
  assert.ok(reps.every((x) => x.request), "a recorded repeat names no held record");
  /* every held record re-hashes to its recorded hash (Amendment 1: inline content) — integrity is not what refuses them */
  const obs = records.filter((r) => r.record_type === "observation");
  assert.equal(obs.filter((r) => integrityOf(r, { readRaw: () => null }).ok).length, obs.length);
  const tenants = [...new Set(declaredOrigins().map((o) => o.tenantId))];
  assert.ok(tenants.length >= 2, "fewer than two real declared tenants");
  const client = resolveSide(resolveReal, RESOURCES.subject("almi-oet")).tenantId;
  for (const t of [client, ...tenants]) {
    const r = readRecordedReuse({ tenantId: t, resolve: resolveReal });
    assert.equal(r.answers.length, reps.length, "a repeat got no answer, or two");
    for (const a of r.answers) if (a.answer === "HIT") assert.equal(propertyTenant(records.find((x) => x.observation_id === a.record).target.ref, { resolve: resolveReal, origins: declaredOrigins() }).tenantId, t, "a record was served to a tenant that does not alone own it");
  }
  const r = readRecordedReuse({ tenantId: client, resolve: resolveReal });
  assert.match(r.bound, /freshness rule NONE DECLARED · source-change signals 0 · no re-research run, no call made/);
  console.log(`  REAL (count-only): ${r.bound} | ${JSON.stringify(r.summary)}`);
});

test("C5/C2 · REAL records in a declared world: when ONE tenant owns the property the recorded repeats are served, with their recorded request counts — and when the property spans two tenants, neither is served", () => {
  const records = createJsonlStore(EVIDENCE_STORE).readAll();
  const reps = recordedRepeats(records);
  const originsOf = (x) => { try { return new URL(x.request.target.ref).origin; } catch { return null; } };
  const urlPrefix = [...new Set(reps.map(originsOf).filter(Boolean))];
  const domainRefs = [...new Set(reps.map((x) => x.request.target.ref).filter((ref) => String(ref).startsWith("sc-domain:")))];
  assert.ok(urlPrefix.length > 0 && domainRefs.length > 0, "the real repeats hold no URL-prefix or no domain property — this proof would be vacuous");
  /* WORLD 1: every real attachment is the fixture tenant's, and the real URL-prefix origins are declared to it too (derived, never typed) */
  const one = declaredWorld({ extra: urlPrefix.map((o) => ["SITE_ORIGIN", o]) });
  let served;
  try {
    const env = one.envWith();
    const r = readRecordedReuse({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env });
    /* hand-derived per repeat: no property → OUTSIDE SCOPE; owned but unwindowed with no declared rule → FRESHNESS NOT DECLARED; owned and windowed → served */
    const owned = reps.filter((x) => x.request.target.ref !== "*");
    const windowed = owned.filter((x) => x.request.window);
    const recordOf = (x) => records.find((o) => o.record_type === "observation" && o.method === x.request.method && o.target.ref === x.request.target.ref && o.value?.startDate === x.request.window.startDate && o.value?.endDate === x.request.window.endDate);
    const expectedCalls = windowed.reduce((s, x) => s + (Number.isInteger(recordOf(x)?.value?.requestCount) ? recordOf(x).value.requestCount : 0), 0);
    assert.equal(r.summary.served, windowed.length, "real repeats owned by one tenant, over their own window, were not served to it");
    assert.deepEqual(r.summary.misses, { OUTSIDE_SCOPE: reps.length - owned.length, FRESHNESS_NOT_DECLARED: owned.length - windowed.length });
    assert.equal(r.summary.meteredRequestsServed, expectedCalls, "the metered requests counted as served are not the ones the served records recorded");
    assert.equal(r.summary.servedWithRequestCountNotRecorded, windowed.filter((x) => !Number.isInteger(recordOf(x)?.value?.requestCount)).length, "a served record with no recorded request count was counted as zero calls, not as unrecorded");
    served = r.summary.served;
  } finally { one.cleanup(); }
  assert.ok(served > 0);
  /* WORLD 2: one declared origin under the real domain property belongs to a SECOND tenant — the property now spans two tenants */
  const env0 = declaredWorld();
  let covered;
  try { covered = declaredOrigins({ env: env0.envWith() }).map((o) => o.host).filter((h) => domainRefs.some((d) => h === d.slice(10) || h.endsWith(`.${d.slice(10)}`))); } finally { env0.cleanup(); }
  assert.ok(covered.length > 0, "no declared origin lies under the real domain property");
  const two = declaredWorld({ extra: urlPrefix.map((o) => ["SITE_ORIGIN", o]), secondTenantOrigins: [`https://${covered[0]}`] });
  try {
    const env = two.envWith();
    const domainRepeats = reps.filter((x) => String(x.request.target.ref).startsWith("sc-domain:")).length;
    for (const t of [FIXTURE_TENANT, SECOND_FIXTURE_TENANT]) {
      const r = readRecordedReuse({ tenantId: t, resolve: createTenantResolver({ env }), env });
      const refused = r.answers.filter((a, i) => String(reps[i].request.target.ref).startsWith("sc-domain:") && a.miss === MISS.OUTSIDE_SCOPE).length;
      assert.equal(refused, domainRepeats, `a record spanning two tenants was served to ${t === FIXTURE_TENANT ? "the first" : "the second"}`);
    }
  } finally { two.cleanup(); }
});

/* ================= C6 — nothing collected ================= */

test("C6 · THE ENTRY POINT: in a declared world it prints this tenant's answers with its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/evidence-cache.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const r = readRecordedReuse({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env });
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ held record\(s\)/);
    assert.match(ok.stdout, new RegExp(`served\\s+${r.summary.served} of ${r.summary.repeats} recorded repeat`), "the entry point printed another tenant's answers");
    assert.match(ok.stdout, /re-research REQUIRED, and none was run/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C6 · the cache and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/evidence/evidence-cache.mjs", "src/evidence/evidence-cache-real.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
