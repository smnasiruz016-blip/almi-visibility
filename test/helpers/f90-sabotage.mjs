/**
 * 🔴 F90 · FALSIFIABILITY OF FINDINGS — ONE SABOTAGE PER CLAUSE AND GUARD, AGAINST THE CODE LIVE NOW.
 *
 *   node test/helpers/f90-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The method of test/helpers/rr102-sabotage.mjs. Each sabotage removes or bends one clause in the bytes; the NAMED test must turn red for
 * it. PRE-FLIGHT first: each span must occur EXACTLY ONCE in the code live now (written with "\n", matched in the file's own line ending).
 * Each is applied ALONE, proved to have LANDED, its named test required red, the file restored by raw-byte sha256; the production trail is
 * hashed before and after. Evidence: runs/audit/f90-sabotage-2026-09-30.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = "src/audit/f90-falsifiability.mjs", R = "src/audit/f90-falsifiability-reader.mjs", B = "bin/finding-falsifiability.mjs";
const CC = "src/audit/content-checks.mjs", RC = "src/audit/check.mjs";
const T = ["test/f90-falsifiability.test.mjs", "test/rr100-check-boundaries.test.mjs", "test/rr102-content-check-boundaries.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · exactly OPEN", C1F = "C1 · FIRING CONTROLS", C2 = "C2 · a held method", C3 = "C3 · the three parts", C3F = "C3 · FIRING CONTROL";
const C4 = "C4 · PROVED only", C4E = "C4 · FIRING CONTROL: an EMPTY", C4T = "C4 · the stores are the TRACKED", REAL = "REAL · every recorded", C5I = "C5 · the census module", C5E = "C5 · THE ENTRY POINT";

const SABOTAGES = [
  /* C1 */
  ["S01", "C1: an OPEN finding of any verdict is actionable", F, 'if (f.state === "OPEN" && f.verdict === "FAIL") { actionable.push(f); continue; }', 'if (f.state === "OPEN") { actionable.push(f); continue; }', C1],
  ["S02", "C1: a second store's copies are not counted", F, "        cur.copies += e.copies;\n", "", C1],
  ["S03", "C1: a supersession with no recorded move is ignored", F, 'if (e.state === "OPEN" && namedInSupersedes.has(id)) unreadable.push(', "if (false) unreadable.push(", C1F],
  ["S04", "C1: one finding reading differently across stores is ignored", F, "if (key(cur) !== key(seen)) unreadable.push(", "if (false) unreadable.push(", C1F],
  ["S05", "C1: unparseable lines are ignored", F, "if (unparseable > 0) unreadable.push(", "if (false) unreadable.push(", C1F],
  ["S06", "C1: lifecycle errors are ignored", F, "if (errors.length) unreadable.push(", "if (false) unreadable.push(", C1F],
  /* C2 */
  ["S07", "C2: a version mismatch is not named", F, "else if (check.version !== finding.detector_version) missing.push(", "else if (false) missing.push(", C2],
  ["S08", "C2: an undeclared live version is assumed", F, "else if (check.version === undefined) missing.push(", "else if (false) missing.push(", C2],
  /* C3 */
  ["S09", "C3: OBSERVATION written freehand", F, "observation = check.boundary.observes;", 'observation = ["a fresh observation of the page"];', C3],
  ["S10", "C3: a missing boundary is not named", F, "} else if (!check.boundary) {", "} else if (false) {", C3F],
  /* C4 */
  ["S11", "C4: a non-falsifiable finding does not disprove", F, ': notFalsifiable > 0 ? "DISPROVED" : "PROVED";', ': "PROVED";', C4],
  ["S12", "C4: an empty population is proved", F, 'population.unreadable.length > 0 || refutations.length === 0 ? "COULD-NOT-PROVE"', 'population.unreadable.length > 0 ? "COULD-NOT-PROVE"', C4E],
  ["S13", "C4: classes merged", F, "const c = (byClass[r.issueClass] ??= ", 'const c = (byClass["all"] ??= ', C4],
  ["S14", "C4: untracked stores are read", R, '["ls-files", "-z", "--", "runs"]', '["ls-files", "-z", "--cached", "--others", "--", "runs"]', C4T],
  /* C5 */
  ["S15", "C5: the reader can write", R, 'import { readFileSync } from "node:fs";', 'import { readFileSync, writeFileSync } from "node:fs";', C5I],
  ["S16", "C5: the entry point drops its bound", B, "console.log(`  bound            ${c.bound} · ${storesListed} tracked store(s) listed`);", "", C5E],
  /* the held method's declarations */
  ["S17", "HELD METHOD: a check's declared version drifts from what it stamps", CC, '  id: "thin-content",\n  version: "1",', '  id: "thin-content",\n  version: "2",', REAL],
  ["S18", "HELD METHOD: the registry drops the declared version", RC, "boundary: validBoundary(id, boundary), version });", "boundary: validBoundary(id, boundary) });", REAL],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F90 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const f = inEol(text, from);
  const at = text.indexOf(f);
  writeFileSync(join(REPO, file), text.slice(0, at) + inEol(text, to) + text.slice(at + f.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [];
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f90-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
