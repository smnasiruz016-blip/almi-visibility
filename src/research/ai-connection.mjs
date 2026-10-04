/**
 * F16 · C17–C23 · THE CLIENT'S OWN AI CONNECTION — PROVIDER-NEUTRAL (Acceptance Amendment 3, _handoffs 1e48cb8; RR-159).
 *
 *   CONNECTION   the client connects its OWN AI provider account — a connector the subject declares (kind AI_PROVIDER), with the client's
 *                own credential named, never held — and may DISCONNECT at any time. Both are appended events (`ai_connection_event`) in
 *                the research batch's own store; the latest one decides. A run checks it before every provider call and every source read.
 *   OWNER RECORD the engine reaches a provider only while a CURRENT, OWNER-issued governance record carries, for that provider, the block
 *                    OWNER PROVIDER RECORD v1 / provider: <id> / origin: <its API origin> / capability: <capability> /
 *                    cites: <that provider's own terms or docs> / read on: <YYYY-MM-DD> / END OWNER PROVIDER RECORD
 *                with the capability LEAD_DISCOVERY_BY_API. UNKNOWN or NOT_PERMITTED permits nothing. A plan's or a subscription's NAME is
 *                never read as a capability: nothing here looks at one.
 *   THE QUERY    formed HERE from the subject's own declaration — its field, its declared service dimensions, its audience context. Origin
 *                country reaches the wording only through those declared words; it never splits a question or creates a page.
 *   WHERE ONLY   a provider's output yields ADDRESSES and nothing else: every other byte it returns — an answer, a summary, a snippet, a
 *                title — is dropped here, never stored. Each address is an UNVERIFIED LEAD until the engine reads a real original post
 *                there through an approved source's own reader (C22); one that does not resolve is a DEAD LEAD, never demand.
 *   TWO ROUTES   the AI connection, or links the client supplies by hand, or both — neither required. With neither, discovery is ABSENT:
 *                a state, never zero demand and never an error.
 * Pure: records and declarations in, decisions and records out. It holds no transport and names no provider, plan tier or host.
 */
import { createHash } from "node:crypto";
import { resolve } from "../authority/register.mjs";
import { makeCostEntry } from "../cost/ledger.mjs";
import { LEAD_RECORD } from "./lead-intake.mjs";

export const AI_CONNECTOR_KIND = "AI_PROVIDER";
export const CONNECTION_EVENT = "ai_connection_event";
export const CONNECTION = Object.freeze({ CONNECTED: "CONNECTED", DISCONNECTED: "DISCONNECTED", NEVER_CONNECTED: "NEVER_CONNECTED" });
export const PROVIDER_CAPABILITY = "LEAD_DISCOVERY_BY_API";
export const LEAD_KINDS = Object.freeze({ AI: "AI_LEAD", SUPPLIED: "CLIENT_SUPPLIED_LEAD" });
export const RESOLUTION = Object.freeze({
  READ: "READ",
  DEAD: "DEAD_LEAD",
  NOT_READ: "NOT_READ_OUTSIDE_EVERY_APPROVED_SOURCE",
  LEFT_UNREAD: "LEFT_UNREAD_THE_RUN_STOPPED",
});
export const RESOLUTION_MEANING = Object.freeze({
  READ: "a real original post was read at this address through the approved source's own reader",
  DEAD_LEAD: "no readable original post exists at this address on the approved source — not an error, not a question, never demand",
  NOT_READ_OUTSIDE_EVERY_APPROVED_SOURCE: "the address is on no source whose decision is VALID, so it was not read — NOT MEASURED",
  LEFT_UNREAD_THE_RUN_STOPPED: "the run stopped before reading it — NOT MEASURED",
});
export const DISCOVERY = Object.freeze({ AI: "AI_CONNECTION", LINKS: "CLIENT_LINKS", BOTH: "AI_CONNECTION_AND_CLIENT_LINKS", ABSENT: "ABSENT" });
export const ABSENT_MEANING = "discovery ABSENT — the client has no AI connection and supplied no links; NOT MEASURED, never zero demand, and every other part of the product runs unchanged";
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 32);

/** One connect or disconnect, by the client — it names the connector, never a credential. */
/**
 * One connect or disconnect, by the client. `seq` is how many events this connector already has: two events in the same second (a
 * reconnect right after a disconnect) are two events, never one deduplicated away — found by CI (RR-159), where it ran fast enough to happen.
 */
export function connectionEvent({ subject, connectorId, event, at, by, seq }) {
  if (![CONNECTION.CONNECTED, CONNECTION.DISCONNECTED].includes(event)) throw new TypeError("an AI connection event is CONNECTED or DISCONNECTED");
  if (!present(subject) || !present(connectorId) || !present(by) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(at ?? "")) throw new TypeError("an AI connection event names its subject, connector, who and when");
  if (!Number.isInteger(seq) || seq < 0) throw new TypeError("an AI connection event carries its sequence number for its connector");
  const id = hash([subject, connectorId, event, at, by, seq]);
  return Object.freeze({ record_type: CONNECTION_EVENT, event_id: id, measurement_key: `${CONNECTION_EVENT}:${id}`, recorded_at: at,
    value: Object.freeze({ subject, connectorId, event, by, seq }) });
}

/** The connection's state now: the LATEST event for this connector decides; none at all is NEVER_CONNECTED. */
export function connectionNow(rows = [], { subject, connectorId }) {
  const mine = rows.filter((r) => r?.record_type === CONNECTION_EVENT && r.value?.subject === subject && r.value?.connectorId === connectorId);
  return mine.length ? mine.at(-1).value.event : CONNECTION.NEVER_CONNECTED;
}

/** Every OWNER PROVIDER RECORD block in a record's committed text. A malformed block is no record at all. */
export function declaredProviderRecords(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n").map((l) => l.trim());
  const out = [];
  const field = (l, k) => (l?.startsWith(`${k}: `) ? l.slice(k.length + 2).trim() : null);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== "OWNER PROVIDER RECORD v1") continue;
    const b = { provider: field(lines[i + 1], "provider"), origin: field(lines[i + 2], "origin"), capability: field(lines[i + 3], "capability"), cites: field(lines[i + 4], "cites"), readOn: field(lines[i + 5], "read on") };
    if (lines[i + 6] === "END OWNER PROVIDER RECORD" && present(b.provider)) out.push(Object.freeze(b));
  }
  return out;
}

/**
 * C17 · may the engine reach THIS provider, at THIS origin? Only under a CURRENT, owner-issued record whose verified text declares the
 * provider's permitted capability, cites its own terms or docs and states the date they were read. Every failure is named.
 */
export function providerRecordRefusals({ records, propositionId, textOf, now, providerId, origin }) {
  if (!present(propositionId)) return ["PROVIDER_RECORD_UNNAMED"];
  const res = resolve({ records, propositionId, scope: ["ALMIVISIBILITY"], now });
  if (res.outcome === "ABSENT") return ["PROVIDER_RECORD_ABSENT"];
  if (res.outcome !== "CURRENT") return ["PROVIDER_RECORD_NOT_CURRENT"];
  const r = [];
  const recs = res.authority.authorityIds.map((id) => (records ?? []).find((x) => x.authorityId === id));
  if (recs.some((x) => x?.issuer?.class !== "OWNER")) r.push("PROVIDER_RECORD_NOT_OWNER_ISSUED");
  const texts = recs.map((x) => (x ? textOf(x) : null));
  if (texts.some((t) => t === null)) return [...r, "PROVIDER_RECORD_TEXT_NOT_VERIFIED"];
  const blocks = texts.flatMap(declaredProviderRecords);
  const mine = blocks.filter((b) => b.provider === providerId);
  if (blocks.length === 0) return [...r, "PROVIDER_RECORD_DECLARES_NO_PROVIDER"];
  if (mine.length === 0) return [...r, "PROVIDER_RECORD_NAMES_ANOTHER_PROVIDER"];
  if (mine.length > 1) return [...r, "PROVIDER_RECORD_AMBIGUOUS"];
  const b = mine[0];
  if (!present(b.cites)) r.push("PROVIDER_RECORD_CITES_NO_TERMS");
  if (!DAY.test(b.readOn ?? "")) r.push("PROVIDER_RECORD_STATES_NO_READ_DATE");
  else if (b.readOn > now) r.push("PROVIDER_RECORD_READ_DATE_IN_THE_FUTURE");
  if (b.capability !== PROVIDER_CAPABILITY) r.push("PROVIDER_CAPABILITY_NOT_PERMITTED");
  if (b.origin !== origin) r.push("PROVIDER_ORIGIN_IS_NOT_THE_RECORDS");
  return r;
}

/**
 * C20 · THE PRODUCT ASKS: the research queries a subject's own declaration forms — one for its declared field, and one per declared service
 * dimension value — each with its declared audience context. Nothing is added, renamed or invented; a missing part is named.
 */
export function formResearchQueries(descriptor) {
  const field = descriptor?.ownerValues?.product ?? descriptor?.ownerValues?.business ?? null;
  const audience = descriptor?.ownerValues?.audience ?? null;
  const services = descriptor?.productDimensions?.services;
  const missing = [];
  if (!present(field)) missing.push("the subject's declared field (ownerValues.product or ownerValues.business)");
  if (!present(audience)) missing.push("the subject's declared audience context (ownerValues.audience)");
  if (!Array.isArray(services) || services.length === 0 || !services.every(present)) missing.push("the subject's declared service dimensions (productDimensions.services)");
  if (missing.length) return { queries: [], missing };
  /* a declared value's TRAILING parenthetical is its provenance note (who declared it, where it is recorded) — never sent to anyone */
  const own = (v) => v.replace(/\s*\([^()]*\)\s*$/, "").trim();
  const ask = (service) => `Where on the public web do people ask their own questions in this field? Field: ${own(field)}.${service ? ` Service: ${own(service)}.` : ""} Audience: ${own(audience)}. Return only the web addresses of original question posts, one per line.`;
  const queries = [ask(null), ...services.map((s) => ask(s))];
  return { queries: Object.freeze(queries.map((text) => Object.freeze({ queryId: hash(["query", text]).slice(0, 16), text }))), missing: [] };
}

/** A plan may ask only queries its subject's declaration forms — a hand-written query is refused. */
export function queryRefusals(planQueries, formed) {
  if (!Array.isArray(planQueries) || planQueries.length === 0) return ["PLAN_ASKS_NO_QUERY"];
  const known = new Set(formed.map((q) => q.text));
  const r = [];
  if (planQueries.some((q) => !known.has(q))) r.push("QUERY_NOT_FORMED_BY_THE_SUBJECTS_DECLARATION");
  if (new Set(planQueries).size !== planQueries.length) r.push("QUERY_REPEATED");
  return r;
}

const URL_IN_TEXT = /https?:\/\/[^\s"'<>()[\]{}]+/g;
/**
 * C19 · WHERE, AND NOTHING ELSE: the http(s) addresses a provider's output names, in order, unique, at most `cap`. Every other byte of the
 * output — its prose, any title or summary — is dropped here and never returned.
 */
export function addressesIn(output, cap) {
  const found = [];
  const walk = (v, depth) => {
    if (depth > 8 || found.length >= cap) return;
    if (typeof v === "string") { for (const m of v.match(URL_IN_TEXT) ?? []) add(m.replace(/[.,;:!?]+$/, "")); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return; }
    if (v && typeof v === "object") for (const x of Object.values(v)) walk(x, depth + 1);
  };
  const add = (s) => {
    if (found.length >= cap) return;
    let u;
    try { u = new URL(s); } catch { return; }
    if (u.protocol !== "https:" && u.protocol !== "http:") return;
    u.hash = "";
    const a = u.toString();
    if (!found.includes(a)) found.push(a);
  };
  walk(output, 0);
  return found;
}

/** C23 · which discovery route this client has — or ABSENT, which is a state and never zero. */
export function discoveryRouteOf({ aiConnection, suppliedLinks }) {
  const ai = aiConnection === true, links = Array.isArray(suppliedLinks) && suppliedLinks.length > 0;
  return ai && links ? DISCOVERY.BOTH : ai ? DISCOVERY.AI : links ? DISCOVERY.LINKS : DISCOVERY.ABSENT;
}

/** C21/C22 · one lead — an ADDRESS, how it was found and what reading it showed. No provider text: there is no field for any. */
export function leadRecord({ subject, planId, kind, address, queryId = null, providerId = null, resolution, at }) {
  if (!Object.values(LEAD_KINDS).includes(kind)) throw new TypeError("a discovery lead is an AI_LEAD or a CLIENT_SUPPLIED_LEAD");
  if (!Object.values(RESOLUTION).includes(resolution)) throw new TypeError("a discovery lead carries its resolution");
  if (kind === LEAD_KINDS.AI && !present(providerId)) throw new TypeError("an AI lead names the client's provider that pointed to it");
  const id = hash([subject, planId, kind, address]);
  /* where the ADDRESS came from — the client's own AI connection, or the client's own hand; never what the address holds */
  const sourceId = kind === LEAD_KINDS.AI ? `client-ai-connection:${providerId}` : "client-supplied-link";
  return Object.freeze({
    record_type: LEAD_RECORD, kind, lead_id: id, measurement_key: `${LEAD_RECORD}:${id}`, subject, plan_id: planId, query_id: queryId, sourceId,
    reference: address, recorded_at: at, resolution, meaning: RESOLUTION_MEANING[resolution],
    status: "UNVERIFIED LEAD — an address only; never an observed question and never demand until a real original post read there is admitted",
  });
}

/** C24 · the ledger entry for one provider call that WAS made: counted against the plan's cap; its money as the plan prices it, or UNKNOWN. */
export function providerCallEntry({ at, seq, provider, tenantId, cap, callsSoFar, pricePerCall = null, fake = false, priceMeasured = false, usage = null, errored = null }) {
  /* RR-161 · C26: an amount is MEASURED only where the provider's own price per call is measured — the plan's declared per-call charge bounds
   * the hard budget, it is never reported as what the call cost */
  const priced = priceMeasured === true && pricePerCall && typeof pricePerCall.amount === "number" && present(pricePerCall.currency);
  const entry = makeCostEntry({
    entry_id: `ai-provider-call:${provider}:${at}:${seq}`,
    run_kind: "paid-provider-call",
    run_ref: `the client's own AI connection — ${provider}${fake ? " (FAKE provider — a test double; no account exists)" : ""}`,
    run_started_at: at, recorded_at: at,
    money: priced
      ? { amountState: "MEASURED", amount: pricePerCall.amount, currency: pricePerCall.currency, basis: "the price per call the run's provider declares — charged to the client's own account" }
      : { amountState: "UNKNOWN", amount: null, unknownKind: "NOT_MEASURABLE_WITH_TOOLS_WE_HOLD", unknownReason: `the provider's full price per call is NOT MEASURED (its token cost was not read); the hard budget was charged the plan's declared ${pricePerCall?.amount ?? "?"} ${pricePerCall?.currency ?? ""} per call, which is a bound, not a cost` },
    providerCalls: { state: "MEASURED", total: 1, perProvider: { [provider]: 1 } },
    budget: { kind: "paid-provider", used: { callsIssuedBefore: callsSoFar, attempted: 1 }, bounds: { maxCalls: cap }, capReached: callsSoFar + 1 >= cap },
    founderTime: { state: "MEASURED", seconds: 0, zeroBasis: "an automated call inside a run; no founder time is spent on it" },
  });
  return Object.freeze({ ...entry, outcome: errored ? "CALLED_ERROR" : "CALLED", ...(errored ? { error: Object.freeze({ code: errored }) } : {}),
    usage: Object.freeze({ ...(usage ?? {}) }), usageMeasurement: usage && Object.keys(usage).length ? "MEASURED — counts as the provider reported them" : "NOT MEASURED — the provider reported none",
    scope: Object.freeze({ tenantId: tenantId ?? null }) });
}
