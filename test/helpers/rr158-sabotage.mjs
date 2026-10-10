/**
 * 🔴 RR-158 §5 · ONE SABOTAGE PER PROTECTION OF test/rr158-overturn.test.mjs (and of the judging guard in test/rr157-meaning.test.mjs M3
 * that refuses an overturn naming nothing).
 *
 *   node test/helpers/rr158-sabotage.mjs --deliberate     NOT part of `npm test`
 *
 * Method of test/helpers/rr157-sabotage.mjs. Evidence: runs/audit/rr158-sabotage-2026-10-04.txt — refuses to overwrite.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MJ = "src/research/meaning-judgement.mjs", RD = "src/research/public-questions-reader.mjs", PQ = "bin/public-questions.mjs";
const DC = "src/page/demand-connection.mjs", PR = "src/page/page-opportunities-reader.mjs", PO = "bin/page-opportunities.mjs";
const T = ["test/rr158-overturn.test.mjs", "test/rr157-meaning.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const EVIDENCE = join(REPO, "runs", "audit", "rr158-sabotage-2026-10-04.txt");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["Y01", "F16 counts an overturned admission (its filter removed)", [[PQ, "const r = intakeQuestions(read.records.filter((q) => !gone.has(q.question_id)), { sameAs: rule.sameAs });", "const r = intakeQuestions(read.records, { sameAs: rule.sameAs });"]], "O1"],
  ["Y02", "F16's reader stops bringing the judgements", [[RD, "      judgements.push(...all.filter((r) => r.record_type === JUDGEMENT_RECORD));\n", ""]], "O1"],
  ["Y03", "F91 admits an overturned question", [[DC, "  if (overturned.has(r.question_id)) return REFUSAL.OVERTURNED;\n", ""]], "O2"],
  ["Y04", "F91's connection read-back counts an overturned question", [[DC, "  const connections = all.filter((r) => !overturned.has(r.questionId));", "  const connections = all;"]], "O2"],
  ["Y05", "F91's three numbers count an overturned question's demand", [[PR, '    if (r?.record_type === "planning_demand" && typeof r.questionId === "string" && overturned.has(r.questionId)) { overturnedDemand += 1; continue; }\n', ""]], "O2"],
  ["Y06", "the shared rule takes an overturn that names nothing", [[MJ, "    if (j.value.overturns === at.judgement_id) current.set(j.value.held_id, j);", "    current.set(j.value.held_id, j);"]], "O3"],
  ["Y07", "the judging entry point accepts an overturn that names nothing", [[MJ, 'if (current && draft.overturns !== current.judgement_id) return refuse("ALREADY_JUDGED_NAME_THE_JUDGEMENT_YOU_OVERTURN");', ""]], "M3"],
  ["Y08", "the F16 count no longer says AS AT", [[PQ, "console.log(`  ${asAt(read.judgements ?? [])}`);\n", ""]], "O1"],
  ["Y09", "the F91 count no longer says AS AT", [[PO, "console.log(`  ${i.asAt} · demand left out because its question was overturned: ${i.overturnedDemand}`);\n", ""]], "O4"],
  ["Y10", "the shared rule finds no overturn at all", [[MJ, '.filter(([, j]) => j.value.verdict !== "CANDIDATE")', ".filter(() => false)"]], "O2"],
];

if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const baselineGreen = run().status === 0;
const lines = [
  `RR-158 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE · fake transport only, zero real requests`,
  `BASELINE (named tests before any sabotage): ${baselineGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of baselineGreen ? SABOTAGES : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
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
  const red = failing.some((n) => n.startsWith(expect));
  const byAssertion = /AssertionError/.test(out) && !/SyntaxError|TypeError|ReferenceError/.test(out);
  const ok = landed && red && byAssertion && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · by AssertionError only ${byAssertion} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
