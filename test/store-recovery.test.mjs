/**
 * 🔴 ITEM 55 — RECOVERY, EXERCISED: A DAMAGED EVIDENCE STORE IS RESTORED FROM
 * ITS COMMITTED STATE, AND THE RESTORED COPY HASHES IDENTICALLY.
 *
 * The recovery model is the one the store was built for: append-only files
 * under version control. So recovery is proved the way it would be done — the
 * committed blob is read back out of git, a copy is DAMAGED the way a failed
 * write damages it (a torn last line), the damage is detected by the store's own
 * reader, and the copy is restored from the blob. "Restored" means the bytes
 * hash to the blob id git recorded, not that the file "looks right".
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const git = (args, opts = {}) => execFileSync("git", args, { cwd: REPO, maxBuffer: 256 * 1024 * 1024, ...opts });
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
/** git's own object id for a blob: sha1("blob <n>\0" + bytes). */
const gitBlobId = (bytes) => createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");

/* 🔴 20 September 2026: runs/crawl/first-real-crawl-2026-09-12.jsonl left this list because the
 * observation batch moved to the external data repository. It did NOT stop being covered — it is
 * recovered below through dataGit, from the repository that now commits it, by the same rule. */
const STORES = ["runs/evidence/evidence.jsonl", "runs/audit/technical-findings.jsonl", "runs/cost/ledger.jsonl"];

/** The same reader, pointed at the repository that now holds the observation batch. */
const BATCH_REPO = join(REPO, "..", "almi-visibility-data");
const dataGit = (args, opts = {}) => execFileSync("git", args, { cwd: BATCH_REPO, maxBuffer: 256 * 1024 * 1024, ...opts });
const BATCH = "observations/crawl-2026-09-12";

for (const path of STORES) {
  test(`🔴 RECOVERY: ${path} — torn by a partial write, detected by the reader, restored from the commit, and byte-identical`, () => {
    const committed = git(["show", `HEAD:${path}`]);
    const blobId = String(git(["rev-parse", `HEAD:${path}`], { encoding: "utf8" })).trim();
    assert.equal(gitBlobId(committed), blobId, "the bytes read back from git are not the blob git recorded");

    const dir = mkdtempSync(join(tmpdir(), "almivis-recover-"));
    try {
      const copy = join(dir, "store.jsonl");
      writeFileSync(copy, committed);
      const before = createJsonlStore(copy).readAll().length;
      assert.ok(before > 0);

      // The damage a crash mid-append leaves: a torn record with no newline.
      appendFileSync(copy, '{"record_type":"observation","observation_id":"torn-');
      assert.throws(() => createJsonlStore(copy).readAll(), new RegExp(`line ${before + 1} is not valid JSON`), "the reader did not detect the torn record");

      // Restore from the committed state.
      writeFileSync(copy, git(["show", `HEAD:${path}`]));
      const restored = readFileSync(copy);
      assert.equal(sha256(restored), sha256(committed), "the restored copy does not hash identically");
      assert.equal(gitBlobId(restored), blobId);
      assert.equal(createJsonlStore(copy).readAll().length, before, "the restored store does not hold the committed records");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("🔴 RECOVERY: the EXTERNAL run record — torn by a partial write, detected by the reader, restored from the commit, byte-identical", () => {
  const path = `${BATCH}/first-real-crawl-2026-09-12.jsonl`;
  const committed = dataGit(["show", `HEAD:${path}`]);
  const blobId = String(dataGit(["rev-parse", `HEAD:${path}`], { encoding: "utf8" })).trim();
  assert.equal(gitBlobId(committed), blobId, "the bytes read back from git are not the blob git recorded");
  const dir = mkdtempSync(join(tmpdir(), "almivis-recover-ext-"));
  try {
    const copy = join(dir, "run.jsonl");
    /* A torn last line is how a failed append damages a JSONL store. */
    writeFileSync(copy, Buffer.concat([committed.subarray(0, committed.length - 40)]));
    assert.throws(() => createJsonlStore(copy).readAll(), "a torn store was read as if whole");
    writeFileSync(copy, dataGit(["show", `HEAD:${path}`]));
    assert.equal(gitBlobId(readFileSync(copy)), blobId);
    assert.equal(createJsonlStore(copy).readAll().length, 999);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 RECOVERY: the committed body archive restores byte-identically, and still unpacks to 394 bodies", () => {
  const path = `${BATCH}/bodies-2026-09-12.jsonl.br`;
  const committed = dataGit(["show", `HEAD:${path}`]);
  const blobId = String(dataGit(["rev-parse", `HEAD:${path}`], { encoding: "utf8" })).trim();
  const dir = mkdtempSync(join(tmpdir(), "almivis-recover-br-"));
  try {
    const copy = join(dir, "bodies.br");
    writeFileSync(copy, committed.subarray(0, Math.floor(committed.length / 2)));
    assert.throws(() => readBodyArchive(copy), "a truncated archive was read as if whole");
    writeFileSync(copy, dataGit(["show", `HEAD:${path}`]));
    assert.equal(gitBlobId(readFileSync(copy)), blobId);
    assert.equal(readBodyArchive(copy).size, 394);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
