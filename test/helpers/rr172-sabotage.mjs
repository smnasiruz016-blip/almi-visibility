/**
 * 🔴 RR-172 · R2 · ONE SABOTAGE PER FAILURE CONDITION of F91 Acceptance Amendment 3 (C13–C18) and F33 Acceptance Amendment 1 (C8) — and,
 * for F33's re-proof (ruling 3c, evidence item E3), one per F33 clause C1–C7 — each on code LIVE NOW, its span found EXACTLY ONCE, applied
 * ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never a crash of the TEST), every file restored by
 * raw-byte sha256, the production trail hashed before and after.
 *
 *   node test/helpers/rr172-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr172-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr172-sabotage-<date>T<hhmm>.txt. Neither
 * overwrites an earlier file. The method of test/helpers/rr170-sabotage.mjs, unchanged. A sabotage on F34's file (F33 C1, C6) changes
 * nothing that stays: the bytes are restored and checked by hash before the next one.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PO = "src/page/page-opportunities.mjs", DC = "src/page/demand-connection.mjs", AS = "src/page/answer-support.mjs", GN = "src/page/grouped-need-coverage.mjs";
const BDC = "bin/demand-connect.mjs", NC = "src/page/need-coverage.mjs", EPF = "src/page/existing-page-first.mjs";
const T = ["test/rr172-r2-f91-f33.test.mjs", "test/f33-need-coverage.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr172-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const RDLINE = "    state: TIERS.RESEARCH_DERIVED, tier: TIERS.RESEARCH_DERIVED, wording: r.wording.text, route: r.route,";
const RDHEAD = "    if (!present(r.question_id) || r.tier !== RESEARCH_TIER || !present(r.wording?.text)) return REFUSAL.NOT_A_QUESTION;";
const OTHER = "  return ok(LABEL.SECONDARY, claim.estimate === true";
const SABOTAGES = [
  /* ── F91 C13 ── */
  ["S01", "F91 C13 · two lines are summed", [[PO, "    researchDerived: { label: LABELS.researchDerived, value: rdCandidates,", "    researchDerived: { label: LABELS.researchDerived, value: rdCandidates + (measured(verified.value) ? verified.value : 0),"]], "T13a"],
  ["S02", "F91 C13 · a research-derived item appears inside verified opportunities", [[PO, '  "RESEARCH-DERIVED": Object.freeze({ qualifies: false,', '  "RESEARCH-DERIVED": Object.freeze({ qualifies: true,']], "T13a"],
  ["S03", "F91 C13 · owned search evidence appears as client-received", [[PO, "    clientReceived: { label: LABELS.clientReceived, ...nm(NO_CLIENT_INTAKE),", "    clientReceived: { label: LABELS.clientReceived, value: ownedItems,"]], "T13a"],
  ["S04", "F91 C13 · a NOT MEASURED count shows as 0", [[PO, '  return Object.freeze(Object.fromEntries(ACTION_LINES.map((a) => [a, Object.freeze({ label: a, ...nm(F35_GROUPED),', '  return Object.freeze(Object.fromEntries(ACTION_LINES.map((a) => [a, Object.freeze({ label: a, value: 0,']], "T13a"],
  ["S05", "F91 C13 · a line lacks AS AT or its left-out count", [[PO, "export const formatLine = (n, asAt) => `${formatNumber(n)} · ${asAt} · left out ${n.leftOut} (${n.leftOutWhy})`;", "export const formatLine = (n, asAt) => `${formatNumber(n)}`;"]], "T13b"],
  /* ── F91 C14 ── */
  ["S06", "F91 C14 · a step runs out of order (coverage before the connection it covers)", [[BDC, "const after = [...held(), ...toWrite];", "const after = [...held()];"]], "T14a"],
  ["S07", "F91 C14 · number 3 requires a number-2 limb", [[PO, "  const needed = neededNewPages({ needs, decisions });", "  const needed = neededNewPages({ needs, decisions: measured(verified.value) ? decisions : null });"]], "T14d"],
  ["S08", "F91 C14 · a need reaches F35 without a coverage record", [[DC, "  return Object.freeze(needIds.map((needId) => {", "  return Object.freeze(needIds.slice(1).map((needId) => {"]], "T14a"],
  ["S09", "F91 C14 · a country-only or language-only difference splits a group", [[DC, "    } else needId = needOfWording.get(normaliseWording(fields.wording))", "    } else needId = needOfWording.get(normaliseWording(fields.wording) + fields.country + fields.language)"]], "T14c"],
  ["S10", "F91 C14 · two intents merge (by resemblance)", [[DC, "    } else needId = needOfWording.get(normaliseWording(fields.wording))", "    } else needId = (needOfWording.get(normaliseWording(fields.wording)) ?? [...needOfWording.entries()].find(([w]) => w.split(\" \").slice(0, 3).join(\" \") === normaliseWording(fields.wording).split(\" \").slice(0, 3).join(\" \"))?.[1])"]], "T14c"],
  ["S11", "F91 C14 · the coverage record F35 reads carries no missing relevant question (ADD SECTION unreachable)", [[DC, "  return p ? Object.freeze({ newQuestionInIntent: p.newQuestionInIntent === true,", "  return p ? Object.freeze({ newQuestionInIntent: false,"]], "T14b"],
  /* ── F91 C15 ── */
  ["S12", "F91 C15 · an ordering is checked (the order law restored)", [[PO, "  return { possible, verified, groups, lines, needed, actions, asAt, notice: SAMPLE_NOTICE };", "  return { possible, verified, groups, lines, needed, actions, asAt, notice: SAMPLE_NOTICE, order: { state: (needed.OBSERVED.value ?? 0) > (possible.value ?? 0) ? \"BREACHED — a planner defect\" : \"HOLDS\" } };"]], "T15a"],
  ["S13", "F91 C15 · possible combinations is shown as a ceiling", [[PO, "not a page estimate, not an upper bound on any other line\",", "not a page estimate — the ceiling for every other line\","]], "T15a"],
  /* ── F91 C16 ── */
  ["S14", "F91 C16 · a research-derived question is refused admission", [[DC, "  if (r?.record_type === RESEARCH_DERIVED_RECORD) {", "  if (r?.record_type === RESEARCH_DERIVED_RECORD) {\n    return REFUSAL.NOT_A_QUESTION;"]], "T16a"],
  ["S15", "F91 C16 · a research-derived question is handed on as observed", [[DC, RDLINE, RDLINE.replace("tier: TIERS.RESEARCH_DERIVED,", "tier: TIERS.OBSERVED,")]], "T16b"],
  ["S16", "F91 C16 · a research-derived question enters verified demand", [[DC, RDLINE, RDLINE.replace("state: TIERS.RESEARCH_DERIVED,", "state: TIERS.OBSERVED,")]], "T16c"],
  ["S17", "F91 C16 · a research-derived question is connected outside C9 (no candidate check)", [[DC, "    if (!candidates || !d?.combination || !candidates.has(candidateKey(d.combination))) { refuse(d, REFUSAL.CANDIDATE); continue; }", "    if (r.record_type !== RESEARCH_DERIVED_RECORD && (!candidates || !d?.combination || !candidates.has(candidateKey(d.combination)))) { refuse(d, REFUSAL.CANDIDATE); continue; }"]], "T16d"],
  ["S18", "F91 C16 · a research-derived question not assessed RELEVANT is admitted", [[DC, "    if (relevanceOf(r.question_id, assessments) !== RELEVANCE.RELEVANT) return REFUSAL.NOT_RELEVANT;", ""]], "T16e"],
  ["S19", "F91 C16 · a fixture enters", [[DC, "    if (overturned.has(r.question_id)) return REFUSAL.OVERTURNED;\n    if (isFixture(r)) return REFUSAL.FIXTURE;", "    if (overturned.has(r.question_id)) return REFUSAL.OVERTURNED;"]], "T16f"],
  ["S20", "F91 C16 · a field it does not have becomes a refusal", [[DC, RDHEAD, RDHEAD.replace("|| !present(r.wording?.text))", "|| !present(r.wording?.text) || !present(r.plan_id))")]], "T16g"],
  /* ── F91 C17 ── */
  ["S21", "F91 C17 · a claim stating a body's rule cites something other than that body", [[AS, "    if (!present(claim.body) || s.kind !== SOURCE_KINDS.BODY || s.body !== claim.body) return unknown(CLAIM_UNKNOWN.BODY);", "    if (!present(claim.body)) return unknown(CLAIM_UNKNOWN.BODY);"]], "T17b"],
  ["S22", "F91 C17 · an ordinary claim is refused for want of an official body (tightened)", [[AS, OTHER, `  if (s.kind !== SOURCE_KINDS.BODY) return unknown(CLAIM_UNKNOWN.BODY);\n${OTHER}`]], "T17e"],
  ["S23", "F91 C17 · a secondary source is called official", [[AS, 'LABEL = Object.freeze({ BODY: "RESPONSIBLE BODY", PRODUCT: "PRODUCT\'S OWN SITE", SECONDARY: "SECONDARY" });', 'LABEL = Object.freeze({ BODY: "RESPONSIBLE BODY", PRODUCT: "PRODUCT\'S OWN SITE", SECONDARY: "OFFICIAL" });']], "T17d"],
  ["S24", "F91 C17 · a third-party estimate is presented as an official fee", [[AS, "    if (claim.estimate === true) return unknown(CLAIM_UNKNOWN.ESTIMATE_AS_OFFICIAL);", ""]], "T17c"],
  ["S25", "F91 C17 · a source that does not support the claim is accepted", [[AS, "  if (claim.supports?.finding !== SUPPORTS || !present(claim.supports?.ref)) return unknown(CLAIM_UNKNOWN.NOT_SUPPORTED);", ""]], "T17f"],
  ["S26", "F91 C17 · an unsupported answer is not UNKNOWN", [[AS, "    state: supported === judged.length ? ANSWER_STATES.SUPPORTED : supported > 0 ? ANSWER_STATES.PARTLY : ANSWER_STATES.UNKNOWN,", "    state: supported === judged.length ? ANSWER_STATES.SUPPORTED : ANSWER_STATES.PARTLY,"]], "T17g"],
  ["S27", "F91 C17 · \"supported\" is loosened (an unnamed, unlinked or undated source accepted)", [[AS, '  if (!present(s.name) || !present(s.link) || !ISO_DAY.test(s.readOn ?? "")) return unknown(CLAIM_UNKNOWN.SOURCE);', ""]], "T17f"],
  ["S28", "F91 C17 · a product fact from the product's own site is refused (as F44's capability rule would)", [[AS, "    if (s.kind !== SOURCE_KINDS.PRODUCT_SITE || !officialSites.includes(originOf(s.link))) return unknown(CLAIM_UNKNOWN.PRODUCT);", "    return unknown(CLAIM_UNKNOWN.PRODUCT);"]], "T17h"],
  ["S29", "F91 C17 · a source category (tier 4) is refused as a whole", [[AS, OTHER, `  if (s.registryTier === 4) return unknown(CLAIM_UNKNOWN.SOURCE);\n${OTHER}`]], "T17i"],
  ["S30", "F91 C17 · a forum reply answers", [[AS, "  if (s.kind === SOURCE_KINDS.FORUM) return unknown(CLAIM_UNKNOWN.FORUM);", ""]], "T17j"],
  ["S31", "F91 C17 · the answer path calls the fact-registry validator", [[AS, "export const CLAIM_KINDS = ", 'import "../facts/validate.mjs";\nexport const CLAIM_KINDS = ']], "T17j"],
  /* ── F91 C18 ── */
  ["S32", "F91 C18 · a group with a supported central answer is HELD for want of official verification", [[DC, "      : answer.centralSupported !== true ? RECOMMENDATION.HELD_ANSWER : RECOMMENDATION.NOT_COVERED;", "      : answer.state !== \"SUPPORTED\" || (answer.claims ?? []).some((c) => c.label === \"SECONDARY\") ? RECOMMENDATION.HELD_ANSWER : RECOMMENDATION.NOT_COVERED;"]], "T18"],
  /* ── F33 C8 (and the R2 failure "coverage decided by similarity alone") ── */
  ["S33", "F33 C8 · a grouped need is refused for not being a registered value", [[GN, "  const questions = Array.isArray(need?.questions)", "  if (need?.registered !== true) return out(G.REFUSED, R.POPULATION_UNAVAILABLE);\n  const questions = Array.isArray(need?.questions)"]], "T33e"],
  ["S34", "F33 C8 · PARTIAL is reported as FULL", [[GN, "  if (served.length === questions.length) return out(G.FULL, R.FULL, extra);", "  if (served.length > 0) return out(G.FULL, R.FULL, extra);"]], "T33e"],
  ["S35", "F33 C8 · a missing relevant question is not named", [[GN, "missingQuestions: Object.freeze(perQuestion.filter((q) => q.covering.length === 0).map((q) => q.questionId)) });", "missingQuestions: Object.freeze([]) });"]], "T33e"],
  ["S36", "F33 C8 · NONE is given over a population not recorded COMPLETE", [[GN, '  if (population.coverageState !== "COMPLETE") return out(G.CANNOT_DECIDE, R.NOT_COMPLETE,', "  if (false) return out(G.CANNOT_DECIDE, R.NOT_COMPLETE,"]], "T33a"],
  ["S37", "F33 C8 · NONE is given without positive evidence against every existing page", [[GN, "  if (undecided.length) return out(G.CANNOT_DECIDE, R.UNDECIDED,", "  if (false) return out(G.CANNOT_DECIDE, R.UNDECIDED,"]], "T33a"],
  ["S38", "F33 C8 · coverage is decided by similarity (ruling 3a)", [[GN, "      if (headings.get(p.pageId).has(normaliseWording(q.wording)))", "      if ([...headings.get(p.pageId)].some((h) => h.startsWith(normaliseWording(q.wording)) || normaliseWording(q.wording).startsWith(h)))"]], "T33c"],
  ["S39", "F33 C8 · a coverage judgement carrying an approval is accepted (ruling 3a)", [[GN, '  if (Object.keys(v).some((k) => APPROVAL.test(k)) || Object.keys(v.source ?? {}).some((k) => APPROVAL.test(k))) return "A_COVERAGE_JUDGEMENT_IS_NEVER_AN_APPROVAL";', ""]], "T33d"],
  ["S40", "F33 C8 · the word 'human' accepted as a coverage judgement's source (ruling 3a)", [[GN, "  if ([v.source.ref, v.reason].some((s) => HUMAN.test(s))) return", "  if (false) return"]], "T33d"],
  /* ── F33's re-proof, C1–C7 (evidence item E3: a sabotage per clause), each on F33's own tests ── */
  ["S41", "F33 C1 · missing or unknown-shape existing-page information is not REFUSED", [[EPF, "  if (population === null || typeof population !== \"object\" || !Array.isArray(population.pages) || !COVERAGE_STATES.includes(population.coverageState)) {", "  if (population === null || typeof population !== \"object\" || !Array.isArray(population.pages)) {"]], "C1 · missing, malformed or foreign"],
  ["S42", "F33 C2 · a covering page does not make the need COVERED", [[NC, "  if (pages.some((p) => p.verdict === PAGE_VERDICTS.COVERS)) return out(O.COVERED, R.COVERED, pages);", ""]], "C2 · COVERED on the REAL structure:"],
  ["S43", "F33 C3 · NOT COVERED is given over a population not recorded COMPLETE", [[NC, '  if (population.coverageState !== "COMPLETE") return out(O.CANNOT_DECIDE, R.NOT_COMPLETE, pages);', ""]], "C3 · NOT COVERED is NEVER given"],
  ["S44", "F33 C4 · an undecidable page does not make the need CANNOT DECIDE", [[NC, "  if (pages.some((p) => p.verdict === PAGE_VERDICTS.UNDECIDED)) return out(O.CANNOT_DECIDE, R.UNDECIDED_PAGES, pages);", ""]], "C4 · each undecidable world is CANNOT DECIDE:"],
  ["S45", "F33 C5 · an outcome loses its per-page evidence", [[NC, "  return Object.freeze({ pageId: page.pageId, evidence, verdict: VERDICT_OF[evidence],", "  return Object.freeze({ pageId: page.pageId, evidence: \"\", verdict: VERDICT_OF[evidence],"]], "C5 · every outcome carries its reason"],
  ["S46", "F33 C6 · the routed check does not judge every page", [[EPF, "  const need = decideNeedCoverage({ need: candidate?.intent, structure: candidate?.structure, population });", "  const need = decideNeedCoverage({ need: candidate?.intent, structure: candidate?.structure, population: { ...population, pages: population.pages.slice(1) } });"]], "C6 · the one check every routed path calls"],
  ["S47", "F33 C7 · the decision reaches a network call", [[NC, 'import { tokenise, textOf } from "../gate-a/tokens.mjs";', 'import { tokenise, textOf } from "../gate-a/tokens.mjs";\nexport const probe = () => fetch("https://probe.invalid");']], "C7 · the decision loads no module"],
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
  `RR-172 R2 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
