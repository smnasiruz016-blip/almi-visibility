/**
 * F79 · THE CACHE OVER THE REAL STORE — the recorded repeat requests (resightings), each answered by one lookup for ONE tenant.
 *
 *   records            runs/evidence/evidence.jsonl (the shared store; eligibility is F02's, decided per record in the lookup)
 *   declared origins   the SITE_ORIGIN declarations (a domain property's coverage is counted against declarations only)
 *   freshness rule     the tenant's declared rule (src/page/existing-page-population.mjs declaredScope) — none declared today
 *   source changes     NONE recorded and no store of them exists: [] is that recorded fact, passed EXPLICITLY
 *   raw reader         a raw file under the engine root, or null when absent
 * Read only; count-only output.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonlStore } from "./store.mjs";
import { readDeclarations } from "../tenancy/resolver.mjs";
import { declaredScope } from "../page/existing-page-population.mjs";
import { lookup, windowOf } from "./evidence-cache.mjs";

export const EVIDENCE_STORE = fileURLToPath(new URL("../../runs/evidence/evidence.jsonl", import.meta.url));
const ENGINE = fileURLToPath(new URL("../../", import.meta.url));
export const NO_RECORDED_SOURCE_CHANGES = Object.freeze([]);

export const engineRawReader = (ref) => { const p = join(ENGINE, ref); return existsSync(p) ? readFileSync(p) : null; };

export function declaredOrigins({ env = process.env } = {}) {
  const decl = readDeclarations({ env });
  return (decl.readable ? decl.attachments : []).filter((a) => a?.resourceKind === "SITE_ORIGIN").map((a) => { try { return { host: new URL(a.resourceRef).host.toLowerCase(), tenantId: a.tenantId }; } catch { return { host: null, tenantId: a.tenantId }; } });
}

/** Every recorded repeat request, as the request it was: the original measurement, its target and its window. */
export function recordedRepeats(records) {
  const byKey = new Map(records.filter((r) => r?.record_type === "observation").map((r) => [r.measurement_key, r]));
  return records.filter((r) => r?.record_type === "resighting").map((s) => {
    const o = byKey.get(s.measurement_key);
    return o ? { seenAt: s.seen_at, request: { method: o.method, target: o.target, window: windowOf(o) } } : { seenAt: s.seen_at, request: null };
  });
}

export function readRecordedReuse({ tenantId, resolve, env = process.env, storePath = EVIDENCE_STORE, sourceChanges = NO_RECORDED_SOURCE_CHANGES, readRaw = engineRawReader }) {
  const records = existsSync(storePath) ? createJsonlStore(storePath).readAll() : [];
  const rule = declaredScope({ tenantId, env }).freshnessRule ?? null;
  /* a declared rule of a shape this reader does not read fails CLOSED — it never silently becomes "no rule" or "fresh" */
  if (rule !== null && typeof rule?.fresh !== "function") throw new TypeError("a declared freshness rule is present in a shape F79 does not read — refusing rather than guessing freshness");
  const origins = declaredOrigins({ env });
  const repeats = recordedRepeats(records);
  const answers = repeats.map((x) => (x.request ? lookup(x.request, { tenantId, records, resolve, origins, freshnessRule: rule, sourceChanges, readRaw }) : { answer: "MISS", miss: "NOT_HELD", why: "the repeat names no held record" }));
  const hits = answers.filter((a) => a.answer === "HIT");
  const byMiss = answers.filter((a) => a.answer === "MISS").reduce((m, a) => ((m[a.miss] = (m[a.miss] ?? 0) + 1), m), {});
  return {
    answers,
    summary: Object.freeze({
      repeats: repeats.length,
      served: hits.length,
      misses: byMiss,
      meteredRequestsServed: hits.reduce((n, a) => n + (a.requestCount ?? 0), 0),
      servedWithRequestCountNotRecorded: hits.filter((a) => a.requestCount === null).length,
    }),
    bound: `recorded data only · ${records.length} held record(s) · ${repeats.length} recorded repeat request(s) · freshness rule ${rule ? "DECLARED" : "NONE DECLARED"} · source-change signals ${sourceChanges.length} · no re-research run, no call made`,
  };
}
