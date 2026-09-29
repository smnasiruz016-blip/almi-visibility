/**
 * F48 · STRUCTURED DATA AND RICH-RESULT VALIDATION (acceptance _handoffs 8d03429, Amendment 1 d09dd5e/7f212cd, RR-92).
 *
 * Every expected state and count below is written by hand from its fixture. Nothing here writes to the production trail (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { discoverBlocks, assessPage, summariseStructuredData, MISSING, NO_GUARANTEE } from "../src/page/structured-data.mjs";
import { readClientStructuredData } from "../src/page/structured-data-evidence.mjs";
import { buildBrief } from "../src/page/content-brief.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();

/* ---- fixtures ---- */
const faq = (pairs) => JSON.stringify({ "@context": "schema.org", "@type": "FAQPage", mainEntity: pairs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const ld = (json) => `<script type="application/ld+json">${json}</script>`;
const doc = ({ blocks = [], visible = "", payload = "" }) => `<html><head><title>t</title>${blocks.map(ld).join("")}</head><body><main>${visible}</main>${payload ? `<script>self.data=${JSON.stringify(payload)}</script>` : ""}</body></html>`;
const page = (html, over = {}) => assessPage({ pageId: "p", html, verified: true, ref: "body:o1", ...over });
const Q = "How long does the check take?", A = "About ten working days.";

/* ================= C1 — discover from the stored body ================= */

test("C1 · every JSON-LD block is found with its types; one that does not parse is INVALID, never skipped", () => {
  const b = discoverBlocks(doc({ blocks: [faq([[Q, A]]), "{not json", JSON.stringify({ name: "untyped" })] }));
  assert.equal(b.length, 3, "a block was missed or skipped");
  assert.deepEqual(b[0].types.sort(), ["Answer", "FAQPage", "Question"]);
  assert.deepEqual([b[1].valid, b[1].reason], [false, "DOES_NOT_PARSE"]);
  assert.deepEqual([b[2].valid, b[2].reason], [false, "NO_TYPE"]);
  assert.deepEqual(b[0].texts.map((t) => t.kind), ["question", "answer"]);
});

/* ================= C2 — parsed, typed, and aligned with the visible text ================= */

test("C2 · FIRING CONTROLS: a text absent from the whole page is MISALIGNED; a text only inside a script is RENDER-ONLY — NOT MEASURED, never misaligned", () => {
  const aligned = page(doc({ blocks: [faq([[Q, A]])], visible: `<h2>${Q}</h2><p>About <b>ten</b> working days.</p>` }));
  assert.equal(aligned.state, "ALIGNED", "tags and case inside visible text broke the match");
  const absent = page(doc({ blocks: [faq([[Q, A]])], visible: `<h2>${Q}</h2>` }));
  assert.equal(absent.state, "MISALIGNED", "an answer shown nowhere on the page did not misalign it");
  assert.deepEqual([absent.items.notVisible, absent.items.renderOnly], [1, 0]);
  const scripted = page(doc({ blocks: [faq([[Q, A]])], visible: `<h2>${Q}</h2>`, payload: A }));
  assert.equal(scripted.state, "NOT_MEASURED", "a render-only answer was called misaligned (or aligned)");
  assert.deepEqual([scripted.items.notVisible, scripted.items.renderOnly], [0, 1]);
  assert.deepEqual(scripted.missing, [MISSING.RENDERED]);
  /* a certain misalignment outranks an unmeasured one */
  const both = page(doc({ blocks: [faq([[Q, A], ["Is it free?", "No."]])], visible: `<h2>${Q}</h2><h2>Is it free?</h2>`, payload: A }));
  assert.equal(both.state, "MISALIGNED");
  assert.deepEqual([both.items.notVisible, both.items.renderOnly], [1, 1]);
  assert.ok(aligned.notMeasured.some((n) => /requirement set/.test(n)), "a type's requirement set was presented as checked");
});

/* ================= C3 — no guarantee, no promise ================= */

test("C3 · the result says markup guarantees nothing; no output promises rich results, ranking, indexing or citation", () => {
  const r = page(doc({ blocks: [faq([[Q, A]])], visible: `${Q} ${A}` }));
  assert.equal(r.notice, NO_GUARANTEE);
  assert.match(NO_GUARANTEE, /guarantees no rich-result display, ranking, indexing or AI citation/);
  const code = readFileSync(join(REPO, "src/page/structured-data.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.doesNotMatch(code.replace(NO_GUARANTEE, ""), /will (appear|rank|be indexed|be cited)|eligible for rich/i);
});

/* ================= C4 — recommend only what evidence supports ================= */

test("C4 · ALIGN only for a NOT VISIBLE text, REPAIR for an invalid block, nothing for RENDER-ONLY, and never a new type", () => {
  const absent = page(doc({ blocks: [faq([[Q, A]])], visible: `<h2>${Q}</h2>` }));
  assert.deepEqual(absent.recommendations.map((x) => [x.kind, x.count]), [["ALIGN", 1]]);
  const invalid = page(doc({ blocks: [faq([[Q, A]]), "{bad"], visible: `${Q} ${A}` }));
  assert.deepEqual(invalid.recommendations.map((x) => [x.kind, x.count]), [["REPAIR", 1]]);
  assert.deepEqual(page(doc({ blocks: [faq([[Q, A]])], visible: Q, payload: A })).recommendations, [], "a render-only text got a recommendation");
  const bare = page(doc({ visible: `<h2>${Q}</h2><p>${A}</p>` }));
  assert.deepEqual([bare.state, bare.missing, bare.recommendations], ["NOT_MEASURED", [MISSING.NONE], []], "a type was recommended for a page without markup");
  assert.ok(bare.notMeasured.some((n) => /page-kind classification/.test(n)));
});

/* ================= C5 — it supplies F41's schema fact ================= */

test("C5 · only an ALIGNED page supplies its type, with its source, to F41's schema section", () => {
  const aligned = page(doc({ blocks: [faq([[Q, A]])], visible: `${Q} ${A}` }));
  assert.deepEqual(aligned.schemaFact, { type: "Answer, FAQPage, Question", ref: "body:o1" });
  assert.equal(page(doc({ blocks: [faq([[Q, A]])], visible: Q })).schemaFact, null, "a misaligned page supplied a schema fact");
  assert.equal(page(doc({ blocks: [faq([[Q, A]])], visible: Q, payload: A })).schemaFact, null, "an unmeasured page supplied a schema fact");
  const decision = { subject: { kind: "EXISTING_PAGE", pageId: "p" }, decision: "CHOSEN", actions: [{ action: "IMPROVE" }], missing: [] };
  const b = buildBrief({ decision, approvals: [{ subject: { kind: "EXISTING_PAGE", id: "p" }, action: "IMPROVE", ref: "a" }], evidence: { schema: aligned.schemaFact } });
  assert.deepEqual([b.sections.schema.state, b.sections.schema.evidence], ["FILLED", ["body:o1"]], "F41 did not take the aligned page's schema fact");
});

/* ================= C6 — three worlds, missing named ================= */

test("C6 · every page is ALIGNED, MISALIGNED or NOT_MEASURED; no verified body is NOT_MEASURED and says why", () => {
  const unverified = assessPage({ pageId: "x", html: doc({ blocks: [faq([[Q, A]])], visible: `${Q} ${A}` }), verified: false });
  assert.deepEqual([unverified.state, unverified.missing], ["NOT_MEASURED", [MISSING.BODY]]);
  const s = summariseStructuredData([unverified, page(doc({ blocks: [faq([[Q, A]])], visible: `${Q} ${A}` }))]);
  assert.deepEqual(s.state, { NOT_MEASURED: 1, ALIGNED: 1 });
});

test("REAL · the client's stored bodies, as they are — every page one of three states; render-only texts NOT MEASURED, never called hidden; bound printed", () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const r = readClientStructuredData({ tenantId, resolve });
  assert.equal(r.fault, null, r.bound);
  assert.ok(r.summary.population > 0, "EMPTY real population");
  assert.ok(r.summary.items.questions > 0, "no real marked-up text — the alignment check would prove nothing");
  for (const a of r.assessments) {
    assert.ok(["ALIGNED", "MISALIGNED", "NOT_MEASURED"].includes(a.state));
    if (a.state === "NOT_MEASURED") assert.ok(a.missing.length > 0);
    if (a.items?.renderOnly && !a.items.notVisible && !a.invalidBlocks) assert.equal(a.state, "NOT_MEASURED", "a page with only render-only gaps was given a verdict");
  }
  assert.equal(r.schemaFacts.size, r.summary.state.ALIGNED ?? 0, "a schema fact came from a page that is not ALIGNED");
  console.log(`  REAL (count-only): ${JSON.stringify({ ...r.summary, notice: undefined })}`);
});

test("C7 · THE ENTRY POINT: in a declared world it prints counts only, with its bound, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-structured-data.mjs"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /bound\s+recorded data only · \d+ page\(s\)/);
    assert.match(ok.stdout, /RENDER-ONLY texts are NOT MEASURED/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · the assessment and its evidence reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/structured-data.mjs", "src/page/structured-data-evidence.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
