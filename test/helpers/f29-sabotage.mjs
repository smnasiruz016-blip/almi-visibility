/**
 * 🔴 F29 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs c8eee0c EVIDENCE; RR-96 §4).
 *
 *   node test/helpers/f29-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f29-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IP = "src/audit/issue-priority.mjs", RD = "src/audit/issue-priority-reader.mjs", BIN = "bin/issue-priority.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f29-issue-priority.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C3 a dominated issue is placed below its dominator", IP, "if (ge && gt) return 1;", "", "C3 ·"],
  ["S2", "C3 incomparable issues are never ordered by a guessed weight", IP, "if (ge && gt) return 1;\n  if (le && lt) return -1;\n  return 0;", "if (ge && gt) return 1;\n  if (le && lt) return -1;\n  return a.reach > b.reach ? 1 : a.reach < b.reach ? -1 : 0;", "C3 ·"],
  ["S3", "C3 a tie is never broken by id", IP, "const top = rest.filter((r) => !rest.some((o) => o !== r && compare(o.dims, r.dims) === 1));", "const top = rest.filter((r) => !rest.some((o) => o !== r && (compare(o.dims, r.dims) === 1 || (compare(o.dims, r.dims) === 0 && o.id < r.id))));", "C3 ·"],
  ["S4", "C2 a dimension recorded for one issue only never decides an order", IP, "if (x === null || y === null) return 0; // recorded for one only — never decides an order", "if (x === null || y === null) continue;", "C2/C3 ·"],
  ["S5", "C2 an unrecorded effort is never estimated", IP, `effort: (x) => (typeof x === "number" ? -x : null)`, `effort: (x) => (typeof x === "number" ? -x : 0)`, "C2/C3 ·"],
  ["S6", "C2 affected population is this client's issues of the same class", IP, "dimensionsOf({ ...i, affectedPopulation: perClass.get(i.issueClass) })", "dimensionsOf({ ...i, affectedPopulation: 1 })", "C2/C3 ·"],
  ["S7", "C1 an issue is the client's only when its page is in the client's own partition", RD, "const mine = all.filter((i) => pages.has(i.target_page_id));", "const mine = all;", "C1 ·"],
  ["S8", "C2 reach carries its window", RD, "reachWindow: p ? `${p.windowStart}..${p.windowEnd}` : null,", "reachWindow: null,", "C2 · REAL"],
  ["S9", "C5 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C4/C5 · THE ENTRY POINT"],
  ["S10", "C4 the entry point states a rank changes nothing", BIN, `console.log("  note             a rank changes nothing and predicts no gain");`, "", "C4/C5 · THE ENTRY POINT"],
  ["S11", "C5 the entry point ranks its OWN tenant", BIN, "readClientIssuePriority({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() })", `readClientIssuePriority({ tenantId: "tenant:ffffffffffffffffffffffffffffffff", resolve: createTenantResolver() })`, "C4/C5 · THE ENTRY POINT"],
  ["S12", "C5 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C5 · the ranking"],
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
  `F29 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f29-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
