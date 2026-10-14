/**
 * 🔴 F03 · OPENING A CONNECTOR — THE ONE PLACE PRODUCTION CODE REACHES AN EXTERNAL SOURCE.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F03_FROZEN_ACCEPTANCE_2026-09-25.md (f9d1888, contract 4a65924a…).
 *
 * An entry point that talks to anything outside this machine does it through a connector it OPENS here, and it opens one
 * only with the run's genuine, allowed decision for that exact connector (src/tenancy/scoped-run.mjs RESOURCES.connector,
 * decided at the top of the entry point by src/governance/scoped-entry.mjs — before anything is read or constructed).
 * No decision, no connector: a refusal is thrown, carrying a reason code and nothing else.
 *
 * 🔴 THIS MODULE IS THE ONLY PRODUCTION MODULE THAT TOUCHES THE GLOBAL \`fetch\`. Library code takes a \`fetchImpl\` it is
 * handed and has no default; tools/root-connector-census.mjs counts every other touch as a BYPASS.
 *
 * 🔴 A CREDENTIAL IS A NAME. An opened connector carries the NAME of the environment variable its declaration names
 * (\`credentialName\`), never the variable's value: the caller that constructs the provider reads that one variable itself,
 * at construction, and passes it straight in. Nothing here reads, holds, derives, hashes, measures or prints a value.
 *
 * Generic: this file names no subject, host, provider account or credential.
 */
import { isGenuineDecision, refDigest } from "./scope.mjs";
import { lookupConnector } from "./root-registry.mjs";
import { createTenantResolver } from "./resolver.mjs";
import { isGenuineAuthorisation, authorisationRefDigest } from "../governance/authorisation.mjs";

/** A connector refusal: a reason code; no host, path, payload or value. */
export class ConnectorRefused extends Error {
  constructor(code) { super(`CONNECTOR_REFUSED: ${code}`); this.name = "ConnectorRefused"; this.code = code; }
}

/**
 * The fetch a DRY run is handed where a library insists on one: every request it is asked for is refused. A dry run opens
 * no connector, so it needs no connector decision — and can reach nothing.
 */
export const NO_REQUEST_FETCH = Object.freeze(async () => { throw new ConnectorRefused("A_DRY_RUN_ISSUES_NO_REQUEST"); });

/** The ref a CONNECTOR decision is about — exactly as RESOURCES.connector forms it. */
const connectorRef = (subjectId, kind) => `${subjectId}#${kind}`;

/** F04: true only for a genuine AUTHORISED decision to open exactly this subject's connector of this kind. */
export const authorisesConnector = (d, subjectId, kind) => isGenuineAuthorisation(d) && d.allowed === true && d.action === `OPEN_CONNECTOR_${kind}` && d.resourceRefDigest === authorisationRefDigest(connectorRef(subjectId, kind));

/** True only for a genuine, allowed decision about exactly this subject's connector of this kind. */
export const allowsConnector = (decision, subjectId, kind) => isGenuineDecision(decision) && decision.allowed === true && decision.target?.resourceKind === "CONNECTOR" && decision.target?.resourceRefDigest === refDigest("CONNECTOR", connectorRef(subjectId, kind));

/**
 * Open the connector of `kind` for `subjectId`, on the scoped run's decision.
 * @param {{ scope: { decisions: {decision: object}[] }, subjectId: string, kind: string, resolve?: Function }} o
 * @returns {{ connectorId: string, kind: string, credentialName: string|null, fetch: Function }}
 */
export function openConnector({ scope, subjectId, kind, resolve = null }) {
  const decision = (scope?.decisions ?? []).map((d) => d?.decision).find((d) => allowsConnector(d, subjectId, kind));
  if (!decision) throw new ConnectorRefused("CONNECTOR_NOT_RESOLVED");
  /* 🔴 F04: scope is not permission — the run's actor must be AUTHORISED to open this connector (decided at entry). */
  if (!(scope?.authorisations ?? []).some((d) => authorisesConnector(d, subjectId, kind))) throw new ConnectorRefused("CONNECTOR_NOT_AUTHORISED");
  const index = (resolve ?? createTenantResolver()).roots;
  const l = lookupConnector(index, subjectId, kind);
  /* The declarations were read again: a declaration that changed between the decision and here is refused, not used. */
  if (l.state !== "DECLARED") throw new ConnectorRefused(`CONNECTOR_${l.state}`);
  const credentialName = l.connector.credential?.name ?? null;
  /* 🔴 RR-135 · A PUBLIC SITE CONNECTOR REACHES ONLY THE SITE ORIGINS IT DECLARES. Until now an opened PUBLIC_SITE connector fetched
   * any URL it was handed, so a declared batch could carry a seed on any host and it would be read — F19's FAILURE clause "the crawl
   * reads a resource not declared for the requested tenant". Its fetch now refuses every other origin before any request, and `admits`
   * lets a caller check a URL before it spends a paced slot on it. A redirect the platform follows by itself is outside this check —
   * so the crawler follows redirects itself, hop by hop, paced, and only to an origin this connector admits (src/crawl/fetcher.mjs).
   * Generic: the origins come from the subject's own declaration, whoever the client is. */
  /* RR-155: a QUESTION_SOURCE_API connector likewise reaches ONLY the origins it declares */
  /* RR-159: a client's AI_PROVIDER connection likewise reaches ONLY the origin it declares */
  const origins = ["PUBLIC_SITE", "QUESTION_SOURCE_API", "AI_PROVIDER"].includes(l.connector.kind) ? siteOriginsOf(l.connector) : null;
  return Object.freeze({
    connectorId: l.connector.connectorId,
    kind: l.connector.kind,
    credentialName,
    origins: origins ? Object.freeze([...origins]) : null,
    admits: (url) => origins === null || origins.has(originOf(url)),
    /* ONE call site for the global fetch (F77's egress census counts it) — and it is reached only through the paced release (RR-265) */
    fetch: (url, init) => (origins === null || origins.has(originOf(url)) ? pacedRelease(url, declaredGapOf(l.connector)).then(() => globalThis.fetch(url, init)) : Promise.reject(new ConnectorRefused("ORIGIN_NOT_DECLARED_FOR_THIS_CONNECTOR"))),
  });
}

/* 🔴 RR-265 · THE ONE PACED PATH (owner decision RR-265 item 4: "make it impossible in code"). Every request an opened connector makes waits
 * here until the per-host gap has passed since the last request this process released to that host: 2 s at the least (the engine's floor),
 * longer where the connector's own declaration names a longer gap (`pace.minGapMs`). Requests to one host are released one at a time, in
 * the order asked, on the monotonic clock. A host on this machine is not outbound and is not paced. Every release is counted, and every wait
 * is recorded (counts only — no host, no address). Reaching the network any other way is a BYPASS in tools/root-connector-census.mjs. */
export const PACE_FLOOR_MS = 2000;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const releases = new Map();
const paceCounts = { released: 0, waited: 0, waitedMs: 0 };
/** What the paced path did in this process: requests released, how many waited, and for how long in all (ms). */
export const pacingRecord = () => Object.freeze({ ...paceCounts });
/** The gap a connector's declaration asks for, or 0 (the floor then decides). */
export const declaredGapOf = (connector) => (Number.isFinite(Number(connector?.pace?.minGapMs)) ? Number(connector.pace.minGapMs) : 0);
/**
 * Release one request to the host of `url` once the gap since that host's last release has passed. Resolves with the wait (ms).
 * `now`, `sleep`, `hosts` and `counts` exist for the firing control's fake clock; production uses the defaults.
 */
export function pacedRelease(url, gapMs = 0, { now = () => performance.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), hosts = releases, counts = paceCounts } = {}) {
  let host;
  try { host = new URL(String(url)).hostname; } catch { return Promise.reject(new ConnectorRefused("NOT_A_URL")); }
  if (LOOPBACK.has(host)) return Promise.resolve(0);
  const gap = Math.max(PACE_FLOOR_MS, Number.isFinite(gapMs) ? gapMs : 0);
  let h = hosts.get(host);
  if (!h) { h = { at: -Infinity, chain: Promise.resolve() }; hosts.set(host, h); }
  const turn = h.chain.then(async () => {
    const wait = Math.max(0, h.at + gap - now());
    if (wait > 0) { counts.waited += 1; counts.waitedMs += wait; await sleep(wait); }
    h.at = now();
    counts.released += 1;
    return wait;
  });
  h.chain = turn.catch(() => {});
  return turn;
}

/** The origin of a URL, or null when it is not one. */
export function originOf(url) {
  try { return new URL(String(url)).origin; } catch { return null; }
}

/** Every SITE_ORIGIN a connector declares it reaches, as origins. */
export function siteOriginsOf(connector) {
  return new Set((connector?.reaches ?? []).filter((r) => r.resourceKind === "SITE_ORIGIN").map((r) => originOf(r.resourceRef)).filter(Boolean));
}
