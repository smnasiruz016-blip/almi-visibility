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

/** The class clause that follows the class letter. */
export function classClause(b) {
  if (b.admittedBy) return ` (admitted by Amendment ${amendmentNumber(b.admittedBy)})`;
  if (b.frozenClass !== b.class) return ` (frozen \`${b.frozenClass}\`, moved by Amendment 4)`;
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
    const frozen = /frozen `([^`]*)`/.exec(note);

    if (frozen && !/^[PSD]$/.test(frozen[1])) {
      errors.push(`item ${id}: its class clause records a frozen class of \`${frozen[1]}\` — a row with no frozen class was admitted, not moved`);
    }
    if (moved && admitted) errors.push(`item ${id}: its class clause says it was both moved and admitted`);
    if (moved && isAdmissionVia(via)) {
      errors.push(`item ${id}: its class clause says "moved by Amendment ${moved[1]}" but it is ruled in \`${via}\`, an admitting amendment`);
    }
    if (admitted && via !== `A${admitted[1]}`) {
      errors.push(`item ${id}: its class clause names Amendment ${admitted[1]} but it is ruled in \`${via}\``);
    }
    if (isAdmissionVia(via) && !admitted) {
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
      if (Boolean(b.classByA4) !== Boolean(moved)) {
        errors.push(`item ${id}: the boundaries say ${b.classByA4 ? "moved by Amendment 4" : "not moved"}, the ledger's class clause does not agree`);
      }
    }
  }
  if (boundaries) {
    for (const id of Object.keys(boundaries).map(Number)) if (!seen.has(id)) errors.push(`item ${id}: is in the boundaries but has no row in the ledger`);
  }
  return { errors, checked: seen.size };
}
