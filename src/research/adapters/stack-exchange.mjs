/**
 * F16 · ONE CONFINED SOURCE ADAPTER — a Stack Exchange question list, from a RECORDED response only (RR-120 decision record
 * _handoffs AlmiVisibility_RR-120_STACK_EXCHANGE_DECISION_2026-10-01.md; field shape verified in RR-121,
 * _handoffs AlmiVisibility_RR-121_API_SHAPE_AND_PILOT_2026-10-01.md).
 *
 * 🔴 IT FETCHES NOTHING. It turns one recorded response, plus a later recorded RECHECK of the same posts, into boundary items
 * (src/research/source-adapter.mjs), which admits, refuses and keeps. No provider endpoint is called by anything in this repository.
 *
 *   WHAT IS STORED   only what F16 needs: the title as returned · the post link · the post date · the post version (its last edit, else its
 *                    creation) · the creator's display name · the licence the RESPONSE states · the attribution. Nothing else is copied —
 *                    never a body, a score, a tag list or a whole response.
 *   LICENCE          🔴 RR-121: the response's own `content_license` DECIDES. It is never inferred from a date. Absent → refused; a value we
 *                    do not recognise → refused; a recognised version outside the declared set (4.0 only: only that legal code was read) →
 *                    refused by the boundary. The dated rule on the licensing page is a CROSS-CHECK only: a disagreement is counted and
 *                    reported, never used to choose the licence.
 *   ATTRIBUTION      a missing creator, title or link REFUSES the item by name. A creator is never invented, substituted, derived or
 *                    defaulted — not "unknown", not the site's name, not an id.
 *   CURRENCY         a post absent from the recheck is REFUSED (deleted since retrieval); a post whose title or version differs is REFUSED
 *                    (changed since retrieval). No recheck → every post is refused: currency NOT MEASURED is not currency proved.
 *   COVERAGE         one network, one site, its own topics and languages. Country is NOT MEASURED. The output never stands for more.
 */
import { SOURCE_KINDS, VERIFIED, NOT_VERIFIED } from "../source-adapter.mjs";
import { NOT_MEASURED } from "../public-questions.mjs";

export { collect, collectByIds, sourceRefusal } from "./stack-exchange-collector.mjs";

/**
 * RR-155 · F16 C9 · THE SOURCE DECISION THIS ADAPTER RUNS UNDER — the owner's own, issued in his name (_handoffs 3dba784; RR-154 §2). It
 * replaced RR-120's record, which stays INVALID (issuer never declared). The collection entry point resolves it from the authority register
 * before any request and refuses unless it is CURRENT with a declared issuer. The terms readings below (RR-120) stay what they were: readings.
 */
export const SOURCE_DECISION = Object.freeze({ propositionId: "OWNER_DECISION_RR-154_STACK_EXCHANGE_SOURCE", scope: Object.freeze(["ALMIVISIBILITY"]) });
/** The one origin a collection run may reach; the subject's QUESTION_SOURCE_API connector must declare it, and the connector refuses any other. */
export const API_ORIGIN = "https://api.stackexchange.com";
/**
 * One request's URL from a method and its parameters — WITHOUT the credential: the entry point's transport adds the key itself, at the
 * moment of sending, and nothing here sees it. `{ids}` in a method is filled from the `ids` parameter, which then leaves the query string.
 */
export function requestUrl(method, params = {}) {
  const p = { ...params };
  let path = String(method);
  if (path.includes("{ids}")) { path = path.replace("{ids}", encodeURIComponent(String(p.ids ?? "")).replace(/%3B/gi, ";")); delete p.ids; }
  const u = new URL(path, API_ORIGIN);
  for (const k of Object.keys(p).sort()) { if (k === "key" || k === "access_token") continue; u.searchParams.set(k, String(p[k])); }
  return u.toString();
}

const READ_ON = "2026-10-01";
const DECISION = "_handoffs AlmiVisibility_RR-120_STACK_EXCHANGE_DECISION_2026-10-01.md";
export const LICENCE_URL = "https://creativecommons.org/licenses/by-sa/4.0/legalcode.en";
/**
 * Field names and types as documented on the question-object and shallow-user pages (read 2026-10-01). `present` is what the page
 * guarantees: "may be absent" fields are OPTIONAL. The VALUE FORMAT of content_license is not documented: our accepted pattern is an
 * assumption, so an unrecognised value is refused, never coerced.
 */
export const FIELD_MAP = Object.freeze({
  wording: { field: "title", type: "string", present: "GUARANTEED", status: VERIFIED },
  sourceUrl: { field: "link", type: "string", present: "GUARANTEED", status: VERIFIED },
  postedAt: { field: "creation_date", type: "date (unix epoch seconds)", present: "GUARANTEED", status: VERIFIED },
  lastEdit: { field: "last_edit_date", type: "date (unix epoch seconds)", present: "OPTIONAL", status: VERIFIED },
  owner: { field: "owner", type: "shallow_user", present: "OPTIONAL", status: VERIFIED },
  creator: { field: "owner.display_name", type: "string", present: "OPTIONAL", status: VERIFIED },
  id: { field: "question_id", type: "integer", present: "GUARANTEED", status: VERIFIED },
  licence: { field: "content_license", type: "string (API version 2.2)", present: "GUARANTEED", status: VERIFIED },
  licenceValueFormat: { field: "content_license value", type: "e.g. \"CC BY-SA 4.0\" — assumed", present: "—", status: NOT_VERIFIED },
});
const LICENCE_VALUE = /^CC BY-SA (2\.5|3\.0|4\.0)$/;

export const DECLARATION = Object.freeze({
  sourceId: "stack-exchange-network",
  kind: SOURCE_KINDS.QUESTION_SOURCE,
  licenceVersions: Object.freeze(["4.0"]),
  terms: Object.freeze({
    storage: Object.freeze({ status: VERIFIED, retrievedOn: READ_ON,
      citation: `public terms: "allow others to have derivative rights to publish, distribute, store and use such content"; licence §2(a)(1): "reproduce and Share the Licensed Material, in whole or in part" — ${DECISION}` }),
    attribution: Object.freeze({ status: VERIFIED, retrievedOn: READ_ON,
      citation: `licence §3(a)(1): creator, copyright notice, licence notice, disclaimer notice, URI to the material, modification indication, licence URI; API terms: "visually indicate that the Stack Exchange Network is the source" — ${DECISION}` }),
    licence: Object.freeze({ status: VERIFIED, retrievedOn: READ_ON,
      citation: `licensing page: "Content contributed on or after 2018-05-02 (UTC) is distributed under the terms of CC BY-SA 4.0" — ${DECISION}` }),
  }),
});

const DAY = (iso) => Date.parse(`${iso}T00:00:00Z`) / 1000;
/** The licensing page's dated rule — a CROSS-CHECK only, never the decision. The older of creation and last edit is compared. */
export function licenceVersionByDate(createdEpoch, editedEpoch = createdEpoch) {
  const t = Math.min(createdEpoch, editedEpoch);
  if (t < DAY("2011-04-08")) return "2.5";
  if (t < DAY("2018-05-02")) return "3.0";
  return "4.0";
}
const isEpoch = (n) => Number.isInteger(n) && n > 0;
const iso = (n) => new Date(n * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v : null);
/** A post body's text: tags dropped, the common entities decoded — what a reader of the page sees, for a quote to be checked against. */
const textOf = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** A recorded response and its recheck → one boundary retrieval. Only the mapped fields leave this function. */
export function retrievalFrom(recorded, recheck) {
  const req = recorded?.request ?? {};
  const items = [], adapterRefusals = {}, notes = {};
  const refuse = (why) => { adapterRefusals[why] = (adapterRefusals[why] ?? 0) + 1; };
  const note = (what) => { notes[what] = (notes[what] ?? 0) + 1; };
  const later = new Map((Array.isArray(recheck?.response?.items) ? recheck.response.items : []).map((p) => [p?.question_id, p]));
  const rawItems = Array.isArray(recorded?.response?.items) ? recorded.response.items : null;
  if (rawItems === null) return null;
  for (const p of rawItems) {
    if (!recheck) { refuse("CURRENCY_NOT_RECHECKED"); continue; }
    if (!isEpoch(p?.creation_date)) { refuse("POSTEDAT_ABSENT"); continue; }
    const edited = isEpoch(p.last_edit_date) ? p.last_edit_date : p.creation_date;
    const now = later.get(p.question_id);
    if (!now) { refuse("POST_DELETED_SINCE_RETRIEVAL"); continue; }
    const nowEdited = isEpoch(now?.last_edit_date) ? now.last_edit_date : now?.creation_date;
    if (now?.title !== p.title || nowEdited !== edited) { refuse("POST_CHANGED_SINCE_RETRIEVAL"); continue; }
    const title = str(p.title), link = str(p.link), creator = str(p.owner?.display_name);
    /* RR-157 · C15/C16: the ORIGINAL POST's own text, as the recheck returned it (its title and its body) — never an answer or a comment */
    const postText = str(now?.body) ? `${now.title}\n\n${textOf(now.body)}` : null;
    if (!title) { refuse("TITLE_ABSENT"); continue; }
    if (!link) { refuse("POST_LINK_ABSENT"); continue; }
    if (!creator) { refuse("CREATOR_ABSENT"); continue; }
    if (str(p.content_license) === null) { refuse("CONTENT_LICENSE_ABSENT"); continue; }
    const stated = LICENCE_VALUE.exec(p.content_license)?.[1] ?? null;
    if (stated === null) { refuse("CONTENT_LICENSE_UNRECOGNISED"); continue; }
    if (licenceVersionByDate(p.creation_date, edited) !== stated) note("LICENCE_DATE_CROSSCHECK_DISAGREES");
    items.push({
      wording: title, wordingOrigin: "SOURCE_TEXT", sourceUrl: link, postVersion: iso(edited), postedAt: iso(p.creation_date),
      licenceName: "CC BY-SA", licenceVersion: stated,
      attribution: `by ${creator} · ${link} · source: the Stack Exchange Network · ${p.content_license}${stated === "4.0" ? ` ${LICENCE_URL}` : ""} · unmodified`,
      observedAt: str(recorded.recordedAt), country: NOT_MEASURED, language: str(req.language) ?? NOT_MEASURED, originalPost: postText,
    });
  }
  /* RR-159 · F16 C22: a read of the original posts at LEAD addresses (an AI connection's or a client's) — the leads say where, never what */
  const fromLeads = Number.isInteger(req.leadAddresses) && req.leadAddresses > 0;
  const query = str(req.q) ? `full-text search for ${req.q} (a lead only; relevance is judged by the declared profile)` : str(req.tagged) ? `tagged ${req.tagged}` : str(req.intitle) ? `title contains ${req.intitle}` : fromLeads ? `the original posts at ${req.leadAddresses} lead address(es), read through this source's own reader (the leads said where, never what)` : null;
  return {
    topic: str(req.site) && query ? `${req.site} · ${query}` : null,
    coverageLimits: str(req.site) ? `one network, one site (${req.site}), its own topics and languages; ${fromLeads ? "only the posts the leads named" : "one recorded page of results"}; titles as returned under the default (HTML-safe) filter; country NOT MEASURED` : null,
    items, adapterRefusals, notes,
  };
}

/**
 * RR-159 · F16 C22 · WHICH LEAD ADDRESSES ARE THIS SOURCE'S OWN QUESTION POSTS. Only an address on the plan's one declared site, in that
 * site's own question-address form, names a post this reader may read; every other address is OUTSIDE (never read — NOT MEASURED). An
 * address only says WHERE: whether a real post exists there is decided by reading it, never by the address.
 * Limit, stated: only sites under the network's own subdomain form are recognised; any other address is outside.
 */
export function idsFromAddresses(addresses, site) {
  const host = typeof site === "string" && /^[a-z0-9-]{1,60}$/.test(site) ? `${site}.stackexchange.com` : null;
  const onSource = [], outside = [];
  for (const a of addresses ?? []) {
    let u = null;
    try { u = new URL(a); } catch { u = null; }
    const m = u && host && u.protocol === "https:" && u.hostname === host ? /^\/(?:questions|q)\/(\d{1,12})(?:\/|$)/.exec(u.pathname) : null;
    if (m) onSource.push({ address: a, id: Number(m[1]) }); else outside.push(a);
  }
  return { onSource, outside };
}
