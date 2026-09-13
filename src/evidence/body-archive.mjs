/**
 * 🔴 THE EVIDENCE BEHIND A TICK MUST OUTLIVE THE TICK.
 *
 * Ruling, beta-g as technical owner, 13 September 2026 — same principle as
 * L-COST-1. Items 11, 42 and 48 stand on the bodies the 12 September crawl
 * captured. They lived in a GitHub Actions artifact that expires on 2026-12-11
 * and on one developer machine. The live pages have moved on, so no future
 * crawl can reproduce what was served that day: these bytes are NOT
 * regenerable, and a repository that holds only their hashes holds a promise
 * nobody could ever check again.
 *
 * ── THE FORMAT ──────────────────────────────────────────────────────────────
 *
 * One brotli-compressed JSONL stream, one `{ observation_id, body }` per line,
 * sorted by observation_id so the same bodies always pack to the same bytes.
 * One stream rather than one file per body because 394 pages from one estate
 * share their shell: across the whole set the compressor sees the template
 * once. Measured on the real bodies: 39.9 MB raw, 6.6 MB as per-file gzip,
 * 0.66 MB as this stream.
 *
 * Every body is checked against its observation's `content_sha256` on read by
 * the caller that needs it (`verifyBodiesAgainstRun`), so a corrupted archive
 * cannot quietly serve different bytes under the old hashes.
 *
 * This module names no product.
 */

import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import { readFileSync } from "node:fs";

import { sha256Hex } from "./ids.mjs";

export function packBodies(entries) {
  const sorted = [...entries].sort((a, b) => a.observation_id.localeCompare(b.observation_id));
  const seen = new Set();
  for (const e of sorted) {
    if (typeof e.observation_id !== "string" || e.observation_id === "") throw new TypeError("packBodies: every entry needs an observation_id");
    if (typeof e.body !== "string") throw new TypeError(`packBodies: ${e.observation_id} has no body`);
    if (seen.has(e.observation_id)) throw new Error(`packBodies: ${e.observation_id} appears twice`);
    seen.add(e.observation_id);
  }
  const jsonl = sorted.map((e) => JSON.stringify({ observation_id: e.observation_id, body: e.body })).join("\n") + "\n";
  const raw = Buffer.from(jsonl, "utf8");
  return brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_LGWIN]: 24,
      [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
    },
  });
}

/** observation_id → body. */
export function unpackBodies(buffer) {
  const out = new Map();
  const text = brotliDecompressSync(buffer).toString("utf8");
  for (const line of text.split("\n")) {
    if (line === "") continue;
    const { observation_id, body } = JSON.parse(line);
    out.set(observation_id, body);
  }
  return out;
}

export const readBodyArchive = (path) => unpackBodies(readFileSync(path));

/**
 * Every FETCHED observation of the run must have its body, byte for byte.
 * Returns the counts apart, so a report can say which way it failed.
 */
export function verifyBodiesAgainstRun({ bodies, crawlRecords }) {
  const fetched = crawlRecords.filter((r) => r.record_type === "observation" && !r.value?.skipped);
  const missing = [];
  const mismatched = [];
  for (const o of fetched) {
    const body = bodies.get(o.observation_id);
    if (body === undefined) missing.push(o.observation_id);
    else if (sha256Hex(body) !== o.content_sha256) mismatched.push(o.observation_id);
  }
  const expected = new Set(fetched.map((o) => o.observation_id));
  const extra = [...bodies.keys()].filter((id) => !expected.has(id));
  return { expected: fetched.length, present: bodies.size, matches: fetched.length - missing.length - mismatched.length, missing, mismatched, extra };
}
