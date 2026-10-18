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

import { judgeCheck, judgeChecks, VERDICT_KIND, VERDICT_REFUSAL } from "../src/research/applicability-verdicts.mjs";
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
    assert.deepEqual([r.kind, r.refused], [VERDICT_KIND.UNKNOWN, code], `${why} decided the check`);
  }
});

test("C9 · CHECKED_NOT_FOUND · FIRING CONTROL: the line names what was not found, every cited page checked and the date — a cited page never read cannot have been checked", () => {
  const ok = judge(["r1"], { kind: "CHECKED_NOT_FOUND", notFound: "a statement on the test" });
  assert.deepEqual([ok.kind, ok.notFound, ok.pagesChecked, ok.checkedOn], [VERDICT_KIND.CHECKED_NOT_FOUND, "a statement on the test", [PAGE_A], "2026-10-17"]);
  assert.equal(judge(["r1"], { kind: "CHECKED_NOT_FOUND", notFound: " " }).refused, VERDICT_REFUSAL.NOT_FOUND_UNNAMED, "a line naming nothing stood");
  assert.equal(judge(["r1", "r3"], { kind: "CHECKED_NOT_FOUND", notFound: "a statement" }).refused, VERDICT_REFUSAL.PAGE_NOT_CHECKED, "a page never read was counted as checked");
});

test("C9 · BLOCKED · FIRING CONTROL: a page blocked in its latest read, or barred by its recorded licence, is BLOCKED with its reason — never NOT_REQUIRED; a readable page is not BLOCKED", () => {
  const blocked = judge(["r3"], { kind: "BLOCKED", page: PAGE_C });
  assert.deepEqual([blocked.kind, blocked.reason], [VERDICT_KIND.BLOCKED, "the page could not be read: CHALLENGE"]);
  const licence = judge(["r2"], { kind: "BLOCKED", page: PAGE_B });
  assert.match(licence.reason, /licence forbids storing its words/);
  assert.equal(judge(["r1"], { kind: "BLOCKED", page: PAGE_A }).refused, VERDICT_REFUSAL.NOT_BLOCKED, "a readable page was taken as BLOCKED");
  assert.ok(!("outcome" in blocked), "a BLOCKED check carries an outcome");
});

test("C9 · ONE VERDICT PER CHECK: none filed or two filed leaves the check UNKNOWN, named; an unknown kind is refused", () => {
  assert.equal(judgeCheck(check(["r1"]), { facts, reads, filed: [] }).refused, VERDICT_REFUSAL.NO_VERDICT);
  const two = [...filed({ kind: "CHECKED_NOT_FOUND", notFound: "x" }), ...filed({ kind: "CHECKED_NOT_FOUND", notFound: "y" })];
  assert.equal(judgeCheck(check(["r1"]), { facts, reads, filed: two }).refused, VERDICT_REFUSAL.TWO_VERDICTS);
  assert.equal(judge(["r1"], { kind: "GUESS" }).refused, VERDICT_REFUSAL.UNKNOWN_KIND);
});

const BATCH = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const PRIV = privateSourcesRoot(process.env);
const HERE = existsSync(join(BATCH, "applicability-verdicts-2026-10-17.json")) && PRIV.state === "DECLARED";
test("REAL · C9 on the declared product: every one of its 24 derived checks carries an official verdict, a CHECKED_NOT_FOUND line or BLOCKED — none UNKNOWN", { skip: HERE ? false : "the batch's verdicts or the private sources are not on this machine" }, async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const records = (await loadRegistry(product.factsDir, product.productId)).records;
  const declaration = await readDerivedDeclaration({ product, tenantId: null, resolve: null, on: "2026-10-17" });
  const rows = (d, f) => readFileSync(join(d, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const reads = withPrivateTexts(rows(BATCH, "source-reads.jsonl"), rows(join(PRIV.dir, "research", "rr254-test-pages-2026-10-12"), "source-reads.jsonl"));
  const { verdicts } = JSON.parse(readFileSync(join(BATCH, "applicability-verdicts-2026-10-17.json"), "utf8"));
  const j = judgeChecks({ declaration, facts: records, reads, filed: verdicts });
  assert.equal(j.counts.checks, 24, "the derived checks moved — re-measure");
  assert.equal(j.counts.UNKNOWN, 0, `a check is UNKNOWN: ${JSON.stringify(j.rows.filter((r) => r.kind === "UNKNOWN").map((r) => [r.body, r.refused]))}`);
  for (const r of j.rows.filter((x) => x.kind === VERDICT_KIND.OFFICIAL)) assert.ok(r.excerpt && r.page && /^\d{4}-\d{2}-\d{2}$/.test(r.readOn ?? ""), `${r.body}: an official verdict without its excerpt, page or date`);
  /* pins — re-measured on 17 Oct 2026 */
  assert.deepEqual({ ...j.counts }, { checks: 24, OFFICIAL: 6, REQUIRED: 0, ACCEPTED: 6, NOT_REQUIRED: 0, CHECKED_NOT_FOUND: 16, BLOCKED: 2, UNKNOWN: 0 });
  console.log(`  REAL (count-only): checks ${j.counts.checks} · official ${j.counts.OFFICIAL} (ACCEPTED ${j.counts.ACCEPTED}, REQUIRED ${j.counts.REQUIRED}, NOT_REQUIRED ${j.counts.NOT_REQUIRED}) · CHECKED_NOT_FOUND ${j.counts.CHECKED_NOT_FOUND} · BLOCKED ${j.counts.BLOCKED} · UNKNOWN ${j.counts.UNKNOWN}`);
});

test("ENTRY · bin/applicability-verdicts.mjs: counts only — no body, excerpt or page printed; a bad call is a usage exit and reads nothing", { skip: HERE ? false : "the batch's verdicts or the private sources are not on this machine" }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/applicability-verdicts.mjs", "--product=almi-oet", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--research-batch=rr254-test-pages-2026-10-12", "--verdicts=applicability-verdicts-2026-10-17.json", "--on=2026-10-17"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /official {9}6: REQUIRED 0 · ACCEPTED 6 · NOT_REQUIRED 0/);
  assert.match(r.stdout, /not found {8}16 — /);
  assert.match(r.stdout, /blocked {10}2 — /);
  assert.match(r.stdout, /unknown {10}0/);
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
