/**
 * 🔴 RR-227 · F19 ACCEPTANCE AMENDMENT 1 (_handoffs b6b3382; file e2a49c26…, contract 4bf4fac9…) · ONE SABOTAGE PER FAILURE LIMB, plus F19's
 * earlier limbs re-run against the changed code (RR-135: f19-sabotage 15, f19-generic-crawl-sabotage 8, f19-append-path-sabotage 3 — their
 * spans re-anchored where RR-227 made a span occur twice — and the 10 real-census controls of test/helpers/f19-census-controls.mjs).
 *
 * Each source sabotage: its span found EXACTLY ONCE in the code live now, applied ALONE, the named test confirmed GREEN first and then
 * required RED by an AssertionError (and, where the earlier harness named one, by its own reason), every file restored by raw-byte sha256,
 * the production trail hashed before and after. Fixtures only (RR-177): no real page and no real request.
 *
 *   node test/helpers/rr227-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr227-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr227-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr225-sabotage.mjs, with one change: each limb runs ITS OWN test file.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SM = "src/crawl/sitemap-collect.mjs", BB = "src/crawl/batch-bodies.mjs", B = "bin/crawl.mjs", AT = "bin/audit-technical.mjs", PF = "src/crawl/preflight.mjs", EA = "src/evidence/evidence-state-adapters.mjs";
const FRONTIER = "src/crawl/frontier.mjs", FETCHER = "src/crawl/fetcher.mjs", ROBOTS = "src/crawl/robots.mjs", CRAWLER = "src/crawl/crawler.mjs", LEDGER = "src/cost/ledger.mjs", CONN = "src/tenancy/connectors.mjs";
const A1 = "test/f19-a1.test.mjs", BOUNDS = "test/f19-crawler-bounds.test.mjs", GENERIC = "test/f19-generic-crawl.test.mjs", APPEND = "test/f19-real-append-path.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr227-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

/* [id, limb, [[file, from, to], …], test file, named-test prefix, reason (optional)] */
const SABOTAGES = [
  /* ── B · the whole sitemap, collected honestly (A1 FAILURE, B limbs) ── */
  ["N01", "B · a listing is stored capped", [[SM, "  const urls = [...result.urls];", "  const urls = [...result.urls].slice(0, 20000);"]], A1, "B1 ·"],
  ["N02", "B · its stored count differs from the count read while it is COMPLETE", [[SM, "      urlsStored: urls.length,", "      urlsStored: Math.min(urls.length, 20000),"]], A1, "B1 ·"],
  ["N03", "B · the hash does not cover the whole list", [[SM, "  const urlsSha256 = sha256Hex(JSON.stringify(urls));", "  const urlsSha256 = sha256Hex(JSON.stringify(urls.slice(0, 1)));"]], A1, "B1 ·"],
  ["N04", "B · a FAILED child leaves the listing COMPLETE (RR-226 finding 1)", [[SM, "    if (!r.ok) { causes.childrenFailed += 1; continue; }", "    if (!r.ok) { continue; }"]], A1, "B2 ·"],
  ["N05", "B · a TRUNCATED child leaves the listing COMPLETE", [[SM, "    if (r.truncated) causes.childrenTruncated += 1;", "    void 0;"]], A1, "B3 ·"],
  ["N06", "B · a sitemap file is read past its byte bound", [[SM, "maxResponseBytes: b.maxSitemapBytes,", "maxResponseBytes: Infinity,"]], A1, "B3 ·"],
  ["N07", "B · an UNPARSED child leaves the listing COMPLETE", [[SM, "    if (!isSitemapDocument(r.body)) { causes.childrenUnparsed += 1; continue; }", "    if (!isSitemapDocument(r.body)) { continue; }"]], A1, "B4 ·"],
  ["N08", "B · a SKIPPED child leaves the listing COMPLETE", [[SM, "    if (budget <= 0) { causes.childrenSkipped += 1; continue; }", "    if (budget <= 0) { continue; }"]], A1, "B5 ·"],
  ["N09", "B · a nested sitemap index is not followed", [[SM, "      nestedIndexesFollowed += 1;\n      take(parsed, depth + 1);", "      nestedIndexesFollowed += 1;"]], A1, "B6 ·"],
  ["N10", "B · an unfollowed nested index leaves the listing COMPLETE", [[SM, "      if (depth >= b.maxIndexDepth) { causes.nestedIndexesNotFollowed += 1; continue; }", "      if (depth >= b.maxIndexDepth) { continue; }"]], A1, "B6 ·"],
  ["N11", "B · a sitemap request runs past its timeout", [[SM, "timeoutMs: b.timeoutMs, intervalMs: b.intervalMs, sleepImpl,", "timeoutMs: b.timeoutMs * 30, intervalMs: b.intervalMs, sleepImpl,"]], A1, "B7 ·"],
  ["N12", "B · robots is not honoured for a sitemap", [[SM, "    return v.state === \"ALLOWED\";", "    return true;"]], A1, "B8 ·"],
  ["N13", "B · a child on an origin not declared is requested", [[SM, "    if (!admits(url)) { causes.childrenOffSite += 1; continue; }", "    void admits;"]], A1, "B9 ·"],
  ["N14", "B · the listing is COMPLETE by default", [[SM, "    coverageState: open.length === 0 ? \"COMPLETE\" : \"PARTIAL\",", "    coverageState: \"COMPLETE\","]], A1, "B2 ·"],
  ["N15", "B · a listing past the ceiling is stored (not refused whole)", [[SM, "  return Object.freeze({ fits: after <= ceiling, existingBytes, addBytes, after, ceiling });", "  return Object.freeze({ fits: true, existingBytes, addBytes, after, ceiling });"]], A1, "B10 ·"],
  ["N16", "B · the ceiling refusal is not recorded", [[B, "    SCOPE.recordDecision(ceilingRefusalEvent({ store: \"sitemaps\" }));", "    void ceilingRefusalEvent;"]], A1, "C4 ·"],
  /* ── C · one tenant's sitemap, re-collected lawfully ── */
  ["N17", "C · a batch the subject does not name is re-collected", [[B, "  if (!member) {\n    console.error(\"🔴 REFUSED — BATCH_NOT_A_MEMBER_OF_THE_SUBJECT", "  if (false) {\n    console.error(\"🔴 REFUSED — BATCH_NOT_A_MEMBER_OF_THE_SUBJECT"]], A1, "C2 ·"],
  ["N18", "C · a dry run issues a request", [[B, "  if (!live) {\n    console.log(\"0 requests issued — dry run. No traffic. Nothing is written.\");\n    process.exit(0);\n  }\n", ""], [B, "fetchImpl: SM_CONNECTOR.fetch, admits: SM_CONNECTOR.admits", "fetchImpl: SM_CONNECTOR?.fetch ?? globalThis.fetch, admits: SM_CONNECTOR?.admits ?? (() => true)"]], A1, "C3 ·"],
  ["N19", "C · a live re-collection proceeds without the owner's green", [[B, "  if (live && !green) {\n    console.error(\"🔴 REFUSED. --live requires --i-have-the-owners-green. NO REQUEST WAS MADE.\");", "  if (false) {\n    console.error(\"🔴 REFUSED. --live requires --i-have-the-owners-green. NO REQUEST WAS MADE.\");"]], A1, "C3 ·"],
  ["N20", "C · the listing is written outside the batch's sitemap store", [[B, "  const SITEMAPS_FILE = join(batchDir, BATCH_FILES.SITEMAPS);", "  const SITEMAPS_FILE = join(batchDir, \"crawl.jsonl\");"]], A1, "C1 ·"],
  ["N21", "C · the older capped writer still runs", [[AT, "if (doSitemaps) {\n  console.error(\"🔴 RETIRED", "if (false) {\n  console.error(\"🔴 RETIRED"]], A1, "C5 ·"],
  /* ── E · a research-batch crawl stores its bodies in its batch ── */
  ["N22", "E · a research-batch crawl writes its bodies into a corpus, not its batch", [[B, "if (mayRecord && live && researchBatch) {", "if (false) {"]], A1, "E3 ·"],
  ["N23", "E · a stored body is not its observation's (hash unchecked)", [[BB, "    if (content_sha256 !== o.content_sha256) {", "    if (false) {"]], A1, "E1 ·"],
  ["N24", "E · a body cut by the response bound is stored unmarked", [[BB, "      truncated: o.value?.truncated === true,", "      truncated: false,"]], A1, "E1 ·"],
  ["N25", "E · a body that would cross the ceiling is stored", [[BB, "    if (used + add > ceiling) { notStored[BODY_NOT_STORED.OVER_THE_BATCH_STORE_CEILING] += 1; continue; }", "    if (false) { continue; }"]], A1, "B10 ·"],
  ["N26", "E · a body past the ceiling is dropped without being counted", [[BB, "    if (used + add > ceiling) { notStored[BODY_NOT_STORED.OVER_THE_BATCH_STORE_CEILING] += 1; continue; }", "    if (used + add > ceiling) { continue; }"]], A1, "B10 ·"],
  ["N27", "E · a body past the ceiling is cut to fit", [[BB, "    if (used + add > ceiling) { notStored[BODY_NOT_STORED.OVER_THE_BATCH_STORE_CEILING] += 1; continue; }", "    if (used + add > ceiling) { notStored[BODY_NOT_STORED.OVER_THE_BATCH_STORE_CEILING] += 1; r.body = r.body.slice(0, 1); }"]], A1, "B10 ·"],
  ["N28", "E · the run record does not count the bodies", [[B, "  bodies: researchBatch ? (bodies ?? { store: BATCH_FILES.BODIES, stored: 0, bytes: 0, notStored: {}, ceiling: BATCH_STORE_CEILING_BYTES }) : null,", "  bodies: null,"]], A1, "E3 ·"],
  ["N29", "E · the bodies append is not preflighted", [[PF, "  if (typeof build.bodies === \"function\") attempt(\"page bodies\", result.bodies.size, () => build.bodies(result));", "  void 0;"]], A1, "E2 ·"],
  ["N30", "C · the listing append is not preflighted (a refusing builder does not stop the run)", [[PF, "  const ok = external.length === 0 && result.coverageState === \"COMPLETE\" && checks.every((c) => c.ok);", "  const ok = true;"]], A1, "E2 ·"],
  ["N31", "E · a page body has no lawful evidence state (the live append would refuse)", [[EA, "    case \"page_body\": return ofPageBody(record);\n", ""]], A1, "E1 ·"],
  ["N32", "E · F19 writes a body file F31's reader does not read", [[BB, "BODIES: \"bodies.jsonl\" });", "BODIES: \"page-bodies.jsonl\" });"]], A1, "F31 ·"],

  /* ── F19's earlier limbs (RR-135), re-run against the code live now ── */
  ["F19-S1", "the page cap is not enforced in offer()", [[FRONTIER, "    if (this.#queue.length >= this.#capacity) {\n      this.#rejected += 1;", "    if (false) {\n      this.#rejected += 1;"]], BOUNDS, "F19 · B1 ·", /F19-PAGES-EXCEEDED/],
  ["F19-S2", "the per-host cap is not enforced", [[FRONTIER, "    if (used >= this.#maxPerHost) {", "    if (false) {"]], BOUNDS, "F19 · B2 ·", /F19-PER-HOST-EXCEEDED/],
  ["F19-S3", "a found link is offered to the frontier (depth 1)", [[CRAWLER, "        edges.push({ from: res.finalUrl ?? url, to });", "        edges.push({ from: res.finalUrl ?? url, to }); plan.frontier.offer(to);"]], BOUNDS, "F19 · B3 ·", /F19-DEPTH-EXCEEDED/],
  ["F19-S4", "the size ceiling is not applied to a streamed body", [[FETCHER, "    if (total >= limit) {", "    if (false) {"]], BOUNDS, "F19 · B4 ·", /F19-SIZE-(NOT-MARKED|STORED-WHOLE)/],
  ["F19-S5", "the pacer does not wait between page requests", [[FETCHER, "      if (mayStart(lastStart, t, intervalMs)) {", "      if (true) {"]], BOUNDS, "F19 · B5 ·", /F19-RATE-VIOLATED/],
  ["F19-S6", "robots.txt is fetched outside the pacer", [[ROBOTS, "      await beforeRequest();", "      void beforeRequest;"]], BOUNDS, "F19 · B5 ·", /F19-RATE-VIOLATED: request 2 \(\/r1\)/],
  ["F19-S7", "the per-request abort timer does not abort", [[FETCHER, "      const timer = setTimeout(() => controller.abort(), timeoutMs);", "      const timer = setTimeout(() => {}, timeoutMs);"]], BOUNDS, "F19 · B6 ·", /F19-TIMEOUT-NOT-ENFORCED/],
  ["F19-S8", "robots.txt falls back to its own 10 s timeout", [[CRAWLER, "  const robots = createRobotsCache({ fetchImpl, timeoutMs, beforeRequest: () => fetcher.pace(\"robots\") });", "  const robots = createRobotsCache({ fetchImpl, beforeRequest: () => fetcher.pace(\"robots\") });"]], BOUNDS, "F19 · B7 ·", /F19-ROBOTS-TIMEOUT-NOT-DECLARED-VALUE/],
  ["F19-S9", "the record does not declare depth", [[CRAWLER, "    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,", "    requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,"]], BOUNDS, "F19 · D ·", /F19-RECORD-UNDECLARED: the run record lacks maxDepth=0/],
  ["F19-S10", "the record does not declare the request interval", [[CRAWLER, "    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,", "    maxDepth: MAX_DEPTH, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,"]], BOUNDS, "F19 · D ·", /F19-RECORD-UNDECLARED: the run record lacks requestIntervalMs=0/],
  ["F19-S11", "the record does not declare the request timeout", [[CRAWLER, "    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,", "    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE,"]], BOUNDS, "F19 · D ·", /F19-RECORD-UNDECLARED: the run record lacks requestTimeoutMs=700/],
  ["F19-S12", "the run record does not count truncations", [[CRAWLER, "      truncations: observations.filter((o) => o.value.truncated).length,", "      truncations: null,"]], BOUNDS, "F19 · B4 ·", /F19-RECORD-TRUNCATIONS/],
  ["F19-S13", "the run record does not count refusals", [[CRAWLER, "      refusals: observations.filter((o) => o.value.skipped).length,", "      refusals: null,"]], BOUNDS, "F19 · B8 ·", /F19-RECORD-REFUSALS/],
  ["F19-S14", "the run's cost counts page requests only", [[CRAWLER, "      cost: crawlCost(fetcher.requestsIssued() + robots.requestsIssued()),", "      cost: crawlCost(fetcher.requestsIssued()),"]], BOUNDS, "F19 · L ·", /F19-COST-UNDERCOUNT/],
  ["F19-S15", "the ledger ignores a record's robots.txt count", [[LEDGER, "    providerCalls: Number.isInteger(run.robotsRequestsIssued)", "    providerCalls: false"]], BOUNDS, "F19 · L ·", /F19-LEDGER-UNDERCOUNT/],
  ["G1", "the connector admits only its declared site origins", [[CONN, "    admits: (url) => origins === null || origins.has(originOf(url)),\n", "    admits: (url) => true,\n"]], GENERIC, "SITE-HELD · a seed outside"],
  ["G2", "a live run with no seed is refused before any request", [[B, "  if (seeds.length === 0) {\n", "  if (false) {\n"]], GENERIC, "SITE-HELD · a seed outside"],
  ["G3", "the platform never follows a redirect for the crawler", [[FETCHER, "          redirect: \"manual\",\n", "          redirect: \"follow\",\n"]], GENERIC, "PACED HOPS"],
  ["G4", "a redirect hop waits for the pacer", [[FETCHER, "      await pace(k);\n", "      if (k !== \"redirect\") await pace(k);\n"]], GENERIC, "PACED HOPS"],
  ["G5", "a redirect is followed only to an admitted origin", [[FETCHER, "chain.length < maxRedirectHops && admits(next)", "chain.length < maxRedirectHops"]], GENERIC, "PACED HOPS"],
  ["G6", "a redirected robots.txt is not followed (fails closed)", [[ROBOTS, "          redirect: \"manual\",\n", ""]], GENERIC, "PACED HOPS"],
  ["G7", "the redirect chain is recorded on the observation", [[CRAWLER, "      redirect_chain: res.redirectChain ?? [],\n", "      redirect_chain: [],\n"]], GENERIC, "SITE-HELD · in the binary,"],
  /* G8 and R2 re-anchored (RR-227): bin/crawl.mjs now holds three APPEND_IF_NEW builders — the span names the observations builder */
  ["G8", "a resumed batch never duplicates a saved observation", [[B, "action: \"APPEND_CRAWL_OBSERVATIONS\",\n  occurredAt, correlationId, discipline: \"APPEND_IF_NEW\",\n", "action: \"APPEND_CRAWL_OBSERVATIONS\",\n  occurredAt, correlationId, discipline: \"APPEND_WITHOUT_DEDUPE\",\n"]], GENERIC, "RESUMABLE"],
  /* R1 re-anchored (RR-227): the sitemap re-collection carries its own green gate — the span names the crawl's D-CRW-4 gate */
  ["R1", "a live run without the owner's green is refused before any request", [[B, "/* 🔴 THE GATE ON D-CRW-4. Two flags, and the second one cannot be typed by accident. */\nif (live && !green) {", "/* 🔴 THE GATE ON D-CRW-4. Two flags, and the second one cannot be typed by accident. */\nif (false) {"]], APPEND, "REFUSES BEFORE THE FIRST REQUEST"],
  ["R2", "the observations append keeps its declared discipline", [[B, "action: \"APPEND_CRAWL_OBSERVATIONS\",\n  occurredAt, correlationId, discipline: \"APPEND_IF_NEW\",\n", "action: \"APPEND_CRAWL_OBSERVATIONS\",\n  occurredAt, correlationId, discipline: \"NOT_A_DISCIPLINE\",\n"]], APPEND, "REAL APPEND PATH"],
  ["R3", "the cost entry is appended under its declared action", [[B, "targetClass: \"RUN_EVIDENCE\", action: \"APPEND_CRAWL_COST_ENTRY\",", "targetClass: \"RUN_EVIDENCE\", action: \"APPEND_CRAWL_COSTS\","]], APPEND, "REAL APPEND PATH"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1 && ONLY !== "CENSUS") { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = RUN.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = sha(read(TRAIL));
const run = (testFile) => spawnSync(process.execPath, ["--test", testFile], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
/* BASELINE: every test file the limbs name, before any sabotage; each named test must be seen GREEN */
const testFiles = [...new Set(RUN.map((s) => s[3]))];
const baseOut = new Map(testFiles.map((t) => { const r = run(t); return [t, { ok: r.status === 0, out: `${r.stdout}${r.stderr}` }]; }));
const baselineGreen = [...baseOut.values()].every((x) => x.ok);
const seenGreen = ([, , , t, p]) => new RegExp(`✔ ${esc(p)} `).test(baseOut.get(t).out);
const namedGreen = RUN.every(seenGreen);
const lines = [
  `RR-227 F19 Acceptance Amendment 1 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} source sabotage(s) over ${testFiles.join(" + ")} · each applied ALONE · fixtures only, no network · + the 10 real-census controls (test/helpers/f19-census-controls.mjs)`,
  `BASELINE (the named test files before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · files green ${[...baseOut.values()].filter((x) => x.ok).length} of ${testFiles.length} · named tests seen GREEN ${RUN.filter(seenGreen).length} of ${RUN.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, testFile, expect, reason] of baselineGreen && namedGreen ? RUN : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const touched = [...new Set(spans.map((s) => s[0]))];
  for (const f of touched) {
    let text = originals.get(f).toString("utf8");
    for (const [, from, to] of spans.filter((s) => s[0] === f)) { const ff = inEol(text, from); const at = text.indexOf(ff); text = text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length); }
    writeFileSync(join(REPO, f), text, "utf8");
  }
  const landed = touched.every((f) => sha(read(f)) !== sha(originals.get(f)));
  let failing = [], out = "";
  try {
    const r = run(testFile);
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    for (const f of touched) writeFileSync(join(REPO, f), originals.get(f));
  }
  const restored = touched.every((f) => sha(read(f)) === sha(originals.get(f)));
  const red = failing.some((n) => n.startsWith(`${expect} `));
  const cls = failureClassOf(out, expect);
  const byAssertion = cls === "AssertionError";
  const why = reason ? reason.test(out) : true;
  const syntax = /SyntaxError/.test(out);
  const ok = landed && red && byAssertion && why && !syntax && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}] → ${testFile}: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"}${reason ? ` · its reason ${why}` : ""} · SyntaxError ${syntax} · failing ${[...new Set(failing.map((n) => n.split(" · ")[0]))].join(",")} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
/* the 10 real-census controls (RR-135), re-run on a COPY of the data root — the real root is never written */
let census = { proved: 0, of: 10, line: "NOT RUN" };
if (!ONLY || ONLY === "CENSUS") {
  const r = spawnSync(process.execPath, ["test/helpers/f19-census-controls.mjs", "--deliberate"], { /* RR-247: the controls are gated */ cwd: REPO, encoding: "utf8", timeout: 1800000 });
  const m = `${r.stdout}`.match(/proved (\d+) of (\d+)/);
  census = { proved: m ? Number(m[1]) : 0, of: m ? Number(m[2]) : 10, line: `${r.stdout}`.trim().split("\n").map((l) => `  ${l}`).join("\n") };
  lines.push("", "REAL-CENSUS CONTROLS (test/helpers/f19-census-controls.mjs, on a copy of the data root):", census.line);
  console.log(lines.slice(-2).join("\n"));
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
const total = RUN.length + (!ONLY || ONLY === "CENSUS" ? census.of : 0);
const totalProved = proved + (!ONLY || ONLY === "CENSUS" ? census.proved : 0);
lines.push("", `proved ${totalProved} of ${total} (source ${proved} of ${RUN.length}${!ONLY || ONLY === "CENSUS" ? ` · census controls ${census.proved} of ${census.of}` : ""}) · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && totalProved === total ? 0 : 1;
