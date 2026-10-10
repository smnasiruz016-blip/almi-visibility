/**
 * 🔴 RR-102 · THE FOUR CONTENT CHECKS' DECLARED BOUNDARIES — ONE SABOTAGE PER CONDITION, IN BOTH DIRECTIONS, PLUS THE DECLARATIONS.
 *
 *   node test/helpers/rr102-sabotage.mjs --deliberate     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The same method as test/helpers/rr100-sabotage.mjs. NARROW sabotages switch a firing condition off (or move its line inward) in the live
 * code: a "just inside" pair must go red. WIDEN sabotages make the code fire past its declared boundary: a "just outside" pair must go red.
 * DECLARATION sabotages rename, drop or mis-state a declared condition: a drift guard must go red. UNMEASURED sabotages turn an UNKNOWN
 * into a finding. PRE-FLIGHT first: each span must occur EXACTLY ONCE in the code live now (spans are written with "\n" and matched in
 * the file's own line ending). Each sabotage is applied ALONE, proved to have LANDED, its named test required red, the file restored by
 * raw-byte sha256; the production trail is hashed before and after. Evidence: runs/audit/rr102-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CC = "src/audit/content-checks.mjs";
const BOTH = (id) => `BOTH DIRECTIONS · ${id}`;
const T = ["test/rr102-content-check-boundaries.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  /* exact-duplicate */
  ["N01", "exact-duplicate NARROW: another URL with the same hash no longer fires", CC, "if (twins.length === 0) return null;", "if (true) return null;", BOTH("exact-duplicate")],
  ["W01", "exact-duplicate WIDEN: the page's own URL counts as a twin", CC, ".filter((u) => u !== page.canonical_url);", ".filter(() => true);", BOTH("exact-duplicate")],
  /* thin-content */
  ["N02", "thin NARROW: the floor moves in by one word", CC, "if (m.bodyUniqueWordCount >= THIN_UNIQUE_WORD_FLOOR) return null;", "if (m.bodyUniqueWordCount >= THIN_UNIQUE_WORD_FLOOR - 1) return null;", BOTH("thin-content")],
  ["W02", "thin WIDEN: the floor moves out by one word", CC, "if (m.bodyUniqueWordCount >= THIN_UNIQUE_WORD_FLOOR) return null;", "if (m.bodyUniqueWordCount >= THIN_UNIQUE_WORD_FLOOR + 1) return null;", BOTH("thin-content")],
  /* near-duplicate */
  ["N03", "near NARROW: a similarity exactly at the threshold no longer fires", CC, "if (!best || best.score < NEAR_DUPLICATE_THRESHOLD) return null;", "if (!best || best.score <= NEAR_DUPLICATE_THRESHOLD) return null;", BOTH("near-duplicate")],
  ["W03", "near WIDEN: a similarity just below the threshold fires", CC, "if (!best || best.score < NEAR_DUPLICATE_THRESHOLD) return null;", "if (!best || best.score < NEAR_DUPLICATE_THRESHOLD - 0.01) return null;", BOTH("near-duplicate")],
  ["W04", "near WIDEN: a peer at the page's own URL is compared", CC, "if (other.url === page.canonical_url) continue;", "if (false) continue;", BOTH("near-duplicate")],
  /* template-dominance */
  ["N04", "template NARROW: a share exactly at the threshold no longer fires", CC, "if (m.shellShare < TEMPLATE_DOMINANCE_THRESHOLD) return null;", "if (m.shellShare <= TEMPLATE_DOMINANCE_THRESHOLD) return null;", BOTH("template-dominance")],
  ["W05", "template WIDEN: a share just below the threshold fires", CC, "if (m.shellShare < TEMPLATE_DOMINANCE_THRESHOLD) return null;", "if (m.shellShare < TEMPLATE_DOMINANCE_THRESHOLD - 0.01) return null;", BOTH("template-dominance")],
  /* UNMEASURED stays UNKNOWN */
  ["U01", "UNMEASURED: a missing hash becomes silence, not UNKNOWN", CC, "if (!mine?.content_sha256) {", "if (false) {", "an UNMEASURED input"],
  ["U02", "UNMEASURED: thin no longer refuses an unconfident split", CC, "    if (!m.confident) {\n      /**\n       * 🔴 TWO DIFFERENT UNKNOWNS", "    if (false) {\n      /**\n       * 🔴 TWO DIFFERENT UNKNOWNS", "an UNMEASURED input"],
  /* the declarations */
  ["D01", "DECLARATION: a condition renamed away from the proved one", CC, '{ id: "below-unique-word-floor", when:', '{ id: "below-floor", when:', "DRIFT GUARD: each content check's declared conditions"],
  ["D02", "DECLARATION: a stated threshold that is not the live constant", CC, "is ${NEAR_DUPLICATE_THRESHOLD} or more (void below", "is 0.8 or more (void below", "DRIFT GUARD: each declared threshold"],
  ["D03", "DECLARATION: a check loses its boundary entirely", CC, '  boundary: {\n    observes: ["the stored body, split into shell and body by src/audit/shell.mjs"],', '  boundaryDropped: {\n    observes: ["the stored body, split into shell and body by src/audit/shell.mjs"],', "every content detector behind F90"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

/* a span is written with "\n"; in a CRLF checkout it is matched as CRLF — never a looser match */
const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `RR-102 content-check boundary sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "rr102-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
