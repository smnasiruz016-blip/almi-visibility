/**
 * F54 · ANSWER-READINESS AUDIT (acceptance _handoffs 4b5b01c, AlmiVisibility_F54_ACCEPTANCE_2026-10-17.md, RR-283 item 2).
 *
 * Five separate checks per page, each PASS / FAIL / NOT_MEASURED with its reason, never a score (C1); the answer right after its question
 * (C2); every fact's source link and checked date (C3); one body named one way on the page and in its structured data (C4); five planted
 * copies of one real page, each red for its own check alone (C5). The real population is the 12 published guides as built, read from the
 * batch's stored records. Read only: nothing fetched, nothing written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { auditPage, auditPages, factsOf, questionsOf, READINESS, READINESS_CHECKS, READINESS_LIMIT } from "../src/page/answer-readiness.mjs";
import { faqInPage } from "../src/page/joined-page.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const BATCH = "rr254-test-pages-2026-10-12";
const batchFile = () => join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH, "joined-pages.jsonl");
const published = () => {
  const built = readFileSync(batchFile(), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === "joined_page_draft");
  return [...new Map(built.map((r) => [r.value, r])).values()].filter((r) => typeof r.publishedUrl === "string");
};
const failing = (results) => READINESS_CHECKS.filter((k) => results[k].state === READINESS.FAIL);

/* a page in the engine's own markup: one question, one sourced answer line, one key-fact card, its FAQ structured data */
const FIXTURE = [
  `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "How long is the test?", acceptedAnswer: { "@type": "Answer", text: "The XYZ test takes three hours." } }] })}</script>`,
  `<ul class="cards"><li class="card" data-claim-id="k1"><span class="k">Fee</span><span class="v">10</span><a class="src" href="https://body.invalid/fees" rel="nofollow">Source: Body — Fees</a><span class="src"> · checked 2026-10-01</span></li></ul>`,
  `<details data-need-id="n1" open>\n<summary>How long is the test?</summary>\n<p data-claim-id="c1">The XYZ test takes three hours. <a class="src" href="https://body.invalid/test" rel="nofollow">Source: Body — The test</a><span class="src"> · checked 2026-10-01</span></p>\n</details>`,
  `<p>The XYZ test is set by Body.</p>`,
].join("\n");

test("C1 · FIVE CHECKS, SEPARATE: each page gets exactly five results, each PASS / FAIL / NOT_MEASURED, a FAIL or NOT_MEASURED with its reason; never one merged score", () => {
  const r = auditPage(FIXTURE);
  assert.deepEqual(Object.keys(r), [...READINESS_CHECKS], "a check is missing, doubled or merged");
  for (const k of READINESS_CHECKS) assert.equal(r[k].state, READINESS.PASS, `${k}: the sound fixture did not pass`);
  const empty = auditPage("<p>nothing here</p>");
  for (const k of READINESS_CHECKS) { assert.ok(Object.values(READINESS).includes(empty[k].state)); assert.ok(empty[k].state === READINESS.PASS || (typeof empty[k].why === "string" && empty[k].why.length > 0), `${k}: a ${empty[k].state} names no reason`); }
  assert.deepEqual(READINESS_CHECKS.map((k) => empty[k].state), ["NOT_MEASURED", "FAIL", "NOT_MEASURED", "NOT_MEASURED", "NOT_MEASURED"], "an absent input was read as a result");
  const many = auditPages([{ page: "a", html: FIXTURE }, { page: "b", html: "<p>nothing here</p>" }]);
  assert.ok(!("score" in many) && !many.rows.some((x) => "score" in x || "score" in x.results), "the checks were merged into one number");
  for (const k of READINESS_CHECKS) assert.equal(Object.values(many.counts[k]).reduce((x, y) => x + y, 0), 2, `${k} is not counted once per page`);
  assert.match(READINESS_LIMIT, /not a claim about ranking or about being cited by any AI engine/);
});

test("C2 · DIRECT ANSWER · FIRING CONTROL: an answer that does not start right after its question, in plain text, is a FAIL naming the question", () => {
  assert.equal(auditPage(FIXTURE).directAnswer.state, READINESS.PASS);
  for (const [what, html] of [
    ["a list first", FIXTURE.replace("<summary>How long is the test?</summary>\n", "<summary>How long is the test?</summary>\n<ul><li>see below</li></ul>\n")],
    ["a table first", FIXTURE.replace("<summary>How long is the test?</summary>\n", "<summary>How long is the test?</summary>\n<table><tr><td>3</td></tr></table>\n")],
    ["an 'also asked' line first", FIXTURE.replace("<summary>How long is the test?</summary>\n", "<summary>How long is the test?</summary>\n<p class=\"also\">Also asked: x</p>\n")],
    ["nothing", FIXTURE.replace(/<p data-claim-id="c1">[\s\S]*?<\/p>\n/, "")],
  ]) {
    const r = auditPage(html).directAnswer;
    assert.equal(r.state, READINESS.FAIL, `${what}: read as a direct answer`);
    assert.ok(r.failures.every((f) => f.includes("How long is the test?")), `${what}: the FAIL does not name the question`);
  }
});

test("C3 · PROVENANCE · FIRING CONTROL: a fact without its source link, or without its checked date, is named; the count with both is the count of all facts", () => {
  assert.equal(auditPage(FIXTURE).provenance.state, READINESS.PASS);
  const noDate = auditPage(FIXTURE.replace("<span class=\"src\"> · checked 2026-10-01</span></li>", "</li>")).provenance;
  assert.deepEqual([noDate.state, noDate.failures], [READINESS.FAIL, ["key-fact card k1: no checked date"]]);
  const noLink = auditPage(FIXTURE.replace(/<a class="src" href="https:\/\/body.invalid\/test"[^>]*>Source: Body — The test<\/a>/, "")).provenance;
  assert.deepEqual([noLink.state, noLink.failures], [READINESS.FAIL, ["answer line c1: no source link"]]);
  const cell = auditPage(`${FIXTURE}\n<table class="cmp"><caption>T</caption><tbody><tr><th scope="row">Body A</th><td>grade B <a class="src" href="https://a.invalid" rel="nofollow">Source: A</a></td></tr></tbody></table>`).provenance;
  assert.deepEqual([cell.state, cell.failures], [READINESS.FAIL, ["table cell T · Body A · column 1: no checked date"]], "a comparison-table cell without its date passed");
  const a = auditPages([{ page: "x", html: FIXTURE }]);
  assert.deepEqual([a.facts, a.sourcedAndDated], [2, 2]);
});

test("C4 · ENTITY CONSISTENCY · FIRING CONTROL: a body named one way in the structured data and another on the page is named; so is an acronym the page never shows", () => {
  assert.equal(auditPage(FIXTURE).entityConsistency.state, READINESS.PASS);
  const renamed = auditPage(FIXTURE.replace("\"text\":\"The XYZ test takes three hours.\"", "\"text\":\"The X.Y.Z. test takes three hours.\"")).entityConsistency;
  assert.equal(renamed.state, READINESS.FAIL);
  assert.match(renamed.failures.join(" | "), /"How long is the test\?": the structured data's answer is not the page's answer, word for word/);
  const acronym = auditPage(FIXTURE.replace("\"text\":\"The XYZ test takes three hours.\"", "\"text\":\"The QRS test takes three hours.\"")).entityConsistency;
  assert.equal(acronym.state, READINESS.FAIL, "an acronym the page never shows passed");
  assert.match(acronym.failures.join(" | "), /the structured data names QRS, the page never does/, "an acronym the page never shows was not named");
  const notShown = auditPage(FIXTURE.replace("\"text\":\"The XYZ test takes three hours.\"", "\"text\":\"The XYZ test takes three hours.\"}},{\"@type\":\"Question\",\"name\":\"Who sets it?\",\"acceptedAnswer\":{\"@type\":\"Answer\",\"text\":\"Body.\"")).entityConsistency;
  assert.equal(notShown.state, READINESS.FAIL, "a structured-data question the page does not show passed");
  assert.match(notShown.failures.join(" | "), /"Who sets it\?": the structured data names a question the page does not show/);
});

/* C5 · the base: one real published page, its comparison tables set aside (their cells carry no checked date — a real finding, REAL below);
 * then five copies, each missing one element */
const realBase = () => {
  const p = published().find((r) => r.value === "veterinary-science") ?? published()[0];
  return { page: p.value, html: p.html.replace(/<table class="cmp">[\s\S]*?<\/table>/g, "") };
};
const plants = (html) => {
  const faq = faqInPage(html);
  const line = factsOf(html).find((f) => f.kind === "answer line" && /^[A-Za-z0-9 ,:]+\.\s/.test(f.inner));
  const lineText = /^([^<]+?)\s<a/.exec(line.inner)[1];
  const at = faq.findIndex((e) => /\b[A-Z]{2,6}\b/.test(e.answer));
  const ac = faq[at].answer.match(/\b[A-Z]{2,6}\b/)[0];
  return {
    clarity: html.split(lineText).join(`${lineText} It is UNVERIFIED.`),
    extractability: html.replace(/<script type="application\/ld\+json">\{/, "<script type=\"application/ld+json\">{,"),
    provenance: html.replace(/(<li class="card" data-claim-id="[^"]+">[\s\S]*?)<span class="src"> · checked \d{4}-\d{2}-\d{2}<\/span>/, "$1"),
    /* the structured data re-written with one body renamed in the first answer naming one by its acronym — the page's own words untouched */
    entityConsistency: html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (m, a, json, b) => { const j = JSON.parse(json); j.mainEntity[at].acceptedAnswer.text = j.mainEntity[at].acceptedAnswer.text.replace(ac, `${ac}X`); return `${a}${JSON.stringify(j)}${b}`; }),
    directAnswer: html.replace(`<summary>${questionsOf(html)[0].question}</summary>\n`, `<summary>${questionsOf(html)[0].question}</summary>\n<ul><li>see below</li></ul>\n`),
  };
};

test("C5 · FIRES: five planted copies of one real page, each missing one element, each red for its own check alone", { skip: existsSync(batchFile()) ? false : "the batch's built pages are not on this machine" }, () => {
  const base = realBase();
  const ok = auditPage(base.html);
  assert.deepEqual(failing(ok), [], `the base page fails before any plant: ${JSON.stringify(failing(ok))}`);
  const p = plants(base.html);
  for (const k of READINESS_CHECKS) {
    assert.notEqual(p[k], base.html, `${k}: the plant did not land`);
    const r = auditPage(p[k]);
    assert.deepEqual(failing(r), [k], `${k}: the planted page failed ${JSON.stringify(failing(r))}, not its own check alone`);
  }
});

test("REAL · the 12 published guides as built: 12 × 5 results, each check counted apart; every fact's source and date counted; every FAIL named", { skip: existsSync(batchFile()) ? false : "the batch's built pages are not on this machine" }, () => {
  const pages = published();
  const a = auditPages(pages.map((r) => ({ page: r.value, html: r.html })));
  assert.equal(a.pages, 12, "the 12 published guides are not all in the batch");
  assert.equal(a.rows.reduce((n, r) => n + Object.keys(r.results).length, 0), 60, "not 12 × 5 results");
  for (const r of a.rows) for (const k of READINESS_CHECKS) if (r.results[k].state === READINESS.FAIL) assert.ok(r.results[k].failures.length > 0, `${r.page} ${k}: a FAIL names nothing`);
  /* C3 on the real pages: every fact with no checked date is a comparison-table cell (the cells show their source link, not their date) */
  const provenance = a.rows.flatMap((r) => r.results.provenance.failures ?? []);
  assert.ok(provenance.every((f) => /^table cell .*: no checked date$/.test(f)), "a real fact other than a table cell lacks its source or date");
  assert.equal(a.facts - a.sourcedAndDated, provenance.length, "the facts without both are not exactly the ones named");
  /* pins — re-measured on 17 Oct 2026, never assumed: a change here must be read, not edited */
  assert.deepEqual(a.counts, {
    clarity: { PASS: 12, FAIL: 0, NOT_MEASURED: 0 }, extractability: { PASS: 12, FAIL: 0, NOT_MEASURED: 0 }, provenance: { PASS: 0, FAIL: 12, NOT_MEASURED: 0 },
    entityConsistency: { PASS: 12, FAIL: 0, NOT_MEASURED: 0 }, directAnswer: { PASS: 12, FAIL: 0, NOT_MEASURED: 0 },
  });
  assert.deepEqual([a.facts, a.sourcedAndDated, provenance.length], [488, 457, 31]);
  console.log(`  REAL (count-only): pages ${a.pages} · ${READINESS_CHECKS.map((k) => `${k} ${Object.entries(a.counts[k]).map(([s, n]) => `${s} ${n}`).join("/")}`).join(" · ")} · facts ${a.facts}, with source link and checked date ${a.sourcedAndDated}, comparison-table cells without their date ${provenance.length}`);
});

test("ENTRY · bin/answer-readiness.mjs in a declared world: the five counts apart, counts only — no page text, question or source — and it writes nothing", { skip: existsSync(batchFile()) ? false : "the batch's built pages are not on this machine" }, () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const W = declaredWorld();
  try {
    const subject = published()[0].subject;
    const r = spawnSync(process.execPath, W.argv(["bin/answer-readiness.mjs", `--subject=${subject}`, `--research-batch=${BATCH}`]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /bound {12}12 published page\(s\) of this batch/);
    for (const k of READINESS_CHECKS) assert.match(r.stdout, new RegExp(`\\n  ${k} +PASS \\d+ · FAIL \\d+ · NOT_MEASURED \\d+`), `the ${k} line is missing`);
    assert.match(r.stdout, /facts {12}488 · with their source link and checked date 457/);
    assert.doesNotMatch(r.stdout, /https?:\/\/|\?/, "the entry point printed a link or a question");
    const usage = spawnSync(process.execPath, W.argv(["bin/answer-readiness.mjs", `--subject=${subject}`]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(usage.status, 2);
  } finally { W.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("the audit names no product and loads no module that can make a network, process, connector or paid call — and each control fires", () => {
  const F = "src/page/answer-readiness.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
