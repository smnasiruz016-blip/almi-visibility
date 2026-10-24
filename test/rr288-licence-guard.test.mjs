/**
 * RR-288 · A LICENCE THAT FORBIDS STORING A SOURCE'S WORDS IS OBEYED (owner decision 1; beta-g decision A) — src/facts/licence-guard.mjs.
 *   R1 which sources · R2 the reader keeps no text · R3 the extraction keeps no sentence or quotation · R4 the build refuses a claim quoting one
 * Firing controls on fixtures; REAL on the 3 licence-barred records of the declared product, and a census of the PUBLIC trees (the data repo
 * and this engine) against the hashed 8-word sequences of those pages (config/licence-withheld-shingles.json: hashes only, never words).
 * Nothing fetched or written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { barredSources, isBarred, withheldRead, withheldExtraction, claimsQuotingBarred, LICENCE_WITHHELD, BUILD_REFUSAL, shingleHash, wordsOf, longestRun as runOf } from "../src/facts/licence-guard.mjs";
import { readRecord, extractionRecord } from "../src/facts/source-reader.mjs";
import { privateSourcesRoot, withPrivateTexts, TEXT_MISSING } from "../src/facts/private-texts.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const BAR = "https://body.invalid/barred", OPEN = "https://body.invalid/open";
const FACTS = [{ id: "a", source: { url: BAR }, sourceQuotable: false }, { id: "b", source: { url: OPEN }, sourceQuotable: true }, { id: "c", source: { url: "https://body.invalid/unknown" }, sourceQuotable: "unknown" }];

test("R1 · WHICH SOURCES · FIRING CONTROL: a source is barred only when a record citing it declares sourceQuotable false — never quotable, never unknown", () => {
  const b = barredSources(FACTS);
  assert.deepEqual([...b], [BAR]);
  assert.equal(isBarred(b, `${BAR}/`), true, "a trailing slash escaped the bar");
  assert.equal(isBarred(b, OPEN), false);
});

test("R2 · THE READER KEEPS NO TEXT · FIRING CONTROL: a read of a barred source is stored with its URL, date and sha256 and NO text, the reason named; any other read keeps its text", () => {
  const read = (url) => ({ url, state: "READ", route: "R", sha256: "f".repeat(64), chars: 9, text: "some words", landedUrl: url });
  const b = barredSources(FACTS);
  const kept = readRecord({ read: read(BAR), tenantId: "t", on: "2026-10-19", run: "r", barred: b });
  assert.deepEqual([kept.text, kept.textWithheld, kept.sha256, kept.url, kept.readOn], [null, LICENCE_WITHHELD, "f".repeat(64), BAR, "2026-10-19"]);
  assert.equal(readRecord({ read: read(OPEN), tenantId: "t", on: "2026-10-19", run: "r", barred: b }).text, "some words", "an open source lost its text");
  assert.equal(withheldRead({ url: BAR, text: "x" }, b).text, null);
});

test("R3 · THE EXTRACTION KEEPS NO SENTENCE OR QUOTATION · FIRING CONTROL: a proposal from a barred source is stored without its words", () => {
  const b = barredSources(FACTS);
  const rec = (source) => extractionRecord({ proposal: { proposalId: "p", source, sentence: "a sentence", quotation: "a quotation" }, result: { admitted: [], rejected: [{ reason: "X" }], state: "READ" }, factLink: null, route: "r", tenantId: "t", on: "2026-10-19", run: "r", barred: b });
  const barred = rec(BAR);
  assert.deepEqual([barred.sentence, barred.quotation, barred.wordsWithheld], [null, null, LICENCE_WITHHELD]);
  assert.deepEqual([rec(OPEN).sentence, rec(OPEN).quotation], ["a sentence", "a quotation"], "an open source lost its words");
  assert.equal(withheldExtraction({ source: BAR, quotation: "q" }, b).quotation, null);
});

test("R4 · THE BUILD REFUSES A CLAIM QUOTING A BARRED SOURCE · FIRING CONTROL: refused by name; a claim citing it without a quotation, or quoting an open source, is kept", () => {
  const b = barredSources(FACTS);
  const r = claimsQuotingBarred([
    { claimId: "q-bar", quotation: "words", source: { link: BAR } },
    { claimId: "n-bar", quotation: null, source: { link: BAR } },
    { claimId: "q-open", quotation: "words", source: { link: OPEN } },
  ], b);
  assert.deepEqual(r.refused.map((x) => [x.claimId, x.refused]), [["q-bar", BUILD_REFUSAL]]);
  assert.deepEqual(r.kept.map((c) => c.claimId), ["n-bar", "q-open"]);
});

/* ── REAL ── */
const index = rootIndexFor(process.env);
const BATCH = join(lookupStore(index, "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const PRIV = privateSourcesRoot(process.env);
const HERE = existsSync(join(BATCH, "page-drafts.json"));
const rows = (d, f) => (existsSync(join(d, f)) ? readFileSync(join(d, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
const THREE = JSON.parse(readFileSync(join(REPO, "config", "licence-withheld-shingles.json"), "utf8"));

test("REAL · the 3 licence-barred records: barred by their own records; no text kept for them anywhere the engine reads; no claim quotes them; their verdicts BLOCKED", { skip: HERE ? false : "the declared batch is not on this machine" }, async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const b = barredSources((await loadRegistry(product.factsDir, product.productId)).records);
  for (const u of THREE.urls) assert.ok(isBarred(b, u), `${u} is not barred by its own records`);
  /* the public reads hold no text at all; the private reads hold none for these 3 (only URL, date, sha256 and the reason) */
  const pub = rows(BATCH, "source-reads.jsonl").filter((r) => THREE.urls.includes(r.url));
  assert.ok(pub.length >= 3 && pub.every((r) => r.text === null), "a public read holds a text");
  if (PRIV.state === "DECLARED") {
    const priv = rows(join(PRIV.dir, "research", "rr254-test-pages-2026-10-12"), "source-reads.jsonl").filter((r) => THREE.urls.includes(r.url));
    assert.ok(priv.length >= 3 && priv.every((r) => r.text === null && typeof r.textWithheld === "string" && /^[0-9a-f]{64}$/.test(r.sha256) && /^\d{4}-\d{2}-\d{2}$/.test(r.readOn)), "a private read of a barred page kept its text, or lost its hash or date");
    const joined = withPrivateTexts(rows(BATCH, "source-reads.jsonl"), rows(join(PRIV.dir, "research", "rr254-test-pages-2026-10-12"), "source-reads.jsonl")).filter((r) => THREE.urls.includes(r.url));
    assert.ok(joined.every((r) => r.text === null && r.textMissing === TEXT_MISSING.WITHHELD));
  }
  /* no claim of the drafts quotes them (R4 on the real drafts) */
  const claims = JSON.parse(readFileSync(join(BATCH, "page-drafts.json"), "utf8")).pages.flatMap((p) => p.needs.flatMap((n) => n.answer?.claims ?? []));
  const q = claimsQuotingBarred(claims, b);
  assert.deepEqual(q.refused, [], "a real claim quotes a licence-barred source");
  assert.ok(claims.some((c) => isBarred(b, c.source?.link)), "EMPTY real population: no claim cites a barred source");
  /* the filed verdicts on them are BLOCKED by that licence — never OFFICIAL on their words */
  const { verdicts } = JSON.parse(readFileSync(join(BATCH, "applicability-verdicts-2026-10-17.json"), "utf8"));
  assert.ok(verdicts.filter((v) => THREE.urls.includes(v.page)).every((v) => v.kind === "BLOCKED" && !("excerpt" in v)), "a filed verdict stands on a barred page's words");
  console.log(`  REAL (count-only): barred sources ${b.size} · the 3 pages' reads without text ${pub.length} public · claims citing them ${claims.filter((c) => isBarred(b, c.source?.link)).length}, quoting them 0`);
});

/* the census: no tracked file of a PUBLIC tree holds a run of 13+ consecutive words of the 3 pages, nor any 8-word sequence in a quotation field */
const HASHES = new Set(THREE.shingles);
/* RR-323: the census and the practice samples' check share ONE implementation (src/facts/licence-guard.mjs R5) */
const h16 = shingleHash, words = wordsOf;
const longestRun = (text, hashes = HASHES) => runOf(text, hashes);
function censusOf(root) {
  const files = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 30 }).split("\0").filter((f) => f && !f.startsWith("runs/crawl/"));
  const out = [];
  for (const f of files) { const p = join(root, f); let t; try { if (statSync(p).size > 20e6) continue; t = readFileSync(p, "utf8"); } catch { continue; } const n = longestRun(t); if (n >= 13) out.push(`${f} · ${n} words`); }
  return out;
}
test("CENSUS · the PUBLIC trees hold no passage of the 3 pages: no tracked file of the data repo or of this engine holds 13+ consecutive words of them — and the control fires", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const data = lookupStore(index, "RESEARCH").rootPath;
  assert.deepEqual(censusOf(data), [], "the public data repository holds a passage of a licence-barred page");
  assert.deepEqual(censusOf(REPO), [], "this engine holds a passage of a licence-barred page");
  /* CONTROL: a planted 14-word run whose 8-word sequences are added to a COPY of the hash set fires at 14; 12 words stay under the bar */
  const planted = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november";
  const w = words(planted), withPlant = new Set(HASHES);
  for (let i = 0; i + 8 <= w.length; i++) withPlant.add(h16(w.slice(i, i + 8).join(" ")));
  assert.equal(longestRun(`text before ${planted} text after`, withPlant), 14, "the census cannot see a planted passage");
  assert.equal(longestRun(w.slice(0, 12).join(" "), withPlant), 12);
  assert.equal(longestRun(planted), 0, "the real hash set holds a planted sequence");
  assert.ok(THREE.shingles.length > 1000, "the hashed sequences are too few to be the 3 pages");
});

test("the guard names no product and loads no module that can make a network, process, connector or paid call — and the control fires", () => {
  const F = "src/facts/licence-guard.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, []);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
