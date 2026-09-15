/**
 * 🔴 ROW 7 — MARKET MEASUREMENT · THE OWNED HALF (class S, Amendment 4): DEMAND AND VISIBILITY/REACH, SEPARATELY.
 *
 * The frozen contract: INPUT the owned rows for the segment — impressions, clicks, CTR, position, by query, page and
 * country — with their date range and dataState · EXPECTED DEMAND and VISIBILITY/REACH measured and reported
 * SEPARATELY, each naming its own method and date range; each carrying the store's own limits (query truncation, data
 * lag, dataState) on its face; the other three dimensions read UNKNOWN · FAILURE DEMAND and VISIBILITY conflated in one
 * number; OR impressions reported as demand; OR SUPPLY, AUDIENCE/NEED or WORTHINESS rendered as measured, left
 * indistinguishable from a measured value, or defaulted to low (LAW-ABSENT-1).
 *
 * ── THE TWO METHODS READ DIFFERENT FIELDS ─────────────────────────────────────
 *
 *   VISIBILITY/REACH  impressions, position, clicks and CTR where the property was shown — property, country, page.
 *   DEMAND            the `query` field only: the distinct human wordings searched at least once. 🔴 Impressions,
 *                     clicks, CTR and position are NOT inputs to it. It is a PRESENCE bound: a floor on the needs
 *                     seen, never a volume, and seen only through our own visibility.
 *
 * ── OBSERVED, INFERRED, UNKNOWN — KEPT APART (row 50's labels) ────────────────
 *
 * What the store says is OBSERVED. An explanation the store is consistent with but does not contain is INFERRED. An
 * explanation the store cannot support is UNKNOWN — however likely it is.
 */
import { splitPopulation } from "./query-population.mjs";
import { LABELS } from "../report/provenance-label.mjs";

const label = (x) => {
  if (!LABELS.includes(x)) throw new Error(`${x} is not one of row 50's labels`);
  return x;
};
const OBSERVED = label("OBSERVED");
const INFERRED = label("INFERRED");
const UNKNOWN = label("UNKNOWN");

/** The newest owned pull of each cut, all over the same range. */
export const INPUT_OBSERVATIONS = Object.freeze({
  aggregate: "8c5f987dc5074cd5",
  country: "59535dbde94fbacd",
  pageRows: "9f8cbf772d1cd434",
  query: "45ce21253a3fc58c",
  queryPage: "c97334fdd102df8e",
  countryQuery: "9bf50cfb134a0d7d",
});

export const DEFERRED = Object.freeze(["SUPPLY", "AUDIENCE_NEED", "WORTHINESS"]);
const UNMEASURED_KEYS = Object.freeze(["dimension", "state", "measured", "value", "method", "why"]);

export const SUPPLY_WHY =
  "the deferred half (Amendment 4): what already answers these needs, and how well, needs external evidence, and no fetch is authorised. Nothing owned measures it — our own page count is our supply, not the market's";
export const AUDIENCE_WHY =
  "the deferred half (Amendment 4): who searches and what they need needs external evidence. A searcher's country is where they were, not who they are";
export const WORTHINESS_WHY =
  "the deferred half, assigned by the owner's addendum to Amendment 4 (13 September 2026), because its own inputs are themselves deferred";

export const DEMAND_RULE =
  "count the distinct human query strings the property was shown for at least once in the range, operator strings excluded (query-population). " +
  "Each is a need at least one person searched for. How many people searched is not read: impressions, clicks, CTR and position are not inputs";
export const VISIBILITY_RULE =
  "where and how prominently the property was shown, and what that reach earned: impressions, position, clicks and CTR, for the property, by country and by page, each quoted from its own observation. " +
  "The property and country cuts are never added to the page cut";

/** A deferred dimension: present, UNKNOWN, unmeasured, valueless — and so never readable as measured or as low. */
const unmeasured = (dimension, why) => Object.freeze({ dimension, state: UNKNOWN, measured: false, value: null, method: null, why });

function observation(storeRecords, id, suffix) {
  const o = storeRecords.find((r) => r.record_type === "observation" && r.observation_id === id);
  if (!o) throw new Error(`observation ${id} is not in the store — row 7's input is missing, not empty`);
  if (!o.method.endsWith(suffix)) throw new Error(`observation ${id} is ${o.method}, not ${suffix}`);
  return o;
}

const sum = (rows, k) => rows.reduce((n, r) => n + (Number(r[k]) || 0), 0);
const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
const quote = (o) => ({
  observation_id: o.observation_id,
  method: o.method,
  observed_at: o.observed_at,
  startDate: o.value.startDate,
  endDate: o.value.endDate,
  dataState: o.value.dataState,
  exhausted: "exhausted" in o.value ? o.value.exhausted : "NOT STORED",
  truncationReason: "truncationReason" in o.value ? o.value.truncationReason : "NOT STORED",
});

/** Measure the owned half over the store. Deterministic. */
export function measureMarket(storeRecords, ids = INPUT_OBSERVATIONS) {
  const AG = observation(storeRecords, ids.aggregate, ":aggregate");
  const CO = observation(storeRecords, ids.country, ":country");
  const PR = observation(storeRecords, ids.pageRows, ":page-rows");
  const Q = observation(storeRecords, ids.query, ":query");
  const QP = observation(storeRecords, ids.queryPage, ":query-page");
  const CQ = observation(storeRecords, ids.countryQuery, ":country-query");
  const inputs = [AG, CO, PR, Q, QP, CQ];
  const ranges = new Set(inputs.map((o) => `${o.value.startDate}→${o.value.endDate}`));
  if (ranges.size !== 1) throw new Error(`row 7's inputs cover different ranges (${[...ranges].join(", ")}) — they cannot be compared`);
  const { startDate, endDate } = AG.value;

  // ── OBSERVED: every total, from the rows themselves
  const t = (o, rows, counting) => ({ observation_id: o.observation_id, rows: rows.length, impressions: sum(rows, "impressions"), clicks: sum(rows, "clicks"), dimensions: o.value.dimensions ?? "NOT STORED", countingInferred: counting });
  const totals = {
    property: { observation_id: AG.observation_id, rows: AG.value.rowCount, impressions: AG.value.totals.impressions, clicks: AG.value.totals.clicks, dimensions: AG.value.dimensions, countingInferred: "once per search" },
    country: t(CO, CO.value.rows, "once per search"),
    page: { ...t(PR, PR.value.rows, "once per page shown"), dimensions: "NOT STORED — the page-rows pull records no dimensions field; its rows are by page" },
    query: t(Q, Q.value.rows, "once per search"),
    countryQuery: t(CQ, CQ.value.rows, "once per search"),
    queryPage: t(QP, QP.value.rows, "once per page shown"),
  };

  // ── QUERY COVERAGE — the real truncation
  const clickedPages = PR.value.rows.filter((r) => r.clicks > 0);
  const pagesWithQuery = new Set(QP.value.rows.map((r) => r.url));
  const coverage = {
    label: OBSERVED,
    byProperty: { impressions: `${totals.query.impressions} of ${totals.property.impressions}`, share: pct(totals.query.impressions, totals.property.impressions), clicks: `${totals.query.clicks} of ${totals.property.clicks}` },
    byPage: { impressions: `${totals.queryPage.impressions} of ${totals.page.impressions}`, share: pct(totals.queryPage.impressions, totals.page.impressions), clicks: `${totals.queryPage.clicks} of ${totals.page.clicks}` },
    mixedBasis: { ratio: `${totals.query.impressions} of ${totals.page.impressions} = ${pct(totals.query.impressions, totals.page.impressions)}`, why: "divides a count pulled without the page dimension by one pulled with it — not recorded as the coverage" },
    clickedPages: clickedPages.length,
    clickedPagesWithAnyQueryRow: clickedPages.filter((r) => pagesWithQuery.has(r.url)).length,
    truncationReasonOnEveryQueryPull: [Q, QP, CQ].map((o) => o.value.truncationReason),
    explanation: {
      claim: "the impressions and clicks with no query attached are Google's anonymisation of rare or clicked queries",
      label: UNKNOWN,
      why: "the store holds the GAP, not its cause: no stored field names which searches were withheld, or why. The likely explanation is recorded UNKNOWN, not promoted to an observation",
    },
  };

  // ── THE 807-vs-541 DISCREPANCY — measured to the query, then labelled
  const qRow = new Map(Q.value.rows.map((r) => [r.query, r]));
  const perQuery = new Map();
  for (const r of QP.value.rows) {
    const a = perQuery.get(r.query) ?? { impressions: 0, pages: new Set() };
    a.impressions += r.impressions;
    a.pages.add(r.url);
    perQuery.set(r.query, a);
  }
  const excess = [...perQuery].filter(([q, a]) => qRow.has(q) && a.impressions > qRow.get(q).impressions);
  const cqPerQuery = new Map();
  for (const r of CQ.value.rows) cqPerQuery.set(r.query, (cqPerQuery.get(r.query) || 0) + r.impressions);
  const pageExceeded = [...new Set(QP.value.rows.map((r) => r.url))].filter((u) => {
    const pageRow = PR.value.rows.find((r) => r.url === u);
    return pageRow && sum(QP.value.rows.filter((r) => r.url === u), "impressions") > pageRow.impressions;
  });
  const discrepancy = {
    status: "LOCALISED, NOT CLOSED",
    observed: {
      label: OBSERVED,
      queryImpressions: totals.query.impressions,
      queryPageImpressions: totals.queryPage.impressions,
      excess: totals.queryPage.impressions - totals.query.impressions,
      queriesInBoth: [...perQuery.keys()].filter((q) => qRow.has(q)).length,
      queriesOnlyInOne: [...perQuery.keys()].filter((q) => !qRow.has(q)).length + [...qRow.keys()].filter((q) => !perQuery.has(q)).length,
      queriesWhereTheSumsAgree: [...perQuery].filter(([q, a]) => qRow.has(q) && a.impressions === qRow.get(q).impressions).length,
      queriesWithExcess: excess.length,
      excessQueriesShownWithMoreThanOnePage: excess.filter(([, a]) => a.pages.size > 1).length,
      queriesWhereTheFinerCutHasFewer: [...perQuery].filter(([q, a]) => qRow.has(q) && a.impressions < qRow.get(q).impressions).length,
      countryQueryAgreesWithQuery: `${[...cqPerQuery].filter(([q, n]) => qRow.get(q)?.impressions === n).length} of ${qRow.size} queries`,
      pagesWhereQueryPageExceedsThePageRow: pageExceeded.length,
      theSameGapAtTheTop: `page ${totals.page.impressions} against property ${totals.property.impressions} and country ${totals.country.impressions}`,
      examples: excess.slice(0, 5).map(([q, a]) => ({ query: q, queryRow: qRow.get(q).impressions, queryPageSum: a.impressions, pages: a.pages.size })),
    },
    explanation: {
      claim: "a pull with the page dimension counts an impression once per page shown; a pull without it counts once per search",
      label: INFERRED,
      why: "consistent with every stored comparison — the excess sits only on queries shown with more than one of our pages, never on a single-page query; a finer cut never loses impressions; the same gap separates page from property. " +
        "But the counting rule is Google's, not the store's: the request named no aggregationType (src/search/google-search-console.mjs), and no stored field records how Google counted",
    },
  };

  // ── DATA LAG — the same range, pulled more than once
  const restatements = storeRecords
    .filter((r) => r.record_type === "observation" && r.method === AG.method && r.value?.startDate === startDate && r.value?.endDate === endDate)
    .sort((a, b) => a.observed_at.localeCompare(b.observed_at))
    .map((o) => ({ observation_id: o.observation_id, observed_at: o.observed_at, impressions: o.value.totals.impressions, clicks: o.value.totals.clicks }));
  const first = restatements[0];
  const last = restatements.at(-1);
  const lag = {
    label: OBSERVED,
    rangeEndsOnThePullDay: endDate === AG.observed_at.slice(0, 10),
    restatements,
    grew: { impressions: last.impressions - first.impressions, clicks: last.clicks - first.clicks, hours: Number(((Date.parse(last.observed_at) - Date.parse(first.observed_at)) / 3600000).toFixed(1)) },
    final: { label: UNKNOWN, why: "no freshness field is stored and the request named no dataState, so whether these totals will still change is not in the store" },
  };

  const limitText = {
    queryTruncation:
      `QUERY TRUNCATION: truncationReason reads ${JSON.stringify(Q.value.truncationReason)} on every query pull — that says the pager drained every row, NOT that every search was reported. ` +
      `Only ${coverage.byProperty.impressions} impressions (${coverage.byProperty.share}) and ${coverage.byProperty.clicks} clicks carry a query; by page, ${coverage.byPage.impressions} (${coverage.byPage.share}) and ${coverage.byPage.clicks} clicks. ` +
      `Every click and most impressions have no query attached. The ${coverage.mixedBasis.ratio.split(" = ")[1]} often quoted divides a count without the page dimension by one with it`,
    dataLag:
      `DATA LAG: the range ${startDate} → ${endDate} ends on the day it was pulled; pulled ${restatements.length} times, the same range grew from ${first.impressions} to ${last.impressions} impressions over ${lag.grew.hours} hours. Whether the newest totals are final is UNKNOWN`,
    dataState:
      `dataState ${AG.value.dataState}, quoted from each observation, is the pager's word for "every page of rows was drained" (src/search/paginate.mjs) — not Google's freshness, and not query coverage`,
  };

  // ── DEMAND: the query field only — a presence bound
  const pop = splitPopulation(Q.value.rows);
  const humanWordings = new Set(pop.human.map((r) => r.query));
  const DEMAND = {
    dimension: "DEMAND",
    state: "BOUNDED — PRESENCE ONLY, MAGNITUDE UNKNOWN",
    measured: true,
    method: { name: "distinct-searched-wordings", fields: ["query"], rule: DEMAND_RULE },
    source: quote(Q),
    value: {
      distinctHumanWordings: humanWordings.size,
      operatorStringsExcluded: pop.operators.length,
      lowerBound: `at least ${humanWordings.size} distinct human wordings were each searched at least once in the range`,
      upperBound: "UNKNOWN — searches with no query attached are not counted, and a need the property was never shown for cannot appear at all",
      magnitude: "UNKNOWN — how many people searched is not in the owned evidence",
    },
    limits: {
      ...limitText,
      selection: "a wording is visible here only because our property was shown for it: this is demand seen THROUGH our own visibility, never the market's demand",
    },
  };

  // ── VISIBILITY/REACH: impressions, position, clicks, CTR — where shown
  const top = (rows, key, n = 10) => [...rows].sort((a, b) => b.impressions - a.impressions || String(a[key]).localeCompare(String(b[key]))).slice(0, n);
  const VISIBILITY_REACH = {
    dimension: "VISIBILITY/REACH",
    state: "MEASURED",
    measured: true,
    method: { name: "shown-and-reached", fields: ["impressions", "position", "clicks", "ctr"], rule: VISIBILITY_RULE },
    sources: [quote(AG), quote(CO), quote(PR)],
    value: {
      property: { observation_id: AG.observation_id, impressions: AG.value.totals.impressions, clicks: AG.value.totals.clicks, ctr: AG.value.totals.ctr, position: AG.value.totals.position },
      byCountry: { observation_id: CO.observation_id, rows: totals.country.rows, impressions: totals.country.impressions, clicks: totals.country.clicks, top: top(CO.value.rows, "country").map((r) => ({ country: r.country, impressions: r.impressions, clicks: r.clicks, position: r.position })) },
      byPage: { observation_id: PR.observation_id, rows: totals.page.rows, impressions: totals.page.impressions, clicks: totals.page.clicks, position: "NOT STORED — the page-rows pull keeps url, clicks and impressions only", top: top(PR.value.rows, "url").map((r) => ({ url: r.url, impressions: r.impressions, clicks: r.clicks })) },
      neverAdded: "the property and country cuts and the page cut count differently (INFERRED — see the discrepancy); they are reported side by side and never summed",
    },
    limits: {
      ...limitText,
      queryTruncation: `${limitText.queryTruncation}. Visibility by property, country and page is NOT restricted by it — those cuts carry every impression the property earned; only the query cuts lose them`,
    },
  };

  return {
    row: 7,
    class: "S",
    half: "OWNED",
    segment: { property: AG.target.ref, why: "no narrower segment is defined in the owned evidence — the segment is the whole property" },
    input: Object.fromEntries(Object.entries({ aggregate: AG, country: CO, pageRows: PR, query: Q, queryPage: QP, countryQuery: CQ }).map(([k, o]) => [k, quote(o)])),
    totals,
    coverage,
    discrepancy,
    dataLag: lag,
    dimensions: {
      DEMAND,
      VISIBILITY_REACH,
      SUPPLY: unmeasured("SUPPLY", SUPPLY_WHY),
      AUDIENCE_NEED: unmeasured("AUDIENCE/NEED", AUDIENCE_WHY),
      WORTHINESS: unmeasured("WORTHINESS", WORTHINESS_WHY),
    },
    backwardsFinding: {
      rows: [3, 5, 6],
      observed: `rows 3, 5 and 6 stand on the query pull ${Q.observation_id}: ${coverage.byProperty.share} of the property's impressions and ${coverage.byProperty.clicks} of its clicks. The wording they study is the part of search that carries a query and was never clicked`,
      onTheirFaces: "row 6 names the 0 clicks; none of the three names the query coverage",
      action: "REPORTED FOR THE OWNER'S RULING — no row changed by row 7",
    },
  };
}

/**
 * 🔴 ROW 7's LAW. Returns [] when every limb holds; each error names its limb.
 *   third-dimension-filled  — SUPPLY, AUDIENCE/NEED or WORTHINESS missing, or anything but UNKNOWN, unmeasured and valueless
 *   conflated               — DEMAND and VISIBILITY/REACH not both present, or sharing a method or a stored field
 *   impressions-as-demand   — DEMAND reading impressions, or stating its value in impressions
 *   not-quoted-from-store   — a range, dataState or number that is not the stored observation's own
 *   limit-missing           — a measurement without query truncation, data lag or dataState on its face
 *   inference-promoted      — an explanation the store does not contain labelled OBSERVED
 */
export function marketErrors({ result, storeRecords }) {
  const errs = [];
  const d = result.dimensions ?? {};
  for (const key of DEFERRED) {
    const x = d[key];
    if (!x) {
      errs.push({ limb: "third-dimension-filled", why: `${key} is missing — a deferred dimension is present and reads UNKNOWN, never left out` });
      continue;
    }
    const extra = Object.keys(x).filter((k) => !UNMEASURED_KEYS.includes(k));
    if (x.state !== UNKNOWN || x.measured !== false || x.value !== null || x.method !== null || extra.length) {
      errs.push({ limb: "third-dimension-filled", why: `${x.dimension ?? key} reads state ${JSON.stringify(x.state)}, measured ${JSON.stringify(x.measured)}, value ${JSON.stringify(x.value)}, method ${JSON.stringify(x.method?.name ?? x.method)}${extra.length ? `, and carries ${extra.join(", ")}` : ""} — the deferred half is UNKNOWN: never measured, never valued, never defaulted to low` });
    }
  }

  const dem = d.DEMAND;
  const vis = d.VISIBILITY_REACH;
  if (!dem || !vis) {
    errs.push({ limb: "conflated", why: "DEMAND and VISIBILITY/REACH are not both reported, separately" });
    return errs;
  }
  const shared = (dem.method?.fields ?? []).filter((f) => (vis.method?.fields ?? []).includes(f));
  if (dem.method?.name === vis.method?.name || shared.length) {
    errs.push({ limb: "conflated", why: `DEMAND and VISIBILITY/REACH share ${dem.method?.name === vis.method?.name ? `the method "${dem.method?.name}"` : `the stored field(s) ${shared.join(", ")}`} — one measurement wearing two names` });
  }
  if ((dem.method?.fields ?? []).some((f) => /impression/i.test(f)) || /impression/i.test(JSON.stringify(dem.value ?? {}))) {
    errs.push({ limb: "impressions-as-demand", why: "DEMAND reads or states impressions — an impression is our page being shown, not a person's need" });
  }

  const fresh = measureMarket(storeRecords);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(dem.source, fresh.dimensions.DEMAND.source)) errs.push({ limb: "not-quoted-from-store", why: `DEMAND's range or dataState is not the stored query observation's: ${JSON.stringify(dem.source)}` });
  if (!same(vis.sources, fresh.dimensions.VISIBILITY_REACH.sources)) errs.push({ limb: "not-quoted-from-store", why: "VISIBILITY/REACH's ranges or dataStates are not the stored observations' own" });
  const numbers = (x) => [x.distinctHumanWordings, x.operatorStringsExcluded];
  if (!same(numbers(dem.value ?? {}), numbers(fresh.dimensions.DEMAND.value))) errs.push({ limb: "not-quoted-from-store", why: "DEMAND's counts are not what the stored query pull yields" });
  const visNumbers = (v) => [v?.property?.impressions, v?.property?.clicks, v?.property?.position, v?.byCountry?.impressions, v?.byCountry?.clicks, v?.byPage?.impressions, v?.byPage?.clicks];
  if (!same(visNumbers(vis.value), visNumbers(fresh.dimensions.VISIBILITY_REACH.value))) errs.push({ limb: "not-quoted-from-store", why: "VISIBILITY/REACH's totals are not what the stored pulls yield" });

  for (const m of [dem, vis]) {
    for (const k of ["queryTruncation", "dataLag", "dataState"]) {
      if (!m.limits?.[k]) errs.push({ limb: "limit-missing", why: `${m.dimension} carries no ${k} limit on its face` });
    }
    const q = m.limits?.queryTruncation ?? "";
    for (const must of [fresh.coverage.byProperty.share, fresh.coverage.byProperty.clicks]) {
      if (q && !q.includes(must)) errs.push({ limb: "limit-missing", why: `${m.dimension}'s query-truncation limit does not state ${must} — a truncation limit that omits the coverage reassures` });
    }
  }

  if (result.coverage?.explanation?.label === OBSERVED) errs.push({ limb: "inference-promoted", why: "the anonymisation explanation is labelled OBSERVED — the store holds the gap, not its cause" });
  if (result.discrepancy?.explanation?.label === OBSERVED) errs.push({ limb: "inference-promoted", why: "the counting explanation of the 807-vs-541 discrepancy is labelled OBSERVED — the counting rule is not in the store" });
  return errs;
}
