/**
 * 🔴 ROW 3 — KEYWORD & SEARCH-LANGUAGE DISCOVERY · THE OWNED HALF. GREEN on the stored records; each FAILURE limb RED, ALONE.
 *
 * The frozen contract: INPUT the owned Search Console rows (query, query×page, country×query) with ingest dates and row counts ·
 * EXPECTED the real wording discovered and stored — long-tail, synonyms, abbreviations, local phrasing — each keeping its
 * source observation id and ingest date; no keyword ever becomes a URL by itself · FAILURE a keyword promoted to a URL; OR
 * wording normalised so the original cannot be recovered; OR a stored keyword not traceable to a stored owned row ·
 * EVIDENCE the stored records with their observation ids, a held-out sample re-checked against the store, and a test
 * proving no keyword→URL path exists.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { discoverSearchLanguage, searchLanguageErrors, heldOutRecheck, INPUT_OBSERVATIONS } from "../src/discovery/search-language.mjs";
import { keywordUrlCensus, forbiddenReferences } from "../tools/keyword-url-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const STORE_PATH = join(REPO, "runs", "evidence", "evidence.jsonl");
const STORED_PATH = join(REPO, "runs", "discovery", "search-language-2026-09-15.json");
const STORE = createJsonlStore(STORE_PATH).readAll();
const STORED_TEXT = readFileSync(STORED_PATH, "utf8").replace(/\r\n/g, "\n");
const STORED = JSON.parse(STORED_TEXT);
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const clone = (x) => JSON.parse(JSON.stringify(x));
const walk = (dir, rel) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : n.endsWith(".mjs") ? [`${rel}${n}`] : []));
const SOURCES = new Map([...walk(join(REPO, "src"), "src/"), ...walk(join(REPO, "bin"), "bin/")].map((f) => [f, readFileSync(join(REPO, f), "utf8")]));
const FORBIDDEN = ["intent-lexicon", "intent-reference"];

test("🟢 MEASURED — the input: three owned pulls, their ids, ingest dates and row counts; 8 operator strings kept out of people's wording", () => {
  assert.deepEqual(INPUT_OBSERVATIONS, { query: "45ce21253a3fc58c", queryPage: "c97334fdd102df8e", countryQuery: "9bf50cfb134a0d7d" });
  assert.deepEqual(Object.values(STORED.input).map((o) => [o.observation_id, o.observed_at, o.rows]), [
    ["45ce21253a3fc58c", "2026-09-12T23:25:03.868Z", 337],
    ["c97334fdd102df8e", "2026-09-12T23:25:04.172Z", 574],
    ["9bf50cfb134a0d7d", "2026-09-12T23:25:04.608Z", 388],
  ]);
  assert.equal(STORED.operators.excluded, 8);
  assert.deepEqual(STORED.counts, { records: 329, LONG_TAIL: 207, SYNONYM: 26, ABBREVIATION: 17, LOCAL: 53, UNCLASSIFIED: 106, heldOut: 61 });
  assert.deepEqual([STORED.relations.synonyms.length, STORED.relations.abbreviations.length, STORED.relations.localWords.length, STORED.relations.variants.length], [7, 3, 10, 8]);
  assert.deepEqual(STORED.relations.abbreviations.map((a) => `${a.short}=${a.long}`), ["cv=curriculum vitae", "nz=new zealand", "pte=pearson test of english"]);
});

test("🔴 THE STORED RECORDS ARE EXACTLY WHAT THE STORE YIELDS — a fresh discovery reproduces the committed file byte for byte", () => {
  assert.equal(`${JSON.stringify(discoverSearchLanguage(STORE), null, 2)}\n`, STORED_TEXT);
});

test("🔴 STORED RECORDS — every limb holds: wording byte-identical, every pointer traceable, every kind evidenced, no operator string", () => {
  const errs = searchLanguageErrors({ records: STORED.records, storeRecords: STORE });
  assert.deepEqual(limbs(errs), [], errs.slice(0, 3).map((e) => `[${e.limb}] ${e.why}`).join("\n"));
  for (const r of STORED.records) assert.ok(r.sources.length >= 1 && r.unclassified === (r.kinds.length === 0), r.original);
});

test("🔴 HELD-OUT RE-CHECK — traceability, read from the raw store text: 61 of 61 resolve byte for byte, completely", () => {
  const h = heldOutRecheck(STORED.records, readFileSync(STORE_PATH, "utf8"));
  assert.equal(h.sample, 61);
  assert.equal(h.resolved, 61);
  assert.deepEqual(h.failures, []);
  assert.match(h.rule, /tests TRACEABILITY/);
  assert.match(h.rule, /NOT row 5's held-out/);
});

test("🔴 KEYWORD→URL CENSUS — no consumer of the search-language module builds a URL-shaped value", () => {
  const c = keywordUrlCensus(SOURCES);
  // 🔴 row 4 (15 Sep 2026) builds on row 3's relations and imports its variant rule — so this census polices row 4 too
  assert.deepEqual(c.consumers, ["bin/localized-thinking.mjs", "bin/search-language.mjs", "src/discovery/localized-thinking.mjs", "src/discovery/search-language.mjs"]);
  assert.deepEqual(c.breaches, [], c.breaches.map((b) => `${b.file}:${b.line} ${b.shape}`).join("\n"));
});

test("🔴 NO-LEXICON LAW — the discovery module names neither the row-5 lexicon nor its reference, by import or by path string", () => {
  assert.deepEqual(forbiddenReferences(SOURCES.get("src/discovery/search-language.mjs"), FORBIDDEN), []);
});

/* ---------- each limb RED, alone ---------- */

test("🔴 RED: wording normalised so the original cannot be recovered is refused, alone", () => {
  // Lower-casing — the obvious sabotage — cannot land here: no owned query string holds a single uppercase letter.
  assert.equal(STORED.records.filter((r) => /[A-Z]/.test(r.original)).length, 0);
  const records = clone(STORED.records);
  const r = records.find((x) => x.original === "licenciatura en bilingüismo");
  r.original = r.original.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const errs = searchLanguageErrors({ records, storeRecords: STORE });
  assert.deepEqual(limbs(errs), ["wording-normalised"]);
  assert.match(errs[0].why, /is stored as "licenciatura en bilingüismo"/);
});

test("🔴 RED: a record pointing at an observation the store does not hold is refused, alone", () => {
  const records = clone(STORED.records);
  records[0].sources[0].observation_id = "0000000000000000";
  const errs = searchLanguageErrors({ records, storeRecords: STORE });
  assert.deepEqual(limbs(errs), ["untraceable"]);
  assert.match(errs[0].why, /which the store does not hold/);
});

test("🔴 RED: a kind with no evidence is refused, alone", () => {
  const records = clone(STORED.records);
  records.find((x) => x.kinds.length).kinds[0].evidence = {};
  assert.deepEqual(limbs(searchLanguageErrors({ records, storeRecords: STORE })), ["kind-unevidenced"]);
});

test("🔴 RED: an operator string stored as a person's wording is refused, alone", () => {
  const q = STORE.find((o) => o.observation_id === INPUT_OBSERVATIONS.query);
  const row = q.value.rows.findIndex((r) => r.query.startsWith("site:"));
  const records = [...clone(STORED.records), { original: q.value.rows[row].query, heldOut: false, unclassified: true, kinds: [], sources: [{ observation_id: q.observation_id, observed_at: q.observed_at, method: q.method, row }] }];
  assert.deepEqual(limbs(searchLanguageErrors({ records, storeRecords: STORE })), ["operator-as-wording"]);
});

test("🔴 RED: a consumer that turns a keyword into a route is caught by the census — by import and by path string", () => {
  const viaImport = new Map([...SOURCES, ["bin/keyword-pages.mjs", 'import { discoverSearchLanguage } from "../src/discovery/search-language.mjs";\nconst route = `/${"x".split(" ").join("-")}`;\n']]);
  const c = keywordUrlCensus(viaImport);
  assert.ok(c.consumers.includes("bin/keyword-pages.mjs"));
  assert.ok(c.breaches.some((b) => b.file === "bin/keyword-pages.mjs"));
  const viaString = new Map([...SOURCES, ["src/page/keyword-slug.mjs", 'const m = await import("../discovery/" + "search-language.mjs");\nexport const slugOf = (k) => k;\n']]);
  assert.ok(keywordUrlCensus(viaString).breaches.some((b) => b.file === "src/page/keyword-slug.mjs" && b.shape === "slug"));
  const viaSpawn = new Map([...SOURCES, ["bin/keyword-run.mjs", 'import { spawnSync } from "node:child_process";\nspawnSync("node", ["bin/search-language.mjs", "--json"]);\nconst href = "x";\n']]);
  assert.ok(keywordUrlCensus(viaSpawn).breaches.some((b) => b.file === "bin/keyword-run.mjs" && b.shape === "href"));
});

test("🔴 CONTROL: a path held only as TEXT, in a file that cannot load or run it, is not a consumer — the narrowing of 15 Sep, stated as a limit", () => {
  const prose = 'export const ROW = { route: "TEST_RUN", test: "node bin/search-language.mjs --check" };\n';
  const asText = new Map([...SOURCES, ["src/ledger-like.mjs", prose]]);
  assert.ok(!keywordUrlCensus(asText).consumers.includes("src/ledger-like.mjs"));
  const runnable = new Map([...SOURCES, ["src/ledger-like.mjs", `import { execSync } from "node:child_process";\n${prose}`]]);
  assert.ok(keywordUrlCensus(runnable).breaches.some((b) => b.file === "src/ledger-like.mjs" && b.shape === "route"));
});

test("🔴 RED: the no-lexicon law catches an import AND a bare path string — and a comment is not a dependency", () => {
  assert.deepEqual(forbiddenReferences('import { LEXICON } from "../../config/discovery/intent-lexicon.mjs";', FORBIDDEN), ["intent-lexicon"]);
  assert.deepEqual(forbiddenReferences('const p = "config/discovery/intent-reference.mjs";', FORBIDDEN), ["intent-reference"]);
  assert.deepEqual(forbiddenReferences("// the row-5 intent-lexicon is deliberately not read here\nexport const x = 1;\n", FORBIDDEN), []);
});
