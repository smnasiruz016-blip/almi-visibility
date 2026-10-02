/**
 * 🔴 THE EFFECTIVE PAGE LAW (RR-128; RR-129 §2) — the owner's eight clauses as they govern TODAY: clauses 1, 2, 3, 5, 7 and 8 from the law,
 * clauses 4 and 6 from Amendment 1, which replaced them. The law's record is never edited; the amendment is read beside it.
 *
 * Fails closed, never serves superseded words:
 *   PAGE_LAW_NOT_CURRENT            the law does not resolve CURRENT in the authority register
 *   PAGE_LAW_AMENDMENT_NOT_CURRENT  Amendment 1 does not resolve CURRENT — rather than fall back to the superseded clauses 4 and 6
 *   PAGE_LAW_TEXT_NOT_THE_RECORD    a carried text does not hash to the contentHash the register holds for it
 *   PAGE_LAW_CLAUSE_MISSING         a clause the law or the amendment must carry cannot be found in its text
 * Every clause names the record it came from. Generic: no product, no client.
 */
import { resolve, permits } from "../authority/register.mjs";
import { contentHashOf } from "../authority/corpus.mjs";
import { PAGE_LAW_RECORDS } from "../../config/governance/page-law-records.mjs";

const fail = (code, why) => { throw Object.assign(new Error(`${code}: ${why}`), { code }); };

/** Numbered clauses ("1. …", "4. …") of a record's body — the text after its "---" rule — each clause until the next number. */
function clausesOf(text) {
  const body = String(text).replace(/\r\n/g, "\n").split(/\n---\n/).slice(1).join("\n---\n");
  const out = {};
  for (const m of body.matchAll(/^(\d+)\.\s([\s\S]*?)(?=^\d+\.\s|(?![\s\S]))/gm)) out[Number(m[1])] = m[2].replace(/\s+/g, " ").trim();
  return out;
}

export function effectivePageLaw({ records, now, carried = PAGE_LAW_RECORDS }) {
  const proven = {};
  for (const [key, code] of [["law", "PAGE_LAW_NOT_CURRENT"], ["amendment1", "PAGE_LAW_AMENDMENT_NOT_CURRENT"]]) {
    const r = carried[key];
    const res = resolve({ records, propositionId: r.propositionId, scope: [...r.scope], now });
    if (!permits(res)) fail(code, `${r.propositionId} resolves ${res.outcome}`);
    if (contentHashOf(r.text) !== res.authority.contentHash) fail("PAGE_LAW_TEXT_NOT_THE_RECORD", `${r.path} does not hash to the register's contentHash`);
    proven[key] = { record: r, clauses: clausesOf(r.text) };
  }
  const clauses = {};
  for (let n = 1; n <= 8; n += 1) {
    const fromAmendment = carried.amendment1.replaces.includes(n);
    const src = fromAmendment ? proven.amendment1 : proven.law;
    if (!src.clauses[n]) fail("PAGE_LAW_CLAUSE_MISSING", `clause ${n} is not in ${src.record.path}`);
    clauses[n] = Object.freeze({ text: src.clauses[n], source: src.record.propositionId });
  }
  return Object.freeze(clauses);
}
