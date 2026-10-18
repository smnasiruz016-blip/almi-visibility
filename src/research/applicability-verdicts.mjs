/**
 * 🔴 F62 · C9 · THE VERDICT OF EACH CHECK STANDS ON THE VERBATIM OFFICIAL TEXT (F62 Acceptance Amendment 1, _handoffs 94a6d17, RR-283
 * item 9; owner decision 3) — as amended by F62 Acceptance Amendment 2 (RR-287, beta-g decision B). Pure: no file, network, process or
 * clock. Names no product, body, country or profession.
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
 * Amendment 2: no verdict state is named UNKNOWN. A page whose citing record says its licence forbids storing its words never decides —
 * whatever was filed, and even when a text of it is held, the check is BLOCKED by that licence, by name. A filed verdict that breaks any
 * rule, or a check with no verdict filed or two, is a FAULT named by its refusal: not a verdict, never counted as one, and the run refuses.
 */
import { normaliseText } from "../facts/quote-match.mjs";
import { OUTCOMES } from "./applicability.mjs";

export const VERDICT_KIND = Object.freeze({ OFFICIAL: "OFFICIAL", CHECKED_NOT_FOUND: "CHECKED_NOT_FOUND", BLOCKED: "BLOCKED" });
export const VERDICT_REFUSAL = Object.freeze({
  NO_VERDICT: "NO_VERDICT_FILED", TWO_VERDICTS: "MORE_THAN_ONE_VERDICT_FILED", NOT_A_CITED_PAGE: "PAGE_NOT_CITED_BY_THE_CHECK",
  NO_STORED_TEXT: "PAGE_HAS_NO_STORED_TEXT", NOT_VERBATIM: "EXCERPT_NOT_WORD_FOR_WORD", BAD_OUTCOME: "OUTCOME_NOT_STATED_KIND",
  NOT_FOUND_UNNAMED: "CHECKED_NOT_FOUND_NAMES_NOTHING", PAGE_NOT_CHECKED: "A_CITED_PAGE_WAS_NOT_CHECKED", NOT_BLOCKED: "PAGE_IS_NOT_BLOCKED", UNKNOWN_KIND: "KIND_NOT_A_VERDICT",
  CONFLICT: "OFFICIAL_VERDICTS_DISAGREE_IN_ONE_KEY",
});
export const LICENCE_BARS = "the record citing it says its licence forbids storing its words — no text of it is used";
const STATED = Object.freeze([OUTCOMES.REQUIRED, OUTCOMES.ACCEPTED, OUTCOMES.NOT_REQUIRED]);
const present = (v) => typeof v === "string" && v.trim() !== "";
const sameScope = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());
/* word for word under the quote match's own thin normalisation — the same test as src/facts/source-reader.mjs quotationIn, without loading the reader's connectors */
const quotationIn = (q, text) => { const n = normaliseText(String(q ?? "")); return n !== "" && normaliseText(String(text ?? "")).includes(n); };
const pageOf = (f) => f?.source?.url ?? f?.verification?.sourceUrl ?? null;

/** The latest stored read of each URL (a read's private text already joined). */
export const latestReads = (reads) => { const m = new Map(); for (const r of reads ?? []) if (present(r?.url)) m.set(r.url, r); return m; };

/** Judge one check against the verdicts filed for it. A row without a `kind` is a FAULT, never a verdict. */
export function judgeCheck(check, { facts, reads, filed }) {
  const mine = (filed ?? []).filter((v) => v?.body === check.body && sameScope(v?.scope, check.scope));
  const refuse = (code, why) => Object.freeze({ body: check.body, scope: check.scope, fault: code, why });
  if (mine.length > 1) return refuse(VERDICT_REFUSAL.TWO_VERDICTS, `${mine.length} verdicts are filed for this check — none is chosen`);
  const v = mine[0];
  const records = check.provenance.map((p) => (facts ?? []).find((f) => f.id === p.factId)).filter(Boolean);
  const cited = [...new Set(records.map(pageOf).filter(present))];
  const base = { body: check.body, scope: check.scope };
  /* Amendment 2 · a licence that forbids storing a page's words: that page decides nothing, by name — checked before any filed verdict */
  const barred = cited.filter((u) => records.some((f) => pageOf(f) === u && f?.sourceQuotable === false));
  if (barred.length && (!v || v.kind !== VERDICT_KIND.OFFICIAL || barred.includes(v.page))) return Object.freeze({ ...base, kind: VERDICT_KIND.BLOCKED, page: barred.includes(v?.page) ? v.page : barred[0], pages: Object.freeze(barred), reason: LICENCE_BARS });
  if (!v) return refuse(VERDICT_REFUSAL.NO_VERDICT, "no verdict is filed for this check");
  const latest = latestReads(reads);
  const textOf = (u) => { const r = latest.get(u); return r?.state === "READ" && typeof r.text === "string" ? r : null; };
  if (v.kind === VERDICT_KIND.OFFICIAL) {
    if (!STATED.includes(v.outcome)) return refuse(VERDICT_REFUSAL.BAD_OUTCOME, `outcome ${v.outcome} is not REQUIRED, ACCEPTED or NOT_REQUIRED`);
    if (!cited.includes(v.page)) return refuse(VERDICT_REFUSAL.NOT_A_CITED_PAGE, "the excerpt's page is not one the check's own records cite — the deciding body's own page");
    const r = textOf(v.page);
    if (!r) return refuse(VERDICT_REFUSAL.NO_STORED_TEXT, "the page has no stored read with its text");
    if (!present(v.excerpt) || !quotationIn(v.excerpt, r.text)) return refuse(VERDICT_REFUSAL.NOT_VERBATIM, "the excerpt is not in the page's stored text word for word — no verdict is inferred");
    return Object.freeze({ ...base, kind: VERDICT_KIND.OFFICIAL, outcome: v.outcome, excerpt: v.excerpt, page: v.page, readOn: r.readOn ?? String(r.recorded_at ?? "").slice(0, 10) ?? null });
  }
  if (v.kind === VERDICT_KIND.CHECKED_NOT_FOUND) {
    if (!present(v.notFound)) return refuse(VERDICT_REFUSAL.NOT_FOUND_UNNAMED, "the line names nothing that was not found");
    const unread = cited.filter((u) => !textOf(u));
    if (cited.length === 0 || unread.length) return refuse(VERDICT_REFUSAL.PAGE_NOT_CHECKED, `${unread.length} cited page(s) have no stored text — a page not read was not checked`);
    const dates = cited.map((u) => { const r = textOf(u); return r?.readOn ?? String(r?.recorded_at ?? "").slice(0, 10); }).sort();
    return Object.freeze({ ...base, kind: VERDICT_KIND.CHECKED_NOT_FOUND, notFound: v.notFound, pagesChecked: Object.freeze(cited), checkedOn: dates.at(-1) });
  }
  if (v.kind === VERDICT_KIND.BLOCKED) {
    if (!cited.includes(v.page)) return refuse(VERDICT_REFUSAL.NOT_A_CITED_PAGE, "the blocked page is not one the check's own records cite");
    const r = latest.get(v.page);
    if (r?.state === "BLOCKED") return Object.freeze({ ...base, kind: VERDICT_KIND.BLOCKED, page: v.page, pages: Object.freeze([v.page]), reason: `the page could not be read: ${r.reason}` });
    return refuse(VERDICT_REFUSAL.NOT_BLOCKED, "the page is neither blocked in its latest read nor barred by its licence");
  }
  return refuse(VERDICT_REFUSAL.UNKNOWN_KIND, `kind ${v.kind} is not OFFICIAL, CHECKED_NOT_FOUND or BLOCKED`);
}

/** Every derived check, judged: its rows and its counts — OFFICIAL by outcome, CHECKED_NOT_FOUND and BLOCKED apart; FAULTS apart again, never a verdict. */
export function judgeChecks({ declaration, facts, reads, filed }) {
  const rows = (declaration?.checks ?? []).map((c) => judgeCheck(c, { facts, reads, filed }));
  const n = (k, o) => rows.filter((r) => r.kind === k && (o === undefined || r.outcome === o)).length;
  return Object.freeze({
    rows: Object.freeze(rows),
    counts: Object.freeze({ checks: rows.length, OFFICIAL: n(VERDICT_KIND.OFFICIAL), REQUIRED: n(VERDICT_KIND.OFFICIAL, OUTCOMES.REQUIRED), ACCEPTED: n(VERDICT_KIND.OFFICIAL, OUTCOMES.ACCEPTED), NOT_REQUIRED: n(VERDICT_KIND.OFFICIAL, OUTCOMES.NOT_REQUIRED), CHECKED_NOT_FOUND: n(VERDICT_KIND.CHECKED_NOT_FOUND), BLOCKED: n(VERDICT_KIND.BLOCKED), FAULTS: rows.filter((r) => !r.kind).length }),
  });
}

/* the state a verdict gives its check: the OFFICIAL verdict's stated outcome, or the verdict's own kind — never UNKNOWN (Amendment 2) */
export const CHECK_STATES = Object.freeze([...STATED, VERDICT_KIND.CHECKED_NOT_FOUND, VERDICT_KIND.BLOCKED]);
const whyOf = (v) => (v.kind === VERDICT_KIND.CHECKED_NOT_FOUND ? `CHECKED_NOT_FOUND — ${v.notFound} (pages checked ${v.pagesChecked.length}, ${v.checkedOn})` : v.kind === VERDICT_KIND.BLOCKED ? `BLOCKED — ${v.reason}` : null);

/**
 * RR-286 · C9 READ BACK INTO THE CHECKS: each derived check takes the outcome of its OFFICIAL verdict (the excerpt found word for word in the
 * stored text of the deciding body's own page), with that page, excerpt and read date as what decided it. Amendment 2: a check whose verdict
 * is CHECKED_NOT_FOUND or BLOCKED carries that state, its reason named from the verdict — never NOT_REQUIRED, never UNKNOWN, never dropped;
 * a check whose verdict is a FAULT carries no state and is listed with its refusal.
 */
export function checksWithVerdicts({ declaration, judged }) {
  const checks = (declaration?.checks ?? []).map((c, i) => {
    const v = judged?.rows?.[i];
    const mine = v && v.body === c.body && sameScope(v.scope, c.scope);
    if (mine && v.kind === VERDICT_KIND.OFFICIAL) return Object.freeze({ ...c, outcome: v.outcome, why: null, decidedBy: Object.freeze({ page: v.page, excerpt: v.excerpt, readOn: v.readOn }) });
    if (mine && v.kind) return Object.freeze({ ...c, outcome: v.kind, why: whyOf(v), decidedBy: null });
    return Object.freeze({ ...c, outcome: null, why: null, fault: !v ? "no verdict judged" : !mine ? "the judged verdict is another check's" : `${v.fault} — ${v.why}`, decidedBy: null });
  });
  return Object.freeze({ checks: Object.freeze(checks), byOutcome: Object.freeze(Object.fromEntries(CHECK_STATES.map((o) => [o, checks.filter((c) => c.outcome === o).length]))), faults: checks.filter((c) => c.outcome === null).length });
}

/**
 * F62 Amendment 2 · THE SCOPE MODEL: a verdict is decided per deciding body × the declared key's values (beta-g decision B: profession ×
 * destination × deciding body), never per one value alone. Each judged check speaks for the key cells its own records carry — each
 * record's `locale` value for each declared key, or NOT NAMED. One cell never decides another: a cell with a value NOT NAMED decides no
 * named value, and one body's cell never decides another body's. Within one cell: OFFICIAL verdicts that agree decide it (OFFICIAL verdicts
 * that disagree are a FAULT — none is chosen); otherwise BLOCKED if a page it rests on is blocked, else CHECKED_NOT_FOUND.
 */
export const NOT_NAMED = null;
export function cellsOnKey({ declaration, judged, facts, keys }) {
  if (!Array.isArray(keys) || keys.length === 0 || !keys.every(present)) return Object.freeze({ measured: false, missing: "the declared key: the names of the values a verdict is decided for, beside its deciding body" });
  const byId = new Map((facts ?? []).map((f) => [f.id, f]));
  const cells = new Map();
  (declaration?.checks ?? []).forEach((c, i) => {
    const v = judged?.rows?.[i];
    if (!v?.kind || v.body !== c.body || !sameScope(v.scope, c.scope)) return;
    for (const p of c.provenance) {
      const f = byId.get(p.factId);
      if (!f) continue;
      const key = Object.freeze(Object.fromEntries(keys.map((k) => [k, present(f?.locale?.[k]) ? f.locale[k] : NOT_NAMED])));
      const id = JSON.stringify([c.body, keys.map((k) => key[k])]);
      if (!cells.has(id)) cells.set(id, { body: c.body, key, verdicts: new Map() });
      cells.get(id).verdicts.set(i, v);
    }
  });
  const rows = [...cells.values()].map(({ body, key, verdicts }) => {
    const vs = [...verdicts.values()];
    const official = vs.filter((v) => v.kind === VERDICT_KIND.OFFICIAL);
    const outcomes = [...new Set(official.map((v) => v.outcome))];
    const at = { body, key, checks: vs.length };
    if (outcomes.length > 1) return Object.freeze({ ...at, fault: VERDICT_REFUSAL.CONFLICT, why: `OFFICIAL verdicts state ${outcomes.join(" and ")} in one key — none is chosen` });
    if (outcomes.length === 1) return Object.freeze({ ...at, state: outcomes[0], kind: VERDICT_KIND.OFFICIAL, decidedBy: Object.freeze(official.map((v) => Object.freeze({ page: v.page, excerpt: v.excerpt, readOn: v.readOn }))) });
    const blocked = vs.filter((v) => v.kind === VERDICT_KIND.BLOCKED);
    if (blocked.length) return Object.freeze({ ...at, state: VERDICT_KIND.BLOCKED, kind: VERDICT_KIND.BLOCKED, pages: Object.freeze([...new Set(blocked.flatMap((v) => v.pages ?? [v.page]))]), reasons: Object.freeze([...new Set(blocked.map((v) => v.reason))]) });
    return Object.freeze({ ...at, state: VERDICT_KIND.CHECKED_NOT_FOUND, kind: VERDICT_KIND.CHECKED_NOT_FOUND, notFound: Object.freeze(vs.map((v) => v.notFound)), pagesChecked: Object.freeze([...new Set(vs.flatMap((v) => v.pagesChecked))]), checkedOn: vs.map((v) => v.checkedOn).sort().at(-1) });
  });
  const n = (s) => rows.filter((r) => r.state === s).length;
  return Object.freeze({
    measured: true, keys: Object.freeze([...keys]), cells: Object.freeze(rows),
    counts: Object.freeze({ cells: rows.length, OFFICIAL: rows.filter((r) => r.kind === VERDICT_KIND.OFFICIAL).length, REQUIRED: n(OUTCOMES.REQUIRED), ACCEPTED: n(OUTCOMES.ACCEPTED), NOT_REQUIRED: n(OUTCOMES.NOT_REQUIRED), CHECKED_NOT_FOUND: n(VERDICT_KIND.CHECKED_NOT_FOUND), BLOCKED: n(VERDICT_KIND.BLOCKED), FAULTS: rows.filter((r) => r.fault).length, bodies: new Set(rows.map((r) => r.body)).size }),
    bound: "the key cells the product's own judged records carry — no catalogue, nothing typed by anyone",
    pagesCreated: 0, pagesCounted: 0,
  });
}

/** C4 under Amendment 2 — the cell that decides a question: the same body and EVERY key value equal; a NOT NAMED value never decides a named one. */
export function cellFor(onKey, body, key) {
  if (!onKey?.measured) return null;
  return onKey.cells.find((c) => c.body === body && onKey.keys.every((k) => c.key[k] === (key?.[k] ?? NOT_NAMED))) ?? null;
}
