/**
 * 🔴 A FROZEN FOUR-PART ACCEPTANCE — PARSED FROM THE COMMITTED RULING'S BYTES, COMPARED BY ONE DECLARED RULE.
 *
 * An F-row's acceptance is authored in a SEPARATE governance repository and committed there BEFORE any implementation.
 * The engine never writes it: it carries a parsed copy pinned to the ruling's sha256 and to the contract's own sha256,
 * and every check below re-derives the hash — so implementation cannot rewrite or weaken its own acceptance without
 * the pin turning red. Generic: no subject, product or client.
 *
 * THE ONE NORMALISATION (declared, deterministic): CRLF → LF, then every run of whitespace → one space, then trim.
 * Nothing else — no case folding, no punctuation removal, no synonyms. Two clauses are IDENTICAL only when their
 * normalised forms are byte-equal.
 */
import { createHash } from "node:crypto";

export const CLAUSES = Object.freeze(["input", "expected", "failure", "evidence"]);
export const normaliseClause = (s) => String(s).replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
export const contractSha256 = (c) => createHash("sha256").update(CLAUSES.map((k) => normaliseClause(c[k])).join("\n")).digest("hex");

/** Parse FEATURE / INPUT / EXPECTED / FAILURE / EVIDENCE blocks out of a ruling's text. Throws when any is missing. */
export function parseContract(rulingText) {
  const lines = String(rulingText).replace(/\r\n/g, "\n").split("\n");
  const heads = { FEATURE: "feature", INPUT: "input", EXPECTED: "expected", FAILURE: "failure", EVIDENCE: "evidence" };
  const out = {};
  let cur = null;
  for (const l of lines) {
    if (Object.hasOwn(heads, l.trim()) && !/^\s/.test(l)) { cur = heads[l.trim()]; out[cur] = []; continue; }
    if (cur && /^\s{2}\S/.test(l)) out[cur].push(l.trim());
    else if (cur && l.trim() === "") { if (out[cur].length) cur = null; }
    else cur = null;
  }
  for (const k of ["feature", ...CLAUSES]) if (!out[k]?.length) throw new Error(`CONTRACT_INCOMPLETE: the ruling holds no ${k.toUpperCase()} clause`);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n")]));
}

/**
 * THE COMPARATOR — the four clauses, one by one, under the declared normalisation only.
 * IDENTICAL when all four are byte-equal after it; CHANGED otherwise. Never a similarity score.
 */
export function compareContracts(a, b) {
  const differing = CLAUSES.filter((k) => normaliseClause(a?.[k] ?? "") !== normaliseClause(b?.[k] ?? ""));
  return { relation: differing.length === 0 ? "IDENTICAL" : "CHANGED", differing };
}

/**
 * The crosswalk relation of an F-row to history: UNASSESSED without a frozen acceptance; NEW when no historical contract
 * is mapped to it; IDENTICAL only when every mapped contract is byte-identical after normalisation; CHANGED otherwise.
 */
export function acceptanceRelation({ acceptance, historicalContracts = [] }) {
  if (!acceptance) return { relation: "UNASSESSED", evidence: "no frozen four-part acceptance — no lawful comparison" };
  if (historicalContracts.length === 0) return { relation: "NEW", evidence: "a frozen acceptance and no mapped historical contract" };
  const cmp = historicalContracts.map((h) => ({ row: h.row, ...compareContracts(acceptance, h) }));
  return cmp.every((c) => c.relation === "IDENTICAL")
    ? { relation: "IDENTICAL", evidence: `all four clauses byte-identical after the declared normalisation, against ${cmp.map((c) => c.row).join(", ")}` }
    : { relation: "CHANGED", evidence: cmp.filter((c) => c.relation === "CHANGED").map((c) => `${c.row}: ${c.differing.join(", ")} differ`).join("; ") };
}
