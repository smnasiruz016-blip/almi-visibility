/**
 * 🔴 A BYTE-PRESERVING TARGETED EDIT, FOR A FILE WITH MIXED LINE ENDINGS.
 *
 * bin/quote-match.mjs holds 115 CRLF lines and ONE bare LF. Every ordinary patch mechanism in this repository
 * normalises before matching and restores a single style on write, which would rewrite the one odd line and 115
 * untouched ones with it — a whole-file diff to change four lines. The exact-literal codemod refuses such a file
 * outright, and correctly.
 *
 * This edits the BYTES. It finds each anchor as a byte sequence, replaces exactly that range, and leaves every
 * other byte alone. It never decodes the file, never splits it into lines, and never writes a line ending it was
 * not given. An anchor that does not occur exactly once is refused, so a miss cannot land somewhere unlooked-at.
 *
 *   node test/helpers/byte-preserving-edit.mjs <spec.json> [--apply]
 *
 * The spec is the same shape the codemod takes: [{ file, replacements: [[from, to], ...] }].
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** Endings counted from the bytes, never from a decoded string. */
export function endingsOf(buf) {
  let crlf = 0, lf = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] === 0x0a) { if (i > 0 && buf[i - 1] === 0x0d) crlf += 1; else lf += 1; }
  }
  return { crlf, lf };
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/** Every occurrence of `needle` in `hay`, as byte offsets. */
function offsets(hay, needle) {
  const found = [];
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at === -1) return found;
    found.push(at);
    from = at + 1;
  }
}

export function applyByteEdits(spec, { apply = false, repo = REPO } = {}) {
  const results = [];
  for (const entry of spec) {
    const path = join(repo, entry.file);
    const before = readFileSync(path);
    let buf = before;
    const problems = [];

    for (const [from, to] of entry.replacements) {
      const needle = Buffer.from(from, "utf8");
      const at = offsets(buf, needle);
      if (at.length !== 1) { problems.push(`${at.length} occurrence(s) of: ${from.slice(0, 60).split("\n")[0]}`); continue; }
      buf = Buffer.concat([buf.subarray(0, at[0]), Buffer.from(to, "utf8"), buf.subarray(at[0] + needle.length)]);
    }

    const beforeEnd = endingsOf(before);
    const afterEnd = endingsOf(buf);
    const result = {
      file: entry.file, problems,
      before: { ...beforeEnd, sha256: sha(before), bytes: before.length },
      after: { ...afterEnd, sha256: sha(buf), bytes: buf.length },
      /* 🔴 THE ONE-LINE CLAIM THIS TOOL EXISTS TO MAKE: the odd ending survives. The CRLF count may rise if a
       * replacement itself carries CRLF; the BARE-LF count must not move, because nothing here may touch it. */
      bareLfPreserved: beforeEnd.lf === afterEnd.lf,
    };
    if (!problems.length && apply && buf !== before) writeFileSync(path, buf);
    results.push(result);
  }
  return results;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const apply = process.argv.includes("--apply");
  const results = applyByteEdits(spec, { apply });
  let bad = 0;
  for (const r of results) {
    if (r.problems.length) { bad += 1; console.log(`REFUSED ${r.file}`); for (const p of r.problems) console.log(`         ${p}`); continue; }
    if (!r.bareLfPreserved) { bad += 1; console.log(`🔴 ${r.file} — bare-LF count moved ${r.before.lf} -> ${r.after.lf}`); continue; }
    console.log(`${apply ? "EDITED " : "WOULD  "} ${r.file}`);
    console.log(`         endings  CRLF ${r.before.crlf} -> ${r.after.crlf}   bare LF ${r.before.lf} -> ${r.after.lf}   (bare LF preserved)`);
    console.log(`         bytes    ${r.before.bytes} -> ${r.after.bytes}`);
    console.log(`         sha256   ${r.before.sha256.slice(0, 16)} -> ${r.after.sha256.slice(0, 16)}`);
  }
  process.exit(bad === 0 ? 0 : 1);
}
