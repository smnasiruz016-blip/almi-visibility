/**
 * 🔴 RR-192 · R6a · ONE SABOTAGE PER FAILURE LIMB of F32's Acceptance as amended (Amendment 1 REV2, _handoffs 3317b25: C1–C7, C3 and C6 AS
 * AMENDED), of F39's (Amendment 1, _handoffs 69fa57d: C1–C7, C3 AS AMENDED), and of T-1 (RTP-1 §17 S8 and S9; the owner's PG-A1, b5b616e):
 * each on LIVE, REACHABLE code, its span found EXACTLY ONCE, applied ALONE, the named test — a prefix UNIQUE across every file this harness
 * runs — confirmed RED by an AssertionError (never a crash of the TEST), every file restored by raw-byte sha256, the production trail hashed
 * before and after. FIXTURE STRUCTURES ONLY (RR-177). test/helpers/f32-sabotage.mjs, f39-sabotage.mjs and f90-sabotage.mjs are NOT run:
 * they write fixed evidence names over committed evidence; their live limbs are carried here.
 *
 *   node test/helpers/rr192-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr192-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr192-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The method of test/helpers/rr188-sabotage.mjs, unchanged.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = ["test/f32-duplication.test.mjs","test/f39-information-gain.test.mjs","test/page-construction.test.mjs","test/gate-a.test.mjs","test/gate-a-pairs.test.mjs","test/existing-pages.test.mjs","test/page-quality-row25.test.mjs","test/v3-adoption-code-match.test.mjs","test/rr192-r6a.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr192-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const IMPORTS = 'import { claimsOf, CHECK, DRAFT } from "./draft-render.mjs";';
const STANDING = 'standing: "F40 publishes nothing, approves nothing and decides no ranking; a draft that does not pass F40 is never a complete passing preview (D5)"';
const SABOTAGES = [
  /* ── F32 C1–C7, carried from test/helpers/f32-sabotage.mjs (S18 retired: it sabotaged the very C6 limb Amendment 1 supersedes) ── */
  ["F32-S1", "F32 C1 grouping is by the main text's hash", [["src/page/duplication.mjs", "const h = sha(m.main);", "const h = sha(m.pageId);"]], "C1 · identical"],
  ["F32-S2", "F32 C1 the stated normalisation (case, punctuation)", [["src/page/duplication.mjs", "const main = body.confident ? words(body.bodyText).join(\" \") : null;", "const main = body.confident ? body.bodyText : null;"]], "C1 · identical"],
  ["F32-S3", "F32 C1 a group needs two pages", [["src/page/duplication.mjs", ".filter((g) => g.length > 1)", ".filter((g) => g.length > 0)"]], "C1 · identical"],
  ["F32-S4", "F32 C2 ABOVE 40 percent, not at it", [["src/page/duplication.mjs", "overlap > OVERLAP_REVIEW_TRIGGER ?", "overlap >= OVERLAP_REVIEW_TRIGGER ?"]], "C2 · FIRING CONTROL: above"],
  ["F32-S5", "F32 C2 the trigger is V3's 40 percent", [["src/page/duplication.mjs", "export const OVERLAP_REVIEW_TRIGGER = 0.4;", "export const OVERLAP_REVIEW_TRIGGER = 0.9;"]], "C2 · FIRING CONTROL: above"],
  ["F32-S6", "F32 C2/C3 a percentage never becomes a semantic verdict", [["src/page/duplication.mjs", "if (!review) return { state: \"NOT_JUDGED\", missing: MISSING.REVIEW };", "if (!review) return overlapAbove ? { state: \"DUPLICATE\" } : { state: \"DISTINCT\" };"]], "C2 · FIRING CONTROL: above"],
  ["F32-S7", "F32 C3 a review must compare every aspect", [["src/page/duplication.mjs", "if (!SEMANTIC_ASPECTS.every((a) => review.compared?.includes(a)))", "if (false)"]], "C3 · a"],
  ["F32-S8", "F32 C3 high overlap passes only with documented distinct value", [["src/page/duplication.mjs", "if (overlapAbove && !review.documentedDistinctValue)", "if (false)"]], "C3 · a"],
  ["F32-S9", "F32 C3 a page with a reviewed duplicate is DUPLICATE", [["src/page/duplication.mjs", "mine.some((p) => p.semantic.state === \"DUPLICATE\") ? \"DUPLICATE\"", "false ? \"DUPLICATE\""]], "C3 · a"],
  ["F32-S10", "F32 C4 shared means seen on ANOTHER page", [["src/page/duplication.mjs", ".filter((s) => seenOn.get(s) > 1)", ".filter((s) => seenOn.get(s) > 0)"]], "C4 · each"],
  ["F32-S11", "F32 C4 no invented dominance threshold", [["src/page/duplication.mjs", "shellShare === 1 ? \"SHELL_ONLY\"", "shellShare >= 0.75 ? \"SHELL_ONLY\""]], "C4 · each"],
  ["F32-S12", "F32 C4 chrome is measured, not assumed", [["src/audit/shell.mjs", "export const visibleText = (html) => textOf(removeElements(String(html ?? \"\"), STRIP_ELEMENTS));", "export const visibleText = (html) => textOf(removeElements(String(html ?? \"\"), [...STRIP_ELEMENTS, ...CHROME_ELEMENTS]));"]], "C4 · each"],
  ["F32-S13", "F32 C5 unique value is never a word count", [["src/page/duplication.mjs", ": { state: \"NOT_JUDGED\", missing: MISSING.VALUE };", ": m.main !== null && m.main.split(\" \").length < 350 ? { state: \"INSUFFICIENT\", basis: \"WORD_COUNT\" } : { state: \"NOT_JUDGED\", missing: MISSING.VALUE };"]], "C5 · FIRING CONTROL: a"],
  ["F32-S14", "F32 C5 SHELL ONLY is insufficient", [["src/page/duplication.mjs", ": shell === \"SHELL_ONLY\" ? { state: \"INSUFFICIENT\", basis: \"SHELL_ONLY\" }", ": false ? { state: \"INSUFFICIENT\", basis: \"SHELL_ONLY\" }"]], "C5 · FIRING CONTROL: a"],
  ["F32-S15", "F32 C5 a recorded value record decides", [["src/page/duplication.mjs", ": rec && typeof rec.insufficient === \"boolean\" ?", ": false && rec ?"]], "C5 · FIRING CONTROL: a"],
  ["F32-S16", "F32 C5 an empty review list is passed, never defaulted", [["src/page/duplication.mjs", "if (!Array.isArray(reviews) || !Array.isArray(valueRecords)) throw", "if (false) throw"]], "C5 · FIRING CONTROL: a"],
  ["F32-S17", "F32 C6 no action field in the result (C6 as amended keeps this limb)", [["src/page/duplication.mjs", "    methods: METHODS,\n", "    methods: METHODS, action: \"REJECT\",\n"]], "C6 AS AMENDED ·"],
  ["F32-S19", "F32 C7 an unverified body is not measured", [["src/page/duplication.mjs", "if (!p.verified || typeof p.html !== \"string\" || p.html === \"\")", "if (typeof p.html !== \"string\" || p.html === \"\")"]], "C7 · an unverified or"],
  ["F32-S20", "F32 C7 verification is the body's OWN fingerprint", [["src/page/duplication-evidence.mjs", "f.observationId === p.bodyObservationId && f.verified === true", "f.verified === true"]], "C7 · an unverified or"],
  ["F32-S21", "F32 C7 the population names the body's observation", [["src/page/existing-page-population.mjs", "bodyObservationId: latest ? latest.observation_id : null", "bodyObservationId: null"]], "REAL · the client's recorded pages, as they are — every"],
  ["F32-S22", "F32 C7 a network call is seen", [["tools/need-coverage-call-paths.mjs", "{ code: \"RAW_NETWORK_CALL\", test: (t) => t.split(\"\\n\").some((l) => RAW_EGRESS.test(l)) },", "{ code: \"RAW_NETWORK_CALL\", test: () => false },"]], "C7 · the detection"],
  ["F32-S23", "F32 C7 the entry point prints its bound", [["bin/page-duplication.mjs", "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");"]], "C7 · THE ENTRY POINT:"],
  /* ── F32 C3 AS AMENDED and C6 AS AMENDED (Acceptance Amendment 1, RR-192) ── */
  ["F32-A1", "F32 C3 AS AMENDED · a guidance-dependent review (needsGuidance: true) is counted", [["src/page/duplication.mjs", "  if (review.needsGuidance !== false) return", "  if (review.needsGuidance !== false && review.needsGuidance !== true) return"]], "C3 AS AMENDED · a review"],
  ["F32-A2", "F32 C3 AS AMENDED · an unmarked review (needsGuidance absent) is counted", [["src/page/duplication.mjs", "  if (review.needsGuidance !== false) return", "  if (review.needsGuidance === true) return"]], "C3 AS AMENDED · a review"],
  ["F32-A3", "F32 C3 AS AMENDED · a pair held for guidance names no missing fact", [["src/page/duplication.mjs", " — needs ${MISSING.GUIDANCE_FREE}`", "`"]], "C3 AS AMENDED · a review"],
  ["F32-A4", "F32 C6 AS AMENDED · F32 imports and reads one of the six threshold constants", [["src/page/duplication.mjs", "import { extractBody, visibleText, words, shingles, jaccard } from \"../audit/shell.mjs\";", "import { extractBody, visibleText, words, shingles, jaccard } from \"../audit/shell.mjs\";\nimport { MIN_FACTS } from \"../gate-a/facts.mjs\";\nexport const F32_FACT_FLOOR = MIN_FACTS;"]], "C6 AS AMENDED ·"],
  ["F32-A5", "F32 C6 AS AMENDED · F32 imports a module that can change a gate", [["src/page/duplication.mjs", "import { extractBody, visibleText, words, shingles, jaccard } from \"../audit/shell.mjs\";", "import { extractBody, visibleText, words, shingles, jaccard } from \"../audit/shell.mjs\";\nimport { runGateA } from \"../gate-a/run.mjs\";\nexport const F32_GATE = runGateA;"]], "C6 AS AMENDED ·"],
  /* ── F39 C1–C7, carried from test/helpers/f39-sabotage.mjs ── */
  ["F39-S1", "F39 C1/C2 templates BEYOND needs a recorded gain (re-anchored, RR-192: null-safe gain read)", [["src/page/information-gain.mjs", "measured.shell.state === \"HAS_UNIQUE_TEXT\" && gain ? verdict(\"BEYOND\", [`F32 shared-shell share ${measured.shell.share.toFixed(3)}`, gain.ref])", "measured.shell.state === \"HAS_UNIQUE_TEXT\" ? verdict(\"BEYOND\", [`F32 shared-shell share ${measured.shell.share.toFixed(3)}`, gain?.ref])"]], "C1 · every"],
  ["F39-S2", "F39 C2 current pages BEYOND needs a recorded gain (re-anchored, RR-192: null-safe gain read)", [["src/page/information-gain.mjs", "pairs.every((p) => p.semantic.state === \"DISTINCT\") && gain ? verdict(\"BEYOND\"", "pairs.every((p) => p.semantic.state === \"DISTINCT\") ? verdict(\"BEYOND\""], ["src/page/information-gain.mjs", "`all ${pairs.length} sibling pair(s) reviewed DISTINCT`, gain.ref])", "`all ${pairs.length} sibling pair(s) reviewed DISTINCT`, gain?.ref])"]], "C2 · FIRING CONTROL: every"],
  ["F39-S3", "F39 C2 a gain record names a G12 kind", [["src/page/information-gain.mjs", "G12_KINDS.includes(r.kind) && ", ""]], "C2 · FIRING CONTROL: every"],
  ["F39-S4", "F39 C2 a gain record says what it adds", [["src/page/information-gain.mjs", "typeof r.adds === \"string\" && r.adds.trim() !== \"\" && ", ""]], "C2 · FIRING CONTROL: every"],
  ["F39-S5", "F39 C3 SHELL ONLY is NOT BEYOND templates", [["src/page/information-gain.mjs", "measured.shell.state === \"SHELL_ONLY\" ? verdict(\"NOT_BEYOND\"", "false ? verdict(\"NOT_BEYOND\""]], "C3 · SHELL"],
  ["F39-S6", "F39 C3 an exact duplicate is NOT BEYOND current pages", [["src/page/information-gain.mjs", "measured.exact.state === \"EXACT_DUPLICATE\" ? verdict(\"NOT_BEYOND\"", "false ? verdict(\"NOT_BEYOND\""]], "C3 · SHELL"],
  ["F39-S7", "F39 C3 a reviewed duplicate is NOT BEYOND current pages", [["src/page/information-gain.mjs", ": reviewedDup ? verdict(\"NOT_BEYOND\"", ": false ? verdict(\"NOT_BEYOND\""]], "C3 · SHELL"],
  ["F39-S8", "F39 C3 a recorded no-gain comparison is NOT BEYOND competitors", [["src/page/information-gain.mjs", ": cmp.gainBeyond === false ? verdict(\"NOT_BEYOND\"", ": false ? verdict(\"NOT_BEYOND\""]], "C3 · SHELL"],
  ["F39-S9", "F39 C3 any NOT BEYOND is REFUSED", [["src/page/information-gain.mjs", "const outcome = states.includes(\"NOT_BEYOND\") ? GAIN_OUTCOME.REFUSED", "const outcome = false ? GAIN_OUTCOME.REFUSED"]], "C3 · SHELL"],
  ["F39-S10", "F39 C4 no recorded comparison is NOT MEASURED", [["src/page/information-gain.mjs", "b.competitors = !cmp ? verdict(\"NOT_MEASURED\", [], MISSING.COMPETITORS)", "b.competitors = !cmp ? verdict(\"BEYOND\", [\"assumed\"])"]], "C4 · the"],
  ["F39-S11", "F39 C4 a comparison must name a competitor compared", [["src/page/information-gain.mjs", "Number(cmp.competitorsCompared) >= 1", "Number(cmp.competitorsCompared) >= 0"]], "C4 · the"],
  ["F39-S12", "F39 C5 CANNOT DECIDE names every missing fact", [["src/page/information-gain.mjs", "missing: Object.freeze(outcome === GAIN_OUTCOME.CANNOT_DECIDE ? missing : []),", "missing: Object.freeze([]),"]], "C5 · FIRING CONTROL: an"],
  ["F39-S13", "F39 C5 unmeasured never becomes a verdict", [["src/page/information-gain.mjs", "    : GAIN_OUTCOME.CANNOT_DECIDE;", "    : GAIN_OUTCOME.REFUSED;"]], "C5 · FIRING CONTROL: an"],
  ["F39-S14", "F39 C7 an unverified body measures nothing", [["src/page/information-gain.mjs", "for (const k of BASELINES) b[k] = verdict(\"NOT_MEASURED\", [], MISSING.BODY);", "for (const k of BASELINES) b[k] = verdict(\"BEYOND\", [\"assumed\"]);"]], "C7 · an unverified body"],
  ["F39-S15", "F39 C7 evidence is passed, never defaulted", [["src/page/information-gain.mjs", "throw new TypeError(\"gain evidence must be passed explicitly", "return; throw new TypeError(\"gain evidence must be passed explicitly"]], "C7 · an unverified body"],
  ["F39-S16", "F39 C6 the tools' gate needs gain ESTABLISHED", [["src/page/existing-page-population.mjs", "mayProduce: mayProduceCandidate(decision, rte) && informationGain.outcome === GAIN_OUTCOME.ESTABLISHED,", "mayProduce: mayProduceCandidate(decision, rte),"]], "C6 ·"],
  ["F39-S17", "F39 C6 construction accepts only an ESTABLISHED gain", [["src/page/construct.mjs", "state: gain.outcome === GAIN_OUTCOME.ESTABLISHED ? PASS : gain.outcome === GAIN_OUTCOME.REFUSED ? FAIL : NOT_TESTED,", "state: PASS,"]], "F36 · C1"],
  ["F39-S18", "F39 C6 no verified population is never 'no other current page'", [["src/page/construct.mjs", "const currentPages = existingPages?.inventory ? verifiedPages(existingPages) : null;", "const currentPages = existingPages?.inventory ? verifiedPages(existingPages) : [];"]], "F36 · C1"],
  ["F39-S19", "F39 C6 the census holds F39 on construction", [["config/page-production.mjs", "\"rightToExist({\", \"informationGainForCandidate(\", \"state: gain.outcome === GAIN_OUTCOME.ESTABLISHED ? PASS\"]", "\"rightToExist({\"]"]], "C6 ·"],
  ["F39-S20", "F39 C6 a tool that skips F39 is a census fault", [["subjects/almi-oet/tools/nursing-chain.mjs", "html: candidateHtml, gainEvidence: NO_RECORDED_GAIN_EVIDENCE", "html: candidateHtml"]], "C6 ·"],
  ["F39-S21", "F39 C5/C7 the entry point prints its bound", [["bin/page-information-gain.mjs", "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");"]], "C5/C7 · THE ENTRY POINT:"],
  ["F39-S22", "F39 C7 a network call is seen", [["tools/need-coverage-call-paths.mjs", "{ code: \"RAW_NETWORK_CALL\", test: (t) => t.split(\"\\n\").some((l) => RAW_EGRESS.test(l)) },", "{ code: \"RAW_NETWORK_CALL\", test: () => false },"]], "C7 · the decision"],
  /* ── F39 C3 AS AMENDED (Acceptance Amendment 1, RR-192) ── */
  ["F39-A1", "F39 C3 AS AMENDED · a review F32 held for guidance makes the current-pages baseline NOT BEYOND", [["src/page/information-gain.mjs", "    const reviewedDup = pairs.find((p) => p.semantic.state === \"DUPLICATE\");", "    const reviewedDup = pairs.find((p) => p.semantic.state === \"DUPLICATE\" || p.semantic.heldForGuidance);"]], "C3 AS AMENDED · a duplicate"],
  ["F39-A2", "F39 C3 AS AMENDED · a review F32 held for guidance makes the current-pages baseline BEYOND", [["src/page/information-gain.mjs", "      : pairs.every((p) => p.semantic.state === \"DISTINCT\") && gain ? verdict(\"BEYOND\"", "      : pairs.every((p) => p.semantic.state === \"DISTINCT\" || p.semantic.heldForGuidance) && gain ? verdict(\"BEYOND\""]], "C3 AS AMENDED · a duplicate"],
  ["F39-A3", "F39 C3 AS AMENDED · the NOT MEASURED a held review leaves names no missing fact", [["src/page/information-gain.mjs", "${h} pair(s) HELD — ${DUPLICATION_MISSING.GUIDANCE_FREE}`", "${h} pair(s) HELD`"]], "C3 AS AMENDED · a duplicate"],
  /* ── T-1 (RTP-1 §17 S8 and S9; PG-A1): each retired decider sabotaged back to its number ── */
  ["T1-01", "T-1 · Gate A rejects again on the 350-word figure", [["src/gate-a/run.mjs", "    if (!r.whyThisUrlPresent) { r.verdict = \"REJECT\"; r.rejectedAt = \"whyThisUrl\"; }", "    if (r.belowUniqueWordsSignal) { r.verdict = \"REJECT\"; r.rejectedAt = \"uniqueWords\"; }\n    else if (!r.whyThisUrlPresent) { r.verdict = \"REJECT\"; r.rejectedAt = \"whyThisUrl\"; }"]], "🔴 a page below the 350-word signal"],
  ["T1-02", "T-1 · Gate A rejects again on the five-fact figure", [["src/gate-a/run.mjs", "    if (!r.whyThisUrlPresent) { r.verdict = \"REJECT\"; r.rejectedAt = \"whyThisUrl\"; }", "    if (!r.factsReachSignal) { r.verdict = \"REJECT\"; r.rejectedAt = \"facts\"; }\n    else if (!r.whyThisUrlPresent) { r.verdict = \"REJECT\"; r.rejectedAt = \"whyThisUrl\"; }"]], "V4 ·"],
  ["T1-03", "T-1 · Gate A rejects again above the 0.40 figure", [["src/gate-a/run.mjs", "    else if (r.overlapAboveReviewSignal === true) { r.verdict = \"REVIEW_REQUIRED\"; r.reviewAt = \"overlap\"; }", "    else if (r.overlapAboveReviewSignal === true) { r.verdict = \"REJECT\"; r.rejectedAt = \"overlap\"; }"]], "🔴 RED: the last one standing"],
  ["T1-04", "T-1 · countFacts reports a pass on the five-fact figure again", [["src/gate-a/facts.mjs", "    reachesSignal: qualifying.length >= MIN_FACTS,", "    passes: qualifying.length >= MIN_FACTS,"]], "RR-192 T-1: four qualifying facts"],
  ["T1-05", "T-1 · ROW25 decides unique value on 350 again", [["src/gate-a/existing-pages.mjs", "        belowUniqueWordsSignal: unique === null ? null : unique < MIN_UNIQUE_WORDS,", "        uniquePass: unique === null ? null : unique >= MIN_UNIQUE_WORDS,"]], "🔴 UNIQUE VALUE"],
  ["T1-06", "T-1 · ROW25 decides sibling overlap on 0.40 again", [["src/gate-a/existing-pages.mjs", "        overlapAboveReviewSignal: measured ? o.maxOverlap > MAX_SIBLING_OVERLAP : null,", "        overlapPass: measured ? o.maxOverlap <= MAX_SIBLING_OVERLAP : null,"]], "🔴 SIBLING OVERLAP"],
  ["T1-07", "T-1 · ROW25 decides fact presence on five again", [["src/gate-a/existing-pages.mjs", "        factsReachSignal: counted.reachesSignal,", "        factsPass: counted.reachesSignal,"]], "🔴 VERIFIED-FACT PRESENCE"],
  ["T1-08", "T-1 · ROW25's page check gives unique value PASS / FAIL on 350 again", [["src/gate-a/page-quality.mjs", "{ state: m.belowUniqueWordsSignal ? \"BELOW_SIGNAL\" : \"AT_OR_ABOVE_SIGNAL\"", "{ state: m.belowUniqueWordsSignal ? \"FAIL\" : \"PASS\""]], "12 · 13 ·"],
  ["T1-09", "T-1 · ROW25's page check gives sibling overlap FAIL on 0.40 again", [["src/gate-a/page-quality.mjs", "{ state: m.overlapAboveReviewSignal ? \"REVIEW_REQUIRED\" : m.overlapNoisy", "{ state: m.overlapAboveReviewSignal ? \"FAIL\" : m.overlapNoisy"]], "12 · 13 ·"],
  ["T1-10", "T-1 · why-this-url reads Gate A's retired 0.40 decider again", [["src/gate-a/why-this-url.mjs", "import { OVERLAP_REVIEW_TRIGGER } from \"./adaptive.mjs\";", "import { OVERLAP_REVIEW_TRIGGER } from \"./adaptive.mjs\";\nimport { MAX_SIBLING_OVERLAP } from \"./run.mjs\";"], ["src/gate-a/why-this-url.mjs", "export const WHY_NEAR_IDENTICAL = OVERLAP_REVIEW_TRIGGER;", "export const WHY_NEAR_IDENTICAL = MAX_SIBLING_OVERLAP;"]], "T1-NO-COPY · no module"],
  ["T1-11", "T-1 · construction imports Gate A's retired deciders again", [["src/page/construct.mjs", "} from \"../gate-a/adaptive.mjs\"; /* RR-192 · T-1: Gate A's 350/5/0.40 are no longer imported */", "} from \"../gate-a/adaptive.mjs\";\nimport { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from \"../gate-a/run.mjs\";"]], "T1-NO-COPY · no module"],
  ["T1-12", "T-1 · axis-discovery re-declares its own copy of 0.4", [["src/discovery/axis-discovery.mjs", "import { OVERLAP_REVIEW_TRIGGER } from \"../gate-a/adaptive.mjs\";", "const OVERLAP_REVIEW_TRIGGER = 0.4;"]], "T1-NO-COPY · no module"],
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
  `RR-192 R6a sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
