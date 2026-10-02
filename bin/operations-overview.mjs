#!/usr/bin/env node
/**
 * F87 · THE ENGINE OPERATOR'S CROSS-TENANT OPERATIONAL OVERVIEW — counts and states only (owner decision, RR-130 §2).
 *
 *   node bin/operations-overview.mjs --on=<YYYY-MM-DD> --actor=<id>      READ-ONLY; writes nothing; GLOBAL_PRODUCT scope
 *
 * 🔴 NOT A TENANT READ AND NOT A BYPASS. It names no tenant: F04 decides READ_OPERATIONS_OVERVIEW for the named actor at GLOBAL_PRODUCT
 * scope BEFORE anything is read, recorded through the guard sink; a refusal ends the process (exit 5). What it may print is bounded in
 * src/ops/operator-overview.mjs — counts and state codes, never a record, URL, content or tenant identifier. Unscoped history stays
 * UNATTRIBUTED. No recorded mid-write failure leaves recovery UNPROVED. A tenant's own detail stays behind bin/watchman.mjs's scope gate.
 */
import { authorise, authorisationEvent, namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { diagnosticGuardSink } from "../src/governance/guard-audit.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { OPERATOR_SCOPE, renderOverview } from "../src/ops/operator-overview.mjs";
import { readOperatorOverview } from "../src/ops/operator-overview-reader.mjs";

const ON = process.argv.find((a) => a.startsWith("--on="))?.slice(5) ?? null;
if (!/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) {
  console.error("\n🔴 --on=<YYYY-MM-DD> is required. There is no default: the date evidence is judged on is a measurement you state.\n");
  process.exit(1);
}
const sink = diagnosticGuardSink({ actor: "bin/operations-overview.mjs" });
const decision = authorise({ actorRef: namedActor(process.argv), action: OPERATOR_SCOPE.action, scope: { scopeType: OPERATOR_SCOPE.scopeType }, resourceRef: "operations-overview", now: new Date().toISOString() });
sink.emit(authorisationEvent(decision));
if (!decision.allowed) {
  console.error(`🔴 AUTHORISATION REFUSED — ${OPERATOR_SCOPE.action}: ${decision.outcome} (${decision.reason}); nothing was read`);
  process.exit(AUTHORISATION_REFUSED_EXIT);
}
for (const line of renderOverview(readOperatorOverview({ on: ON, resolve: createTenantResolver() }))) console.log(line);
