/**
 * EXACT-LITERAL CODEMOD — ASSISTANCE, NOT EVIDENCE. Every diff it produces is read before it is trusted.
 *
 * It applies exact-literal replacements and REFUSES anything ambiguous. Every `from` must occur EXACTLY ONCE in
 * the file: zero means the file is not what the spec thought it was, two means the edit would land somewhere
 * nobody looked. Both are refused and nothing is written for that file, so a half-applied edit cannot exist.
 *
 * 🔴 LINE ENDINGS ARE NORMALISED FOR MATCHING AND RESTORED FOR WRITING.
 *
 * This repository holds both styles — measured: bin/acceptance-test.mjs has 229 CRLF and no bare LF, while
 * bin/export.mjs has 75 bare LF and no CRLF. A spec written with "\n" silently matched nothing in the CRLF files,
 * and the refusal above is what caught it rather than a corrupted edit. Matching happens on LF-normalised text;
 * the file is written back in ITS OWN original style, so a routing change never arrives as a whole-file diff.
 *
 * A file with BOTH styles is refused outright: guessing which one to restore would rewrite lines nobody touched.
 *
 *   node test/helpers/exact-replace.mjs --deliberate <spec.json> [--apply]
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const spec = JSON.parse(readFileSync(process.argv.slice(2).find((a) => !a.startsWith("--")), "utf8")); // RR-247: the spec is the first non-flag argument, so --deliberate may stand anywhere
const apply = process.argv.includes("--apply");

/** Count endings from the bytes, never from a shell grep. */
function endings(text) {
  let crlf = 0, lf = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") { if (i > 0 && text[i - 1] === "\r") crlf += 1; else lf += 1; }
  }
  return { crlf, lf };
}

let ok = 0, refused = 0;
for (const entry of spec) {
  const path = join(REPO, entry.file);
  const original = readFileSync(path, "utf8");
  const { crlf, lf } = endings(original);
  const problems = [];

  if (crlf > 0 && lf > 0) {
    console.log(`REFUSED ${entry.file}`);
    console.log(`         MIXED line endings (${crlf} CRLF, ${lf} LF) — restoring one style would rewrite untouched lines`);
    refused += 1;
    continue;
  }

  let text = crlf > 0 ? original.split("\r\n").join("\n") : original;
  for (const [from, to] of entry.replacements) {
    const count = text.split(from).length - 1;
    if (count !== 1) { problems.push(`${count} occurrence(s) of: ${from.slice(0, 70).split("\n")[0]}`); continue; }
    text = text.split(from).join(to);
  }

  if (problems.length) {
    refused += 1;
    console.log(`REFUSED ${entry.file}`);
    for (const p of problems) console.log(`         ${p}`);
    continue;
  }
  const out = crlf > 0 ? text.split("\n").join("\r\n") : text;
  if (out === original) { console.log(`NO-OP   ${entry.file}`); continue; }
  if (apply) writeFileSync(path, out, "utf8");
  ok += 1;
  console.log(`${apply ? "ROUTED " : "WOULD  "} ${entry.file}${crlf > 0 ? "  (CRLF preserved)" : ""}`);
}
console.log(`\n${apply ? "applied" : "dry-run"}: ${ok} file(s) · REFUSED ${refused}`);
process.exit(refused === 0 ? 0 : 1);
