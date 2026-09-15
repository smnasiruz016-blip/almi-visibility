/**
 * 🔴 ROW 3 — KEYWORD & SEARCH-LANGUAGE DISCOVERY · THE OWNED HALF (class S, Amendment 4).
 *
 * The real wording people used, DISCOVERED FROM THE OWNED EVIDENCE — the Search Console query, query×page and
 * country×query pulls already in the store — and stored with a pointer to every row it came from.
 *
 * ── 🔴 NOTHING HERE IS READ FROM A HAND-WRITTEN LIST ────────────────────────
 *
 * Row 5's clusterer runs on a lexicon of synonyms and abbreviations written by hand. Reading those back and calling
 * them "discovered" would put the standard and the answer in the same hand. So this module reads ONLY the store (and
 * the operator classifier, which reads a string's syntax). A test fails the build if its code names that lexicon or
 * the row-5 reference — by import OR by a path string. Any comparison with the lexicon happens afterwards, outside
 * this module, as a measurement.
 *
 * ── THE FOUR KINDS, EACH ONLY WITH ITS EVIDENCE ─────────────────────────────
 *
 *   LONG_TAIL     the query has at least LONG_TAIL_MIN_WORDS words — evidence: its word count
 *   SYNONYM       two queries identical but for ONE word, both words non-numeric and at least 4 letters, not a variant
 *                 form of each other, and both queries landing on the SAME URL; the substitution recurs in at least
 *                 SYNONYM_MIN_PAIRS independent query pairs — evidence: the pairs and the shared URLs.
 *                 🔴 This proves the two words are used interchangeably in the same frame for the same page. It does
 *                 NOT prove they mean the same thing.
 *   ABBREVIATION  a 2–5 letter word equal to the initials of a word run elsewhere in the owned queries (words of ≤2
 *                 letters skipped), the short form not a word of the run, and a query using the short form sharing an
 *                 exact landing URL with a query using the long form — evidence: both queries and the URL
 *   LOCAL         a non-numeric word seen in at least LOCAL_MIN_ROWS country×query rows, ALL from one country, where
 *                 that concentration is unlikely at the country's own share of rows (share^n < LOCAL_MAX_P) — evidence:
 *                 the word, the country as Search Console reports it, the row count, the share and the probability.
 *                 Nothing is inferred beyond the country. A query carries it only when EVERY one of its country rows
 *                 is from that country.
 *
 * A query no rule can decide is UNCLASSIFIED, and says so. LAW-ABSENT-1: absence of evidence is never a finding, and
 * UNCLASSIFIED never defaults to anything. Plurals, one-letter spellings and punctuation forms are recorded as VARIANT
 * forms — not one of the four kinds.
 *
 * Operator strings (site:, -site:, exact-phrase) are an engine's instruction, not a person's words: they are excluded
 * from the records, kept, and counted.
 */
import { createHash } from "node:crypto";

import { splitPopulation, hasOperatorSyntax } from "./query-population.mjs";

export const OWNED_METHODS = Object.freeze({
  query: "gsc.searchAnalytics.query:query",
  queryPage: "gsc.searchAnalytics.query:query-page",
  countryQuery: "gsc.searchAnalytics.query:country-query",
});

/** The three owned pulls this row was run on — the newest of each method in the store on 15 September 2026. */
export const INPUT_OBSERVATIONS = Object.freeze({
  query: "45ce21253a3fc58c",
  queryPage: "c97334fdd102df8e",
  countryQuery: "9bf50cfb134a0d7d",
});

export const LONG_TAIL_MIN_WORDS = 4;
export const SYNONYM_MIN_PAIRS = 2;
export const SYNONYM_MIN_LETTERS = 4;
export const LOCAL_MIN_ROWS = 3;
export const LOCAL_MAX_P = 0.05;

export const HOLD_OUT_RULE =
  "a record is HELD OUT when the first byte of sha256(its original string, utf8) is divisible by 5 — fixed by the string alone, " +
  "before any discovery rule was written. Here it tests TRACEABILITY: that a sample re-read from the raw store still resolves and " +
  "still matches byte for byte. It is NOT row 5's held-out, which tested generalisation to unseen wording.";

export const LIMITS = Object.freeze([
  "a SYNONYM is interchangeable use in the same query frame landing on the same page — not proof of the same meaning",
  "LOCAL phrasing rests on Search Console's country of the searcher; only 32 of 329 queries have more than one country row, so most locality is undecidable and stays UNCLASSIFIED",
  "the public half — legitimate public search evidence — is DEFERRED: no fetch is authorised",
]);

const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
export const isHeldOut = (original) => parseInt(sha(original).slice(0, 2), 16) % 5 === 0;
const words = (s) => s.split(/\s+/).filter(Boolean);
const numeric = (t) => /^\d+(\.\d+)?$/.test(t);

function editDistanceAtMostOne(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else { i += 1; j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Two words that are the same word written differently: a plural, a one-letter spelling, punctuation. */
export function variantForm(a, b) {
  const letters = (s) => s.replace(/[^\p{L}\p{N}]/gu, "");
  if (letters(a) === letters(b)) return "punctuation";
  if (a === `${b}s` || b === `${a}s` || a === `${b}es` || b === `${a}es`) return "plural";
  if (editDistanceAtMostOne(a, b)) return "spelling";
  return null;
}

function observation(storeRecords, id, method) {
  const o = storeRecords.find((r) => r.record_type === "observation" && r.observation_id === id);
  if (!o) throw new Error(`observation ${id} is not in the store — row 3's input is missing, not empty`);
  if (o.method !== method) throw new Error(`observation ${id} is ${o.method}, not ${method}`);
  return o;
}

/** Discover the search language over the owned pulls. Deterministic: the same store gives the same bytes. */
export function discoverSearchLanguage(storeRecords, ids = INPUT_OBSERVATIONS) {
  const Q = observation(storeRecords, ids.query, OWNED_METHODS.query);
  const QP = observation(storeRecords, ids.queryPage, OWNED_METHODS.queryPage);
  const CQ = observation(storeRecords, ids.countryQuery, OWNED_METHODS.countryQuery);
  const pop = splitPopulation(Q.value.rows);
  const human = [...new Set(pop.human.map((r) => r.query))];

  const src = (o, method) => (row, index) => ({ observation_id: o.observation_id, observed_at: o.observed_at, method, row: index });
  const pointers = new Map(human.map((s) => [s, []]));
  const countriesOf = new Map(human.map((s) => [s, []]));
  const urlsOf = new Map(human.map((s) => [s, new Set()]));
  Q.value.rows.forEach((r, i) => pointers.get(r.query)?.push(src(Q, OWNED_METHODS.query)(r, i)));
  QP.value.rows.forEach((r, i) => {
    if (!pointers.has(r.query)) return;
    pointers.get(r.query).push(src(QP, OWNED_METHODS.queryPage)(r, i));
    urlsOf.get(r.query).add(r.url);
  });
  CQ.value.rows.forEach((r, i) => {
    if (!pointers.has(r.query)) return;
    pointers.get(r.query).push({ ...src(CQ, OWNED_METHODS.countryQuery)(r, i), country: r.country });
    countriesOf.get(r.query).push(r.country);
  });
  const sharedUrls = (a, b) => [...urlsOf.get(a)].filter((u) => urlsOf.get(b).has(u)).sort();

  // ── SYNONYMS and VARIANTS: one-word substitutions in the same frame
  const subst = new Map();
  const variants = new Map();
  for (let i = 0; i < human.length; i += 1) {
    for (let j = i + 1; j < human.length; j += 1) {
      const a = words(human[i]);
      const b = words(human[j]);
      if (a.length !== b.length) continue;
      const diff = a.map((w, k) => (w !== b[k] ? k : -1)).filter((k) => k >= 0);
      if (diff.length !== 1) continue;
      const [ta, tb] = [a[diff[0]], b[diff[0]]];
      if (numeric(ta) || numeric(tb)) continue;
      const shared = sharedUrls(human[i], human[j]);
      const form = variantForm(ta, tb);
      const key = [ta, tb].sort().join(" ");
      const entry = { a: human[i], b: human[j], sharedUrls: shared };
      if (form) {
        const v = variants.get(key) ?? { words: [ta, tb].sort(), form, pairs: [] };
        v.pairs.push(entry);
        variants.set(key, v);
      } else if (shared.length && ta.length >= SYNONYM_MIN_LETTERS && tb.length >= SYNONYM_MIN_LETTERS) {
        const s = subst.get(key) ?? { words: [ta, tb].sort(), pairs: [] };
        s.pairs.push(entry);
        subst.set(key, s);
      }
    }
  }
  const synonyms = [...subst.values()].filter((s) => s.pairs.length >= SYNONYM_MIN_PAIRS).sort((x, y) => y.pairs.length - x.pairs.length || x.words.join().localeCompare(y.words.join()));

  // ── ABBREVIATIONS: a short word = the initials of a word run, both forms landing on one URL
  const abbreviations = new Map();
  const shortWords = new Map();
  for (const s of human) for (const w of words(s)) if (/^[a-z]{2,5}$/.test(w)) shortWords.set(w, [...(shortWords.get(w) || []), s]);
  for (const s of human) {
    const w = words(s);
    for (let i = 0; i < w.length; i += 1) {
      for (let L = 2; L <= Math.min(6, w.length - i); L += 1) {
        const run = w.slice(i, i + L);
        if (run[0].length <= 2 || run[run.length - 1].length <= 2) continue;
        const initials = run.filter((x) => x.length > 2).map((x) => x[0]).join("");
        const users = shortWords.get(initials);
        if (!users || initials.length < 2 || run.includes(initials)) continue;
        for (const u of users) {
          if (u === s) continue;
          // a short form cannot stand for an expansion whose own words sit beside it in the same query
          if (run.some((x) => words(u).includes(x))) continue;
          const shared = sharedUrls(u, s);
          if (!shared.length) continue;
          const key = `${initials} ${run.join(" ")}`;
          const e = abbreviations.get(key) ?? { short: initials, long: run.join(" "), pairs: [] };
          if (!e.pairs.some((p) => p.short === u && p.long === s)) e.pairs.push({ short: u, long: s, sharedUrls: shared });
          abbreviations.set(key, e);
        }
      }
    }
  }

  // ── LOCAL: a word concentrated in one country beyond that country's share
  const totalRows = CQ.value.rows.filter((r) => pointers.has(r.query)).length;
  const rowsByCountry = new Map();
  const tokenCountries = new Map();
  for (const r of CQ.value.rows) {
    if (!pointers.has(r.query)) continue;
    rowsByCountry.set(r.country, (rowsByCountry.get(r.country) || 0) + 1);
    for (const t of new Set(words(r.query))) tokenCountries.set(t, [...(tokenCountries.get(t) || []), r.country]);
  }
  const localWords = [...tokenCountries]
    .filter(([t, cs]) => !numeric(t) && cs.length >= LOCAL_MIN_ROWS && new Set(cs).size === 1)
    .map(([t, cs]) => {
      const share = rowsByCountry.get(cs[0]) / totalRows;
      return { word: t, country: cs[0], rows: cs.length, countryShare: Number(share.toFixed(4)), probability: Number((share ** cs.length).toPrecision(3)) };
    })
    .filter((x) => x.probability < LOCAL_MAX_P)
    .sort((a, b) => a.probability - b.probability || a.word.localeCompare(b.word));

  // ── RECORDS: one per piece of real wording, with every pointer and every evidenced kind
  const records = human.map((s) => {
    const kinds = [];
    const n = words(s).length;
    if (n >= LONG_TAIL_MIN_WORDS) kinds.push({ kind: "LONG_TAIL", evidence: { words: n, rule: `at least ${LONG_TAIL_MIN_WORDS} words` } });
    const syn = synonyms.filter((x) => x.pairs.some((p) => p.a === s || p.b === s));
    if (syn.length) kinds.push({ kind: "SYNONYM", evidence: { relations: syn.map((x) => ({ words: x.words, partners: x.pairs.filter((p) => p.a === s || p.b === s).map((p) => ({ partner: p.a === s ? p.b : p.a, sharedUrls: p.sharedUrls })) })) } });
    const abb = [...abbreviations.values()].filter((x) => x.pairs.some((p) => p.short === s || p.long === s));
    if (abb.length) kinds.push({ kind: "ABBREVIATION", evidence: { relations: abb.map((x) => ({ short: x.short, long: x.long, partners: x.pairs.filter((p) => p.short === s || p.long === s).map((p) => ({ partner: p.short === s ? p.long : p.short, sharedUrls: p.sharedUrls })) })) } });
    const cs = countriesOf.get(s);
    const loc = localWords.filter((x) => words(s).includes(x.word) && cs.length > 0 && cs.every((c) => c === x.country));
    if (loc.length) kinds.push({ kind: "LOCAL", evidence: { country: loc[0].country, words: loc.map((x) => ({ word: x.word, rows: x.rows, countryShare: x.countryShare, probability: x.probability })), queryCountryRows: cs.length } });
    return {
      original: s,
      heldOut: isHeldOut(s),
      unclassified: kinds.length === 0,
      kinds,
      sources: pointers.get(s),
    };
  });

  const count = (k) => records.filter((r) => r.kinds.some((x) => x.kind === k)).length;
  return {
    row: 3,
    half: "OWNED",
    input: Object.fromEntries(Object.entries({ query: Q, queryPage: QP, countryQuery: CQ }).map(([k, o]) => [k, { observation_id: o.observation_id, method: o.method, observed_at: o.observed_at, rows: o.value.rows.length, rowCount: o.value.rowCount }])),
    rules: { LONG_TAIL_MIN_WORDS, SYNONYM_MIN_PAIRS, SYNONYM_MIN_LETTERS, LOCAL_MIN_ROWS, LOCAL_MAX_P, holdOut: HOLD_OUT_RULE },
    operators: { excluded: pop.operators.length, why: "search-operator strings are an engine's instruction, not a person's words", strings: pop.operators.map((o) => ({ original: o.query, kind: o.kind })) },
    counts: {
      records: records.length,
      LONG_TAIL: count("LONG_TAIL"),
      SYNONYM: count("SYNONYM"),
      ABBREVIATION: count("ABBREVIATION"),
      LOCAL: count("LOCAL"),
      UNCLASSIFIED: records.filter((r) => r.unclassified).length,
      heldOut: records.filter((r) => r.heldOut).length,
    },
    relations: {
      synonyms: synonyms.map((x) => ({ words: x.words, pairs: x.pairs.length })),
      abbreviations: [...abbreviations.values()].map((x) => ({ short: x.short, long: x.long, pairs: x.pairs.length })).sort((a, b) => a.short.localeCompare(b.short)),
      localWords,
      variants: [...variants.values()].map((x) => ({ words: x.words, form: x.form, pairs: x.pairs.length })).sort((a, b) => b.pairs - a.pairs || a.words.join().localeCompare(b.words.join())),
    },
    limits: LIMITS,
    records,
  };
}

/**
 * 🔴 ROW 3's LAW over stored records. Returns [] when every limb holds; each error names its limb.
 *   wording-normalised  — a record's original is not byte-identical to the row its pointer names
 *   untraceable         — a pointer names an observation the store does not hold, a method that is not an owned pull, a
 *                         different ingest date, or a row that does not exist; or a record has no pointer into the query pull
 *   kind-unevidenced    — a kind carries no evidence, or a record is neither classified nor marked UNCLASSIFIED honestly
 *   operator-as-wording — an operator string is stored as a person's wording
 */
export function searchLanguageErrors({ records, storeRecords }) {
  const errs = [];
  const byId = new Map(storeRecords.filter((r) => r.record_type === "observation").map((o) => [o.observation_id, o]));
  const owned = new Set(Object.values(OWNED_METHODS));
  for (const rec of records) {
    if (hasOperatorSyntax(rec.original)) errs.push({ limb: "operator-as-wording", why: `"${rec.original}" is a search-operator string stored as a person's wording` });
    if (!Array.isArray(rec.sources) || !rec.sources.some((s) => s.method === OWNED_METHODS.query)) {
      errs.push({ limb: "untraceable", why: `"${rec.original}" has no pointer into the query pull` });
    }
    for (const s of rec.sources ?? []) {
      const o = byId.get(s.observation_id);
      if (!o) { errs.push({ limb: "untraceable", why: `"${rec.original}" points at observation ${s.observation_id}, which the store does not hold` }); continue; }
      if (!owned.has(o.method) || o.method !== s.method) { errs.push({ limb: "untraceable", why: `"${rec.original}" points at ${s.observation_id}, a ${o.method} observation, recorded as ${s.method}` }); continue; }
      if (o.observed_at !== s.observed_at) { errs.push({ limb: "untraceable", why: `"${rec.original}" records ingest ${s.observed_at} for ${s.observation_id}; the store says ${o.observed_at}` }); continue; }
      const row = o.value?.rows?.[s.row];
      if (!row) { errs.push({ limb: "untraceable", why: `"${rec.original}" points at row ${s.row} of ${s.observation_id}, which does not exist` }); continue; }
      if (row.query !== rec.original) errs.push({ limb: "wording-normalised", why: `"${rec.original}" is stored as "${row.query}" at row ${s.row} of ${s.observation_id} — the original wording was changed` });
    }
    const empty = (rec.kinds ?? []).filter((k) => !k.evidence || Object.keys(k.evidence).length === 0);
    for (const k of empty) errs.push({ limb: "kind-unevidenced", why: `"${rec.original}" is called ${k.kind} with no evidence` });
    if (rec.unclassified !== ((rec.kinds ?? []).length === 0)) errs.push({ limb: "kind-unevidenced", why: `"${rec.original}" says unclassified=${rec.unclassified} with ${(rec.kinds ?? []).length} kind(s)` });
  }
  return errs;
}

/**
 * 🔴 THE HELD-OUT RE-CHECK — TRACEABILITY, READ INDEPENDENTLY. It parses the raw store TEXT itself (no store module, no
 * discovery code) and, for every held-out record, resolves every pointer and compares bytes; and it counts, in each
 * pointed-at observation, every row whose query is that exact string, so a pointer DROPPED is caught as well as a
 * pointer WRONG.
 */
export function heldOutRecheck(records, rawStoreText) {
  const observations = new Map();
  for (const line of rawStoreText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if (o.record_type === "observation") observations.set(o.observation_id, o);
  }
  const sample = records.filter((r) => isHeldOut(r.original));
  const failures = [];
  for (const rec of sample) {
    const ids = [...new Set(rec.sources.map((s) => s.observation_id))];
    for (const s of rec.sources) {
      const o = observations.get(s.observation_id);
      const row = o?.value?.rows?.[s.row];
      if (!o || o.observed_at !== s.observed_at || !row || row.query !== rec.original) failures.push({ original: rec.original, pointer: s, why: !o ? "observation absent" : !row ? "row absent" : o.observed_at !== s.observed_at ? "ingest date differs" : "bytes differ" });
    }
    for (const id of ids) {
      const o = observations.get(id);
      const inStore = (o?.value?.rows ?? []).filter((r) => r.query === rec.original).length;
      const pointed = rec.sources.filter((s) => s.observation_id === id).length;
      if (inStore !== pointed) failures.push({ original: rec.original, pointer: { observation_id: id }, why: `the store holds ${inStore} row(s) with this wording; the record points at ${pointed}` });
    }
  }
  return { rule: HOLD_OUT_RULE, sample: sample.length, resolved: sample.length - new Set(failures.map((f) => f.original)).size, failures };
}
