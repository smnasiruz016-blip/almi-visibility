/**
 * 🔴 RR-103 · SPECIFICATION AMENDMENT 3 — ONE SABOTAGE PER PROTECTION OF THE NEW ROW, THE DENOMINATOR AND THE RESTATED CONTROL.
 *
 *   node test/helpers/rr103-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The method of test/helpers/f90-sabotage.mjs: PRE-FLIGHT (each span exactly once in the bytes live now), each sabotage ALONE, proved to have
 * LANDED, its NAMED test required red, restored by raw-byte sha256, the production trail hashed before and after.
 * Evidence: runs/audit/rr103-sabotage-rr130-2026-10-02.txt — RR-130 moved G05 to the live line (ACCEPTANCES.F91 now names Amendment 1);
 * the 2026-09-30 file is the RR-103 run, kept.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BD = "src/fboard/board.mjs", CAP = "config/fboard/capabilities.mjs", CW = "config/fboard/crosswalk.mjs", AC = "config/fboard/acceptances.mjs";
const T = ["test/spec-amendment-3.test.mjs", "test/spec-amendment-2.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["G01", "DENOMINATOR back to 90", BD, "export const DENOMINATOR = 91;", "export const DENOMINATOR = 90;", "A3·3"],
  /* RR-153: re-anchored to live code — Specification Amendment 4 (6c606b2) appended a sentence to F91's line, so its row hash moved */
  ["G02", "F91 is not the amendment's line (its line hash altered)", CAP, '"lineSha256":"53fedf6de40f1a711bfc0fb5e581e6fd915d14211f5b305df2ff5ce9150c016d"', '"lineSha256":"53fedf6de40f1a711bfc0fb5e581e6fd915d14211f5b305df2ff5ce9150c016e"', "A3·1"],
  ["G03", "the F91 row renamed to a phantom F92 in the capability list", CAP, '"id":"F91","domain":"Core intelligence"', '"id":"F92","domain":"Core intelligence"', "A3·3"],
  ["G04", "a phantom F92 in the crosswalk", CW, '"featureId": "F91"', '"featureId": "F92"', "A3·3"],
  /* G05 repointed 1 Oct 2026 (RR-113): F91 now holds its OWN acceptance, so the old span — adding a second F91 key after F90 — would be
   * overridden by the live F91 line and land without effect. It now replaces F91's own acceptance with another row's. */
  /* RR-153: re-anchored to live code — ACCEPTANCES.F91 now names Amendment 2 (fff60df) */
  ["G05", "F91 given an acceptance that is not its own", AC, "  F91: F91_AMENDMENT_2,\n", "  F91: F90_ORIGINAL,\n", "A3·5"],
  ["G06", "the validator stops refusing a board whose ids are not F01..F{DENOMINATOR}", BD, " || expected.some((x) => !ids.includes(x))) errs.push({ code: \"DENOMINATOR\"", ") errs.push({ code: \"DENOMINATOR\"", "A3·4"],
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
  `RR-103 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "rr103-sabotage-rr130-2026-10-02.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
