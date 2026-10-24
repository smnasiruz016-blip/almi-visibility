/**
 * 🔴 RR-322 A2 + A3 + A4 + C2 · THE CLIENT'S OWN AI, READING IN THE CLIENT'S OWN BROWSER (owner: "a blocked site goes on the client's
 * browser list"; "never bypass a site's security check"). What this reader is refused (a 403, a security page) or cannot see (a list a
 * site loads in the browser) is put on ONE list:
 *   regulator   a regulator's English-language page that answered 403 (ECFMG, the GMC …) — Visibility then reads its scores from what the
 *               client's AI hands in, with the same verbatim check;
 *   rate        a central bank's rate or peg page (PKR, KES; AED and QAR to confirm the peg);
 *   oet-list    the subject's "who recognises it" list (oet.com loads it in the browser) — the client's AI writes it out row by row;
 *   format      what Google shows for a search (a guide, a list, a table) — the template takes that shape.
 * The client starts it; at most 30 pages a day; the AI tells the client before it starts and stops at once on a captcha; it never signs in.
 * Visibility keeps only what it MEASURES from a page's text (scores, a rate, the list's rows) — never the text.
 */
import { CLIENT_AI_POLICY } from "../src/discovery/search-phrase-sources.mjs";

export const BROWSER = Object.freeze({ cap: CLIENT_AI_POLICY.dailyCap, minPauseSeconds: CLIENT_AI_POLICY.minPauseSeconds, source: "CLIENT_AI_BROWSER_READ" });
const ORDER = { "oet-list": 0, rate: 1, regulator: 2, format: 3 };

/** the day's list: what is refused or browser-only, the most useful first, at most 30 */
export function browserList({ regulators = [], rates = [], listPage = null, listOn = null, formats = [] }) {
  const items = [
    ...(listPage ? [{ kind: "oet-list", url: listPage, label: "OET's list of organisations that recognise it", why: `oet.com shows it only in the browser; Visibility uses AlmiOET's copy of ${listOn ?? "an earlier date"} until your AI writes it out` }] : []),
    ...rates.map((r) => ({ kind: "rate", url: r.url, label: r.label, currency: r.currency, why: r.why })),
    ...regulators.map((r) => ({ kind: "regulator", url: r.url, label: r.body, listId: r.listId, why: r.why })),
    ...formats.map((f) => ({ kind: "format", url: `https://www.google.com/search?q=${encodeURIComponent(f.query)}`, label: f.query, family: f.family, why: "which shape Google shows for this search (a guide, a list or a table)" })),
  ];
  const seen = new Set(), list = items.filter((x) => { const k = `${x.kind}|${x.url}`; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  return { items: list.slice(0, BROWSER.cap), later: Math.max(0, list.length - BROWSER.cap), cap: BROWSER.cap };
}

/** the one instruction the client gives HIS OWN AI in HIS OWN browser (Visibility never runs it) */
export function browserInstruction(items) {
  return [`Open each page below in this browser, one at a time, at least ${BROWSER.minPauseSeconds} seconds apart, at most ${BROWSER.cap} today.`,
    "Before the first page, tell me (the client) you are starting. On a captcha, a \"verify you are human\" page or an \"unusual traffic\" page: STOP at once, tell me, and do not solve it or try again. Never sign in, never fill a form.",
    "For a page marked READ: copy its main text (not the menu) as you see it. For the page marked LIST: write each organisation as one line — its name, its country, its kind (regulator, employer, education …), its professions, and the grade it asks in Listening, Reading, Writing and Speaking. For a page marked SHAPE: say whether Google's first three results are a guide, a list or a table.",
    `Then give me one file, written exactly like this: { "source": "${BROWSER.source}", "date": "YYYY-MM-DD", "startedBy": { "who": "CLIENT", "record": "<how I started you>" }, "notice": { "text": "<what you told me>", "givenAt": "<ISO time>" }, "pages": [{ "url": "…", "readAt": "<ISO time>", "text": "<the page's main text>", "rows": [{ "name": "…", "country": "…", "kind": "…", "professions": ["…"], "listening": "B", "reading": "B", "writing": "C+", "speaking": "B" }], "shape": "guide or list or table" }], "stopped": null or { "reason": "CAPTCHA", "at": "<ISO time>", "toldClient": true } }`,
    "The pages:", ...items.map((x, i) => `${i + 1}. ${x.kind === "oet-list" ? "LIST" : x.kind === "format" ? "SHAPE" : "READ"} ${x.url}  (${x.label})`)].join("\n");
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** what the client's AI handed in → the pages it read that were on the list, or why the file is refused (nothing of a refused file is kept) */
export function takeBrowserReads(hand, items) {
  const refusedFor = [];
  if (hand?.source !== BROWSER.source) refusedFor.push("NOT_A_BROWSER_READ");
  if (!ISO_DAY.test(String(hand?.date ?? ""))) refusedFor.push("NO_DATE");
  if (hand?.startedBy?.who !== "CLIENT") refusedFor.push("NOT_STARTED_BY_THE_CLIENT");
  if (!String(hand?.notice?.text ?? "").trim()) refusedFor.push("NO_NOTICE_GIVEN");
  const pages = Array.isArray(hand?.pages) ? hand.pages : [];
  if (pages.length > BROWSER.cap) refusedFor.push("OVER_THE_DAILY_CAP");
  const times = pages.map((p) => Date.parse(p.readAt ?? "")).filter(Number.isFinite).sort((a, b) => a - b);
  if (times.some((t, i) => i && (t - times[i - 1]) / 1000 < BROWSER.minPauseSeconds)) refusedFor.push("TOO_FAST");
  if (refusedFor.length) return { ok: false, refusedFor, pages: [] };
  const on = new Map(items.map((x) => [x.url, x]));
  const kept = pages.filter((p) => on.has(p.url)).map((p) => ({ ...on.get(p.url), date: hand.date, text: String(p.text ?? "").slice(0, 200000), rows: Array.isArray(p.rows) ? p.rows : [], shape: /^(guide|list|table)$/i.test(p.shape ?? "") ? p.shape.toLowerCase() : null }));
  return { ok: true, pages: kept, notOnList: pages.filter((p) => !on.has(p.url)).map((p) => p.url), stopped: hand.stopped ?? null };
}

/** a page's text as a reader (so the same verbatim checks read it): only that address answers */
export const textReader = (url, text, date) => ({ on: date, requests: () => 0, read: async (u) => (u === url ? { ok: true, url, title: "", h1: null, text, links: [], checkedOn: date } : { ok: false, url: u, why: "not handed in", checkedOn: date }), sitemapOf: async () => ({ ok: false, urls: [] }), raw: async () => null });

/* the list's rows → the built-in list's shape (a row without a name or a country is left out, said why) */
const PROF = { dentistry: "dentistry", dietetics: "dietetics", medicine: "medicine", nursing: "nursing", "occupational therapy": "occupational therapy", optometry: "optometry", pharmacy: "pharmacy", podiatry: "podiatry", "speech pathology": "speech pathology", "veterinary science": "veterinary science", radiography: "radiography", physiotherapy: "physiotherapy" };
const GRADE = /^(A|B|C\+|C|D|E)$/;
export function listFromRows(rows, { date, page }) {
  const items = [], leftOut = [];
  for (const r of rows) {
    if (!String(r.name ?? "").trim() || !String(r.country ?? "").trim()) { leftOut.push({ name: r.name ?? "(no name)", why: "no name or no country" }); continue; }
    const g = ["listening", "reading", "writing", "speaking"].every((k) => GRADE.test(String(r[k] ?? "").trim())) ? { listening: r.listening.trim(), reading: r.reading.trim(), writing: r.writing.trim(), speaking: r.speaking.trim() } : null;
    items.push({ id: `client-${items.length + 1}`, name: String(r.name).trim(), short: /\(([A-Za-z&]{2,10})\)\s*$/.exec(r.name)?.[1] ?? null, country: String(r.country).trim(), kind: r.kind ? `${String(r.kind).trim()[0].toUpperCase()}${String(r.kind).trim().slice(1)}` : null, professions: (r.professions ?? []).map((p) => PROF[String(p).toLowerCase().trim()]).filter(Boolean), grade: g, website: null });
  }
  return { source: `OET's own "Who recognises OET" list, written out by your AI in your browser on ${date}`, listOn: date, page, leftOut, items };
}
