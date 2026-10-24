/**
 * 🔴 RR-288 · A LICENCE THAT FORBIDS STORING A SOURCE'S WORDS IS OBEYED EVERYWHERE THE ENGINE STORES OR BUILDS (owner decision 1 of RR-288;
 * beta-g decision A). Pure: no file, network, process or clock. Names no product, body or host.
 *
 *   R1 WHICH SOURCES   a source is licence-barred when a record citing it declares `sourceQuotable: false` — its own recorded licence, never
 *                      a guess; one record is enough
 *   R2 THE READER      a read of a barred source is stored with NO text — only its URL, read date, sha256 and the licence reason
 *   R3 THE EXTRACTION  a proposal from a barred source is stored with NO sentence and NO quotation
 *   R4 THE BUILD       a claim that carries a quotation of a barred source is REFUSED, named — never built
 */
import { createHash } from "node:crypto";

export const LICENCE_WITHHELD = "LICENCE_FORBIDS_STORING_ITS_WORDS";
/*   R5 THE PASSAGE     (RR-288 census; RR-323 the practice samples) a text's 8-word sequences as hashes — sha256, first 16 hex — the
 *                      words themselves never kept; a text "holds a passage" of another when a run of its consecutive words is in its hashes */
export const SHINGLE = 8;
export const shingleHash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
export const wordsOf = (s) => String(s ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
export function shingleHashes(text) { const w = wordsOf(text), out = new Set(); for (let i = 0; i + SHINGLE <= w.length; i++) out.add(shingleHash(w.slice(i, i + SHINGLE).join(" "))); return out; }
/** the longest run of consecutive words of `text` whose 8-word sequences are all in `hashes` (0 when none) */
export function longestRun(text, hashes) { const w = wordsOf(text); let best = 0, a = -1, end = -1; for (let i = 0; i + SHINGLE <= w.length; i++) if (hashes.has(shingleHash(w.slice(i, i + SHINGLE).join(" ")))) { if (a < 0 || i > end) a = i; end = i + SHINGLE; best = Math.max(best, end - a); } return best; }
export const BUILD_REFUSAL = "CLAIM_QUOTES_A_SOURCE_WHOSE_LICENCE_FORBIDS_STORING_ITS_WORDS";
const urlOf = (f) => f?.source?.url ?? f?.verification?.sourceUrl ?? null;
const norm = (u) => String(u ?? "").replace(/#.*$/, "").replace(/\/$/, "");
const present = (s) => typeof s === "string" && s.trim() !== "";

/** R1 · the licence-barred sources: every URL a record cites with `sourceQuotable: false`. */
export function barredSources(facts) {
  return new Set((facts ?? []).filter((f) => f?.sourceQuotable === false && present(urlOf(f))).map((f) => norm(urlOf(f))));
}
export const isBarred = (barred, url) => present(url) && barred.has(norm(url));

/** R2 · a read record as stored: a barred source's text is never kept — its URL, read date and sha256 stay, with the reason. */
export function withheldRead(record, barred) {
  if (!record || !isBarred(barred, record.url) || record.text === null || record.text === undefined) return record;
  const { text, ...rest } = record;
  return Object.freeze({ ...rest, text: null, textWithheld: LICENCE_WITHHELD });
}

/** R3 · an extraction or proposal as stored: no sentence and no quotation of a barred source. */
export function withheldExtraction(record, barred) {
  if (!record || !isBarred(barred, record.source) || (record.sentence == null && record.quotation == null)) return record;
  return Object.freeze({ ...record, sentence: null, quotation: null, wordsWithheld: LICENCE_WITHHELD });
}

/** R4 · the build: every claim quoting a barred source, refused by name; the rest pass unchanged. */
export function claimsQuotingBarred(claims, barred) {
  const refused = [], kept = [];
  for (const c of claims ?? []) {
    const link = c?.source?.link ?? c?.source?.url ?? null;
    if (present(c?.quotation) && isBarred(barred, link)) refused.push(Object.freeze({ claimId: c.claimId ?? null, source: link, refused: BUILD_REFUSAL }));
    else kept.push(c);
  }
  return Object.freeze({ kept: Object.freeze(kept), refused: Object.freeze(refused) });
}
