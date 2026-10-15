/**
 * 🔴 F44 · ACCEPTANCE AMENDMENT 2 (RR-268) · THE SOURCE READER — the engine reads an official page itself, turns it into facts, and checks
 * its own facts again on their recheck date. The owner's product policy (RR-268 §0.2): "Visibility itself reads official source pages and
 * turns them into facts, for any client and any product. The client does nothing."
 *
 *   C7  READ        through the engine's ONE paced path only (the opened connector's fetch: at least 2 s per host, src/tenancy/connectors.mjs);
 *                   the host's robots file first, through the same path (src/crawl/robots.mjs, fail closed); a plain public request — no
 *                   credential, no cookie, no body; a login wall is not read past
 *   C8  FALLBACK    a refusal, a challenge or an empty page → the CLIENT'S OWN browser route, only when the client connected and started
 *                   it: at least 5 s per host, a run cap, a stop on a captcha or a login wall; with no route → BLOCKED with its URL
 *   C9  EXTRACT     the client's own AI proposes facts (one sentence, one source, one quotation) — through the paid-provider gate the
 *                   caller hands in (off by default, budget, cap, ledger); a refusal of the gate is reported, never routed around
 *   C10 VERBATIM    a proposal is ADMITTED only when its quotation is in the stored page text word for word, under the quote match's
 *                   thin normalisation (src/facts/quote-match.mjs normaliseText); otherwise REJECTED with its reason
 *   C11 RECHECK     CURRENT · CHANGED (every page that uses the fact flagged for rebuild) · BLOCKED · REJECTED — exactly one per fact
 *   C12 NEUTRAL     this file names no product, client, exam or host; everything outside it is handed in
 *
 * Pure apart from what it is handed: it opens no connector, reads no credential, writes nothing. The page text it returns is for the
 * caller to keep PRIVATELY in the research batch, with its sha256, URL and read date.
 */
import { createHash } from "node:crypto";
import { normaliseText, MIN_SUBSTANTIVE_BODY } from "./quote-match.mjs";
import { createRobotsCache, USER_AGENT } from "../crawl/robots.mjs";
import { pacedRelease } from "../tenancy/connectors.mjs";
import { pdfText, isPdf, PDF_TEXT } from "./pdf-text.mjs";

export const SOURCE_READ_RECORD = "source_page_read";
export const FACT_RECHECK_RECORD = "fact_recheck";
/* RR-269: CLIENT_FILE — a document the client saved and handed over (its original URL and the day it was supplied recorded with it) */
export const ROUTE = Object.freeze({ ENGINE: "ENGINE_PACED_PATH", BROWSER: "CLIENT_BROWSER_ROUTE", CLIENT_FILE: "CLIENT_FILE_ROUTE" });
/**
 * RR-269 §1: how a read reached the engine. ENGINE — the engine made the request itself (C7), or handed a blocked read to the client's
 * connected route (C8). CAPTURE — a page a person read in the client's own browser and filed as text; the engine made no request and drove
 * no route, so a capture never counts as a C8 read. CLIENT_FILE — a document the client supplied.
 */
export const VIA = Object.freeze({ ENGINE: "ENGINE", CAPTURE: "CAPTURE", CLIENT_FILE: "CLIENT_FILE" });
/** RR-269 §1: a supplied document the client says is out of date — kept as a record, never a source a fact may stand on */
export const CURRENCY = Object.freeze({ AS_SUPPLIED: "AS_SUPPLIED", OUT_OF_DATE: "OUT_OF_DATE" });
export const READ_STATE = Object.freeze({ READ: "READ", BLOCKED: "BLOCKED" });
export const BLOCK = Object.freeze({
  ROBOTS_DISALLOWED: "ROBOTS_DISALLOWED",
  ROBOTS_UNREADABLE: "ROBOTS_COULD_NOT_BE_READ",
  REFUSED: "REFUSED",
  CHALLENGE: "CHALLENGE",
  EMPTY: "EMPTY_PAGE",
  LOGIN_WALL: "LOGIN_WALL",
  CAPTCHA: "CAPTCHA",
  OFF_HOST: "REDIRECTED_OFF_HOST",
  NOT_FOUND: "NOT_FOUND",
  NOT_TEXT: "NOT_A_TEXT_DOCUMENT",
  FAILED: "READ_FAILED",
  NO_ROUTE: "NO_BROWSER_ROUTE_CONNECTED",
  ROUTE_STOPPED: "BROWSER_ROUTE_STOPPED",
  ROUTE_CAP: "BROWSER_ROUTE_RUN_CAP_REACHED",
  READ_CAP: "RUN_READ_CAP_REACHED",
});
/** What the engine may hand to the client's browser route: a refusal, a challenge or an empty page (RR-268 §B2.2). Nothing else. */
export const FALLBACK_ON = Object.freeze([BLOCK.REFUSED, BLOCK.CHALLENGE, BLOCK.EMPTY]);
/** The owner's bound for one run of live reads (RR-268 §B3: "max 100 reads") — robots files count. */
export const SOURCE_READ = Object.freeze({ maxRequests: 100 });
/** The browser route's own floor between two reads of one host (RR-268 §B2.2: "≥5 s per host"). */
export const BROWSER_GAP_MS = 5000;
export const RECHECK = Object.freeze({ CURRENT: "CURRENT", CHANGED: "CHANGED", BLOCKED: "BLOCKED", REJECTED: "REJECTED" });
export const REJECT = Object.freeze({
  NO_QUOTATION: "NO_RECORDED_WORD_FOR_WORD_QUOTATION",
  NOT_IN_TEXT: "QUOTATION_NOT_WORD_FOR_WORD_IN_THE_STORED_PAGE_TEXT",
  NOT_ONE_SENTENCE: "NOT_ONE_SENTENCE",
  NOT_ONE_SOURCE: "NOT_ONE_SOURCE",
  NO_PAGE_TEXT: "NO_STORED_PAGE_TEXT",
  OUT_OF_DATE: "SOURCE_IS_OUT_OF_DATE",
});

const REFUSAL_STATUS = new Set([401, 403, 407, 429, 503]);
/* the marks of a bot challenge and of a login wall in a page's markup or text — declared words, never a score */
const CHALLENGE_MARKS = /(cf-challenge|challenge-platform|just a moment\.\.\.|attention required|verify you are (a )?human|are you a robot|enable javascript and cookies to continue)/i;
const CAPTCHA_MARKS = /(captcha|hcaptcha|recaptcha|turnstile)/i;
const LOGIN_MARKS = /<input[^>]+type=["']?password/i;
const TEXT_TYPES = /^\s*(text\/html|text\/plain|application\/xhtml\+xml)\b/i;
const PDF_TYPE = /^\s*application\/(x-)?pdf\b/i;
const LOGIN_PATH =/\/(log-?in|sign-?in|auth|account\/login)(\/|\?|$)/i;

export const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");
export const hostOf = (url) => { try { return new URL(String(url)).host; } catch { return null; } };
/** One sentence: one end mark, at the end (the page law's own measure, kept here so the reader needs nothing of the page module). */
export const isOneSentence = (t) => { const s = String(t ?? "").trim(); return s.length > 0 && /[.!?]$/.test(s) && (s.match(/[.!?](?=\s+[A-Z(]|$)/g) ?? []).length === 1; };
/** A recorded quotation is present in a page text only word for word, under the quote match's own thin normalisation. */
export const quotationIn = (quotation, text) => { const n = normaliseText(String(quotation ?? "")); return n !== "" && normaliseText(String(text ?? "")).includes(n); };

const blocked = (url, route, reason, detail, extra = {}) => Object.freeze({ state: READ_STATE.BLOCKED, url, route, reason, detail, ...extra });

/**
 * RR-269 §2 · a PDF document, read: its text through the PDF reader (src/facts/pdf-text.mjs), kept like a page's text with its sha256. A PDF
 * that shows no text (a scanned document) or cannot be read is NOT_A_TEXT_DOCUMENT, named — its bytes are never kept as text.
 */
export function pdfRead(url, route, bytes, on, { landedUrl = url, status = null, extra = {} } = {}) {
  const r = pdfText(bytes);
  if (r.state !== PDF_TEXT.TEXT) return blocked(url, route, BLOCK.NOT_TEXT, r.state === PDF_TEXT.NO_TEXT ? `a PDF of ${r.pages} page(s) that shows no text (a scanned document) — nothing is kept as its text` : `the PDF could not be read (${r.detail}) — nothing is kept as its text`, { document: "PDF", ...extra });
  const text = normaliseText(r.text);
  if (text.length < MIN_SUBSTANTIVE_BODY) return blocked(url, route, BLOCK.NOT_TEXT, `a PDF of ${r.pages} page(s) with ${text.length} characters of text — not a text document`, { document: "PDF", ...extra });
  return Object.freeze({ state: READ_STATE.READ, url, route, landedUrl, ...(status !== null ? { status } : {}), text, sha256: sha256(text), readOn: on, chars: text.length, document: "PDF", pages: r.pages, ...extra });
}

/**
 * RR-269 §1 · a page a person read in the client's own browser and filed as text. The file says, in its first lines, the URL, the read
 * date and the route ("client browser"); then a line "---"; then the page text, verbatim. A file that does not say all of these is
 * refused, named — nothing is guessed. The engine makes no request and drives no route: the read is kept with VIA CAPTURE.
 */
export const CAPTURE_REFUSE = Object.freeze({ NO_URL: "CAPTURE_NAMES_NO_URL", NO_DATE: "CAPTURE_NAMES_NO_READ_DATE", NOT_CLIENT_BROWSER: "CAPTURE_ROUTE_IS_NOT_CLIENT_BROWSER", NO_TEXT: "CAPTURE_HOLDS_NO_PAGE_TEXT" });
export function captureRead({ raw, file }) {
  const s = String(raw ?? "").replace(/^﻿/, "");
  const cut = s.search(/^---\s*$/m);
  const head = cut < 0 ? s : s.slice(0, cut), body = cut < 0 ? "" : s.slice(cut).replace(/^---\s*\r?\n?/, "");
  const url = /^URL:\s*(https?:\/\/\S+)\s*$/m.exec(head)?.[1] ?? null;
  const readLine = /^READ:\s*(.*)$/m.exec(head)?.[1] ?? "";
  const readOn = /^(\d{4}-\d{2}-\d{2})\b/.exec(readLine)?.[1] ?? null;
  const why = !url ? CAPTURE_REFUSE.NO_URL : !readOn ? CAPTURE_REFUSE.NO_DATE : !/\broute:\s*client browser\b/i.test(readLine) ? CAPTURE_REFUSE.NOT_CLIENT_BROWSER : body.trim() === "" ? CAPTURE_REFUSE.NO_TEXT : null;
  if (why) return Object.freeze({ state: "REFUSED", file, reason: why });
  const text = normaliseText(body);
  return Object.freeze({ state: READ_STATE.READ, url, route: ROUTE.BROWSER, via: VIA.CAPTURE, landedUrl: url, text, sha256: sha256(text), readOn, chars: text.length, capture: Object.freeze({ file, fileSha256: sha256(s) }) });
}

/**
 * RR-269 §2 · a document the client supplied: read by the PDF reader, with its original URL and the day it was supplied. A document the
 * client says is out of date is kept as OUT_OF_DATE with that basis — never a source a fact may stand on (extractFacts refuses it).
 */
export function clientFileRead({ bytes, file, url, suppliedOn, outOfDate = null }) {
  const currency = outOfDate ? Object.freeze({ state: CURRENCY.OUT_OF_DATE, basis: String(outOfDate) }) : Object.freeze({ state: CURRENCY.AS_SUPPLIED });
  return pdfRead(url, ROUTE.CLIENT_FILE, bytes, suppliedOn, { extra: { via: VIA.CLIENT_FILE, clientFile: Object.freeze({ file, fileSha256: createHash("sha256").update(bytes).digest("hex"), suppliedOn }), currency } });
}

/**
 * C7 · one read by the engine itself. `fetchImpl` is an OPENED connector's fetch — the one paced path; `robots` a cache built on that same
 * fetch (createRobotsCache), so the robots request is paced too. Returns READ with the page text (normalised: markup out, words kept) or
 * BLOCKED with its reason.
 */
export async function engineRead(url, { fetchImpl, robots, on, timeoutMs = 20_000 } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("an opened connector's fetch is required — the engine reads only through its one paced path");
  if (!robots || typeof robots.check !== "function") throw new TypeError("a robots cache on the same paced fetch is required");
  const r = await robots.check(url);
  if (r.state === "UNKNOWN") return blocked(url, ROUTE.ENGINE, BLOCK.ROBOTS_UNREADABLE, r.reason);
  if (!r.allowed) return blocked(url, ROUTE.ENGINE, BLOCK.ROBOTS_DISALLOWED, r.reason);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res, body, bytes;
  try {
    /* a plain public request: GET, our own agent, nothing typed — no credential, no cookie, no body */
    res = await fetchImpl(url, { method: "GET", redirect: "follow", credentials: "omit", headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
    /* the answer's bytes: a PDF is read from its bytes, a page from their text */
    bytes = Buffer.from(await res.arrayBuffer());
    body = bytes.toString("utf8");
  } catch (err) {
    return blocked(url, ROUTE.ENGINE, BLOCK.FAILED, `the read failed: ${err?.name === "AbortError" ? "timeout" : String(err?.message ?? err)}`);
  } finally { clearTimeout(timer); }
  const landed = res.url || url;
  if (hostOf(landed) !== hostOf(url)) return blocked(url, ROUTE.ENGINE, BLOCK.OFF_HOST, `asked for ${hostOf(url)}, landed on ${hostOf(landed)}`);
  if (REFUSAL_STATUS.has(res.status)) return blocked(url, ROUTE.ENGINE, BLOCK.REFUSED, `HTTP ${res.status}`, { status: res.status });
  if (res.status === 404 || res.status === 410) return blocked(url, ROUTE.ENGINE, BLOCK.NOT_FOUND, `HTTP ${res.status}`, { status: res.status });
  if (!res.ok) return blocked(url, ROUTE.ENGINE, BLOCK.FAILED, `HTTP ${res.status}`, { status: res.status });
  /* RR-268 C: a document that is not text (a PDF's bytes, an image) is never kept as a page's text — B3 stored four PDFs' raw bytes as READ */
  const type = String(res.headers?.get?.("content-type") ?? "");
  /* RR-269 §2: a PDF is read by the PDF reader — its text, never its bytes; a PDF that shows no text (scanned) is NOT_A_TEXT_DOCUMENT */
  if (isPdf(bytes) || PDF_TYPE.test(type)) return pdfRead(url, ROUTE.ENGINE, bytes, on, { landedUrl: landed, status: res.status });
  if (type !== "" && !TEXT_TYPES.test(type)) return blocked(url, ROUTE.ENGINE, BLOCK.NOT_TEXT, `the answer is not a text document (${type}) — nothing is kept as its text`);
  if (LOGIN_PATH.test(new URL(landed).pathname) || LOGIN_MARKS.test(body)) return blocked(url, ROUTE.ENGINE, BLOCK.LOGIN_WALL, "the page asks for a login — not read past");
  if (CHALLENGE_MARKS.test(body)) return blocked(url, ROUTE.ENGINE, BLOCK.CHALLENGE, "the page answered with a bot challenge");
  const text = normaliseText(body);
  if (text.length < MIN_SUBSTANTIVE_BODY) return blocked(url, ROUTE.ENGINE, BLOCK.EMPTY, `${text.length} characters of text — not a document`);
  return Object.freeze({ state: READ_STATE.READ, url, route: ROUTE.ENGINE, landedUrl: landed, status: res.status, text, sha256: sha256(text), readOn: on, chars: text.length });
}

/**
 * C8 · the client's own browser route. `route` is handed in by the caller: { connected, startedByClient, cap, read(url) → { text, signal } }.
 * It is used only when the client connected AND started it; at least BROWSER_GAP_MS between two reads of one host; never past its run
 * cap; a captcha or a login wall stops the route for the rest of the run. `state` carries the run's count and stop across calls.
 */
export async function browserRead(url, { route, state, on, pace = pacedRelease, hosts } = {}) {
  if (!route || route.connected !== true || route.startedByClient !== true || typeof route.read !== "function") return blocked(url, ROUTE.BROWSER, BLOCK.NO_ROUTE, "no browser route of the client's is connected and started — the need is BLOCKED, named");
  if (state.stopped) return blocked(url, ROUTE.BROWSER, BLOCK.ROUTE_STOPPED, `the route stopped earlier in this run (${state.stopped})`);
  const cap = Number.isInteger(route.cap) && route.cap > 0 ? route.cap : 0;
  if (state.reads >= cap) return blocked(url, ROUTE.BROWSER, BLOCK.ROUTE_CAP, `the route's run cap of ${cap} read(s) is reached`);
  await pace(url, BROWSER_GAP_MS, hosts ? { hosts } : undefined);
  state.reads += 1;
  let got;
  try { got = await route.read(url); } catch (err) { return blocked(url, ROUTE.BROWSER, BLOCK.FAILED, `the browser route failed: ${String(err?.message ?? err)}`); }
  const raw = String(got?.text ?? "");
  const stop = got?.signal === BLOCK.CAPTCHA || CAPTCHA_MARKS.test(raw) ? BLOCK.CAPTCHA : got?.signal === BLOCK.LOGIN_WALL || LOGIN_MARKS.test(raw) ? BLOCK.LOGIN_WALL : null;
  if (stop) { state.stopped = stop; return blocked(url, ROUTE.BROWSER, stop, "the route stops at a captcha or a login wall — nothing is typed, nothing is solved"); }
  const text = normaliseText(raw);
  if (text.length < MIN_SUBSTANTIVE_BODY) return blocked(url, ROUTE.BROWSER, BLOCK.EMPTY, `${text.length} characters of text — not a document`);
  return Object.freeze({ state: READ_STATE.READ, url, route: ROUTE.BROWSER, landedUrl: url, text, sha256: sha256(text), readOn: on, chars: text.length });
}

/**
 * One source, read: the engine first (C7); a refusal, challenge or empty page goes to the client's browser route (C8); with no route the
 * source is BLOCKED with its URL and the engine's own reason. A run cap on the engine's reads (the owner's bound for the run) is honoured
 * before any request.
 */
export async function readSource(url, { fetchImpl, robots, route = null, state, on, maxReads = Infinity, requestsMade = () => state.engineReads, pace, hosts } = {}) {
  /* the bound counts every request the paced path released — a source's read and, for a new host, its robots file: two at the most */
  if (requestsMade() + 2 > maxReads) return blocked(url, ROUTE.ENGINE, BLOCK.READ_CAP, `the run's bound of ${maxReads} request(s) would be passed`);
  state.engineReads += 1;
  const e = await engineRead(url, { fetchImpl, robots, on });
  if (e.state === READ_STATE.READ || !FALLBACK_ON.includes(e.reason)) return e;
  const b = await browserRead(url, { route, state, on, pace, hosts });
  return b.state === READ_STATE.READ ? Object.freeze({ ...b, engineBlocked: e.reason }) : Object.freeze({ ...b, engineBlocked: e.reason, engineDetail: e.detail });
}

/** The robots cache an engine read uses — built on the SAME paced fetch, so the robots request waits its turn like any other. */
export const robotsOn = (fetchImpl) => createRobotsCache({ fetchImpl });

/**
 * C9 + C10 · the client's AI proposes facts from a READ page's stored text; each proposal is admitted only when it is one sentence, names
 * this one source and carries a quotation found word for word in the text. `propose(text, url)` is handed in — the client's own AI behind
 * the paid-provider gate; a refusal of the gate (off by default, budget, cap) is reported as REFUSED with its code and admits nothing.
 */
export async function extractFacts({ read, propose }) {
  if (!read || read.state !== READ_STATE.READ || typeof read.text !== "string") return Object.freeze({ state: "NOT_READ", admitted: Object.freeze([]), rejected: Object.freeze([Object.freeze({ reason: REJECT.NO_PAGE_TEXT })]) });
  /* RR-269 §1: a document the client says is out of date is no source for any fact — nothing is proposed from it, nothing admitted */
  if (read.currency?.state === CURRENCY.OUT_OF_DATE) return Object.freeze({ state: "OUT_OF_DATE", admitted: Object.freeze([]), rejected: Object.freeze([Object.freeze({ reason: REJECT.OUT_OF_DATE, source: read.url })]) });
  let proposals;
  try { proposals = await propose(read.text, read.url); } catch (err) {
    return Object.freeze({ state: "REFUSED", code: err?.code ?? "PROPOSER_FAILED", detail: String(err?.message ?? err), admitted: Object.freeze([]), rejected: Object.freeze([]) });
  }
  const admitted = [], rejected = [];
  for (const p of Array.isArray(proposals) ? proposals : []) {
    const why = !isOneSentence(p?.sentence) ? REJECT.NOT_ONE_SENTENCE
      : p?.source !== read.url ? REJECT.NOT_ONE_SOURCE
      : !quotationIn(p?.quotation, read.text) ? (String(p?.quotation ?? "").trim() === "" ? REJECT.NO_QUOTATION : REJECT.NOT_IN_TEXT)
      : null;
    (why ? rejected : admitted).push(Object.freeze({ sentence: p?.sentence ?? null, quotation: p?.quotation ?? null, source: read.url, ...(why ? { reason: why } : { pageSha256: read.sha256, readOn: read.readOn }) }));
  }
  return Object.freeze({ state: "PROPOSED", admitted: Object.freeze(admitted), rejected: Object.freeze(rejected) });
}

/**
 * C11 · the recheck of stored facts. Each fact: { factId, link, quotations: [...], readOn, recheckDays, pages: [...] }. `readOf(url)` returns
 * the read of that source in this run (each URL read once). Exactly one state per fact; nothing stored is rewritten — the result is a new
 * record beside the fact. A CHANGED fact names every page that uses it, flagged for rebuild.
 */
export async function recheckFacts({ facts, readOf, on }) {
  const out = [];
  for (const f of facts) {
    const base = { factId: f.factId, url: f.link, host: hostOf(f.link), pages: Object.freeze([...(f.pages ?? [])]), readOnBefore: f.readOn ?? null, recheckDays: f.recheckDays ?? null, due: dueOn(f, on) };
    const quotations = (f.quotations ?? []).filter((q) => String(q ?? "").trim() !== "");
    if (quotations.length === 0) { out.push(Object.freeze({ ...base, state: RECHECK.REJECTED, reason: REJECT.NO_QUOTATION, rebuild: Object.freeze([]) })); continue; }
    const read = await readOf(f.link);
    if (read.state !== READ_STATE.READ) { out.push(Object.freeze({ ...base, state: RECHECK.BLOCKED, reason: read.reason, detail: read.detail ?? null, route: read.route, rebuild: Object.freeze([]) })); continue; }
    const missing = quotations.filter((q) => !quotationIn(q, read.text));
    out.push(Object.freeze({ ...base, state: missing.length ? RECHECK.CHANGED : RECHECK.CURRENT, quotations: quotations.length, missing: missing.length, pageSha256: read.sha256, route: read.route, readOn: on,
      /* nothing is silently kept: a CHANGED fact flags every page that uses it */
      rebuild: Object.freeze(missing.length ? [...base.pages] : []) }));
  }
  return Object.freeze(out);
}

/** Due on `on` when its read date plus its recheck interval is not later than `on`; null when either is not recorded. */
export function dueOn(f, on) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? "");
  if (!ok(f?.readOn) || !ok(on) || !(Number.isInteger(f?.recheckDays) && f.recheckDays > 0)) return null;
  return (Date.parse(`${on}T00:00:00Z`) - Date.parse(`${f.readOn}T00:00:00Z`)) / 86400000 >= f.recheckDays;
}

/** The stored record of one read — the page text kept privately in the batch, with its sha256, URL and read date (C10). */
export function readRecord({ read, tenantId, on, run }) {
  const id = sha256(JSON.stringify([read.url, read.state, read.sha256 ?? read.reason, on])).slice(0, 24);
  return Object.freeze({ record_type: SOURCE_READ_RECORD, read_id: id, measurement_key: `${SOURCE_READ_RECORD}:${id}`, tenantId, url: read.url, host: hostOf(read.url), route: read.route, state: read.state,
    ...(read.state === READ_STATE.READ ? { sha256: read.sha256, chars: read.chars, text: read.text, landedUrl: read.landedUrl ?? read.url } : { reason: read.reason, detail: read.detail ?? null }),
    ...(read.engineBlocked ? { engineBlocked: read.engineBlocked } : {}),
    /* RR-269: how the read reached the engine, and what it was — a PDF's page count, a capture's file, a client file's day and currency */
    via: read.via ?? VIA.ENGINE, ...Object.fromEntries(["document", "pages", "capture", "clientFile", "currency"].filter((k) => read[k] !== undefined).map((k) => [k, read[k]])),
    readOn: read.via === VIA.CAPTURE || read.via === VIA.CLIENT_FILE ? read.readOn : on, recorded_at: `${on}T00:00:00Z`, run });
}
/** The stored record of one fact's recheck — beside the fact, never in place of it (C11). */
export function recheckRecord({ result, tenantId, on, run }) {
  const id = sha256(JSON.stringify([result.factId, result.state, result.pageSha256 ?? result.reason ?? null, on])).slice(0, 24);
  return Object.freeze({ record_type: FACT_RECHECK_RECORD, recheck_id: id, measurement_key: `${FACT_RECHECK_RECORD}:${id}`, tenantId, ...result, recorded_at: `${on}T00:00:00Z`, run });
}

export const EXTRACTION_RECORD = "fact_extraction";
/** What an admitted proposal is to the fact it names: the same fact's source re-admitted, or a new fact for a need (another source). */
export const EXTRACTION = Object.freeze({ RE_ADMITTED: "RE_ADMITTED", NEW_FOR_NEED: "NEW_FOR_NEED", REJECTED: "REJECTED" });
/**
 * C9 + C10 · the stored record of one proposal and the engine's verdict on it (extractFacts) — beside the facts, never in place of one. `route`
 * names the AI that proposed it (the client's own); `factLink` is the source of the fact the proposal names (null for a new fact).
 */
export function extractionRecord({ proposal, result, factLink, route, tenantId, on, run }) {
  const a = result.admitted[0] ?? null, r = result.rejected[0] ?? null;
  const outcome = !a ? EXTRACTION.REJECTED : proposal.fact && factLink === proposal.source ? EXTRACTION.RE_ADMITTED : EXTRACTION.NEW_FOR_NEED;
  const id = sha256(JSON.stringify([proposal.proposalId, proposal.fact ?? null, proposal.source, proposal.sentence, proposal.quotation, on])).slice(0, 24);
  return Object.freeze({ record_type: EXTRACTION_RECORD, extraction_id: id, measurement_key: `${EXTRACTION_RECORD}:${id}`, tenantId, proposalId: proposal.proposalId, fact: proposal.fact ?? null, need: proposal.need ?? null,
    source: proposal.source, host: hostOf(proposal.source), sentence: proposal.sentence ?? null, quotation: proposal.quotation ?? null, route, outcome,
    ...(a ? { pageSha256: a.pageSha256, readOnPage: a.readOn } : { reason: r?.reason ?? (result.state === "NOT_READ" ? REJECT.NO_PAGE_TEXT : REJECT.NO_QUOTATION) }), recorded_at: `${on}T00:00:00Z`, run });
}

/** Counts per state and per source host — count-only, as the row's output is. */
export function recheckCounts(results) {
  const byState = Object.fromEntries(Object.values(RECHECK).map((s) => [s, 0]));
  const byHost = {};
  for (const r of results) { byState[r.state] += 1; const h = (byHost[r.host ?? "(none)"] ??= Object.fromEntries(Object.values(RECHECK).map((s) => [s, 0]))); h[r.state] += 1; }
  return Object.freeze({ facts: results.length, byState: Object.freeze(byState), byHost: Object.freeze(byHost), pagesFlagged: Object.freeze([...new Set(results.flatMap((r) => r.rebuild))].sort()) });
}
