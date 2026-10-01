/**
 * F16 · ONE CLIENT'S RECORDED PUBLIC QUESTIONS (acceptance _handoffs 944f769, RR-114).
 *
 *   source   the research batches of the declared RESEARCH store that the caller's scope gate decided for this tenant, each read
 *            through F02's partition (a record is this client's only when its OWN identities resolve to the client)
 *   never    the client's Search Console evidence store (owned evidence, F10's) and never any sealed store — this module imports
 *            neither, and the path's import closure is checked for both
 * Read only; nothing fetched, harvested or written.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { lookupStore } from "../tenancy/root-registry.mjs";
import { rootIndexFor } from "../tenancy/resolver.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { partitionRecords } from "../crawl/batch-partition.mjs";
import { RECORD_TYPE } from "./public-questions.mjs";

/** The public-question records of the named research batches that belong to `tenantId`, with the arithmetic of what was read. */
export function readClientQuestionRecords({ tenantId, resolve, batches, env = process.env }) {
  const store = lookupStore(rootIndexFor(env), "RESEARCH");
  if (store.state !== "DECLARED") return { records: [], files: 0, read: 0, outsidePartition: 0, store: store.state };
  const records = [];
  let files = 0, read = 0, questionsSeen = 0;
  for (const batch of batches) {
    let names;
    try { names = readdirSync(join(store.dir, batch)).filter((n) => n.endsWith(".jsonl")); } catch { continue; }
    for (const name of names) {
      files++;
      const all = createJsonlStore(join(store.dir, batch, name)).readAll();
      read += all.length;
      questionsSeen += all.filter((r) => r.record_type === RECORD_TYPE).length;
      const part = partitionRecords({ records: all, fileName: name, tenantId, resolve });
      records.push(...part.records.filter((r) => r.record_type === RECORD_TYPE));
    }
  }
  return { records, files, read, outsidePartition: questionsSeen - records.length, store: "DECLARED" };
}
