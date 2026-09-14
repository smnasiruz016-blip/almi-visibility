/**
 * 🔴 ROW 6, ASSEMBLED — ONE PATH FROM THE STORE TO THE VERDICTS, SHARED BY THE RUNNER AND THE TEST.
 *
 * Its input is the subject's real evidence, every part NAMED: row 5's intent record (built on the query pull it
 * pins), the country×query pull and the page-rows pull below, and the archived bodies of the 12 September crawl.
 * The axes it must test are READ from row 6's frozen EXPECTED clause, not retyped here.
 */
import { loadBoundaries } from "../checklist/boundaries.mjs";
import { extractBody, shingles, jaccard } from "../audit/shell.mjs";
import { row5 } from "./row5.mjs";
import { splitPopulation } from "./query-population.mjs";
import { discoverAxes, axisErrors } from "./axis-discovery.mjs";
import { availableSubjects, importSubjectModule } from "../subject-roots.mjs";

/** The Search Console country×query pull of 2026-09-12T23:25:04.608Z. */
export const COUNTRY_QUERY_OBSERVATION = "9bf50cfb134a0d7d";
/** The Search Console page-rows pull of 2026-09-12T22:06:43.410Z (1,525 pages). */
export const PAGE_ROWS_OBSERVATION = "9f8cbf772d1cd434";

function observation(records, id, methodSuffix) {
  const o = records.find((r) => r.record_type === "observation" && r.observation_id === id);
  if (!o) throw new Error(`observation ${id} is not in the store — the row's input is missing, not empty`);
  if (!o.method.endsWith(methodSuffix)) throw new Error(`observation ${id} is ${o.method}, not ${methodSuffix}`);
  return o;
}

/** The axes the frozen contract names, read from its EXPECTED clause: "axes (a, b, c)". */
export function contractAxes(boundaries = loadBoundaries()) {
  const m = String(boundaries[6]?.expected ?? "").match(/axes \(([^)]+)\)/);
  if (!m) throw new Error("row 6's EXPECTED clause names no axes — the contract could not be read");
  return m[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
}

/** Archived page pairs that differ in exactly one path segment, per axis, each with its measured body overlap. */
export function siblingPairs({ bodies, crawlRecords, families }) {
  const seen = new Set();
  const pages = [];
  for (const r of crawlRecords) {
    if (r.record_type !== "observation" || !bodies.has(r.observation_id) || !r.target?.ref) continue;
    const u = new URL(r.target.ref);
    const segs = u.pathname.split("/").filter(Boolean);
    const id = `${u.host}/${segs.join("/")}`;
    if (seen.has(id)) continue;
    seen.add(id);
    pages.push({ url: r.target.ref, host: u.host, segs, id: r.observation_id });
  }
  const cache = new Map();
  const shinglesOf = (p) => {
    if (!cache.has(p.id)) {
      const e = extractBody(bodies.get(p.id));
      cache.set(p.id, e.confident ? shingles(e.bodyText) : null);
    }
    return cache.get(p.id);
  };
  const out = {};
  for (const [axis, list] of Object.entries(families)) {
    out[axis] = [];
    for (const f of list) {
      const group = pages.filter((p) => p.host === f.host && p.segs[0] === f.prefix && p.segs.length === f.depth);
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          const diff = group[i].segs.map((s, k) => (s !== group[j].segs[k] ? k : -1)).filter((k) => k >= 0);
          if (diff.length !== 1 || diff[0] !== f.segment) continue;
          const a = group[i].segs[f.segment];
          const b = group[j].segs[f.segment];
          if (f.include && !f.include(a, b)) continue;
          const sa = shinglesOf(group[i]);
          const sb = shinglesOf(group[j]);
          out[axis].push({ a: group[i].url, b: group[j].url, overlap: sa && sb ? jaccard(sa, sb) : null });
        }
      }
    }
  }
  return out;
}

/**
 * Every declared product's axis, read from its own descriptor (`<root>/<id>/product.mjs`, over every subject root) —
 * the axis a human chose by hand before anything ran. The engine names no product: it lists the roots and reads what
 * each declares.
 */
export async function readDeclaredAxes() {
  const out = {};
  for (const id of availableSubjects()) {
    const mod = await importSubjectModule(id, "product.mjs");
    const descriptor = Object.values(mod).find((v) => v && typeof v === "object" && v.axis?.key);
    if (descriptor) out[id] = descriptor.axis.key;
  }
  return out;
}

/** Pages in the page rows whose URL carries an axis's pattern: the axis HARD-CODED into the URL space. */
export function hardCodedIn(pageRows, patterns) {
  return Object.fromEntries(Object.entries(patterns).map(([axis, res]) => {
    const hits = pageRows.filter((r) => res.some((re) => re.test(r.url)));
    return [axis, { pages: hits.length, impressions: hits.reduce((n, r) => n + (r.impressions || 0), 0), examples: hits.slice(0, 3).map((r) => r.url) }];
  }));
}

export function row6({ records, crawlRecords, bodies, lexicon, reference, ambiguous, specs, families, patterns, declaredAxes = {} }) {
  const r5 = row5({ records, lexicon, reference, ambiguous });
  const clusterOf = new Map(r5.record.flatMap((c) => c.members.map((m) => [m.original, c.id])));
  const cq = observation(records, COUNTRY_QUERY_OBSERVATION, ":country-query");
  const cqPopulation = splitPopulation(cq.value.rows);
  const pages = observation(records, PAGE_ROWS_OBSERVATION, ":page-rows");
  const pairs = siblingPairs({ bodies, crawlRecords, families });
  const declaredBy = {};
  for (const [productId, key] of Object.entries(declaredAxes)) (declaredBy[key] ||= []).push(productId);

  const results = discoverAxes({
    record: r5.record,
    specs,
    countryRows: cqPopulation.human,
    intentOf: (q) => clusterOf.get(q) ?? null,
    siblingPairs: pairs,
    siblingFamilies: families,
    hardCoded: hardCodedIn(pages.value.rows, patterns),
    declaredBy,
  });
  const named = contractAxes();
  return {
    input: {
      queries: { observationId: r5.input.observationId, rows: r5.input.rowCount, human: r5.population.human.length, operators: r5.population.operators.length },
      countryQuery: { observationId: COUNTRY_QUERY_OBSERVATION, observedAt: cq.observed_at, rows: cq.value.rows.length, human: cqPopulation.human.length, operators: cqPopulation.operators.length, countries: new Set(cqPopulation.human.map((r) => r.country)).size },
      pageRows: { observationId: PAGE_ROWS_OBSERVATION, observedAt: pages.observed_at, rows: pages.value.rows.length },
      archivedBodies: bodies.size,
    },
    contractAxes: named,
    row5Errors: r5.errors,
    results,
    errors: axisErrors({ results, namedAxes: named }),
  };
}
