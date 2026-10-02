/**
 * F13 · CONTEXT AND AXIS DISCOVERY (acceptance _handoffs 0ca24d3, RR-131 §3).
 *
 * Fixtures DRIVE the rules (hand-counted below); they never stand in for the real population. The two-product proof runs the production
 * reader over the engine's two unrelated neutral test products (different dimensions, their own registries). The REAL test reads the
 * demonstration product's own registry and the crawl partition of the tenant its registry is declared to — the only source of reported
 * figures. Nothing is fetched or rendered; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { discoverAxes, qualifierPairs, declaredLanguage, STATUS, KIND, MISSING, NOT_MEASURED } from "../src/discovery/context-axes.mjs";
import { readProductAxes, declaredKeys } from "../src/discovery/context-axes-reader.mjs";
import { qualifierKeys } from "../src/page/page-opportunities-reader.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { PRODUCT as KNOTS } from "../products/neutral-test-knots/product.mjs";
import { PRODUCT as FERMENTS } from "../products/neutral-test-ferments/product.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const CODE = ["src/discovery/context-axes.mjs", "src/discovery/context-axes-reader.mjs", "bin/context-axes.mjs"];

const fact = (qualifier, verificationState = "VERIFIED") => ({ claim: { qualifier }, verificationState });
const page = (html, over = {}) => ({ fetched: true, html, truncated: false, ...over });
const doc = (lang) => `<!doctype html><html${lang === null ? "" : ` lang="${lang}"`}><head><title>T</title></head><body><p>x</p></body></html>`;

/* ================= C1 ================= */

test("C1 · FIRING CONTROL: a dimension is discovered only where a record carries it — counted once per record, values counted, never printed", () => {
  assert.deepEqual(qualifierPairs(fact("a=1,b=2")), [["a", "1"], ["b", "2"]]);
  assert.deepEqual(qualifierPairs(fact({ a: "1", "not a key": "x" })), [["a", "1"]]);
  assert.deepEqual(qualifierPairs(fact("free text, no pair")), []);
  assert.equal(declaredLanguage(doc("xx")), "xx");
  assert.equal(declaredLanguage("<html LANG='yy-ZZ'><body></body></html>"), "yy-ZZ");
  assert.equal(declaredLanguage(doc(null)), null);
  const r = discoverAxes({ declared: [], facts: [fact("a=1,a=2"), fact("a=3,b=1"), fact("no pair here")], pages: [page(doc("xx")), page(doc("xx")), page(doc("yy"))] });
  const by = Object.fromEntries(r.discovered.map((d) => [d.key, d]));
  assert.deepEqual([by.a.records, by.a.distinctValues, by.b.records], [2, 3, 1], "a record was counted twice for one repeated key, or a value was lost");
  assert.deepEqual([by.lang.records, by.lang.distinctValues, by.lang.kind], [3, 2, KIND.PAGE_LANGUAGE]);
  assert.deepEqual(Object.keys(r.discovered[0]).sort(), ["distinctValues", "key", "kind", "records", "unverifiedRecords", "verified", "verifiedRecords"], "a value's text left the discovery");
  assert.equal(r.facts.withQualifier, 2);
  assert.deepEqual(discoverAxes({ facts: [fact("plain text")], pages: [] }).discovered, [], "a dimension was reported with no record carrying it");
});

/* ================= C2 ================= */

test("C2 · FIRING CONTROL: a declared dimension is EVIDENCED only with a carrying record; a discovered one not declared is a CANDIDATE — never added", () => {
  const declared = ["a", "z"];
  const r = discoverAxes({ declared, facts: [fact("a=1"), fact("c=9")], pages: null });
  assert.deepEqual(r.declared.map((d) => [d.key, d.status, d.records]), [["a", STATUS.EVIDENCED, 1], ["z", STATUS.NOT_EVIDENCED, 0]]);
  assert.deepEqual(r.candidates, [{ key: "c", status: STATUS.CANDIDATE }]);
  assert.deepEqual(declared, ["a", "z"], "a candidate was added to the product's declaration");
  const product = { axis: { key: "a" }, planning: { dimensions: [{ key: "z" }] } };
  assert.deepEqual(declaredKeys(product), ["a", "z"]);
  assert.equal(product.planning.dimensions.length, 1, "discovery changed a declaration");
});

/* ================= C3 ================= */

test("C3 · FIRING CONTROL: VERIFIED records are counted apart; a dimension carried only by unverified records never reads verified", () => {
  const r = discoverAxes({ facts: [fact("a=1", "VERIFIED"), fact("a=2", "UNKNOWN"), fact("b=1", "UNVERIFIED")], pages: null });
  const by = Object.fromEntries(r.discovered.map((d) => [d.key, d]));
  assert.deepEqual([by.a.verifiedRecords, by.a.unverifiedRecords, by.a.verified], [1, 1, true]);
  assert.deepEqual([by.b.verifiedRecords, by.b.verified], [0, false], "an unverified-only dimension read verified");
  const p = discoverAxes({ facts: [], pages: [page(doc("xx"))] }).discovered[0];
  assert.deepEqual([p.verifiedRecords, p.verified], [0, false], "a served page was counted as a VERIFIED record");
});

/* ================= C4 ================= */

test("C4 · FIRING CONTROL: a missing evidence kind is NOT MEASURED and named — never 0; truncated and unfetched pages are counted apart; no language is ever assigned", () => {
  const none = discoverAxes({ facts: null, pages: null });
  assert.deepEqual(none.notMeasured, [{ kind: KIND.FACT_QUALIFIER, missing: MISSING.registry }, { kind: KIND.PAGE_LANGUAGE, missing: MISSING.pages }]);
  assert.equal(none.facts.records, NOT_MEASURED, "an unread registry printed as 0 records");
  assert.equal(none.pages, NOT_MEASURED);
  assert.equal(discoverAxes({ facts: [], pages: [] }).pages, NOT_MEASURED, "an empty page set read as a measured zero");
  const r = discoverAxes({ facts: [], pages: [page(doc("xx")), page(doc(null)), page(doc("yy"), { truncated: true }), { fetched: false, html: null, truncated: false }] });
  assert.deepEqual(r.pages, { held: 4, readable: 2, declaringNone: 1, truncatedNotMeasured: 1, unfetchedNotMeasured: 1 });
  assert.equal(r.discovered.find((d) => d.key === "lang").records, 1, "a page declaring no language, or a truncated one, was assigned a language");
  assert.equal(r.incomplete, true);
});

/* ================= C5 ================= */

test("C5 · FIRING CONTROL: no threshold decides discovery — one record suffices, and no minimum, share or probability exists in the code", () => {
  const one = discoverAxes({ facts: [fact("rare=1", "UNKNOWN")], pages: null });
  assert.deepEqual(one.discovered.map((d) => [d.key, d.records]), [["rare", 1]], "a dimension carried by one record was not discovered");
  const code = readFileSync(join(REPO, CODE[0]), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  assert.doesNotMatch(code, /[<>]=?\s*(?:[2-9]|\d{2,}|0?\.\d)|\b(MIN|MAX|THRESHOLD|SHARE|WEIGHT|PERIOD|DAYS)_?[A-Z_]*\s*=\s*[\d.]/i, "a threshold appeared in the discovery code");
});

/* ================= C6 ================= */

const DIMENSION_NAMES = ["profession", "country", "destination", "nationality", "purpose", "knot", "ferment", "role", "stage", "location"];

test("C6 · FIRING CONTROL: the code names no product word and no dimension — and each scanner fires when one is planted", () => {
  assert.ok(PRODUCT_WORDS.length > 0);
  for (const f of CODE) {
    const text = readFileSync(join(REPO, f), "utf8");
    assert.deepEqual(scanSource(text).code, [], `${f} names a product in code`);
    const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    for (const d of DIMENSION_NAMES) assert.doesNotMatch(code, new RegExp(`["'\`]${d}["'\`]`, "i"), `${f} names the dimension "${d}"`);
  }
  const planted = `${readFileSync(join(REPO, CODE[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\nconst D = "profession";\n`;
  assert.ok(scanSource(planted).code.length > 0, "the product-word scanner did not fire");
  assert.match(planted.replace(/\/\*[\s\S]*?\*\//g, ""), /["']profession["']/, "the dimension scanner did not fire");
});

test("C6 · TWO UNRELATED PRODUCTS, DIFFERENT DIMENSIONS — each discovers only from its own records, and neither's evidence is counted for the other", async () => {
  const k = (await readProductAxes({ product: KNOTS, tenantId: null, resolve: null })).axes;
  const f = (await readProductAxes({ product: FERMENTS, tenantId: null, resolve: null })).axes;
  const kr = (await loadRegistry(KNOTS.factsDir, KNOTS.productId)).records, fr = (await loadRegistry(FERMENTS.factsDir, FERMENTS.productId)).records;
  assert.deepEqual(k.discovered.map((d) => [d.key, d.records]), [[KNOTS.axis.key, kr.filter((r) => qualifierPairs(r).length).length]]);
  assert.deepEqual(f.discovered.map((d) => [d.key, d.records]), [[FERMENTS.axis.key, fr.filter((r) => qualifierPairs(r).length).length]]);
  assert.notEqual(KNOTS.axis.key, FERMENTS.axis.key);
  assert.deepEqual([k.declared[0].status, f.declared[0].status], [STATUS.EVIDENCED, STATUS.EVIDENCED]);
  assert.ok(!k.discovered.some((d) => d.key === FERMENTS.axis.key) && !f.discovered.some((d) => d.key === KNOTS.axis.key), "one product's evidence was counted for the other");
  assert.equal(k.pages, NOT_MEASURED, "a product with no tenant partition read was given pages");
  assert.ok(!k.discovered[0].verified, "an unverified test registry read verified");
});

/* ================= REAL ================= */

test("REAL · the demonstration product: its own registry and its own tenant's stored pages — every count traces to a record", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const resolve = createTenantResolver();
  const reg = readDeclarations().attachments.filter((a) => a.resourceKind === "FACT_REGISTRY" && a.resourceRef.endsWith(`${product.productId}/facts`));
  assert.equal(reg.length, 1, "the product's registry is not declared to exactly one tenant");
  const { axes: a } = await readProductAxes({ product, tenantId: reg[0].tenantId, resolve });
  const records = (await loadRegistry(product.factsDir, product.productId)).records;
  assert.ok(records.length > 0 && a.pages !== NOT_MEASURED && a.pages.readable > 0, "EMPTY real population");
  /* cross-check with F91's own qualifier reader: the same keys, the same record counts */
  const keys = qualifierKeys(records);
  for (const d of a.discovered.filter((x) => x.kind === KIND.FACT_QUALIFIER)) assert.equal(d.records, keys.get(d.key), `${d.key}: counts disagree with F91's reader`);
  assert.equal(a.discovered.filter((x) => x.kind === KIND.FACT_QUALIFIER).length, keys.size);
  assert.equal(a.declared.find((d) => d.key === product.axis.key)?.status, STATUS.EVIDENCED);
  assert.equal(a.pages.held, a.pages.readable + a.pages.declaringNone + a.pages.truncatedNotMeasured + a.pages.unfetchedNotMeasured);
  console.log(`  REAL (count-only, the demonstration product's registry and its tenant's own partition): ${JSON.stringify({ facts: a.facts, pages: a.pages, discovered: a.discovered.map((d) => ({ kind: d.kind === KIND.FACT_QUALIFIER ? "fact" : "page", records: d.records, verified: d.verifiedRecords, distinct: d.distinctValues })), declared: a.declared.map((d) => d.status), candidates: a.candidates.length, notMeasured: a.notMeasured.length })}`);
});

/* ================= the entry point ================= */

test("C6 · THE ENTRY POINT: in a declared world it prints dimension keys and counts — never a value, URL or content — and writes nothing", async () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const values = [...new Set((await loadRegistry(product.factsDir, product.productId)).records.flatMap((r) => qualifierPairs(r).map(([, v]) => v)).filter((v) => v.length > 3))];
  const WORLD = declaredWorld();
  try {
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/context-axes.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    for (const re of [/discovered\s+\d+ dimension\(s\), each from its records \(one record suffices; no threshold\)/, /declared\s+\S+ EVIDENCED \(\d+ record\(s\)\)/, /candidates\s+.* never added, combined or made a page dimension/, /\(values not printed\)/]) assert.match(ok.stdout, re);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
    for (const v of values) assert.ok(!ok.stdout.includes(v), "the entry point printed a dimension value");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("the discovery and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = CODE.slice(0, 2);
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
