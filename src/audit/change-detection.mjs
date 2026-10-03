/**
 * 🔴 F30 · CHANGE DETECTION ON RECORDED OBSERVATIONS (acceptance _handoffs fdc9048). Pure: handed one client's recorded crawl batches and
 * its declared recrawl setting; reads nothing, fetches nothing, schedules nothing. Counts only.
 *
 *   C2  a comparison is between two observations of the SAME page identity (its requested URL) at two DIFFERENT observed times
 *   C3  only CLEAN observations: from a run whose own record proves its bounds (pacing proved, run recorded), and themselves served —
 *       not skipped, errored or truncated; every other observation is counted apart with its reason
 *   C4  the RECORDED RULE below decides material change — printed with every result; no threshold, score or weight
 *   C5  equal values never change; a field one side did not record is NOT MEASURED, never a change
 *   C6  "due for a recrawl" comes only from the client's own declared interval; none declared → NOT DECLARED
 */
export const NOT_MEASURED = "NOT MEASURED";
export const CHANGE_RULE = Object.freeze({
  id: "f30-material-change",
  version: "1",
  /* what a search engine or a reader is served: the served state, where it ended, how it got there, what robots and indexing headers
   * said, the declared type, and the exact bytes. Volatile caching metadata (date, etag, last-modified, cache-control) is NOT compared. */
  fields: Object.freeze(["status", "final_url", "redirect_chain", "robots_state", "x-robots-tag", "content-type", "content_sha256"]),
});

const HEADER_FIELDS = new Set(["x-robots-tag", "content-type"]);
/** A field's recorded value, or undefined when this observation did not record it. */
export function fieldOf(o, field) {
  const v = o.value ?? {};
  switch (field) {
    case "status": return Number.isInteger(v.status) ? v.status : undefined;
    case "final_url": return typeof (v.final_url ?? v.requested_url) === "string" ? (v.final_url ?? v.requested_url) : undefined;
    case "redirect_chain": return Array.isArray(v.redirect_chain) ? JSON.stringify(v.redirect_chain) : undefined;
    case "robots_state": return typeof v.robotsState === "string" ? v.robotsState : undefined;
    case "content_sha256": return typeof o.content_sha256 === "string" ? o.content_sha256 : undefined;
    default:
      if (HEADER_FIELDS.has(field)) {
        /* the collector records this header subset on every fetch: an absent header is ABSENT, a recorded one its value */
        if (!v.response_headers_subset || typeof v.response_headers_subset !== "object") return undefined;
        return Object.hasOwn(v.response_headers_subset, field) ? String(v.response_headers_subset[field]) : "ABSENT";
      }
      return undefined;
  }
}

/**
 * C3 · does the run's own record prove its bounds, and was its collection KEPT? (S5: F19's compliant run.) Bounds: a live run (not a dry
 * run) that issued requests and whose recorded pacing holds with no breach. Kept: its governed writes landed — the batch's cost ledger
 * carries the entry naming this run.
 */
export const isCleanRun = (run, ledger = []) =>
  run?.record_type === "crawl_run" && run.dryRun !== true && Number.isInteger(run.requestsIssued) && run.requestsIssued > 0 &&
  run.pacing?.ok === true && run.pacing.breaches === 0 &&
  ledger.some((e) => e?.record_type === "cost_entry" && typeof e.run_ref === "string" && e.run_ref.endsWith(` crawl_run ${run.run_id}`));

/** C3 · is this observation itself a clean measurement? Returns null when clean, else its reason. */
export function uncleanReason(o) {
  const v = o.value ?? {};
  if (o.method === "crawl.skipped" || v.skipped === true) return "SKIPPED";
  if (v.error) return "ERRORED";
  if (v.truncated === true) return "TRUNCATED";
  if (!Number.isInteger(v.status)) return "NO_SERVED_STATUS";
  return null;
}

/**
 * Every observation of one client's batches, placed in its run: a run owns the observations observed between its start and finish.
 * @param {{ batch: string, records: object[], ledger?: object[] }[]} batches
 */
export function observationsWithRuns(batches) {
  const out = [];
  for (const { batch, records, ledger = [] } of batches) {
    const runs = records.filter((r) => r.record_type === "crawl_run");
    for (const o of records.filter((r) => r.record_type === "observation" && typeof r.value?.requested_url === "string")) {
      const run = runs.find((r) => r.started_at <= o.observed_at && o.observed_at <= r.finished_at) ?? null;
      out.push({ o, batch, run, ledger });
    }
  }
  return out;
}

/** C4 · C5 · compare two clean observations of one page by the recorded rule. */
export function compareObservations(earlier, later, rule = CHANGE_RULE) {
  const changed = [], notMeasured = [];
  for (const f of rule.fields) {
    const a = fieldOf(earlier, f), b = fieldOf(later, f);
    if (a === undefined || b === undefined) { notMeasured.push(f); continue; }
    if (a !== b) changed.push(f);
  }
  return { state: changed.length ? "CHANGED" : "UNCHANGED", changed, notMeasured };
}

/** C6 · due for a recrawl, from the client's own declared interval (hours) — or NOT DECLARED. */
export function recrawlDue({ setting, lastCleanAt, now }) {
  if (!setting || !Number.isInteger(setting.everyHours) || setting.everyHours < 1) return { state: "NOT DECLARED" };
  if (!lastCleanAt) return { state: NOT_MEASURED, reason: "no clean observation to count from" };
  const dueAt = new Date(Date.parse(lastCleanAt) + setting.everyHours * 3600 * 1000).toISOString();
  return { state: dueAt <= now ? "DUE" : "NOT DUE", dueAt, everyHours: setting.everyHours };
}

/**
 * The whole check for one client: pages, their clean observations, the latest comparison of each page, and its recrawl state.
 * @param {{ batches: { batch: string, records: object[], ledger?: object[] }[], setting: object|null, now: string, rule?: object }} o
 */
export function changeCheck({ batches, setting, now, rule = CHANGE_RULE }) {
  const placed = observationsWithRuns(batches);
  const excluded = {};
  const cleanByPage = new Map();
  const pages = new Set();
  for (const { o, run, ledger } of placed) {
    pages.add(o.value.requested_url);
    const why = !isCleanRun(run, ledger) ? "RUN_NOT_COMPLIANT" : uncleanReason(o);
    if (why) { excluded[why] = (excluded[why] ?? 0) + 1; continue; }
    if (!cleanByPage.has(o.value.requested_url)) cleanByPage.set(o.value.requested_url, []);
    cleanByPage.get(o.value.requested_url).push(o);
  }
  const results = [];
  for (const page of pages) {
    const clean = (cleanByPage.get(page) ?? []).sort((a, b) => a.observed_at.localeCompare(b.observed_at));
    const distinct = clean.filter((o, i) => i === 0 || o.observed_at !== clean[i - 1].observed_at);
    const due = recrawlDue({ setting, lastCleanAt: distinct.at(-1)?.observed_at ?? null, now });
    if (distinct.length < 2) { results.push({ state: NOT_MEASURED, reason: "NO_SECOND_CLEAN_OBSERVATION", cleanObservations: distinct.length, due }); continue; }
    const [a, b] = distinct.slice(-2);
    results.push({ ...compareObservations(a, b, rule), cleanObservations: distinct.length, due });
  }
  const count = (k) => results.filter((r) => r.state === k).length;
  const fieldsChanged = {};
  for (const r of results) for (const f of r.changed ?? []) fieldsChanged[f] = (fieldsChanged[f] ?? 0) + 1;
  const dueStates = results.reduce((m, r) => ((m[r.due.state] = (m[r.due.state] ?? 0) + 1), m), {});
  return {
    rule, pages: pages.size, compared: count("UNCHANGED") + count("CHANGED"), unchanged: count("UNCHANGED"), changed: count("CHANGED"),
    notMeasured: count(NOT_MEASURED), fieldsChanged, fieldsNotMeasured: results.reduce((n, r) => n + (r.notMeasured?.length ?? 0), 0),
    excluded, due: dueStates, incomplete: count(NOT_MEASURED) > 0 || results.some((r) => (r.notMeasured?.length ?? 0) > 0),
  };
}
