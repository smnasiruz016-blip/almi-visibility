/**
 * 🔴 F11 · ONE SABOTAGE PER FAILURE LIMB (acceptance _handoffs d941e18, AlmiVisibility_F11_ACCEPTANCE_2026-10-13.md, EVIDENCE [ALL];
 * RR-259).
 *
 *   node test/helpers/f11-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f11-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/discovery/search-phrase-sources.mjs", CFG = "config/discovery/search-phrases.mjs", BIN = "bin/search-phrases.mjs";
const T = ["test/f11-search-phrases.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · FIRING CONTROL: every phrase", ONCE = "C1 · FIRING CONTROL, ONCE", CENSUS = "C1 · CENSUS", C2 = "C2 · FIRING CONTROL: a run", DAYT = "C2 · FIRING CONTROL, THE DAY", C3 = "C3 · FIRING CONTROL", C4 = "C4 · FIRING CONTROL", C5 = "C5 · FIRING CONTROL", C6 = "C6 · FIRING CONTROL", ALL = "[ALL] · FIRING CONTROL";

const SABOTAGES = [
  ["S01", "C1 a stored phrase differs from the phrase handed in", M, "kind: item.kind, phrase: item.text, seed:", "kind: item.kind, phrase: item.text.trim().toLowerCase(), seed:", C1],
  ["S02", "C1 a record lacks its date", M, "  if (!isDay(item.date)) return { refused: REFUSAL.NO_DATE };\n", "", C1],
  ["S03", "C1 a missing field is filled in instead of named NOT REPORTED", M, "const reported = (v) => (present(v) ? v.trim() : NOT_REPORTED);", "const reported = (v) => (present(v) ? v.trim() : \"english\");", C1],
  ["S04", "C1 a hand-in's own label is accepted in place of the source's", M, "  if (item.label !== undefined && item.label !== s.label) return { refused: REFUSAL.LABEL };\n", "", C1],
  ["S05", "C1 a phrase of (c) is labelled OBSERVED", CFG, "BING_KEYWORD_RESEARCH: Object.freeze({ letter: \"c\", label: LABELS.SOURCE_REPORT,", "BING_KEYWORD_RESEARCH: Object.freeze({ letter: \"c\", label: LABELS.OBSERVED,", C1],
  ["S06", "C1 a phrase of (d) is labelled OBSERVED", CFG, "KEYWORD_PLANNER_FILE: Object.freeze({ letter: \"d\", label: LABELS.SOURCE_REPORT,", "KEYWORD_PLANNER_FILE: Object.freeze({ letter: \"d\", label: LABELS.OBSERVED,", C1],
  ["S07", "C1 a suggestion of (f) is labelled OBSERVED", CFG, "AI_SUGGESTION: Object.freeze({ letter: \"f\", label: LABELS.INFERRED,", "AI_SUGGESTION: Object.freeze({ letter: \"f\", label: LABELS.OBSERVED,", C1],
  ["S08", "C1 a phrase of (a) is not OBSERVED", CFG, "CLIENT_AI_GOOGLE: Object.freeze({ letter: \"a\", label: LABELS.OBSERVED,", "CLIENT_AI_GOOGLE: Object.freeze({ letter: \"a\", label: LABELS.INFERRED,", C1],
  ["S09", "C1 an unknown source is accepted", M, "const s = Object.hasOwn(SOURCES, source ?? \"\") ? SOURCES[source] : null;", "const s = Object.hasOwn(SOURCES, source ?? \"\") ? SOURCES[source] : SOURCES.PERSON_SEEN;", C1],
  ["S10", "C1 an observation kind that is not the source's is accepted", M, "  if (!s.kinds.includes(item.kind)) return { refused: REFUSAL.KIND };\n", "", C1],
  ["S11", "C1 the same observation is stored twice", M, "if (seen.has(r.phrase_id)) repeated.push(r); else {", "if (false) repeated.push(r); else {", ONCE],
  ["S12", "C1 the seed is left out of what makes an observation the same", M, "hash([r.source, r.kind, r.place, r.language, r.seed ?? null, r.phrase])", "hash([r.source, r.kind, r.place, r.language, r.phrase])", ONCE],
  ["S13", "C1 F11's code fetches a search engine", M, "import { createHash } from \"node:crypto\";", "import { createHash } from \"node:crypto\";\nexport const reach = (q) => fetch(`https://search.invalid/?q=${q}`);", CENSUS],
  ["S14", "C2 a run not started by the client is accepted", M, "why.push(REFUSAL.NOT_CLIENT_STARTED);", "void 0;", C2],
  ["S15", "C2 a run with no notice first is accepted", M, "why.push(REFUSAL.NO_NOTICE);", "void 0;", C2],
  ["S16", "C2 a pause shorter than the declared one is accepted", M, "    if (complete && pauses.some((p) => p < policy.minPauseSeconds)) why.push(REFUSAL.PAUSE);\n", "", C2],
  ["S17", "C2 the pause is measured from a search's start, not its end", M, "const before = i === 0 ? last : ends[i - 1];", "const before = i === 0 ? last : times[i - 1];", C2],
  ["S18", "C2 a faster pace or a larger cap declared by the hand-in is accepted", M, "why.push(REFUSAL.POLICY);", "void 0;", C2],
  ["S19", "C2 the daily cap is exceeded", M, "    if (used > policy.dailyCap) why.push(REFUSAL.CAP);\n", "", C2],
  ["S20", "C2 an incomplete run record is accepted", M, "    if (!complete) why.push(REFUSAL.INCOMPLETE);\n", "", C2],
  ["S21", "C2 a run that went on after its stop is accepted", M, "why.push(REFUSAL.AFTER_STOP);", "void 0;", C2],
  ["S22", "C2 a stop that was not immediate, or not told to the client, is accepted", M, "why.push(REFUSAL.STOP);", "void 0;", C2],
  ["S23", "C2 an observation naming no search of its run is accepted", M, "    if (!observations.every(kindOk)) why.push(REFUSAL.ORPHAN);\n", "", C2],
  ["S24", "C2 a refused run's phrases are stored", M, "    if (accepted) for (const o of observations) for (const text of o.texts) {", "    if (true) for (const o of observations) for (const text of (Array.isArray(o?.texts) && byN.get(o.search) ? o.texts : [])) {", C2],
  ["S25", "C2 the run record does not state the searches used", M, "      searchesUsed: searches.length, searchesOfTheDay: used,", "      searchesOfTheDay: used,", C2],
  ["S26", "C2 the run record does not state the stop", M, "stopped: stop === null ? \"NO\" : `${stop?.reason ?? \"UNKNOWN\"} at ${stop?.at ?? \"UNKNOWN\"}`, ", "", C2],
  ["S27", "C2 the pause from the run before is not measured", M, "    if (complete) last = ends.at(-1);\n", "", DAYT],
  ["S28", "C2 a refused run's searches do not count against the day's cap", M, "    used += searches.length;\n", "    if (why.length === 0) used += searches.length;\n", DAYT],
  ["S29", "C2 the searches already recorded that day are not counted", M, ".reduce((n, r) => n + (Number.isInteger(r.searchesUsed) ? r.searchesUsed : 0), 0);", ".reduce((n) => n, 0);", DAYT],
  ["S30", "C3 a phrase carries a kind no stated rule decides for it", M, "if (tokens.length >= rules.longTailMinWords) add(\"LONG_TAIL\",", "if (tokens.length >= 1) add(\"LONG_TAIL\",", C3],
  ["S31", "C3 a phrase lacks a kind a stated rule decides", M, "  if (cmp) add(\"COMPARISON\", cmp);\n", "", C3],
  ["S32", "C3 a phrase no rule decides is given a kind", M, "kinds.length ? kinds : [UNCLASSIFIED]", "kinds.length ? kinds : [\"HEAD\"]", C3],
  ["S33", "C3 a kind rule reads a list that was not declared", M, "const ok = Object.keys(lists).every((k) => DECLARED_LISTS.includes(k)) &&", "const ok = true &&", C3],
  ["S34", "C3 a recorded language that is no declared variant (or NOT REPORTED) makes a language variant", M, "else if (spoken && (lists.languageVariants ?? []).some((v) => normalForm(v.language) === normalForm(spoken))) add(", "else if (spoken) add(", C3],
  ["S35", "C4 a phrase is in two needs", M, "    if (needOf.has(k) && needOf.get(k) !== g.need) twice.add(k);\n", "", C4],
  ["S36", "C4 a phrase with no need is not named \"no need yet\"", M, "need = needOf.get(k) ?? NO_NEED_YET;", "need = needOf.get(k) ?? \"other\";", C4],
  ["S37", "C4 two wordings the grouping joins are left in two needs", M, "    const k = normalForm(p.phrase), need =", "    const k = p.phrase, need =", C4],
  ["S38", "C4 F11 creates a page candidate", M, "Object.freeze({ record_type: GROUP_RECORD, measurement_key:", "Object.freeze({ record_type: \"page_candidate\", measurement_key:", C4],
  ["S39", "C5 a volume is recorded for a source that reports none", M, "    if (!s.reportsVolume) return { refused: REFUSAL.VOLUME_SOURCE };\n", "", C5],
  ["S40", "C5 a volume is recorded without its date", M, "if (!isDay(item.volume?.asOf) || !(present(item.volume?.estimate) || Number.isFinite(item.volume?.estimate))) return { refused: REFUSAL.VOLUME_DATE };", "void 0;", C5],
  ["S41", "C5 a volume is recorded as anything but the source's own estimate", M, "whose: `${s.says} — the source's own estimate`,", "whose: \"how often people search\",", C5],
  ["S42", "C5 a count is called search volume", M, "wordings: g.wordings.size, phrases: g.phraseIds.length,", "wordings: g.wordings.size, searchVolume: g.phraseIds.length,", C5],
  ["S43", "C6 a credential is read otherwise than by name", BIN, "const index = rootIndexFor(process.env);", "const index = rootIndexFor(process.env);\nconst held0 = process.env.SEARCH_TOOL_TOKEN;", C6],
  ["S44", "C6 a live part with nothing handed in is reported as measured", M, "const live = source === \"SEARCH_CONSOLE\" ? freshPull === true : measured;", "const live = true;", C6],
  ["S45", "C6 a live part is skipped without its owner step", M, "...(live ? {} : { ownerStep: OWNER_STEPS[source] ?? \"hand in what was seen, as a file in the research batch\" }) });", "});", C6],
  ["S46", "C6 the stored pull is reported as a fresh pull", M, "source === \"SEARCH_CONSOLE\" && !live ? \"MEASURED ON THE STORED PULL\" : \"MEASURED\"", "\"MEASURED\"", C6],
  ["S47", "[ALL] the row is reported PROVED while a clause is not", M, "open.length === 0 && real ? \"PROVED\" : \"NOT PROVED\"", "real ? \"PROVED\" : \"NOT PROVED\"", ALL],
  ["S48", "[ALL] the row is reported PROVED while the real population is incomplete", M, "const real = population?.state === \"COMPLETE\";", "const real = true;", ALL],
  ["S49", "[ALL] source (a) counts as proved with no accepted run", M, "(counts.CLIENT_AI_GOOGLE ?? 0) > 0 && runs.some((r) => r?.record_type === RUN_RECORD && r.verdict === \"ACCEPTED\" && r.phrasesKept > 0)", "(counts.CLIENT_AI_GOOGLE ?? 0) > 0", ALL],
  ["S50", "[ALL] source (b) counts as proved with no query of the stored pull", M, "if (!((counts.SEARCH_CONSOLE ?? 0) > 0)) missing.push(", "if (false) missing.push(", ALL],
  ["S51", "[ALL] source (e) counts as proved with no phrase a person saw", M, "if (!((counts.PERSON_SEEN ?? 0) > 0)) missing.push(", "if (false) missing.push(", ALL],
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
  `F11 sabotage run · ${new Date().toISOString()}`,
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
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f11-sabotage", lines.join("\n") + "\n")}`);
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
