/**
 * F78 · THE RECORDED LEDGERS, ATTRIBUTED BY TENANT (acceptance _handoffs a1885de, RR-93).
 *
 *   the engine's cost ledger       runs/cost/ledger.jsonl (every recorded run's cost entry)
 *   research-batch ledgers         the declared RESEARCH store's <batch>/ledger.jsonl (one per declared research batch)
 *   Search Console properties      runs/evidence/evidence.jsonl (an ingest's source observations name their property)
 *   each tenant's own ledger       F78 Amendment 1 C9 (RR-243): <the declaration source>/cost-ledgers/<tenant hex>.jsonl, one per declared
 *                                  COST_LEDGER cost-ledger/<tenantId> (src/cost/run-cost.mjs); the engine ledger stays read-only history
 * Every read also carries the bounded gap report (A1): the frozen pre-boundary list, by name, and every gap the ledgers show, decided.
 * Read only; nothing is written. Count-only output: no host, URL, property or amount beyond totals.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { COST_ENTRY_TYPE } from "./ledger.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { rootIndexFor, readDeclarations } from "../tenancy/resolver.mjs";
import { lookupStore } from "../tenancy/root-registry.mjs";
import { attributeCostEntry, totalsByTenant, ATTRIBUTION } from "./tenant-attribution.mjs";
import { boundedGapReport } from "./gap-boundary.mjs";
import { declaredTenantLedgers } from "./tenant-ledger.mjs";
import { PRE_BOUNDARY_GAPS, BOUNDARY, PRE_BOUNDARY_GAP_LIST_SHA256 } from "../../config/cost/pre-boundary-gaps.mjs";

export const COST_LEDGER = fileURLToPath(new URL("../../runs/cost/ledger.jsonl", import.meta.url));
export const EVIDENCE_STORE = fileURLToPath(new URL("../../runs/evidence/evidence.jsonl", import.meta.url));

/* READ ONLY: a ledger's cost entries exactly as the ledger's own readAll filters them — without holding its append */
const readLedger = (p) => createJsonlStore(p).readAll().filter((r) => r.record_type === COST_ENTRY_TYPE);

/**
 * Research batches' recorded cost entries, from the declared RESEARCH store — or none, with why. `batches` null reads every batch
 * (the attribution census, which must see the whole population); an entry point passes ONLY the batches its scope gate named and
 * decided for its tenant (C6) — another tenant's batch is never read there.
 */
export function researchLedgers({ env = process.env, batches = null } = {}) {
  const store = lookupStore(rootIndexFor(env), "RESEARCH");
  if (store.state !== "DECLARED") return { entries: [], store: store.state, batches: 0 };
  const out = [];
  const list = batches ?? readdirSync(store.dir);
  for (const batch of list) {
    const p = join(store.dir, batch, "ledger.jsonl");
    if (existsSync(p)) for (const e of readLedger(p)) out.push({ entry: e, batch });
  }
  return { entries: out, store: "DECLARED", batches: list.length };
}

/** 🔴 C6 — ONE tenant's view: its own totals (or none) and only the COUNT of unattributed entries; never another tenant's figures. */
export function viewForTenant(r, tenantId) {
  return Object.freeze({ mine: (tenantId && tenantId !== "UNATTRIBUTED" ? r.totals.get(tenantId) : null) ?? null, unattributedEntries: r.totals.get("UNATTRIBUTED")?.entries ?? 0 });
}

export function readCostByTenant({ resolve, env = process.env, ledgerPath = COST_LEDGER, evidencePath = EVIDENCE_STORE, batches = null, tenantLedgers = null, gapList = PRE_BOUNDARY_GAPS, boundary = BOUNDARY, gapListSha = PRE_BOUNDARY_GAP_LIST_SHA256 }) {
  const engine = existsSync(ledgerPath) ? readLedger(ledgerPath) : [];
  const research = researchLedgers({ env, batches });
  /* F78 Amendment 1, C9 (RR-243): every declared tenant ledger — or, for one tenant's view, only the ledgers named to it */
  const own = (tenantLedgers ?? declaredTenantLedgers({ env })).flatMap((l) => (existsSync(l.path) ? readLedger(l.path).map((entry) => ({ entry, tenantId: l.tenantId })) : []));
  const evidenceById = new Map((existsSync(evidencePath) ? createJsonlStore(evidencePath).readAll() : []).map((r) => [r.observation_id, r]));
  /* the DECLARED site origins, so a domain property's coverage is counted against declarations only */
  const decl = readDeclarations({ env });
  const origins = (decl.readable ? decl.attachments : []).filter((a) => a?.resourceKind === "SITE_ORIGIN").map((a) => { try { return { host: new URL(a.resourceRef).host.toLowerCase(), tenantId: a.tenantId }; } catch { return { host: null, tenantId: a.tenantId }; } });
  const attributions = [
    ...engine.map((e) => attributeCostEntry(e, { resolve, evidenceById, origins })),
    ...research.entries.map(({ entry, batch }) => attributeCostEntry(entry, { resolve, evidenceById, origins, batch })),
    ...own.map(({ entry, tenantId }) => attributeCostEntry(entry, { resolve, ledgerTenant: tenantId })),
  ];
  const all = [...engine, ...research.entries.map((x) => x.entry), ...own.map((x) => x.entry)];
  const totals = totalsByTenant(all, attributions);
  /* F78 Amendment 1, A1: every gap the ledgers show, decided against the frozen boundary and list; the list reported on every read */
  const gaps = boundedGapReport({ entries: all, list: gapList, boundary, listShaPinned: gapListSha });
  const by = (f) => attributions.reduce((m, a) => ((m[f(a)] = (m[f(a)] ?? 0) + 1), m), {});
  return {
    attributions,
    totals,
    summary: Object.freeze({
      entries: all.length,
      state: by((a) => a.state),
      tenants: [...totals.keys()].filter((k) => k !== "UNATTRIBUTED").length,
      unattributedWhy: by((a) => (a.state === ATTRIBUTION.UNATTRIBUTED ? a.missing.split(" — ")[0].split(" (")[0] : "attributed")),
      measurableButNotRecorded: [...totals.values()].reduce((n, s) => n + s.measurableButNotRecorded, 0),
      foreign: attributions.filter((a) => a.foreign).length,
    }),
    gaps,
    bound: `recorded ledgers only · engine ledger ${engine.length} entr(ies) · research ledgers ${research.entries.length} entr(ies) from ${batches ? `${research.batches} named` : "every"} batch(es) (RESEARCH store ${research.store}) · tenant ledgers ${own.length} entr(ies) from ${(tenantLedgers ?? declaredTenantLedgers({ env })).length} declared · no paid or metered call`,
  };
}
