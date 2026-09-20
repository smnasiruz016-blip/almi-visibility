#!/usr/bin/env node
/**
 * PACK THE 12 SEPTEMBER CRAWL'S CAPTURED BODIES INTO THE REPOSITORY, COMPRESSED.
 *
 *   node bin/archive-corpus.mjs --corpus=runs/crawl/corpus             dry run: pack, verify, print the size
 *   node bin/archive-corpus.mjs --corpus=runs/crawl/corpus --confirm   write runs/crawl/bodies-2026-09-12.jsonl.br
 *   node bin/archive-corpus.mjs --corpus=<dir> --confirm --out=<file>  write the archive to <file> instead (confined to this repository)
 *
 * 🔴 THE EVIDENCE BEHIND A TICK MUST OUTLIVE THE TICK (ruling, 13 September 2026).
 * Items 11, 42 and 48 stand on these bodies; the artifact that held them expires
 * 2026-12-11 and the live pages have moved on. See src/evidence/body-archive.mjs.
 *
 * Refuses to write unless EVERY fetched observation of the run has its body and
 * every body hashes to its observation's content_sha256 — an archive of the
 * wrong bytes would be worse than none. Refuses to overwrite an existing archive.
 * Writes to a temporary file and renames, so a failed write never leaves a
 * truncated archive where the evidence was.
 */

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { packBodies, unpackBodies, verifyBodiesAgainstRun } from "../src/evidence/body-archive.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const arg = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));

const corpusArg = arg("corpus");
if (!corpusArg) {
  console.error("🔴 REFUSED — --corpus=<dir> must point at the unpacked crawl-corpus artifact");
  process.exit(2);
}
const CORPUS = confineToRepo(corpusArg, { label: "--corpus" });
/* 🔴 --out= (gap 3, owner ruling, 15 September 2026): a non-default DESTINATION, and nothing else. With no --out the
 * destination is exactly the committed archive's path, as it always was; either way it is confined to this repository
 * before anything is read. It changes nothing about what the bodies are verified against — the run record below stays
 * hard-coded, and so does the verification. */
/* 🔴 THE DEFAULT DESTINATION IS GONE, 20 SEPTEMBER 2026. The committed archive moved to the external
 * observation batch, where it is immutable evidence, so there is no in-repository path left for this
 * to mean. --out= is now required: packing a fresh archive into this repository would recreate the
 * real observation artifact the migration removed. The write is still confined to this repository —
 * the engine never writes into the data one — and the verification below is unchanged. */
const outArg = arg("out");
const OUT = outArg === null ? null : confineToRepo(outArg, { label: "--out" });

const crawlRecords = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
const files = existsSync(CORPUS) ? readdirSync(CORPUS).filter((f) => f.endsWith(".html")) : [];
const entries = files.map((f) => ({ observation_id: f.replace(/\.html$/, ""), body: readFileSync(join(CORPUS, f), "utf8") }));
const rawBytes = entries.reduce((n, e) => n + Buffer.byteLength(e.body, "utf8"), 0);

const packed = packBodies(entries);
// 🔴 Verify what was PACKED, by unpacking it — not the inputs we hoped went in.
const check = verifyBodiesAgainstRun({ bodies: unpackBodies(packed), crawlRecords });
console.log(`[bound: ${files.length} bodies in ${CORPUS}]`);
console.log(`raw ${rawBytes} bytes → packed ${packed.length} bytes (${((packed.length / rawBytes) * 100).toFixed(2)}%)`);
console.log(`verify: expected ${check.expected}, present ${check.present}, hash matches ${check.matches}, missing ${check.missing.length}, mismatched ${check.mismatched.length}, extra ${check.extra.length}`);

if (check.matches !== check.expected || check.missing.length || check.mismatched.length || check.extra.length) {
  console.error("🔴 REFUSED — the bodies are not exactly the run's bodies");
  process.exit(1);
}
if (!permission.mayWrite) {
  console.log(`[dry-run] nothing written — add --confirm (destination: ${OUT ?? "none — --out= is required"})`);
  process.exit(0);
}
if (OUT === null) {
  console.error("🔴 REFUSED — no destination. The committed body archive is in the external observation batch; packing one into this repository would recreate a real observation artifact here. Pass --out=<path>.");
  process.exit(2);
}
if (existsSync(OUT)) {
  console.error(`🔴 REFUSED — ${OUT} already exists. Recorded evidence is not re-recorded over itself.`);
  process.exit(2);
}
const tmp = `${OUT}.tmp-${process.pid}`;
writeFileSync(tmp, packed);
renameSync(tmp, OUT);
console.log(`written: ${OUT} (${packed.length} bytes)`);
