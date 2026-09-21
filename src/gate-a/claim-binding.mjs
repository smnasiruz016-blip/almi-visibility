/**
 * 🔴 ROW 25 — A PAGE'S CLAIM BOUND TO A VERIFIED FACT, OR NOT AT ALL.
 *
 * `factsPresentIn` (./existing-pages.mjs) asks whether a fact's VALUE appears in a page's text. It is kept exactly as it
 * is. It could never see a numeric or short fact (`typeof v === "string"` and MIN_VALUE_CHARS), and it could see a
 * long value only when the page repeated the registry's own wording byte for byte. A bare value match is also not a
 * claim: measured on 21 September 2026, the only numeric "hits" on the product host's pages were the values 10, 3 and 2
 * standing for counts of organisations per country — coincidences, not claims about the facts they equalled.
 *
 * So this binds a CLAIM, and a claim binds only when all of these hold, each read from a declared field:
 *
 *   AUTHORITY  the page cites the fact's own `source.url` (the source a human verified the fact against). A page that
 *              cites no source, or cites another one, is never attributed to this authority by guessing.
 *   LOCALE     every value of the fact's declared `locale` appears on the page as a whole word — the fact is about
 *              THAT scope, and a page about another scope cannot state it.
 *   CLAIM      the page states the fact's claim in one of three shapes, judged the same way for every fact:
 *                · a LABEL→VALUE LIST — the fact's value parses into two or more "label value" pairs; the page states
 *                  the same labels, each followed by a value. Same labels, same values → MATCH; same labels, any
 *                  value different → DRIFT (claim drift is a claim, and it is never a match);
 *                · a NUMBER — the fact's number appears as a standalone token (any length: "2" is detectable, because
 *                  authority and locale already bound the page);
 *                · a STRING — the fact's text appears, case and whitespace folded (any length, for the same reason).
 *   STATE      only a VERIFIED fact can be PRESENT. A claim that addresses a fact in any other state is reported as
 *              ADDRESSED_UNVERIFIED — visible, and never counted.
 *
 * The labels, the locale values and the source come from the FACT, never from this file: it names no authority, no
 * product, no country and no subject. Tenancy is decided before this runs (../tenancy/attachment.mjs); a page that does
 * not BIND to the registry is never handed its facts.
 */

import { textOf } from "./tokens.mjs";

export const BINDING_OUTCOMES = Object.freeze(["MATCH", "DRIFT", "CONFLICTING", "ADDRESSED_UNVERIFIED", "NOT_STATED", "NO_AUTHORITY", "OTHER_AUTHORITY", "LOCALE_ABSENT", "NOT_ADDRESSABLE"]);

const fold = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cleanValue = (v) => String(v).replace(/[.,;:]+$/, "").trim().toLowerCase();

/** A URL reduced to host-and-path, the way a page prints it: no scheme, no "www.", no trailing slash, no query. */
export function sourceKey(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return null;
  }
}

/** Every source a page cites: its hrefs and any host/path it prints, reduced by sourceKey. */
export function citedSources(html) {
  const out = new Set();
  for (const m of String(html).matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const k = sourceKey(m[1]);
    if (k) out.add(k);
  }
  for (const m of textOf(html).matchAll(/\b(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s"'<>]*)/gi)) {
    const k = sourceKey(`https://${m[1]}`);
    if (k) out.add(k);
  }
  return out;
}

/**
 * Parse a fact value into label→value pairs, or null when it is not a list. A list is two or more pieces, each one to
 * three words of letters followed by one value token. Nothing here knows what any label means.
 */
export function labelValueList(value) {
  if (typeof value !== "string") return null;
  const pieces = value.split(/\s*(?:,\s*and\s+|,|·|;|\s+and\s+)\s*/).map((p) => p.trim()).filter(Boolean);
  if (pieces.length < 2) return null;
  const pairs = new Map();
  for (const p of pieces) {
    const m = p.match(/^([A-Za-z]+(?: [A-Za-z]+){0,2}) (\S+)$/);
    if (!m) return null;
    const label = m[1].toLowerCase();
    if (pairs.has(label)) return null;
    pairs.set(label, cleanValue(m[2]));
  }
  return pairs;
}

/** Every place the page states ALL of the given labels, each followed by a value, within one window. */
function statedLists(text, labels, window = 300) {
  const [first] = labels;
  const found = [];
  for (const m of text.matchAll(new RegExp(`(^|[^a-z])${escape(first)}\\s+`, "g"))) {
    const slice = text.slice(m.index, m.index + window);
    const pairs = new Map();
    for (const label of labels) {
      const hit = slice.match(new RegExp(`(^|[^a-z])${escape(label)}\\s+([^\\s·,;]+)`));
      if (!hit) break;
      pairs.set(label, cleanValue(hit[2]));
    }
    if (pairs.size === labels.length) found.push(pairs);
  }
  return found;
}

/**
 * Bind one page to one fact.
 * @returns {{ factId: string, outcome: string, shape: string|null, stated?: object, expected?: object, differing?: string[] }}
 */
export function bindClaim(html, fact) {
  const text = fold(textOf(html));
  const factId = fact?.id ?? null;
  const v = fact?.value?.value;
  const key = sourceKey(fact?.source?.url ?? "");
  if (!key) return { factId, outcome: "NOT_ADDRESSABLE", shape: null, why: "the fact names no source URL, so no page can be attributed to its authority" };
  const cited = citedSources(html);
  if (cited.size === 0) return { factId, outcome: "NO_AUTHORITY", shape: null, why: "the page cites no source" };
  if (!cited.has(key)) return { factId, outcome: "OTHER_AUTHORITY", shape: null, why: "the page cites sources, none of them the fact's own" };
  const locale = Object.values(fact?.locale ?? {}).filter((x) => typeof x === "string" && x.trim() !== "");
  const missing = locale.filter((x) => !new RegExp(`(^|[^a-z])${escape(fold(x))}([^a-z]|$)`).test(text));
  if (missing.length) return { factId, outcome: "LOCALE_ABSENT", shape: null, why: `the fact's locale value(s) ${missing.join(", ")} do not appear on the page` };

  const state = fact?.verificationState;
  const settle = (outcome, extra) => ({ factId, ...extra, outcome: outcome === "MATCH" && state !== "VERIFIED" ? "ADDRESSED_UNVERIFIED" : outcome === "DRIFT" && state !== "VERIFIED" ? "ADDRESSED_UNVERIFIED" : outcome, verificationState: state });

  const list = labelValueList(v);
  if (list) {
    const labels = [...list.keys()];
    const stated = statedLists(text, labels);
    if (stated.length === 0) return settle("NOT_STATED", { shape: "LIST" });
    const verdicts = stated.map((pairs) => labels.filter((l) => pairs.get(l) !== list.get(l)));
    const kinds = new Set(verdicts.map((d) => (d.length ? "DRIFT" : "MATCH")));
    const expected = Object.fromEntries(list);
    if (kinds.size > 1) return settle("CONFLICTING", { shape: "LIST", expected, stated: stated.map((p) => Object.fromEntries(p)) });
    const differing = verdicts.find((d) => d.length) ?? [];
    return settle(differing.length ? "DRIFT" : "MATCH", { shape: "LIST", expected, stated: Object.fromEntries(stated[0]), differing });
  }
  if (typeof v === "number") {
    const hit = new RegExp(`(^|[^0-9.,])${escape(String(v))}([^0-9]|$)`).test(text);
    return settle(hit ? "MATCH" : "NOT_STATED", { shape: "NUMBER" });
  }
  if (typeof v === "string" && v.trim() !== "") {
    return settle(text.includes(fold(v)) ? "MATCH" : "NOT_STATED", { shape: "STRING" });
  }
  return { factId, outcome: "NOT_ADDRESSABLE", shape: null, why: `a ${typeof v} value has no stated form on a page` };
}
