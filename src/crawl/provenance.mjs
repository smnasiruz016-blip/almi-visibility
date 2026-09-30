/**
 * 🔴 RR-104 — FOUR KINDS OF OBSERVATION, EACH WITH ITS OWN PROVENANCE, AND FOUR NAMING RULES THAT KEEP THEM APART.
 *
 *   RAW_HTML                  the served bytes of one request (the crawl observation itself, unchanged in shape since v0.1)
 *   RESPONSE_HEADERS          the allowlisted response headers of that request (record_type "response_headers")
 *   PAGE_DECLARED_DATE_CLAIM  a date the page's own raw HTML CLAIMS (record_type "publication_date_claims") — a claim, never a fact
 *   RENDERED                  a page as a browser rendered it (the separate render store) — never produced by the crawler
 * Links read from the raw HTML (record_type "page_links") carry RAW_HTML provenance and name the observation they came from.
 *
 * Each new record is its OWN measurement (its own measurement_key), linked to the raw-HTML observation by `source_observation_id`, so the
 * crawl observation keeps exactly the key and shape it has always had and a replay of stored bytes stays a re-sighting.
 *
 * THE FOUR NAMING RULES (each read through a function below; each proved by a firing control in test/rr104-collector-evidence.test.mjs):
 *   1. Last-Modified is NOT a first-publication date — publicationDateOf never reads it.
 *   2. A raw-HTML observation is NOT a rendered or operated page — renderStateOf says RAW_HTML for it, always.
 *   3. An external link that was never fetched is NOT known to work — linkTargetState says NOT_FETCHED.
 *   4. A field missing from an OLD record stays NOT MEASURED — recordedHeader and linkDetailOf never default or backfill.
 * Pure; names no product; writes nothing.
 */
import { sha256Hex } from "../evidence/ids.mjs";
import { HEADER_SUBSET } from "./fetcher.mjs";

export const PROVENANCE = Object.freeze({ RAW_HTML: "RAW_HTML", RESPONSE_HEADERS: "RESPONSE_HEADERS", PAGE_DECLARED_DATE_CLAIM: "PAGE_DECLARED_DATE_CLAIM", RENDERED: "RENDERED" });
export const EVIDENCE_TYPES = Object.freeze({ HEADERS: "response_headers", LINKS: "page_links", DATE_CLAIMS: "publication_date_claims" });
export const NOT_MEASURED = "NOT_MEASURED";
export const MAX_DATE_CLAIMS = 20;
export const MAX_DATE_VALUE = 64;

/** One evidence record linked to its raw-HTML observation. Its measurement_key has no clock: the same evidence read twice is one record. */
export function evidenceRecord({ recordType, provenance, source, value, collector, collectorVersion }) {
  if (!Object.values(EVIDENCE_TYPES).includes(recordType)) throw new TypeError(`evidenceRecord: unknown record type ${recordType}`);
  if (!Object.values(PROVENANCE).includes(provenance) || provenance === PROVENANCE.RENDERED) throw new TypeError(`evidenceRecord: the crawler cannot record provenance ${provenance}`);
  const target = source.target;
  const measurement_key = sha256Hex(JSON.stringify([recordType, `${target.kind}:${target.ref}`, source.content_sha256, value]));
  return Object.freeze({
    record_type: recordType,
    evidence_id: sha256Hex(`${measurement_key}|${source.observed_at}`).slice(0, 32),
    measurement_key,
    observed_at: source.observed_at,
    source_observation_id: source.observation_id,
    target,
    provenance,
    collector,
    collector_version: collectorVersion,
    value,
  });
}

/* ---- dates a page CLAIMS in its raw HTML ------------------------------------------------------------------------------------ */
const META_DATES = Object.freeze({ "article:published_time": "PUBLISHED", "article:modified_time": "MODIFIED", "datepublished": "PUBLISHED", "datemodified": "MODIFIED", "datecreated": "CREATED" });
const JSONLD_DATES = Object.freeze({ datePublished: "PUBLISHED", dateModified: "MODIFIED", dateCreated: "CREATED" });

/** Every date the raw HTML claims, labelled by what it claims to be; a <time> element's date is UNLABELLED. Bounded. Never a header. */
export function dateClaimsIn(html) {
  const s = String(html ?? "");
  const claims = [];
  const add = (source, claimKind, value) => { if (typeof value === "string" && value.trim() !== "") claims.push({ source, claimKind, value: value.trim().slice(0, MAX_DATE_VALUE) }); };
  for (const m of s.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(m[0])?.[1] ?? "").toLowerCase();
    if (META_DATES[key]) add(`meta:${key}`, META_DATES[key], /\bcontent\s*=\s*["']([^"']*)["']/i.exec(m[0])?.[1]);
  }
  for (const m of s.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const [k, kind] of Object.entries(JSONLD_DATES)) for (const d of m[1].matchAll(new RegExp(`"${k}"\\s*:\\s*"([^"]*)"`, "g"))) add(`jsonld:${k}`, kind, d[1]);
  }
  for (const m of s.matchAll(/<time\b[^>]*\bdatetime\s*=\s*["']([^"']*)["']/gi)) add("time[datetime]", "UNLABELLED", m[1]);
  return { claims: claims.slice(0, MAX_DATE_CLAIMS), claimsSeen: claims.length, claimsTruncated: claims.length > MAX_DATE_CLAIMS };
}

/* ---- the four naming rules, as readers ---------------------------------------------------------------------------------------- */

/** RULE 1. The dates a page CLAIMS to have been published — from its date-claims record only. Last-Modified is never read here. */
export function publicationDateOf(dateClaimsRecord) {
  if (!dateClaimsRecord) return { state: NOT_MEASURED, fact: "no date-claims record for this page — a Last-Modified header is not a publication date" };
  const published = (dateClaimsRecord.value?.claims ?? []).filter((c) => c.claimKind === "PUBLISHED");
  if (published.length === 0) return { state: NOT_MEASURED, fact: "the page's raw HTML claims no publication date — a Last-Modified header is not one" };
  return { state: "PAGE_CLAIM", claims: published, authoritative: false, note: "what the page claims, not an authoritative first-publication date" };
}

/** RULE 2. How a record saw its page. Only a RENDERED record is a rendered page; a raw-HTML observation never is. */
export function renderStateOf(record) {
  if (record?.provenance === PROVENANCE.RENDERED || record?.value?.renderMode === "RENDERED") return PROVENANCE.RENDERED;
  if (record?.record_type === "observation" && record?.value?.renderMode === "RAW_HTML") return "RAW_HTML — not rendered, not operated";
  return NOT_MEASURED;
}

/** RULE 3. What is known about a link's target: only a target this run FETCHED has a status; any other is NOT_FETCHED, never "working". */
export function linkTargetState(link, fetchedStatusByUrl) {
  if (fetchedStatusByUrl.has(link.to)) return { state: "FETCHED_IN_THIS_RUN", status: fetchedStatusByUrl.get(link.to) };
  return { state: "NOT_FETCHED", status: null, fact: "the target was never fetched — whether it works is not known" };
}

/** Which headers a record's collector recorded. v0.1 crawl observations: the five-name v0.1 set. v0.2 header records: what they name. */
const collectedHeaders = (record) => {
  if (record?.record_type === EVIDENCE_TYPES.HEADERS) return Array.isArray(record.value?.collected) ? record.value.collected : null;
  if (record?.record_type === "observation" && record.collector === "src/crawl/crawler.mjs" && ["0.1", "0.2"].includes(record.collector_version)) return HEADER_SUBSET;
  return null;
};

/** RULE 4. A recorded header: its value, ABSENT when its collector recorded that header and the response had none, else NOT MEASURED. */
export function recordedHeader(record, name) {
  const collected = collectedHeaders(record);
  const h = String(name).toLowerCase();
  if (!collected || !collected.includes(h)) return { state: NOT_MEASURED, fact: `the record's collector did not record ${h}` };
  const bag = record.record_type === EVIDENCE_TYPES.HEADERS ? record.value.headers : record.value.response_headers_subset;
  return Object.hasOwn(bag ?? {}, h) ? { state: "RECORDED", value: bag[h] } : { state: "ABSENT" };
}

/** RULE 4, for links: a detail an old link record never carried is NOT MEASURED — never "", never inferred. */
export function linkDetailOf(link, field) {
  if (!Object.hasOwn(link ?? {}, field)) return { state: NOT_MEASURED, fact: `this link record carries no ${field}` };
  return { state: "RECORDED", value: link[field] };
}
