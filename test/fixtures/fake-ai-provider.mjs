/**
 * RR-159 · A FAKE AI provider for bin/collect-public-questions.mjs — loaded ONLY through the entry point's ALMIVISIBILITY_TEST_PROVIDER seam,
 * which is honoured only inside a verified test run. It makes no request, holds no account and never reads a credential: it answers each
 * call from a scripted scenario (FAKE_AI_SCENARIO), appends one line per call to a calls file (FAKE_AI_CALLS), and — when the scenario says
 * so — plays the CLIENT disconnecting after a given call, by appending a DISCONNECTED event to the batch's connection store.
 * It also hands the entry point a TEST-DOUBLE approval registry (the paid-provider gate accepts one only while every provider is a declared
 * fake), unless the scenario withholds it.
 */
import { readFileSync, appendFileSync } from "node:fs";
import { paidProviderRef } from "../../src/cost/paid-provider-gate.mjs";
import { connectionEvent } from "../../src/research/ai-connection.mjs";

export default function createFakeAiProvider({ env, providerId, pricePerCall }) {
  const scenario = JSON.parse(readFileSync(env.FAKE_AI_SCENARIO, "utf8"));
  let calls = 0;
  const provider = Object.freeze({
    name: providerId, fake: true, priceMeasured: true, pricePerCall: Object.freeze({ ...pricePerCall }),
    async invoke(request) {
      calls += 1;
      appendFileSync(env.FAKE_AI_CALLS, JSON.stringify({ call: calls, query: request?.query ?? null }) + "\n");
      const out = scenario.outputs[calls - 1] ?? { text: "" };
      const d = scenario.disconnect;
      if (d && d.afterCall === calls) appendFileSync(d.file, JSON.stringify(connectionEvent({ subject: d.subject, connectorId: d.connectorId, event: "DISCONNECTED", at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), by: "the client (fixture)", seq: readFileSync(d.file, "utf8").split("\n").filter(Boolean).length })) + "\n");
      return out;
    },
  });
  if (scenario.withholdApproval) return { provider };
  const approvalRef = "approval:rr159-fixture-double";
  const approval = { approvalId: approvalRef, approverRef: "actor:owner", approverClass: "HUMAN", executorRef: "actor:cc", executorClass: "AUTOMATION",
    action: "CALL_PAID_PROVIDER", resource: { resourceClass: "PAID_PROVIDER", resourceRef: paidProviderRef(providerId) }, scope: { scopeType: "TENANT", tenantId: scenario.tenantId },
    decision: "APPROVED", oneUse: false, expiresAt: null, revoked: false, consumed: false };
  return { provider, approvalRef, approvals: { readable: true, events: 1, approvals: new Map([[approvalRef, approval]]) } };
}
