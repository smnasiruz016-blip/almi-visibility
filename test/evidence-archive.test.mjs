/**
 * 🔴 THE EVIDENCE BEHIND A TICK MUST OUTLIVE THE TICK — AND THE BUILD SAYS SO.
 *
 * Items 11, 42 and 48 are VERIFIED-PASS on the bodies the 12 September crawl
 * captured. The day this archive goes missing, or a single body stops hashing
 * to its observation, is the day the build fails — not the day someone notices.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive, verifyBodiesAgainstRun, packBodies, unpackBodies } from "../src/evidence/body-archive.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const ARCHIVE = `${REPO}runs/crawl/bodies-2026-09-12.jsonl.br`;

test("🔴 the body archive is PRESENT, and every one of the run's 394 bodies hashes to its observation", () => {
  assert.ok(existsSync(ARCHIVE), "the evidence behind items 11, 42 and 48 is missing from the repository");
  const bodies = readBodyArchive(ARCHIVE);
  const crawlRecords = createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll();
  const v = verifyBodiesAgainstRun({ bodies, crawlRecords });
  assert.equal(v.expected, 394);
  assert.deepEqual(v.missing, [], "a body is missing");
  assert.deepEqual(v.mismatched, [], "a body no longer matches the hash its observation recorded");
  assert.deepEqual(v.extra, [], "the archive holds a body no observation names");
  assert.equal(v.matches, 394);
});

test("the archive's size is stated, and stays reasonable", () => {
  const bytes = statSync(ARCHIVE).size;
  assert.ok(bytes < 2 * 1024 * 1024, `the archive is ${bytes} bytes — larger than the 2 MB this ruling was made on`);
});

test("🔴 git is told the archive is binary — an EOL conversion would corrupt it silently", () => {
  assert.match(readFileSync(`${REPO}.gitattributes`, "utf8"), /^runs\/crawl\/\*\.br -text/m);
});

test("🔴 .gitignore distinguishes a CACHE from EVIDENCE in words, and keeps 'a repo is not a cache'", () => {
  const text = readFileSync(`${REPO}.gitignore`, "utf8");
  assert.match(text, /a repo is not a cache/);
  assert.match(text, /A CACHE is regenerable and stays out/);
  assert.match(text, /EVIDENCE UNDERPINNING A VERIFIED-PASS ROW IS NOT REGENERABLE and goes in/);
});

test("CONTROL: the verifier FIRES on a missing body, a changed byte and an extra body", () => {
  const crawlRecords = [
    { record_type: "observation", observation_id: "a", content_sha256: "0".repeat(64), value: { skipped: false } },
    { record_type: "observation", observation_id: "b", content_sha256: "1".repeat(64), value: { skipped: false } },
  ];
  const v = verifyBodiesAgainstRun({ bodies: unpackBodies(packBodies([{ observation_id: "a", body: "x" }, { observation_id: "z", body: "y" }])), crawlRecords });
  assert.deepEqual(v.missing, ["b"]);
  assert.deepEqual(v.mismatched, ["a"]);
  assert.deepEqual(v.extra, ["z"]);
});
