/**
 * 🔴 RR-174 · R3 · ONE SABOTAGE PER FAILURE CONDITION of F35 Acceptance Amendment 1 (C3 and C4 as amended, C8, C9) and F34 Acceptance
 * Amendment 1 (C7) — and, for both re-proofs (ruling RR-174 (e), evidence item "a sabotage per clause"), one per F35 clause C1–C7 and F34
 * clause C1–C6 — each on code LIVE NOW, its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required
 * RED by an AssertionError (never a crash of the TEST), every file restored by raw-byte sha256, the production trail hashed before and after.
 *
 *   node test/helpers/rr174-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr174-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr174-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The method of test/helpers/rr172-sabotage.mjs, unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AD = "src/page/action-decision.mjs", AE = "src/page/action-evidence.mjs", EPF = "src/page/existing-page-first.mjs", DC = "src/page/demand-connection.mjs", CON = "src/page/construct.mjs";
const T = ["test/rr174-r3-f35-f34.test.mjs", "test/f35-action-decision.test.mjs", "test/f34-no-blind-regeneration.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr174-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const CREATE = '  return decided(subject, chosen("CREATE", "NO_SUITABLE_PAGE_DISTINCT_USEFUL_ESTABLISHED_AND_DUPLICATION_RESOLVED",';
const NOCMP = '  if (!comparisons.length) return Object.freeze({ state: DUPLICATION.NO_COMPARISON,';
const KEEPL = '  if (coverage.coverage === "FULL" && coverage.relevantQuestionMissing !== true) return decided(subject, chosen("KEEP", "FULL_COVERAGE_AND_NO_NEEDED_GAP",';
const PARTL = '  if (coverage.coverage === "PARTIAL" || coverage.relevantQuestionMissing === true) return decided(';
const UNSUP = '  if (need.centralSupported !== true) return hold(subject, ["the central answer is unsupported (F35 C8b; F91 C18)"], extra);';
const DUPL = '  if (duplication?.state === DUPLICATION.DUPLICATE) return decided(subject, chosen("CONNECT", "A_DUPLICATE_CANDIDATE_CONNECTS_TO_THE_EXISTING_SUITABLE_PAGE", [duplication.against, duplication.ref]), extra);';
const ALLOW = '  if (![DUPLICATION.NO_COMPARISON, DUPLICATION.RESOLVED].includes(duplication?.state)) return hold(subject, ["the duplication verdict is not recorded"], extra);';
const RTEL = '  if (rightToExist.outcome !== "ESTABLISHED") return hold(subject,';
const SERVED = "  return out(O.KEEP, R.SERVED, found);";
const SABOTAGES = [
  /* ── F35 C3 AS AMENDED ── */
  ["S01", "F35 C3 · a need meeting all four limbs is refused CREATE for want of demand", [[AD, CREATE, `  if (!(need.demandCategories >= 3)) return hold(subject, ["fewer than three demand categories"], extra);\n${CREATE}`]], "T3a"],
  ["S02", "F35 C3 · CREATE with right-to-exist not ESTABLISHED", [[AD, RTEL, '  if (false) return hold(subject,']], "T3b"],
  ["S03", "F35 C3 · CREATE where coverage is not NONE (FULL falls through)", [[AD, KEEPL, KEEPL.replace('if (coverage.coverage === "FULL"', 'if (false && coverage.coverage === "FULL"')]], "T3b"],
  ["S04", "F35 C3 · CREATE with the duplication verdict unresolved (every need read as having no comparison page)", [[AD, NOCMP, NOCMP.replace("if (!comparisons.length)", "if (true)")]], "T3b"],
  ["S05", "F35 C3 · a decision lacks its tier", [[AD, "  const extra = { tier: need.tier };", "  const extra = {};"]], "T3c"],
  ["S06", "F35 C3 · a need with no comparison page is held for that alone (D1)", [[AD, NOCMP, NOCMP.replace("state: DUPLICATION.NO_COMPARISON,", "state: DUPLICATION.REFUSED,")]], "T3d"],
  ["S07", "F35 C3 · a REFUSED guidance-dependent verdict is worked around (a guidance-needing review resolves it)", [[AD, "r.needsGuidance === false", "r.needsGuidance !== undefined"]], "T3e"],
  /* ── F35 C4 AS AMENDED ── */
  ["S08", "F35 C4 · a FULL-coverage, no-gap need is forced to change", [[AD, KEEPL, KEEPL.replace('chosen("KEEP",', 'chosen("IMPROVE",')]], "T4a"],
  ["S09", "F35 C4 · a PARTIAL or missing-question case goes to CREATE", [[AD, PARTL, '  if (false) return decided(']], "T4a"],
  ["S10", "F35 C4 · an unsupported case is REJECTED instead of HELD", [[AD, UNSUP, '  if (need.centralSupported !== true) return decided(subject, chosen("REJECT", "UNSUPPORTED", []), extra);']], "T4a"],
  ["S11", "F35 C4 · a duplicate is CREATED", [[AD, DUPL, ""], [AD, ALLOW, ALLOW.replace("[DUPLICATION.NO_COMPARISON, DUPLICATION.RESOLVED]", "[DUPLICATION.NO_COMPARISON, DUPLICATION.RESOLVED, DUPLICATION.DUPLICATE]")]], "T4a"],
  ["S12", "F35 C4 · a need gets MONITOR (monitorDemand restored as an outcome)", [[AD, "export function decideForNeed({ slug, groupedNeedIds = [] }) {\n  const subject = Object.freeze({ kind: \"PROPOSED_NEED\", slug });", "export function decideForNeed({ slug, groupedNeedIds = [], demand = null }) {\n  const subject = Object.freeze({ kind: \"PROPOSED_NEED\", slug });\n  if (demand && Number(demand.independentCategories) < 3) return decided(subject, chosen(\"MONITOR\", \"RECORDED_DEMAND_CONFLICTED_OR_INSUFFICIENT\", [demand.ref]), {});"],
    [AE, "decideForNeed({ slug, groupedNeedIds: grouped.filter((g) => g.slug === slug).map((g) => g.needId) })", "decideForNeed({ slug, groupedNeedIds: grouped.filter((g) => g.slug === slug).map((g) => g.needId), demand })"]], "T4b"],
  ["S13", "F35 C4 · a demand-strength result is turned into HOLD", [[AD, UNSUP, `${UNSUP}\n  if (need.demand?.independentCategories < 3) return hold(subject, ["weak demand"], extra);`]], "T4b"],
  ["S14", "F35 C4 · a HOLD names no missing fact", [[AD, "outcome: OUTCOMES.HOLD, actions: Object.freeze([]), missing: Object.freeze(missing), ...extra });", "outcome: OUTCOMES.HOLD, actions: Object.freeze([]), missing: Object.freeze([]), ...extra });"]], "T4a"],
  ["S15", "F35 C4 · ruling (a) HOLD not counted by its own name", [[AD, "    hold: decisions.filter((d) => d.class === HOLD).length,", "    hold: 0,"]], "T4c"],
  /* ── F35 C8 ── */
  ["S16", "F35 C8 · CREATE without a coverage record", [[AD, '  if (!coverage) return hold(subject, ["no coverage record for this need (F91 C14) — existing pages first (C8a)"], extra);', '  if (!coverage) return decided(subject, chosen("CREATE", "NO_RECORD", []), extra);']], "T8a"],
  ["S17", "F35 C8 · CREATE for a need another candidate holds (a DUPLICATE review ignored)", [[AD, '  const dup = usable.find((r) => r.verdict === "DUPLICATE" && comparisons.includes(r.against));', '  const dup = null;']], "T8b"],
  ["S18", "F35 C8 · CREATE with an unsupported central answer", [[AD, UNSUP, ""]], "T8b"],
  ["S19", "F35 C8 · a country-only difference splits one need into two pages", [[DC, "    } else needId = needOfWording.get(normaliseWording(fields.wording))", "    } else needId = needOfWording.get(normaliseWording(fields.wording) + fields.country)"]], "T8c"],
  ["S20", "F35 C8 · a country-specific part is lost", [[DC, "    const sections = n.sections.filter((s) => present(s?.country))", "    const sections = [].filter((s) => present(s?.country))"]], "T8c"],
  /* ── F35 C9 ── */
  ["S21", "F35 C9 · a grouped need is not decided", [[AE, "  const groupedNeeds = grouped.map((g) => decideGroupedNeed({", "  const groupedNeeds = grouped.slice(1).map((g) => decideGroupedNeed({"]], "T9a"],
  ["S22", "F35 C9 · a page decision other than HOLD for a need with no recorded question", [[AD, '  if (!(need.questions > 0)) return hold(subject, ["no recorded relevant question (F35 C9, A1)"], extra);', ""]], "T9b"],
  ["S23", "F35 C9 · an existing page is changed because its spec had no recorded question", [[AD, '  if (!groupedNeedIds.length) return hold(subject, ["no recorded relevant question for this declared spec', '  if (!groupedNeedIds.length) return decided(subject, chosen("REMOVE", "SPEC_WITHOUT_QUESTION", []), {}) || hold(subject, ["no recorded relevant question for this declared spec']], "T9b"],
  ["S24", "F35 C9 · a grouped need is decided without reading its coverage record", [[AE, "    coverage: coverage.get(g.needId) ?? null,", "    coverage: null,"]], "T9c"],
  ["S25", "F35 C9 · an existing page a coverage record names with a missing question is decided without it", [[AE, "questionCoverage: coverageForPage(p.pageId),", "questionCoverage: null,"]], "T9c"],
  ["S26", "F35 C9 · ruling (b) the declared specs' needs output changes shape", [[AD, '  const subject = Object.freeze({ kind: "PROPOSED_NEED", slug });\n  if (!groupedNeedIds.length)', '  const subject = Object.freeze({ kind: "DECLARED_SPEC", slug });\n  if (!groupedNeedIds.length)']], "T9a"],
  /* ── F34 C7 ── */
  ["S27", "F34 C7 · an F34 outcome is MONITOR (restored for a served need)", [[EPF, SERVED, '  return out("MONITOR", R.SERVED, found);']], "T7a"],
  ["S28", "F34 C7 · an uncertain match is anything but HOLD", [[EPF, "  if (need.outcome === NEED_OUTCOMES.CANNOT_DECIDE) return out(O.HOLD, need.reason, found);", "  if (need.outcome === NEED_OUTCOMES.CANNOT_DECIDE) return out(O.KEEP, need.reason, found);"]], "T7b"],
  ["S29", "F34 C7 · an uncertain population (not COMPLETE) lets production go on", [[EPF, ": out(O.HOLD, R.NOT_COMPLETE, seen);", ": out(O.NO_EXISTING_PAGE, R.NOT_COMPLETE, seen);"]], "T7c"],
  ["S30", "F34 C7 · a served need is changed against KEEP", [[EPF, SERVED, "  return out(O.IMPROVE, R.SERVED, found);"]], "T7a"],
  ["S31", "F34 C7 · KEEP's served reason renamed (F36 reads it)", [[EPF, '  SERVED: "AN_EXISTING_PAGE_SERVES_THIS_INTENT",', '  SERVED: "SERVED",']], "T7a"],
  /* ── the re-proofs: one per earlier clause ── */
  ["S32", "F35 C1 · a chosen action carries no evidence", [[AD, "evidence: Object.freeze([...new Set(evidence.filter(Boolean))])", "evidence: Object.freeze([])"]], "C1/C6 · every chosen action carries its rule and evidence,"],
  ["S33", "F35 C2 · contradicting actions are both returned", [[AD, "  return names.length > 1 && names.some((n) => EXCLUSIVE.includes(n));", "  return false;"]], "C2 · contradicting actions are CANNOT DECIDE,"],
  ["S34", "F35 C5 · LINK chosen off its rule", [[AD, "  if (e.inboundLinks === 0) {", "  if (e.inboundLinks === -1) {"]], "C5 · the existing-page rules:"],
  ["S35", "F35 C6 · an owner-approval action lacks its label", [[AD, "ownerApprovalRequired: OWNER_APPROVAL.includes(action),", "ownerApprovalRequired: false,"]], "C1/C6 · every chosen action carries its rule and evidence,"],
  ["S36", "F35 C7 · the decision reaches a network call", [[AD, 'import { SEMANTIC_ASPECTS } from "./duplication.mjs";', 'import { SEMANTIC_ASPECTS } from "./duplication.mjs";\nexport const probe = () => fetch("https://probe.invalid");']], "C7 · the decision and its evidence reader load no module"],
  ["S37", "F34 C1 · an unknown-shape population is not REFUSED", [[EPF, "  if (population === null || typeof population !== \"object\" || !Array.isArray(population.pages) || !COVERAGE_STATES.includes(population.coverageState)) {", "  if (population === null || typeof population !== \"object\" || !Array.isArray(population.pages)) {"]], "C1 · a missing, unreadable, malformed or foreign population"],
  ["S38", "F34 C2 · a served need is let through to production", [[EPF, "mayProduce: outcome === O.NO_EXISTING_PAGE || outcome === O.NOT_COVERED", "mayProduce: outcome === O.NO_EXISTING_PAGE || outcome === O.NOT_COVERED || outcome === O.KEEP"]], "C2 · the SAME need in DIFFERENT WORDS"],
  ["S39", "F34 C3 · a path writes into a product repository", [[EPF, 'export const NAMED_IN_EVENT = 8;', 'export const NAMED_IN_EVENT = 8;\nconst zz = () => writeFileSync("../almi-oet/app/page.html", "");']], "C3 · rediscovery has NO path to an existing page:"],
  ["S40", "F34 C4 · a recorded defect is not routed to IMPROVE", [[EPF, 'p.recordedDefect.trim() !== ""', "false"]], "C4 · an unmeasured existing page is protected"],
  ["S41", "F34 C5 · a routed path's check is no longer visible to the census", [[CON, "existingPageFirst({", "(existingPageFirst)({"]], "C5 · the real tree:"],
  ["S42", "F34 C6 · a stopped candidate's decision is not recorded as a REFUSAL", [[EPF, 'eventType: "REFUSAL"', 'eventType: "EVALUATION"']], "C6 · a stopped candidate owes ONE REFUSAL decision"],
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
  `RR-174 R3 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
