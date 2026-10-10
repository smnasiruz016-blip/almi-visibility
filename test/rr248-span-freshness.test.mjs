/**
 * 🔴 RR-248 · EVERY SABOTAGE HARNESS'S SPANS ARE FRESH — in the normal suite, so the first commit that rewrites a protected line fails CI.
 *
 * A harness breaks a protection by replacing an exact span of its target. When the target is rewritten, the span stops occurring
 * exactly once, and the harness silently stops proving anything (RR-246 census: 49 stale spans in 26 harnesses; RR-248 re-measured 58
 * in 30, and one harness, f09, that could not build its limbs at all). This file reads every tracked harness's spans with
 * test/support/harness-spans.mjs — each harness evaluated in its own vm context where every write, spawn and network call STOPS — and
 * counts each span in its target. It applies no sabotage, writes nothing and starts no test run.
 *
 *   SF-1  the population: every tracked *sabotage*.mjs harness is read, yields its spans, and stops only at an act (never an error)
 *   SF-2  FRESHNESS: every span occurs EXACTLY ONCE in its target — every stale span is listed by harness, limb, file and count
 *   SF-3  READ ONLY: the reader imports no write; every stand-in STOPS a write, a spawn, the network, a timer and another harness
 *   SF-4  CONTROL: the verdict fires on a span made stale (removed, or doubled) — in memory, on a real harness's real span
 *   SF-5  the two exceptions are pinned by name: rr233's file adapter, f09's dynamic imports — a third is a decision, never a default
 *   SF-6  EVIDENCE IS NEVER OVERWRITTEN: no fixed evidence name, and every evidence write refuses an existing file (RR-248 goal 4)
 *
 * test/helpers/rr248-sabotage.mjs proves these tests can fail on the real tree (one span made stale in a throwaway change, and more).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { harnessFiles, harnessSpans, occurrences, staleOf, probeStandIns, ADAPTERS, DYNAMIC_IMPORT } from "./support/harness-spans.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const HARNESSES = harnessFiles();
let results = null;
const read = async () => {
  if (!results) { results = []; for (const f of HARNESSES) results.push(await harnessSpans(f)); }
  return results;
};

test("SF-1 · the population: every tracked sabotage harness is read and yields its spans, stopping only at an act", async () => {
  assert.ok(HARNESSES.length >= 118, `${HARNESSES.length} tracked harnesses — the RR-247 population is 118`);
  const rs = await read();
  const unread = rs.filter((r) => r.spans.length === 0 || !/^(STOP: |END)/.test(r.ended)).map((r) => `${r.file}: ${r.spans.length} span(s) · ${r.ended}`);
  assert.deepEqual(unread, [], "a harness whose spans cannot be read is a harness nobody can check — make its limb table readable");
  const total = rs.reduce((n, r) => n + r.spans.length, 0);
  console.log(`ℹ SF-1 harnesses ${rs.length} · spans ${total}`);
});

test("SF-2 · FRESHNESS: every harness span occurs exactly once in its target", async () => {
  const stale = staleOf(await read()).map((s) => `${s.harness} · ${s.id ?? "-"} · ${s.file} · occurs ${s.occurrences === -1 ? "nowhere (no such file)" : s.occurrences}`);
  assert.deepEqual(stale, [], `${stale.length} stale span(s): a rewritten line left a sabotage that can no longer break its protection — restate the span to the new exact text (the SAME protection), or report the protection as removed`);
});

test("SF-3 · READ ONLY: the reader imports no write, and every stand-in stops a write, a spawn, the network, a timer and another harness", () => {
  const src = readFileSync(join(REPO, "test/support/harness-spans.mjs"), "utf8");
  const imports = [...src.matchAll(/^import\s+(.+?)\s+from\s+"([^"]+)";/gm)].map((m) => `${m[2]} ${m[1]}`);
  assert.deepEqual(imports.filter((i) => i.startsWith("node:fs ")), ["node:fs { readFileSync, existsSync, readdirSync, statSync, lstatSync, realpathSync }"]);
  assert.deepEqual(imports.filter((i) => i.startsWith("node:child_process ")), ["node:child_process { execFileSync }"], "the one process: git ls-files");
  assert.deepEqual([...src.matchAll(/execFileSync\(\s*"([^"]+)",\s*\[[^\]]*?"(ls-files)"/g)].map((m) => `${m[1]} ${m[2]}`), ["git ls-files"]);
  /* a direct call of a write or a process — the stand-ins' own members (fsStandIn.writeFileSync(…) in probeStandIns) are what STOPS */
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), /(?<![.\w$])(writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|renameSync|copyFileSync|spawnSync|spawn|execSync)\s*\(/);
  const probes = probeStandIns();
  assert.ok(probes.length >= 10);
  assert.deepEqual(probes.filter((p) => !p.stopped).map((p) => p.what), [], "a stand-in performed an act instead of stopping it");
});

test("SF-4 · CONTROL: the verdict fires on a span made stale — removed, or doubled — on a real harness's real span, in memory", async () => {
  const r = (await read()).find((x) => x.file === "test/helpers/f01-sabotage.mjs");
  const s = r.spans.find((x) => x.occurrences === 1 && x.to !== null && !x.to.includes(x.from));
  assert.ok(s, "control: a fresh span whose replacement does not contain it");
  const text = readFileSync(join(REPO, s.file), "utf8");
  assert.equal(occurrences(text, s.from), 1);
  const removed = text.split(s.from).join(s.to);
  const doubled = `${text}\n${s.from}\n`;
  for (const [label, t] of [["removed", removed], ["doubled", doubled]]) {
    const n = occurrences(t, s.from);
    const verdict = staleOf([{ file: r.file, spans: [{ ...s, occurrences: n }] }]);
    assert.equal(verdict.length, 1, `the verdict did not fire on a span ${label} (occurs ${n})`);
  }
  assert.deepEqual(staleOf([{ file: r.file, spans: [{ ...s, occurrences: -1 }] }]).map((v) => v.occurrences), [-1], "a span whose target file is gone");
});

test("SF-5 · the exceptions are pinned by name: one adapter (rr233), one harness with dynamic imports (f09)", () => {
  assert.deepEqual(Object.keys(ADAPTERS), ["test/helpers/rr233-sabotage.mjs"]);
  assert.deepEqual([...DYNAMIC_IMPORT], ["test/helpers/f09-sabotage.mjs"]);
});

test("SF-6 · EVIDENCE IS NEVER OVERWRITTEN: every harness writes its evidence to a new file — never over an earlier run's", () => {
  const offences = [];
  for (const f of HARNESSES) {
    const src = readFileSync(join(REPO, f), "utf8");
    src.split(/\r?\n/).forEach((l, i) => {
      /* a fixed evidence name: a run can only ever write (or refuse) the same file */
      if (/^const (EVIDENCE|OUT) = join\(REPO, "runs", "audit", "[^"$`]+"\);/.test(l)) offences.push(`${f}:${i + 1} a fixed evidence name`);
      /* an evidence write CALL (a statement, never text inside a limb) must refuse an existing file: flag "wx", or an existsSync refusal of that path */
      if (!/^\s*writeFileSync\(/.test(l) || !/runs["', /]+audit|EVIDENCE|\bOUT\b|outArg/.test(l)) return;
      const v = l.match(/writeFileSync\(\s*([A-Za-z_$][\w$]*)\s*,/)?.[1];
      if (!/flag:\s*"wx"/.test(l) && !(v && new RegExp(`existsSync\\(\\s*${v}\\s*\\)`).test(src))) offences.push(`${f}:${i + 1} ${l.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(offences, [], "a harness can replace the evidence of the run that proved it");
  const once = readFileSync(join(REPO, "test/helpers/evidence-once.mjs"), "utf8");
  assert.match(once, /writeFileSync\(join\(repo, rel\), text, \{ flag: "wx" \}\)/, "the shared writer opens no existing file");
  assert.match(once, /\$\{base\}-\$\{stamp\}/, "the shared writer names each run's file by its time");
});
