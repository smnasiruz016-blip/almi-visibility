/**
 * 🔴 RR-248 · THE FRESHNESS CHECK CAN FAIL — one sabotage per thing test/rr248-span-freshness.test.mjs guards, each on the REAL tree:
 * a protected line rewritten in new words (a span made stale in a throwaway change), a span doubled, a fixed evidence name, an evidence
 * write that can overwrite, a reader that imports a write or whose stand-in performs one, a shrunken population, an unpinned exception
 * and a verdict that no longer fires — and (RR-248 Q4, R11–R14) each part of the refusal that keeps a harness run off the production
 * trail and its witness (test/rr248-harness-run-refusal.test.mjs). Each span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first, then required
 * RED by an AssertionError, every file restored by raw-byte sha256 and the named test required GREEN again; the production trail is
 * hashed before and after. Nothing here is run by a provider or the network; the freshness test itself writes nothing.
 *
 *   node test/helpers/rr248-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * Evidence: runs/audit/rr248-sabotage[-practice][-<id>]-<date>T<hhmm>.txt through evidence-once.mjs — a new file, never an earlier one.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { badFindingsFirst } from "../../src/report/owner-workflows.mjs"; // RR-287 (F88 C5): bad findings and NOT DONE first
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AD = "src/page/action-decision.mjs", HS = "test/support/harness-spans.mjs", EO = "test/helpers/evidence-once.mjs";
const R180 = "test/helpers/rr180-sabotage.mjs", F01 = "test/helpers/f01-sabotage.mjs";
const T = ["test/rr248-span-freshness.test.mjs", "test/rr248-harness-run-refusal.test.mjs"];
const WIR = "src/audit-trail/wiring.mjs", HR = "src/audit-trail/harness-run.mjs", GATE = "test/helpers/harness-gate.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

/* rr174 S01's span (and the CREATE line every F35 harness names) */
const CREATE = '  return decided(subject, chosen("CREATE", "NO_SUITABLE_PAGE_DISTINCT_USEFUL_ESTABLISHED_AND_DUPLICATION_RESOLVED",';
const R180_EVIDENCE = 'const EVIDENCE = join(REPO, "runs", "audit", `rr180-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);';
const FS_IMPORT = 'import { readFileSync, existsSync, readdirSync, statSync, lstatSync, realpathSync } from "node:fs";';
const POPULATION = String.raw`.filter((f) => /^test\/helpers\/[^/]*sabotage[^/]*\.mjs$/.test(f))`;
const SABOTAGES = [
  ["R01", "SF-2 · a protected line rewritten in new words leaves its span stale (the throwaway change)", [[AD, CREATE, '  return decided(subject, chosen("CREATE", /* worded anew */ "NO_SUITABLE_PAGE_DISTINCT_USEFUL_ESTABLISHED_AND_DUPLICATION_RESOLVED",']], "SF-2"],
  ["R02", "SF-2 · a span that occurs twice in its target", [[AD, CREATE, `${CREATE}\n/* a second copy:\n${CREATE}\n*/`]], "SF-2"],
  ["R03", "SF-6 · a harness writes a fixed evidence name", [[R180, R180_EVIDENCE, 'const EVIDENCE = join(REPO, "runs", "audit", "rr180-sabotage.txt");']], "SF-6"],
  ["R04", "SF-6 · the shared evidence writer opens an existing file", [[EO, 'writeFileSync(join(repo, rel), badFindingsFirst(text), { flag: "wx" })', 'writeFileSync(join(repo, rel), badFindingsFirst(text), { flag: "w" })']], "SF-6"],
  /* RR-248 (beta-g ruling, 11 Oct): f34 S9 BLOCKED by the F34 C6 defect — SF-7 must see a blocked limb counted PROVED, or a block lifted */
  ["R16", "SF-7 · a BLOCKED limb is counted PROVED", [["test/helpers/f34-sabotage.mjs", "  const ok = landed && red && restored && blocked === null;", "  const ok = landed && red && restored;"]], "SF-7"],
  /* RR-249: restated — the block on f34 S9 was lifted by its fix, so the old span is gone; R17 now blocks a limb SF-7 was not told of */
  ["R17", "SF-7 · a limb is blocked that SF-7 does not name", [["test/helpers/f34-sabotage.mjs", "  /* none — RR-249 fixed the F34 C6 defect (F35's stop is recorded, bin/build-page.mjs) and lifted S9 */", '  ["S9", "F34 C6 DEFECT back, with no round to fix it RR-0"],']], "SF-7"],
  ["R15", "SF-6 · a harness names its evidence by the day alone (a second run that day is refused)", [[R180, 'const DAY = new Date().toISOString().slice(0, 16).replace(":", "");', "const DAY = new Date().toISOString().slice(0, 10);"]], "SF-6"],
  ["R05", "SF-6 · an operator-named evidence write without wx", [[F01, '    writeFileSync(join(REPO, outArg), badFindingsFirst(text), { flag: "wx" });', "    writeFileSync(join(REPO, outArg), text);"]], "SF-6"],
  ["R06", "SF-3 · the reader imports a write", [[HS, FS_IMPORT, 'import { readFileSync, existsSync, readdirSync, statSync, lstatSync, realpathSync, writeFileSync } from "node:fs";']], "SF-3"],
  ["R07", "SF-3 · the fs stand-in performs a write instead of stopping it (a no-op, never a real write)", [[HS, ': k === "promises" ? stopping("fs.promises") : stopper(`fs.${k}`)) });', ': k === "promises" ? stopping("fs.promises") : () => undefined) });']], "SF-3"],
  ["R08", "SF-1 · the population shrinks to the f-harnesses", [[HS, POPULATION, String.raw`.filter((f) => /^test\/helpers\/f[^/]*sabotage[^/]*\.mjs$/.test(f))`]], "SF-1"],
  ["R09", "SF-5 · a second dynamic-import exception added by default", [[HS, 'export const DYNAMIC_IMPORT = new Set(["test/helpers/f09-sabotage.mjs"]);', 'export const DYNAMIC_IMPORT = new Set(["test/helpers/f09-sabotage.mjs", "test/helpers/none-sabotage.mjs"]);']], "SF-5"],
  ["R10", "SF-4 · the verdict no longer fires on a removed span", [[HS, "r.spans.filter((s) => s.occurrences !== 1)", "r.spans.filter((s) => s.occurrences > 1)"]], "SF-4"],
  /* ── RR-248 Q4: no harness run appends to the production trail or its witness — each limb removes one part of that refusal ── */
  ["R11", "HR-2 · the production store no longer asks for live harness runs (a harness run appends)", [[WIR, "assertDeclaredAuditLocation(repo); assertNoHarnessRun(repo); }", "assertDeclaredAuditLocation(repo); }"]], "HR-2"],
  ["R12", "HR-2 · a live harness run is found but the append is not refused", [[HR, "  if (pids.length) throw new HarnessRunAppendRefused(pids);", "  if (false) throw new HarnessRunAppendRefused(pids);"]], "HR-2"],
  ["R13", "HR-2 · a running harness is read as exited (its mark ignored)", [[HR, "  try { process.kill(pid, 0); return true; }", "  try { process.kill(pid, 0); return false; }"]], "HR-2"],
  ["R14", "HR-3 · the gate no longer marks a deliberate run", [[GATE, '  try { markHarnessRun(fileURLToPath(new URL("../../", import.meta.url))); }', "  try { void fileURLToPath; }"]], "HR-3"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = RUN.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const greenOf = (r, p) => r.status === 0 && new RegExp(`✔ ${esc(p)} `).test(`${r.stdout}${r.stderr}`);
const base = run();
const named = [...new Set(RUN.map((s) => s[3]))];
const namedGreen = named.every((p) => greenOf(base, p));
const lines = [
  `RR-248 freshness-check sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T.join(" + ")} · each applied ALONE · no provider, no network, no third-party read`,
  `BASELINE (the named tests before any sabotage): ${namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · named tests seen GREEN: ${named.filter((p) => greenOf(base, p)).length} of ${named.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of namedGreen ? RUN : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const touched = [...new Set(spans.map((s) => s[0]))];
  for (const f of touched) {
    let text = originals.get(f).toString("utf8");
    for (const [, from, to] of spans.filter((s) => s[0] === f)) { const ff = inEol(text, from); const at = text.indexOf(ff); text = text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length); }
    writeFileSync(join(REPO, f), text, "utf8");
  }
  const landed = touched.every((f) => sha(read(f)) !== sha(originals.get(f)));
  let failing = [], out = "";
  try {
    const r = run();
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    for (const f of touched) writeFileSync(join(REPO, f), originals.get(f));
  }
  const restored = touched.every((f) => sha(read(f)) === sha(originals.get(f)));
  const red = failing.some((n) => n.startsWith(`${expect} `));
  const cls = failureClassOf(out, expect);
  const syntax = /SyntaxError/.test(out);
  const greenAgain = restored && greenOf(run(), expect);
  const ok = landed && red && cls === "AssertionError" && !syntax && restored && greenAgain;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · failing ${[...new Set(failing.map((n) => n.split(" ")[0]))].join(",") || "none"} · restored by sha256 ${restored} · GREEN after restore ${greenAgain} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
console.log(`evidence written: ${writeEvidenceOnce(REPO, `rr248-sabotage${PRACTICE ? "-practice" : ""}${ONLY ? `-${ONLY}` : ""}`, lines.join("\n") + "\n")}`);
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length ? 0 : 1;
