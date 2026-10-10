/**
 * 🔴 RR-188 · R5c · ONE SABOTAGE PER FAILURE LIMB of F40's Acceptance as amended (Amendment 1, _handoffs e51b27f: C1–C7, [ALL] and C8) and
 * of F41's Amendment 2 (_handoffs fc3555d: C1 AS AMENDED and C8 carried from RR-179, C9 and the owner's strict subject match); F41's C1–C7 are
 * test/helpers/f41-sabotage.mjs, run apart — and [ALL] — each on LIVE, REACHABLE code, its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required
 * RED by an AssertionError (never a crash of the TEST), every file restored by raw-byte sha256, the production trail hashed before and
 * after. FIXTURE STRUCTURES ONLY (RR-177).
 *
 *   node test/helpers/rr188-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr188-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr188-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The method of test/helpers/rr184-sabotage.mjs, unchanged.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QJ = "src/page/quality-judgements.mjs", BP = "bin/build-page.mjs", CB = "src/page/content-brief.mjs", CBE = "src/page/content-brief-evidence.mjs";
const T = ["test/rr184-r5.test.mjs", "test/rr188-r5c.test.mjs", "test/rr179-r4.test.mjs", "test/f41-content-brief.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr188-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const IMPORTS = 'import { claimsOf, CHECK, DRAFT } from "./draft-render.mjs";';
const STANDING = 'standing: "F40 publishes nothing, approves nothing and decides no ranking; a draft that does not pass F40 is never a complete passing preview (D5)"';
const SABOTAGES = [
  /* ── C1 ── */
  ["S01", "C1 · a draft carrying an unsupported material claim passes F40 (verified facts not read from F37's every-claim-sourced check)", [[QJ, "const verifiedFacts = Object.freeze({ verdict: fromCheck(checks.everyClaimSourced),", "const verifiedFacts = Object.freeze({ verdict: VERDICT.PASS,"]], "T40-C1"],
  ["S02", "C1 · F40 accepts a draft whose checks are not the ones construction judged (it could rebuild or change them)", [[QJ, "  if (!judgedBy || JSON.stringify(", "  if (false && JSON.stringify("]], "T40-C1"],
  ["S03", "C1 · F40 judges a draft for a need F35 did not choose", [[QJ, "  if (!isChosenCreate(decision) || decision.subject?.needId !== spec?.subject) return refuse(", "  if (false) return refuse("]], "T40-C1"],
  ["S04", "C1 · a FAILING F37 check is not carried (markup dropped from technical indexability)", [[QJ, 'verdict: worst(["technical", "internalLinks", "markup"].map((k) => fromCheck(checks[k])))', 'verdict: worst(["technical", "internalLinks"].map((k) => fromCheck(checks[k])))'], [QJ, 'detail: Object.fromEntries(["technical", "internalLinks", "markup"].map(', 'detail: Object.fromEntries(["technical", "internalLinks"].map(']], "T40-C1"],
  ["S05", "C1 · the runner judges drafts other than F35's chosen construction set", [[BP, "const judged = chosen.decisions.filter((d) => d.spec).map(", "const judged = (ae.compiled?.forConstruction ?? []).map("]], "T40-C1"],
  /* ── C2 ── */
  ["S06", "C2 · answer sufficiency is judged by length", [[QJ, "  const sufficiency = centralUnknown.length ? VERDICT.FAIL : fromCheck(checks.directAnswer);", "  const sufficiency = centralUnknown.length || String(draft.html).length > 3000 ? VERDICT.FAIL : fromCheck(checks.directAnswer);"]], "T40-C2"],
  ["S07", "C2 · a draft whose central part is UNKNOWN is judged sufficient", [[QJ, "  const sufficiency = centralUnknown.length ? VERDICT.FAIL : fromCheck(checks.directAnswer);", "  const sufficiency = fromCheck(checks.directAnswer);"]], "T40-C2"],
  ["S08", "C2 · an UNKNOWN part is dropped from the record", [[QJ, 'other UNKNOWN part(s), named: ${otherUnknown.join(", ") || "none"}', "other UNKNOWN part(s), named: none"]], "T40-C2"],
  /* ── C3 ── */
  ["S09", "C3 · the assessments are summed into one score", [[QJ, "    judged: true, population, subject: spec.subject,", "    judged: true, score: ASSESSMENTS.filter((a) => assessments[a].verdict === VERDICT.PASS).length, population, subject: spec.subject,"]], "T40-C3"],
  ["S10", "C3 · an assessment is missing from the record", [[QJ, "const assessments = Object.freeze({ technicalIndexability, answerQuality, verifiedFacts, distinctValue, engagingPresentation });", "const assessments = Object.freeze({ technicalIndexability, answerQuality, distinctValue, engagingPresentation });"]], "T40-C3"],
  ["S11", "C3 · distinct value is PASS while F39 is CANNOT DECIDE", [[QJ, 'const distinctValue = Object.freeze(gain?.outcome === "CANNOT_DECIDE" || !gain', "const distinctValue = Object.freeze(!gain"], [QJ, 'gain.outcome === "ESTABLISHED" && rte?.state === "PASS" ? VERDICT.PASS', 'rte?.state === "PASS" ? VERDICT.PASS']], "T40-C3"],
  ["S12", "C3 · F39's CANNOT DECIDE stops the other four assessments", [[QJ, "  /* the five assessments, each with its own result and what it read */", '  if (parts?.informationGain?.outcome === "CANNOT_DECIDE") return refuse("F39 cannot decide");\n  /* the five assessments, each with its own result and what it read */']], "T40-C3"],
  ["S13", "C3 · a page is called strong because it is indexable", [[QJ, STANDING, STANDING.replace('standing: "', 'standing: (technicalIndexability.verdict === VERDICT.PASS ? "a strong page — " : "") + "')]], "T40-C3"],
  /* ── C4 ── */
  ["S14", "C4 · a judgement lacks its criterion", [[QJ, 'verdict: blocks.length ? VERDICT.FAIL : VERDICT.PASS, criterion: CRITERIA.filler.criterion, criterionId:', "verdict: blocks.length ? VERDICT.FAIL : VERDICT.PASS, criterion: null, criterionId:"]], "T40-C4"],
  ["S15", "C4 · a judgement cannot FAIL (filler)", [[QJ, "verdict: blocks.length ? VERDICT.FAIL : VERDICT.PASS,", "verdict: VERDICT.PASS,"]], "T40-C4"],
  ["S16", "C4 · a judgement is reported as measured (an unjudged judgement given a method's source)", [[QJ, "observation: null, refutation: CRITERIA[name].refutation, source: null, why });", 'observation: null, refutation: CRITERIA[name].refutation, source: { kind: "METHOD", id: "measured" }, why });']], "T40-C5"],
  ["S17", "C4 · a judgement waits on a named person (a person accepted as its source)", [[QJ, '  if (!present(s.kind) || s.kind === "PERSON" || s.kind === "OWNER") return notMeasured(', "  if (!present(s.kind)) return notMeasured("], [QJ, '  if (!["FIXTURE", "AGENT"].includes(s.kind)) return notMeasured(', '  if (!["FIXTURE", "AGENT", "PERSON"].includes(s.kind)) return notMeasured(']], "T40-C4"],
  ["S18", "C4 · a judgement is recorded with no refutation condition", [[QJ, "observation: given.observation, refutation: CRITERIA[name].refutation, source: Object.freeze({ ...s }) });", "observation: given.observation, refutation: null, source: Object.freeze({ ...s }) });"]], "T40-C4"],
  ["S19", "C4 · a judgement's criterion is written or changed after its observation is seen", [[QJ, "  if (given.criterionId !== CRITERIA[name].id) return notMeasured(", "  if (false) return notMeasured("]], "T40-C4"],
  ["S20", "C4 · F37's render of a grouped need is exempted from the repetition criterion", [[QJ, "  const fails = unjustified.length > 0 || (repeatedIds.length === 0 && repeatedTexts > 0);", "  const fails = false && (unjustified.length > 0 || (repeatedIds.length === 0 && repeatedTexts > 0));"]], "T40-C4"],
  /* ── C5 ── */
  ["S21", "C5 · a judgement is recorded with no source", [[QJ, "observation: given.observation, refutation: CRITERIA[name].refutation, source: Object.freeze({ ...s }) });", "observation: given.observation, refutation: CRITERIA[name].refutation, source: null });"]], "T40-C5"],
  ["S22", "C5 · a NOT MEASURED judgement is counted as passing", [[QJ, "states.some((s) => s !== VERDICT.PASS) ? VERDICT.NOT_MEASURED : VERDICT.PASS);", "states.some((s) => s === CANNOT_DECIDE) ? VERDICT.NOT_MEASURED : VERDICT.PASS);"]], "T40-C5"],
  ["S23", "C5 · a fixture judgement is carried into a real run", [[QJ, '  if (s.kind === "FIXTURE" && population !== POPULATION.FIXTURE) return notMeasured(', "  if (false) return notMeasured("]], "T40-C5"],
  ["S24", "C5 · a judgement made by an unregistered provider is accepted", [[QJ, "!(registeredProviders.includes(s.provider) && present(s.callRef))", "!present(s.callRef)"]], "T40-C5"],
  ["S25", "C5 / runner · the real run judges as a FIXTURE population", [[BP, "population: POPULATION.REAL }) }));", "population: POPULATION.FIXTURE }) }));"]], "T40-C1"],
  /* ── C6 ── */
  ["S26", "C6 · F40 imports a threshold constant to decide", [[QJ, IMPORTS, `${IMPORTS}\nimport { MIN_FACTS } from "../gate-a/facts.mjs";`]], "T40-C6"],
  ["S27", "C6 · a length number decides", [[QJ, "  if (!Number.isInteger(round) || round < 0) return refuse(", '  if (draft.html.length < 350) return refuse("too short");\n  if (!Number.isInteger(round) || round < 0) return refuse(']], "T40-C6"],
  ["S28", "C6 · a word count decides", [[QJ, "  const { unknown } = claimsOf(spec);", '  const words = String(draft.html).split(" ").length; if (words < 350) return refuse("too few words");\n  const { unknown } = claimsOf(spec);']], "T40-C6"],
  /* ── C7 ── */
  ["S29", "C7 · copy promises ranking", [[QJ, STANDING, STANDING.replace("decides no ranking", "decides no ranking; a passing page is guaranteed to rank first")]], "T40-C7"],
  ["S30", "C7 · a draft with an assessment NOT MEASURED or CANNOT DECIDE passes F40", [[QJ, "passesF40: verdict === VERDICT.PASS,", "passesF40: verdict !== VERDICT.FAIL,"]], "T40-C7"],
  ["S31", "C7 · F40 is presented as a ranking gate", [[QJ, STANDING, STANDING.replace("decides no ranking", "decides the page's ranking")]], "T40-C7"],
  ["S32", "C7 · F40 runs a repair itself", [[QJ, "export function judgeDraft(", "export function repair(draft) { return draft; }\nexport function judgeDraft("]], "T40-C7"],
  ["S33", "C7 · a third repair round runs", [[QJ, "  if (round > MAX_REPAIR_ROUNDS) return refuse(", "  if (round > MAX_REPAIR_ROUNDS + 1) return refuse("]], "T40-C7"],
  ["S34", "C7 · a round that removes no failed judgement does not stop early", [[QJ, "  const stopsEarly = round > 0 && before !== null", "  const stopsEarly = false && before !== null"]], "T40-C7"],
  /* ── [ALL] ── */
  ["S35", "[ALL] · F40 reads a file", [[QJ, IMPORTS, `${IMPORTS}\nimport { readFileSync } from "node:fs";`]], "T40-ALL"],
  ["S36", "[ALL] · F40 reads the 27 pages set aside or a real partition", [[QJ, IMPORTS, `${IMPORTS}\nimport { readExistingPagePopulation } from "./existing-page-population.mjs";`]], "T40-ALL"],
  ["S37", "[ALL] · F40 fetches or calls a provider", [[QJ, "export const MAX_REPAIR_ROUNDS = 2;", 'export const MAX_REPAIR_ROUNDS = 2;\nexport const probe = () => fetch("https://provider.invalid/judge");']], "T40-ALL"],
  /* ── F40 C8 (Acceptance Amendment 1, RR-188) ── */
  ["S38", "F40 C8 · a judged result lacks contentSha256", [[QJ, "    judged: true, population, subject: spec.subject, contentSha256,", "    judged: true, population, subject: spec.subject,"]], "T40-C8"],
  ["S39", "F40 C8 · a NOT JUDGED result for a presented draft lacks contentSha256", [[QJ, "Object.freeze({ judged: false, verdict: NOT_JUDGED, why, contentSha256 });", "Object.freeze({ judged: false, verdict: NOT_JUDGED, why });"]], "T40-C8"],
  ["S40", "F40 C8 · contentSha256 is the hash of other content", [[QJ, '(present(html) ? createHash("sha256").update(html).digest("hex") : null)', '(present(html) ? createHash("sha256").update(`${html}\\n`).digest("hex") : null)']], "T40-C8"],
  ["S41", "F40 C8 · the field changes a gate verdict", [[QJ, "blockers.length ? VERDICT.NOT_MEASURED : VERDICT.PASS;", "blockers.length || contentSha256 ? VERDICT.NOT_MEASURED : VERDICT.PASS;"]], "T40-C8"],
  ["S42", "F40 C8 · a judgement method differs from its pinned sha256", [[QJ, "  return Object.freeze({ name: \"filler\", verdict: blocks.length ? VERDICT.FAIL : VERDICT.PASS,", "  return Object.freeze({ name: \"filler\", verdict: blocks.length  ? VERDICT.FAIL : VERDICT.PASS,"]], "T40-C8"],
  /* ── F41 C1 AS AMENDED and C8, carried from RR-179 (renumbered) ── */
  ["F41-01", "F41 C1 AS AMENDED · the per-item approval gate restored", [[CB, "  const e = evidence ?? {};\n", "  if (!(evidence?.approval)) return Object.freeze({ subject, state: BRIEF_STATE.NOT_ISSUED, standing: STANDING, missing: Object.freeze([\"no recorded approval\"]) });\n  const e = evidence ?? {};\n"]], "T41d"],
  ["F41-02", "F41 C1 AS AMENDED · a brief is labelled an approval", [[CB, "    standing: STANDING,\n    recommended:", "    standing: STANDING,\n    approval: \"assumed\",\n    recommended:"]], "T41d"],
  ["F41-03", "F41 C1 AS AMENDED · a preview that does not pass is put forward", [[CB, "  if (missingParts.length) return Object.freeze({ state: PREVIEW.NOT_PUT_FORWARD,", "  if (false) return Object.freeze({ state: PREVIEW.NOT_PUT_FORWARD,"]], "T41e"],
  ["F41-04", "F41 C1 AS AMENDED · publication passes without the owner's exact recorded approval", [[CB, '  const exact = approvals.find((a) => recorded(a) && a.kind === "PUBLICATION"', '  const exact = approvals.find((a) => a && a.kind === "PUBLICATION"'], [CB, " && a.contentSha256 === preview.contentSha256);", ");"]], "T41f"],
  ["F41-05", "F41 C1 AS AMENDED · an approval is assumed", [[CB, "  if (!Array.isArray(approvals)) throw new TypeError(", "  if (false) throw new TypeError("]], "T41f"],
  ["F41-06", "F41 C8 · a research-derived question loses its GENERATED marking (the brief)", [[CB, "marking: q.marking ?? null,", "marking: null,"]], "T41a"],
  ["F41-07", "F41 C8 · a research-derived question loses its GENERATED marking (the reader)", [[CBE, 'marking: q.tier === TIERS.RESEARCH_DERIVED && q.route === ROUTES.CLIENT_AI ? "GENERATED" : null', "marking: null"]], "T41a"],
  ["F41-08", "F41 C8 · a question appears without its tier", [[CB, ' || !TIERS.includes(q.tier)) { excluded.push(', ") { excluded.push("]], "T41a"],
  ["F41-09", "F41 C8 · a grouped need's brief does not name the grouped need", [[CB, "e.need.groupedNeed === decision.subject.needId", "true"]], "T41b"],
  ["F41-10", "F41 C8 · a supported claim is excluded for its SECONDARY label", [[CB, "    const s = c.source ?? {};\n", "    if (c.label === \"SECONDARY\") { excluded.push(Object.freeze({ claimId: c.claimId, why: \"LABEL\" })); continue; }\n    const s = c.source ?? {};\n"]], "T41c"],
  ["F41-11", "F41 C8 · an UNKNOWN part is not carried as UNKNOWN", [[CB, "    if (c?.state !== \"SUPPORTED\") { unknown.push(", "    if (c?.state !== \"SUPPORTED\") { continue; unknown.push("]], "T41c"],
  /* ── F41 C9 (Acceptance Amendment 2, RR-188) and the owner's strict subject match ── */
  ["F41-12", "F41 C9 · a preview is put forward with no F40 result", [[CB, '  if (!f40) missingParts.push("no F40 result for this draft — F40 has not judged it");\n  else {', "  if (!f40) {} else {"]], "T41-C9"],
  ["F41-13", "F41 C9 · a preview is put forward with an F40 result for other content", [[CB, "    else if (pageSha !== null && f40.contentSha256 !== pageSha) missingParts.push(", "    else if (false) missingParts.push("]], "T41-C9"],
  ["F41-14", "F41 C9 · a preview is put forward with an F40 result lacking contentSha256", [[CB, "    if (typeof f40.contentSha256 !== \"string\" || f40.contentSha256 === \"\") missingParts.push(", "    if (false) missingParts.push("], [CB, "    else if (pageSha !== null && f40.contentSha256 !== pageSha) missingParts.push(", "    if (pageSha !== null && f40.contentSha256 && f40.contentSha256 !== pageSha) missingParts.push("]], "T41-C9"],
  ["F41-15", "F41 C9 · strict subject: a brief of another kind is put forward", [[CB, "    if (brief?.subject?.kind !== F40_JUDGED_KIND) missingParts.push(", "    if (false) missingParts.push("]], "T41-C9-KIND"],
  ["F41-16", "F41 C9 · strict subject: a brief with no subject id is put forward", [[CB, "    else if (typeof brief.subject.id !== \"string\" || brief.subject.id === \"\") missingParts.push(", "    else if (false) missingParts.push("], [CB, "    else if (brief.subject.id !== f40.subject) missingParts.push(", "    else if (brief.subject.id && brief.subject.id !== f40.subject) missingParts.push("]], "T41-C9-NOID"],
  ["F41-17", "F41 C9 · strict subject: a brief for another subject is put forward", [[CB, "    else if (brief.subject.id !== f40.subject) missingParts.push(", "    else if (false) missingParts.push("]], "T41-C9-OTHERID"],
  ["F41-18", "F41 C9 · a NOT MEASURED or CANNOT DECIDE part is counted as a pass", [[CB, '    else if (f40.gate?.verdict !== "PASS") missingParts.push(', '    else if (f40.gate?.verdict === "FAIL") missingParts.push(']], "T41-C9"],
  ["F41-19", "F41 C9 · NOT_PUT_FORWARD drops or rewords F40's blockers", [[CB, "missingParts.push(`F40 gate ${f40.gate?.verdict ?? \"absent\"}`, ...(f40.gate?.blockers ?? []));", "missingParts.push(`F40 gate ${f40.gate?.verdict ?? \"absent\"}`, ...(f40.gate?.blockers ?? []).map((b) => b.toLowerCase()));"]], "T41-C9"],
  ["F41-20", "F41 C9 · F41 recomputes or overrides F40's judgement", [[CB, '    else if (f40.gate?.verdict !== "PASS") missingParts.push(', '    else if (f40.gate?.verdict !== "PASS" && Object.values(f40.assessments ?? {}).some((a) => a.verdict !== "PASS")) missingParts.push(']], "T41-C9"],
  /* ── F41's original C2–C7 and its C1 limb still live (test/helpers/f41-sabotage.mjs, carried; see the header of this block's script) ── */
  ["F41-O05", "F41 (original) C1 CANNOT DECIDE is NOT ISSUED for want of an action", [["src/page/content-brief.mjs", "if (decision.decision !== \"CHOSEN\" || decision.actions.length === 0) return", "if (false) return"]], "C1 AS AMENDED"],
  ["F41-O07", "F41 (original) C2 recorded evidence carries a ref", [["src/page/content-brief.mjs", "const recorded = (x) => x && typeof x.ref === \"string\" && x.ref !== \"\";", "const recorded = (x) => Boolean(x);"]], "C2"],
  ["F41-O08", "F41 (original) C2 intent only from the recorded need (re-anchored, RR-188: the registered-need branch of the live intent line)", [["src/page/content-brief.mjs", "(recorded(e.need) && e.need.value ? filled(\"THE_REGISTERED_NEED_THE_SUBJECT_SERVES\"", "(e.need?.value ? filled(\"THE_REGISTERED_NEED_THE_SUBJECT_SERVES\""]], "C2"],
  ["F41-O09", "F41 (original) C2 internal links need a COMPLETE inventory", [["src/page/content-brief.mjs", "e.links.completeness === \"COMPLETE\" && ", ""]], "C2"],
  ["F41-O10", "F41 (original) C3 a fact needs a source", [["src/page/content-brief.mjs", "const why = !hasSource ? \"NO_SOURCE\" :", "const why = false ? \"NO_SOURCE\" :"], ["src/page/content-brief.mjs", "source: f.source.documentRef ?? f.source.url, freshness: fresh", "source: f.source?.documentRef ?? f.source?.url, freshness: fresh"]], "C3"],
  ["F41-O11", "F41 (original) C3 a fact must be VERIFIED", [["src/page/content-brief.mjs", ": f.verificationState !== \"VERIFIED\" ? \"NOT_VERIFIED\"", ": false ? \"NOT_VERIFIED\""]], "C3"],
  ["F41-O12", "F41 (original) C3 a fact must be fresh enough", [["src/page/content-brief.mjs", ": !FRESH_ENOUGH.includes(fresh) ? `FRESHNESS_${fresh}`", ": false ? `FRESHNESS_${fresh}`"]], "C3"],
  ["F41-O13", "F41 (original) C4 READY only when complete", [["src/page/content-brief.mjs", "state: missingSections.length ? BRIEF_STATE.INCOMPLETE : BRIEF_STATE.READY,", "state: BRIEF_STATE.READY,"]], "C4"],
  ["F41-O14", "F41 (original) C4 every missing section named", [["src/page/content-brief.mjs", "missing: Object.freeze(missingSections.map((k) => `${k}: ${s[k].missing}`)),", "missing: Object.freeze([]),"]], "C4"],
  ["F41-O15", "F41 (original) C6 competitor evidence is a diagnostic, never a length", [["src/page/content-brief.mjs", "diagnostics: Object.freeze((e.competitorInputs ?? []).filter(recorded).map((c) => c.ref)),", "diagnostics: Object.freeze([]), words: (e.competitorInputs ?? []).map((c) => c.words),"]], "C5/C6"],
  ["F41-O16", "F41 (original) REAL the real need reaches the brief", [["src/page/content-brief-evidence.mjs", "need: covered ? { value: covered, ref: `F33:COVERS:${pageId}` } : null,", "need: null,"]], "REAL"],
  ["F41-O17", "F41 (original) C7 the entry point prints its bound", [["bin/page-briefs.mjs", "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");"]], "C7 · THE ENTRY POINT:"],
  ["F41-O18", "F41 (original) C7 a network call is seen", [["tools/need-coverage-call-paths.mjs", "{ code: \"RAW_NETWORK_CALL\", test: (t) => t.split(\"\\n\").some((l) => RAW_EGRESS.test(l)) },", "{ code: \"RAW_NETWORK_CALL\", test: () => false },"]], "C7 · the brief"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
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
const base = run();
const baselineGreen = base.status === 0;
const named = [...new Set(RUN.map((s) => s[3]))];
const seenGreen = (p) => new RegExp(`✔ ${esc(p)} `).test(`${base.stdout}${base.stderr}`);
const namedGreen = named.every(seenGreen);
const lines = [
  `RR-188 R5c sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T.join(" + ")} · each applied ALONE · no provider, no network, no third-party read`,
  `BASELINE (the named tests before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · named tests seen GREEN: ${named.filter(seenGreen).length} of ${named.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of baselineGreen && namedGreen ? RUN : []) {
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
  const byAssertion = cls === "AssertionError";
  const syntax = /SyntaxError/.test(out);
  const childCrashed = /\n\s+at .*bin\/|TypeError: |ReferenceError: /.test(out);
  const ok = landed && red && byAssertion && !syntax && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · a production child crashed ${childCrashed} · failing ${[...new Set(failing.map((n) => n.split(" ")[0]))].join(",") || "none"} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length ? 0 : 1;
