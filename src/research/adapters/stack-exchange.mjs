/**
 * F16 · ONE CONFINED SOURCE ADAPTER — a Stack Exchange question list, from a RECORDED response only (RR-120; decision record
 * _handoffs AlmiVisibility_RR-120_STACK_EXCHANGE_DECISION_2026-10-01.md).
 *
 * 🔴 IT FETCHES NOTHING. It turns one recorded response, plus a later recorded RECHECK of the same posts, into boundary items
 * (src/research/source-adapter.mjs), which admits, refuses and keeps. No provider endpoint is called by anything in this repository.
 *
 *   WHAT IS STORED   only what F16 needs: the title as written · the post link · the post date · the post version (its last edit, else its
 *                    creation) · the creator's display name · the licence with its version · the attribution. Nothing else from a response
 *                    is copied — never a body, a score, a tag list or a whole response.
 *   LICENCE VERSION  decided per post by the dated rule on the network's licensing page (read 2026-10-01). Only the CC BY-SA 4.0 legal code
 *                    was read, so only 4.0 is declared: a 2.5 or 3.0 post is REFUSED, never defaulted to 4.0. A post whose creation and
 *                    last edit fall on different sides of a boundary is classed by the OLDER version, and so refused.
 *   CURRENCY         a post absent from the recheck is REFUSED (deleted since retrieval); a post whose title or version differs is REFUSED
 *                    (changed since retrieval). No recheck → every post is refused: currency NOT MEASURED is not currency proved.
 *   COVERAGE         one network, one site, its own topics and languages. Country is NOT MEASURED. The output never stands for more.
 *
 * ⚠️ FIELD NAMES: only `creation_date` is verified from a primary source (the method page lists it). `title`, `link`, `last_edit_date`,
 * `owner.display_name` and `question_id` are the declared shape of our recorded fixtures, NOT VERIFIED BY US against the live response;
 * live use needs that verification first (FIELD_MAP).
 */
import { SOURCE_KINDS, VERIFIED } from "../source-adapter.mjs";
import { NOT_MEASURED } from "../public-questions.mjs";

const READ_ON = "2026-10-01";
const DECISION = "_handoffs AlmiVisibility_RR-120_STACK_EXCHANGE_DECISION_2026-10-01.md";
export const LICENCE_URL = "https://creativecommons.org/licenses/by-sa/4.0/legalcode.en";
export const FIELD_MAP = Object.freeze({
  postedAt: { field: "creation_date", status: VERIFIED },
  wording: { field: "title", status: "NOT_VERIFIED_BY_US" },
  sourceUrl: { field: "link", status: "NOT_VERIFIED_BY_US" },
  lastEdit: { field: "last_edit_date", status: "NOT_VERIFIED_BY_US" },
  creator: { field: "owner.display_name", status: "NOT_VERIFIED_BY_US" },
  id: { field: "question_id", status: "NOT_VERIFIED_BY_US" },
});

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
/** The licensing page's dated rule, per post; the OLDER of creation and last edit decides, so a straddling post is never upgraded. */
export function licenceVersionOf(createdEpoch, editedEpoch = createdEpoch) {
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
  const items = [], adapterRefusals = {};
  const refuse = (why) => { adapterRefusals[why] = (adapterRefusals[why] ?? 0) + 1; };
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
    const creator = str(p.owner?.display_name), link = str(p.link);
    const version = licenceVersionOf(p.creation_date, edited);
    items.push({
      wording: str(p.title), wordingOrigin: "SOURCE_TEXT", sourceUrl: link, postVersion: iso(edited), postedAt: iso(p.creation_date),
      licenceName: "CC BY-SA", licenceVersion: version,
      attribution: creator && link ? `by ${creator} · ${link} · source: the Stack Exchange Network · CC BY-SA ${version} ${version === "4.0" ? LICENCE_URL : ""} · unmodified`.replace(/ {2,}/g, " ") : null,
      observedAt: str(recorded.recordedAt), country: NOT_MEASURED, language: str(req.language) ?? NOT_MEASURED,
    });
  }
  return {
    topic: str(req.site) && str(req.tagged) ? `${req.site} · tagged ${req.tagged}` : null,
    coverageLimits: str(req.site) ? `one network, one site (${req.site}), its own topics and languages; one recorded page of results; country NOT MEASURED` : null,
    items, adapterRefusals,
  };
}
