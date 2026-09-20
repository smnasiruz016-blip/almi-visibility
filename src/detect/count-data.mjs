/**
 * DETECTOR E — A COUNT STATED TO THE READER AGAINST THE COLLECTION THAT SUPPLIES IT.
 *
 * "Three options", "five steps", "nine destinations" — a number on a surface is a claim about a
 * collection somewhere behind it. This compares the stated number with the size of that collection.
 *
 * 🔴 THE NUMBER IS SUPPLIED AS A NUMBER, NOT SCRAPED FROM PROSE. The caller extracts it. A detector
 * that parses "three" out of a sentence will eventually read "three or four" as 3, and a counting
 * detector that miscounts is worse than none.
 *
 * 🔴 AND THE COLLECTION MUST BE NAMED, NOT INFERRED. An unbound statement is UNKNOWN: comparing a
 * stated count against whatever collection happens to be nearest is how a detector fires on a
 * correct page. A stated count with no collection is precisely the case where nothing is known.
 */
import { finding, clean, unknown } from "./outcome.mjs";

const DETECTOR = "rendered-count-vs-data";

/**
 * @param {object} input
 * @param {{id:string, locator:string, statedCount:number, collectionRef:string}[]} input.statements
 * @param {Record<string, unknown[]>} input.collections  ref -> the items that supply the count
 */
export function detectCountVsData({ statements, collections } = {}) {
  if (!Array.isArray(statements) || collections === undefined || collections === null || typeof collections !== "object") {
    return [unknown({
      detector: DETECTOR, subject: "(input)", reasonCode: "INPUT_ABSENT",
      detail: `statements=${Array.isArray(statements) ? statements.length : "absent"} collections=${collections ? "present" : "absent"}`,
    })];
  }

  const out = [];
  for (const s of statements) {
    const id = s?.id ?? "(unnamed statement)";
    if (!Number.isFinite(s?.statedCount)) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "EVIDENCE_INCOMPLETE", detail: `statedCount is ${JSON.stringify(s?.statedCount)} — this detector compares numbers and does not read a count out of prose` }));
      continue;
    }
    if (typeof s?.collectionRef !== "string" || s.collectionRef.trim() === "") {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "EVIDENCE_INCOMPLETE", detail: "the statement names no collection, so there is nothing to count against it" }));
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(collections, s.collectionRef)) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "INPUT_ABSENT", detail: `the statement names collection ${JSON.stringify(s.collectionRef)} and it was not supplied` }));
      continue;
    }
    const items = collections[s.collectionRef];
    if (!Array.isArray(items)) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "INPUT_UNREADABLE", detail: `collection ${JSON.stringify(s.collectionRef)} is ${typeof items}, not a countable list` }));
      continue;
    }

    const actual = items.length;
    const where = `${s.locator ?? id} · states ${s.statedCount} · collection ${s.collectionRef} holds ${actual}`;
    if (actual !== s.statedCount) {
      out.push(finding({
        detector: DETECTOR, subject: id,
        defectClass: "stated-count-does-not-match-underlying-data",
        evidence: [where, `stated: ${s.statedCount}`, `actual: ${actual}`, `difference: ${actual - s.statedCount}`],
        summary: `the surface states ${s.statedCount} and the data behind it holds ${actual}`,
      }));
      continue;
    }
    out.push(clean({
      detector: DETECTOR, subject: id,
      checked: [where, `stated: ${s.statedCount}`, `actual: ${actual}`],
      summary: "the stated count matches the collection that supplies it",
    }));
  }
  return out;
}
