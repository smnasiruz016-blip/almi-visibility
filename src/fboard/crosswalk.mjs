/**
 * 🔴 THE HISTORICAL CROSSWALK — ONE ENTRY PER F-ROW. IT POINTS TO REUSABLE WORK; IT NEVER IMPORTS AUTHORITY.
 *
 * For each F01–F96: the historical rows mapped to it (provenance references only), the relation of its frozen acceptance
 * to theirs (the four-clause comparator, src/fboard/acceptance.mjs — never a semantic judgement), and the plain rule
 * that fresh verification is always required and no authority is imported. A row with no frozen acceptance is
 * UNASSESSED: no lawful comparison is possible, and it grants no implementation permission.
 *
 * The historical ledger's status records enter HERE, as provenance — never the authority resolver's candidate set.
 */
import { acceptanceRelation } from "./acceptance.mjs";

export function buildCrosswalk({ capabilities, acceptances = {}, mappings = {}, historicalRows = [] }) {
  const entries = capabilities.map((c) => {
    const acc = acceptances[c.id] ?? null;
    const map = mappings[c.id] ?? { historicalRows: [], historicalCommits: [], reusableModules: [], reusableTests: [], contracts: [] };
    const rel = acceptanceRelation({ acceptance: acc, historicalContracts: map.contracts ?? [] });
    return {
      featureId: c.id,
      historicalRows: [...(map.historicalRows ?? [])],
      historicalCommits: [...(map.historicalCommits ?? [])],
      reusableModules: [...(map.reusableModules ?? [])],
      reusableTests: [...(map.reusableTests ?? [])],
      acceptanceRelation: rel.relation,
      relationEvidence: rel.evidence,
      freshVerificationRequired: true,
      authorityImported: false,
      notes: acc ? (map.notes ?? "") : "no frozen acceptance — nothing may be compared, imported or implemented",
    };
  });
  const provenance = historicalRows.map((r) => ({ board: r.board, row: r.id, state: r.state, role: "PROVENANCE_REFERENCE", authorityImported: false }));
  return { entries, provenance };
}

/** Every fault of a crosswalk. [] means lawful. */
export function crosswalkErrors(cw) {
  const errs = [];
  for (const e of cw.entries) {
    if (e.authorityImported !== false) errs.push({ code: "AUTHORITY_IMPORTED", id: e.featureId });
    if (e.freshVerificationRequired !== true) errs.push({ code: "FRESH_VERIFICATION_WAIVED", id: e.featureId });
    if (!["NEW", "CHANGED", "IDENTICAL", "UNASSESSED"].includes(e.acceptanceRelation)) errs.push({ code: "UNKNOWN_RELATION", id: e.featureId });
  }
  for (const p of cw.provenance) if (p.authorityImported !== false || p.role !== "PROVENANCE_REFERENCE") errs.push({ code: "PROVENANCE_AS_AUTHORITY", id: `${p.board}:${p.row}` });
  return errs;
}
