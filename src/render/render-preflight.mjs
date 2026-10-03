/**
 * 🔴 RR-138 §2 · THE RENDER COLLECTION'S PREFLIGHT — every write it will make, proved KEEPABLE before any request.
 *
 * RR-105 lost a paid-for run because a write was refused AFTER the fetching. Building a governed descriptor proves the evidence-state
 * placement only; the F04 authorisation is asked by the executor at write time, and a missing dedupe key fails only at commit. So this
 * asks all three, now, over synthetic records of every kind the run can produce:
 *   PLACEMENT    the descriptor builds (governedStoreAppend / governedFileWrite throw on an unplaceable record)
 *   KEY          every APPEND_IF_NEW record carries a dedupe key
 *   AUTHORISED   the same F04 decision the executor will ask, for the same actor, action, scope and target
 * Pure apart from what it is handed: it builds, it never executes.
 */

/**
 * @param {{ attempts: { what: string, build: () => object, records?: object[], needsKey?: boolean }[], authorise: Function, permission: object, dedupeKeyOf: (r: object) => string|null }} o
 * @returns {{ ok: boolean, checks: { what: string, ok: boolean, why?: string }[] }}
 */
export function preflightRenderWrites({ attempts, authorise, permission, dedupeKeyOf }) {
  const checks = [];
  for (const a of attempts) {
    try {
      if (a.needsKey) {
        const keyless = (a.records ?? []).filter((r) => dedupeKeyOf(r) === null).length;
        if (keyless > 0) throw Object.assign(new Error(`${keyless} record(s) carry no dedupe key for APPEND_IF_NEW`), { code: "NO_DEDUPE_KEY" });
      }
      const d = a.build();
      const decision = authorise({
        actorRef: permission?.actorRef ?? null, approvalRef: permission?.approvalRef ?? null, action: d.action.name,
        scope: { scopeType: d.action.scopeType, tenantId: d.action.tenantId ?? null },
        resourceRef: String(d.adapter?.repoRelativeTarget ?? d.adapter?.target?.repoRelativeTarget ?? ""), now: d.action.occurredAt,
      });
      if (!decision?.allowed) throw Object.assign(new Error(`F04 would refuse ${d.action.name}: ${decision?.outcome ?? "NO_DECISION"}`), { code: "AUTHORISATION_REFUSED" });
      checks.push({ what: a.what, ok: true });
    } catch (e) {
      checks.push({ what: a.what, ok: false, why: `${e.code ?? e.name}: ${e.message}` });
    }
  }
  return { ok: checks.length > 0 && checks.every((c) => c.ok), checks };
}
