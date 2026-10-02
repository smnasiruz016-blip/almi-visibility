/**
 * F23 · INTERNAL AND EXTERNAL LINK AUDIT (acceptance _handoffs d3c8e79, RR-111).
 *
 * Every expected count below is written by hand from its fixture. Fixtures DRIVE the rules; they never stand in for the real population —
 * the REAL test reads every declared client's own recorded partition and is the only source of the row's reported figures. Nothing is
 * fetched, rendered or followed; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { auditLinks, linksOf, targetState, formatPart, STATE, VERDICT, MISSING, OWNER_LINK_RULE } from "../src/audit/link-audit.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { readClientLinkAudit, recordedTargets, canon } from "../src/audit/link-audit-reader.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

const SITE = "https://site.example/";
const page = (path, body, extra = {}) => ({ canonical: SITE + path, html: body === null ? null : `<!doctype html><html lang="en"><head><title>T</title></head><body>${body}</body></html>`, ...extra });
const rec = (status, more = {}) => ({ status, error: null, skipped: false, ...more });
const run = (pages, records = {}, zeroInbound = []) => auditLinks({ pages, recordsOf: (u) => records[u] ?? [], zeroInbound, canon });

/* ================= C1 — one client's recorded links, one per occurrence ================= */

test("C1 · every <a href> is read once per occurrence; comments, script, style and template are not links; skipped hrefs are not links", () => {
  const html = '<a href="/a">A</a><a href="/a">A again</a><a href="https://other.example/x">X</a>'
    + '<!-- <a href="/c">c</a> --><script>var s = \'<a href="/s">s</a>\';</script><template><a href="/t">t</a></template>'
    + '<a href="#top">top</a><a href="mailto:a@b.example">m</a><a href="javascript:void 0">j</a><a name="n">no href</a>';
  const ls = linksOf(html, SITE);
  assert.deepEqual(ls.map((l) => l.to), [SITE + "a", SITE + "a", "https://other.example/x"]);
  assert.equal(run([page("", html)]).links, 3, "a link was dropped, invented or counted once for two occurrences");
});

test("C1 · FIRING CONTROL: an unclosed anchor still counts its target, and its name is NOT MEASURED — never guessed", () => {
  const ls = linksOf('<a href="/one">One<a href="/two">Two</a><a href="/three">', SITE);
  assert.deepEqual(ls.map((l) => l.to), [SITE + "one", SITE + "two", SITE + "three"]);
  assert.ok(ls.every((l) => l.name === null), "a name was attached to an anchor it could not be aligned with");
  const a = run([page("", '<a href="/one">One<a href="/two">Two</a>')]);
  assert.equal(a.parts.anchorName.counts.notMeasured, 2);
  assert.equal(a.parts.anchorName.counts.nameless, 0);
});

test("C1 · a page with no stored body is counted ABSENT and named; a truncated body makes the population INCOMPLETE", () => {
  const a = run([page("", '<a href="/b">B</a>'), page("b", null)], { [SITE + "b"]: [rec(200)] });
  assert.equal(a.absentPages, 1);
  assert.ok(a.absent.some((s) => s.startsWith("1 of 2 page(s) have no stored body")));
  assert.equal(a.parts.internal.verdict, VERDICT.COULD_NOT_PROVE, "a part read PROVED over a page that was never read");
  const t = run([page("", '<a href="/">Home</a>', { truncated: true })], { [SITE]: [rec(200)] });
  assert.equal(t.truncatedPages, 1);
  assert.ok(t.absent.some((s) => s.startsWith("1 of 1 stored bod(ies) were truncated")));
  assert.equal(t.parts.internal.verdict, VERDICT.COULD_NOT_PROVE);
});

/* ================= C2 / C3 — target status from the record only ================= */

test("C2 · each recorded status class maps as frozen; anything else, a skip, an error, no record or a disagreement is NOT MEASURED", () => {
  const cases = [
    [[rec(200)], STATE.WORKING], [[rec(204)], STATE.WORKING], [[rec(301)], STATE.REDIRECTED], [[rec(308)], STATE.REDIRECTED],
    [[rec(404)], STATE.BROKEN], [[rec(410)], STATE.BROKEN], [[rec(500)], STATE.BROKEN], [[rec(503)], STATE.BROKEN],
    [[rec(199)], STATE.NOT_MEASURED], [[rec(600)], STATE.NOT_MEASURED], [[rec(null)], STATE.NOT_MEASURED],
    [[rec(null, { error: "ECONNRESET" })], STATE.NOT_MEASURED], [[rec(200, { error: "timeout" })], STATE.NOT_MEASURED],
    [[rec(null, { skipped: true })], STATE.NOT_MEASURED], [[rec(200, { skipped: true })], STATE.NOT_MEASURED], [[], STATE.NOT_MEASURED],
    [[rec(200), rec(200)], STATE.WORKING], [[rec(200), rec(404)], STATE.NOT_MEASURED], [[rec(200), rec(null, { skipped: true })], STATE.NOT_MEASURED],
  ];
  for (const [recs, want] of cases) assert.equal(targetState(recs), want, `${JSON.stringify(recs)} → ${targetState(recs)}, frozen ${want}`);
});

test("C2 · FIRING CONTROL: an internal link to a recorded 404 is BROKEN and makes the part DISPROVED; to an unrecorded page it is NOT MEASURED", () => {
  const records = { [SITE + "gone"]: [rec(404)], [SITE + "ok"]: [rec(200)] };
  const a = run([page("", '<a href="/gone">Gone</a><a href="/ok">OK</a><a href="/never">Never</a>')], records);
  assert.deepEqual(a.parts.internal.counts, { [STATE.WORKING]: 1, [STATE.REDIRECTED]: 0, [STATE.BROKEN]: 1, [STATE.NOT_MEASURED]: 1 });
  assert.equal(a.parts.internal.verdict, VERDICT.DISPROVED);
  const fine = run([page("", '<a href="/ok">OK</a>')], records);
  assert.equal(fine.parts.internal.verdict, VERDICT.PROVED, "a fully measured, unbroken internal population did not read PROVED");
});

test("C2 · the reader lists every observation under its requested AND final URL, and a robots skip carries no status", () => {
  const m = recordedTargets([
    { record_type: "observation", observation_id: "o1", value: { requested_url: SITE + "old", final_url: SITE + "new", status: 200 } },
    { record_type: "observation", observation_id: "o2", value: { requested_url: SITE + "private", skipped: true } },
    { record_type: "provenance", value: { requested_url: SITE + "p" } },
  ]);
  assert.deepEqual([...m.keys()].sort(), [SITE + "new", SITE + "old", SITE + "private"]);
  assert.equal(targetState(m.get(SITE + "old")), STATE.WORKING);
  assert.equal(targetState(m.get(SITE + "private")), STATE.NOT_MEASURED);
});

test("C3 · FIRING CONTROL: an unfetched external destination is NOT MEASURED — never working, broken, a pass, a failure or 0", () => {
  const a = run([page("", '<a href="https://other.example/a">A</a><a href="https://other.example/b">B</a>')]);
  assert.deepEqual(a.parts.external.counts, { [STATE.WORKING]: 0, [STATE.REDIRECTED]: 0, [STATE.BROKEN]: 0, [STATE.NOT_MEASURED]: 2 });
  assert.equal(a.parts.external.verdict, VERDICT.COULD_NOT_PROVE);
  const line = formatPart("EXTERNAL", a.parts.external);
  assert.match(line, /WORKING, REDIRECTED and BROKEN are NOT MEASURED · NOT MEASURED 2 of 2/);
  assert.doesNotMatch(line, /BROKEN 0|WORKING 0/, "an unmeasured class was printed as 0");
  const observed = run([page("", '<a href="https://other.example/a">A</a>')], { "https://other.example/a": [rec(500)] });
  assert.equal(observed.parts.external.counts[STATE.BROKEN], 1, "a RECORDED external status was not used");
  assert.match(formatPart("EXTERNAL", observed.parts.external), /BROKEN 1 \(of 1 measured\)/);
});

/* ================= C4 — anchor name ================= */

test("C4 · FIRING CONTROL: a link with no accessible name is an ANCHOR PROBLEM; text, aria-label, image alt or title name it; aria-labelledby is NOT MEASURED", () => {
  const a = run([page("", '<a href="/1"> </a><a href="/2"><img src="i.png"></a><a href="/3">&nbsp;</a>'
    + '<a href="/4">Fees</a><a href="/5" aria-label="Fees"></a><a href="/6"><img src="i.png" alt="Fees"></a><a href="/7" title="Fees"></a>'
    + '<span id="l">Fees</span><a href="/8" aria-labelledby="l"></a>')]);
  assert.deepEqual(a.parts.anchorName.counts, { named: 4, nameless: 3, notMeasured: 1 });
  assert.equal(a.parts.anchorName.needsAPerson, 4, "a present name was judged instead of being left for a person");
  assert.equal(a.parts.anchorName.verdict, VERDICT.DISPROVED);
  const named = run([page("", '<a href="/4">Fees</a>')]);
  assert.equal(named.parts.anchorName.verdict, VERDICT.PROVED, "a fully named, fully read population did not read PROVED");
});

/* ================= C5 / C6 — orphaned, hidden, excessive, weakly contextual ================= */

test("C5 · zero inbound is UNKNOWN, never orphan; hidden is NOT MEASURED for every link with the missing rendered page named", () => {
  const a = run([page("", '<a href="/a">A</a>'), page("a", "no links")], {}, [SITE]);
  assert.equal(a.parts.orphaned.unknown, 1);
  assert.equal(a.parts.orphaned.denominator, 2);
  assert.equal(a.parts.orphaned.verdict, VERDICT.COULD_NOT_PROVE);
  assert.ok(a.absent.some((s) => /1 of 2 page\(s\) have no inbound link in raw HTML — UNKNOWN, never orphan/.test(s)));
  assert.deepEqual([a.parts.hidden.notMeasured, a.parts.hidden.denominator, a.parts.hidden.verdict], [1, 1, VERDICT.COULD_NOT_PROVE]);
  assert.match(a.parts.hidden.missing, /a rendered page/);
});

test("C6 · excessive and weakly contextual are NOT MEASURED at ANY link count — no boundary exists in the code to invent", () => {
  for (const n of [1, 50, 5000]) {
    const a = run([page("", Array.from({ length: n }, (_, i) => `<a href="/p${i}">click here</a>`).join(""))]);
    assert.equal(a.parts.excessive.verdict, VERDICT.COULD_NOT_PROVE, `${n} links were judged excessive or not`);
    assert.equal(a.parts.weaklyContextual.verdict, VERDICT.COULD_NOT_PROVE, `"click here" x${n} was judged weak or not`);
    assert.equal(a.parts.weaklyContextual.notMeasured, n);
  }
  /* RR-129 §5: the owner DID declare the boundary (RR-127 §2) — the output may no longer say "none is declared". It names the rule and
   * the per-link record still missing; no count, threshold or default appears (the source scan below). */
  assert.doesNotMatch(MISSING.excessive + MISSING.weaklyContextual, /none is declared/, "the output still claims the owner declared nothing");
  assert.match(MISSING.excessive, /owner declared no maximum link count \(RR-127 §2\), so a link is never excessive by count/);
  assert.match(MISSING.weaklyContextual, /a relevant purpose, real context and a usable destination \(RR-127 §2\)/);
  assert.match(MISSING.weaklyContextual, /^a recorded judgement of each link's purpose and context/);
  /* the cited rule is pinned to the owner's command record as the authority register holds it: CURRENT, and the same content hash */
  const rec = AUTHORITY_CORPUS.find((r) => r.propositionId === OWNER_LINK_RULE.propositionId);
  assert.equal(rec?.status, "CURRENT", "the cited command record is not CURRENT in the register");
  assert.equal(rec.contentHash, OWNER_LINK_RULE.contentHash, "the cited rule no longer points at the record the register holds");
  const src = readFileSync(join(REPO, "src/audit/link-audit.mjs"), "utf8");
  assert.doesNotMatch(src, /excessive[^\n]*[<>]=?\s*\d|weak[^\n]*[<>]=?\s*\d|(MAX|LIMIT|THRESHOLD|BOUNDARY)_?[A-Z_]*\s*=\s*\d/i, "a numeric boundary appeared in the F23 source");
});

/* ================= C7 — denominators, incompleteness, three verdicts ================= */

test("C7 · FIRING CONTROL: every part carries its denominator; any NOT MEASURED makes the population INCOMPLETE; the whole row is never PROVED while hidden is unmeasured", () => {
  const a = run([page("", '<a href="/ok">OK</a>')], { [SITE + "ok"]: [rec(200)] });
  for (const [k, p] of Object.entries(a.parts)) assert.equal(typeof p.denominator, "number", `${k} has no denominator`);
  assert.equal(a.parts.internal.verdict, VERDICT.PROVED);
  assert.equal(a.incomplete, true);
  assert.ok(a.absent.some((s) => s.startsWith("hidden:")));
  assert.equal(a.verdict, VERDICT.COULD_NOT_PROVE, "a row read PROVED with a part unmeasured");
  const broken = run([page("", '<a href="/x">X</a>')], { [SITE + "x"]: [rec(500)] });
  assert.equal(broken.verdict, VERDICT.DISPROVED);
  const empty = run([]);
  assert.equal(empty.parts.internal.verdict, VERDICT.COULD_NOT_PROVE, "an empty population read PROVED");
  assert.equal(empty.parts.anchorName.verdict, VERDICT.COULD_NOT_PROVE);
});

/* ================= REAL — every declared client's own recorded partition ================= */

test("REAL · every declared client: counts add up to their denominators, unfetched destinations are NOT MEASURED, no client reads PROVED", () => {
  const resolve = createTenantResolver();
  const d = readDeclarations();
  const tenants = (d.tenants?.tenants ?? d.tenants).map((t) => t.tenantId);
  assert.ok(tenants.length > 0, "EMPTY client population");
  const sum = (o) => Object.values(o).reduce((x, y) => x + y, 0);
  const T = { clients: 0, pages: 0, links: 0, internal: {}, external: {}, anchor: { named: 0, nameless: 0, notMeasured: 0 }, zeroInbound: 0, verdicts: {} };
  for (const tenantId of tenants) {
    const { audit: a } = readClientLinkAudit({ tenantId, resolve });
    assert.equal(sum(a.parts.internal.counts) + sum(a.parts.external.counts), a.links, "a link is in neither part, or in both");
    assert.equal(sum(a.parts.anchorName.counts), a.links, "a link has no anchor class");
    assert.notEqual(a.verdict, VERDICT.PROVED);
    T.clients += 1; T.pages += a.pages; T.links += a.links; T.zeroInbound += a.parts.orphaned.unknown;
    for (const k of Object.values(STATE)) { T.internal[k] = (T.internal[k] ?? 0) + a.parts.internal.counts[k]; T.external[k] = (T.external[k] ?? 0) + a.parts.external.counts[k]; }
    for (const k of Object.keys(T.anchor)) T.anchor[k] += a.parts.anchorName.counts[k];
    T.verdicts[a.verdict] = (T.verdicts[a.verdict] ?? 0) + 1;
  }
  assert.ok(T.links > 0, "EMPTY link population");
  console.log(`  REAL (count-only, every declared client's own 12 September partition; RR-107 records not read): ${JSON.stringify(T)}`);
});

/* ================= the entry point, isolation, no network ================= */

test("C1 · THE ENTRY POINT: in a declared world it prints this tenant's links with every denominator, no URL, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/link-audit.mjs"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const r = readClientLinkAudit({ tenantId: FIXTURE_TENANT, resolve: createTenantResolver({ env }), env });
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ page\(s\)/);
    assert.ok(ok.stdout.includes(formatPart("INTERNAL", r.audit.parts.internal)), "the entry point printed another tenant's links");
    assert.ok(ok.stdout.includes(formatPart("EXTERNAL", r.audit.parts.external)));
    assert.match(ok.stdout, /ORPHANED: .* UNKNOWN, never orphan/);
    assert.match(ok.stdout, /EXCESSIVE: NOT MEASURED \d+ of \d+ — missing a recorded judgement of each link's purpose — the owner declared no maximum link count/);
    assert.match(ok.stdout, /WEAKLYCONTEXTUAL: NOT MEASURED \d+ of \d+ — missing a recorded judgement of each link's purpose and context/);
    assert.doesNotMatch(ok.stdout, /none is declared/, "the entry point still claims the owner declared nothing");
    assert.match(ok.stdout, /population\s+(INCOMPLETE — absent: |COMPLETE)/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C1 · the audit and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/audit/link-audit.mjs", "src/audit/link-audit-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
