/**
 * 🔴 EVERY EXIT FROM THE PAGE-BUILD RUNNER DRAINS STDOUT FIRST — PROVED STRUCTURALLY.
 *
 * `process.exit()` forces the process down with asynchronous stdout writes still pending, and
 * stdout IS asynchronous when it is a pipe — which is what `spawnSync` gives a child and what
 * CI runs everything through. A runner that prints its verdict and exits at once can lose the
 * tail of its own report while still returning the right exit code: a result that looks
 * complete and is not.
 *
 * 🔴 WHAT THIS TEST DOES AND DOES NOT CLAIM. It corrects and guards an UNSAFE PROPERTY. It was
 * found while investigating #99's intermittent CI failure, and whether it caused that failure
 * is UNKNOWN and is NOT claimed here. Eliminating other explanations did not prove this one.
 *
 * ── WHY A CHOKE POINT AND NOT FLOW ANALYSIS ────────────────────────────────
 * Asking "does this exit path print first?" means asking about reachability, and reachability
 * in JavaScript is where "cannot determine" multiplies: callbacks, dynamic dispatch, writes
 * inside imported helpers. So instead there is ONE authorised exit helper, every exit goes
 * through it, and the question becomes decidable by reading: is there a `process.exit(`
 * anywhere outside that helper? No analysis, no blind spots.
 */
import test from "node:test";
import { declaredWorld } from "./helpers/declared-world.mjs";
/* F02: every entry point decides its tenant first — the runs below go through a DECLARED FIXTURE WORLD (never the real population). */
const WORLD = declaredWorld();
process.on("exit", () => WORLD.cleanup());
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PRODUCER = "bin/build-page.mjs";
const HELPER = "exitAfterDrain";

/**
 * Comment lines are documentation; the header names `process.exit()` precisely to explain it.
 *
 * 🔴 THIS MASKER IS DELIBERATELY LINE-BASED AND STATELESS. DO NOT GIVE IT BLOCK-COMMENT STATE.
 *
 * It fails toward UNSAFE, never toward SAFE. Inside a real `/* … *\/` block it will flag
 * commented-out text containing `process.exit(` as a breach — a FALSE POSITIVE. That is noisy
 * and it is the safe direction: a guard that cries wolf gets investigated, a guard that stays
 * quiet gets believed.
 *
 * 🔴 AND THE OBVIOUS FIX IS THE DANGEROUS ONE. The first person that false positive
 * inconveniences will want to give this masker block-comment state — and a STATEFUL masker is
 * exactly the shape that can SWALLOW real code and report SAFE. This repository has already
 * paid for the mirror of that error: tools/product-boundary.mjs masks comments only, so a
 * `why:` string literal was scanned as CODE and produced a real breach.
 *
 * SO: any change giving this masker block-comment state, or any other stateful behaviour, MUST
 * re-run the sabotage limb that places a genuine `process.exit(9)` on the line following a
 * string literal containing `/*` before it is accepted.
 *
 *   SHAPES PROVEN (16 September 2026, runs/audit/pr99-undrained-exit-red-2026-09-16.txt):
 *     · real code on the line following a string literal containing `/*` — CAUGHT
 *   SHAPES NOT PROVEN:
 *     · real code inside an actual multi-line block comment — not exercised, and by
 *       inspection this masker reads it the FALSE-POSITIVE way, not the swallowing way
 */
const isComment = (l) => /^\s*(\/\/|\*|\/\*)/.test(l);

/**
 * THREE STATES, AND THE THIRD FAILS.
 *
 * 🔴 CANNOT_DETERMINE is never counted as SAFE and never omitted. A guard that silently passes
 * what it could not read reports a safety it never established — the exact defect family this
 * repository has corrected twice already (gateOf wrote UNGATED when it could not determine;
 * findCopiedFacts wrote silence when it could not check).
 */
export function exitDrainVerdict(source) {
  if (typeof source !== "string" || source.trim() === "") {
    return { state: "CANNOT_DETERMINE", why: `${PRODUCER} could not be read as text` };
  }
  const lines = source.split(/\r?\n/);
  const defIdx = lines.findIndex((l) => new RegExp(`function\\s+${HELPER}\\s*\\(`).test(l));
  if (defIdx === -1) {
    return { state: "CANNOT_DETERMINE", why: `no \`function ${HELPER}(\` definition found in ${PRODUCER}` };
  }
  let depth = 0;
  let opened = false;
  let endIdx = -1;
  for (let i = defIdx; i < lines.length; i += 1) {
    for (const ch of lines[i]) {
      if (ch === "{") { depth += 1; opened = true; } else if (ch === "}") depth -= 1;
    }
    if (opened && depth === 0) { endIdx = i; break; }
  }
  if (endIdx === -1) {
    return { state: "CANNOT_DETERMINE", why: `${HELPER}'s definition in ${PRODUCER} does not close — braces could not be matched` };
  }
  const outside = [];
  lines.forEach((l, i) => {
    if (i >= defIdx && i <= endIdx) return; // the helper's own exit is the authorised one
    if (isComment(l)) return;
    if (l.includes("process.exit(")) outside.push(i + 1);
  });
  return outside.length
    ? { state: "UNSAFE", why: `direct process.exit( outside ${HELPER} at line(s) ${outside.join(", ")}`, outside }
    : { state: "SAFE", helperLines: [defIdx + 1, endIdx + 1], outside: [] };
}

test(`🔴 STRUCTURAL: every exit in ${PRODUCER} routes through ${HELPER} — no direct process.exit( survives`, () => {
  let source = null;
  try {
    source = readFileSync(join(REPO, PRODUCER), "utf8");
  } catch (e) {
    source = null; // a read failure is CANNOT_DETERMINE, never a pass
  }
  const v = exitDrainVerdict(source);

  const tally = { SAFE: 0, UNSAFE: 0, CANNOT_DETERMINE: 0 };
  tally[v.state] += 1;

  /* 🔴 THE GUARD STATES ITS OWN SCOPE, IN ITS OWN OUTPUT — a future reader runs this test, they
   * do not read the brief that commissioned it. It scans ONE module. Other modules reached by
   * this runner hold their own process.exit( calls (src/product-cli.mjs among them), and this
   * GREEN says nothing about them. They are recorded as a separate out-of-scope finding. */
  const scope =
    `scope: this guard scans ${PRODUCER} ONLY. A pass does NOT claim that every exit reachable ` +
    "from this runner drains — exits in imported modules are outside it and are recorded separately.";

  assert.notEqual(v.state, "CANNOT_DETERMINE", `🔴 CANNOT_DETERMINE — ${v.why ?? "unstated"}. Unreadable is NEVER a pass. ${scope}`);
  assert.equal(v.state, "SAFE", `🔴 ${v.state} — ${v.why ?? ""}. ${scope}`);
  assert.deepEqual(v.outside, [], "a direct process.exit( outside the authorised helper");
  assert.deepEqual(tally, { SAFE: 1, UNSAFE: 0, CANNOT_DETERMINE: 0 });
});

test("🔴 CONTROL: the guard FIRES on the unsafe shape, and REFUSES to guess on an unreadable one", () => {
  const safe = `function ${HELPER}(code) {\n  process.exit(code);\n}\n${HELPER}(0);\n`;
  assert.equal(exitDrainVerdict(safe).state, "SAFE");

  const unsafe = `function ${HELPER}(code) {\n  process.exit(code);\n}\nprocess.exit(2);\n`;
  const u = exitDrainVerdict(unsafe);
  assert.equal(u.state, "UNSAFE", "a direct exit outside the helper was not caught");
  assert.deepEqual(u.outside, [4]);

  // No helper at all, and an empty module: both unreadable, neither a pass.
  assert.equal(exitDrainVerdict("process.exit(1);\n").state, "CANNOT_DETERMINE");
  assert.equal(exitDrainVerdict("").state, "CANNOT_DETERMINE");
  assert.equal(exitDrainVerdict(null).state, "CANNOT_DETERMINE");
});

/**
 * 🔴 TWO CLAIMS OF UNEQUAL WEIGHT, AND THE TEST SAYS WHICH IS WHICH.
 *
 *   (a) THE BINARY STILL TERMINATES, over a pipe, within a bound — platform-independent. A
 *       green here is real evidence, and it is the thing that would catch the drain being
 *       replaced by a hang, which is worse than the truncation it replaces.
 *   (b) THE TAIL IS PRESENT — NOT PROBATIVE ON THIS PLATFORM. Windows pipe-backed stdout
 *       writes are SYNCHRONOUS, so the tail would be here with or without the drain. This
 *       assertion is meaningful only on a POSIX runner. Do not read a local green on (b) as
 *       the drain working: that is symptom-absence reasoning on a platform where the symptom
 *       cannot occur.
 *
 * The STRUCTURAL test above is what proves the property. It is static and platform-independent.
 * TTY-attached stdout is NOT exercised here and is left untested.
 */
test("🔴 BOUNDED EXIT: over a PIPE the runner terminates and does not hang (a); the tail is present (b, not probative on Windows)", () => {
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const out = mkdtempSync(join(REPO, ".test-scratch", "drain-"));
  const BOUND_MS = 60_000;
  let r;
  const started = Date.now();
  try {
    // stdio defaults to "pipe" — the shape spawnSync gives and the shape CI uses.
    r = spawnSync(process.execPath, WORLD.argv(["bin/build-page.mjs", "--product=almi-oet", "--all-slugs", `--out=${out}`, "--confirm"]), {
      cwd: REPO, encoding: "utf8", timeout: BOUND_MS, env: WORLD.envWith(),
    });
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  const elapsed = Date.now() - started;

  // (a) — platform-independent, and the reason this test exists alongside the structural one.
  assert.equal(r.signal, null, `(a) HANG: the runner was killed after ${BOUND_MS}ms — a drain that never completes is worse than a truncated one`);
  assert.equal(r.error, undefined, `(a) the runner did not complete: ${r.error?.message ?? ""}`);
  assert.ok(elapsed < BOUND_MS, `(a) the runner took ${elapsed}ms, at or beyond the ${BOUND_MS}ms bound`);
  assert.equal(r.status, 2, "(a) the fail-closed refusal must still exit 2 after draining");

  // (b) — meaningful on POSIX CI, NOT probative on Windows where pipe writes are synchronous.
  assert.match(r.stdout, /ACCEPTED \d+ of \d+ candidate\(s\)/, "(b) the summary tail is missing — probative on POSIX only");
  assert.match(r.stdout, /\[refused\] nothing written for /, "(b) the refusal tail is missing — probative on POSIX only");
});
