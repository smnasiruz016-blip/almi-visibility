/**
 * 🔴 RR-179 · R4 · ONE SABOTAGE PER FAILURE CONDITION of F91 Acceptance Amendment 4 (C19), F41 Acceptance Amendment 1 (C1 as amended, C8),
 * F36 under S38 and the owner's record B, construction under ruling RR-179 (c) and D1, and FS-A1 — and, for the three re-proofs (F41, F36,
 * F35; evidence item "a sabotage per clause"), one per clause — each on code LIVE NOW, its span found EXACTLY ONCE, applied ALONE, the named
 * test confirmed GREEN first and then required RED by an AssertionError (never a crash of the TEST), every file restored by raw-byte sha256,
 * the production trail hashed before and after. FIXTURE PAGES ONLY for every R4 proof (RR-177).
 *
 *   node test/helpers/rr179-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr179-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr179-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The method of test/helpers/rr174-sabotage.mjs, unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SC = "src/page/spec-compiler.mjs", AE = "src/page/action-evidence.mjs", AD = "src/page/action-decision.mjs", CON = "src/page/construct.mjs";
const WHY = "src/gate-a/why-this-url.mjs", RTE = "src/page/right-to-exist.mjs", CB = "src/page/content-brief.mjs", CBE = "src/page/content-brief-evidence.mjs";
const VAL = "src/facts/validate.mjs", GF = "src/gate-a/facts.mjs", RND = "src/page/render.mjs", SCH = "src/facts/schema.mjs";
const T = ["test/rr179-r4.test.mjs", "test/page-construction.test.mjs", "test/f36-right-to-exist.test.mjs", "test/f41-content-brief.test.mjs", "test/f35-action-decision.test.mjs", "test/rr174-r3-f35-f34.test.mjs", "test/facts-registry.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr179-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const LONE = '    checks.push({ check: "distinct from every sibling", state: "PASS", basis: LONE_PAGE });\n    return out("PASS", null, null);';
const CHOSEN = "    const chosen = Array.isArray(decisions) ? decisions.find((d) => d?.slug === slug && isChosenCreate(d.decision)) ?? null : null;";
const SABOTAGES = [
  /* ── F91 C19 · the spec compiler ── */
  ["S01", "F91 C19 · a spec carries a claim with no supporting record", [[SC, "  const supported = claims.filter((c) => c.state === ANSWER_STATES.SUPPORTED && present(c.claimId));", "  const supported = claims.filter((c) => present(c.claimId));"]], "T19a"],
  ["S02", "F91 C19 · a spec carries a fact not in the need's records", [[SC, "    claims: Object.freeze([...new Set(supported.map((c) => c.claimId))].sort()),", "    claims: Object.freeze([...new Set([...supported.map((c) => c.claimId), \"c-invented\"])].sort()),"]], "T19e"],
  ["S03", "F91 C19 · the GENERATED marking is lost", [[SC, "marking: q.generated ? GENERATED : null,", "marking: null,"]], "T19a"],
  ["S04", "F91 C19 · an UNKNOWN part is dropped", [[SC, "    claims: answer.claims, unknown: answer.unknown,\n", "    claims: answer.claims, unknown: [],\n"]], "T19a"],
  ["S05", "F91 C19 · a spec is compiled for a need F35 HELD for another reason", [[SC, "decision.missing?.length === 1 && decision.missing[0] === NO_DECLARED_SPEC_HOLD", "decision.missing?.length >= 1"]], "T19b"],
  /* practice finding: the purpose guard alone is unreachable once the second pass has decided (no final decision is a no-spec HOLD), so
   * sabotaging it stayed green; this sabotage hands the judgement pool itself to construction */
  ["S06", "F91 C19 · a spec compiled for judgement reaches construction", [[AE, "  const forConstruction = [], sectionProposals = [], refusals = [];", "  const forConstruction = pool.map((p) => Object.freeze({ slug: p.slug, decision: null, spec: p.spec })), sectionProposals = [], refusals = [];"]], "T19b"],
  ["S07", "F91 C19 · the compiler writes", [[SC, 'import { createHash } from "node:crypto";', 'import { createHash } from "node:crypto";\nimport { writeFileSync } from "node:fs";']], "T19e"],
  ["S08", "F91 C19 · an IMPROVE / ADD SECTION need yields a new page", [[AE, "    (purpose === PURPOSE.CONSTRUCTION ? forConstruction : sectionProposals).push(", "    (purpose === PURPOSE.CONSTRUCTION || true ? forConstruction : sectionProposals).push("]], "T19c"],
  ["S09", "F91 C19 · a section proposal holds questions the page already answers", [[SC, "    wanted = usable.filter((q) => missing.has(q.questionId));", "    wanted = usable;"]], "T19c"],
  ["S10", "F91 C19 · a heading attributes a question to people without observed evidence", [[SC, "    const why = attributionRefusal(q.wording, { tier: q.tier });", "    const why = null;"]], "T19d"],
  ["S11", "F91 C19 · the compiler rewrites a question's wording", [[SC, "    heading: q.wording, questionId: q.questionId,", "    heading: q.wording.toLowerCase(), questionId: q.questionId,"]], "T19d"],
  ["S12", "F91 C19 · the spec's subject is not the group id", [[SC, "    subject: needId,\n    variant: needId,", "    subject: decision.subject.pageCandidate,\n    variant: needId,"]], "T19a"],
  ["S13", "F91 C19 · the same need compiled twice gives different bytes", [[SC, "export const specBytes = (spec) => JSON.stringify(spec);", "export const specBytes = (spec) => JSON.stringify({ ...spec, at: Math.random() });"]], "T19e"],
  /* ── F35 · I-3, and the re-proof: one per clause ── */
  ["S14", "F35 C3 · a need HELD for want of a spec is never judged on its compiled spec", [[AE, "(forJudgement[i] ? decideFor(g, rteCompiled(forJudgement[i])) : firstPass[i])", "firstPass[i]"]], "T35a"],
  ["S15", "F35 C9 · the compiled spec's not-served part ignores the need's coverage record", [[AE, "existingPageDecision: existingPageDecisionFromCoverage(coverage.get(spec.subject) ?? null), rationaleReviews", "existingPageDecision: existingPageDecisionFromCoverage(null), rationaleReviews"]], "T35a"],
  ["S16", "F35 C4 · a covered need's compiled spec reads as not served", [[SC, '  if (record.coverage === "FULL" || record.coverage === "PARTIAL") return out(', '  if (false) return out(']], "T35c"],
  ["S17", "F35 C1 · a chosen action carries no evidence", [[AD, "evidence: Object.freeze([...new Set(evidence.filter(Boolean))])", "evidence: Object.freeze([])"]], "C1/C6 · every chosen action carries its rule and evidence,"],
  ["S18", "F35 C2 · contradicting actions are both returned", [[AD, "  return names.length > 1 && names.some((n) => EXCLUSIVE.includes(n));", "  return false;"]], "C2 · contradicting actions are CANNOT DECIDE,"],
  ["S19", "F35 C3 · CREATE with right-to-exist not ESTABLISHED", [[AD, '  if (rightToExist.outcome !== "ESTABLISHED") return hold(subject,', "  if (false) return hold(subject,"]], "T3b"],
  ["S20", "F35 C4 · a FULL-coverage, no-gap need is forced to change", [[AD, 'return decided(subject, chosen("KEEP", "FULL_COVERAGE_AND_NO_NEEDED_GAP",', 'return decided(subject, chosen("IMPROVE", "FULL_COVERAGE_AND_NO_NEEDED_GAP",']], "T4a"],
  ["S21", "F35 C5 · LINK chosen off its rule", [[AD, "  if (e.inboundLinks === 0) {", "  if (e.inboundLinks === -1) {"]], "C5 · the existing-page rules:"],
  ["S22", "F35 C6 · an owner-approval action lacks its label", [[AD, "ownerApprovalRequired: OWNER_APPROVAL.includes(action),", "ownerApprovalRequired: false,"]], "C1/C6 · every chosen action carries its rule and evidence,"],
  ["S23", "F35 C7 · the decision reaches a network call", [[AD, 'import { SEMANTIC_ASPECTS } from "./duplication.mjs";', 'import { SEMANTIC_ASPECTS } from "./duplication.mjs";\nexport const probe = () => fetch("https://probe.invalid");']], "C7 · the decision and its evidence reader load no module"],
  ["S24", "F35 C8 · CREATE with an unsupported central answer", [[AD, '  if (need.centralSupported !== true) return hold(subject, ["the central answer is unsupported (F35 C8b; F91 C18)"], extra);', ""]], "T8b"],
  ["S25", "F35 C9 · a page decision other than HOLD for a need with no recorded question", [[AD, '  if (!(need.questions > 0)) return hold(subject, ["no recorded relevant question (F35 C9, A1)"], extra);', ""]], "T9b"],
  /* ── F36 · S38 and record B, and the re-proof: one per clause ── */
  ["S26", "F36 C2 · a rationale is refused on the percentage alone (S38)", [[WHY, "    if (score > WHY_NEAR_IDENTICAL) {\n", "    if (score > WHY_NEAR_IDENTICAL) failures.push(`near-identical to ${s.slug}'s rationale (the percentage)`);\n    if (false) {\n"]], "C2 · S38:"],
  ["S27", "F36 C2 · a lone page is left NOT TESTED for having no sibling (record B)", [[WHY, LONE, '    checks.push({ check: "distinct from every sibling", state: "BLOCKED / NOT TESTED" });\n    return out("BLOCKED / NOT TESTED", null, "no sibling");']], "C2/C4 · a sibling with no reason"],
  ["S28", "F36 C2 · a recorded SAME review does not refuse", [[WHY, "      if (review?.verdict === RATIONALE_REVIEW.SAME) failures.push(", "      if (false) failures.push("]], "C1/C2 ·"],
  ["S29", "F36 C2 · an approval-carrying or person-sourced review decides", [[WHY, " && RATIONALE_REVIEW_SOURCES.includes(r.source?.kind) && !Object.keys(r).some((k) => /approv/i.test(k))", ""]], "C2 · S38:"],
  ["S30", "F36 C1 · a candidate is produced without an ESTABLISHED right to exist", [[RTE, "  return Boolean(existingPageDecision?.mayProduce) && rte?.outcome === RIGHT_TO_EXIST.ESTABLISHED;", "  return Boolean(existingPageDecision?.mayProduce);"]], "C1 · the gate's rule:"],
  ["S31", "F36 C2 · a variable-only reason passes", [[WHY, "  if (need.length === 0) {", "  if (false) {"]], "C1/C2 ·"],
  ["S32", "F36 C3 · right-to-exist ESTABLISHED where an existing page covers the need", [[RTE, '    ? { state: "FAIL", reason: "AN_EXISTING_PAGE_COVERS_THE_NEED', '    ? { state: "PASS", reason: "AN_EXISTING_PAGE_COVERS_THE_NEED']], "C3 ·"],
  ["S33", "F36 C4 · the unmeasurable residue is omitted", [[RTE, "checks: why.checks, notMeasured: NOT_MEASURED_RESIDUE });", "checks: why.checks, notMeasured: null });"]], "C2/C4 · a specific reason and an unserved need"],
  ["S34", "F36 C5 · construction's path no longer reaches the one function, visibly", [[CON, "    const rte = rightToExist({ slug, spec: me.spec,", "    const rte = (rightToExist)({ slug, spec: me.spec,"]], "C5 · every page-producing path reaches the one function:"],
  ["S35", "F36 C6 · the right-to-exist function reaches a network call", [[RTE, 'import { EXISTING_PAGE_OUTCOMES } from "./existing-page-first.mjs";', 'import { EXISTING_PAGE_OUTCOMES } from "./existing-page-first.mjs";\nexport const probe = () => fetch("https://probe.invalid");']], "C6 · the right-to-exist function loads no module"],
  /* ── construction · ruling RR-179 (c), D1 (S41), ruling (d) ── */
  ["S36", "construction · a spec F35 did not choose is built (ruling c)", [[CON, CHOSEN, "    const chosen = { decision: { subject: { needId: null } } };"]], "R4c"],
  ["S37", "construction · a HOLD or a chosen KEEP counts as F35's CREATE (ruling c)", [[AD, '(d.actions ?? []).some((a) => a.action === "CREATE");', "true;"]], "R4c"],
  ["S38", "construction · a lone page is refused for having no comparison page (D1, S41)", [[CON, "    else if (siblings.length === 0) parts.overlap = { state: PASS,", "    else if (siblings.length === 0) parts.overlap = { state: NOT_TESTED,"]], "🔴 A FAMILY OF ONE"],
  ["S39", "construction · a small family is refused only because no shell is learnable (D1, S41)", [[CON, "    else if (unrenderedSiblings.length) parts.overlap", "    else if (!shell.shell) parts.overlap = { state: NOT_TESTED, reason: \"no shell\" };\n    else if (unrenderedSiblings.length) parts.overlap"]], "🔴 D1 · a two-spec family"],
  ["S40", "construction · a compiled spec is rendered before F37's acceptance is frozen (ruling d)", [[CON, "html: null, trace: [], tokens: null, renderError: RENDER_WAITS_FOR_F37, compiled: true }));", "html: \"<article><p>compiled</p></article>\", trace: [], tokens: [\"compiled\"], renderError: null, compiled: true }));"]], "R4e"],
  ["S41", "construction · a compiled spec's existing-page part does not read its coverage record", [[CON, "coverage: me.spec?.basis?.coverage?.outcome ?? null,", "coverage: null,"]], "R4e"],
  /* ── FS-A1 (RTP-1 S39, D2) ── */
  ["S42", "FS-A1 · a tier-4 source is refused for an ordinary claim by its category alone (the registry)", [[VAL, ' && r.life?.status !== "lead" && !isOrdinaryTier4(r)) {', ' && r.life?.status !== "lead") {']], "GREEN (FS-A1):"],
  ["S43", "FS-A1 · a tier-4 source is refused for an ordinary claim by its category alone (Gate A)", [[GF, '  const ordinaryTier4 = Number(tier) === 4 && fact?.claimStates === "OTHER";', "  const ordinaryTier4 = false;"]], "R4f"],
  ["S44", "FS-A1 · a non-official source is cited for a body's rule (the registry)", [[SCH, " && r?.claim?.states === CLAIM_STATES.ORDINARY;", ";"]], "RED: a tier-4 source may not be active for a body's rule,"],
  ["S45", "FS-A1 · a non-official source is cited for a body's rule (Gate A)", [[GF, 'fact?.claimStates === "OTHER";', "fact?.claimStates !== undefined;"]], "R4f"],
  ["S46", "FS-A1 · a tier-4 source is not labelled SECONDARY", [[RND, "  const label = isOrdinaryTier4(record) ? SECONDARY_LABEL : null;", "  const label = null;"]], "R4f"],
  ["S47", "FS-A1 · a source that does not support the claim is accepted", [[CON, '    const verified = cited.filter((r) => r.verificationState === "VERIFIED" && RENDERABLE_STATUSES.includes(r.life?.status));', "    const verified = cited.filter((r) => RENDERABLE_STATUSES.includes(r.life?.status));"]], "R4f"],
  /* ── F41 C1 AS AMENDED (D5) and C8 ── */
  ["S48", "F41 C1 AS AMENDED · the per-item approval gate restored", [[CB, "  const e = evidence ?? {};\n", "  if (!(evidence?.approval)) return Object.freeze({ subject, state: BRIEF_STATE.NOT_ISSUED, standing: STANDING, missing: Object.freeze([\"no recorded approval\"]) });\n  const e = evidence ?? {};\n"]], "T41d"],
  ["S49", "F41 C1 AS AMENDED · a brief is labelled an approval", [[CB, "    standing: STANDING,\n    recommended:", "    standing: STANDING,\n    approval: \"assumed\",\n    recommended:"]], "T41d"],
  ["S50", "F41 C1 AS AMENDED · a preview that does not pass is put forward", [[CB, "  if (missingParts.length) return Object.freeze({ state: PREVIEW.NOT_PUT_FORWARD,", "  if (false) return Object.freeze({ state: PREVIEW.NOT_PUT_FORWARD,"]], "T41e"],
  ["S51", "F41 C1 AS AMENDED · publication passes without the owner's exact recorded approval", [[CB, '  const exact = approvals.find((a) => recorded(a) && a.kind === "PUBLICATION"', '  const exact = approvals.find((a) => a && a.kind === "PUBLICATION"'], [CB, " && a.contentSha256 === preview.contentSha256);", ");"]], "T41f"],
  ["S52", "F41 C1 AS AMENDED · an approval is assumed", [[CB, "  if (!Array.isArray(approvals)) throw new TypeError(", "  if (false) throw new TypeError("]], "T41f"],
  ["S53", "F41 C8 · a research-derived question loses its GENERATED marking (the brief)", [[CB, "marking: q.marking ?? null,", "marking: null,"]], "T41a"],
  ["S54", "F41 C8 · a research-derived question loses its GENERATED marking (the reader)", [[CBE, 'marking: q.tier === TIERS.RESEARCH_DERIVED && q.route === ROUTES.CLIENT_AI ? "GENERATED" : null', "marking: null"]], "T41a"],
  ["S55", "F41 C8 · a question appears without its tier", [[CB, ' || !TIERS.includes(q.tier)) { excluded.push(', ") { excluded.push("]], "T41a"],
  ["S56", "F41 C8 · a grouped need's brief does not name the grouped need", [[CB, "e.need.groupedNeed === decision.subject.needId", "true"]], "T41b"],
  ["S57", "F41 C8 · a supported claim is excluded for its SECONDARY label", [[CB, "    const s = c.source ?? {};\n", "    if (c.label === \"SECONDARY\") { excluded.push(Object.freeze({ claimId: c.claimId, why: \"LABEL\" })); continue; }\n    const s = c.source ?? {};\n"]], "T41c"],
  ["S58", "F41 C8 · an UNKNOWN part is not carried as UNKNOWN", [[CB, "    if (c?.state !== \"SUPPORTED\") { unknown.push(", "    if (c?.state !== \"SUPPORTED\") { continue; unknown.push("]], "T41c"],
  ["S59", "F41 C1 · a brief is issued where F35 chose no action", [[CB, '  if (decision.decision !== "CHOSEN" || decision.actions.length === 0) return', "  if (false) return"]], "C1 AS AMENDED ·"],
  ["S60", "F41 C2 · a section is filled without recorded evidence", [[CB, "  s.cta = recorded(e.cta) && e.cta.text ?", "  s.cta = e.cta?.text ?"]], "C2 ·"],
  ["S61", "F41 C3 · an unverified fact enters a brief", [[CB, ' : f.verificationState !== "VERIFIED" ? "NOT_VERIFIED"', ' : false ? "NOT_VERIFIED"']], "C3 ·"],
  ["S62", "F41 C4 · a brief with a missing section is READY", [[CB, "    state: missingSections.length ? BRIEF_STATE.INCOMPLETE : BRIEF_STATE.READY,", "    state: BRIEF_STATE.READY,"]], "C4 · FIRING CONTROL:"],
  ["S63", "F41 C5 · F41 writes a page", [[CB, 'import { createHash } from "node:crypto";', 'import { createHash } from "node:crypto";\nimport { writeFileSync } from "node:fs";']], "C5/C6 ·"],
  ["S64", "F41 C6 · competitor evidence becomes a fact", [[CB, "  const placed = [...facts.included, ...claims.included];", "  const placed = [...facts.included, ...claims.included, ...(e.competitorInputs ?? []).map((c) => ({ factId: c.ref }))];"]], "C5/C6 ·"],
  ["S65", "F41 C7 · the brief's reader reaches a network call", [[CBE, 'import { ROUTES } from "../research/research-derived.mjs";', 'import { ROUTES } from "../research/research-derived.mjs";\nexport const probe = () => fetch("https://probe.invalid");']], "C7 · the brief and its evidence reader"],
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
  `RR-179 R4 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
