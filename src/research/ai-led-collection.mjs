/**
 * F16 · C17–C24 · ONE AI-LED (OR CLIENT-LED) COLLECTION RUN — a lead, the original-source read, the existing boundary (Acceptance
 * Amendment 3, _handoffs 1e48cb8; RR-159). It holds no transport and no gate: its caller injects a provider call that has ALREADY been
 * bound to the paid-provider controls, the source's own transport and a connection check.
 *
 *   1  WHERE      each formed query is one provider call, while the connection is CONNECTED and under the plan's call cap; only the
 *                 ADDRESSES in the output survive (src/research/ai-connection.mjs addressesIn). A provider refusal stops the run.
 *   2  SUPPLIED   the client's hand-supplied links join as leads of their own kind — never a requirement.
 *   3  RESOLVE    the approved source's own reader says which addresses are its question posts; every other one is NOT READ.
 *   4  READ       one read of exactly those posts, and one recheck, under C10's ceiling — a post the read does not return is a DEAD LEAD.
 *   5  STOP       before every provider call and every source read the connection is asked again; DISCONNECTED stops the run where it
 *                 stands, every unread lead LEFT UNREAD, its counts as at that instant.
 * The source's returned items then go through the EXISTING intake (lead-intake.mjs intakeFromPlan → source-adapter.mjs), never a second one.
 * 🔴 RR-170 · F16 C27/C29 (Acceptance Amendment 5): each call's GENERATED question WORDING (its structured `questions` list only, never its
 * prose) becomes a route-1 RESEARCH-DERIVED question of its own record type, tied to the formed query it answers — never a lead, never
 * OBSERVED. The addresses are taken from the output with that list set aside, so wording never yields an address.
 */
import { addressesIn, leadRecord, LEAD_KINDS, RESOLUTION } from "./ai-connection.mjs";
import { COLLECTION_REQUEST_CEILING } from "./collection.mjs";
import { generatedWordingOf, researchDerivedQuestion, ROUTES } from "./research-derived.mjs";

export const MAX_LEADS = 100;

/**
 * @param {{ plan: object, queries: {queryId:string,text:string}[], callProvider: ((text: string) => Promise<unknown>)|null, connected: () => boolean,
 *           adapter: { idsFromAddresses: Function, collectByIds: Function }, transport: Function, clock: () => number, at: () => string }} o
 */
export async function runAiLed({ plan, queries, callProvider, connected, adapter, transport, clock, at }) {
  const d = plan.discovery ?? {};
  const maxLeads = Math.min(Number.isInteger(d.maxLeads) ? d.maxLeads : MAX_LEADS, MAX_LEADS);
  const callCap = Number.isInteger(d.ai?.providerCalls) ? d.ai.providerCalls : 0;
  const found = [], worded = [];
  let stoppedBy = null, providerCalls = 0;
  const seen = new Set();
  const keep = (kind, address, queryId) => { if (found.length < maxLeads && !seen.has(address)) { seen.add(address); found.push({ kind, address, queryId }); } };

  /* 1 · WHERE — the AI connection, query by query */
  if (callProvider) {
    for (const q of queries) {
      if (providerCalls >= callCap) break;
      if (!connected()) { stoppedBy = "DISCONNECTED"; break; }
      let out;
      try { out = await callProvider(q.text); } catch (e) { stoppedBy = `PROVIDER_REFUSED:${typeof e?.code === "string" ? e.code : "UNNAMED"}`; break; }
      providerCalls += 1;
      for (const w of generatedWordingOf(out, maxLeads)) worded.push({ queryId: q.queryId, wording: w });
      for (const a of addressesIn(out && typeof out === "object" && Object.hasOwn(out, "questions") ? { ...out, questions: null } : out, maxLeads)) keep(LEAD_KINDS.AI, a, q.queryId);
      out = null; /* the output's text is dropped here: nothing but the addresses and the GENERATED wording above leaves this loop */
    }
  }
  /* 2 · SUPPLIED — the client's own links, as leads of their own kind */
  if (!stoppedBy) for (const a of addressesIn(d.suppliedLinks ?? [], maxLeads)) keep(LEAD_KINDS.SUPPLIED, a, null);

  /* 3 · RESOLVE through the approved source's own reader */
  const { onSource, outside } = adapter.idsFromAddresses(found.map((f) => f.address), plan.site);
  const idOf = new Map(onSource.map((x) => [x.address, x.id]));
  const outsideSet = new Set(outside);

  /* 4 · READ — unless the run has already stopped, or the client has just disconnected */
  let source = { recorded: null, recheck: null, tally: { sent: 0, cap: Math.min(plan.requests, COLLECTION_REQUEST_CEILING), refused: {} }, stoppedBy: null, returnedIds: [] };
  if (!stoppedBy && onSource.length) {
    if (!connected()) stoppedBy = "DISCONNECTED";
    else {
      source = await adapter.collectByIds({ transport, clock, cap: Math.min(plan.requests, COLLECTION_REQUEST_CEILING), site: plan.site, ids: onSource.map((x) => x.id), language: plan.language, proceed: connected });
      if (source.stoppedBy) stoppedBy = source.stoppedBy;
    }
  }
  /* a post is READ only when both the read and its recheck happened; a post the read did not return is DEAD; anything else is LEFT UNREAD */
  const returned = new Set(source.recorded ? source.returnedIds : []);
  const when = at();
  const leads = found.map((f) => {
    const id = idOf.get(f.address);
    const resolution = outsideSet.has(f.address) ? RESOLUTION.NOT_READ
      : !source.recorded ? RESOLUTION.LEFT_UNREAD
      : !returned.has(id) ? RESOLUTION.DEAD
      : source.recheck ? RESOLUTION.READ : RESOLUTION.LEFT_UNREAD;
    return leadRecord({ subject: plan.subject, planId: plan.planId, kind: f.kind, address: f.address, queryId: f.queryId, providerId: d.ai?.providerId ?? null, resolution, at: when });
  });
  const by = (k) => leads.filter((l) => l.resolution === k).length;
  /* RR-170 · C27/C29: the GENERATED wording, each a route-1 research-derived question of its formed query — one record per distinct wording */
  const researchDerived = [...new Map(worded.map((w) => {
    const r = researchDerivedQuestion({ subject: plan.subject, planId: plan.planId, queryId: w.queryId, route: ROUTES.CLIENT_AI, wording: w.wording, providerId: d.ai?.providerId ?? null, at: when });
    return [r.question_id, r];
  })).values()];
  return {
    source, stoppedBy, leads, researchDerived,
    discovery: Object.freeze({
      providerCalls: Object.freeze({ cap: callCap, made: providerCalls }),
      leads: Object.freeze({ total: leads.length, ai: leads.filter((l) => l.kind === LEAD_KINDS.AI).length, supplied: leads.filter((l) => l.kind === LEAD_KINDS.SUPPLIED).length,
        read: by(RESOLUTION.READ), dead: by(RESOLUTION.DEAD), notRead: by(RESOLUTION.NOT_READ), leftUnread: by(RESOLUTION.LEFT_UNREAD) }),
      researchDerived: researchDerived.length,
      stoppedBy, asAt: `as at ${when}`,
    }),
  };
}
