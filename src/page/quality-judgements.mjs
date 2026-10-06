/**
 * 🔴 F40 · ADAPTIVE PAGE-QUALITY GATE — THE QUALITY JUDGEMENTS OF THE COMPLETE DRAFT F37 BUILDS (acceptance _handoffs 6d64c27, RR-184).
 *
 * F40 judges ONE complete draft that F37 rendered from the compiled spec of a grouped need F35 chose CREATE. It READS what the draft and the
 * rows beneath it already record — F37's six measurable checks, F91 C17's claim support (through the draft's spec), F39's information-gain
 * verdict (which carries F32's duplication review) and F36's right-to-exist — and rebuilds, re-measures or changes none of them (C1).
 *
 * It reports FIVE SEPARATE ASSESSMENTS, each with its own result, never summed or collapsed (C3; the owner's F40 ruling):
 *   technical indexability · answer quality · verified facts · distinct value · engaging presentation
 * Answer quality is answer sufficiency — whether the page answers its stated need — never length (C2). Engaging presentation is four
 * JUDGEMENTS, each with a declared criterion, the observation, a refutation condition, FAIL among its verdicts and its recorded source (C4):
 * filler and useless repetition by a declared deterministic method; engaging and hookable only by a recorded lawful judge, otherwise
 * NOT MEASURED with the missing judge named — never PASS, never faked (C5). No word count, fact count or percentage threshold decides (C6).
 * The gate passes a draft only when no assessment is FAIL, NOT MEASURED or CANNOT DECIDE (C7). A repair is F42's, never F40's: F40 only
 * counts rounds and refuses a third.
 *
 * Pure: no file, network, process, provider or connector. It names no product, host or tenant.
 */
import { isChosenCreate } from "./action-decision.mjs";
import { claimsOf, CHECK, DRAFT } from "./draft-render.mjs";

export const VERDICT = Object.freeze({ PASS: "PASS", FAIL: "FAIL", NOT_MEASURED: "NOT MEASURED" });
/** F39's third outcome, carried as given into distinct value — never turned into PASS or FAIL */
export const CANNOT_DECIDE = "CANNOT DECIDE";
export const NOT_JUDGED = "NOT JUDGED";
export const ASSESSMENTS = Object.freeze(["technicalIndexability", "answerQuality", "verifiedFacts", "distinctValue", "engagingPresentation"]);
export const JUDGEMENTS = Object.freeze(["filler", "repetition", "engaging", "hookable"]);
export const MAX_REPAIR_ROUNDS = 2;
export const POPULATION = Object.freeze({ REAL: "REAL", FIXTURE: "FIXTURE" });

/* ── the declared criteria (I-3, I-4): fixed here BEFORE any observation; a record names its criterion by id ── */
export const CRITERIA = Object.freeze({
  filler: Object.freeze({ id: "f40-filler-v1", criterion: "Filler is any visible text block of the draft that is none of: its title or a heading, a question's tier or marking line, a supported claim with its citation, a visible UNKNOWN part, or its navigation of related pages.",
    refutation: "Void for a block the record shows to be one of those parts, or to be a part a reader needs that the criterion does not name." }),
  repetition: Object.freeze({ id: "f40-repetition-v1", criterion: "Useless repetition is the same claim, or an identical normalised claim sentence, rendered more than once on the draft where no recorded justification names what the repeat adds at that place.",
    refutation: "Void for a repeat whose recorded justification names what it adds at that place." }),
  engaging: Object.freeze({ id: "f40-engaging-v1", criterion: "Engaging: a reader who arrives with the page's central question is drawn to read on, judged by a declared agent on the rendered draft.",
    refutation: "Void if the judging agent's recorded call did not see the rendered draft, or if a recorded reader observation contradicts it." }),
  hookable: Object.freeze({ id: "f40-hookable-v1", criterion: "Hookable: the title, the direct answer and the headings state the page's value in the reader's own terms, judged by a declared agent on the rendered draft.",
    refutation: "Void if the judging agent's recorded call did not see the rendered draft, or if a recorded reader observation contradicts it." }),
});
export const METHOD_SOURCE = Object.freeze({ filler: Object.freeze({ kind: "METHOD", id: "src/page/quality-judgements.mjs#filler", version: CRITERIA.filler.id }),
  repetition: Object.freeze({ kind: "METHOD", id: "src/page/quality-judgements.mjs#repetition", version: CRITERIA.repetition.id }) });
export const NO_LAWFUL_JUDGE = "no lawful judge: no deterministic method decides it, and no registered provider's recorded call judged this draft (D4; the provider is not registered)";

const present = (v) => typeof v === "string" && v.trim() !== "";
const strip = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;|&#\d+;/g, " ").replace(/\s+/g, " ").trim();
const norm = (s) => strip(s).toLowerCase();
const worst = (states) => (states.includes(VERDICT.FAIL) ? VERDICT.FAIL : states.some((s) => s !== VERDICT.PASS) ? VERDICT.NOT_MEASURED : VERDICT.PASS);
const fromCheck = (c) => (c?.state === CHECK.PASS ? VERDICT.PASS : c?.state === CHECK.FAIL ? VERDICT.FAIL : VERDICT.NOT_MEASURED);
const refuse = (why) => Object.freeze({ judged: false, verdict: NOT_JUDGED, why });

/* ── the deterministic methods ── */
function fillerJudgement(html) {
  const rest = String(html)
    .replace(/<script\b[\s\S]*?<\/script>/g, " ").replace(/<link\b[^>]*>/g, " ")
    .replace(/<h1>[\s\S]*?<\/h1>/g, " ").replace(/<h2>[\s\S]*?<\/h2>/g, " ")
    .replace(/<p class="qa-tier">[\s\S]*?<\/p>/g, " ")
    .replace(/<div class="claim" data-claim-id="[^"]*"><p class="claim-text">[\s\S]*?<\/p><p class="citation">[\s\S]*?<\/p><\/div>/g, " ")
    .replace(/<p class="unknown"[^>]*>[\s\S]*?<\/p>/g, " ")
    .replace(/<nav class="related">[\s\S]*?<\/nav>/g, " ");
  const blocks = rest.split(/<\/?(?:p|div|section|article|li|ul|span|nav|h\d)\b[^>]*>/).map(strip).filter(Boolean);
  return Object.freeze({ name: "filler", verdict: blocks.length ? VERDICT.FAIL : VERDICT.PASS, criterion: CRITERIA.filler.criterion, criterionId: CRITERIA.filler.id,
    observation: blocks.length ? `${blocks.length} visible text block(s) outside the declared parts: ${blocks.map((b) => JSON.stringify(b.slice(0, 80))).join("; ")}` : "every visible text block is one of the declared parts",
    refutation: CRITERIA.filler.refutation, source: METHOD_SOURCE.filler });
}

function repetitionJudgement(html, justifications) {
  const ids = [...String(html).matchAll(/<div class="claim" data-claim-id="([^"]+)">/g)].map((m) => m[1]);
  const texts = [...String(html).matchAll(/<p class="claim-text">([\s\S]*?)<\/p>/g)].map((m) => norm(m[1]));
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
  const repeatedIds = [...count(ids)].filter(([, n]) => n > 1);
  const repeatedTexts = [...count(texts)].filter(([, n]) => n > 1).length;
  const justified = new Set((Array.isArray(justifications) ? justifications : []).filter((j) => present(j?.claimId) && present(j?.adds) && present(j?.ref)).map((j) => j.claimId));
  const unjustified = repeatedIds.filter(([id]) => !justified.has(id));
  const fails = unjustified.length > 0 || (repeatedIds.length === 0 && repeatedTexts > 0);
  return Object.freeze({ name: "repetition", verdict: fails ? VERDICT.FAIL : VERDICT.PASS, criterion: CRITERIA.repetition.criterion, criterionId: CRITERIA.repetition.id,
    observation: `${ids.length} claim block(s) rendered for ${new Set(ids).size} distinct claim(s); repeated: ${repeatedIds.map(([id, n]) => `${id} ×${n}${justified.has(id) ? " (justified)" : ""}`).join(", ") || "none"}`,
    refutation: CRITERIA.repetition.refutation, source: METHOD_SOURCE.repetition });
}

/** an engaging / hookable judgement: lawful only from a declared source that may judge this population; otherwise NOT MEASURED */
function recordedJudgement(name, given, { population, registeredProviders }) {
  const notMeasured = (why) => Object.freeze({ name, verdict: VERDICT.NOT_MEASURED, criterion: CRITERIA[name].criterion, criterionId: CRITERIA[name].id, observation: null, refutation: CRITERIA[name].refutation, source: null, why });
  if (!given) return notMeasured(NO_LAWFUL_JUDGE);
  const s = given.source ?? {};
  if (!present(s.kind) || s.kind === "PERSON" || s.kind === "OWNER") return notMeasured(`refused: a judgement's source is a declared method or agent, never ${present(s.kind) ? s.kind.toLowerCase() : "unnamed"}`);
  if (s.kind === "FIXTURE" && population !== POPULATION.FIXTURE) return notMeasured("refused: a fixture judgement is never carried into a real run");
  if (s.kind === "AGENT" && !(registeredProviders.includes(s.provider) && present(s.callRef))) return notMeasured(`refused: the agent's provider is not registered or its call is not recorded — ${NO_LAWFUL_JUDGE}`);
  if (!["FIXTURE", "AGENT"].includes(s.kind)) return notMeasured(`refused: unknown judgement source ${s.kind}`);
  if (given.criterionId !== CRITERIA[name].id) return notMeasured(`refused: the judgement names criterion ${given.criterionId ?? "none"}, not the declared ${CRITERIA[name].id}`);
  if (!present(given.observation)) return notMeasured("refused: the judgement records no observation");
  if (![VERDICT.PASS, VERDICT.FAIL].includes(given.verdict)) return notMeasured("refused: a recorded judgement is PASS or FAIL");
  return Object.freeze({ name, verdict: given.verdict, criterion: CRITERIA[name].criterion, criterionId: CRITERIA[name].id, observation: given.observation, refutation: CRITERIA[name].refutation, source: Object.freeze({ ...s }) });
}

/**
 * Judge one F37 draft.
 * @param {object} input.spec            the compiled spec F37 rendered (F91 C19)
 * @param {object} input.decision        F35's decision for it
 * @param {object} input.draft           F37's renderCompiledDraft result for that spec
 * @param {object} input.parts           construction's parts for that slug: draft (F37's checks as construction judged them),
 *                                       informationGain (F39, with F32 inside), whyThisUrl (F36)
 * @param {string} input.population      REAL or FIXTURE
 * @param {object[]} [input.judgements]  recorded engaging / hookable judgements ({ name, verdict, criterionId, observation, source })
 * @param {string[]} [input.registeredProviders]  providers registered by the owner's act (none today)
 * @param {object[]} [input.repeatJustifications] recorded { claimId, adds, ref }
 * @param {number} [input.round]         0 for the initial draft, then the repair round (F42's) being re-judged
 * @param {object|null} [input.previous] the previous round's result
 */
export function judgeDraft({ spec, decision, draft, parts, population, judgements = [], registeredProviders = [], repeatJustifications = [], round = 0, previous = null }) {
  /* C1: only a complete draft F37 rendered for a need F35 chose; F37's checks read exactly as construction judged them */
  if (!isChosenCreate(decision) || decision.subject?.needId !== spec?.subject) return refuse("F35 did not choose CREATE for this need — F40 judges only a draft for a need F35 chose");
  if (draft?.state !== DRAFT.RENDERED || !present(draft.html) || !present(draft.writer)) return refuse("no complete draft F37 rendered, with its writer named");
  if (!Object.values(POPULATION).includes(population)) return refuse("the population (REAL or FIXTURE) is not declared");
  const checks = draft.checks ?? {};
  const judgedBy = parts?.draft?.checks ?? null;
  if (!judgedBy || JSON.stringify(Object.fromEntries(Object.entries(judgedBy).map(([k, c]) => [k, c.state]))) !== JSON.stringify(Object.fromEntries(Object.entries(checks).map(([k, c]) => [k, c.state]))))
    return refuse("the draft's six checks are not the ones construction judged — F40 reads F37's checks, it never rebuilds them");
  if (!Number.isInteger(round) || round < 0) return refuse("the round is not declared");
  if (round > MAX_REPAIR_ROUNDS) return refuse(`a third repair round: at most ${MAX_REPAIR_ROUNDS} follow the initial draft (v3 §15); the draft is halted or parked with its exact blocker`);

  /* the five assessments, each with its own result and what it read */
  const technicalIndexability = Object.freeze({ verdict: worst(["technical", "internalLinks", "markup"].map((k) => fromCheck(checks[k]))), reads: "F37 checks technical, internalLinks, markup",
    detail: Object.fromEntries(["technical", "internalLinks", "markup"].map((k) => [k, checks[k]?.state ?? "absent"])) });
  const { unknown } = claimsOf(spec);
  /* centrality as F91 C17 recorded it: a label's own flag, or the UNKNOWN part's (carried by the spec compiler since RR-184); none recorded is central */
  const centralOf = new Map([...(spec.answer?.labels ?? []).map((l) => [l.claimId, l.central !== false]), ...(spec.answer?.unknown ?? []).map((x) => [x.claimId, x.central !== false])]);
  const centralUnknown = unknown.filter((x) => centralOf.get(x.claimId) !== false).map((x) => x.claimId ?? "the central answer");
  const otherUnknown = unknown.filter((x) => centralOf.get(x.claimId) === false).map((x) => x.claimId);
  const sufficiency = centralUnknown.length ? VERDICT.FAIL : fromCheck(checks.directAnswer);
  const answerQuality = Object.freeze({ verdict: worst([sufficiency, fromCheck(checks.headingsMatch)]), reads: "F37 checks directAnswer, headingsMatch; the spec's supported and UNKNOWN parts",
    criterion: "whether the page answers its stated need — the grouped need F35 chose — from its supported claims; a central part left UNKNOWN is insufficient",
    observation: `central part(s) UNKNOWN: ${centralUnknown.join(", ") || "none"}; other UNKNOWN part(s), named: ${otherUnknown.join(", ") || "none"}; direct answer ${checks.directAnswer?.state ?? "absent"}; headings ${checks.headingsMatch?.state ?? "absent"}`,
    refutation: "Void if a central claim the record marks UNKNOWN is shown supported by its recorded finding, or the reverse." });
  const verifiedFacts = Object.freeze({ verdict: fromCheck(checks.everyClaimSourced), reads: "F37 check everyClaimSourced (F91 C17 support)" });
  const gain = parts?.informationGain ?? null, rte = parts?.whyThisUrl ?? null;
  const distinctValue = Object.freeze(gain?.outcome === "CANNOT_DECIDE" || !gain
    ? { verdict: CANNOT_DECIDE, reads: "F39 information gain (with F32's duplication review), F36 right-to-exist", why: `F39 is CANNOT DECIDE: ${gain?.reason ?? "no information-gain verdict recorded"}` }
    : { verdict: gain.outcome === "REFUSED" || rte?.state === "FAIL" ? VERDICT.FAIL : gain.outcome === "ESTABLISHED" && rte?.state === "PASS" ? VERDICT.PASS : VERDICT.NOT_MEASURED,
      reads: "F39 information gain (with F32's duplication review), F36 right-to-exist", why: `F39 ${gain.outcome}; F36 ${rte?.state ?? "absent"}` });
  const byName = new Map((Array.isArray(judgements) ? judgements : []).map((j) => [j?.name, j]));
  const records = Object.freeze({
    filler: fillerJudgement(draft.html),
    repetition: repetitionJudgement(draft.html, repeatJustifications),
    engaging: recordedJudgement("engaging", byName.get("engaging"), { population, registeredProviders }),
    hookable: recordedJudgement("hookable", byName.get("hookable"), { population, registeredProviders }),
  });
  const engagingPresentation = Object.freeze({ verdict: worst(JUDGEMENTS.map((n) => records[n].verdict)), reads: "the four judgements (C4)",
    detail: Object.fromEntries(JUDGEMENTS.map((n) => [n, records[n].verdict])) });
  const assessments = Object.freeze({ technicalIndexability, answerQuality, verifiedFacts, distinctValue, engagingPresentation });

  /* C7: one gate over the five, never a score */
  /* an assessment missing from the record is itself a blocker — it never passes and never crashes the gate */
  const of = (a) => assessments[a]?.verdict ?? "MISSING";
  const blockers = ASSESSMENTS.filter((a) => of(a) !== VERDICT.PASS).map((a) => `${a} ${of(a)}`);
  const verdict = ASSESSMENTS.some((a) => of(a) === VERDICT.FAIL) ? VERDICT.FAIL : blockers.length ? VERDICT.NOT_MEASURED : VERDICT.PASS;
  const failed = new Set(JUDGEMENTS.filter((n) => records[n].verdict === VERDICT.FAIL));
  const before = previous?.judged ? new Set(JUDGEMENTS.filter((n) => previous.judgements[n].verdict === VERDICT.FAIL)) : null;
  const stopsEarly = round > 0 && before !== null && failed.size > 0 && ![...before].some((n) => !failed.has(n));
  return Object.freeze({
    judged: true, population, subject: spec.subject, writer: draft.writer, round, stopsEarly,
    assessments, judgements: records,
    gate: Object.freeze({ verdict, blockers: Object.freeze(blockers), passesF40: verdict === VERDICT.PASS,
      standing: "F40 publishes nothing, approves nothing and decides no ranking; a draft that does not pass F40 is never a complete passing preview (D5)" }),
  });
}
