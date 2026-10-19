/**
 * F62 · C9 (Acceptance Amendment 1, _handoffs 94a6d17, RR-283 item 9) · the verdict of each derived check stands on the verbatim official
 * text — OFFICIAL with an excerpt found word for word in the stored text of the deciding body's own page, the CHECKED_NOT_FOUND line, or
 * BLOCKED with its reason. Firing controls on fixtures; the REAL result over the 24 derived checks of the declared product, judged against
 * the verdicts filed in its research batch and the stored reads of its one bounded read. Nothing fetched, nothing written; the production
 * trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { judgeCheck, judgeChecks, VERDICT_KIND, VERDICT_REFUSAL, checksWithVerdicts, cellsOnKey, cellFor, LICENCE_BARS, NOT_NAMED } from "../src/research/applicability-verdicts.mjs";
import { readDerivedDeclaration } from "../src/research/applicability-declaration-reader.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { withPrivateTexts, privateSourcesRoot } from "../src/facts/private-texts.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

/* a check of one body and scope, its two records citing two pages; one page read, one barred by its licence, one read blocked */
const PAGE_A = "https://body.invalid/a", PAGE_B = "https://body.invalid/b", PAGE_C = "https://body.invalid/c";
const facts = [
  { id: "r1", source: { url: PAGE_A } }, { id: "r2", source: { url: PAGE_B }, sourceQuotable: false }, { id: "r3", source: { url: PAGE_C } },
];
const check = (ids) => ({ body: "body-x", scope: { k: "v" }, provenance: ids.map((factId) => ({ factId })) });
const reads = [
  { url: PAGE_A, state: "READ", text: "Intro. The body accepts the declared test as evidence. More.", readOn: "2026-10-17" },
  { url: PAGE_C, state: "BLOCKED", reason: "CHALLENGE" },
];
const filed = (v) => [{ body: "body-x", scope: { k: "v" }, ...v }];
const judge = (ids, v, over = {}) => judgeCheck(check(ids), { facts, reads, filed: filed(v), ...over });

test("C9 · OFFICIAL · FIRING CONTROL: a verdict stands only with an excerpt found word for word in the stored text of a page the check's own records cite — never inferred, never paraphrased", () => {
  const ok = judge(["r1"], { kind: "OFFICIAL", outcome: "ACCEPTED", page: PAGE_A, excerpt: "The body accepts the declared test as evidence." });
  assert.deepEqual([ok.kind, ok.outcome, ok.page, ok.readOn], [VERDICT_KIND.OFFICIAL, "ACCEPTED", PAGE_A, "2026-10-17"]);
  for (const [why, v, code] of [
    ["a paraphrase", { kind: "OFFICIAL", outcome: "ACCEPTED", page: PAGE_A, excerpt: "The body takes the declared test." }, VERDICT_REFUSAL.NOT_VERBATIM],
    ["another body's page", { kind: "OFFICIAL", outcome: "ACCEPTED", page: "https://other.invalid/x", excerpt: "The body accepts the declared test as evidence." }, VERDICT_REFUSAL.NOT_A_CITED_PAGE],
    ["a page with no stored text", { kind: "OFFICIAL", outcome: "ACCEPTED", page: PAGE_C, excerpt: "x accepts" }, VERDICT_REFUSAL.NO_STORED_TEXT],
    ["an outcome that is not stated", { kind: "OFFICIAL", outcome: "UNKNOWN", page: PAGE_A, excerpt: "The body accepts the declared test as evidence." }, VERDICT_REFUSAL.BAD_OUTCOME],
  ]) {
    const r = judge(["r1", "r3"], v);
    assert.deepEqual([r.kind, r.fault], [undefined, code], `${why} decided the check`);
  }
});

test("C9 · CHECKED_NOT_FOUND · FIRING CONTROL: the line names what was not found, every cited page checked and the date — a cited page never read cannot have been checked", () => {
  const ok = judge(["r1"], { kind: "CHECKED_NOT_FOUND", notFound: "a statement on the test" });
  assert.deepEqual([ok.kind, ok.notFound, ok.pagesChecked, ok.checkedOn], [VERDICT_KIND.CHECKED_NOT_FOUND, "a statement on the test", [PAGE_A], "2026-10-17"]);
  assert.equal(judge(["r1"], { kind: "CHECKED_NOT_FOUND", notFound: " " }).fault, VERDICT_REFUSAL.NOT_FOUND_UNNAMED, "a line naming nothing stood");
  assert.equal(judge(["r1", "r3"], { kind: "CHECKED_NOT_FOUND", notFound: "a statement" }).fault, VERDICT_REFUSAL.PAGE_NOT_CHECKED, "a page never read was counted as checked");
});

test("C9 · BLOCKED · FIRING CONTROL: a page blocked in its latest read, or barred by its recorded licence, is BLOCKED with its reason — never NOT_REQUIRED; a readable page is not BLOCKED", () => {
  const blocked = judge(["r3"], { kind: "BLOCKED", page: PAGE_C });
  assert.deepEqual([blocked.kind, blocked.reason], [VERDICT_KIND.BLOCKED, "the page could not be read: CHALLENGE"]);
  const licence = judge(["r2"], { kind: "BLOCKED", page: PAGE_B });
  assert.equal(licence.reason, LICENCE_BARS);
  assert.equal(judge(["r1"], { kind: "BLOCKED", page: PAGE_A }).fault, VERDICT_REFUSAL.NOT_BLOCKED, "a readable page was taken as BLOCKED");
  assert.ok(!("outcome" in blocked), "a BLOCKED check carries an outcome");
});

test("C9 · READ BACK · FIRING CONTROL (RR-286, Amendment 2): a check takes its OFFICIAL verdict's outcome with what decided it; every other check carries CHECKED_NOT_FOUND or BLOCKED with the verdict's reason — never NOT_REQUIRED, never UNKNOWN", () => {
  const declaration = { checks: [{ body: "b1", scope: { k: "v" }, outcome: "UNKNOWN", why: "no source" }, { body: "b2", scope: { k: "v" }, outcome: "UNKNOWN", why: "no source" }, { body: "b3", scope: {}, outcome: "UNKNOWN", why: "no source" }] };
  const judged = { rows: [
    { body: "b1", scope: { k: "v" }, kind: VERDICT_KIND.OFFICIAL, outcome: "ACCEPTED", excerpt: "x accepted", page: "https://b1.example/p", readOn: "2026-10-17" },
    { body: "b2", scope: { k: "v" }, kind: VERDICT_KIND.CHECKED_NOT_FOUND, notFound: "no rule on x", pagesChecked: ["https://b2.example/p"], checkedOn: "2026-10-17" },
    { body: "b3", scope: {}, kind: VERDICT_KIND.BLOCKED, page: "https://b3.example/p", reason: "the page could not be read: CHALLENGE" },
  ] };
  const r = checksWithVerdicts({ declaration, judged });
  assert.deepEqual(r.checks.map((c) => c.outcome), ["ACCEPTED", "CHECKED_NOT_FOUND", "BLOCKED"]);
  assert.deepEqual(r.checks[0].decidedBy, { page: "https://b1.example/p", excerpt: "x accepted", readOn: "2026-10-17" });
  assert.match(r.checks[1].why, /^CHECKED_NOT_FOUND — no rule on x/);
  assert.match(r.checks[2].why, /^BLOCKED — /);
  const other = checksWithVerdicts({ declaration, judged: { rows: [{ ...judged.rows[0], body: "someone-else" }, ...judged.rows.slice(1)] } });
  assert.equal(other.checks[0].outcome, null, "another body's verdict decided this check");
  assert.equal(other.faults, 1);
  assert.deepEqual({ ...r.byOutcome }, { REQUIRED: 0, ACCEPTED: 1, NOT_REQUIRED: 0, CHECKED_NOT_FOUND: 1, BLOCKED: 1 });
  assert.equal(r.faults, 0);
});

test("C9 · ONE VERDICT PER CHECK: none filed or two filed is a FAULT, named — never a verdict; an unknown kind is refused", () => {
  const none = judgeCheck(check(["r1"]), { facts, reads, filed: [] });
  assert.deepEqual([none.kind, none.fault], [undefined, VERDICT_REFUSAL.NO_VERDICT]);
  const two = [...filed({ kind: "CHECKED_NOT_FOUND", notFound: "x" }), ...filed({ kind: "CHECKED_NOT_FOUND", notFound: "y" })];
  assert.equal(judgeCheck(check(["r1"]), { facts, reads, filed: two }).fault, VERDICT_REFUSAL.TWO_VERDICTS);
  assert.equal(judge(["r1"], { kind: "GUESS" }).fault, VERDICT_REFUSAL.UNKNOWN_KIND);
  assert.equal(judgeChecks({ declaration: { checks: [check(["r1"])] }, facts, reads, filed: [] }).counts.FAULTS, 1, "a fault was not counted apart");
});

test("A2 · LICENCE · FIRING CONTROL: a page whose record says its licence forbids storing its words never decides — even when a text of it is held and a verdict was filed, the check is BLOCKED by that licence, by name", () => {
  const held = [...reads, { url: PAGE_B, state: "READ", text: "The body accepts the declared test as evidence.", readOn: "2026-10-17" }];
  const off = judge(["r2"], { kind: "OFFICIAL", outcome: "ACCEPTED", page: PAGE_B, excerpt: "The body accepts the declared test as evidence." }, { reads: held });
  assert.deepEqual([off.kind, off.page, off.reason], [VERDICT_KIND.BLOCKED, PAGE_B, LICENCE_BARS], "a licence-barred page's held text decided a check");
  const cnf = judge(["r1", "r2"], { kind: "CHECKED_NOT_FOUND", notFound: "a rule" }, { reads: held });
  assert.deepEqual([cnf.kind, [...cnf.pages]], [VERDICT_KIND.BLOCKED, [PAGE_B]], "a licence-barred page was counted as checked");
  const none = judgeCheck(check(["r2"]), { facts, reads: held, filed: [] });
  assert.equal(none.kind, VERDICT_KIND.BLOCKED, "a licence-barred check with nothing filed was not BLOCKED by its licence");
  /* CONTROL: the same text on a page with no licence bar decides */
  const open = judge(["r1"], { kind: "OFFICIAL", outcome: "ACCEPTED", page: PAGE_A, excerpt: "The body accepts the declared test as evidence." }, { reads: held });
  assert.equal(open.kind, VERDICT_KIND.OFFICIAL);
});

test("A2 · NO UNKNOWN: no verdict kind, no check state and no count is named UNKNOWN", () => {
  assert.ok(!Object.values(VERDICT_KIND).includes("UNKNOWN"));
  const j = judgeChecks({ declaration: { checks: [check(["r1"]), check(["r3"])] }, facts, reads, filed: filed({ kind: "CHECKED_NOT_FOUND", notFound: "x" }) });
  assert.ok(!("UNKNOWN" in j.counts), "a count is named UNKNOWN");
  const back = checksWithVerdicts({ declaration: { checks: [check(["r1"])] }, judged: judgeChecks({ declaration: { checks: [check(["r1"])] }, facts, reads, filed: filed({ kind: "CHECKED_NOT_FOUND", notFound: "x" }) }) });
  assert.ok(!("UNKNOWN" in back.byOutcome) && back.checks.every((c) => c.outcome !== "UNKNOWN"), "a check state is UNKNOWN");
});

/* the key cells: two bodies, two values of each key; one record names no second value; both bodies carry one same pair of values */
const KF = [
  { id: "k1", source: { url: PAGE_A }, locale: { d: "d-one", p: "p-one" } },
  { id: "k2", source: { url: PAGE_A }, locale: { d: "d-one" } },
  { id: "k3", source: { url: PAGE_C }, locale: { d: "d-two", p: "p-one" } },
  { id: "k4", source: { url: PAGE_C }, locale: { d: "d-one", p: "p-one" } },
];
const kc = (body, ids, scope = {}) => ({ body, scope, provenance: ids.map((factId) => ({ factId })) });
const OFF = (body, scope = {}) => ({ body, scope, kind: VERDICT_KIND.OFFICIAL, outcome: "ACCEPTED", excerpt: "e", page: PAGE_A, readOn: "2026-10-17" });

test("A2 · THE KEY · FIRING CONTROL: a verdict speaks per deciding body × every key value its own records carry — one body's verdict never decides a whole value, another body or a value it does not name", () => {
  const declaration = { checks: [kc("body-a", ["k1"], { x: "1" }), kc("body-a", ["k2"]), kc("body-b", ["k3"]), kc("body-b", ["k4"], { y: "1" })] };
  const judged = { rows: [OFF("body-a", { x: "1" }), { body: "body-a", scope: {}, kind: VERDICT_KIND.CHECKED_NOT_FOUND, notFound: "n", pagesChecked: [PAGE_A], checkedOn: "2026-10-17" }, { body: "body-b", scope: {}, kind: VERDICT_KIND.BLOCKED, page: PAGE_C, pages: [PAGE_C], reason: "r" }, { body: "body-b", scope: { y: "1" }, kind: VERDICT_KIND.CHECKED_NOT_FOUND, notFound: "m", pagesChecked: [PAGE_C], checkedOn: "2026-10-17" }] };
  const k = cellsOnKey({ declaration, judged, facts: KF, keys: ["d", "p"] });
  assert.equal(k.measured, true);
  assert.deepEqual(k.cells.map((c) => [c.body, c.key.d, c.key.p, c.state]), [["body-a", "d-one", "p-one", "ACCEPTED"], ["body-a", "d-one", NOT_NAMED, "CHECKED_NOT_FOUND"], ["body-b", "d-two", "p-one", "BLOCKED"], ["body-b", "d-one", "p-one", "CHECKED_NOT_FOUND"]]);
  assert.equal(cellFor(k, "body-a", { d: "d-one", p: "p-one" }).state, "ACCEPTED");
  assert.equal(cellFor(k, "body-a", { d: "d-two", p: "p-one" }), null, "body-a's verdict decided a value it does not name");
  assert.equal(cellFor(k, "body-b", { d: "d-one", p: "p-one" }).state, "CHECKED_NOT_FOUND", "one body's verdict decided another body's cell of the same key values");
  assert.equal(cellFor(k, "body-a", { d: "d-one", p: "p-two" }), null, "a cell naming no second value decided a named one");
  assert.ok(!k.cells.some((c) => c.key.d === NOT_NAMED && c.key.p === "p-one"), "a whole value was decided across bodies or keys");
  assert.deepEqual({ ...k.counts }, { cells: 4, OFFICIAL: 1, REQUIRED: 0, ACCEPTED: 1, NOT_REQUIRED: 0, CHECKED_NOT_FOUND: 2, BLOCKED: 1, FAULTS: 0, bodies: 2 });
  assert.deepEqual([k.pagesCreated, k.pagesCounted], [0, 0]);
  /* OFFICIAL verdicts that disagree in one cell: a FAULT, none chosen */
  const two = cellsOnKey({ declaration: { checks: [kc("body-a", ["k1"], { x: "1" }), kc("body-a", ["k1"], { x: "2" })] }, judged: { rows: [OFF("body-a", { x: "1" }), { ...OFF("body-a", { x: "2" }), outcome: "REQUIRED" }] }, facts: KF, keys: ["d", "p"] });
  assert.deepEqual([two.cells[0].fault, two.cells[0].state], [VERDICT_REFUSAL.CONFLICT, undefined], "disagreeing OFFICIAL verdicts — one was chosen");
  /* ACCEPTED is never REQUIRED */
  assert.ok(!k.cells.some((c) => c.state === "REQUIRED"));
  /* no key declared: NOT MEASURED, the missing input named — never 0 */
  assert.deepEqual([cellsOnKey({ declaration, judged, facts: KF, keys: [] }).measured, "counts" in cellsOnKey({ declaration, judged, facts: KF, keys: [] })], [false, false]);
});

/* REAL pins, re-measured on 18 Oct 2026 (RR-287, F62 Amendment 2) */
const PIN_CHECKS = { checks: 24, OFFICIAL: 4, REQUIRED: 0, ACCEPTED: 4, NOT_REQUIRED: 0, CHECKED_NOT_FOUND: 8, BLOCKED: 12, FAULTS: 0 };
const PIN_BACK = { REQUIRED: 0, ACCEPTED: 4, NOT_REQUIRED: 0, CHECKED_NOT_FOUND: 8, BLOCKED: 12 };
const PIN_CELLS = { cells: 12, OFFICIAL: 4, REQUIRED: 0, ACCEPTED: 4, NOT_REQUIRED: 0, CHECKED_NOT_FOUND: 3, BLOCKED: 5, FAULTS: 0, bodies: 9 };
const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const PRIV = privateSourcesRoot(process.env);
const HERE = existsSync(join(BATCH, "applicability-verdicts-2026-10-17.json")) && PRIV.state === "DECLARED";
test("REAL · C9 on the declared product (Amendment 2): every one of its 24 derived checks carries OFFICIAL, CHECKED_NOT_FOUND or BLOCKED — none UNKNOWN, no fault; and its key cells", { skip: HERE ? false : "the batch's verdicts or the private sources are not on this machine" }, async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const records = (await loadRegistry(product.factsDir, product.productId)).records;
  const declaration = await readDerivedDeclaration({ product, tenantId: null, resolve: null, on: "2026-10-17" });
  const rows = (d, f) => readFileSync(join(d, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const reads = withPrivateTexts(rows(BATCH, "source-reads.jsonl"), rows(join(PRIV.dir, "research", "rr254-test-pages-2026-10-12"), "source-reads.jsonl"));
  const { verdicts } = JSON.parse(readFileSync(join(BATCH, "applicability-verdicts-2026-10-17.json"), "utf8"));
  const j = judgeChecks({ declaration, facts: records, reads, filed: verdicts });
  assert.equal(j.counts.checks, 24, "the derived checks moved — re-measure");
  assert.equal(j.counts.FAULTS, 0, `a check has no verdict: ${JSON.stringify(j.rows.filter((r) => !r.kind).map((r) => [r.body, r.fault]))}`);
  for (const r of j.rows.filter((x) => x.kind === VERDICT_KIND.OFFICIAL)) assert.ok(r.excerpt && r.page && /^\d{4}-\d{2}-\d{2}$/.test(r.readOn ?? ""), `${r.body}: an official verdict without its excerpt, page or date`);
  /* no OFFICIAL verdict rests on a page whose licence forbids storing its words */
  const barred = new Set(records.filter((f) => f.sourceQuotable === false).map((f) => f.source?.url));
  assert.ok(!j.rows.some((r) => r.kind === VERDICT_KIND.OFFICIAL && barred.has(r.page)), "a licence-barred page decided a check");
  assert.ok(!j.rows.some((r) => r.kind === VERDICT_KIND.CHECKED_NOT_FOUND && r.pagesChecked.some((u) => barred.has(u))), "a licence-barred page was counted as checked");
  /* pins — re-measured on 18 Oct 2026 (RR-287): the licence bar moved 2 OFFICIAL and 8 CHECKED_NOT_FOUND checks to BLOCKED */
  assert.deepEqual({ ...j.counts }, PIN_CHECKS);
  const back = checksWithVerdicts({ declaration, judged: j });
  assert.deepEqual({ ...back.byOutcome }, PIN_BACK);
  assert.equal(back.faults, 0);
  assert.ok(back.checks.filter((c) => c.outcome === "ACCEPTED").every((c) => c.decidedBy?.excerpt && c.decidedBy?.page && c.decidedBy?.readOn));
  assert.ok(back.checks.filter((c) => c.decidedBy === null).every((c) => /^(CHECKED_NOT_FOUND|BLOCKED) — /.test(c.why)));
  /* the key cells, on the key the batch files (beta-g decision B: profession × destination × deciding body) */
  const { keys } = JSON.parse(readFileSync(join(BATCH, "applicability-key-2026-10-18.json"), "utf8"));
  const k = cellsOnKey({ declaration, judged: j, facts: records, keys });
  assert.equal(k.counts.FAULTS, 0);
  assert.ok(k.counts.cells > 0, "EMPTY real population");
  assert.deepEqual({ ...k.counts }, PIN_CELLS);
  console.log(`  REAL (count-only): checks ${j.counts.checks} · OFFICIAL ${j.counts.OFFICIAL} (ACCEPTED ${j.counts.ACCEPTED}, REQUIRED ${j.counts.REQUIRED}, NOT_REQUIRED ${j.counts.NOT_REQUIRED}) · CHECKED_NOT_FOUND ${j.counts.CHECKED_NOT_FOUND} · BLOCKED ${j.counts.BLOCKED} · faults ${j.counts.FAULTS} · key cells ${JSON.stringify(k.counts)}`);
});

test("ENTRY · bin/applicability-verdicts.mjs: counts only — no body, excerpt or page printed; a bad call is a usage exit and reads nothing", { skip: HERE ? false : "the batch's verdicts or the private sources are not on this machine" }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/applicability-verdicts.mjs", "--product=almi-oet", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--research-batch=rr254-test-pages-2026-10-12", "--verdicts=applicability-verdicts-2026-10-17.json", "--key=applicability-key-2026-10-18.json", "--on=2026-10-17"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /official {9}4: REQUIRED 0 · ACCEPTED 4 · NOT_REQUIRED 0/);
  assert.match(r.stdout, /not found {8}8 — /);
  assert.match(r.stdout, /blocked {10}12 — /);
  assert.match(r.stdout, /faults {11}0/);
  assert.doesNotMatch(r.stdout, /UNKNOWN|unknown/);
  assert.doesNotMatch(r.stdout, /https?:\/\//, "a page was printed");
  assert.equal(go(["--research-batch=rr254-test-pages-2026-10-12", "--verdicts=other.json", "--on=2026-10-17"]).status, 2);
});

test("the verdict judge names no product and loads no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/research/applicability-verdicts.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
