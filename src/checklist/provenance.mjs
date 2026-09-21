/**
 * 🔴 WHO GAVE A ROW ITS CLASS — SAID ONCE, AND CHECKED.
 *
 * On 14 September 2026 the generated ledger read, for rows 59, 60 and 61:
 *
 *   **NOT-STARTED** · class `P` (frozen `null`, moved by Amendment 4) · ruled in `A3`
 *
 * One line, two authorities, and both wrong together: Amendment 4 moved rows 2–7 and nothing else, and a row
 * with no frozen class cannot have been moved — it was ADMITTED. The generator had one rule for "the class in
 * force differs from the frozen one", and `null !== "P"` sent every admitted row down it. Nothing refused it,
 * because nothing read the line back.
 *
 * So the clause is built HERE, by one function, and `provenanceErrors` reads the generated ledger back and
 * refuses any row whose recorded authority disagrees with itself or with the loaded boundaries.
 */

/**
 * 🔴 AND IT HAPPENED AGAIN ON 19 SEPTEMBER 2026, WHICH IS WHY THIS FUNCTION NOW NAMES THE MOVER.
 *
 * Amendment 6 (the D2 split) moved rows 1 and 54 P → S. The rule below still read "the class in force
 * differs from the frozen one → moved by Amendment 4", so both rows credited an amendment that never
 * names them — the same shape as the 14 September defect, one amendment later. `provenanceErrors`
 * refused it, in its output, before it reached the owner.
 *
 * The fix is to ask WHICH amendment moved the row rather than assuming there is only one that can.
 */
const MOVERS = [
  { flag: "classByA6", number: 6 },
  { flag: "classByA4", number: 4 },
];

/** The amendment that moved this row, or null. */
export function movedBy(b) {
  const hit = MOVERS.find((m) => b?.[m.flag]);
  return hit ? hit.number : null;
}

/** The class clause that follows the class letter. */
export function classClause(b) {
  if (b.admittedBy) return ` (admitted by Amendment ${amendmentNumber(b.admittedBy)})`;
  const mover = movedBy(b);
  if (mover) return ` (frozen \`${b.frozenClass}\`, moved by Amendment ${mover})`;
  /* 🔴 A class that differs from the frozen one with NO mover flag is not describable, and it is not
   * guessed. Saying nothing here makes provenanceErrors refuse the row rather than print a wrong name. */
  return b.a4 ? " (kept by Amendment 4)" : "";
}

/** "A3" → "3". The `via` of an admitted row is the amendment that admitted it. */
const amendmentNumber = (via) => String(via).replace(/^A/, "");
const isAdmissionVia = (via) => /^A\d+$/.test(via);

const STATE_LINE = /^### (\d+) · [^\n]*\n\n\*\*([A-Z-]+)\*\* · class `([PSD])`(?: \(([^)]*)\))? · ruled in `([^`]+)`/gm;

/**
 * @param {string} markdown     the generated CHECKLIST_BOUNDARIES.md
 * @param {object} [boundaries] the loaded boundaries, for the cross-check; omit to check the text against itself
 * @returns {{ errors: string[], checked: number }}
 */
export function provenanceErrors(markdown, boundaries = null) {
  const errors = [];
  const seen = new Set();
  for (const m of String(markdown).replace(/\r\n/g, "\n").matchAll(STATE_LINE)) {
    const [, idText, , klass, note = "", via] = m;
    const id = Number(idText);
    seen.add(id);
    const moved = /moved by Amendment (\d+)/.exec(note);
    const admitted = /admitted by Amendment (\d+)/.exec(note);
    const frozen = /frozen \`([^\`]*)\`/.exec(note);
    /* 🔴 A ROW MAY BE AMENDED AFTER IT IS ADMITTED. `via` then carries both — row 61 is `A5+A7`,
     * admitted by amendment 5 and amended by amendment 7. The ADMITTING amendment is the first
     * segment; a clause naming any other one is still a provenance lie and still fails. */
    const admittingVia = String(via).split("+")[0];

    if (frozen && !/^[PSD]$/.test(frozen[1])) {
      errors.push(`item ${id}: its class clause records a frozen class of \`${frozen[1]}\` — a row with no frozen class was admitted, not moved`);
    }
    if (moved && admitted) errors.push(`item ${id}: its class clause says it was both moved and admitted`);
    if (moved && isAdmissionVia(admittingVia)) {
      errors.push(`item ${id}: its class clause says "moved by Amendment ${moved[1]}" but it is ruled in \`${via}\`, an admitting amendment`);
    }
    if (admitted && admittingVia !== `A${admitted[1]}`) {
      errors.push(`item ${id}: its class clause names Amendment ${admitted[1]} but it is ruled in \`${via}\``);
    }
    if (isAdmissionVia(admittingVia) && !admitted) {
      errors.push(`item ${id}: it is ruled in \`${via}\`, an admitting amendment, but its class clause does not say it was admitted`);
    }

    if (boundaries) {
      const b = boundaries[id];
      if (!b) {
        errors.push(`item ${id}: is in the ledger but not in the loaded boundaries`);
        continue;
      }
      if (b.class !== klass) errors.push(`item ${id}: the ledger says class ${klass}, the boundaries say ${b.class}`);
      if (Boolean(b.admittedBy) !== Boolean(admitted)) {
        errors.push(`item ${id}: the boundaries say ${b.admittedBy ? `admitted by ${b.admittedBy}` : "not admitted"}, the ledger's class clause does not agree`);
      }
      const mover = movedBy(b);
      if (Boolean(mover) !== Boolean(moved)) {
        errors.push(`item ${id}: the boundaries say ${mover ? `moved by Amendment ${mover}` : "not moved"}, the ledger's class clause does not agree`);
      } else if (mover && Number(moved[1]) !== mover) {
        /* 🔴 NAMING THE WRONG MOVER IS ITS OWN DEFECT — it is the 14 September error exactly, and a
         * check that only asked "was it moved?" would have let Amendment 6's rows credit Amendment 4. */
        errors.push(`item ${id}: its class clause says "moved by Amendment ${moved[1]}" but the boundaries say Amendment ${mover} moved it`);
      }
    }
  }
  if (boundaries) {
    for (const id of Object.keys(boundaries).map(Number)) if (!seen.has(id)) errors.push(`item ${id}: is in the boundaries but has no row in the ledger`);
  }
  return { errors, checked: seen.size };
}
