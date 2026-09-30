/**
 * 🔴 RR-98 · THE COMMAND-PATH GUARD — ONE SABOTAGE PER PROTECTION (correction record _handoffs d400e73).
 *
 *   node test/helpers/rr98-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/rr98-sabotage-2026-09-30.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BD = "src/fboard/board.mjs", FB = "config/fboard/f-board.mjs", ST = "bin/fboard-status.mjs", BC = "tools/board-audit-consistency.mjs", AC = "tools/audit-trail-census.mjs";
const T = ["test/rr98-command-path-guard.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "the validator fails on a command path that is no governance record", BD, `if (c && c.repo === "_handoffs" && !known.has(c.path)) errs.push(`, "if (false) errs.push(", "FIRING CONTROL"],
  ["S2", "the correction resolves (a historical wrong name restored in source)", FB, `path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F46.md", commit: "6eccb9ba7c62a1b51f2b6d37016c6429154791cc", sha256: "8422c1fd911fff92ffc28ec6b9a9cff07572e2334209c8e41e0e130d60d2828c" }),\n      }),\n      Object.freeze({\n        kind: "VERIFIED",\n        featureId: "F29",`, `path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F29.md", commit: "6eccb9ba7c62a1b51f2b6d37016c6429154791cc", sha256: "8422c1fd911fff92ffc28ec6b9a9cff07572e2334209c8e41e0e130d60d2828c" }),\n      }),\n      Object.freeze({\n        kind: "VERIFIED",\n        featureId: "F29",`, "the real board"],
  ["S3", "fboard-status hands the validator the corpus", ST, "authority: { records: AUTHORITY_CORPUS, now } });", "});", "every production caller"],
  ["S4", "the consistency tool hands the validator the corpus", BC, "const bErrs = boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } });", "const bErrs = boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES });", "every production caller"],
  ["S5", "the trail census hands the validator the corpus", AC, "const errs = boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } });", "const errs = boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES });", "every production caller"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `RR-98 guard sabotage run · ${new Date().toISOString()}`,
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
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
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
writeFileSync(join(REPO, "runs", "audit", "rr98-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
