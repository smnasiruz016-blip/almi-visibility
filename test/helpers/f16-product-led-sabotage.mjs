/**
 * 🔴 RR-146 · F16 PRODUCT-LED RESEARCH · ONE SABOTAGE PER SAFEGUARD.
 *
 *   node test/helpers/f16-product-led-sabotage.mjs --deliberate      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f16-product-led-sabotage-rr146-2026-10-03.txt (its own file).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RT = "src/research/research-routes.mjs", LI = "src/research/lead-intake.mjs", SM = "src/research/sameness.mjs", RD = "src/research/public-questions-reader.mjs", ES = "src/evidence/evidence-state-adapters.mjs", SI = "bin/source-intake.mjs", AP = "src/research/applicability.mjs";
const T = ["test/f16-product-led-research.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const Q2 = "Q2 · a route set over", Q3 = "Q3 · a CANDIDATE never", Q4 = "Q4 · a LEAD becomes", Q4B = "Q4b · a LEAD's evidence", Q5 = "Q5 · the grouping MECHANISM", Q6 = "Q6 · THE PRODUCTION ENTRY POINTS", Q8 = "Q8 · FOUR OUTCOMES", Q9 = "Q9 · applicability NARROWS";

const SABOTAGES = [
  /* RR-146 run 1 turned Q3 red by a TypeError (the crash, not the assertion): the replacement now hands candidates over well-formed */
  ["L1", "only EVIDENCED declared dimensions yield routes — a candidate never", RT, "  const evidenced = (axes?.declared ?? []).filter((d) => d.status === \"EVIDENCED\");\n", "  const evidenced = [...(axes?.declared ?? []).filter((d) => d.status === \"EVIDENCED\"), ...(axes?.candidates ?? []).map((c) => ({ key: c.key, status: \"EVIDENCED\" }))];\n", Q3],
  ["L2", "a route set over the declared bound is refused whole", RT, "  if (routes.length > r.maxRoutes) return", "  if (false) return", Q2],
  ["L3", "an author attribution without the original post's statement is refused", LI, "    if (claims.length && it?.authorEvidence !== AUTHOR_EVIDENCE) {", "    if (false) {", Q4],
  ["L4", "author fields are NOT MEASURED unless the source established them — the route never lends its value", LI, "present(it[f]) && it.authorEvidence === AUTHOR_EVIDENCE ? it[f] : NOT_MEASURED", "present(it[f]) ? it[f] : (route.value ?? NOT_MEASURED)", Q4],
  ["L5", "a duplicate is refused, never stored twice", LI, "    if (seen.has(q.question_id)) {", "    if (false) {", Q4],
  ["L6", "another subject's route is refused", LI, " || route.subject !== subject) return", ") return", Q4],
  ["L7", "a sameness rule must be the OWNER's", SM, "  if (decl.declaredBy !== \"OWNER\") return", "  if (false) return", Q5],
  ["L8", "no similarity, threshold or unknown method", SM, "methods.some((m) => !METHODS.includes(m))", "false", Q5],
  ["L9", "only the steps the owner declared are applied", SM, "  const norm = (w) => steps.reduce((s, k) => STEPS[k](s), String(w ?? \"\"));\n", "  const norm = (w) => Object.values(STEPS).reduce((s, f) => f(s), String(w ?? \"\"));\n", Q5],
  ["L10", "a lead is UNKNOWN, never OBSERVED", ES, "  return place(rule, \"UNKNOWN\", { checkId: `research_lead:", "  return place(rule, \"OBSERVED\", { evidenceRef: `research_lead:${r.lead_id}`, sourceId: r.sourceId, observedAt: r.recorded_at, checkId: `research_lead:", Q4B],
  ["L11", "leads are counted apart by the reader", RD, "      leads += all.filter((r) => r.record_type === LEAD_RECORD).length;\n", "", Q6],
  ["L12", "leads are kept in their own store, never with the questions", SI, "  const g = append(routeIntake.leads, \"leads.jsonl\", \"APPEND_RESEARCH_LEADS\");", "  const g = append(routeIntake.leads, \"questions.jsonl\", \"APPEND_RESEARCH_LEADS\");", Q6],
  /* RR-148: A1–A8 (applicability) moved to F62's own harness, test/helpers/f62-sabotage.mjs — the code they pointed at was rewritten
   * for F62's frozen clauses. RR-146's evidence files keep their results as recorded; this harness must not be re-run onto them. */
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `RR-146 F16 product-led sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], reasons = "";
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
    reasons = [...new Set([...`${r.stdout}${r.stderr}`.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|Error)\b/gm)].map((m) => m[1]))].join("/") || "none";
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored && !/SyntaxError/.test(reasons);
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f16-product-led-sabotage-rr146-2026-10-03.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
