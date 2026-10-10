/**
 * 🔴 RR-153 · F91 QUESTION-TO-PAGE-CANDIDATE CONNECTION · ONE SABOTAGE PER LIMB (Acceptance Amendment 2, _handoffs fff60df).
 *
 *   node test/helpers/f91-connection-sabotage.mjs --deliberate      NOT part of `npm test`
 *
 * BASELINE: the test file must be wholly GREEN before any sabotage, or nothing is run. PRE-FLIGHT: every span exactly once in the code
 * live now. Each sabotage alone; the named test must fail by an ASSERTION (a crash is a harness fault, never a proof); restored by raw-byte
 * sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f91-connection-sabotage-rr153-2026-10-04.txt — its own file; it refuses to overwrite one that exists.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EVIDENCE = join(REPO, "runs", "audit", process.env.F91_EVIDENCE_NAME ?? `f91-connection-sabotage-${new Date().toISOString().slice(0, 16).replace(":", "")}.txt`); // RR-248: a new timestamped file each run (the fixed name could never be written twice)
if (existsSync(EVIDENCE)) { console.error(`refused: ${EVIDENCE} exists — an earlier run's evidence is never overwritten; name a new file with F91_EVIDENCE_NAME`); process.exit(2); }
const DC = "src/page/demand-connection.mjs", BD = "bin/demand-connect.mjs", RD = "src/page/page-opportunities-reader.mjs", ES = "src/evidence/evidence-state-adapters.mjs";
const T = ["test/f91-connection.test.mjs", "test/rr172-r2-f91-f33.test.mjs"]; // RR-248: + rr172-r2, where RR-172 (efc36be) moved the official-origin pin (T17h)
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const K2 = "K2 ·", K3 = "K3 ·", K4 = "K4 ·", K5 = "K5 ·", K6 = "K6 ·", K7 = "K7 ·", K8 = "K8 ·", K9 = "K9 ·", K10 = "K10 ·", K12 = "K12 ·", E4 = "ENTRY4 ·", E5 = "ENTRY5 ·";

const SABOTAGES = [
  /* C9 — the refused kinds */
  ["Y1", "C9 a search lead is refused by name", DC, "  if (r?.record_type === \"research_lead\") return REFUSAL.LEAD;\n", "", K2],
  ["Y2", "C9 a keyword idea is refused by name", DC, "  if (r?.record_type === \"keyword_signal\") return REFUSAL.KEYWORD;\n", "", K2],
  ["Y3", "C9 a client's claim is refused by name", DC, "  if (v.kind === \"CLIENT_CLAIM\") return REFUSAL.CLIENT_CLAIM;\n", "", K2],
  ["Y4", "C9 only an OBSERVED question is demand", DC, "  if (v.kind !== \"OBSERVED\") return REFUSAL.INFERRED;\n", "", K2],
  /* RR-248: restated — RR-172 (efc36be) names the fixture test `isFixture` and refuses it in both branches; the span is the observed-
   * question branch's refusal, the one this limb was written for */
  ["Y5", "C9 a fixture or test record is refused", DC, "  if (v.kind !== \"OBSERVED\") return REFUSAL.INFERRED;\n  if (isFixture(r)) return REFUSAL.FIXTURE;\n", "  if (v.kind !== \"OBSERVED\") return REFUSAL.INFERRED;\n", K2],
  ["Y6", "C9 another product's or tenant's question is refused", DC, "  if (v.subject !== subject) return REFUSAL.OTHER_SUBJECT;\n", "", K2],
  ["Y7", "C9 an author attribute not stated on the original post is refused", DC, "  if (AUTHOR_FIELDS.some(", "  if (false && AUTHOR_FIELDS.some(", K2],
  ["Y8", "C9 an observer label that contradicts its type is refused", DC, "  if (!Object.hasOwn(OBSERVER_LABELS, t) || v.provenance.seenBy !== OBSERVER_LABELS[t]) return REFUSAL.UNSUPPORTED_ATTRIBUTE;\n", "", K2],
  ["Y9", "C9 a duplicate write is refused", DC, "    if (connected.has(r.question_id)) { refuse(d, REFUSAL.DUPLICATE); continue; }\n", "", K2],
  ["Y10", "C9 the page candidate must be one of F91's possible combinations", DC, "if (!candidates || !d?.combination || !candidates.has(candidateKey(d.combination))) {", "if (!d?.combination) {", K2],
  /* C10 — one need */
  /* RR-248: Y11 and Y12 restated — RR-172 (efc36be) reads wording and country through connectionFields (`fields`) */
  ["Y11", "C10 country never splits one need", DC, "    } else needId = needOfWording.get(normaliseWording(fields.wording)) ??", "    } else needId = needOfWording.get(`${fields.country}|${normaliseWording(fields.wording)}`) ??", K3],
  /* RR-248: restated — RR-172 (efc36be) reads the wording through connectionFields (`fields.wording`) */
  ["Y12", "C10 needs never merge by similarity", DC, "    } else needId = needOfWording.get(normaliseWording(fields.wording)) ??", "    } else needId = [...needOfWording].find(([w]) => w.slice(0, 12) === normaliseWording(fields.wording).slice(0, 12))?.[1] ??", K4],
  ["Y13", "C10 a recorded judgement joins a translation to the SAME need", DC, "      needId = target.needId;\n", "      needId = `need:${hash([subject, r.question_id])}`;\n", K3],
  ["Y14", "C10 a country-specific difference is kept as a section", DC, "    for (const s of d.sections ?? []) n.sections.push(s);\n", "", K5],
  ["Y15", "C10 one need has one page candidate", DC, "    if (needCandidate.has(needId) && needCandidate.get(needId) !== ck) { refuse(d, REFUSAL.SPANS_CANDIDATES); continue; }\n", "", K6],
  /* C11 — one sourced answer, no checker */
  /* RR-248 · CASE (b) — MOVED: RR-172 (efc36be) moved the official-site rule into src/page/answer-support.mjs (claimSupport, per claim).
   * Re-pointed to the moved rule, breaking ONLY the official-origin condition (the product-site kind check stays): not an easier limb.
   * RR-248 (beta-g pre-ruling, option A): efc36be also took the non-official-origin assertion out of K7; it lives in T17h
   * (test/rr172-r2-f91-f33.test.mjs), so the limb names T17h. rr172 S28 breaks this line the other way (always refused); this limb
   * proves the rule-REMOVED direction for the first time. */
  ["Y16", "C11 the answer only from the product's own official site", "src/page/answer-support.mjs", "if (s.kind !== SOURCE_KINDS.PRODUCT_SITE || !officialSites.includes(originOf(s.link))) return", "if (s.kind !== SOURCE_KINDS.PRODUCT_SITE) return", "T17h ·"],
  ["Y17", "C11 two different answers for one need are never chosen between", DC, "const answer = answers.length > 1 ?", "const answer = answers.length > 99 ?", K7],
  ["Y18", "C11 a checker field is refused", DC, "    if (Object.keys(d ?? {}).some((k) => CHECKER_FIELDS.test(k)) || Object.keys(d?.answer ?? {}).some((k) => CHECKER_FIELDS.test(k))) { refuse(d, REFUSAL.CHECKER_FIELD); continue; }\n", "", K8],
  /* C12 — coverage */
  /* RR-248: Y19 and Y20 restated — F91 Amendment 3 (RR-172, efc36be): coverage is FULL / PARTIAL / NONE (GROUPED), and an answer is held
   * unless its CENTRAL claim is supported (C18) */
  ["Y19", "C12 an existing page that serves the need is honoured", DC, "const recommendation = cov === GROUPED.FULL ? RECOMMENDATION.COVERED :", "const recommendation = cov === \"COVERED_NEVER\" ? RECOMMENDATION.COVERED :", K9],
  ["Y20", "C12 an UNKNOWN answer is HELD, never recommended", DC, ": answer.centralSupported !== true ? RECOMMENDATION.HELD_ANSWER :", ": false ? RECOMMENDATION.HELD_ANSWER :", K9],
  /* the planner reads what the writer wrote */
  ["Y21", "the planner's reader takes the need record as neither a limb nor malformed", RD, "} else if (r?.record_type === \"planning_need\" && typeof r.needId === \"string\" && isCombination(r.combination)) {", "} else if (false) {", K10],
  ["Y22", "a connection is INFERRED, never OBSERVED", ES, "  return place(rule, \"INFERRED\", { inputRefs: inputs.map(", "  return place(rule, \"OBSERVED\", { inputRefs: inputs.map(", K12],
  /* the governed entry point */
  ["Y23", "without --confirm nothing is written", BD, "if (toWrite.length && permission.mayWrite) {", "if (toWrite.length) {", E4],
  ["Y24", "the product must be the subject's (no tenant crossover at the entry point)", BD, "if (!members.some((m) => m.resourceKind === \"FACT_REGISTRY\"", "if (false && !members.some((m) => m.resourceKind === \"FACT_REGISTRY\"", E5],
  ["Y25", "the answer source is the product's own declared official site", BD, "const officialSites = Array.isArray(product.officialSites) ? product.officialSites : [];", "const officialSites = [];", E5],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const runTests = () => {
  const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
  const out = `${r.stdout}${r.stderr}`;
  return {
    failing: [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]),
    passing: [...out.matchAll(/✔ (.+?) \(\d/g)].map((m) => m[1]),
    reasons: [...new Set([...out.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|RangeError|Error)\b/gm)].map((m) => m[1]))],
  };
};
const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const base = runTests();
const named = [...new Set(SABOTAGES.map((s) => s[5]))];
const baselineGreen = base.failing.length === 0 && named.every((n) => base.passing.some((p) => p.startsWith(n)));
const lines = [
  `RR-153 F91 connection sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `BASELINE (unsabotaged): passing ${base.passing.length} · failing ${base.failing.length} · every named test green: ${baselineGreen}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
if (!baselineGreen) { console.error("refused: the baseline is not green — a red test cannot prove a sabotage"); process.exit(3); }
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let r;
  try { r = runTests(); } finally { writeFileSync(join(REPO, file), orig); }
  const restored = sha(read(file)) === sha(orig);
  const red = r.failing.some((n) => n.startsWith(expect));
  const byAssertion = r.reasons.length > 0 && r.reasons.every((x) => x === "AssertionError");
  const ok = landed && red && restored && byAssertion;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test (${expect}) red ${red} · failing ${[...new Set(r.failing)].length} · reason ${r.reasons.join("+") || "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
