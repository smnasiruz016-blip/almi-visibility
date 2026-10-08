/**
 * 🔴 RR-223 · A FIXTURE DATA ROOT FOR F31 — built from nothing, never a copy of the real data root (RR-177: no proof reads the 27 pages).
 *
 * Two fixture tenants, each with one origin; the fixed 2026-09-12 crawl and sitemap batches in the shape the engine reads (records, a
 * bodies archive and an edges archive, brotli); and RESEARCH batches: attached and named (read), attached to the other tenant, attached to
 * none, and attached but named by no subject (none of those three read). Writes only under the OS temp dir; cleanup() removes it.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync } from "node:zlib";
import { createHash } from "node:crypto";
import { canonicalUrl, targetPageId } from "../../src/evidence/ids.mjs";

export const FA = "https://f31-fixture-a.invalid";
export const FZ = "https://f31-fixture-z.invalid";
export const TA = "tenant:00000000000000000000000000031a01";
export const TZ = "tenant:00000000000000000000000000031a02";
export const SUBJECT_A = "f31-fixture-a", SUBJECT_Z = "f31-fixture-z";
export const OLD = "2026-09-12T01:00:00Z";
export const sha = (s) => createHash("sha256").update(String(s), "utf8").digest("hex");
const ENV = "ALMIVISIBILITY_SUBJECT_ROOTS";

/** An observation in the engine's recorded shape. */
export const obs = (id, url, { at = OLD, body = null, status = 200, ...extra } = {}) => ({
  record_type: "observation", observation_id: id, observed_at: at, method: "crawl.fetch", target: { kind: "url", ref: url },
  content_sha256: body === null ? (extra.content_sha256 ?? null) : sha(body),
  value: { requested_url: url, final_url: url, status, redirect_chain: [], truncated: false, error: status === null ? "TIMEOUT" : null, skipped: false, ...extra.value },
});
export const page = (url, ids) => ({ record_type: "page", page_id: targetPageId(canonicalUrl(url)), canonical_url: canonicalUrl(url), observations: ids, target: { kind: "url", ref: url } });
export const sitemapRec = (origin, urls, { at = OLD, id = `sm-${origin.length}-${at}`, ...v } = {}) => ({
  record_type: "observation", observation_id: id, observed_at: at, method: "sitemap.collect", target: { kind: "url", ref: `${origin}/sitemap.xml` },
  value: { origin, rootUrl: `${origin}/sitemap.xml`, urls, coverageState: "COMPLETE", childrenSkipped: 0, urlsTotal: urls.length, urlsStored: urls.length, ...v },
});
export const links = (sourceId, from, tos, at = OLD) => ({ record_type: "page_links", evidence_id: `l-${sourceId}`, observed_at: at, source_observation_id: sourceId, target: { kind: "url", ref: from }, value: { from, links: tos.map((to) => ({ to })) } });
export const run = (coverageState = "COMPLETE") => ({ record_type: "crawl_run", run_id: `run-${coverageState}`, coverageState, capReached: coverageState !== "COMPLETE" });

/**
 * @param fixed     { records, bodies: [[id, body]], edges: [{from_observation_id, to}], sitemaps: [] }
 * @param batches   { [batchId]: { crawl?: [], sitemaps?: [], bodies?: [[id, body]], attachTo?: TA|TZ|null, namedBy?: SUBJECT_A|SUBJECT_Z|null, extraFiles?: {name: text} } }
 * @param tenants   tenant records' extra fields, by tenant id (e.g. { [TA]: { existingPageInventory: { freshnessDays: 30 } } })
 * @param extraAttachments  further [resourceKind, resourceRef, tenantId] attachments (e.g. a whole shared batch, for a gate control)
 */
export function f31FixtureRoot({ fixed, batches = {}, tenants = {}, extraAttachments = [] }) {
  const root = mkdtempSync(join(tmpdir(), "almi-f31-root-"));
  const w = (p, t) => { mkdirSync(join(root, p, ".."), { recursive: true }); writeFileSync(join(root, p), t); };
  for (const s of [SUBJECT_A, SUBJECT_Z]) mkdirSync(join(root, s), { recursive: true });
  const named = (s) => Object.entries(batches).filter(([, b]) => b.namedBy === s).map(([id]) => ({ resourceKind: "RESEARCH_BATCH", resourceRef: id }));
  w("roots.json", JSON.stringify({
    schemaVersion: 1, kind: "ROOT_REGISTRY",
    stores: [{ store: "OBSERVATIONS", path: "observations" }, { store: "RESEARCH", path: "research" }],
    subjects: [
      { subjectId: SUBJECT_A, path: SUBJECT_A, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: FA }, ...named(SUBJECT_A)], connectors: [] },
      { subjectId: SUBJECT_Z, path: SUBJECT_Z, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: FZ }, ...named(SUBJECT_Z)], connectors: [] },
    ],
  }));
  const basis = "F31_FIXTURE_ROOT_NOT_THE_REAL_POPULATION";
  w("tenancy/tenants.json", JSON.stringify({ schemaVersion: 1, tenants: [TA, TZ].map((t) => ({ schemaVersion: 1, tenantId: t, status: "ACTIVE", declaredOn: "2026-09-24", declarationBasis: basis, label: `F31 fixture ${t.slice(-2)}`, ...(tenants[t] ?? {}) })) }));
  const att = [["SITE_ORIGIN", FA, TA], ["SITE_ORIGIN", FZ, TZ], ...Object.entries(batches).filter(([, b]) => b.attachTo).map(([id, b]) => ["RESEARCH_BATCH", id, b.attachTo]), ...extraAttachments];
  w("tenancy/attachments.json", JSON.stringify({ schemaVersion: 1, attachments: att.map(([resourceKind, resourceRef, tenantId]) => ({ schemaVersion: 1, resourceKind, resourceRef, tenantId, declaredOn: "2026-09-24", declarationBasis: basis })) }));
  const jsonl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  w("observations/crawl-2026-09-12/fixture-crawl.jsonl", jsonl(fixed.records));
  w("observations/crawl-2026-09-12/bodies-2026-09-12.jsonl.br", brotliCompressSync(Buffer.from((fixed.bodies ?? []).map(([observation_id, body]) => JSON.stringify({ observation_id, body })).join("\n"))));
  w("observations/crawl-2026-09-12/edges-2026-09-12.jsonl.br", brotliCompressSync(Buffer.from((fixed.edges ?? []).map((e) => JSON.stringify({ from_observation_id: e.from_observation_id, to: e.to })).join("\n"))));
  w("observations/sitemap-2026-09-12/sitemaps.jsonl", jsonl(fixed.sitemaps ?? []));
  for (const [id, b] of Object.entries(batches)) {
    if (b.crawl) w(`research/${id}/crawl.jsonl`, jsonl(b.crawl));
    if (b.sitemaps) w(`research/${id}/sitemaps.jsonl`, jsonl(b.sitemaps));
    if (b.bodies) w(`research/${id}/bodies.jsonl`, jsonl(b.bodies.map(([observation_id, body]) => ({ observation_id, body }))));
    for (const [name, text] of Object.entries(b.extraFiles ?? {})) w(`research/${id}/${name}`, text);
  }
  return Object.freeze({ root, env: { ...process.env, [ENV]: root }, cleanup: () => rmSync(root, { recursive: true, force: true }) });
}
