/**
 * 🔴 THE RUN EVIDENCE IS BYTES, AND NO CHECKOUT MAY CONVERT THEM — FOR THE WHOLE CLASS, NOT ONE FILE.
 *
 * On 13 September 2026 a Windows checkout (core.autocrlf=true) rewrote every one of the 69 tracked
 * text files under runs/ as CRLF: only runs/crawl/*.br and runs/owner-verification/** carried `-text`.
 * test/renderer.test.mjs:266 caught it — for ONE file, and only because it happened to pin that file's
 * blob. This file holds every tracked file under runs/ to the same law.
 *
 * The mechanism is E-CL-2/E-CL-3's (test/owner-ruling.test.mjs), not a second one: git is TOLD the
 * core.autocrlf setting with `-c`, never left to this machine's config, so the assertion means the same
 * thing on the Windows machine and on the Linux runner.
 *
 * 🔴 PINNED TO THE INDEX, NOT TO HEAD. A checkout writes from the index, and in CI and in a clean clone the
 * index IS HEAD. Pinning HEAD would also fail a PR at the moment it stages new evidence, before commit —
 * a red that says nothing about line endings.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const git = (args, input) =>
  execFileSync("git", args, { cwd: REPO, encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 }).trim();

/** Every tracked file under runs/, with the blob the index holds for it. */
const TRACKED = git(["ls-files", "-s", "-z", "--", "runs"])
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const [meta, path] = entry.split("\t");
    return { path, blob: meta.split(" ")[1] };
  });

/** Hash many working-tree files in ONE git call, with the filters a given config would apply. */
const hashPaths = (config, paths) => git([...config, "hash-object", ...(config.length ? [] : ["--no-filters"]), "--stdin-paths"], `${paths.join("\n")}\n`).split("\n");

/** What git would store for BYTES at PATH under core.autocrlf=<value> — E-CL-2's exact call. */
const blobAs = (path, bytes, autocrlf) =>
  git(["-c", `core.autocrlf=${autocrlf}`, "hash-object", "--stdin", `--path=${path}`], bytes);

/** The bytes a Windows checkout WITHOUT protection writes: every LF as CRLF. Byte-preserving (latin1). */
const asCrlf = (bytes) => Buffer.from(bytes.toString("latin1").replace(/\r?\n/g, "\r\n"), "latin1");
const isText = (bytes) => !bytes.includes(0) && bytes.includes(0x0a);

/**
 * 🔴 THE RULE, shared by the real run and its control so the control cannot pass on a different code path.
 *
 * It starts from the COMMITTED bytes (the blob), never the working tree. A first version read the working
 * tree — which on the machine that found the defect was already CRLF — so the "rewrite" changed no byte and
 * the check could not land. It refused, as it should, instead of passing.
 */
function launderedByConversion(path, blob) {
  const bytes = execFileSync("git", ["cat-file", "blob", blob], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 });
  if (!isText(bytes)) return null;
  const crlf = asCrlf(bytes);
  assert.notDeepEqual(crlf, bytes, `${path}: the CRLF rewrite changed no byte — the check would not land`);
  return ["true", "false"].filter((autocrlf) => blobAs(path, crlf, autocrlf) === blob);
}

test("🔴 the population exists before the guard runs: tracked files under runs/, text AND binary", () => {
  assert.ok(TRACKED.length > 70, `only ${TRACKED.length} tracked files under runs/ — the guard would police almost nothing`);
  const paths = TRACKED.map((t) => t.path);
  /* 🔴 20 September 2026: the two named sentinels used to be runs/crawl/first-real-crawl-2026-09-12.jsonl
   * and runs/crawl/bodies-2026-09-12.jsonl.br — one text, one binary. The observation batch moved to the
   * external data repository, and with it the ONLY binary files tracked under runs/. What that pair
   * caught here (that this law polices a real, mixed population) is now caught in two places: the text
   * half below, and the batch's own byte law in test/observation-batch.test.mjs, which holds the moved
   * files to their recorded sha256 AND re-checks them under core.autocrlf=true/false in the repository
   * that now stores them. Nothing about the binary class went unpoliced; it changed address. */
  for (const p of ["runs/evidence/evidence.jsonl", "runs/audit/findings.jsonl"]) {
    assert.ok(paths.includes(p), `${p} is not tracked — the population is not the one this test was written for`);
  }
  assert.equal(paths.filter((p) => p.startsWith("runs/crawl/")).length, 0, "a runs/crawl file is tracked again — the observation batch belongs in the external data repository");
});

test("🔴 every tracked file under runs/ is checked out as its committed bytes — the same blob with core.autocrlf=true, =false, and with no filter at all", () => {
  const paths = TRACKED.map((t) => t.path);
  const views = {
    "core.autocrlf=true": hashPaths(["-c", "core.autocrlf=true"], paths),
    "core.autocrlf=false": hashPaths(["-c", "core.autocrlf=false"], paths),
    "the raw checked-out bytes": hashPaths([], paths),
  };
  const offenders = [];
  TRACKED.forEach((t, i) => {
    for (const [view, blobs] of Object.entries(views)) if (blobs[i] !== t.blob) offenders.push(`${t.path} (${view})`);
  });
  assert.deepEqual(offenders, [], `${offenders.length} checked-out evidence file(s) differ from their committed blob`);
});

test("🔴 no line-ending conversion can LAUNDER a rewritten evidence file: a CRLF copy never hashes to the committed blob, under either core.autocrlf", () => {
  const offenders = [];
  let textFiles = 0;
  for (const { path, blob } of TRACKED) {
    const laundered = launderedByConversion(path, blob);
    if (laundered === null) continue;
    textFiles += 1;
    if (laundered.length) offenders.push(`${path} (core.autocrlf=${laundered.join(",")})`);
  }
  assert.ok(textFiles > 60, `only ${textFiles} text files checked — the law would be weak`);
  assert.deepEqual(
    offenders,
    [],
    `${offenders.length} evidence file(s) are subject to EOL conversion: a Windows CRLF rewrite of them hashes to the SAME blob, ` +
      "so a blob pin cannot see it and a sha256 of the checked-out bytes disagrees across machines. runs/** must carry -text.",
  );
});

test("CONTROL: the same check DOES see conversion on an ordinary text file outside runs/ — it is measuring the attribute, not passing by construction", () => {
  const blob = git(["ls-files", "-s", "--", "README.md"]).split(" ")[1];
  const laundered = launderedByConversion("README.md", blob);
  assert.deepEqual(laundered, ["true", "false"], "README.md is text=auto — a CRLF copy should normalise to its blob under both settings");
});
