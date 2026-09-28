/**
 * 🔴 F05 · DECLARED CLAUSE-LEVEL SUPERSESSION (28 September 2026, command _handoffs af4e9c8 Part B3).
 *
 * The register resolves authority per EXACT proposition (./register.mjs rules 3–7). A later record that supersedes some
 * CLAUSES of a record with a DIFFERENT proposition — Amendment 7 superseding three thresholds of Amendment 5 — could not be
 * recorded at all: every record carried `supersedes: []` and `supersededBy: []`. This module fills those two declared fields
 * from an explicit block written in a committed governance record, and from nothing else:
 *
 *   SUPERSEDES-CLAUSES v1
 *   by: <authorityId of the superseding record>
 *   target: <authorityId of the superseded record>
 *   clauses: <CLAUSE_TOKEN>, <CLAUSE_TOKEN>, …
 *   (target:/clauses: pairs repeat)
 *   END SUPERSEDES-CLAUSES
 *
 * Each link names the clause, the superseding record and the record that declared it:
 *   by.supersedes      += "<target>#<CLAUSE>@<declarer>"
 *   target.supersededBy += "<by>#<CLAUSE>@<declarer>"
 * It changes NO status and NO resolution: a clause-level link leaves every other clause of the target in force, so the target
 * stays whatever the resolver finds it to be. Fail closed: an unknown record, a malformed block, a self-link or a duplicate
 * link refuses the whole migration — a supersession nobody can resolve is never recorded.
 */
export class SupersessionRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "SupersessionRefused"; this.code = code; }
}

const TOKEN = /^[A-Z][A-Z0-9_]{2,63}$/;

/** Parse every SUPERSEDES-CLAUSES block in one record's text. Returns [{ by, target, clauses: [...] }]. */
export function declaredSupersessions(text) {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n").map((l) => l.trim());
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== "SUPERSEDES-CLAUSES v1") continue;
    let by = null, target = null, closed = false;
    for (i = i + 1; i < lines.length; i++) {
      const l = lines[i];
      if (l === "END SUPERSEDES-CLAUSES") { closed = true; break; }
      const m = l.match(/^(by|target|clauses):\s*(.+)$/);
      if (!m) throw new SupersessionRefused("SUPERSESSION_BLOCK_MALFORMED", `an unrecognised line inside a SUPERSEDES-CLAUSES block`);
      if (m[1] === "by") { if (by !== null) throw new SupersessionRefused("SUPERSESSION_BLOCK_MALFORMED", "two by: lines in one block"); by = m[2].trim(); }
      else if (m[1] === "target") { if (target !== null) throw new SupersessionRefused("SUPERSESSION_BLOCK_MALFORMED", "a target: without its clauses:"); target = m[2].trim(); }
      else {
        if (by === null || target === null) throw new SupersessionRefused("SUPERSESSION_BLOCK_MALFORMED", "clauses: before by: and target:");
        const clauses = m[2].split(",").map((s) => s.trim()).filter(Boolean);
        if (!clauses.length || clauses.some((c) => !TOKEN.test(c)) || new Set(clauses).size !== clauses.length) throw new SupersessionRefused("SUPERSESSION_BLOCK_MALFORMED", "clauses must be distinct UPPER_SNAKE tokens");
        out.push({ by, target, clauses });
        target = null;
      }
    }
    if (!closed) throw new SupersessionRefused("SUPERSESSION_BLOCK_MALFORMED", "a SUPERSEDES-CLAUSES block is never closed");
    if (target !== null) throw new SupersessionRefused("SUPERSESSION_BLOCK_MALFORMED", "a target: without its clauses:");
  }
  return out;
}

/**
 * Link declared supersessions into records. `declarations`: [{ declarer: authorityId, by, target, clauses }].
 * Returns NEW records (the input is not mutated) with supersedes / supersededBy filled and sorted.
 */
export function linkSupersessions(records, declarations) {
  const byId = new Map(records.map((r) => [r.authorityId, { ...r, supersedes: [...(r.supersedes ?? [])], supersededBy: [...(r.supersededBy ?? [])] }]));
  for (const d of declarations) {
    if (!byId.has(d.declarer)) throw new SupersessionRefused("SUPERSESSION_DECLARER_UNKNOWN", `the declaring record ${d.declarer} is not in the corpus`);
    if (!byId.has(d.by)) throw new SupersessionRefused("SUPERSESSION_BY_UNKNOWN", `the superseding record ${d.by} is not in the corpus`);
    if (!byId.has(d.target)) throw new SupersessionRefused("SUPERSESSION_TARGET_UNKNOWN", `the superseded record ${d.target} is not in the corpus`);
    if (d.by === d.target) throw new SupersessionRefused("SUPERSESSION_SELF", `${d.by} cannot supersede itself`);
    for (const c of d.clauses) {
      const fwd = `${d.target}#${c}@${d.declarer}`, back = `${d.by}#${c}@${d.declarer}`;
      const by = byId.get(d.by), target = byId.get(d.target);
      if (by.supersedes.includes(fwd) || target.supersededBy.includes(back)) throw new SupersessionRefused("SUPERSESSION_DUPLICATE", `${c} of ${d.target} is declared twice`);
      by.supersedes.push(fwd);
      target.supersededBy.push(back);
    }
  }
  return records.map((r) => { const x = byId.get(r.authorityId); return { ...x, supersedes: [...x.supersedes].sort(), supersededBy: [...x.supersededBy].sort() }; });
}
