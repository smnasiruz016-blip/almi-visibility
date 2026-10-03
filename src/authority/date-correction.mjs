/**
 * 🔴 F05 · DECLARED DATE CORRECTION (RR-153 timing correction, 3 October 2026; the owner's ruling: "the effective date is 3 October 2026,
 * recorded by appending a correction. Nothing already committed is rewritten").
 *
 * A record's date is taken from its file name (src/authority/corpus.mjs recordFromFile). When a committed record carries a WRONG date, the
 * correction is APPENDED as an explicit block in a committed OWNER-issued governance record, read from its committed bytes and from nothing
 * else:
 *
 *   DATE-CORRECTION v1
 *   target: <authorityId of the record whose date is wrong>
 *   effectiveFrom: YYYY-MM-DD
 *   reason: <one line>
 *   END DATE-CORRECTION
 *
 * Applied, the target's issuedAt and effectiveFrom take the corrected date, and its issuedAtSource NAMES the correction and the date the
 * file name carried — the original stays readable in both the file and the record. Fail closed, refusing the whole migration: a malformed
 * or unclosed block, an unknown target or declarer, a declarer that is not OWNER-issued, a corrected date later than the correction's own
 * date (a correction never moves a record into the future), or a second correction of one target.
 */
export class DateCorrectionRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "DateCorrectionRefused"; this.code = code; }
}
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Parse every DATE-CORRECTION block in one record's text. Returns [{ target, effectiveFrom, reason }]. */
export function declaredDateCorrections(text) {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n").map((l) => l.trim());
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== "DATE-CORRECTION v1") continue;
    const block = {};
    let closed = false;
    for (i = i + 1; i < lines.length; i++) {
      if (lines[i] === "END DATE-CORRECTION") { closed = true; break; }
      const m = lines[i].match(/^(target|effectiveFrom|reason):\s*(.+)$/);
      if (!m || m[1] in block) throw new DateCorrectionRefused("DATE_CORRECTION_MALFORMED", "an unrecognised or repeated line inside a DATE-CORRECTION block");
      block[m[1]] = m[2].trim();
    }
    if (!closed) throw new DateCorrectionRefused("DATE_CORRECTION_MALFORMED", "a DATE-CORRECTION block is never closed");
    if (!block.target || !ISO.test(block.effectiveFrom ?? "") || !block.reason) throw new DateCorrectionRefused("DATE_CORRECTION_MALFORMED", "a block needs target, an ISO effectiveFrom and a reason");
    out.push(block);
  }
  return out;
}

/** Apply declared corrections: `declarations` [{ declarer, target, effectiveFrom, reason }]. Returns NEW records; the input is not mutated. */
export function applyDateCorrections(records, declarations) {
  const byId = new Map(records.map((r) => [r.authorityId, { ...r }]));
  const corrected = new Set();
  for (const d of declarations) {
    const declarer = byId.get(d.declarer);
    if (!declarer) throw new DateCorrectionRefused("DATE_CORRECTION_DECLARER_UNKNOWN", `the declaring record ${d.declarer} is not in the corpus`);
    if (declarer.issuer?.class !== "OWNER") throw new DateCorrectionRefused("DATE_CORRECTION_NOT_OWNER", `only an OWNER-issued record corrects a date; ${d.declarer} is not`);
    const target = byId.get(d.target);
    if (!target) throw new DateCorrectionRefused("DATE_CORRECTION_TARGET_UNKNOWN", `the corrected record ${d.target} is not in the corpus`);
    if (d.effectiveFrom > declarer.issuedAt) throw new DateCorrectionRefused("DATE_CORRECTION_IN_FUTURE", `${d.effectiveFrom} is later than the correction's own date ${declarer.issuedAt}`);
    if (corrected.has(d.target)) throw new DateCorrectionRefused("DATE_CORRECTION_DUPLICATE", `${d.target} is corrected twice`);
    corrected.add(d.target);
    byId.set(d.target, { ...target, issuedAt: d.effectiveFrom, effectiveFrom: d.effectiveFrom, issuedAtSource: `DATE_CORRECTION — named ${target.issuedAt}, corrected by ${d.declarer}` });
  }
  return records.map((r) => byId.get(r.authorityId));
}
