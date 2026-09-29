/**
 * F78 · SPEND AND WORKLOAD BY TENANT (acceptance _handoffs a1885de, RR-93 C1/C6).
 *
 * Spec row: "Track spend and workload by tenant; default paid providers off and enforce caps, approvals and kill switches." Owner
 * direction RR-89: "Clients stay separate from each other." Every recorded cost entry is attributed to EXACTLY ONE declared tenant
 * through the declared scope of the run that incurred it — or it is UNATTRIBUTED, with the missing declaration named. One tenant's
 * spend is never counted in another's totals.
 *
 *   research-batch cost        the batch's RESEARCH_BATCH declaration
 *   a refused paid call        the tenant scope the refusal recorded (F78: refusals carry it; earlier ones did not — named)
 *   a Search Console ingest    its source observations' property → a URL-prefix property's host resolves as a SITE_ORIGIN; a DOMAIN
 *                              property covers every subdomain, so it counts the tenants whose declared origins lie under it — one
 *                              tenant attributes, several do not (no per-tenant split of the property's calls is recorded)
 *   a crawl batch              UNATTRIBUTED — a shared batch; no per-tenant split of its cost is recorded
 *   an engine run              UNATTRIBUTED — no tenant scope is declared for it (tool install, render, replay, recovery, checks)
 *
 * The four costs (money, provider calls, request workload, founder time) are totalled per tenant as RECORDED; a cost the ledger marks
 * MEASURABLE_BUT_NOT_RECORDED is counted and named — it is the FAILURE C1 names, never hidden. Pure; names no product.
 */
import { coverageFailures } from "./ledger.mjs";

export const ATTRIBUTION = Object.freeze({ ATTRIBUTED: "ATTRIBUTED", UNATTRIBUTED: "UNATTRIBUTED" });

const hostOf = (propertyRef) => {
  const s = String(propertyRef ?? "");
  if (s.startsWith("sc-domain:")) return s.slice("sc-domain:".length).toLowerCase() || null;
  try { return new URL(s).host.toLowerCase(); } catch { return null; }
};
const resolved = (r) => r?.state === "RESOLVED" && typeof r.tenantId === "string" && r.tenantId !== "";

/**
 * One entry.
 * @param {object} entry            a cost entry
 * @param {object} ctx
 *   resolve        the production tenant resolver
 *   evidenceById   Map observation id → evidence record (for an ingest's property)
 *   origins        the declared SITE_ORIGIN attachments as { host, tenantId } (for a domain property's coverage)
 *   batch          the RESEARCH_BATCH id the entry was recorded under, or null
 */
export function attributeCostEntry(entry, { resolve, evidenceById = new Map(), origins = [], batch = null }) {
  const out = (state, tenantId, via, missing = null) => Object.freeze({ entryId: entry.entry_id, runKind: entry.run_kind, state, tenantId, via, missing });
  if (batch) {
    const r = resolve({ resourceKind: "RESEARCH_BATCH", resourceRef: batch });
    return resolved(r) ? out(ATTRIBUTION.ATTRIBUTED, r.tenantId, "the declared research batch")
      : out(ATTRIBUTION.UNATTRIBUTED, null, null, `the research batch resolves ${r?.state ?? "UNKNOWN"} — no declaration assigns it a tenant`);
  }
  if (entry.run_kind === "paid-provider-call") {
    return typeof entry.scope?.tenantId === "string" && entry.scope.tenantId !== ""
      ? out(ATTRIBUTION.ATTRIBUTED, entry.scope.tenantId, "the tenant scope the refusal recorded")
      : out(ATTRIBUTION.UNATTRIBUTED, null, null, "the refusal recorded no tenant scope (made before F78 recorded one)");
  }
  if (entry.run_kind === "gsc-ingest") {
    const refs = new Set();
    for (const id of entry.sources ?? []) {
      const rec = evidenceById.get(id);
      if (rec?.target?.kind === "property" && rec.target.ref !== "*") refs.add(String(rec.target.ref));
    }
    if (refs.size === 0) return out(ATTRIBUTION.UNATTRIBUTED, null, null, "no source observation of this ingest names a property");
    const tenants = new Set();
    let unresolved = 0;
    for (const ref of refs) {
      const h = hostOf(ref);
      if (!h) { unresolved++; continue; }
      if (ref.startsWith("sc-domain:")) {
        const covered = origins.filter((o) => o.host && (o.host === h || o.host.endsWith(`.${h}`)));
        if (covered.length === 0) unresolved++;
        for (const o of covered) tenants.add(o.tenantId);
      } else {
        const r = resolve({ resourceKind: "SITE_ORIGIN", resourceRef: `https://${h}` });
        if (resolved(r)) tenants.add(r.tenantId); else unresolved++;
      }
    }
    if (tenants.size === 1 && unresolved === 0) return out(ATTRIBUTION.ATTRIBUTED, [...tenants][0], "the property's declared site origin");
    return out(ATTRIBUTION.UNATTRIBUTED, null, null, tenants.size > 1 ? `the ingest's properties span ${tenants.size} tenants` : `the property's host resolves to no declared tenant (${unresolved} unresolved)`);
  }
  if (entry.run_kind === "crawl") return out(ATTRIBUTION.UNATTRIBUTED, null, null, "a shared crawl batch — no per-tenant split of its cost is recorded");
  return out(ATTRIBUTION.UNATTRIBUTED, null, null, `an engine run (${entry.run_kind}) with no declared tenant scope`);
}

/** The four costs per tenant, as recorded, with every gap counted. */
export function totalsByTenant(entries, attributions) {
  const gaps = new Map();
  for (const f of coverageFailures(entries)) gaps.set(f.entry_id, [...(gaps.get(f.entry_id) ?? []), f.part]);
  const byId = new Map(entries.map((e) => [e.entry_id, e]));
  const t = new Map();
  for (const a of attributions) {
    const key = a.state === ATTRIBUTION.ATTRIBUTED ? a.tenantId : "UNATTRIBUTED";
    const e = byId.get(a.entryId);
    const s = t.get(key) ?? { entries: 0, money: {}, moneyZeroByTariff: 0, moneyUnknown: 0, providerCalls: 0, providerCallsUnknown: 0, founderSeconds: 0, founderUnknown: 0, measurableButNotRecorded: 0 };
    s.entries++;
    const m = e.money ?? {};
    if (m.amountState === "MEASURED") s.money[m.currency ?? "?"] = (s.money[m.currency ?? "?"] ?? 0) + (Number(m.amount) || 0);
    else if (m.amountState === "ZERO_BY_TARIFF") s.moneyZeroByTariff++;
    else s.moneyUnknown++;
    if (e.providerCalls?.state === "MEASURED") s.providerCalls += Number(e.providerCalls.total) || 0; else s.providerCallsUnknown++;
    if (e.founderTime?.state === "MEASURED") s.founderSeconds += Number(e.founderTime.seconds) || 0; else s.founderUnknown++;
    s.measurableButNotRecorded += (gaps.get(a.entryId) ?? []).length;
    t.set(key, s);
  }
  return t;
}
