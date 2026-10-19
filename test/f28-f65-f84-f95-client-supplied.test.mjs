/**
 * F28 · Log and crawler-behaviour intelligence, F65 · Review and local reputation, F84 · Funnel and business outcomes, F95 · Client-received
 * question intake (acceptances _handoffs AlmiVisibility_F28/F65/F84/F95_ACCEPTANCE_2026-10-19.md; RR-291, light proof; owner answer Q3).
 * Fixtures with firing controls, a census, and REAL on the client's own manifest (count-only).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { KINDS, consentGate, crawlerReport, reviewSummary, reviewWritersCensus, outcomesByPage, intakeQuestions, evidenceCounts, CLIENT_RECEIVED, NOT_MEASURED } from "../src/intake/client-supplied.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const consent = { givenBy: "the client", text: "you may read this file for this report", on: "2026-10-19" };

test("the consent gate (F28 C1 · F65 C1 · F84 C1 · F95 C1) · a file is read only with its consent record; none of a kind is NOT MEASURED", () => {
  const m = { files: [{ file: "a.log", kind: KINDS.SERVER_LOG, consent }, { file: "b.log", kind: KINDS.SERVER_LOG }] };
  const g = consentGate(m, KINDS.SERVER_LOG);
  assert.deepEqual([g.state, g.admitted.map((f) => f.file), g.refused], ["READ", ["a.log"], [{ file: "b.log", reason: "NO_CONSENT_RECORD" }]]);
  /* FIRING CONTROLS: only unconsented files → REFUSED; none → NOT MEASURED, never 0 */
  assert.equal(consentGate({ files: [{ file: "b.log", kind: KINDS.SERVER_LOG, consent: { ...consent, on: "" } }] }, KINDS.SERVER_LOG).state, "REFUSED");
  assert.equal(consentGate({ files: [] }, KINDS.REVIEW_EXPORT).state, NOT_MEASURED);
  assert.equal(consentGate(null, KINDS.OUTCOME_EXPORT).state, NOT_MEASURED);
});

test("F28 C2 · crawler visits by crawler, wasted URLs and sitemap URLs never visited — from the log line's own user agent", () => {
  const log = [
    '1.1.1.1 - - [19/Oct/2026:10:00:00 +0000] "GET /a HTTP/1.1" 200 10 "-" "Mozilla/5.0 (compatible; Googlebot/2.1)"',
    '1.1.1.1 - - [19/Oct/2026:10:00:01 +0000] "GET /old HTTP/1.1" 404 10 "-" "Mozilla/5.0 (compatible; bingbot/2.0)"',
    '1.1.1.1 - - [19/Oct/2026:10:00:02 +0000] "GET /tag?x=1 HTTP/1.1" 200 10 "-" "Mozilla/5.0 (compatible; Googlebot/2.1)"',
    '2.2.2.2 - - [19/Oct/2026:10:00:03 +0000] "GET /b HTTP/1.1" 200 10 "-" "Mozilla/5.0 (Windows) Firefox"',
    "not a log line",
  ].join("\n");
  const r = crawlerReport(log, ["https://s.example/a", "https://s.example/b"]);
  assert.deepEqual(r.visits, { Googlebot: 2, bingbot: 1 });
  assert.deepEqual(r.wasted.map((w) => `${w.path}:${w.why}`).sort(), ["/old:HTTP 404", "/tag:not in the sitemap"]);
  assert.deepEqual(r.unfound, ["/b"], "a person's visit is not a crawler's");
  assert.equal(r.unparsed, 1);
});

test("F65 C1–C2 · a review export summarised; and no code path writes, posts or solicits a review (census)", () => {
  const s = reviewSummary([{ date: "2026-10-01", response: "thanks" }, { date: "2026-10-10" }], { on: "2026-10-19" });
  assert.deepEqual([s.count, s.latest, s.daysSinceLatest, s.responded, s.unanswered, s.themes], [2, "2026-10-10", 9, 1, 1, NOT_MEASURED]);
  const files = (d) => readdirSync(join(REPO, d), { recursive: true }).filter((f) => /\.mjs$/.test(f)).map((f) => join(d, String(f)));
  const hits = reviewWritersCensus([...files("src"), ...files("bin")].map((f) => ({ path: f, text: readFileSync(join(REPO, f), "utf8") })));
  assert.deepEqual(hits, []);
  /* FIRING CONTROLS: planted write paths under other names each turn the census red; a comment saying "no review is posted" does not */
  for (const code of ["await api.post(`/reviews/new`, body);", "sendReviewRequest(customer);", "client.reviews.create({ rating: 5 });", "await askCustomerForReview(id);", "publish the review now()"]) assert.deepEqual(reviewWritersCensus([{ path: "planted.mjs", text: code }]), ["planted.mjs"], code);
  assert.deepEqual(reviewWritersCensus([{ path: "c.mjs", text: " * no code path here posts or solicits a review" }]), []);
});

test("F84 C1 · outcomes per page, as exported; F95 C1–C2 · wording and date kept word for word, counted apart", () => {
  assert.deepEqual(outcomesByPage([{ page: "/a", visits: 3, leads: 1 }, { page: "/a", visits: 2 }, { visits: 9 }]), { "/a": { visits: 5, leads: 1, sales: 0 } });
  const q = intakeQuestions([{ question: "  Can I sit it twice?? ", date: "2026-10-02" }, { question: "no date" }], { file: "q.json", consent });
  assert.equal(q.kept[0].original, "  Can I sit it twice?? ", "the wording was changed");
  assert.equal(q.kept[0].kind, CLIENT_RECEIVED);
  assert.equal(q.refused.length, 1);
  const c = evidenceCounts({ publicQuestions: 14, researchDerived: 348, ownedSearch: 50, clientReceived: q.kept });
  assert.deepEqual(c, { PUBLIC: 14, RESEARCH_DERIVED: 348, OWNED_SEARCH: 50, [CLIENT_RECEIVED]: 1 });
});

const BATCH = "rr254-test-pages-2026-10-12";
const HERE = existsSync(join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "client-files", "manifest.json"));
test("REAL · the client's own manifest: no file of these four kinds is supplied — each reads NOT MEASURED, never 0; the evidence counts stay apart", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const r = spawnSync(process.execPath, ["bin/visibility-parts.mjs", "--part=client-supplied", "--subject=almi-oet", `--research-batch=${BATCH}`, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  for (const k of ["F28 server log", "F65 review export", "F84 outcome export", "F95 questions"]) assert.match(r.stdout, new RegExp(`${k}\\s+(NOT MEASURED|READ|REFUSED)`), k);
  assert.match(r.stdout, /F95 evidence apart\s+PUBLIC \d+ · RESEARCH_DERIVED \d+ · OWNED_SEARCH \d+ · CLIENT_RECEIVED_QUESTION \d+/);
  console.log(`  REAL: ${r.stdout.split(/\r?\n/).slice(1, 7).map((l) => l.trim()).join(" | ")}`);
});
