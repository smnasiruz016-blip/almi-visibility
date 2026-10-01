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
      observedAt: str(recorded.recordedAt), country: NOT_MEASURED, language: str(req.language) ?? NOT_MEASURED,
    });
  }
  const query = str(req.tagged) ? `tagged ${req.tagged}` : str(req.intitle) ? `title contains ${req.intitle}` : null;
  return {
    topic: str(req.site) && query ? `${req.site} · ${query}` : null,
    coverageLimits: str(req.site) ? `one network, one site (${req.site}), its own topics and languages; one recorded page of results; titles as returned under the default (HTML-safe) filter; country NOT MEASURED` : null,
    items, adapterRefusals, notes,
  };
}
