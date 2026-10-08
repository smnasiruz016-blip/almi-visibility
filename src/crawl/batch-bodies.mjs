/**
 * 🔴 F19 · ACCEPTANCE AMENDMENT 1 (_handoffs b6b3382, RR-227) · E — A RESEARCH-BATCH CRAWL STORES ITS BODIES IN ITS BATCH.
 *
 * Until RR-227 a research-batch crawl wrote its observations into the batch but each body into the engine's git-ignored runs/crawl/corpus,
 * where F31's reader may not look (F31 Amendment 1 reads a batch's own bodies.jsonl only). Now each fetched page's body is ONE record in
 * the batch's body store, in the format F31's reader already reads (src/crawl/newer-collections.mjs NEWER_FILES.BODIES):
 *
 *   { record_type: "page_body", observation_id, measurement_key, content_sha256, truncated, bytes, observed_at, collector, collector_version, body }
 *
 *   SAME BYTES  content_sha256 is the hash of the stored body and MUST equal its observation's content_sha256 — a body that is not its
 *               observation's is never built.
 *   BOUNDED     the body is exactly what the fetcher kept under the response-size bound; a body the bound cut carries truncated:true.
 *   CEILING     before the write, each body is checked against the batch store's ceiling (src/crawl/sitemap-collect.mjs
 *               BATCH_STORE_CEILING_BYTES): a body that would cross it is NOT stored and is COUNTED; its observation is kept, and a reader
 *               states that body NOT MEASURED. A body is never cut to fit.
 *
 * Pure. Names no product, tenant, host or batch.
 */
import { sha256Hex } from "../evidence/ids.mjs";
import { BATCH_STORE_CEILING_BYTES, recordLineBytes } from "./sitemap-collect.mjs";

export const BODY_NOT_STORED = Object.freeze({ OVER_THE_BATCH_STORE_CEILING: "OVER_THE_BATCH_STORE_CEILING" });

/**
 * The two files F19 writes INSIDE a declared research batch — the very names F31's reader reads (src/crawl/newer-collections.mjs
 * NEWER_FILES; test/f19-a1.test.mjs holds them equal). They belong to the batch (the RESEARCH store, decided by F02 for the run's tenant),
 * never to the shared sitemap collection or the engine's corpus.
 */
export const BATCH_FILES = Object.freeze({ SITEMAPS: "sitemaps.jsonl", BODIES: "bodies.jsonl" });

/** One page_body record per fetched observation that has a body, in observation order. Throws when a body is not its observation's. */
export function pageBodyRecords({ observations, bodies, collector = "bin/crawl.mjs", collectorVersion = "2" }) {
  const out = [];
  for (const o of observations) {
    const body = bodies.get(o.observation_id);
    if (typeof body !== "string") continue;
    const content_sha256 = sha256Hex(body);
    if (content_sha256 !== o.content_sha256) {
      throw Object.assign(new Error(`BODY_NOT_ITS_OBSERVATIONS: the body held for an observation does not hash to that observation's content_sha256`), { code: "BODY_NOT_ITS_OBSERVATIONS" });
    }
    out.push({
      record_type: "page_body",
      observation_id: o.observation_id,
      measurement_key: `page_body:${o.observation_id}`,
      content_sha256,
      truncated: o.value?.truncated === true,
      bytes: Buffer.byteLength(body, "utf8"),
      observed_at: o.observed_at,
      collector,
      collector_version: collectorVersion,
      body,
    });
  }
  return out;
}

/**
 * Which bodies fit under the ceiling, decided before any write, in order: each body is kept only when the store as it stands, plus the
 * bodies already kept, plus this one stays at or under the ceiling. Every other body is counted by its reason — never cut.
 */
export function bodiesUnderCeiling({ records, existingBytes = 0, ceiling = BATCH_STORE_CEILING_BYTES }) {
  const kept = [];
  const notStored = { [BODY_NOT_STORED.OVER_THE_BATCH_STORE_CEILING]: 0 };
  let used = existingBytes;
  for (const r of records) {
    const add = recordLineBytes(r);
    if (used + add > ceiling) { notStored[BODY_NOT_STORED.OVER_THE_BATCH_STORE_CEILING] += 1; continue; }
    used += add;
    kept.push(r);
  }
  return Object.freeze({ kept, notStored, keptBytes: kept.reduce((n, r) => n + r.bytes, 0), storeBytesAfter: used, ceiling });
}
