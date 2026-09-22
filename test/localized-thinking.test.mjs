/**
 * 🔴 ROW 4 — LOCALIZED HUMAN THINKING. GREEN on the stored records; each limb RED, ALONE.
 *
 * The frozen contract: INPUT the same goal expressed from two or more countries · EXPECTED local phrasing and reasoning
 * are researched; country is a research lens, never an automatic URL axis · FAILURE a country multiplies URLs without
 * evidence of materially different useful content · EVIDENCE the local-wording records and their sources.
 *
 * Half (a) of FAILURE is tested by the country→URL census. Half (b) is BLOCKED — NOT TESTED: the answer at each country
 * is not in the store, and these tests hold the row to saying so.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

/** A content fingerprint: the first 16 hex of sha256 over the JSON of a whole structure — strict, and reveals no wording. */
const fingerprint = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);

import { createJsonlStore } from "../src/evidence/store.mjs";
import { localizedThinking, localizedThinkingErrors, rowThreeRelations, COUNTRY_FLOOR, HALF_B, ROW3_STORED, ROW6_ORIGIN, INPUT_OBSERVATIONS } from "../src/discovery/localized-thinking.mjs";
import { MIN_ROWS_PER_COUNTRY } from "../src/discovery/axis-discovery.mjs";
import { hardCodedIn } from "../src/discovery/row6.mjs";
import { HARD_CODED_PATTERNS } from "../config/discovery/axis-candidates.mjs";
import { countryUrlCensus, reachesRowFive } from "../tools/country-url-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const STORE = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const ROW3 = JSON.parse(readFileSync(join(REPO, ...ROW3_STORED.split("/")), "utf8"));
const STORED_TEXT = readFileSync(join(REPO, "runs", "discovery", "localized-thinking-2026-09-15.json"), "utf8").replace(/\r\n/g, "\n");
const STORED = JSON.parse(STORED_TEXT);
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const say = (errs) => errs.slice(0, 4).map((e) => `[${e.limb}] ${e.why}`).join("\n");
const clone = (x) => JSON.parse(JSON.stringify(x));
const errorsOf = (result) => localizedThinkingErrors({ result, storeRecords: STORE, row3: ROW3 });
const walk = (dir, rel) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : n.endsWith(".mjs") ? [`${rel}${n}`] : []));
const read = (files) => files.map((f) => [f, readFileSync(join(REPO, f), "utf8")]);
const SOURCES = new Map(read([...walk(join(REPO, "src"), "src/"), ...walk(join(REPO, "bin"), "bin/")]));
const GRAPH = new Map([...SOURCES, ...read(walk(join(REPO, "config"), "config/"))]);
const MODULE = "src/discovery/localized-thinking.mjs";
const goalOf = (r, wording) => r.goals.find((g) => g.wordings.some((w) => w.original === wording));

test("🟢 MEASURED — the input, every number re-derived: 388 rows = 379 human + 9 operator; 337 strings; 33 from two or more countries = 32 human + 1 operator", () => {
  assert.deepEqual([STORED.input.countryQuery.observation_id, STORED.input.countryQuery.observed_at, STORED.input.countryQuery.rows], ["9bf50cfb134a0d7d", "2026-09-12T23:25:04.608Z", 388]);
  assert.deepEqual([STORED.input.pageRows.observation_id, STORED.input.pageRows.rows], ["9f8cbf772d1cd434", 1525]);
  const p = STORED.population;
  assert.deepEqual([p.rows, p.humanRows, p.operatorRows, p.distinctQueries, p.multiCountryQueries, p.multiCountryHuman], [388, 379, 9, 337, 33, 32]);
  assert.equal(p.multiCountryOperator.length, 1);
  assert.match(p.multiCountryOperator[0].original, /^"mastercard foundation" -site:/);
  assert.deepEqual(p.multiCountryOperator[0].countries, ["arg", "bra"]);
  /* 🔴 22 Sep 2026: one of the two widest-spread wordings belongs to a retired held-out population and may not appear in
   * test source. The pair is pinned by what can be said without it — the spread, each query's country list, the other
   * wording — and by a CONTENT FINGERPRINT of the whole structure, which is exactly as strict and reveals no wording. */
  assert.equal(p.widestSpread.countries, 6);
  assert.deepEqual(p.widestSpread.queries.map((q) => q.countries), [["gha", "ind", "kor", "nga", "nzl", "usa"], ["can", "gbr", "hkg", "ind", "qat", "usa"]]);
  assert.equal(p.widestSpread.queries[1].original, "daily habits");
  assert.equal(fingerprint(p.widestSpread), "4fe2e08c00148021");
  // 49 countries over all rows, 48 once the operator rows are out — arg is seen only through an operator string
  assert.deepEqual(p.countriesAllRows, { countries: 49, atOrAboveFloor: 10, exactlyOne: 19 });
  assert.deepEqual(p.countriesHumanRows, { countries: 48, atOrAboveFloor: 10, exactlyOne: 19 });
  assert.deepEqual(p.operatorOnlyCountries, ["arg"]);
  assert.deepEqual(p.outsideRow3, { queries: 0, multiCountry: [] });
});

test("🔴 THE STORED RECORDS ARE EXACTLY WHAT THE STORE YIELDS — a fresh run reproduces the committed file byte for byte", () => {
  assert.equal(`${JSON.stringify(localizedThinking({ storeRecords: STORE, row3: ROW3, estatePatterns: HARD_CODED_PATTERNS }), null, 2)}\n`, STORED_TEXT);
});

test("🔴 STORED RECORDS — every limb holds: traceable to the country×query rows, thin evidence UNKNOWN, goals only on row 3's links, half (b) not decided", () => {
  const errs = errorsOf(STORED);
  assert.deepEqual(limbs(errs), [], say(errs));
});

test("🔴 DEPENDENCY — built on row 3, NOT on row 5: the module's import closure holds row 3's module and no row-5 or row-6 module", () => {
  const r = reachesRowFive(GRAPH, MODULE);
  assert.deepEqual(r.closure, ["src/discovery/localized-thinking.mjs", "src/discovery/query-population.mjs", "src/discovery/search-language.mjs"]);
  assert.deepEqual(r.hits, [], r.hits.map((h) => `${h.file} names ${h.names.join(", ")}`).join("\n"));
  assert.deepEqual(r.unread, []);
  assert.match(STORED.dependency.builtOn, /^row 3 .*VERIFIED-PASS/);
  assert.match(STORED.dependency.notBuiltOn, /^row 5 .*FAILED.*not read/);
  assert.equal(COUNTRY_FLOOR, MIN_ROWS_PER_COUNTRY, "the floor is row 6's locality floor — one number, not two");
});

test("🟢 GROUPING — on row 3's links only: 19 SYNONYM · 1 ABBREVIATION · 10 VARIANT; 13 abbreviation pairs refused as not the same frame", () => {
  assert.deepEqual(STORED.relationsUsed, { SYNONYM: 19, ABBREVIATION: 1, VARIANT: 10 });
  assert.equal(STORED.abbreviationPairsRefused.length, 13);
  assert.ok(STORED.abbreviationPairsRefused.some((x) => x.a === "how to write a curriculum vitae with no experience" && x.b === "i don t have a cv"));
  assert.deepEqual(rowThreeRelations(ROW3).refused, STORED.abbreviationPairsRefused);
  assert.deepEqual(STORED.counts, { goals: 37, DIFFERENT_WORDING: 12, SAME_WORDING: 25, countriesAboveFloor: 10, countriesUnknown: 38 });
  const different = STORED.goals.filter((g) => g.kind === "DIFFERENT_WORDING").map((g) => `${g.wordings.map((w) => w.original).join(" | ")} :: ${g.countries.join(",")}`);
  /* 🔴 22 Sep 2026: seven of these twelve goals name a wording from a retired held-out population, which may not appear
   * in test source. The list is pinned by its count and by a CONTENT FINGERPRINT of the whole list — any change to any
   * wording, order or country list turns it red, and no wording is revealed. */
  assert.equal(different.length, 12);
  assert.equal(fingerprint(different), "3054dfc6e130d9e8");
  // 🔴 the four "habits" wordings a person would group are NOT one goal on row 3's evidence — said, not smoothed over
  const daily = goalOf(STORED, "daily habits");
  for (const w of ["daily lifestyle", "good daily habits", "personal habits"]) assert.ok(!daily.wordings.some((x) => x.original === w), `${w} was joined to "daily habits" without row 3's evidence`);
});

test("🔴 THE THIN-EVIDENCE LAW — 10 countries above the floor of 5; the other 38 UNKNOWN, never 'no local difference'", () => {
  const above = STORED.countries.filter((c) => c.status === "ABOVE_FLOOR").map((c) => c.country);
  assert.deepEqual(above, ["aus", "usa", "gbr", "ind", "can", "rus", "nzl", "pak", "phl", "qat"]);
  const below = STORED.countries.filter((c) => c.humanRows < COUNTRY_FLOOR);
  assert.equal(below.length, 38);
  for (const c of below) {
    assert.equal(c.status, "UNKNOWN");
    assert.match(c.why, /thin evidence, not an absence of local phrasing/);
  }
  assert.equal(STORED.countries.filter((c) => c.humanRows === 1).length, 19);
  assert.match(STORED.rules.absence, /never "not used there"/);
});

test("🔴 COUNTRY→URL CENSUS — no consumer of the localized-thinking module builds a URL-shaped value", () => {
  const c = countryUrlCensus(SOURCES);
  assert.deepEqual(c.consumers, ["bin/localized-thinking.mjs", "src/discovery/local-reasoning.mjs", "src/discovery/localized-thinking.mjs"]);
  assert.deepEqual(c.breaches, [], c.breaches.map((b) => `${b.file}:${b.line} ${b.shape}`).join("\n"));
  assert.equal(STORED.halfA.buildsFromCountry, false);
});

test("🔴 WHAT THE CENSUS CANNOT SEE — the estate's origin pages, re-derived from the page rows with row 6's own function: 775 of 1,525", () => {
  const pages = STORE.find((o) => o.observation_id === INPUT_OBSERVATIONS.pageRows).value.rows;
  const row6 = hardCodedIn(pages, HARD_CODED_PATTERNS).origin;
  assert.deepEqual([STORED.estate.pages, STORED.estate.originHardCoded, STORED.estate.impressions], [1525, 775, 1179]);
  assert.deepEqual([row6.pages, row6.impressions], [STORED.estate.originHardCoded, STORED.estate.impressions]);
  // the two figures cited from row 6, checked against its committed audit rather than trusted
  const audit = readFileSync(join(REPO, "runs", "audit", "row6-census-2026-09-14.txt"), "utf8");
  const origin = audit.slice(audit.indexOf("══ origin"), audit.indexOf("══ destination"));
  assert.match(origin, new RegExp(`discovery \\[PRESENT\\]: ${ROW6_ORIGIN.supportingQueries} human queries carry it`));
  assert.match(origin, new RegExp(`${ROW6_ORIGIN.siblingPairs} archived pairs of OUR pages.*median ${ROW6_ORIGIN.siblingOverlapMedian.replace(".", "\\.")}`));
  assert.match(origin, /hard-coded in the estate: 775 page\(s\)/);
  assert.match(STORED.estate.why, /no census of src\/ and bin\/ can see it/);
});

test("🔴 HALF (b) — BLOCKED, NOT TESTED, with the exact condition; a different QUESTION is never recorded as a different ANSWER", () => {
  assert.deepEqual(STORED.halfB, { ...HALF_B });
  assert.equal(STORED.halfB.state, "BLOCKED — NOT TESTED");
  assert.match(STORED.halfB.unblockedBy, /per-value answer evidence/);
  assert.match(STORED.halfB.unblockedBy, /owner's pending decision/);
  assert.match(STORED.halfB.why, /A different question mix is not a different answer/);
  assert.equal(STORED.reasoning.state, "NOT OBSERVABLE IN OWNED EVIDENCE");
});

/* ---------- each limb RED, alone ---------- */

test("🔴 RED: a wording recorded from a country its row is not from is refused, alone", () => {
  const r = clone(STORED);
  goalOf(r, "pte result").wordings.find((w) => w.original === "pte result").countries[0].country = "gbr";
  goalOf(r, "pte result").countries = ["aus", "can", "gbr"];
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["untraceable"], say(errs));
  assert.match(errs[0].why, /is recorded from gbr; row \d+ of 9bf50cfb134a0d7d is from/);
});

test("🔴 RED: a country below the floor recorded as 'no local difference' is refused, alone", () => {
  const r = clone(STORED);
  const c = r.countries.find((x) => x.humanRows === 1);
  c.status = "NO_LOCAL_DIFFERENCE";
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["thin-evidence-decided"], say(errs));
});

test("🔴 RED: a goal joined BY HAND — 'daily lifestyle' put beside 'daily habits' on a link row 3 never found — is refused, alone", () => {
  const r = clone(STORED);
  const g = goalOf(r, "daily habits");
  const lifestyle = goalOf(r, "daily lifestyle").wordings[0];
  g.wordings.push(lifestyle);
  g.links.push({ a: "daily habits", b: "daily lifestyle", relation: "SYNONYM", words: ["habits", "lifestyle"] });
  const status = new Map(r.countries.map((c) => [c.country, c.status]));
  g.countries = [...new Set(g.wordings.flatMap((w) => w.countries.map((x) => x.country)))].sort();
  g.countriesAboveFloor = g.countries.filter((c) => status.get(c) === "ABOVE_FLOOR");
  g.countriesUnknown = g.countries.filter((c) => status.get(c) !== "ABOVE_FLOOR");
  const errs = errorsOf(r);
  assert.deepEqual(limbs(errs), ["goal-by-hand"], say(errs));
});

test("🔴 RED: half (b) recorded as PASS — or a goal carrying a content verdict — is refused, alone", () => {
  const r = clone(STORED);
  r.halfB.state = "PASS";
  assert.deepEqual(limbs(errorsOf(r)), ["half-b-decided"]);
  const q = clone(STORED);
  goalOf(q, "daily habits").contentDiffers = true;
  assert.deepEqual(limbs(errorsOf(q)), ["half-b-decided"]);
});

test("🔴 RED: an operator string recorded as a wording is refused — and is untraceable too, since it is no row-3 record", () => {
  const r = clone(STORED);
  const row = STORE.find((o) => o.observation_id === INPUT_OBSERVATIONS.countryQuery).value.rows.findIndex((x) => x.query.startsWith("\"mastercard foundation\""));
  const cq = STORE.find((o) => o.observation_id === INPUT_OBSERVATIONS.countryQuery);
  const g = goalOf(r, "pte result");
  g.wordings.push({ original: cq.value.rows[row].query, countries: [] });
  assert.deepEqual(limbs(errorsOf(r)).sort(), ["goal-by-hand", "operator-as-wording", "untraceable"]);
});

test("🔴 RED: a consumer that turns a country into an address is caught by the census — and a bin that only prints is not", () => {
  const breach = new Map([...SOURCES, ["bin/country-pages.mjs", 'import { localizedThinking } from "../src/discovery/localized-thinking.mjs";\nconst country = "aus";\nconst path = `/${country}/pte`;\n']]);
  const c = countryUrlCensus(breach);
  assert.ok(c.consumers.includes("bin/country-pages.mjs"));
  assert.ok(c.breaches.some((b) => b.file === "bin/country-pages.mjs" && b.shape === "a /${…} path template"));
  const quiet = new Map([...SOURCES, ["bin/country-report.mjs", 'import { localizedThinking } from "../src/discovery/localized-thinking.mjs";\nconsole.log("aus");\n']]);
  assert.deepEqual(countryUrlCensus(quiet).breaches, []);
});

test("🔴 RED: a module reaching row 5 is caught — by import, by a path string, and through a file it imports; a comment is not a dependency", () => {
  const viaImport = new Map([...GRAPH, [MODULE, 'import { cluster } from "./intent-clusters.mjs";\n']]);
  assert.deepEqual(reachesRowFive(viaImport, MODULE).hits.map((h) => h.file), ["src/discovery/intent-clusters.mjs", MODULE]);
  const viaString = new Map([...GRAPH, [MODULE, 'const p = "../../config/discovery/intent-lexicon.mjs";\n']]);
  assert.deepEqual(reachesRowFive(viaString, MODULE).hits.map((h) => h.file), [MODULE]);
  const viaSibling = new Map([...GRAPH, [MODULE, 'import { x } from "./helper.mjs";\n'], ["src/discovery/helper.mjs", 'import { row6 } from "./row6.mjs";\n']]);
  assert.ok(reachesRowFive(viaSibling, MODULE).hits.some((h) => h.file === "src/discovery/helper.mjs"));
  const comment = new Map([...GRAPH, [MODULE, "// row 5's intent-clusters are deliberately not read\nexport const x = 1;\n"]]);
  assert.deepEqual(reachesRowFive(comment, MODULE).hits, []);
});
