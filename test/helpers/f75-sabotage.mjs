/**
 * 🔴 F75 · TASK TICKETS — ONE SABOTAGE PER CLAUSE, AGAINST THE CODE LIVE NOW (acceptance _handoffs 01275a9 EVIDENCE).
 *
 *   node test/helpers/f75-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The method of test/helpers/f90-sabotage.mjs: PRE-FLIGHT (each span exactly once), each sabotage ALONE, proved to have LANDED, its NAMED
 * test required red, restored by raw-byte sha256, the production trail hashed before and after. Evidence: runs/audit/f75-sabotage-2026-09-30.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = "src/report/tickets.mjs", R = "src/report/tickets-reader.mjs", B = "bin/task-tickets.mjs", CC = "src/audit/content-checks.mjs";
const T = ["test/f75-task-tickets.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · only the client's ACTIONABLE", C1F = "C1 · FIRING CONTROL", C2 = "C2 · CONTENT for", C2L = "C2 · the declared content-supply list", C3 = "C3 · every recorded evidence";
const C4 = "C4 · the acceptance check IS", C4F = "C4 · FIRING CONTROL", C5I = "C5 · the drafter imports", C5E = "C5 · THE ENTRY POINT";

const SABOTAGES = [
  ["K01", "C1: every finding is the client's", D, "const mine = findings.filter((f) => clientPages.has(f.target_page_id));", "const mine = findings;", C1],
  ["K02", "C1: another client's findings are not counted apart", D, "notThisClient: findings.length - mine.length,", "notThisClient: 0,", C1],
  ["K03", "C1: an unreadable population still drafts tickets", R, "if (unreadable.length) return {", "if (false) return {", C1F],
  ["K04", "C2: every ticket is DEVELOPER", D, ': content.has(check.id) ? "CONTENT" : "DEVELOPER";', ': "DEVELOPER";', C2],
  ["K05", "C2: an unregistered detector's kind is guessed", D, "const kind = !check ? null :", 'const kind = !check ? "DEVELOPER" :', C2],
  ["K06", "C2: the content-supply list drops a check", CC, "NEAR_DUPLICATE.id, TEMPLATE_DOMINANCE.id]);", "NEAR_DUPLICATE.id]);", C2L],
  ["K07", "C3: only the first finding's evidence is kept", D, "fs.flatMap((f) => (Array.isArray(f.evidence) ? f.evidence : []))", "(Array.isArray(fs[0].evidence) ? fs[0].evidence : [])", C3],
  ["K08", "C3: a finding without evidence is not named", D, ".filter((f) => !Array.isArray(f.evidence) || f.evidence.length === 0)", ".filter(() => false)", C3],
  ["K09", "C3: the affected population counts findings, not pages", D, "affectedPages: pages.size,", "affectedPages: fs.length,", C3],
  ["K10", "C4: the acceptance check is written freehand", D, "observes: check.boundary.observes,", 'observes: ["a fresh observation"],', C4],
  ["K11", "C4: a ticket claims to be satisfied", D, "satisfied: SATISFACTION };", "satisfied: true };", C4],
  ["K12", "C4: a missing boundary is not named", D, "else if (!check.boundary) missing.push(", "else if (false) missing.push(", C4F],
  ["K13", "C5: the entry point drops its bound", B, "console.log(`  bound            ${r.bound}`);", "", C5E],
  ["K14", "C5: the reader can write", R, 'import { fileURLToPath } from "node:url";', 'import { fileURLToPath } from "node:url";\nimport { writeFileSync } from "node:fs";', C5I],
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
  `F75 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f75-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
