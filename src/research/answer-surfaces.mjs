/**
 * 🔴 F16 C7 · F63 · ANSWER SURFACES SEEN THROUGH THE ENGINE'S OWN BROWSER ROUTE (RR-291, owner decision 2 of 19 Oct 2026: "a feature can be
 * tested on ANY site"; Google searches at most 20, at least 20 s apart, a fresh profile, STOP and record BLOCKED at any captcha or unusual-
 * traffic page; public AI answer pages that need NO login at most 20 questions, STOP at any login wall or bot check; nothing posted).
 *
 * Pure: the queries a subject's own declaration forms, the address each is read at, and what one read of a result page or an AI answer page
 * SHOWED — as counts, domains, features and addresses only. No text of a result page or of an AI answer is ever kept (F16 C19): a record holds
 * the domains in the order they were shown, the result features seen, and the addresses an AI answer named, each an UNVERIFIED LEAD.
 *
 * Generic: it names no client, product, host of a client, or provider plan.
 */
import { createHash } from "node:crypto";
import { formResearchQueries, addressesIn } from "./ai-connection.mjs";

export const SURFACE = Object.freeze({ WEB_SEARCH: "WEB_SEARCH", AI_ANSWER: "AI_ANSWER" });
export const OBS = Object.freeze({ OBSERVED: "OBSERVED", BLOCKED: "BLOCKED" });
export const RECORD_TYPE = "answer_surface_observation";
/** The owner's bounds (RR-291 decision 2) — the code refuses a plan past them. */
export const BOUNDS = Object.freeze({ webSearches: 20, aiQuestions: 20, gapMs: 20_000 });
/**
 * The surfaces come from the subject's OWN declaration (answer-surfaces.json `surfaces`): each an id, a kind and the address one question is
 * opened at ("{q}" is the question) — nothing is typed or clicked. The engine names no host; a surface not declared does not exist.
 */
export function surfacesOf(declared) {
  const out = {};
  for (const [id, s] of Object.entries(declared?.surfaces ?? {})) {
    if (!Object.values(SURFACE).includes(s?.kind) || typeof s?.at !== "string" || !/^https:\/\/[^/{}]+\/[^\s]*\{q\}/.test(s.at)) throw new TypeError(`surface ${id}: a kind (${Object.values(SURFACE).join(" or ")}) and an https address holding {q}`);
    out[id] = Object.freeze({ kind: s.kind, at: (q) => s.at.replace("{q}", encodeURIComponent(q)) });
  }
  return Object.freeze(out);
}
const h16 = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
const present = (v) => typeof v === "string" && v.trim() !== "";
const own = (v) => String(v).replace(/\s*\([^()]*\)\s*$/, "").trim();

/**
 * The web-search queries a subject's own declaration forms: its declared topic with each declared service ("<topic> <service>"), and with each
 * declared location ("<topic> centre <location>", "<topic> preparation <location>"). Nothing is added, renamed or invented; a missing part is named.
 */
export function formSurfaceQueries({ descriptor, surfaces }) {
  const topic = surfaces?.topic, services = descriptor?.productDimensions?.services, locations = surfaces?.locations;
  const missing = [];
  if (!present(topic)) missing.push("the subject's declared search topic (answer-surfaces.json topic)");
  if (!Array.isArray(services) || !services.every(present)) missing.push("the subject's declared service dimensions (productDimensions.services)");
  if (!Array.isArray(locations) || !locations.every(present)) missing.push("the subject's declared locations (answer-surfaces.json locations)");
  if (missing.length) return { topical: [], local: [], missing };
  const q = (text, extra = {}) => Object.freeze({ queryId: h16(["surface-query", text]), text, ...extra });
  const topical = services.map((s) => q(`${own(topic)} ${own(s).replace(/-/g, " ")}`, { service: s }));
  const local = locations.flatMap((l) => [q(`${own(topic)} centre ${own(l)}`, { location: l }), q(`${own(topic)} preparation ${own(l)}`, { location: l })]);
  return { topical, local, missing: [] };
}

/** The AI questions are the ones F16 C20 forms from the same declaration (src/research/ai-connection.mjs formResearchQueries) — never hand-written. */
export const formAiQuestions = (descriptor) => formResearchQueries(descriptor);

/** A plan within the owner's bounds, or its refusals. */
export function planRefusals({ web = [], ai = [] }) {
  const r = [];
  if (web.length > BOUNDS.webSearches) r.push(`WEB_SEARCHES_OVER_THE_OWNERS_BOUND (${web.length} > ${BOUNDS.webSearches})`);
  if (ai.length > BOUNDS.aiQuestions) r.push(`AI_QUESTIONS_OVER_THE_OWNERS_BOUND (${ai.length} > ${BOUNDS.aiQuestions})`);
  return r;
}

const HOSTISH = /\b((?:[a-z0-9-]+\.)+[a-z]{2,})(?=\s*(?:›|\/|$))/gim;
const URLISH = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;
/** The result features a web-search page shows, by their own visible headings — declared words, never a score. */
export const FEATURE_MARKS = Object.freeze({
  AI_OVERVIEW: /\bAI Overview\b/, QUESTIONS_PEOPLE_ASK: /\bPeople also ask\b/, MAP_PACK: /\b(Places|Businesses|Map data ©)/,
  VIDEOS: /^\s*Videos\s*$/m, IMAGES: /^\s*Images\s*$/m, NEWS: /\bTop stories\b/, FORUMS: /\b(Discussions and forums|Perspectives)\b/, ADS: /\b(Sponsored|Sponsored results?)\b/,
});
/** The answer formats those features carry (F16 C7's census part "answer formats"). */
const FORMAT_OF = Object.freeze({ AI_OVERVIEW: "GENERATED_SUMMARY", QUESTIONS_PEOPLE_ASK: "QUESTION_LIST", MAP_PACK: "LOCAL_LISTING", VIDEOS: "VIDEO", IMAGES: "IMAGE", NEWS: "NEWS_CARD", FORUMS: "FORUM_THREAD", ADS: "PAID_LISTING" });

/** What one web-search result page showed: the result domains in the order shown, the features, the formats. The text is not kept. */
export function webSearchSeen(text, { surfaceHost = null } = {}) {
  /* the surface's own domain (its last two labels) is the page itself, not a result */
  const self = surfaceHost ? String(surfaceHost).toLowerCase().split(".").slice(-2).join(".") : null;
  const t = String(text ?? "");
  const domains = [];
  for (const re of [URLISH, HOSTISH]) for (const m of t.matchAll(re)) {
    const d = m[1].toLowerCase().replace(/^www\./, "");
    if (self && (d === self || d.endsWith(`.${self}`))) continue;
    if (!domains.includes(d)) domains.push(d);
  }
  /* the order a domain was first shown in decides its position — a URL match and a breadcrumb host of one result are the same result */
  const order = domains.map((d) => ({ d, at: t.toLowerCase().indexOf(d) })).sort((a, b) => a.at - b.at).map((x) => x.d);
  const features = Object.entries(FEATURE_MARKS).filter(([, re]) => re.test(t)).map(([k]) => k);
  return Object.freeze({ results: Object.freeze(order.map((d, i) => Object.freeze({ position: i + 1, domain: d }))), features: Object.freeze(features), formats: Object.freeze([...new Set(features.map((f) => FORMAT_OF[f]))]) });
}

/** F63 · the client's own position among the result domains shown, or NOT_IN_THE_RESULTS_SHOWN (a bound, never a rank of 0). */
export function ownPosition(results, ownDomains) {
  const mine = new Set((ownDomains ?? []).map((d) => String(d).toLowerCase().replace(/^www\./, "")));
  const hit = (results ?? []).find((r) => mine.has(r.domain) || [...mine].some((m) => r.domain.endsWith(`.${m}`)));
  return hit ? { state: "RANKED", position: hit.position, of: results.length } : { state: "NOT_IN_THE_RESULTS_SHOWN", of: (results ?? []).length };
}

/** What one AI answer page showed: ONLY the addresses it named (C19), each an UNVERIFIED LEAD; at most `cap`. Its prose is dropped here. */
export function aiAnswerSeen(text, { cap = 25, surfaceHost } = {}) {
  const addresses = addressesIn(String(text ?? ""), cap * 2).filter((a) => { try { return new URL(a).hostname !== surfaceHost; } catch { return false; } }).slice(0, cap);
  return Object.freeze({ leads: Object.freeze(addresses.map((address) => Object.freeze({ address, state: "UNVERIFIED_LEAD" }))) });
}

/**
 * One observation record — what was asked, where, when, by which run, and what it showed or why it was BLOCKED. No text field exists.
 * A rank record (F63 C1) carries its declared location, surface, date and query; one without a location is refused by the caller.
 */
export function observationRecord({ surfaces, tenantId, subject, surfaceId, query, on, at, run, read, seen = null, location = null, own = null }) {
  const SURFACES = surfaces ?? {};
  if (!SURFACES[surfaceId]) throw new TypeError(`no such surface: ${surfaceId}`);
  if (!present(on) || !present(at) || !present(run) || !present(query?.text)) throw new TypeError("an observation carries its query, day, time and run");
  const blocked = read?.state !== "READ";
  const observationId = h16([subject, surfaceId, query.queryId, at]);
  return Object.freeze({
    record_type: RECORD_TYPE,
    /* the store's own key (src/evidence/store.mjs): one observation, kept once */
    measurement_key: `${RECORD_TYPE}:${observationId}`,
    observation_id: observationId,
    tenantId, subject, surface: SURFACES[surfaceId].kind, surfaceId, queryId: query.queryId, query: query.text,
    ...(location ? { location } : {}),
    on, recorded_at: at, run, route: "ENGINE_BROWSER_ROUTE",
    state: blocked ? OBS.BLOCKED : OBS.OBSERVED,
    ...(blocked ? { reason: read?.reason ?? "NOT_READ", detail: String(read?.detail ?? "").slice(0, 300) } : {}),
    ...(blocked || !seen ? {} : seen),
    ...(own ? { own } : {}),
  });
}

/** F16 C7 · the census over the observations: each part with its denominator; an empty population is COULD-NOT-PROVE, never PROVED. */
export function surfaceCensus(records) {
  const obs = records.filter((r) => r.state === OBS.OBSERVED && r.surface === SURFACE.WEB_SEARCH);
  const blocked = records.filter((r) => r.state === OBS.BLOCKED);
  const n = obs.length;
  const count = (f) => obs.reduce((m, r) => { for (const k of f(r)) m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const verdict = n === 0 ? "COULD-NOT-PROVE" : "PROVED";
  return Object.freeze({
    verdict, denominator: n, blocked: blocked.length,
    blockedBy: blocked.reduce((m, r) => ((m[r.reason] = (m[r.reason] ?? 0) + 1), m), {}),
    resultTypes: count((r) => r.formats ?? []), features: count((r) => r.features ?? []),
    competitors: count((r) => (r.results ?? []).filter((x) => !(r.own?.domains ?? []).includes(x.domain)).map((x) => x.domain)),
    /* a result page's visible text does not mark which domains a generated summary cites — so on a web search it is NOT MEASURED, named;
     * on an AI answer page the cited sources are the addresses it named (UNVERIFIED LEADS), counted by host */
    citedSources: Object.freeze({
      webSearch: "NOT MEASURED — the result page's visible text does not mark which domains a generated summary cites",
      aiAnswers: records.filter((r) => r.state === OBS.OBSERVED && r.surface === SURFACE.AI_ANSWER).length,
      aiLeadsByHost: records.filter((r) => r.state === OBS.OBSERVED && r.surface === SURFACE.AI_ANSWER).reduce((m, r) => { for (const l of r.leads ?? []) { let h = "?"; try { h = new URL(l.address).hostname.replace(/^www\./, ""); } catch { /* not a URL */ } m[h] = (m[h] ?? 0) + 1; } return m; }, {}),
    }),
  });
}
