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
  const index = (resolve ?? createTenantResolver()).roots;
  const l = lookupConnector(index, subjectId, kind);
  /* The declarations were read again: a declaration that changed between the decision and here is refused, not used. */
  if (l.state !== "DECLARED") throw new ConnectorRefused(`CONNECTOR_${l.state}`);
  const credentialName = l.connector.credential?.name ?? null;
  return Object.freeze({
    connectorId: l.connector.connectorId,
    kind: l.connector.kind,
    credentialName,
    fetch: (url, init) => globalThis.fetch(url, init),
  });
}
