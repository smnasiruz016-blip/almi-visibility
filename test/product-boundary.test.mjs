import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { PRODUCT_WORDS, commentMask, scanSource, distinctLines, neutralityCensus, SHARED_SCOPE, PINNED_HISTORICAL_LINES } from "../tools/product-boundary.mjs";

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
 *
 * 🔴 F02 (24 Sep 2026): the population is the SHARED ENGINE — src/, bin/ AND config/. It used to be src/ alone, and that
 * is how one client's hosts, regulators and private paths sat in bin/ and config/ where nothing looked.
 * ------------------------------------------------------------------ */

test("population: every tracked file under src/, bin/ and config/ is scanned — nothing is skipped", async () => {
  const tracked = execFileSync("git", ["ls-files", ...SHARED_SCOPE], { cwd: REPO, encoding: "utf8" }).split("\n").filter((p) => p.endsWith(".mjs")).sort();
  assert.ok(tracked.length > 0, "git reported no tracked sources — the control itself is broken");
  for (const d of SHARED_SCOPE) assert.ok(tracked.some((f) => f.startsWith(`${d}/`)), `the population holds nothing under ${d}/ — the law would not reach it`);
  const r = await neutralityCensus({ repo: REPO });
  assert.deepEqual(r.files, tracked);
  /* the walk of src/ still agrees with git for the directory that had it */
  const scanned = sourceFiles(SRC_DIR).map((f) => "src/" + f.replace(/\\/g, "/").split("/src/")[1]).sort();
  assert.deepEqual(scanned, tracked.filter((f) => f.startsWith("src/")));
});

test("population: the vocabulary is DECLARED by subject packages, and is not empty", () => {
  assert.ok(PRODUCT_WORDS.length > 0, "no subject package declares a vocabulary — every scan would pass vacuously");
});

/* ------------------------------------------------------------------ *
 * PART THREE — THE LAW.
 * ------------------------------------------------------------------ */

test("🔴 THE SHARED ENGINE NAMES NO CLIENT IN CODE — src/, bin/ and config/, one pinned historical line", async () => {
  const r = await neutralityCensus({ repo: REPO });
  assert.ok(r.files.length > 0, "found no source files to check — the law would be vacuous");
  assert.deepEqual(r.stale.map((s) => s.file), [], "a pinned historical line no longer matches — the pin outlived its reason");
  assert.deepEqual(r.pinned.map((x) => x.file), PINNED_HISTORICAL_LINES.map((x) => x.file));
  if (r.breaches.length === 0) return;
  assert.fail([
    "",
    `the shared engine names a client in CODE on ${r.breaches.length} line(s).`,
    `Comments naming a client: ${r.commentLines} lines — those are DOCUMENTATION and are allowed.`,
    "Subject knowledge belongs in its subject package (subjects/<id>/), handed to the engine through a declaration.",
    "",
    ...r.breaches.slice(0, 20).map((b) => `  ${b.file}:${b.line} [${b.word}] ${b.text.slice(0, 96)}`),
    "",
  ].join("\n"));
});

test("🔴 CONTROL — the same census SEES a client host planted in a real shared file, and an edit to the pinned line", async () => {
  const real = (f) => readFileSync(join(REPO, f), "utf8");
  const planted = await neutralityCensus({ repo: REPO, read: (f) => (f === "bin/facts.mjs" ? `${real(f)}\nconst h = "x.${PRODUCT_WORDS.find((w) => w.includes(".")) ?? PRODUCT_WORDS[0]}";\n` : real(f)) });
  assert.equal(planted.breaches.length, 1, "a planted client term in bin/ was not seen");
  const edited = await neutralityCensus({ repo: REPO, read: (f) => (f === PINNED_HISTORICAL_LINES[0].file ? real(f).replace("node bin/gsc-dimensions.mjs", "node bin/gsc-dimensions.mjs --edited") : real(f)) });
  assert.deepEqual([edited.breaches.length, edited.stale.length], [1, 1], "editing the pinned line did not un-pin it");
});
