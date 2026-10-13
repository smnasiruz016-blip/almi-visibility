/**
 * 🔴 F12 · ONE SABOTAGE PER FAILURE LIMB (acceptance _handoffs d960fa8, AlmiVisibility_F12_ACCEPTANCE_2026-10-13.md, EVIDENCE [ALL];
 * RR-260).
 *
 *   node test/helpers/f12-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f12-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/discovery/need-clusters.mjs", CFG = "config/discovery/need-clusters.mjs", BIN = "bin/need-clusters.mjs";
const T = ["test/f12-need-clusters.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · FIRING CONTROL", C2 = "C2 · FIRING CONTROL", C3 = "C3 · FIRING CONTROL", C4 = "C4 · FIRING CONTROL", C5 = "C5 · FIRING CONTROL", C6 = "C6 · CENSUS", C7 = "C7 · FIRING CONTROL", ALL = "[ALL] · FIRING CONTROL";

const SABOTAGES = [
  ["S01", "C1 a recorded input that was not read is not reported", M, "  for (const id of list(unread)) no(REFUSAL.NOT_READ, { inputId: id });\n", "", C1],
  ["S02", "C1 a record holding no wording is skipped silently", M, ": unread.push(inputId));", ": null);", C1],
  ["S03", "C1 an input ends in no place", M, "if (!where) { no(REFUSAL.NO_PLACE, { inputId: i.inputId }); continue; }", "if (!where) continue;", C1],
  ["S04", "C1 a wording stands in two places", M, "no(places.includes(PLACES.NAVIGATIONAL) && places.includes(PLACES.NEED) ? REFUSAL.NAV_IN_NEED : REFUSAL.TWO_PLACES, { wording: k });", "void 0;", C1],
  ["S05", "C1 a place that is not one of the three named is accepted", M, "for (const k of Object.keys(g)) if (!GROUPING_KEYS.includes(k)) no(", "for (const k of Object.keys(g)) if (false) no(", C1],
  ["S06", "C1 an original wording is changed", M, "wording: i.wording, sourceLabel: i.sourceLabel, joinedBy:", "wording: i.wording.trim().toLowerCase(), sourceLabel: i.sourceLabel, joinedBy:", C1],
  ["S07", "C1 a refused grouping still makes records", M, "  if (refused.length) return Object.freeze({ refused: Object.freeze(refused), records: Object.freeze([]), counts: null });\n", "", C1],
  ["S08", "C1 a changed wording in the stored records is not seen", M, "      if (m.wording !== i.wording) fault(REFUSAL.CHANGED, { inputId: i.inputId });\n", "", C1],
  ["S09", "C1 an input missing from the stored records is not seen", M, "    if (at.length === 0) fault(REFUSAL.NO_PLACE, { inputId: i.inputId });\n", "", C1],
  ["S10", "C1 an input stored in two places is not seen", M, "    if (at.length > 1) fault(REFUSAL.TWO_PLACES, { inputId: i.inputId });\n", "", C1],
  ["S11", "C1 a stored record in an unnamed place is not seen", M, "    if (!NAMED.includes(r.place)) fault(REFUSAL.PLACE, { cluster: r.cluster_id });\n", "", C1],
  ["S12", "C2 a merely similar wording is joined to a need", M, "    const where = placeOf.get(k);\n    if (!where) {", "    const where = placeOf.get(k) ?? placeOf.get(k.replace(/s$/, \"\"));\n    if (!where) {", C2],
  ["S13", "C2 a clean-up step that was not declared is applied", M, "const known = declared.filter((s) => Object.hasOwn(CLEAN_UP, s));", "const known = Object.keys(CLEAN_UP);", C2],
  ["S14", "C2 a clean-up step the engine does not know is accepted", M, "  for (const s of unknown) no(REFUSAL.STEP, { step: String(s) });\n", "", C2],
  ["S15", "C2 a need joined by a score is accepted", M, "    if (holdsAny(n, SCORE_FIELDS)) no(REFUSAL.SCORE, where);\n", "", C2],
  ["S16", "C2 a grouping that declares a score is accepted", M, "SCORE_FIELDS.includes(k) ? REFUSAL.SCORE : REFUSAL.PLACE", "SCORE_FIELDS.includes(k) ? null : REFUSAL.PLACE", C2],
  ["S17", "C2 a score field is dropped from the declared list", CFG, "export const SCORE_FIELDS = Object.freeze([\"score\", \"similarity\", \"threshold\",", "export const SCORE_FIELDS = Object.freeze([\"score\", \"similarity\",", C2],
  ["S18", "C2 two wordings a recorded judgement joins are left in two needs", M, "if (!a || !b || a.key !== b.key) no(REFUSAL.APART,", "if (false) no(REFUSAL.APART,", C2],
  ["S19", "C2 a need bound to a country is accepted", M, "    if (holdsAny(n, [\"country\", \"jurisdiction\"])) no(REFUSAL.COUNTRY_SPLIT, where);\n", "", C2],
  ["S20", "C2 a need split from another by country alone is accepted", M, "if (PLACE_AXES.includes(String(d?.by ?? \"\").trim().toUpperCase())) no(REFUSAL.COUNTRY_SPLIT, where);\n      else if (", "if (", C2],
  ["S21", "C2 a jurisdiction is not treated as a place", CFG, "export const PLACE_AXES = Object.freeze([\"COUNTRY\", \"JURISDICTION\"]);", "export const PLACE_AXES = Object.freeze([\"COUNTRY\"]);", C2],
  ["S22", "C2 a join by the clean-up is recorded as a judgement", M, "joinedBy: where.named.has(i.wording) ? JOINS.JUDGEMENT : JOINS.IDENTICAL", "joinedBy: JOINS.JUDGEMENT", C2],
  ["S23", "C2 a stored join that is neither way is not seen", M, "      if (r.place === PLACES.NEED && !WAYS.includes(m.joinedBy)) fault(REFUSAL.JOIN, { inputId: m.inputId });\n", "", C4],
  ["S24", "C3 a country part without its country is accepted", M, "      if (!present(p?.country)) no(REFUSAL.PART_COUNTRY, where);\n", "", C3],
  ["S25", "C3 a country part without its fact is accepted", M, "      if (!factOk(p?.fact)) no(REFUSAL.PART_FACT, where);\n", "", C3],
  ["S26", "C3 a fact with no reference counts as a fact", M, "const factOk = (f) => present(f?.statement) && present(f?.reference);", "const factOk = (f) => present(f?.statement);", C3],
  ["S27", "C3 a country's wordings are not kept inside the one need", M, "      for (const w of list(p?.wordings)) put(w, { key: `need:${id}`, place: PLACES.NEED, need: id });\n", "", C3],
  ["S28", "C3 a different need with no fact named is accepted", M, "else if (!present(d?.need) || !present(d?.by) || !factOk(d?.fact)) no(REFUSAL.SPLIT_FACT, where);", "else if (false) no(REFUSAL.SPLIT_FACT, where);", C3],
  ["S29", "C3 a different need that names no recorded need is accepted", M, "  for (const [id, n] of needs) if (n.differsFrom && !needs.has(n.differsFrom.need)) no(REFUSAL.SPLIT_FACT, { need: id });\n", "", C3],
  ["S30", "C3 a page-level decision on a need is accepted", M, "    if (holdsAny(n, PAGE_FIELDS)) no(REFUSAL.PAGE, where);\n", "", C3],
  ["S31", "C3 a page-level decision on the grouping is accepted", M, "no(PAGE_FIELDS.includes(k) ? REFUSAL.PAGE :", "no(false ? REFUSAL.PAGE :", C3],
  ["S32", "C3 an audience page field is dropped from the declared list", CFG, "\"separatePage\", \"audiencePage\", \"pageCandidate\",", "\"separatePage\", \"pageCandidate\",", C3],
  ["S33", "C4 a need without its reason is accepted", M, "    if (!present(n.reason)) no(REFUSAL.REASON, where);\n", "", C4],
  ["S34", "C4 a decision without its maker is accepted", M, "|| !present(d.name)) { no(REFUSAL.MAKER, where); return null; }", "|| !present(d.name)) { return null; }", C4],
  ["S35", "C4 a decision without its date is accepted", M, "  if (!isDay(d.on)) no(REFUSAL.DATE, where);\n", "", C4],
  ["S36", "C4 a grouping labelled OBSERVED, or with another maker's label, is accepted", M, "    if (n.label === NEVER_A_GROUPING_LABEL || (present(n.label) && label !== null && n.label !== label)) no(REFUSAL.LABEL, where);\n", "", C4],
  ["S37", "C4 an AI's grouping is labelled OBSERVED", CFG, "  AI: \"INFERRED\",", "  AI: \"OBSERVED\",", C4],
  ["S38", "C4 a machine's grouping is labelled OBSERVED", CFG, "  MACHINE: \"INFERRED\",", "  MACHINE: \"OBSERVED\",", C4],
  ["S39", "C4 a wording loses the label its own source gave it", M, "sourceLabel: i.sourceLabel, joinedBy:", "sourceLabel: \"OBSERVED\", joinedBy:", C4],
  ["S40", "C4 a stored wording that lost its source's label is not seen", M, "      if (m.sourceLabel !== i.sourceLabel) fault(REFUSAL.SOURCE_LABEL, { inputId: i.inputId });\n", "", C4],
  ["S41", "C4 a stored grouping labelled OBSERVED is not seen", M, "      if (r.label === NEVER_A_GROUPING_LABEL || r.label !== MAKERS[r.decidedBy?.kind]) fault(REFUSAL.LABEL, { cluster: r.cluster_id });\n", "", C4],
  ["S42", "C4 a need named twice is accepted", M, "if (!present(id) || needs.has(id)) {", "if (!present(id)) {", C4],
  ["S43", "C5 a navigational wording with no reason is accepted", M, "    if (!present(v?.reason)) no(REFUSAL.NAV_REASON, where);\n", "", C5],
  ["S44", "C5 a navigational wording placed in a need is not named as that", M, "places.includes(PLACES.NAVIGATIONAL) && places.includes(PLACES.NEED) ? REFUSAL.NAV_IN_NEED : REFUSAL.TWO_PLACES", "REFUSAL.TWO_PLACES", C5],
  ["S45", "C5 a stored navigational wording with no reason is not seen", M, "      if (r.place === PLACES.NAVIGATIONAL && !present(r.reason)) fault(REFUSAL.NAV_REASON, { cluster: r.cluster_id });\n", "", C5],
  ["S46", "C6 F12's code fetches", M, "import { createHash } from \"node:crypto\";", "import { createHash } from \"node:crypto\";\nexport const reach = (q) => fetch(`https://search.invalid/?q=${q}`);", C6],
  ["S47", "C6 the entry point writes a page store", BIN, "createJsonlStore(join(batchDir, \"need-clusters.jsonl\")), records,", "createJsonlStore(join(batchDir, \"page-drafts.jsonl\")), records,", C6],
  ["S48", "C6 a need record carries a page candidate", M, "return Object.freeze({ record_type: CLUSTER_RECORD, measurement_key:", "return Object.freeze({ record_type: CLUSTER_RECORD, pageCandidate: true, measurement_key:", C6],
  ["S49", "C7 a sample of fewer than ten items is shown", M, "if (list(sample?.items).length < SAMPLE.items) refused.push(", "if (false) refused.push(", C7],
  ["S50", "C7 a sample item with fewer than three wordings is shown", M, "words.length < SAMPLE.minWordings || ", "", C7],
  ["S51", "C7 a sample item with more than five wordings is shown", M, "words.length > SAMPLE.maxWordings || ", "", C7],
  ["S52", "C7 a sample item shows a wording that is not its need's", M, " || words.some((w) => !own.has(w))", "", C7],
  ["S53", "C7 the declared sample size is smaller", CFG, "export const SAMPLE = Object.freeze({ items: 10,", "export const SAMPLE = Object.freeze({ items: 9,", C7],
  ["S54", "C7 the row passes with fewer than ten owner answers", M, "{ no(REFUSAL.FEW_ANSWERS, { item: it.item }); continue; }", "continue;", C7],
  ["S55", "C7 answers that are not the owner's are accepted", M, "  if (answers.answeredBy !== SAMPLE.answeredBy || !present(answers.reference) || !isDay(answers.on)) no(REFUSAL.NOT_OWNER);\n", "", C7],
  ["S56", "C7 an answer without the owner's own words is accepted", M, "    if (!present(a.words)) no(REFUSAL.NOT_OWNER, { item: it.item });\n", "", C7],
  ["S57", "C7 a no with no recorded correction passes", M, "    if (a.answer === \"no\" && !(present(a.correction?.what) && isDay(a.correction?.on))) no(REFUSAL.NO_CORRECTION, { item: it.item });\n", "", C7],
  ["S58", "C7 an unanswered sample counts as passed", M, "return Object.freeze({ state: \"NOT ANSWERED\", refused:", "return Object.freeze({ state: \"PASSED\", refused:", C7],
  ["S59", "[ALL] the row is reported PROVED while a clause is not", M, "const open = [\"C1\", \"C2\", \"C3\", \"C4\", \"C5\", \"C6\", \"C7\"].filter(", "const open = [\"C1\", \"C2\", \"C3\", \"C4\", \"C5\", \"C6\"].filter(", ALL],
  ["S60", "[ALL] the row is reported PROVED on fixtures only", M, "const real = population?.state === \"COMPLETE\", answered", "const real = true, answered", ALL],
  ["S61", "[ALL] the row is reported PROVED without the owner's sample", M, "verdict: open.length === 0 && real && answered ? \"PROVED\"", "verdict: open.length === 0 && real ? \"PROVED\"", ALL],
  ["S62", "[ALL] the real population counts as complete with no stored phrase", M, "if (!((counts?.phrases ?? 0) > 0)) missing.push(", "if (false) missing.push(", ALL],
  ["S63", "[ALL] the real population counts as complete with no recorded question", M, "if (!((counts?.questions ?? 0) > 0)) missing.push(", "if (false) missing.push(", ALL],
  ["S64", "[ALL] the real population counts as complete while an input is in no place", M, "if (counts && counts.inNeed + counts.navigational + counts.noNeedYet !== counts.inputs) missing.push(", "if (false) missing.push(", ALL],
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
  `F12 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
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
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f12-sabotage", lines.join("\n") + "\n")}`);
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
