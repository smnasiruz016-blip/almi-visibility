/**
 * F44 · ACCEPTANCE AMENDMENT 2 (RR-268) · THE SOURCE READER — the engine reads an official page itself (C7), falls back to the client's
 * own browser route only when it is connected and started (C8), lets the client's own AI propose facts under the paid-provider controls
 * (C9), admits a fact only when its quotation is word for word in the stored page text (C10), and rechecks every fact on its recheck date
 * (C11) — named nowhere for a product, client, exam or host (C12).
 *
 * Fixtures DRIVE the mechanism on two unrelated subjects — a language test's rules page and a town's recycling rules page (outside the
 * exam family) — and prove the mechanism only. The production path runs the entry point in a scratch world with no egress. The REAL test
 * reads the declared batch's stored recheck, counts only. The production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { engineRead, browserRead, readSource, extractFacts, recheckFacts, recheckCounts, readRecord, recheckRecord, robotsOn, quotationIn, isOneSentence, dueOn,
  ROUTE, READ_STATE, BLOCK, RECHECK, REJECT, FALLBACK_ON, BROWSER_GAP_MS, SOURCE_READ, SOURCE_READ_RECORD, FACT_RECHECK_RECORD } from "../src/facts/source-reader.mjs";
import { batchFacts, quotationsOf, QUOTATION_MIN_CHARS } from "../src/facts/batch-facts.mjs";
import { createPaidProviderGate, createKillSwitch, createFakePaidProvider } from "../src/cost/paid-provider-gate.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { PACE_FLOOR_MS } from "../src/tenancy/connectors.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { classifyEntryPoint } from "../tools/tenant-scope-census.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-09-10";

/* ── two unrelated subjects ── */
const filler = (topic) => Array.from({ length: 12 }, (_, i) => `<p>Paragraph ${i + 1} about ${topic}, written in plain words so the page is a real document and not a stub.</p>`).join("");
const LANG = { url: "https://tests.invalid/rules", html: `<html><body><h1>Rules</h1><p>Each sub-test is scored from 0 to 500 and a score of 350 is a grade B.</p><p>Results arrive within &ldquo;ten&rdquo; working days.</p>${filler("the language test")}</body></html>` };
const TOWN = { url: "https://town.invalid/recycling", html: `<html><body><h1>Recycling</h1><p>Glass bottles go in the green bin, emptied every second Tuesday.</p><p>Batteries are taken at the depot only.</p>${filler("recycling")}</body></html>` };

/* a network handed in: each URL answers as declared; a robots file that is not declared answers 404 (no rules); every call is logged */
function network(pages = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const p = pages[String(url)];
    if (!p) return new Response("not here", { status: 404 });
    if (p.throws) throw new TypeError(p.throws);
    const r = new Response(p.body ?? "", { status: p.status ?? 200, headers: { "content-type": "text/html" } });
    if (p.landed) Object.defineProperty(r, "url", { value: p.landed });
    return r;
  };
  return { fetchImpl, calls };
}
const pagesOf = (...xs) => Object.fromEntries(xs.map((x) => [x.url, { body: x.html }]));
const fresh = () => ({ engineReads: 0, reads: 0, stopped: null });

/* ================= C7 · READ ================= */

test("C7 · FIRING CONTROL: the engine reads a public page itself — robots first through the same fetch, a plain GET with no credential, cookie or body; a disallowed path, an unreadable robots file and a login wall are not read past", async () => {
  for (const s of [LANG, TOWN]) {
    const n = network(pagesOf(s));
    const r = await engineRead(s.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
    assert.deepEqual([r.state, r.route, r.readOn, r.sha256, n.calls.map((c) => new URL(c.url).pathname)], [READ_STATE.READ, ROUTE.ENGINE, ON, createHash("sha256").update(r.text).digest("hex"), ["/robots.txt", new URL(s.url).pathname]], "robots is not read first, or the page is not read through the fetch handed in");
    const page = n.calls[1].init;
    assert.deepEqual([page.method, page.body, page.credentials, Object.keys(page.headers)], ["GET", undefined, "omit", ["User-Agent"]], "the request carries more than a plain public GET");
    assert.ok(!/<[a-z]/i.test(r.text) && r.text.includes("Paragraph 1"), "the stored text is not the page's words");
  }
  const robots = (rules, extra = {}) => network({ "https://tests.invalid/robots.txt": rules, [LANG.url]: { body: LANG.html }, ...extra });
  const dis = robots({ body: "User-agent: *\nDisallow: /rules\n" });
  assert.deepEqual([(await engineRead(LANG.url, { fetchImpl: dis.fetchImpl, robots: robotsOn(dis.fetchImpl), on: ON })).reason, dis.calls.length], [BLOCK.ROBOTS_DISALLOWED, 1], "a disallowed path was read");
  const broken = robots({ status: 500, body: "" });
  assert.deepEqual([(await engineRead(LANG.url, { fetchImpl: broken.fetchImpl, robots: robotsOn(broken.fetchImpl), on: ON })).reason, broken.calls.length], [BLOCK.ROBOTS_UNREADABLE, 1], "a page was read when its robots file could not be");
  const wall = network({ [LANG.url]: { body: `<form><input type="password" name="p"></form>${filler("x")}` } });
  assert.equal((await engineRead(LANG.url, { fetchImpl: wall.fetchImpl, robots: robotsOn(wall.fetchImpl), on: ON })).reason, BLOCK.LOGIN_WALL, "a login wall was read past");
  const sent = network({ [LANG.url]: { body: LANG.html, landed: "https://tests.invalid/account/login?next=/rules" } });
  assert.equal((await engineRead(LANG.url, { fetchImpl: sent.fetchImpl, robots: robotsOn(sent.fetchImpl), on: ON })).reason, BLOCK.LOGIN_WALL);
  const away = network({ [LANG.url]: { body: LANG.html, landed: "https://parked.invalid/" } });
  assert.equal((await engineRead(LANG.url, { fetchImpl: away.fetchImpl, robots: robotsOn(away.fetchImpl), on: ON })).reason, BLOCK.OFF_HOST);
  await assert.rejects(engineRead(LANG.url, { robots: robotsOn(async () => new Response("", { status: 404 })), on: ON }), /one paced path/, "the engine read without an opened connector's fetch");
  assert.equal(PACE_FLOOR_MS, 2000, "the paced path's floor is not 2 s");
});

/* ================= C8 · FALLBACK ================= */

test("C8 · FIRING CONTROL: a refusal, a challenge or an empty page goes to the client's own browser route only when it is connected and started — 5 s per host, a run cap, a stop on a captcha or login wall; with no route the source is BLOCKED with its URL, never an error", async () => {
  const refused = network({ [TOWN.url]: { status: 403, body: "no" } });
  const ask = (route, state = fresh(), paced = []) => readSource(TOWN.url, { fetchImpl: refused.fetchImpl, robots: robotsOn(refused.fetchImpl), route, state, on: ON, pace: async (u, gap) => { paced.push(gap); }, hosts: new Map() });
  const none = await ask(null);
  assert.deepEqual([none.state, none.reason, none.url, none.engineBlocked], [READ_STATE.BLOCKED, BLOCK.NO_ROUTE, TOWN.url, BLOCK.REFUSED], "a blocked read with no route is not BLOCKED with its URL");
  const reads = [];
  const route = (over = {}) => ({ connected: true, startedByClient: true, cap: 2, read: async (u) => { reads.push(u); return { text: TOWN.html }; }, ...over });
  assert.equal((await ask(route({ startedByClient: false }))).reason, BLOCK.NO_ROUTE, "a route the client did not start was used");
  assert.equal(reads.length, 0);
  const paced = [];
  const ok = await ask(route(), fresh(), paced);
  assert.deepEqual([ok.state, ok.route, ok.engineBlocked, paced, BROWSER_GAP_MS], [READ_STATE.READ, ROUTE.BROWSER, BLOCK.REFUSED, [5000], 5000], "the route did not read, or read without its 5 s gap");
  const st = fresh();
  await ask(route({ cap: 1 }), st); const capped = await ask(route({ cap: 1 }), st);
  assert.equal(capped.reason, BLOCK.ROUTE_CAP, "the route read past its run cap");
  const st2 = fresh(); const before = reads.length;
  const stopped = await ask(route({ read: async () => ({ text: "<p>Please solve this captcha</p>" }) }), st2);
  const after = await ask(route(), st2);
  assert.deepEqual([stopped.reason, st2.stopped, after.reason, reads.length - before], [BLOCK.CAPTCHA, BLOCK.CAPTCHA, BLOCK.ROUTE_STOPPED, 0], "a captcha did not stop the route");
  assert.equal((await ask(route({ read: async () => ({ text: "x", signal: BLOCK.LOGIN_WALL }) }))).reason, BLOCK.LOGIN_WALL);
  /* only a refusal, a challenge or an empty page falls back: a page that is not found never does */
  assert.deepEqual(FALLBACK_ON, [BLOCK.REFUSED, BLOCK.CHALLENGE, BLOCK.EMPTY]);
  const gone = network({});
  const seen = reads.length;
  assert.equal((await readSource(TOWN.url, { fetchImpl: gone.fetchImpl, robots: robotsOn(gone.fetchImpl), route: route(), state: fresh(), on: ON, pace: async () => {}, hosts: new Map() })).reason, BLOCK.NOT_FOUND);
  for (const body of ["<title>Just a moment...</title>", "<p>tiny</p>"]) {
    const n = network({ [TOWN.url]: { body } });
    const r = await readSource(TOWN.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), route: route(), state: fresh(), on: ON, pace: async () => {}, hosts: new Map() });
    assert.equal(r.route, ROUTE.BROWSER, `${body}: a challenge or an empty page did not go to the client's route`);
  }
  assert.equal(reads.length, seen + 2, "a not-found page went to the browser route");
  /* the run's bound is honoured before any request */
  const bound = network(pagesOf(TOWN));
  const over = await readSource(TOWN.url, { fetchImpl: bound.fetchImpl, robots: robotsOn(bound.fetchImpl), state: fresh(), on: ON, maxReads: 1 });
  assert.deepEqual([over.reason, bound.calls.length], [BLOCK.READ_CAP, 0]);
});

/* ================= C9 · EXTRACT and C10 · VERBATIM ================= */

test("C9 · FIRING CONTROL: the client's own AI proposes facts only through the paid-provider gate — off by default, nothing is called and nothing admitted; a proposal of more than one sentence, or of another source, is refused, named", async () => {
  const n = network(pagesOf(TOWN));
  const read = await engineRead(TOWN.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
  const dir = mkdtempSync(join(tmpdir(), "f44-c9-"));
  try {
    const fake = createFakePaidProvider({ name: "fake-paid-provider" });
    const gate = createPaidProviderGate({ providers: { "fake-paid-provider": fake }, killSwitch: createKillSwitch(), ledger: createCostLedger(join(dir, "l.jsonl")), spendAuthority: { actorRef: "actor:cc", scope: { scopeType: "TENANT", tenantId: "tenant:00000000000000000000000000000f02" } } });
    const viaGate = async (text, url) => (await gate.call("fake-paid-provider", { task: "PROPOSE_FACTS", url, chars: text.length })).result;
    const off = await extractFacts({ read, propose: viaGate });
    assert.deepEqual([off.state, off.admitted.length, fake.callsReceived(), gate.refusals().length], ["REFUSED", 0, 0, 1], "the client's AI was called while the paid provider is off");
    assert.match(off.code, /^NOT_AUTHORI[SZ]ED/);
    const props = await extractFacts({ read, propose: async (_, url) => [
      { sentence: "Glass bottles go in the green bin.", quotation: "Glass bottles go in the green bin", source: url },
      { sentence: "Glass goes green. Batteries go to the depot.", quotation: "Batteries are taken at the depot only.", source: url },
      { sentence: "Batteries are taken at the depot.", quotation: "Batteries are taken at the depot only.", source: "https://elsewhere.invalid/" },
    ] });
    assert.deepEqual([props.admitted.length, props.rejected.map((r) => r.reason)], [1, [REJECT.NOT_ONE_SENTENCE, REJECT.NOT_ONE_SOURCE]]);
    assert.deepEqual([isOneSentence("One. Two."), isOneSentence("A rule holds."), isOneSentence("no end")], [false, true, false]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("C10 · FIRING CONTROL: a proposed fact is admitted only when its quotation is in the stored page text word for word — a changed number, a changed word or a lower-cased span is REJECTED with its reason; markup, entities and curly quotes do not decide", async () => {
  const n = network(pagesOf(LANG));
  const read = await engineRead(LANG.url, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), on: ON });
  const p = (quotation) => ({ sentence: "A score of 350 is a grade B.", quotation, source: LANG.url });
  const r = await extractFacts({ read, propose: async () => [p("a score of 350 is a grade B"), p("a score of 300 is a grade B"), p("A SCORE OF 350 IS A GRADE B"), p("Results arrive within \"ten\" working days."), p(""), p("a score of 350 is a grade C")] });
  assert.deepEqual([r.admitted.map((a) => a.quotation), r.rejected.map((x) => x.reason)], [["a score of 350 is a grade B", "Results arrive within \"ten\" working days."], [REJECT.NOT_IN_TEXT, REJECT.NOT_IN_TEXT, REJECT.NO_QUOTATION, REJECT.NOT_IN_TEXT]]);
  assert.ok(r.admitted.every((a) => a.pageSha256 === read.sha256 && a.readOn === ON), "an admitted fact does not name the stored text it was checked against");
  /* nothing is admitted from a page that was not read and stored */
  assert.deepEqual((await extractFacts({ read: { state: READ_STATE.BLOCKED }, propose: async () => [p("a score of 350 is a grade B")] })).rejected.map((x) => x.reason), [REJECT.NO_PAGE_TEXT]);
  assert.deepEqual([quotationIn("grade B", "<b>grade</b> B"), quotationIn("grade b", "grade B"), quotationIn("", "x")], [true, false, false]);
  /* the stored read keeps the text with its sha256, URL and read date */
  const rec = readRecord({ read, tenantId: "t", on: ON, run: "r" });
  assert.deepEqual([rec.record_type, rec.url, rec.sha256, rec.readOn, rec.text === read.text, evidenceStateOf(rec).state], [SOURCE_READ_RECORD, LANG.url, read.sha256, ON, true, "OBSERVED"]);
  assert.equal(evidenceStateOf(readRecord({ read: { state: READ_STATE.BLOCKED, url: LANG.url, route: ROUTE.ENGINE, reason: BLOCK.REFUSED }, tenantId: "t", on: ON, run: "r" })).state, "UNKNOWN");
});

/* ================= C11 · RECHECK ================= */

test("C11 · FIRING CONTROL: each fact is exactly one of CURRENT, CHANGED, BLOCKED or REJECTED — a quotation gone flags every page that uses it; a blocked source is never CURRENT; a fact with no quotation is REJECTED, named; nothing stored is rewritten", async () => {
  const changed = { ...TOWN, html: TOWN.html.replace("every second Tuesday", "every Monday") };
  const facts = [
    { factId: "glass", link: TOWN.url, quotations: ["Glass bottles go in the green bin, emptied every second Tuesday."], readOn: "2026-06-01", recheckDays: 90, pages: ["town-a", "town-b"] },
    { factId: "battery", link: TOWN.url, quotations: ["Batteries are taken at the depot only."], readOn: "2026-09-01", recheckDays: 90, pages: ["town-a"] },
    { factId: "grade", link: LANG.url, quotations: ["a score of 350 is a grade B"], readOn: "2026-09-01", recheckDays: 7, pages: ["test-a"] },
    { factId: "loose", link: LANG.url, quotations: [], readOn: "2026-09-01", recheckDays: 7, pages: ["test-a"] },
  ];
  const snapshot = JSON.stringify(facts);
  const run = async (pages) => { const n = network(pages); const reads = new Map(); for (const u of [TOWN.url, LANG.url]) reads.set(u, await readSource(u, { fetchImpl: n.fetchImpl, robots: robotsOn(n.fetchImpl), state: fresh(), on: ON })); return recheckFacts({ facts, readOf: async (u) => reads.get(u), on: ON }); };
  const same = await run(pagesOf(TOWN, LANG));
  assert.deepEqual(same.map((r) => [r.factId, r.state]), [["glass", RECHECK.CURRENT], ["battery", RECHECK.CURRENT], ["grade", RECHECK.CURRENT], ["loose", RECHECK.REJECTED]]);
  assert.equal(same[3].reason, REJECT.NO_QUOTATION);
  const moved = await run({ ...pagesOf(changed), [LANG.url]: { status: 403, body: "" } });
  assert.deepEqual(moved.map((r) => [r.factId, r.state, r.rebuild]), [["glass", RECHECK.CHANGED, ["town-a", "town-b"]], ["battery", RECHECK.CURRENT, []], ["grade", RECHECK.BLOCKED, []], ["loose", RECHECK.REJECTED, []]], "a changed quotation did not flag its pages, or a blocked source read CURRENT");
  assert.equal(moved[2].reason, BLOCK.NO_ROUTE);
  const c = recheckCounts(moved);
  assert.deepEqual([c.byState, c.byHost["town.invalid"], c.pagesFlagged], [{ CURRENT: 1, CHANGED: 1, BLOCKED: 1, REJECTED: 1 }, { CURRENT: 1, CHANGED: 1, BLOCKED: 0, REJECTED: 0 }, ["town-a", "town-b"]]);
  assert.equal(JSON.stringify(facts), snapshot, "a stored fact was rewritten");
  assert.deepEqual([moved[0].due, moved[1].due, dueOn({ readOn: ON }, ON)], [true, false, null], "the recheck date is not the fact's own read date plus its interval");
  const rec = recheckRecord({ result: moved[0], tenantId: "t", on: ON, run: "r" });
  assert.deepEqual([rec.record_type, rec.factId, rec.state, evidenceStateOf(rec).state], [FACT_RECHECK_RECORD, "glass", RECHECK.CHANGED, "INFERRED"]);
});

test("C11 · BATCH FACTS · FIRING CONTROL: the facts a batch's pages use are its registry records named by a claim's finding, else one per (link, claim text); a recorded quotation is a span in straight double quotation marks of at least eight characters", () => {
  const drafts = { pages: [
    { combination: { kind: "a" }, needs: [{ key: "n1", answer: { claims: [{ claimId: "c1", text: "One.", source: { link: "https://x.invalid/1", readOn: "2026-09-01" } }, { claimId: "c2", text: "Two.", source: { link: "https://x.invalid/2", readOn: "2026-09-01" } }] } }] },
    { combination: { kind: "b" }, needs: [{ key: "n2", answer: { claims: [{ claimId: "c3", text: "One.", source: { link: "https://x.invalid/1", readOn: "2026-09-01" } }] } }] },
  ] };
  const findings = [{ claimId: "c1", factId: "f1" }, { claimId: "c3", factId: "f1" }, { claimId: "c2", whatSupportsIt: "the page says \"two is the rule here\" and \"no\"" }];
  const registry = { facts: [{ factId: "f1", link: "https://x.invalid/1", readOn: "2026-09-01", recheckDays: 30, whatSupportsIt: "the page says \"one is the rule\"" }] };
  const f = batchFacts({ drafts, findings, registry, intervals: [{ claimId: "c2", recheckDays: 7 }] });
  assert.deepEqual(f.map((x) => [x.factId, x.pages, x.quotations, x.recheckDays]), [["f1", ["a", "b"], ["one is the rule"], 30], ["claim:c2", ["a"], ["two is the rule here"], 7]]);
  assert.deepEqual([QUOTATION_MIN_CHARS, quotationsOf("say \"yes\" or \"a longer span\"")], [8, ["a longer span"]]);
});

/* ================= C12 · NEUTRAL ================= */

const READER = ["src/facts/source-reader.mjs", "src/facts/batch-facts.mjs", "bin/source-facts.mjs"];
test("C12 · NEUTRAL: the reader's code names no product, client, exam or host; the entry point is scoped and reaches the network only through the declared connector's fetch", () => {
  const NAMES = /\b(oet|ielts|pte|toefl|celpip|almi|nursing|nmc|ahpra|gmc|\w+\.(com|org|net|gov|uk|au|nz|ie)\b)/i;
  for (const f of READER) {
    /* comments out — but never a scheme's "://", so an address inside a string stays visible */
    const code = readFileSync(join(REPO, f), "utf8").replace(/\/\*[\s\S]*?\*\/|(?<!:)\/\/[^\n]*/g, " ");
    assert.equal(NAMES.exec(code)?.[0] ?? null, null, `${f} names a product, client, exam or host`);
  }
  assert.equal(classifyEntryPoint("bin/source-facts.mjs", readFileSync(join(REPO, "bin/source-facts.mjs"), "utf8")).cls, "SCOPED");
  const bin = readFileSync(join(REPO, "bin/source-facts.mjs"), "utf8");
  assert.ok(bin.includes("fetchImpl: CONNECTOR.fetch") && bin.includes("RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }))"), "the reader does not read through the declared connector");
  assert.ok(!/globalThis\.fetch|\bfetch\(/.test(readFileSync(join(REPO, "src/facts/source-reader.mjs"), "utf8").replace(/fetchImpl\(/g, "")), "the reader touches the network itself");
  assert.equal(SOURCE_READ.maxRequests, 100);
});

/* ================= the entry point ================= */

const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const rowsIn = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type !== "resighting") : []);

test("PRODUCTION PATH · C7 C10 C11: in a scratch world with no egress, for two unrelated subjects — no request without --live or --confirm, a batch the connector does not reach is refused, and with both each source is read once through the declared connector, its text kept, each fact rechecked and stored beside it", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const SUBJECTS = [["fixture-tests", "fixture-test-facts", LANG, "a score of 350 is a grade B"], ["fixture-town", "fixture-town-facts", TOWN, "Glass bottles go in the green bin"]];
  const W = declaredWorld({ extra: [...SUBJECTS.map(([, batch]) => ["RESEARCH_BATCH", batch]), ["FACT_REGISTRY", "fixture-town/facts"]] });
  const dir = mkdtempSync(join(tmpdir(), "f44-pp-"));
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    for (const [subjectId, batch] of SUBJECTS) { mkdirSync(join(W.root, subjectId), { recursive: true }); reg.subjects.push({ subjectId, path: subjectId, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: batch }, ...(subjectId === "fixture-town" ? [{ resourceKind: "FACT_REGISTRY", resourceRef: "fixture-town/facts" }] : [])], connectors: [{ connectorId: "cited-sources", kind: "CITED_SOURCES", credential: null, reaches: subjectId === "fixture-tests" ? [{ resourceKind: "RESEARCH_BATCH", resourceRef: batch }] : [{ resourceKind: "FACT_REGISTRY", resourceRef: "fixture-town/facts" }] }] }); }
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    const replay = {};
    for (const [, batch, page, quote] of SUBJECTS) {
      const b = join(W.root, "research", batch); mkdirSync(b, { recursive: true });
      writeFileSync(join(b, "page-drafts.json"), JSON.stringify({ pages: [{ combination: { kind: "one" }, needs: [{ key: "n1", answer: { claims: [{ claimId: "c1", text: "A rule.", source: { link: page.url, readOn: "2026-09-01" } }, { claimId: "c2", text: "Unquoted.", source: { link: page.url, readOn: "2026-09-01" } }] } }] }] }));
      writeFileSync(join(b, "findings.json"), JSON.stringify([{ claimId: "c1", factId: "f1" }, { claimId: "c2", whatSupportsIt: "the page describes it" }]));
      writeFileSync(join(b, "facts-registry-2026-09-01.json"), JSON.stringify({ facts: [{ factId: "f1", link: page.url, readOn: "2026-09-01", recheckDays: 7, whatSupportsIt: `the page says "${quote}"` }] }));
      writeFileSync(join(b, "recheck-intervals.json"), "[]");
      writeFileSync(join(dir, `${batch}.html`), page.html);
      replay[page.url] = join(dir, `${batch}.html`);
    }
    writeFileSync(join(dir, "replay.json"), JSON.stringify(replay));
    const log = join(dir, "egress.json");
    const run = (subject, batch, mode, ...extra) => spawnSync(process.execPath, ["--import", PRELOAD, "bin/source-facts.mjs", ...W.argv([`--subject=${subject}`, `--research-batch=${batch}`, `--on=${ON}`, ...extra])], { cwd: REPO, encoding: "utf8", env: { ...W.envWith(), NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log, NO_EGRESS_REPLAY: join(dir, "replay.json") } });
    const egress = () => JSON.parse(readFileSync(log, "utf8")).fetch;
    const dry = run("fixture-tests", "fixture-test-facts", "refuse");
    assert.deepEqual([dry.status, /facts {12}2 \(registry 1 · claims naming no registry record 1\) · with a recorded word-for-word quotation 1 of 2/.test(dry.stdout), /NOT RUN — no --live/.test(dry.stdout), egress()], [0, true, true, 0], dry.stdout + dry.stderr);
    const unconfirmed = run("fixture-tests", "fixture-test-facts", "refuse", "--live");
    assert.notEqual(unconfirmed.status, 0, unconfirmed.stdout);
    assert.equal(egress(), 0, "a run without --confirm made a request");
    const unreached = run("fixture-town", "fixture-town-facts", "refuse", "--live", "--confirm");
    /* the connector is declared, and reaches the client's fact registry — not this batch: refused by the reach check, before any request */
    assert.deepEqual([unreached.status, /CITED_SOURCES_CONNECTOR_DOES_NOT_REACH_THIS_BATCH/.test(unreached.stderr), egress(), existsSync(join(W.root, "research", "fixture-town-facts", "source-reads.jsonl"))], [3, true, 0, false], unreached.stdout + unreached.stderr);
    const live = run("fixture-tests", "fixture-test-facts", "replay", "--live", "--confirm");
    assert.equal(live.status, 0, live.stdout + live.stderr);
    assert.match(live.stdout, /requests {9}2 released through the paced path \(robots 1 · sources 1\) of a bound of 100/);
    assert.match(live.stdout, /recheck {10}2 fact\(s\): CURRENT 1 · CHANGED 0 · BLOCKED 0 · REJECTED 1/);
    const b = join(W.root, "research", "fixture-test-facts");
    const reads = rowsIn(join(b, "source-reads.jsonl")), checks = rowsIn(join(b, "fact-rechecks.jsonl"));
    assert.deepEqual([reads.length, reads[0].state, reads[0].sha256 === createHash("sha256").update(reads[0].text).digest("hex"), reads[0].readOn, checks.map((c) => [c.factId, c.state]).sort()], [1, READ_STATE.READ, true, ON, [["claim:c2", RECHECK.REJECTED], ["f1", RECHECK.CURRENT]]]);
    assert.equal(JSON.parse(readFileSync(join(b, "facts-registry-2026-09-01.json"), "utf8")).facts[0].readOn, "2026-09-01", "a stored fact was rewritten");
  } finally { W.cleanup(); rmSync(dir, { recursive: true, force: true }); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

/* ================= REAL ================= */

test("REAL · the declared batch's stored recheck: every fact its pages use has exactly one state, counted per source host; every CHANGED fact flags its pages; every READ keeps its text with its sha256 — counts only", async (t) => {
  const index = rootIndexFor(process.env);
  const research = lookupStore(index, "RESEARCH");
  const dir = research.state === "DECLARED" ? join(research.dir, "rr254-test-pages-2026-10-12") : null;
  if (!dir || !existsSync(join(dir, "fact-rechecks.jsonl"))) { t.skip("no stored recheck in the declared batch"); return; }
  const checks = rowsIn(join(dir, "fact-rechecks.jsonl")), reads = rowsIn(join(dir, "source-reads.jsonl"));
  const latest = [...new Map(checks.map((c) => [c.factId, c])).values()];
  assert.ok(latest.length > 0 && latest.every((c) => Object.values(RECHECK).includes(c.state)), "a fact has no state");
  assert.ok(latest.filter((c) => c.state === RECHECK.CHANGED).every((c) => c.rebuild.length === c.pages.length && c.pages.length > 0), "a CHANGED fact flags no page");
  assert.ok(reads.filter((r) => r.state === READ_STATE.READ).every((r) => r.sha256 === createHash("sha256").update(r.text).digest("hex") && /^\d{4}-\d{2}-\d{2}$/.test(r.readOn)), "a stored read lost its text, hash or date");
});

test("the production trail is untouched by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
