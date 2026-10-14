/**
 * 🔴 F10 · PROVED ON THE BUILT PAGES — ONE SABOTAGE PER FAILURE LIMB (Acceptance Amendment 4, _handoffs c063d3b, C3 to C7 and the
 * owner's REVIEW addition; C8 EVIDENCE; RR-261) — AND ONE PER FAILURE LIMB OF THE REBUILD THAT HONOURS ITS STORED DECISIONS (RR-262:
 * the page builder holds no cancel rule of its own; limbs B01 to B14).
 *
 *   node test/helpers/f10-built-pages-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f10-built-pages-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/page/built-page-needs.mjs", CFG = "config/page/built-page-needs.mjs", BIN = "bin/built-page-needs.mjs", BOARD = "src/fboard/board.mjs", ADP = "src/evidence/evidence-state-adapters.mjs", SD = "src/page/stored-page-decisions.mjs", BLD = "bin/build-joined-pages.mjs";
const T = ["test/f10-built-pages.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C3 = "C3 · FIRING CONTROL", C4 = "C4 · FIRING CONTROL", RV = "C4 · REVIEW · FIRING CONTROL", C5 = "C5 · FIRING CONTROL", SV = "C5 · SURVIVOR · FIRING CONTROL", C6 = "C6 · FIRING CONTROL", PP = "C5 C6 · PRODUCTION PATH", C7 = "C7 · CENSUS", RB = "REBUILD · FIRING CONTROL", RP = "REBUILD · PRODUCTION PATH", ONE = "ONE RULE · FIRING CONTROL";

const SABOTAGES = [
  ["B01", "REBUILD a page a stored cancellation names is proposed again", SD, "    if (c) notBuilt.push(", "    if (false) notBuilt.push(", RB],
  ["B02", "REBUILD a need the planning store still holds for a cancelled page is joined into it again", SD, "(decisions?.cancelled?.has(candidateValue(c?.spec?.basis?.pageCandidate)) ? heldBack : kept).push(c);", "(false ? heldBack : kept).push(c);", RB],
  ["B03", "REBUILD a stored moved question is not put back into the rebuilt survivor", SD, "const record = place.length ? withMoved(", "const record = false ? withMoved(", RB],
  ["B04", "REBUILD a question the rebuilt page already holds is put in a second time", SD, "const due = mine.filter((m) => !held.has(m.questionId));", "const due = mine;", RB],
  ["B05", "REBUILD a moved question whose item is not on the rebuilt page is not counted", SD, "const place = due.filter((m) => items.has(m.intoItem));", "const place = due;", RB],
  ["B06", "REBUILD another tenant's stored decisions are read", SD, " && decideResolvedTenants(r.tenantId, tenantId).allowed);", ");", RB],
  ["B07", "REBUILD a REVIEW pair is not listed for the owner", SD, "(d.flag === REVIEW_FLAG || d.decision === DECISIONS.CANNOT))", "(d.decision === DECISIONS.CANNOT))", RB],
  ["B08", "REBUILD a CANNOT DECIDE pair is not listed for the owner", SD, "(d.flag === REVIEW_FLAG || d.decision === DECISIONS.CANNOT))", "(d.flag === REVIEW_FLAG))", RB],
  ["B09", "REBUILD a pair with a cancelled page is still listed", SD, "d.pages.every((p) => !cancelled.has(p)) && ", "", RB],
  ["B10", "REBUILD the entry point does not read the stored decisions", BLD, "const decided = storedDecisions({ records: rowsOf(\"built-page-needs.jsonl\"), tenantId: SCOPE.tenantId });", "const decided = storedDecisions({ records: [], tenantId: SCOPE.tenantId });", RP],
  ["B11", "REBUILD the entry point proposes a cancelled page again", BLD, "const resolved = proposedAfterDecisions({ pages: proposed.pages, decisions: decided });", "const resolved = { pages: proposed.pages, notBuilt: [] };", RP],
  ["B12", "REBUILD the entry point joins a cancelled page's stored needs: the page is rebuilt", BLD, "const pages = joinPages({ construction: joinable.construction,", "const pages = joinPages({ construction: G.compiled.forConstruction,", RP],
  ["B13", "REBUILD the entry point does not put the stored moved questions into the rebuilt survivor", BLD, "const built = pages.map((p) => withStoredMoves({ page: p, decisions: decided }));", "const built = pages.map((p) => ({ record: p, moved: 0, alreadyHeld: 0, placed: 0, noItem: 0 }));", RP],
  ["B14", "ONE RULE a second rule is back in the page builder: it reads a same-need judgement at build time", BLD, "const resolved = proposedAfterDecisions({ pages: proposed.pages, decisions: decided });", "const resolved = proposedAfterDecisions({ pages: proposed.pages.filter((p) => !(proposed.sameNeed ?? []).length || p), decisions: decided });", ONE],
  ["T01", "C3 a page with no question-and-answer section, or with two, is not counted as a finding", M, "    if (section !== SECTION.PRESENT) faults.push(Object.freeze({ code: `SECTION_${section.replace(/ /g, \"_\")}`, pageId: p.pageId }));\n", "", C3],
  ["T02", "C3 a page with two sections reads as one", M, ": n > 1 ? SECTION.MORE : SECTION.ABSENT;", ": n > 1 ? SECTION.PRESENT : SECTION.ABSENT;", C3],
  ["T03", "C3 a question's original wording is changed and not seen", M, "      if (recorded.has(q.questionId) && recorded.get(q.questionId) !== q.wording) faults.push(", "      if (false) faults.push(", C3],
  ["T04", "C3 a question's wording is lost from the page and not seen", M, "      if (!html.toLowerCase().includes(escapeText(q.wording).toLowerCase())) faults.push(", "      if (false) faults.push(", C3],
  ["T05", "C3 one recorded need split across two sections is not seen", M, "if (where.size > 1) faults.push(", "if (false) faults.push(", C3],
  ["T06", "C3 a section count is printed without its denominator", M, "counts: Object.freeze({ pages: rows.length, present:", "counts: Object.freeze({ present:", C3],
  ["T07", "C3 a section at fault does not disprove", M, "  if (list(sections?.faults).length) return Object.freeze({ result: VERDICTS.DISPROVED, why: `a built page's question-and-answer section is at fault (${sections.faults.length})` });\n", "", C3],
  ["T10", "C4 a pair is decided with a score handed in", M, "  if (holdsAny(hint, SCORE_FIELDS)) return Object.freeze({ refused: Object.freeze([Object.freeze({ code: REFUSAL.SCORE })]), decisions: Object.freeze([]), excluded: Object.freeze([]) });\n", "", C4],
  ["T11", "C4 a threshold is no longer a refused score field", CFG, "[\"similarity\", \"score\", \"threshold\", \"cutoff\",", "[\"similarity\", \"score\", \"cutoff\",", C4],
  ["T12", "C4 two pages that share some needs while each serves one the other does not are decided SAME NEED", M, "const same = onlyA === 0 && onlyB === 0;", "const same = shared.length > 0;", C4],
  ["T13", "C4 two materially different intents are decided SAME NEED", M, "const need = r.place === NEED_PLACE && present(r.need) ? r.need : null;", "const need = r.place === NEED_PLACE && present(r.need) ? r.need.replace(\"service-\", \"\") : null;", C4],
  ["T14", "C4 a pair with a question in no need record is reported as decided", M, "const missing = !index.records ? MISSING.NO_RECORDS : na.unplaced.length || nb.unplaced.length ? MISSING.UNPLACED :", "const missing = !index.records ? MISSING.NO_RECORDS : false ? MISSING.UNPLACED :", C4],
  ["T15", "C4 a CANNOT DECIDE pair does not name its missing fact", M, "decision: DECISIONS.CANNOT, missing, reason:", "decision: DECISIONS.CANNOT, reason:", C4],
  ["T16", "C4 a page with no need is compared as if it had one", M, ": !na.needs.size || !nb.needs.size ? MISSING.NO_NEED : null;", ": null;", C4],
  ["T17", "C4 a pair is decided with no need record stored", M, "const missing = !index.records ? MISSING.NO_RECORDS :", "const missing = false ? MISSING.NO_RECORDS :", C4],
  ["T18", "C4 pages of different tenants are compared", M, "    if (!decideResolvedTenants(a.tenantId, b.tenantId).allowed) { refused.push(Object.freeze({ code: REFUSAL.CROSS_TENANT, pages: Object.freeze([a.pageId, b.pageId]) })); continue; }\n", "", C4],
  ["T19", "C4 a page without its tenant is compared", M, "    if (!present(p.tenantId)) { refused.push(Object.freeze({ code: REFUSAL.NO_TENANT, pageId: p.pageId })); continue; }\n", "", C4],
  ["T20", "C4 a decision is recorded without its reason", M, "decision: same ? DECISIONS.SAME : DECISIONS.DIFFERENT, sharedNeeds: Object.freeze(shared), reason,", "decision: same ? DECISIONS.SAME : DECISIONS.DIFFERENT, sharedNeeds: Object.freeze(shared),", C4],
  ["T21", "C4 a decision is labelled OBSERVED", CFG, "export const DECISION_LABEL = \"INFERRED\";", "export const DECISION_LABEL = \"OBSERVED\";", C4],
  ["T22", "C4 a pair is left undecided and uncounted", M, "for (let i = 0; i < live.length; i += 1) for (let k = i + 1; k < live.length; k += 1) {", "for (let i = 0; i < live.length; i += 1) for (let k = i + 1; k < Math.min(live.length, i + 2); k += 1) {", C4],
  ["T23", "C4 a pair decision has no evidence-state rule", ADP, "  built_page_pair_decision: { inputs:", "  built_page_pair_decision_x: { inputs:", C4],
  ["R01", "REVIEW a subset pair with the same declared audience is not flagged", M, "      ...(subset ? { flag: REVIEW_FLAG, review:", "      ...(false ? { flag: REVIEW_FLAG, review:", RV],
  ["R02", "REVIEW a pair is flagged while the declared audiences differ", M, " && present(a.audience) && a.audience === b.audience;", ";", RV],
  ["R03", "REVIEW a pair is flagged without its reason (the counts)", M, "sharedNeeds: shared.length, onlyTheLargerServes: onlyA + onlyB, audience: a.audience })", "audience: a.audience })", RV],
  ["R04", "REVIEW a REVIEW pair handed to the cancellation is cancelled", M, "  if (decision?.flag === REVIEW_FLAG) return no(REFUSAL.REVIEW);\n", "", RV],
  ["R05", "REVIEW a subset pair is decided SAME NEED and cancelled", M, "const same = onlyA === 0 && onlyB === 0;", "const same = onlyA === 0 || onlyB === 0;", RV],
  ["R06", "REVIEW a pair is flagged while neither page's needs all stand inside the other's", M, "const subset = !same && (onlyA === 0 || onlyB === 0) &&", "const subset = !same &&", RV],
  ["V01", "C5 both pages of a SAME NEED pair are cancelled", M, "    live = live.filter((p) => p.pageId !== r.cancelled.pageId).map(", "    live = live.filter((p) => p.pageId !== r.cancelled.pageId && p.pageId !== r.survivor.pageId).map(", C5],
  ["V02", "C5 a question of the cancelled page is not moved", M, "  const moves = questionsOf(s.cancelled).map((q) => {", "  const moves = questionsOf(s.cancelled).slice(1).map((q) => {", C5],
  ["V03", "C5 a question is moved with its wording changed", M, "questionId: q.questionId, wording: q.wording, tier: d.tier ?? null,", "questionId: q.questionId, wording: q.wording.toLowerCase(), tier: d.tier ?? null,", C5],
  ["V04", "C5 a question the survivor already holds is duplicated in it", M, "const add = moves.filter((m) => m.intoItem === it.needId && !m.alreadyHeld);", "const add = moves.filter((m) => m.intoItem === it.needId);", C5],
  ["V05", "C5 the wording the survivor already held is not retrievable", M, "...(held.has(q.questionId) ? { heldWording: held.get(q.questionId).wording } : {}),", "", C5],
  ["V06", "C5 a moved question is recorded but is not in the survivor's question-and-answer section", M, "      html = html.slice(0, from) + block + html.slice(to);\n", "", C5],
  ["V07", "C5 a published page is cancelled", M, "    if (p.publication === PUBLICATION.PUBLISHED) return no(REFUSAL.PUBLISHED, { pageId: p.pageId });\n", "", C5],
  ["V08", "C5 a page with no recorded publication state is cancelled", M, "    if (p.publication !== PUBLICATION.UNPUBLISHED) return no(REFUSAL.NOT_RECORDED, { pageId: p.pageId });\n", "", C5],
  ["V09", "C5 a published page is taken into the comparison", M, "    if (p.publication !== PUBLICATION.UNPUBLISHED) { excluded.push(Object.freeze({ pageId: p.pageId, publication: p.publication })); continue; }\n", "", C5],
  ["V10", "C5 a page whose record says nothing about publication reads as not yet published", M, "  return PUBLICATION.NOT_RECORDED;", "  return PUBLICATION.UNPUBLISHED;", C5],
  ["V11", "C5 a pair that is not SAME NEED is cancelled", M, "  if (decision?.decision !== DECISIONS.SAME) return no(REFUSAL.NOT_SAME);\n", "", C5],
  ["V12", "C5 a cancelled build still stands as a page (a second run would cancel again)", M, "    if (gone.has(record.measurement_key)) continue;\n", "", C5],
  ["V13", "C5 a cancellation has no evidence-state rule", ADP, "  built_page_cancellation: { inputs:", "  built_page_cancellation_x: { inputs:", C5],
  ["U01", "SURVIVOR the audience match never decides (a later step overrides it)", M, "[SURVIVOR_STEPS[0], match(a), match(b), (x, y) => x - y],", "[SURVIVOR_STEPS[0], match(a), match(b), () => 0],", SV],
  ["U02", "SURVIVOR the sourced answers never decide", M, "[SURVIVOR_STEPS[1], sourcedNeeds(a, index), sourcedNeeds(b, index), (x, y) => x - y],", "[SURVIVOR_STEPS[1], sourcedNeeds(a, index), sourcedNeeds(b, index), () => 0],", SV],
  ["U03", "SURVIVOR the later build survives", M, "(x < y ? 1 : -1) : 0)],", "(x < y ? -1 : 1) : 0)],", SV],
  ["U04", "SURVIVOR a page is cancelled while all three steps tie", M, "return Object.freeze({ survivor: null, cancelled: null, step: null,", "return Object.freeze({ survivor: a, cancelled: b, step: SURVIVOR_STEPS[2],", SV],
  ["U05", "SURVIVOR a pair the rule cannot decide is not reported CANNOT DECIDE", M, "const tied = new Set(notCancelled.filter((x) => x.code === REFUSAL.NO_SURVIVOR).map((x) => x.decision));", "const tied = new Set();", SV],
  ["U06", "SURVIVOR audience words declared after the run are accepted", M, "  for (const p of [a, b]) if (p.audienceWords.length && !(isDay(p.audienceDeclaredOn) && isDay(on) && p.audienceDeclaredOn <= on)) return Object.freeze({ refused: REFUSAL.AUDIENCE_LATE, pageId: p.pageId });\n", "", SV],
  ["U07", "SURVIVOR a part of a word counts as an audience match", M, "const holdsWord = (wording, word) => new RegExp(", "const holdsWord = (wording, word) => String(wording).toLowerCase().includes(String(word).toLowerCase()) || new RegExp(", SV],
  ["U08", "SURVIVOR the declared order of the rule's steps is changed", CFG, "[\"AUDIENCE MATCH\", \"SOURCED ANSWERS\", \"EARLIER BUILD\"]", "[\"SOURCED ANSWERS\", \"AUDIENCE MATCH\", \"EARLIER BUILD\"]", SV],
  ["X01", "C6 a SAME NEED pair remains and the result does not read DISPROVED", M, "const verdict = counts.same > 0 ? VERDICTS.DISPROVED :", "const verdict = false ? VERDICTS.DISPROVED :", C6],
  ["X02", "C6 the result reads PROVED with fewer than two pages (an empty population)", M, "live < MIN_PAGES || counts.cannotDecide > 0 ||", "counts.cannotDecide > 0 ||", C6],
  ["X03", "C6 the result reads PROVED with a pair CANNOT DECIDE", M, "|| counts.cannotDecide > 0 || counts.pairs !== expected", "|| counts.pairs !== expected", C6],
  ["X04", "C6 the result reads PROVED with a pair unmeasured", M, "|| counts.pairs !== expected || list(refused).length > 0 ?", "|| list(refused).length > 0 ?", C6],
  ["X05", "C6 one page is declared enough", CFG, "export const MIN_PAGES = 2;", "export const MIN_PAGES = 1;", C6],
  ["X06", "C6 the planted duplicate is not caught", M, "const same = onlyA === 0 && onlyB === 0;", "const same = false;", C6],
  ["X07", "C6 the planted duplicate is caught and not cancelled", M, "    const next = d.decisions.find((x) => x.decision === DECISIONS.SAME && !skip.has(x.measurement_key));", "    const next = null;", C6],
  ["X08", "C6 the planted duplicate is cancelled without its questions moved", M, "cancellations.push(r.cancellation); moves.push(...r.moves); rebuilt.push(r.survivor.record);", "cancellations.push(r.cancellation); rebuilt.push(r.survivor.record);", C6],
  ["X09", "C6 the duplicate is caught only by a test path: the entry point decides nothing", BIN, "const R = runBuiltPages({ pages, needRecords: N.records, on: ON });", "const R = runBuiltPages({ pages: [], needRecords: N.records, on: ON });", PP],
  ["X10", "C6 the entry point's output carries a page's own words", BIN, "console.log(`  result           ", "console.log(String(pages[0]?.record?.title)); console.log(`  result           ", PP],
  ["X11", "C4 the entry point decides though the need records are not in the store", BIN, "if (N.refused) {", "if (false) {", PP],
  ["X12", "C4 need records that are not stored as derived are read", M, "  if (absent.length) return Object.freeze({ refused: \"NEED_RECORDS_NOT_STORED_AS_DERIVED\", records: Object.freeze([]), absent: absent.length });\n", "", PP],
  ["X13", "C5 the survivor's new build is not kept", BIN, "if (R.rebuilt.length) {", "if (false) {", PP],
  ["X14", "C5 a moved question is not recorded", BIN, "const records = [...R.decisions, ...R.cancellations, ...R.moves];", "const records = [...R.decisions, ...R.cancellations];", PP],
  ["X15", "C5 the entry point keeps records without --confirm", BIN, "if (!permission.mayWrite) { console.log(\"  NOT WRITTEN — no --confirm: nothing kept\"); process.exit(0); }", "if (!permission.mayWrite) { console.log(\"  NOT WRITTEN — no --confirm: nothing kept\"); }", PP],
  ["Y01", "C7 a pass whose recorded evidence names the disclosed seal is not refused", BOARD, "(row.events || []).some((e) => e.kind === \"VERIFIED\" && names(e))", "false", C7],
  ["Y02", "C7 a pass on evidence that names no seal is refused (the old rule)", BOARD, "(row.events || []).some((e) => e.kind === \"VERIFIED\" && names(e))", "true", C7],
  ["Y03", "C7 evidence that names the seal by its commitment is not seen", BOARD, "t.includes(s.id) || t.includes(s.contentHash)) || t.includes(d.evidenceClass)", "t.includes(s.id)) || t.includes(d.evidenceClass)", C7],
  ["Y04", "C7 a result stated in the disclosed class is not seen", BOARD, "t.includes(s.id) || t.includes(s.contentHash)) || t.includes(d.evidenceClass)", "t.includes(s.id) || t.includes(s.contentHash))", C7],
  ["Y05", "C7 a production path of the built-pages check names the sealed set", M, "const list = (v) => (Array.isArray(v) ? v : []);", "const sealedSetReader = null;\nconst list = (v) => (Array.isArray(v) ? v : []);", C7],
  ["Y06", "C7 the built-pages check holds a similarity measure", M, "const isDay = (d) => typeof d === \"string\"", "const cosineSimilarity = () => 0;\nconst isDay = (d) => typeof d === \"string\"", C7],
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
  `F10 built-pages sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 600 s`,
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
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 600000 });
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
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f10-built-pages-sabotage", lines.join("\n") + "\n")}`);
