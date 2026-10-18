/**
 * 🔴 F62 · C9 · THE VERDICT OF EACH CHECK STANDS ON THE VERBATIM OFFICIAL TEXT (F62 Acceptance Amendment 1, _handoffs 94a6d17, RR-283
 * item 9; owner decision 3). Pure: no file, network, process or clock. Names no product, body, country or profession.
 *
 * Every derived check (deriveDeclaration) is judged against the verdict filed for it in the existing agent session, and carries EXACTLY ONE of:
 *
 *   OFFICIAL           REQUIRED · ACCEPTED · NOT_REQUIRED, with an excerpt found word for word (the quote match's own thin normalisation)
 *                      in the latest stored READ of one of the pages the check's own records cite — the deciding body's own page — and
 *                      that page's read date
 *   CHECKED_NOT_FOUND  what was not found, every cited page checked (each must have a stored READ) and the latest read date
 *   BLOCKED            a cited page, and why it could not be read: its latest stored read is BLOCKED (the read's own reason), or the
 *                      record citing it says its licence forbids storing its words — never NOT_REQUIRED
 *
 * A filed verdict that breaks any rule is REFUSED by name and the check stays UNKNOWN; a check with no verdict filed, or two, is UNKNOWN.
 * No verdict is inferred and no person is required.
 */
import { normaliseText } from "../facts/quote-match.mjs";
import { OUTCOMES } from "./applicability.mjs";

export const VERDICT_KIND = Object.freeze({ OFFICIAL: "OFFICIAL", CHECKED_NOT_FOUND: "CHECKED_NOT_FOUND", BLOCKED: "BLOCKED", UNKNOWN: "UNKNOWN" });
export const VERDICT_REFUSAL = Object.freeze({
  NO_VERDICT: "NO_VERDICT_FILED", TWO_VERDICTS: "MORE_THAN_ONE_VERDICT_FILED", NOT_A_CITED_PAGE: "PAGE_NOT_CITED_BY_THE_CHECK",
  NO_STORED_TEXT: "PAGE_HAS_NO_STORED_TEXT", NOT_VERBATIM: "EXCERPT_NOT_WORD_FOR_WORD", BAD_OUTCOME: "OUTCOME_NOT_STATED_KIND",
  NOT_FOUND_UNNAMED: "CHECKED_NOT_FOUND_NAMES_NOTHING", PAGE_NOT_CHECKED: "A_CITED_PAGE_WAS_NOT_CHECKED", NOT_BLOCKED: "PAGE_IS_NOT_BLOCKED", UNKNOWN_KIND: "UNKNOWN_KIND",
});
const STATED = Object.freeze([OUTCOMES.REQUIRED, OUTCOMES.ACCEPTED, OUTCOMES.NOT_REQUIRED]);
const present = (v) => typeof v === "string" && v.trim() !== "";
const sameScope = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());
/* word for word under the quote match's own thin normalisation — the same test as src/facts/source-reader.mjs quotationIn, without loading the reader's connectors */
const quotationIn = (q, text) => { const n = normaliseText(String(q ?? "")); return n !== "" && normaliseText(String(text ?? "")).includes(n); };
const pageOf = (f) => f?.source?.url ?? f?.verification?.sourceUrl ?? null;

/** The latest stored read of each URL (a read's private text already joined). */
export const latestReads = (reads) => { const m = new Map(); for (const r of reads ?? []) if (present(r?.url)) m.set(r.url, r); return m; };

/** Judge one check against the verdicts filed for it. */
export function judgeCheck(check, { facts, reads, filed }) {
  const mine = (filed ?? []).filter((v) => v?.body === check.body && sameScope(v?.scope, check.scope));
  const unknown = (code, why) => Object.freeze({ body: check.body, scope: check.scope, kind: VERDICT_KIND.UNKNOWN, refused: code, why });
  if (mine.length === 0) return unknown(VERDICT_REFUSAL.NO_VERDICT, "no verdict is filed for this check");
  if (mine.length > 1) return unknown(VERDICT_REFUSAL.TWO_VERDICTS, `${mine.length} verdicts are filed for this check — none is chosen`);
  const v = mine[0];
  const records = check.provenance.map((p) => (facts ?? []).find((f) => f.id === p.factId)).filter(Boolean);
  const cited = [...new Set(records.map(pageOf).filter(present))];
  const latest = latestReads(reads);
  const textOf = (u) => { const r = latest.get(u); return r?.state === "READ" && typeof r.text === "string" ? r : null; };
  const base = { body: check.body, scope: check.scope };
  if (v.kind === VERDICT_KIND.OFFICIAL) {
    if (!STATED.includes(v.outcome)) return unknown(VERDICT_REFUSAL.BAD_OUTCOME, `outcome ${v.outcome} is not REQUIRED, ACCEPTED or NOT_REQUIRED`);
    if (!cited.includes(v.page)) return unknown(VERDICT_REFUSAL.NOT_A_CITED_PAGE, "the excerpt's page is not one the check's own records cite — the deciding body's own page");
    const r = textOf(v.page);
    if (!r) return unknown(VERDICT_REFUSAL.NO_STORED_TEXT, "the page has no stored read with its text");
    if (!present(v.excerpt) || !quotationIn(v.excerpt, r.text)) return unknown(VERDICT_REFUSAL.NOT_VERBATIM, "the excerpt is not in the page's stored text word for word — no verdict is inferred");
    return Object.freeze({ ...base, kind: VERDICT_KIND.OFFICIAL, outcome: v.outcome, excerpt: v.excerpt, page: v.page, readOn: r.readOn ?? String(r.recorded_at ?? "").slice(0, 10) ?? null });
  }
  if (v.kind === VERDICT_KIND.CHECKED_NOT_FOUND) {
    if (!present(v.notFound)) return unknown(VERDICT_REFUSAL.NOT_FOUND_UNNAMED, "the line names nothing that was not found");
    const unread = cited.filter((u) => !textOf(u));
    if (cited.length === 0 || unread.length) return unknown(VERDICT_REFUSAL.PAGE_NOT_CHECKED, `${unread.length} cited page(s) have no stored text — a page not read was not checked`);
    const dates = cited.map((u) => { const r = textOf(u); return r?.readOn ?? String(r?.recorded_at ?? "").slice(0, 10); }).sort();
    return Object.freeze({ ...base, kind: VERDICT_KIND.CHECKED_NOT_FOUND, notFound: v.notFound, pagesChecked: Object.freeze(cited), checkedOn: dates.at(-1) });
  }
  if (v.kind === VERDICT_KIND.BLOCKED) {
    if (!cited.includes(v.page)) return unknown(VERDICT_REFUSAL.NOT_A_CITED_PAGE, "the blocked page is not one the check's own records cite");
    const r = latest.get(v.page);
    const licence = records.some((f) => pageOf(f) === v.page && f?.sourceQuotable === false);
    if (r?.state === "BLOCKED") return Object.freeze({ ...base, kind: VERDICT_KIND.BLOCKED, page: v.page, reason: `the page could not be read: ${r.reason}` });
    if (licence && !textOf(v.page)) return Object.freeze({ ...base, kind: VERDICT_KIND.BLOCKED, page: v.page, reason: "the record citing it says its licence forbids storing its words — it is not read" });
    return unknown(VERDICT_REFUSAL.NOT_BLOCKED, "the page is neither blocked in its latest read nor barred by its licence");
  }
  return unknown(VERDICT_REFUSAL.UNKNOWN_KIND, `kind ${v.kind} is not OFFICIAL, CHECKED_NOT_FOUND or BLOCKED`);
}

/** Every derived check, judged: its rows and its counts — OFFICIAL by outcome, CHECKED_NOT_FOUND, BLOCKED and UNKNOWN apart. */
export function judgeChecks({ declaration, facts, reads, filed }) {
  const rows = (declaration?.checks ?? []).map((c) => judgeCheck(c, { facts, reads, filed }));
  const n = (k, o) => rows.filter((r) => r.kind === k && (o === undefined || r.outcome === o)).length;
  return Object.freeze({
    rows: Object.freeze(rows),
    counts: Object.freeze({ checks: rows.length, OFFICIAL: n(VERDICT_KIND.OFFICIAL), REQUIRED: n(VERDICT_KIND.OFFICIAL, OUTCOMES.REQUIRED), ACCEPTED: n(VERDICT_KIND.OFFICIAL, OUTCOMES.ACCEPTED), NOT_REQUIRED: n(VERDICT_KIND.OFFICIAL, OUTCOMES.NOT_REQUIRED), CHECKED_NOT_FOUND: n(VERDICT_KIND.CHECKED_NOT_FOUND), BLOCKED: n(VERDICT_KIND.BLOCKED), UNKNOWN: n(VERDICT_KIND.UNKNOWN) }),
  });
}

/**
 * RR-286 · C9 READ BACK INTO THE CHECKS: each derived check takes the outcome of its OFFICIAL verdict (the excerpt found word for word in the
 * stored text of the deciding body's own page), with that page, excerpt and read date as what decided it. A check whose verdict is
 * CHECKED_NOT_FOUND, BLOCKED or UNKNOWN stays UNKNOWN, its reason named from the verdict — never NOT_REQUIRED, never dropped.
 */
export function checksWithVerdicts({ declaration, judged }) {
  const checks = (declaration?.checks ?? []).map((c, i) => {
    const v = judged?.rows?.[i];
    if (v && v.kind === VERDICT_KIND.OFFICIAL && v.body === c.body && sameScope(v.scope, c.scope)) return Object.freeze({ ...c, outcome: v.outcome, why: null, decidedBy: Object.freeze({ page: v.page, excerpt: v.excerpt, readOn: v.readOn }) });
    const why = !v ? "no verdict judged" : v.kind === VERDICT_KIND.CHECKED_NOT_FOUND ? `CHECKED_NOT_FOUND — ${v.notFound} (pages checked ${v.pagesChecked.length}, ${v.checkedOn})` : v.kind === VERDICT_KIND.BLOCKED ? `BLOCKED — ${v.reason}` : `UNKNOWN — ${v.why}`;
    return Object.freeze({ ...c, outcome: OUTCOMES.UNKNOWN, why, decidedBy: null });
  });
  return Object.freeze({ checks: Object.freeze(checks), byOutcome: Object.freeze(Object.fromEntries(Object.values(OUTCOMES).map((o) => [o, checks.filter((c) => c.outcome === o).length]))) });
}
