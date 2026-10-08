/**
 * 🔴 F02 · THE OBSERVATION BATCH AND THE SITEMAP COLLECTION, PARTITIONED BY TENANT (src/tenancy/partition.mjs).
 *
 * Both collections are SHARED: their members are pages and sitemaps of many declared site origins. A tenant consumer
 * therefore never reads the collection — it reads its OWN PARTITION: the members whose own stored identities resolve,
 * through current declarations, to exactly its tenant. Everything else stays in quarantine, counted and never read.
 *
 * A MEMBER is one stored record, keeping its immutable id (observation_id, page_id, run_id … or, for a record that stores
 * none, its record type and line position in the immutable file). Its IDENTITIES are only the URL fields the record
 * itself stores — the target reference, the requested and final URL, the canonical URL, a sitemap's origin, root and
 * listed URLs — each reduced to its origin and answered as a SITE_ORIGIN by the resolver. No name, host wording or
 * content decides anything; a record with no identity field (a run summary) is UNDECLARED.
 *
 * Pure: it reads the collection's record files and returns the caller's partition and the arithmetic. Recording the
 * quarantine through F08 is the governed entry point's job (src/governance/scoped-entry.mjs `recordPartition`).
 */
import { createHash } from "node:crypto";
import { createJsonlStore } from "../evidence/store.mjs";
import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { batchFile, batchJsonlFiles } from "./observation-batch.mjs";
import { partitionMembers } from "../tenancy/partition.mjs";

const ORIGIN_FIELDS = ["requested_url", "final_url", "origin", "rootUrl"];
const originOf = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.origin : null; } catch { return null; } };

/** The URL identities a record itself stores, as SITE_ORIGIN references. */
export function recordIdentities(r) {
  const urls = [];
  if (r?.target?.kind === "url") urls.push(r.target.ref);
  if (typeof r?.canonical_url === "string") urls.push(r.canonical_url);
  for (const k of ORIGIN_FIELDS) if (typeof r?.value?.[k] === "string") urls.push(r.value[k]);
  /* RR-229: a loop, never a spread — push(...list) passes every listed URL as a call argument and throws at real size (240,328 URLs, RR-228) */
  if (Array.isArray(r?.value?.urls)) for (const u of r.value.urls) if (typeof u === "string") urls.push(u);
  return [...new Set(urls.map(originOf).filter(Boolean))].sort().map((o) => ({ resourceKind: "SITE_ORIGIN", resourceRef: o }));
}

/** A record's immutable id — its own id field, or (only when it stores none) its type and line in the immutable file. */
export function memberIdOf(r, file, line) {
  /* A record's OWN id field only — a resighting or an issue REFERENCES an observation; that id is not its own. */
  const OWN = { observation: "observation_id", page: "page_id", crawl_run: "run_id", issue: "issue_id", cost_entry: "entry_id" };
  const own = OWN[r?.record_type] ? r[OWN[r.record_type]] : null;
  return own ? `${r.record_type}:${own}` : `${r?.record_type ?? "record"}@${createHash("sha256").update(file).digest("hex").slice(0, 8)}:${line}`;
}

/** Every record of a collection's .jsonl files, each as a member with its identities. */
export function collectionMembers({ batchId, env = process.env }) {
  const out = [];
  for (const f of batchJsonlFiles({ batchId, env })) {
    const path = f.path ?? f;
    const name = path.split(/[\\/]/).pop();
    createJsonlStore(path).readAll().forEach((r, i) => out.push({ memberId: memberIdOf(r, name, i), identities: recordIdentities(r), record: r }));
  }
  return out;
}

/**
 * The requested tenant's partition of a collection: its records (in file order), the ids of its observations, and the
 * whole partition's arithmetic. The tenant must be the run's DECIDED tenant (SCOPE.tenantId) — never a caller's guess.
 */
export function readTenantPartition({ batchId, tenantId, resolve, env = process.env }) {
  return tenantPartitionOf({ members: collectionMembers({ batchId, env }), tenantId, resolve, collectionRef: batchId });
}

/**
 * The same partition over records a run was handed another way (an operator's --crawl file, already decided as an
 * INPUT_PATH): a file of records is as shared as the batch it came from, and is partitioned by the same rule.
 */
export function partitionRecords({ records, fileName, tenantId, resolve }) {
  const members = records.map((r, i) => ({ memberId: memberIdOf(r, fileName, i), identities: recordIdentities(r), record: r }));
  return tenantPartitionOf({ members, tenantId, resolve, collectionRef: fileName });
}

function tenantPartitionOf({ members, tenantId, resolve, collectionRef }) {
  if (typeof tenantId !== "string" || tenantId === "") throw new TypeError("a partition is read for the run's decided tenant — there is no default");
  const p = partitionMembers({ members: members.map(({ memberId, identities }) => ({ memberId, identities })), resolve });
  const mine = new Set(p.partitions.get(tenantId) ?? []);
  const records = members.filter((m) => mine.has(m.memberId)).map((m) => m.record);
  const observationIds = new Set(records.filter((r) => r.record_type === "observation").map((r) => r.observation_id));
  return Object.freeze({ batchId: collectionRef, records, observationIds, partition: p });
}

/**
 * Stored bodies of the partition's own observations only. The archive is ONE compressed stream, so its bytes are
 * decompressed together; but a line is PARSED only when its leading observation id is in the partition — another
 * tenant's body is never parsed into a record and never returned.
 */
export function readPartitionEdges({ batchId, observationIds, env = process.env, name = "edges-2026-09-12.jsonl.br" }) {
  /* F31 (RR-85): the links recorded FROM the partition's own observations only. As with bodies, a line is parsed only when the
   * observation it came from is in the partition — another tenant's link is never parsed into a record. */
  const out = [];
  const text = brotliDecompressSync(readFileSync(batchFile(name, { batchId, env }))).toString("utf8");
  for (const line of text.split("\n")) {
    if (line === "") continue;
    const id = /"from_observation_id":"([^"]+)"/.exec(line)?.[1];
    if (!id) throw new TypeError("an edge line carries no source observation id — the archive format changed; refusing rather than parsing blind");
    if (!observationIds.has(id)) continue;
    const e = JSON.parse(line);
    out.push({ from_observation_id: e.from_observation_id, to: e.to });
  }
  return out;
}

export function readPartitionBodies({ batchId, observationIds, env = process.env, name = "bodies-2026-09-12.jsonl.br" }) {
  const out = new Map();
  const text = brotliDecompressSync(readFileSync(batchFile(name, { batchId, env }))).toString("utf8");
  for (const line of text.split("\n")) {
    if (line === "") continue;
    const id = /^\{"observation_id":"([^"]+)"/.exec(line)?.[1];
    if (!id) throw new TypeError("a body line does not lead with its observation id — the archive format changed; refusing rather than parsing blind");
    if (!observationIds.has(id)) continue;
    out.set(id, JSON.parse(line).body);
  }
  return out;
}
