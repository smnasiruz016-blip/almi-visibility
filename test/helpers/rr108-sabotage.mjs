/**
 * 🔴 RR-108 · THE PACER REPAIR — ONE SABOTAGE PER PROTECTION, AGAINST THE CODE LIVE NOW.
 *
 *   node test/helpers/rr108-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT (each span exactly once), each sabotage ALONE, proved to have LANDED, its NAMED test required red, restored by raw-byte
 * sha256, the production trail hashed before and after; every spawned run is killed after 120 s, so a hang reads as a failure, never a
 * pass. Evidence: runs/audit/rr108-sabotage-2026-10-01.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = "src/crawl/fetcher.mjs", C = "src/crawl/crawler.mjs", P = "src/crawl/preflight.mjs", B = "bin/crawl.mjs";
const T = ["test/rr108-pacer.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S01", "BOUNDARY: exactly at the bound is refused", F, "nowMs - lastStart >= intervalMs;", "nowMs - lastStart > intervalMs;", "BOUNDARY"],
  ["S02", "BOUNDARY: one unit short is allowed", F, "nowMs - lastStart >= intervalMs;", "nowMs - lastStart >= intervalMs - 1;", "BOUNDARY"],
  ["S03", "EARLY WAKE: the pacer waits once and never rechecks (the RR-107 defect)", F, "      await sleepImpl(Math.max(1, Math.ceil(intervalMs - (t - lastStart))));\n    }", "      await sleepImpl(Math.max(1, Math.ceil(intervalMs - (t - lastStart))));\n      lastStart = monotonic(); starts.push({ kind, at: lastStart }); return lastStart;\n    }", "EARLY WAKE-UP"],
  ["S04", "RETRY: a retry is not paced", F, "    await pace(kind);", "    if (kind !== \"retry\") await pace(kind);", "RETRY"],
  ["S05", "ROBOTS: robots.txt is neither paced nor recorded", C, "beforeRequest: () => fetcher.pace(\"robots\")", "beforeRequest: async () => {}", "ROBOTS → FIRST PAGE"],
  ["S06", "RECORD: the run record carries no pacing", C, "      pacing: fetcher.pacing(),", "      pacing: null,", "PRODUCTION APPEND"],
  ["S07", "DETECTION: a 999 ms gap is not counted a breach", F, "const breaches = gaps.filter((g) => g.ms < intervalMs).length;", "const breaches = gaps.filter((g) => g.ms < intervalMs - 1).length;", "DETECTION"],
  ["S08", "VERDICT: a pacing failure still reads KEPT", P, "if (pacing !== undefined && pacing?.ok !== true) failed.push(", "if (false) failed.push(", "CONTROL"],
  ["S09", "VERDICT: the binary does not pass pacing into its verdict", B, "live ? { pacing: run.pacing ?? null } : {}", "{}", "CONTROL"],
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
  `RR-108 pacer sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 120 s`,
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
  let timedOut = false;
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 120000, killSignal: "SIGKILL" });
    timedOut = r.error?.code === "ETIMEDOUT" || r.signal === "SIGKILL";
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red}${timedOut ? " · RUN TIMED OUT (a hang, not a pass)" : ""} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "rr108-sabotage-2026-10-01.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
