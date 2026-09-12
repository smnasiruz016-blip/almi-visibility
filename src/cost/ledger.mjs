/**
 * ITEM 45 — THE COST LEDGER. "The cap holds; the money does not." Until
 * 12 September 2026 there was no ledger at all.
 *
 * ── FOUR THINGS, BECAUSE THE BOUNDARY NAMES FOUR ────────────────────────────
 *
 *   money          — MEASURED, ZERO_BY_TARIFF with its basis, or UNKNOWN with its reason
 *   providerCalls  — calls issued, per provider
 *   budget         — what the run used against the cap that bounded it
 *   founderTime    — the run's wall-clock. Usually skipped; named on purpose.
 *
 * ── 🔴 TWO KINDS OF UNKNOWN, AND ONLY ONE OF THEM IS LAWFUL ─────────────────
 *
 * The FAILURE clause is "a cost reads UNKNOWN when it was measurable". So every
 * UNKNOWN must say WHICH it is:
 *
 *   NOT_MEASURABLE_WITH_TOOLS_WE_HOLD — no reading available to this engine
 *                                        (e.g. the GitHub plan price, U-COST-1)
 *   MEASURABLE_BUT_NOT_RECORDED       — it could have been read at the time
 *                                        and was not (e.g. an ingest that
 *                                        never wrote down when it started)
 *
 * The second is a failure of the ledger's own coverage, and `coverageFailures`
 * names every one. An UNKNOWN is never filled with an estimate.
 *
 * ── SAME LAWS AS THE EVIDENCE STORE ─────────────────────────────────────────
 *
 * Append-only JSONL, no update, no delete; an entry is written once per
 * `entry_id`, and a repeat is refused rather than duplicated. Every printed line
 * carries the bound that shaped it (LAW-BOUND-1).
 */

import { createJsonlStore } from "../evidence/store.mjs";

export const COST_ENTRY_TYPE = "cost_entry";
export const MONEY_STATES = Object.freeze(["MEASURED", "ZERO_BY_TARIFF", "UNKNOWN"]);
export const MEASURE_STATES = Object.freeze(["MEASURED", "UNKNOWN"]);
export const UNKNOWN_KINDS = Object.freeze(["NOT_MEASURABLE_WITH_TOOLS_WE_HOLD", "MEASURABLE_BUT_NOT_RECORDED"]);

const need = (cond, msg) => {
  if (!cond) throw new TypeError(`cost entry: ${msg}`);
};

function checkUnknown(part, name) {
  need(typeof part.unknownReason === "string" && part.unknownReason.length > 10, `${name} is UNKNOWN with no reason — an UNKNOWN must say why`);
  need(UNKNOWN_KINDS.includes(part.unknownKind), `${name} is UNKNOWN without saying whether it was measurable (${UNKNOWN_KINDS.join(" | ")})`);
}

export function makeCostEntry({ entry_id, run_kind, run_ref, recorded_at, money, providerCalls, budget, founderTime, sources = [] }) {
  for (const [k, v] of Object.entries({ entry_id, run_kind, run_ref, recorded_at })) need(typeof v === "string" && v !== "", `${k} is required`);
  for (const [k, v] of Object.entries({ money, providerCalls, budget, founderTime })) need(v && typeof v === "object", `${k} is required — all four are tracked or the run is untracked`);

  need(MONEY_STATES.includes(money.amountState), `money.amountState must be one of ${MONEY_STATES.join("|")}`);
  if (money.amountState === "UNKNOWN") {
    need(money.amount === null, "money is UNKNOWN but carries an amount — an UNKNOWN amount is null, never 0 and never an estimate");
    checkUnknown(money, "money");
  } else {
    need(typeof money.amount === "number", "a non-UNKNOWN amount must be a number");
    need(typeof money.basis === "string" && money.basis.length > 10, "a money figure without a basis is a guess");
    if (money.amountState === "ZERO_BY_TARIFF") need(money.amount === 0, "ZERO_BY_TARIFF must be 0");
  }

  for (const [name, part, field] of [["providerCalls", providerCalls, "total"], ["founderTime", founderTime, "seconds"]]) {
    need(MEASURE_STATES.includes(part.state), `${name}.state must be one of ${MEASURE_STATES.join("|")}`);
    if (part.state === "MEASURED") need(typeof part[field] === "number" && part[field] >= 0, `${name} is MEASURED but ${field} is not a number`);
    else {
      need(part[field] === null, `${name} is UNKNOWN but carries ${field} — a lower bound goes in its own labelled field`);
      checkUnknown(part, name);
    }
  }

  need(typeof budget.kind === "string" && budget.kind !== "", "budget.kind is required");
  need(budget.bounds && Object.keys(budget.bounds).length > 0, "budget.bounds is required — LAW-BOUND-1: a figure without the bound that shaped it cannot be checked");
  need(typeof budget.capReached === "boolean", "budget.capReached must be a boolean");

  return Object.freeze({
    record_type: COST_ENTRY_TYPE,
    entry_id,
    run_kind,
    run_ref,
    recorded_at,
    money: Object.freeze({ ...money }),
    providerCalls: Object.freeze({ ...providerCalls }),
    budget: Object.freeze({ ...budget }),
    founderTime: Object.freeze({ ...founderTime }),
    sources: Object.freeze([...sources]),
  });
}

/** Every part of every entry that reads UNKNOWN although it was measurable. */
export function coverageFailures(entries) {
  const out = [];
  for (const e of entries) {
    for (const part of ["money", "providerCalls", "founderTime"]) {
      const p = e[part];
      const unknown = part === "money" ? p.amountState === "UNKNOWN" : p.state === "UNKNOWN";
      if (unknown && p.unknownKind === "MEASURABLE_BUT_NOT_RECORDED") out.push({ entry_id: e.entry_id, part, reason: p.unknownReason });
    }
  }
  return out;
}

/** One ledger line, with its bound beside it (LAW-BOUND-1). */
export function formatLedgerLine(e) {
  const money = e.money.amountState === "UNKNOWN" ? `money=UNKNOWN(${e.money.unknownKind})` : `money=${e.money.amount} ${e.money.currency ?? ""} [${e.money.amountState}]`.replace("  ", " ");
  const calls = e.providerCalls.state === "MEASURED" ? `calls=${e.providerCalls.total}` : `calls=UNKNOWN(${e.providerCalls.unknownKind})`;
  const time = e.founderTime.state === "MEASURED" ? `time=${e.founderTime.seconds}s` : `time=UNKNOWN(${e.founderTime.unknownKind})`;
  const used = Object.entries(e.budget.used ?? {}).map(([k, v]) => `${k}=${v}`).join(" ");
  const bounds = Object.entries(e.budget.bounds).map(([k, v]) => `${k}=${v}`).join(" ");
  return `${e.entry_id}  ${money}  ${calls}  ${time}  budget(${e.budget.kind}): ${used} capReached=${e.budget.capReached}  [bound: ${bounds}]`;
}

/* ================================================================== *
 * BACKFILL — from records already stored. Nothing is estimated.
 * ================================================================== */

const seconds = (from, to) => Math.round((Date.parse(to) - Date.parse(from))) / 1000;

/**
 * A LIVE crawl run record → one entry. `actionsTiming` is an optional stored
 * observation of the GitHub Actions run that executed it.
 */
export function entryFromCrawlRun(run, { correction = null, actionsTiming = null, recordedAt } = {}) {
  const t = actionsTiming?.value ?? null;
  return makeCostEntry({
    entry_id: `crawl:${run.run_id}`,
    run_kind: "crawl",
    run_ref: `runs/crawl — crawl_run ${run.run_id}`,
    recorded_at: recordedAt,
    money: {
      amountState: "UNKNOWN",
      amount: null,
      currency: "USD",
      unknownKind: "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD",
      unknownReason:
        "two components, neither priced by anything this engine can read. (1) GitHub Actions: the run's minutes ARE measured" +
        (t ? ` (run ${t.runId}: run_duration_ms=${t.run_duration_ms}; GitHub's timing API reported billable ${JSON.stringify(t.billable)})` : "") +
        ", but the account's plan, its per-minute price and its free allowance are NOT (U-COST-1) — so no minute is converted to money, and a reported 0 billable ms is not read as $0. " +
        `(2) our own hosting: each of ${run.requestsIssued} requests may invoke a function or an ISR regeneration on our own account, and that has never been measured (U-COST-5)`,
    },
    providerCalls: {
      state: "MEASURED",
      total: run.requestsIssued,
      perProvider: { "self-operated-crawler": run.requestsIssued },
      perHost: run.perHostRequests,
      note: "requestsIssued as recorded by the run; the record does not state whether robots.txt fetches are included",
    },
    budget: {
      kind: "crawl",
      used: {
        urlsRequested: run.urlsRequested,
        urlsFetched: run.urlsFetched,
        requestsIssued: run.requestsIssued,
        ...(correction?.evidence?.disallowedByRobots !== undefined ? { disallowedByRobots: correction.evidence.disallowedByRobots } : {}),
      },
      bounds: { maxUrlsPerRun: run.maxUrlsPerRun, maxRequestsPerHost: run.maxRequestsPerHost, maxResponseBytes: run.maxResponseBytes, seedPoolSize: run.seedPoolSize },
      capReached: run.capReached,
    },
    founderTime: {
      state: "MEASURED",
      seconds: seconds(run.started_at, run.finished_at),
      from: run.started_at,
      to: run.finished_at,
      note: t
        ? `the crawl itself, from the run record. The GitHub Actions run that hosted it took ${t.run_duration_ms / 1000}s end to end (job ${t.job.started_at} → ${t.job.completed_at})`
        : "the crawl itself, from the run record",
    },
    sources: [run.run_id, ...(actionsTiming ? [actionsTiming.observation_id] : []), ...(correction ? [`crawl_run_correction:${correction.corrects_run_id}`] : [])],
  });
}

const PREFIX = "gsc.searchAnalytics.query:";

/**
 * Split the evidence store into INGEST RUNS. A run begins where `sites.list` is
 * read — a new sites.list observation, or a re-sighting of one — because every
 * ingest reads the property list first. No run id was ever stored, so this is
 * the only boundary the records themselves supply.
 */
export function ingestRunsOf(evidenceRecords) {
  const sitesKeys = new Set(evidenceRecords.filter((r) => r.method === "gsc.sites.list" && r.measurement_key).map((r) => r.measurement_key));
  const at = (r) => r.observed_at ?? r.seen_at;
  const sorted = [...evidenceRecords].filter((r) => at(r)).sort((a, b) => (at(a) < at(b) ? -1 : 1));
  const runs = [];
  for (const r of sorted) {
    const starts = r.method === "gsc.sites.list" || (r.record_type === "resighting" && sitesKeys.has(r.measurement_key));
    if (starts || runs.length === 0) runs.push([]);
    runs[runs.length - 1].push(r);
  }
  return runs.map((records) => ({ records, first: at(records[0]), last: at(records[records.length - 1]) }));
}

/**
 * One ingest run → one entry.
 *
 * 🔴 PROVIDER CALLS. Until 12 September 2026 each pull's stored `cost.apiCalls`
 * was the provider's RUNNING counter, not the pull's own count. So the run's
 * total is the LARGEST stored counter in the run — which equals the total only
 * when the last call (the control) was written as a NEW measurement. Otherwise
 * it is not the total, and the entry says UNKNOWN rather than print a partial
 * count as if it were one.
 */
export function entryFromIngestRun(run, { recordedAt } = {}) {
  const fresh = run.records.filter((r) => r.record_type === "observation");
  const withCost = fresh.filter((r) => typeof r.value?.cost?.apiCalls === "number");
  const control = fresh.find((r) => r.method === `${PREFIX}control`);
  const pulls = fresh.filter((r) => r.method?.startsWith(PREFIX) && !r.method.endsWith(":control"));
  const basis = withCost.find((r) => r.value.cost.basis)?.value.cost.basis;
  const runningMax = withCost.length ? Math.max(...withCost.map((r) => r.value.cost.apiCalls)) : null;

  const providerCalls = control && typeof control.value?.cost?.apiCalls === "number"
    ? { state: "MEASURED", total: control.value.cost.apiCalls, perProvider: { "google-search-console": control.value.cost.apiCalls }, note: "the provider's running counter as stored on the control pull, the run's last API call; it includes the token exchange and sites.list" }
    : {
        state: "UNKNOWN",
        total: null,
        unknownKind: "MEASURABLE_BUT_NOT_RECORDED",
        unknownReason: withCost.length
          ? `the control pull was a re-sighting, which stores no cost, so the run's final counter was never written; the largest counter this run did store is ${runningMax} — a lower bound, not the total`
          : "every measurement in this run was a re-sighting, and a re-sighting stores no cost; the calls were issued and never counted",
        ...(runningMax !== null ? { lowerBound: runningMax } : {}),
      };

  return makeCostEntry({
    entry_id: `gsc-ingest:${run.first}`,
    run_kind: "gsc-ingest",
    run_ref: `runs/evidence/evidence.jsonl — records ${run.first} … ${run.last}`,
    recorded_at: recordedAt,
    money: {
      amountState: "ZERO_BY_TARIFF",
      amount: 0,
      currency: "USD",
      basis: basis ?? "Search Console API is free; no billing account attached to almiworld-hq-502102 (the same provider and scope as every stored pull)",
    },
    providerCalls,
    budget: {
      kind: "api-pagination",
      used: {
        newPulls: pulls.length,
        requestsInNewPulls: pulls.reduce((n, r) => n + (r.value?.requestCount ?? 0), 0),
        resightings: run.records.filter((r) => r.record_type === "resighting").length,
      },
      bounds: {
        rowLimitPerRequest: pulls.find((r) => r.value?.rowLimitPerRequest)?.value.rowLimitPerRequest ?? "not stored in this run",
        maxRequestsPerPull: pulls.find((r) => r.value?.maxRequests)?.value.maxRequests ?? "not stored in this run",
      },
      capReached: pulls.some((r) => r.value?.truncationReason === "MAX_REQUESTS"),
    },
    founderTime: {
      state: "UNKNOWN",
      seconds: null,
      unknownKind: "MEASURABLE_BUT_NOT_RECORDED",
      unknownReason: "the ingest never recorded when it started or finished. The span of its own stored timestamps is kept below as a LOWER BOUND; it misses the token exchange and the first call, so it is not the wall-clock",
      lowerBoundSeconds: seconds(run.first, run.last),
    },
    sources: fresh.map((r) => r.observation_id),
  });
}

/** An ingest run measured AS IT HAPPENED — what bin/gsc-ingest.mjs writes from now on. */
export function entryFromLiveIngest({ startedAt, finishedAt, governor, pulls, basis }) {
  const snap = governor.snapshot();
  return makeCostEntry({
    entry_id: `gsc-ingest:${startedAt}`,
    run_kind: "gsc-ingest",
    run_ref: `bin/gsc-ingest.mjs run started ${startedAt}`,
    recorded_at: finishedAt,
    money: { amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis },
    providerCalls: { state: "MEASURED", total: snap.apiCalls, perProvider: { "google-search-console": snap.apiCalls }, note: "counted by the run's cost governor, charged before each call" },
    budget: {
      kind: "api-pagination",
      used: { pulls: pulls.length, requests: pulls.reduce((n, p) => n + p.requestCount, 0), governorCalls: snap.apiCalls },
      bounds: { rowLimitPerRequest: pulls[0]?.rowLimitPerRequest, maxRequestsPerPull: pulls[0]?.maxRequests, maxApiCallsPerRun: snap.maxApiCalls, maxWallClockMs: snap.maxWallClockMs },
      capReached: pulls.some((p) => p.truncationReason === "MAX_REQUESTS") || snap.stopped !== null,
    },
    founderTime: { state: "MEASURED", seconds: seconds(startedAt, finishedAt), from: startedAt, to: finishedAt },
  });
}

/* ================================================================== *
 * THE LEDGER — append-only, one entry per entry_id.
 * ================================================================== */

export function createCostLedger(path) {
  const store = createJsonlStore(path);
  function append(entry) {
    if (entry?.record_type !== COST_ENTRY_TYPE) throw new TypeError("ledger.append: only a cost entry may be written to the ledger");
    if (store.readAll().some((r) => r.entry_id === entry.entry_id)) return { appended: false, entry_id: entry.entry_id };
    store.append(entry);
    return { appended: true, entry_id: entry.entry_id };
  }
  const readAll = () => store.readAll().filter((r) => r.record_type === COST_ENTRY_TYPE);
  return Object.freeze({ append, readAll, path });
}
