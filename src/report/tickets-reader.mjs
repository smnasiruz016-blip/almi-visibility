/**
 * F75 · ONE CLIENT'S TICKETS, FROM THE RECORDED FINDINGS (acceptance _handoffs 01275a9, RR-103).
 *
 *   findings      F90's actionable population — tracked stores under runs/, the production lifecycle reader, supersession applied
 *   client        a finding is this client's only when its target page is in the client's OWN crawl partition (F29's rule)
 *   checks        the registered checks, with the declared content-supply list (src/audit/content-checks.mjs)
 * Nothing is fetched, re-run, written, filed or sent. An unreadable population drafts no ticket.
 */
import { fileURLToPath } from "node:url";
import { trackedStores, readStore } from "../audit/f90-falsifiability-reader.mjs";
import { actionablePopulation } from "../audit/f90-falsifiability.mjs";
import { registeredChecks } from "../audit/check.mjs";
import { CONTENT_SUPPLY_CHECK_IDS } from "../audit/content-checks.mjs";
import { clientPageIds } from "../audit/issue-priority-reader.mjs";
import { draftTickets } from "./tickets.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));

/** The actionable findings with the fields a ticket needs, from the issue records themselves. */
export function actionableFindings({ root = REPO, paths = trackedStores(root) } = {}) {
  const stores = paths.map((p) => readStore(root, p)).filter((s) => s.unparseable > 0 || s.records.some((r) => r?.record_type === "issue"));
  const pop = actionablePopulation(stores);
  const issue = new Map();
  for (const s of stores) for (const r of s.records) if (r?.record_type === "issue" && !issue.has(r.issue_id)) issue.set(r.issue_id, r);
  const findings = pop.actionable.map((f) => {
    const i = issue.get(f.id);
    return { id: f.id, detector: f.detector, detector_version: f.detector_version, target_page_id: i.target_page_id ?? null, evidence: i.evidence ?? null };
  });
  return { findings, unreadable: pop.unreadable, stores: stores.length };
}

export function readClientTickets({ tenantId, resolve, env = process.env, root = REPO, paths, pages = null, checks = registeredChecks() }) {
  const { findings, unreadable, stores } = actionableFindings({ root, paths: paths ?? trackedStores(root) });
  const clientPages = pages ?? clientPageIds({ tenantId, resolve, env });
  const bound = (n) => `recorded data only · ${stores} store(s) holding findings · ${findings.length} actionable finding(s) · ${clientPages.size} page(s) in this client's own partition · ${n} ticketed · nothing fetched, re-run, written, filed or sent`;
  if (unreadable.length) return { verdict: "COULD-NOT-PROVE", why: `the findings cannot be read: ${[...new Set(unreadable.map((u) => u.reason))].join(", ")}`, tickets: [], bound: bound(0), unreadable };
  const d = draftTickets({ findings, clientPages, checks, contentSupplyIds: CONTENT_SUPPLY_CHECK_IDS });
  return { verdict: null, ...d, bound: bound(d.findingsTicketed), unreadable };
}
