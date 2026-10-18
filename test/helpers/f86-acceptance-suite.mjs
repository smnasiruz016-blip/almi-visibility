/**
 * 🔴 F86 · THE ONE ENTRY OF THE INDEPENDENT ACCEPTANCE SUITE (acceptance _handoffs 903f361, RR-283 item 8). Parts and verdicts:
 * src/acceptance/suite.mjs. It runs every part and prints PASS / FAIL per part (C1); with --clone it first runs the same entry in a fresh
 * sibling clone of the current commit (RR-247's method: beside this repository, so the declared data resolves) and records that run's
 * verdict too (C2). Each harness limb runs alone and restores by hash (its own engine); the production trail is hashed before and after.
 *
 *   node test/helpers/f86-acceptance-suite.mjs --deliberate [--clone]      NOT part of `npm test`
 *
 * Evidence: runs/audit/f86-acceptance-suite-<date>T<hhmm>.txt, written once (wx). Nothing fetched; nothing tracked written.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PARTS, partVerdict, suiteVerdict, cloneVerdict, countsIn, report, VERDICT } from "../../src/acceptance/suite.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRAIL = "audit-trail/events.jsonl";
const CLONE = process.argv.includes("--clone"), IN_CLONE = process.argv.includes("--in-clone");
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `f86-acceptance-suite-${IN_CLONE ? "clone-" : ""}${DAY}.txt`);
if (!IN_CLONE && existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const sha = (b) => createHash("sha256").update(b).digest("hex");
const git = (cwd, ...a) => spawnSync("git", a, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
const head = git(REPO, "rev-parse", "HEAD").stdout.trim();
const trailBefore = sha(readFileSync(join(REPO, TRAIL)));
const statusBefore = git(REPO, "status", "--porcelain", "--untracked-files=no").stdout;
const node = (args) => spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", timeout: 1800000, maxBuffer: 1 << 28 });
const lines = [];
const say = (l) => { lines.push(l); console.log(l); };

/* C2 · the same entry, first, in a fresh sibling clone of this commit */
let clone = null;
if (CLONE) {
  const dir = mkdtempSync(join(REPO, "..", "f86-clone-"));
  try {
    const c = git(join(REPO, ".."), "clone", "--quiet", "--no-local", REPO, dir);
    const co = git(dir, "checkout", "--quiet", head);
    const t0 = Date.now();
    const r = c.status === 0 && co.status === 0 ? spawnSync(process.execPath, ["test/helpers/f86-acceptance-suite.mjs", "--deliberate", "--in-clone"], { cwd: dir, encoding: "utf8", timeout: 5400000, maxBuffer: 1 << 28, env: { ...process.env, ALMIVISIBILITY_SEALED_STORE: "" } }) : { status: null, stdout: "", stderr: `clone ${c.status} checkout ${co.status}` };
    const suite = /^ {2}SUITE {17}(PASS|FAIL)/m.exec(r.stdout ?? "")?.[1] ?? null;
    const trackedChanged = git(dir, "status", "--porcelain", "--untracked-files=no").stdout.trim() !== "";
    clone = cloneVerdict({ finished: r.status !== null && !r.error, exit: r.status, suite, trackedChanged });
    say(`CLONE · a fresh sibling clone of ${head.slice(0, 12)} · ${Math.round((Date.now() - t0) / 1000)} s · ${clone.verdict}${clone.why.length ? ` — ${clone.why.join("; ")}` : ""}`);
    for (const l of String(r.stdout ?? "").split("\n").filter((l) => /^ {2}[A-Z_]+ |^ {4}REAL/.test(l))) say(`  clone | ${l.trim()}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/* C1 · every part, here */
const verdicts = [], counts = [];
for (const part of PARTS) {
  const runs = part.kind === "TESTS"
    ? part.files.map((file) => { const r = node(["--test", file]); return { file, exit: r.status, out: `${r.stdout}${r.stderr}` }; })
    : part.limbs.map((l) => { const r = node([l.harness, "--deliberate", `--only=${l.limb}`]); return { limb: l.limb, exit: r.status, out: `${r.stdout}${r.stderr}` }; });
  if (part.counts) for (const r of runs) for (const c of countsIn(r.out)) counts.push(`${r.file.replace(/^test\//, "")} · ${c.slice(0, 300)}`);
  verdicts.push(partVerdict(part, runs));
}
for (const l of report({ where: IN_CLONE ? "IN A FRESH CLONE" : "HERE", head, verdicts, counts })) say(l);
const trailAfter = sha(readFileSync(join(REPO, TRAIL)));
const tracked = git(REPO, "status", "--porcelain", "--untracked-files=no").stdout === statusBefore;
say(`  trail unchanged ${trailAfter === trailBefore} · tracked files unchanged ${tracked}${clone ? ` · clone ${clone.verdict}` : ""}`);
const ok = suiteVerdict(verdicts).verdict === VERDICT.PASS && trailAfter === trailBefore && tracked && (!clone || clone.verdict === VERDICT.PASS);
if (!IN_CLONE) { mkdirSync(dirname(EVIDENCE), { recursive: true }); writeFileSync(EVIDENCE, `F86 acceptance suite run · ${new Date().toISOString()}\n${lines.join("\n")}\n`, { flag: "wx" }); }
process.exitCode = ok ? 0 : 1;
