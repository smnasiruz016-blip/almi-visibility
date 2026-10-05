/**
 * 🔴 RR-170 · R1 · ONE SABOTAGE PER PROTECTION OF test/rr170-r1-research-derived.test.mjs (F16 Acceptance Amendment 5, C27–C32) — each on code
 * LIVE NOW, its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never a
 * crash of the TEST), every file restored by raw-byte sha256, the production trail hashed before and after.
 *
 *   node test/helpers/rr170-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr170-sabotage-practice-<date>.txt; the real run writes runs/audit/rr170-sabotage-<date>.txt. Neither
 * overwrites an earlier file. The method of test/helpers/rr161-sabotage.mjs, unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RDM = "src/research/research-derived.mjs", BINI = "bin/research-derived-intake.mjs", ALC = "src/research/ai-led-collection.mjs", EVA = "src/evidence/evidence-state-adapters.mjs";
const T = ["test/rr170-r1-research-derived.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 10);
const EVIDENCE = join(REPO, "runs", "audit", `rr170-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const TIED = "  if (present(row.formedQueryId) && formedIds.has(row.formedQueryId)) return { kind: SUBMISSION.RESEARCH_DERIVED, code: null };";
const KINDLINE = "    subject, plan_id: planId, query_id: queryId, route, tier: TIER, parent_kind: PARENT_KIND,";
const WORDLINE = "    wording: Object.freeze({ text, generated: route === ROUTES.CLIENT_AI }),";
const RDLINE = "  const rd = questions.filter((q) => q?.record_type === RESEARCH_DERIVED_RECORD);";
const SABOTAGES = [
  ["S01", "C27 · a question refused for want of a research date", [[RDM, TIED, TIED.replace("formedIds.has(row.formedQueryId))", "formedIds.has(row.formedQueryId) && present(row.observedDate))")]], "T27a"],
  ["S02", "C27 · a question refused for want of a reference", [[RDM, '  if (!present(wording)) throw new TypeError("a research-derived question carries its wording");', '  if (!present(wording)) throw new TypeError("a research-derived question carries its wording");\n  if (!present(reference)) throw new TypeError("no reference");']], "T27a"],
  ["S03", "C27 · HELD read as RELEVANT", [[RDM, "  return mine.length ? mine.at(-1).value.verdict : RELEVANCE.HELD;", "  return mine.length ? (mine.at(-1).value.verdict === RELEVANCE.HELD ? RELEVANCE.RELEVANT : mine.at(-1).value.verdict) : RELEVANCE.HELD;"]], "T27b"],
  ["S04", "C27 · a REJECTED question handed on", [[RDM, "relevanceOf(q.question_id, assessments) === RELEVANCE.RELEVANT);", "relevanceOf(q.question_id, assessments) !== RELEVANCE.HELD);"]], "T27b"],
  ["S05", "C27 · an assessment carrying an approval field accepted", [[RDM, '  if (Object.keys(draft).some((k) => APPROVAL_FIELD.test(k)) || Object.keys(draft.source ?? {}).some((k) => APPROVAL_FIELD.test(k))) return { outcome: "REFUSED", code: "AN_ASSESSMENT_IS_NEVER_AN_APPROVAL" };', ""]], "T27c"],
  ["S06", "C27 · an assessment without its reason kept", [[RDM, '  if (!present(draft.reason) || /\\n/.test(draft.reason.trim())) return { outcome: "REFUSED", code: "ASSESSMENT_REASON_NOT_ONE_LINE" };', ""]], "T27d"],
  ["S07", "C27 · the word 'human' accepted as an assessment's source", [[RDM, "  if ([draft.source.ref, draft.reason].some((s) => HUMAN_WORD.test(s))) return", "  if (false) return"]], "T27d"],
  ["S08", "C27 · a research-derived question placed OBSERVED", [[EVA, '  return place(rule, "INFERRED", { inputRefs: [`formed-research-query:', '  return place(rule, "OBSERVED", { inputRefs: [`formed-research-query:']], "T27d"],
  ["S09", "C28 · route 2 made a condition (an empty return refused)", [[BINI, "if (submissions === null || drafts === null) {", "if (submissions === null || drafts === null || submissions.length === 0) {"]], "T28a"],
  ["S10", "C28 · a route-2 result filed as OBSERVED", [[RDM, KINDLINE, KINDLINE.replace("parent_kind: PARENT_KIND,", 'parent_kind: route === ROUTES.CLIENT_RESEARCH ? "OBSERVED" : PARENT_KIND,')]], "T28b"],
  ["S11", "C28 · a statement tied to no formed question counted as research-derived", [[RDM, "  return { kind: SUBMISSION.CLIENT_CLAIM, code: null };", "  return { kind: present(row.formedQueryId) ? SUBMISSION.RESEARCH_DERIVED : SUBMISSION.CLIENT_CLAIM, code: null };"]], "T28b"],
  ["S12", "C28 · an unfetched reference marked a dead lead", [[RDM, "  return Object.freeze({ kind: OPTIONAL_REFERENCE, value: value.trim(), fetched: false, meaning: REFERENCE_MEANING });", '  return Object.freeze({ kind: OPTIONAL_REFERENCE, value: value.trim(), fetched: false, meaning: REFERENCE_MEANING, resolution: "DEAD_LEAD" });']], "T28c"],
  ["S13", "C28 · an optional reference refused storage", [[RDM, "    reference: optionalReference(reference),", "    reference: null,"]], "T28c"],
  ["S14", "C28 · a reference promotes a question", [[RDM, KINDLINE, KINDLINE.replace("tier: TIER,", 'tier: reference ? "OBSERVED" : TIER,')]], "T28c"],
  ["S15", "C29 · the provider's answer prose kept as a question", [[ALC, "      for (const w of generatedWordingOf(out, maxLeads)) worded.push({ queryId: q.queryId, wording: w });", '      for (const w of [...generatedWordingOf(out, maxLeads), ...(typeof out?.text === "string" ? [out.text.slice(0, 200)] : [])]) worded.push({ queryId: q.queryId, wording: w });']], "T29a"],
  ["S16", "C29 · route-1 wording not marked GENERATED", [[RDM, WORDLINE, "    wording: Object.freeze({ text, generated: false }),"]], "T29b"],
  ["S17", "C29 · wording written into a quote field", [[RDM, WORDLINE, `${WORDLINE} quote: text,`]], "T29b"],
  ["S18", "C29 · the attribution check always passes", [[RDM, '  return ATTRIBUTION.test(String(text ?? "")) ? "ATTRIBUTION_NEEDS_OBSERVED_EVIDENCE" : null;', "  return null;"]], "T29c"],
  ["S19", "C29 · a draft refusal planted in an F16 module", [[RDM, 'export const OPTIONAL_REFERENCE = "OPTIONAL_REFERENCE";', 'export const OPTIONAL_REFERENCE = "OPTIONAL_REFERENCE";\nexport const SOURCED_DRAFT_REFUSED = "DRAFT_REFUSED";']], "T29d"],
  ["S20", "C30 · an age window applied to the question", [[RDM, RDLINE, RDLINE.replace("=== RESEARCH_DERIVED_RECORD);", '=== RESEARCH_DERIVED_RECORD && Date.parse(q.recorded_at) > Date.parse("2020-01-01T00:00:00Z"));')]], "T30a"],
  ["S21", "C30 · a question refused for want of a time window", [[RDM, TIED, TIED.replace("formedIds.has(row.formedQueryId))", "formedIds.has(row.formedQueryId) && present(row.timeWindow))")]], "T30a"],
  ["S22", "C31 · a lead let in as a research-derived question", [[RDM, "  if (fromKind === toKind) return null;", '  if (fromKind === toKind || fromKind === "research_lead") return null;']], "T31"],
  ["S23", "C31 · a keyword idea sharing the research-derived count", [[RDM, RDLINE, RDLINE.replace("=== RESEARCH_DERIVED_RECORD);", '=== RESEARCH_DERIVED_RECORD || q?.record_type === "keyword_signal");')]], "T31"],
  ["S24", "C32 · an owned search query routed into intake as a question", [[RDM, '  if (row?.source === OWNED_SEARCH_SOURCE) return { kind: SUBMISSION.OWNED_SEARCH_EVIDENCE, code: "OWNED_SEARCH_EVIDENCE_IS_NOT_A_QUESTION" };', ""]], "T32"],
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
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${prefix} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baselineGreen = base.status === 0;
const named = [...new Set(RUN.map((s) => s[3]))];
const namedGreen = named.every((p) => new RegExp(`✔ ${p} `).test(`${base.stdout}${base.stderr}`));
const lines = [
  `RR-170 R1 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T.join(" + ")} · each applied ALONE · a FAKE provider and a FAKE source transport only, zero real requests`,
  `BASELINE (the named tests before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · named tests seen GREEN: ${named.filter((p) => new RegExp(`✔ ${p} `).test(`${base.stdout}${base.stderr}`)).length} of ${named.length}`,
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
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · a production child crashed ${childCrashed} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
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
