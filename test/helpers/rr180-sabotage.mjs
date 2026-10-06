/**
 * 🔴 RR-180 · R4b · ONE SABOTAGE PER FAILURE CONDITION of F37's Acceptance (_handoffs 9516f2c) — C1–C6 with their carried corrections — and
 * of the owner's ruling RR-180 (a) — each on LIVE, REACHABLE code, its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN
 * first and then required RED by an AssertionError (never a crash of the TEST), every file restored by raw-byte sha256, the production trail
 * hashed before and after. FIXTURE STRUCTURES ONLY (RR-177).
 *
 *   node test/helpers/rr180-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr180-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr180-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The method of test/helpers/rr179-sabotage.mjs, unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DR = "src/page/draft-render.mjs", AS = "src/page/answer-support.mjs", CON = "src/page/construct.mjs", BP = "bin/build-page.mjs";
const T = ["test/rr180-r4b.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr180-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const RENDERABLE = '    if (present(c.text) && present(c.source) && present(c.link) && /^\\d{4}-\\d{2}-\\d{2}$/.test(c.readOn ?? "") && present(c.label)) renderable.push(c);';
const UNKNOWN_HTML = 'const unknownHtml = (u) => `<p class="unknown" data-claim-id="${esc(u.claimId ?? "none")}">UNKNOWN — ${esc(u.why)}</p>`;';
const CHOSEN = "  if (!isChosenCreate(decision) || decision.subject.needId !== spec.subject) return Object.freeze({ state: DRAFT.REFUSED, why: DRAFT_REFUSAL.NOT_CHOSEN });";
const TIERLINE = '    const tierLine = `${TIER_LABEL[s.tier] ?? s.tier}${s.marking === GENERATED ? " · GENERATED wording" : ""}`;';
const HEAD = '`<h2>${esc(s.heading)}</h2>`, `<p class="qa-tier">${esc(tierLine)}</p>`,';
const FAQ = '    if (mine.length) faq.push({ "@type": "Question", name: s.heading, acceptedAnswer: { "@type": "Answer", text: answerText(mine) } });';
const SABOTAGES = [
  /* ── F37 C1 (P6b, F37-1, F37-2) ── */
  ["S01", "F37 C1 · a written material claim has no supporting source record", [[DR, RENDERABLE, "    if (present(c.text)) renderable.push(c);"]], "T37b"],
  ["S02", "F37 C1 · an unsupported claim is written as fact instead of UNKNOWN", [[DR, UNKNOWN_HTML, 'const unknownHtml = (u) => `<div class="claim" data-claim-id="${esc(u.claimId ?? "none")}"><p class="claim-text">${esc(u.why)}</p></div>`;']], "T37d"],
  ["S03", "F37 C1 · research-provider output appears as a fact in a draft", [[AS, "  if (s.kind === SOURCE_KINDS.PROVIDER_TEXT) return unknown(CLAIM_UNKNOWN.PROVIDER);\n", ""]], "T37b"],
  ["S04", "F37 C1 · a blanket ban stops source-based drafting (every SECONDARY-supported answer refused)", [[DR, "  const { renderable, unknown } = claimsOf(spec);\n  const central =", "  if ((spec.answer?.labels ?? []).some((l) => l.label === \"SECONDARY\")) return Object.freeze({ state: DRAFT.REFUSED, why: \"secondary\" });\n  const { renderable, unknown } = claimsOf(spec);\n  const central ="]], "T37a"],
  ["S05", "F37 C1 · a draft is rendered for a spec F35 did not choose CREATE", [[DR, CHOSEN, ""]], "T37e"],
  ["S06", "F37 C1 · a draft names no writer", [[DR, 'data-writer="${esc(WRITER)}">`', 'data-writer="">`']], "T37a"],
  ["S07", "F37 C1 · a draft depends on a live writing-AI provider", [[DR, 'import { attributionRefusal } from "../research/research-derived.mjs";', 'import { attributionRefusal } from "../research/research-derived.mjs";\nimport "../research/ai-providers/index.mjs";']], "T37k"],
  ["S08", "F37 C1 / ruling (a) · construction receives a decision F35 did not choose", [[CON, "  const decisions = ae.compiled.forConstruction.filter((d) => isChosenCreate(d.decision));", "  const decisions = ae.compiled.forConstruction.filter(() => true);"]], "T37i"],
  ["S09", "ruling (a) · bin/build-page.mjs hands construction something other than F35's decision", [[BP, "decisions: chosen.decisions /*", "decisions: [] /*"]], "T37i"],
  /* ── F37 C2 (P13b, P13c, F37-3, F37-4) ── */
  ["S10", "F37 C2 · a research-derived question appears under an attribution phrase without observed evidence", [[DR, "    return Object.freeze({ state: DRAFT.REFUSED, why: DRAFT_REFUSAL.ATTRIBUTION });\n", "    void 0;\n"]], "T37c"],
  ["S11", "F37 C2 · a section's GENERATED marking is not visible", [[DR, TIERLINE, '    const tierLine = `${TIER_LABEL[s.tier] ?? s.tier}`;']], "T37c"],
  ["S12", "F37 C2 · a heading's wording differs from its compiled section's", [[DR, HEAD, '`<h2>${esc(s.heading.toUpperCase())}</h2>`, `<p class="qa-tier">${esc(tierLine)}</p>`,']], "T37c"],
  ["S13", "F37 C2 · a research-derived question is shown as observed", [[DR, '"RESEARCH-DERIVED": "Research-derived question"', '"RESEARCH-DERIVED": "Asked publicly (observed)"']], "T37c"],
  ["S14", "F37 C2 · a research-derived question appears in a verified-demand label", [[DR, '"RESEARCH-DERIVED": "Research-derived question"', '"RESEARCH-DERIVED": "Verified public demand"']], "T37c"],
  /* ── F37 C3 (P14, F37-5, F37-6) ── */
  ["S15", "F37 C3 · a claim stating a body's rule cites a source other than that body", [[AS, "    if (!present(claim.body) || s.kind !== SOURCE_KINDS.BODY || s.body !== claim.body) return unknown(CLAIM_UNKNOWN.BODY);\n", ""]], "T37d"],
  ["S16", "F37 C3 · an ordinary claim is refused for want of an official body", [[AS, "  /* OTHER: any named, linked, dated source the finding says supports it", "  if (s.kind !== SOURCE_KINDS.BODY) return unknown(CLAIM_UNKNOWN.BODY);\n  /* OTHER: any named, linked, dated source the finding says supports it"]], "T37d"],
  ["S17", "F37 C3 · a secondary source is called official", [[DR, '<p class="citation">${esc(c.label)} source: ', '<p class="citation">${esc(c.label === "SECONDARY" ? "OFFICIAL" : c.label)} source: ']], "T37d"],
  ["S18", "F37 C3 · a third party's estimate is not stated as its estimate", [[DR, 'const estimateOf = (c) => (present(c.statedAs) && /estimate/.test(c.statedAs) ? ` · ${c.statedAs}` : "");', 'const estimateOf = () => "";']], "T37d"],
  ["S19", "F37 C3 · a source that does not support the claim is accepted", [[AS, "  if (claim.supports?.finding !== SUPPORTS || !present(claim.supports?.ref)) return unknown(CLAIM_UNKNOWN.NOT_SUPPORTED);", "  if (!present(claim.supports?.ref)) return unknown(CLAIM_UNKNOWN.NOT_SUPPORTED);"]], "T37d"],
  ["S20", "F37 C3 · an UNKNOWN part is dropped", [[DR, "      ...traced(mine, s.heading), ...missing.map(unknownHtml), `</section>`);", "      ...traced(mine, s.heading), `</section>`);"]], "T37d"],
  ["S21", "F37 C3 · a rendered claim lacks its trace to its claim id", [[DR, "  const traced = (claims, where) => { for (const c of claims) trace.push(", "  const traced = (claims, where) => { for (const c of []) trace.push("]], "T37a"],
  ["S22", "F37 C3 · a rendered claim lacks its source's link", [[DR, '<a href="${esc(c.link)}" rel="nofollow noopener">${esc(c.source)}</a> — read ${esc(c.readOn)}${esc(estimateOf(c))}', '${esc(c.source)} — read ${esc(c.readOn)}${esc(estimateOf(c))}']], "T37d"],
  ["S23", "F37 C3 · F37 reads a source", [[DR, 'import { attributionRefusal } from "../research/research-derived.mjs";', 'import { attributionRefusal } from "../research/research-derived.mjs";\nimport { readFileSync } from "node:fs";']], "T37k"],
  /* ── F37 C4 (P19, F37-7, F37-8) ── */
  ["S24", "F37 C4 · a section proposal becomes a new page", [[DR, '    fragment: `<div class="section-proposal"', '    fragment: `<article><h1>a new page</h1><div class="section-proposal"']], "T37e"],
  ["S25", "F37 C4 · a section proposal changes the existing page", [[DR, "    targetPages: Object.freeze([...(spec.target?.existingPages ?? [])]), unchangedUntilOwnerApproves: true,", "    targetPages: Object.freeze([...(spec.target?.existingPages ?? [])]), unchangedUntilOwnerApproves: false,"]], "T37e"],
  ["S26", "F37 C4 · F37 re-decides: a CREATE is rendered as a section proposal", [[DR, '!(acts.includes("ADD SECTION") || acts.includes("IMPROVE"))', "false"]], "T37e"],
  /* ── F37 C5 (P21, F37-9, F37-10) ── */
  ["S27", "F37 C5 · a fact-count threshold decides something", [[DR, "  checks.directAnswer = central.length ? { state: CHECK.PASS }", "  checks.directAnswer = central.length >= 2 ? { state: CHECK.PASS }"]], "T37g"],
  ["S28", "F37 C5 · a measurable check with no recorded input is passed by default (internal links)", [[DR, '{ state: CHECK.NOT_MEASURED, why: "no internal-link target is recorded in or out', '{ state: CHECK.PASS, why: "no internal-link target is recorded in or out']], "T37f"],
  ["S29", "F37 C5 · a measurable check with no recorded input is passed by default (technical)", [[DR, '  checks.technical = !present(links?.selfUrl) ? { state: CHECK.NOT_MEASURED,', "  checks.technical = !present(links?.selfUrl) ? { state: CHECK.PASS,"]], "T37f"],
  ["S30", "F37 C5 · a judged quality of F40's is required by F37", [[DR, "  const states = Object.values(checks).map((c) => c.state);", '  checks.engaging = { state: CHECK.NOT_MEASURED, why: "F40\'s judgement" };\n  const states = Object.values(checks).map((c) => c.state);']], "T37f"],
  ["S31", "F37 C5 · copy that promises ranking passes", [[DR, "markup.state === MARKUP.ALIGNED && !PROMISE.test(html) ?", "markup.state === MARKUP.ALIGNED ?"]], "T37h"],
  ["S32", "F37 C5 · a draft with no direct answer passes", [[DR, "  checks.directAnswer = central.length ? { state: CHECK.PASS }", "  checks.directAnswer = true ? { state: CHECK.PASS }"]], "T37f"],
  /* ── F37 C6 (D3, F37-11, F37-12) ── */
  ["S33", "F37 C6 · a marked question is not visible on the draft in the same words", [[DR, FAQ, FAQ.replace("name: s.heading,", "name: `${s.heading} (marked)`,")]], "T37h"],
  ["S34", "F37 C6 · an UNKNOWN answer is marked up as answered", [[DR, FAQ, `${FAQ}\n    for (const u of missing) faq.push({ "@type": "Question", name: s.heading, acceptedAnswer: { "@type": "Answer", text: String(u.claimId) } });`]], "T37h"],
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
  `RR-180 R4b sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
