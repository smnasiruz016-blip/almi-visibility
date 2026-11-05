/**
 * 🔴 RR-375 items 2 + 9 (owner, 5 Nov 2026) · SAVED ANSWERS STAY TRUE. Each is read again on a schedule: fees and dates every month, rules every 3 months, other answers every 6 months.
 * The check is free: the source page is read by our own reader, and the answer's numbers are looked for on it, then the fingerprint of the sentence it stood on: short hashes that cannot be read back, so a page's text is never kept.
 * MEASURED on the owner's data, 5 Nov 2026, real pages: looking for the answer's own words called 10 of 62 true facts "changed", because an answer is in our words. Numbers alone: 0 of 62. So words are never compared.
 * A page that could not be read is NOT a change ("reader blocked is not a fact"): it is tried again. A changed answer is marked; the pages using it are listed as "needs rebuild"; they are rebuilt in the app's normal flow and wait for the owner's publish. Nothing goes live by itself. Pure.
 */
import { createHash } from "node:crypto";
import { numbersOf } from "./country-facts.mjs";

export const CHANGED_FILE = "answers-changed.json";
export const RECHECK_DAYS = Object.freeze({ money: 30, rule: 90, other: 180 });
const MONEY_OR_DATE = /\bfees?\b|\bcosts?\b|\bprices?\b|\bhow much\b|\bcharges?\b|\bdates?\b|\bdeadlines?\b|\bwhen\b.*\b(?:test|exam|sit|results?)\b/i;
export const recheckClass = (row) => (MONEY_OR_DATE.test(String(row?.question ?? "")) ? "money" : row?.cls === "other" || row?.kind === "other" ? "other" : "rule");
export const recheckDays = (row) => RECHECK_DAYS[recheckClass(row)];
const dayNumber = (d) => Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`);
/** is this saved answer due for its check today? An answer with no good source is looked for again on the same schedule */
export const isDue = (row, today) => { const from = row?.checkedOn ?? row?.on; if (!from) return true; return (dayNumber(today) - dayNumber(from)) / 864e5 >= recheckDays(row); };
const STILL_THERE = 0.5, WINDOW = 4, MAX_PRINTS = 24, wordsOf = (t) => String(t ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean), hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 8), windows = (w) => { const out = []; for (let i = 0; i + WINDOW <= w.length; i++) out.push(hash(w.slice(i, i + WINDOW).join(" "))); return out; };
/** the sentence an answer stood on, as hashes nobody can read back */
export const printOf = (quote) => { const all = windows(wordsOf(quote)); if (all.length <= MAX_PRINTS) return all; const step = all.length / MAX_PRINTS; return Array.from({ length: MAX_PRINTS }, (_, i) => all[Math.floor(i * step)]); };
/** one answer against its source page, read today. → { state: "same" | "changed" | "unread", why } */
export function recheck(row, page) {
  if (!row?.ok) return { state: "same", why: "no answer was saved" };
  if (!page?.ok) return { state: "unread", why: String(page?.why ?? "the page could not be read").slice(0, 160) };
  const text = `${page.title ?? ""} ${page.text ?? ""}`, say = numbersOf(text), gone = numbersOf(row.answer).filter((n) => !say.includes(n));
  if (gone.length) return { state: "changed", why: `the source page no longer shows ${gone.join(", ")}` };
  if (row.print?.length) { const have = new Set(windows(wordsOf(text))); if (row.print.filter((p) => have.has(p)).length / row.print.length < STILL_THERE) return { state: "changed", why: "the source page no longer holds the sentence this answer stood on" }; }
  return { state: "same", why: null };
}
/** the pages of a plan whose question is one of these keys: they use the changed answer */
export function pagesUsing(plan, keys, keyOf) { const want = new Set(keys), out = new Map(); for (const p of plan?.pages ?? []) for (const it of p.items ?? []) { const k = keyOf(it.question); if (want.has(k)) out.set(p.title, [...(out.get(p.title) ?? []), it.question]); } return [...out.entries()].map(([title, questions]) => ({ title, questions })); }
/** changed answers from the server → the kept file loses them (a new answer is looked for), and the list says which pages wait. → { list, fresh } : fresh = how many are new */
export function takeChanged({ changed = {}, kept = {}, list = { rows: {} }, plan = null, keyOf, today }) {
  let fresh = 0; list.rows ??= {};
  for (const [k, v] of Object.entries(changed)) { if (list.rows[k] && list.rows[k].on === v?.changed?.on) continue; fresh++; list.rows[k] = { question: v.question, why: v.changed?.why ?? "its source changed", on: v.changed?.on ?? today, was: String(v.answer ?? "").slice(0, 300), source: v.url ?? null, pages: plan ? pagesUsing(plan, [k], keyOf).map((p) => p.title) : [] }; delete kept[k]; }
  return { list, fresh };
}
/** after a run has rebuilt pages: what no longer waits */
export const settleChanged = (list = { rows: {} }, kept = {}) => { for (const k of Object.keys(list.rows ?? {})) if (kept[k]) delete list.rows[k]; return list; };
export const changedRows = (list = { rows: {} }) => Object.entries(list.rows ?? {}).map(([key, r]) => ({ key, ...r }));
