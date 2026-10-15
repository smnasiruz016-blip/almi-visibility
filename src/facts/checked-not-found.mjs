/**
 * 🔴 RR-269 §3 · CHECKED, NOT FOUND — an absence claim is NOT a fact. "No official body ranks one test as harder" cannot carry a word-for-word
 * quotation, because what it reports is not on the page. It is recorded as what was done: the official pages checked (their URLs), the day
 * they were checked, and one plain English line that says what was not found. No quotation is needed and none is invented — a record that
 * carries one is refused, so an absence can never pass as a quoted fact.
 *
 * On a page it is shown as that line with the checked pages linked, and it is NEVER in the FAQ structured data (sourced lines only). It is
 * part a of a GENERAL VIEW answer (RR-265 §2): the general view never appears without it.
 *
 * Pure: it is handed the filed records and returns them judged; it reads and writes nothing.
 */
import { isOneSentence } from "./source-reader.mjs";

export const CHECKED_NOT_FOUND = "CHECKED_NOT_FOUND";
export const CNF_REFUSE = Object.freeze({
  NO_ID: "NO_RECORD_ID",
  NO_NEED: "NAMES_NO_NEED",
  NOT_ONE_SENTENCE: "LINE_IS_NOT_ONE_SENTENCE",
  NO_PAGE_CHECKED: "NO_OFFICIAL_PAGE_CHECKED",
  PAGE_NOT_A_URL: "A_CHECKED_PAGE_IS_NOT_A_URL",
  NO_DATE: "NO_CHECK_DATE",
  CARRIES_A_QUOTATION: "AN_ABSENCE_CARRIES_NO_QUOTATION",
});
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isUrl = (u) => { try { return ["http:", "https:"].includes(new URL(String(u)).protocol); } catch { return false; } };

/** One filed record judged: { ok, record } with the record frozen, or { ok: false, id, reasons }. */
export function judgeCheckedNotFound(r) {
  const reasons = [];
  if (typeof r?.id !== "string" || r.id.trim() === "") reasons.push(CNF_REFUSE.NO_ID);
  const needs = Array.isArray(r?.needs) ? r.needs.filter((n) => typeof n === "string" && n.trim() !== "") : [];
  if (needs.length === 0) reasons.push(CNF_REFUSE.NO_NEED);
  if (!isOneSentence(r?.line)) reasons.push(CNF_REFUSE.NOT_ONE_SENTENCE);
  const checked = Array.isArray(r?.checked) ? r.checked : [];
  if (checked.length === 0) reasons.push(CNF_REFUSE.NO_PAGE_CHECKED);
  else if (!checked.every((c) => isUrl(c?.url) && typeof c?.name === "string" && c.name.trim() !== "")) reasons.push(CNF_REFUSE.PAGE_NOT_A_URL);
  if (!DAY.test(r?.checkedOn ?? "")) reasons.push(CNF_REFUSE.NO_DATE);
  /* an absence is never quoted: a quotation on this record would make it look like a fact */
  if (r && ("quotation" in r || "quotations" in r)) reasons.push(CNF_REFUSE.CARRIES_A_QUOTATION);
  if (reasons.length) return Object.freeze({ ok: false, id: r?.id ?? null, reasons: Object.freeze(reasons) });
  return Object.freeze({ ok: true, record: Object.freeze({ kind: CHECKED_NOT_FOUND, id: r.id.trim(), needs: Object.freeze(needs), line: r.line.trim(), checked: Object.freeze(checked.map((c) => Object.freeze({ url: c.url, name: c.name.trim() }))), checkedOn: r.checkedOn, ...(Array.isArray(r.replaces) ? { replaces: Object.freeze([...r.replaces]) } : {}) }) });
}

/** Every filed record judged: the admitted ones by need key, and the refused ones named. */
export function checkedNotFoundByNeed(filed) {
  const byNeed = new Map(), refused = [];
  for (const r of Array.isArray(filed) ? filed : []) {
    const j = judgeCheckedNotFound(r);
    if (!j.ok) { refused.push(j); continue; }
    for (const n of j.record.needs) byNeed.set(n, [...(byNeed.get(n) ?? []), j.record]);
  }
  return Object.freeze({ byNeed, refused: Object.freeze(refused) });
}
