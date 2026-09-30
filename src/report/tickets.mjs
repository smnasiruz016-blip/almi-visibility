/**
 * F75 · TASK TICKETS — one client's actionable findings drafted into developer or content tickets (acceptance _handoffs 01275a9, RR-103).
 *
 * Spec row: "Create developer or content tickets with evidence, affected population and acceptance checks."
 *
 *   one ticket       per raising check, over the client's actionable findings (F90's population) that check raised
 *   kind             CONTENT when the check is one of the declared content-supply checks; DEVELOPER when it is any other registered check;
 *                    NOT MEASURED when no registered check carries the finding's detector — never guessed
 *   evidence         every recorded evidence id of every finding, kept; a finding with none is named
 *   population       the distinct affected pages (page ids, never URLs), with the findings behind them
 *   acceptance       the raising check's own declared boundary — satisfied only when a fresh observation makes every condition false on
 *                    every affected page; NOTHING is re-run here, so satisfaction is never claimed. No boundary: NOT MEASURED, named.
 *
 * Pure: findings, the client's pages and the registered checks in; ticket drafts out. It never writes, files or sends a ticket.
 */
export const KINDS = Object.freeze(["DEVELOPER", "CONTENT"]);
export const SATISFACTION = "NOT CLAIMED — satisfied only when a fresh observation makes every declared condition false on every affected page; nothing is re-run here";

/** @param {{ findings: object[], clientPages: Set<string>, checks: object[], contentSupplyIds: readonly string[] }} a  findings: { id, detector, detector_version, target_page_id, evidence } */
export function draftTickets({ findings, clientPages, checks, contentSupplyIds }) {
  const byId = new Map(checks.map((c) => [c.id, c]));
  const content = new Set(contentSupplyIds);
  const mine = findings.filter((f) => clientPages.has(f.target_page_id));
  const groups = new Map();
  for (const f of mine) {
    if (!groups.has(f.detector)) groups.set(f.detector, []);
    groups.get(f.detector).push(f);
  }
  const tickets = [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([detector, fs]) => {
    const check = byId.get(detector);
    const missing = [];
    const kind = !check ? null : content.has(check.id) ? "CONTENT" : "DEVELOPER";
    if (!kind) missing.push({ part: "KIND", fact: `no registered check is named ${JSON.stringify(detector)} — its declared place cannot be read` });
    const evidence = [...new Set(fs.flatMap((f) => (Array.isArray(f.evidence) ? f.evidence : [])))];
    const withoutEvidence = fs.filter((f) => !Array.isArray(f.evidence) || f.evidence.length === 0).map((f) => f.id);
    const pages = new Map();
    for (const f of fs) pages.set(f.target_page_id, [...(pages.get(f.target_page_id) ?? []), f.id]);
    let acceptance = null;
    if (!check) missing.push({ part: "ACCEPTANCE", fact: "no held check to take it from" });
    else if (!check.boundary) missing.push({ part: "ACCEPTANCE", fact: `${check.id} declares no boundary: what it observes and the conditions it fires on` });
    else acceptance = { check: check.id, version: check.version ?? null, observes: check.boundary.observes, fires: check.boundary.fires, satisfied: SATISFACTION };
    return {
      check: detector,
      kind,
      findings: fs.map((f) => f.id),
      evidence,
      withoutEvidence,
      affectedPages: pages.size,
      pages: [...pages.entries()].map(([page, ids]) => ({ page, findings: ids })),
      acceptance,
      missing,
      complete: missing.length === 0 && withoutEvidence.length === 0,
    };
  });
  return {
    tickets,
    findingsTicketed: mine.length,
    notThisClient: findings.length - mine.length,
    byKind: Object.fromEntries([...KINDS, "NOT MEASURED"].map((k) => [k, tickets.filter((t) => (t.kind ?? "NOT MEASURED") === k).length])),
    incomplete: tickets.filter((t) => !t.complete).length,
  };
}
