import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { PRODUCT_WORDS, commentMask, scanSource, distinctLines } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC_DIR = join(REPO, "src");

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (entry.endsWith(".mjs")) out.push(full);
  }
  return out.sort();
}

const inComment = (src, needle) => Boolean(commentMask(src)[src.indexOf(needle)]);

/* ------------------------------------------------------------------ *
 * PART ONE — PROVE THE SCANNER BEFORE TRUSTING A ZERO FROM IT.
 *
 * 🔴 A scanner that classified everything as "comment" would report zero
 * breaches and pass this file's law for ever. So the law is worth exactly as
 * much as these fixtures, and they come first.
 * ------------------------------------------------------------------ */

test("scanner: a line comment naming a product is a COMMENT, not code", () => {
  const { code, comment } = scanSource('const x = 1; // nursing is the first page\n');
  assert.equal(code.length, 0);
  assert.equal(comment.length, 1);
  assert.equal(comment[0].word, "nursing");
});

test("scanner: a block comment naming a product is a COMMENT, across lines", () => {
  const { code, comment } = scanSource("/*\n * hcpc publishes 1400/300\n */\nconst y = 2;\n");
  assert.equal(code.length, 0);
  assert.equal(comment.length, 1);
});

test("scanner: 🔴 A STRING LITERAL IS CODE — that is the dependency we are hunting", () => {
  const { code, comment } = scanSource('return q.includes("profession=");\n');
  assert.equal(comment.length, 0);
  assert.equal(code.length, 1, "a quoted product word is a hard dependency, not documentation");
  assert.equal(code[0].word, "profession");
});

test("scanner: `//` inside a string is NOT a comment", () => {
  const src = 'const u = "https://example.com/nursing";\n';
  assert.equal(inComment(src, "nursing"), false);
  assert.equal(scanSource(src).code.length, 1);
});

test("scanner: 🔴 a regex containing a quote does not run away — render.mjs really has one", () => {
  // The real line from src/page/render.mjs. A naive scanner opens a string at
  // the `"` inside /"/ and mis-reads everything after it.
  const src = 'const e = String(s).replace(/"/g, "&quot;");\nconst v = "nursing";\n';
  assert.equal(inComment(src, "nursing"), false);
  assert.equal(scanSource(src).code.length, 1);
});

test("scanner: a regex may contain a slash in a character class without ending early", () => {
  const src = 'const r = /<\\/(a|b)[^/]*>/gi;\n// nurse\n';
  const { code, comment } = scanSource(src);
  assert.equal(code.length, 0);
  assert.equal(comment.length, 1);
});

test("scanner: division is not mistaken for a regex literal", () => {
  const src = "const days = (a - b) / 86400000;\nconst k = 'oet';\n";
  assert.equal(inComment(src, "oet"), false);
  assert.equal(scanSource(src).code.length, 1);
});

test("scanner: a template literal and its ${} are both code", () => {
  const src = "const t = `<${tag} data-x=\"nurse\">`;\n";
  assert.equal(scanSource(src).code.length, 1);
});

test("scanner: 🔴 SABOTAGE — a comment marker inside a template does not blind the rest of the file", () => {
  const src = "const t = `a // b`;\nconst p = 'ahpra';\n";
  assert.equal(inComment(src, "ahpra"), false, "the scanner went blind after a template");
});

test("scanner: every listed product word is actually detected", () => {
  for (const word of PRODUCT_WORDS) {
    const { code } = scanSource(`const v = "${word}";\n`);
    assert.equal(code.length, 1, `PRODUCT_WORDS lists "${word}" but the scanner cannot see it`);
  }
});

test("scanner: case is ignored — NMCN and AHPRA are the same breach as nmc and ahpra", () => {
  assert.equal(scanSource('const v = "NMCN";\n').code.length, 1);
  assert.equal(scanSource('const v = "AHPRA";\n').code.length, 1);
});

/* ------------------------------------------------------------------ *
 * PART TWO — THE POPULATION. A LAW OVER AN EMPTY SET IS NOT A LAW.
 * ------------------------------------------------------------------ */

test("population: every tracked file under src/ is scanned — nothing is skipped", () => {
  const tracked = execFileSync("git", ["ls-files", "src"], { cwd: REPO, encoding: "utf8" })
    .split("\n")
    .filter((p) => p.endsWith(".mjs"))
    .sort();
  assert.ok(tracked.length > 0, "git reported no tracked sources — the control itself is broken");

  const scanned = sourceFiles(SRC_DIR)
    .map((f) => "src/" + f.replace(/\\/g, "/").split("/src/")[1])
    .sort();

  // 🔴 git is an INDEPENDENT census of the population. If the walk ever grows a
  // skip list, an ignore rule or a silent try/catch, these two disagree here
  // rather than quietly shrinking the set the law is enforced over.
  assert.deepEqual(scanned, tracked);
});

/* ------------------------------------------------------------------ *
 * PART THREE — THE LAW.
 * ------------------------------------------------------------------ */

test("🔴 src/ NAMES NO PRODUCT IN CODE — AlmiVisibility is the system, not AlmiOET", () => {
  const files = sourceFiles(SRC_DIR);
  assert.ok(files.length > 0, "found no source files to check — the law would be vacuous");

  const breaches = [];
  let commentLines = 0;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const { code, comment } = scanSource(src);
    commentLines += distinctLines(comment);
    if (code.length > 0) breaches.push({ file, code });
  }

  if (breaches.length === 0) return;

  const total = breaches.reduce((n, b) => n + b.code.length, 0);
  const lines = breaches.reduce((n, b) => n + distinctLines(b.code), 0);
  const report = breaches
    .map((b) => {
      const rel = b.file.replace(/\\/g, "/").split("/src/")[1];
      const byLine = new Map();
      for (const o of b.code) if (!byLine.has(o.line)) byLine.set(o.line, o.text);
      const rows = [...byLine.entries()];
      const shown = rows.slice(0, 6).map(([line, text]) => `      ${line}: ${text.slice(0, 96)}`);
      const more = rows.length > 6 ? [`      … and ${rows.length - 6} more lines`] : [];
      return [`  src/${rel} — ${distinctLines(b.code)} code lines`, ...shown, ...more].join("\n");
    })
    .join("\n");

  assert.fail(
    [
      "",
      `src/ names a product in CODE on ${lines} lines (${total} occurrences).`,
      `Comments naming a product: ${commentLines} lines — those are DOCUMENTATION and are allowed.`,
      "",
      "The system may not know which product it is serving. Move the knowledge into",
      "products/<product>/ and hand it to the engine as a descriptor.",
      "",
      report,
      "",
    ].join("\n"),
  );
});
