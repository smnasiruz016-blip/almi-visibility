/**
 * F79 · EVIDENCE CACHE BEFORE RE-RESEARCH (acceptance _handoffs f34f3af, Amendment 1 60dee9b; RR-93).
 *
 * Spec row: "Reuse valid evidence and re-research only when freshness, scope or integrity requires it." A held record is VALID for a
 * request only when it passes all three tests; ONE lookup gives ONE answer — HIT with the one record that serves it, or MISS with the
 * failed test named. A miss is REPORTED as re-research required and never run: nothing here collects, calls or writes (C6).
 *
 *   SCOPE       🔴 F02 tenant-isolation conformance (row constraint, ruling 1145012): a record is eligible only when its property
 *               belongs to the requesting tenant, decided through the one F02 decision (decideResolvedTenants) — a URL-prefix
 *               property by its declared site origin, a domain property only when every declared origin under it is that ONE
 *               tenant's. A record spanning tenants is served to none of them.
 *   FRESHNESS   a WINDOWED record serves only the same measurement over the same window (historical row 15); age applies only under
 *               a DECLARED freshness rule and is otherwise NOT MEASURED — an unwindowed record with no rule is a miss, never "fresh";
 *               a recorded source-change signal after the observation forces a miss (V3 §10.4).
 *   INTEGRITY   the recorded content — the raw file `raw_ref` names, or else the inline value the hash was computed over (Amendment
 *               1) — must exist and hash to `content_sha256`; missing content or a mismatch (tamper) is a miss, never a hit.
 *
 * Pure: the caller passes the records, the resolver, the declared origins, the freshness rule, the source-change signals and the raw
 * reader explicitly. Names no product.
 */
import { createHash } from "node:crypto";
import { decideResolvedTenants } from "../tenancy/scope.mjs";

export const MISS = Object.freeze({
  NOT_HELD: "NOT_HELD",
  OUTSIDE_SCOPE: "OUTSIDE_SCOPE",
  OUTSIDE_WINDOW: "OUTSIDE_WINDOW",
  FRESHNESS_NOT_DECLARED: "FRESHNESS_NOT_DECLARED",
  EXPIRED: "EXPIRED",
  SOURCE_CHANGED: "SOURCE_CHANGED",
  INTEGRITY_FAILED: "INTEGRITY_FAILED",
});
/* the order a candidate's tests are applied in — the first failure names the miss */
const ORDER = [MISS.OUTSIDE_SCOPE, MISS.OUTSIDE_WINDOW, MISS.FRESHNESS_NOT_DECLARED, MISS.EXPIRED, MISS.SOURCE_CHANGED, MISS.INTEGRITY_FAILED];

const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const iso = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
const hostOf = (ref) => {
  const s = String(ref ?? "");
  if (s.startsWith("sc-domain:")) return s.slice("sc-domain:".length).toLowerCase() || null;
  try { return new URL(s).host.toLowerCase(); } catch { return null; }
};

/** The one tenant a property belongs to, or why none: { tenantId } | { tenantId: null, why }. */
export function propertyTenant(ref, { resolve, origins = [] }) {
  const h = hostOf(ref);
  if (!h) return { tenantId: null, why: "the record names no resolvable property" };
  if (String(ref).startsWith("sc-domain:")) {
    const tenants = new Set(origins.filter((o) => o.host && (o.host === h || o.host.endsWith(`.${h}`))).map((o) => o.tenantId));
    if (tenants.size === 1) return { tenantId: [...tenants][0] };
    return { tenantId: null, why: tenants.size === 0 ? "the domain property covers no declared origin" : `the domain property spans ${tenants.size} tenants` };
  }
  const r = resolve({ resourceKind: "SITE_ORIGIN", resourceRef: `https://${h}` });
  return r?.state === "RESOLVED" && typeof r.tenantId === "string" && r.tenantId !== "" ? { tenantId: r.tenantId } : { tenantId: null, why: `the property's origin resolves ${r?.state ?? "UNKNOWN"}` };
}

export const windowOf = (record) => (iso(record?.value?.startDate) && iso(record?.value?.endDate) ? { startDate: record.value.startDate, endDate: record.value.endDate } : null);

/** C4 — the recorded content exists and hashes to the recorded hash. */
export function integrityOf(record, { readRaw }) {
  if (typeof record?.content_sha256 !== "string" || record.content_sha256 === "") return { ok: false, why: "no recorded hash" };
  if (typeof record.raw_ref === "string" && record.raw_ref !== "") {
    const bytes = readRaw(record.raw_ref);
    if (bytes === null || bytes === undefined) return { ok: false, why: "the raw file it names is missing" };
    return sha256(bytes) === record.content_sha256 ? { ok: true, via: "raw file" } : { ok: false, why: "the raw file does not hash to the recorded hash" };
  }
  if (record.value === undefined) return { ok: false, why: "no raw file and no inline content" };
  return sha256(JSON.stringify(record.value)) === record.content_sha256 ? { ok: true, via: "inline content" } : { ok: false, why: "the inline content does not hash to the recorded hash" };
}

/** The failed test for one candidate, or null when it is valid for this request. */
function failedTest(record, request, ctx) {
  const owner = propertyTenant(record.target?.ref, ctx);
  if (!owner.tenantId || !decideResolvedTenants(ctx.tenantId, owner.tenantId).allowed) return [MISS.OUTSIDE_SCOPE, owner.tenantId ? "the record belongs to another tenant" : owner.why];
  const w = windowOf(record);
  if (w) {
    const q = request.window;
    if (!q || q.startDate !== w.startDate || q.endDate !== w.endDate) return [MISS.OUTSIDE_WINDOW, "the record answers another window"];
  } else if (!ctx.freshnessRule) {
    return [MISS.FRESHNESS_NOT_DECLARED, "an unwindowed record, and no freshness rule is declared — its age is NOT MEASURED"];
  } else if (!ctx.freshnessRule.fresh(record)) {
    return [MISS.EXPIRED, "past the declared freshness rule — an expired record is never served as current"];
  }
  const changed = ctx.sourceChanges.find((s) => s.targetRef === record.target?.ref && typeof s.ref === "string" && s.ref !== "" && Date.parse(s.at) > Date.parse(record.observed_at));
  if (changed) return [MISS.SOURCE_CHANGED, "a recorded source-change signal is later than the record"];
  const integ = integrityOf(record, ctx);
  if (!integ.ok) return [MISS.INTEGRITY_FAILED, integ.why];
  return null;
}

/**
 * C1 — ONE lookup, ONE answer.
 * @param request   { method, target: { kind, ref }, window: { startDate, endDate } | null }
 * @param ctx       { tenantId, records, resolve, origins, freshnessRule (null = none declared), sourceChanges (passed explicitly), readRaw }
 */
export function lookup(request, { tenantId, records, resolve, origins = [], freshnessRule = null, sourceChanges, readRaw }) {
  if (!Array.isArray(sourceChanges)) throw new TypeError("source-change signals must be passed explicitly — an empty list is a recorded fact, not a default");
  if (typeof readRaw !== "function") throw new TypeError("a raw reader must be passed explicitly");
  const ctx = { tenantId, resolve, origins, freshnessRule, sourceChanges, readRaw };
  const candidates = records.filter((r) => r?.record_type === "observation" && r.method === request.method && r.target?.kind === request.target?.kind && r.target?.ref === request.target?.ref);
  if (candidates.length === 0) return Object.freeze({ answer: "MISS", miss: MISS.NOT_HELD, why: "no held record of this measurement", reResearch: "REQUIRED — not run", candidates: 0 });
  const tried = candidates.map((r) => ({ r, f: failedTest(r, request, ctx) }));
  const valid = tried.filter((t) => t.f === null).sort((a, b) => Date.parse(b.r.observed_at) - Date.parse(a.r.observed_at));
  if (valid.length) return Object.freeze({ answer: "HIT", record: valid[0].r.observation_id, requestCount: Number.isInteger(valid[0].r.value?.requestCount) ? valid[0].r.value.requestCount : null, candidates: candidates.length });
  /* the miss names the test that failed FURTHEST along — the closest a held record came to serving */
  const best = tried.sort((a, b) => ORDER.indexOf(b.f[0]) - ORDER.indexOf(a.f[0]))[0];
  return Object.freeze({ answer: "MISS", miss: best.f[0], why: best.f[1], reResearch: "REQUIRED — not run", candidates: candidates.length });
}
