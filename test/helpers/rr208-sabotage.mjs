/**
 * 🔴 RR-208 · F37 ACCEPTANCE AMENDMENT 2 · ONE SABOTAGE PER FAILURE LIMB of F37's acceptance as amended twice (_handoffs f9edf2a: C1–C8 and the
 * closing list): RR-186's 42 limbs (C1–C7, re-run under Amendment 2, re-anchored where the render moved) and C8's — each on LIVE, REACHABLE
 * code, its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never a
 * crash of the TEST), every file restored by raw-byte sha256, the production trail hashed before and after. FIXTURE STRUCTURES ONLY (RR-177).
 *
 *   node test/helpers/rr208-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr208-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr208-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr188-sabotage.mjs (via rr186), unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DR = "src/page/draft-render.mjs", AS = "src/page/answer-support.mjs", CON = "src/page/construct.mjs", BP = "bin/build-page.mjs", QJ = "src/page/quality-judgements.mjs";
const T = ["test/rr180-r4b.test.mjs", "test/rr186-r5b.test.mjs", "test/rr208-f37a2.test.mjs"];
const SP = "src/page/site-plan.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr208-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const RENDERABLE = '    if (present(c.text) && present(c.source) && present(c.link) && /^\\d{4}-\\d{2}-\\d{2}$/.test(c.readOn ?? "") && present(c.label)) renderable.push(c);';
const UNKNOWN_HTML = 'const unknownHtml = (u) => `<p class="unknown" data-claim-id="${esc(u.claimId ?? "none")}">UNKNOWN — ${esc(u.why)}</p>`;';
const CHOSEN = "  if (!isChosenCreate(decision) || decision.subject.needId !== spec.subject) return Object.freeze({ state: DRAFT.REFUSED, why: DRAFT_REFUSAL.NOT_CHOSEN });";
const TIERLINE = '    const tierLine = `${TIER_LABEL[s.tier] ?? s.tier}${s.marking === GENERATED ? " · GENERATED wording" : ""}`;';
const HEAD = '`<h2><a href="#answer">${esc(s.heading)}</a></h2>`, `<p class="qa-tier">${esc(tierLine)}</p>`,';
const FAQ = '    if (mine.length) faq.push({ "@type": "Question", name: s.heading, acceptedAnswer: { "@type": "Answer", text: answerText(rendered) } });';
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
  ["S12", "F37 C2 · a heading's wording differs from its compiled section's", [[DR, HEAD, '`<h2><a href="#answer">${esc(s.heading.toUpperCase())}</a></h2>`, `<p class="qa-tier">${esc(tierLine)}</p>`,']], "T37c"],
  ["S13", "F37 C2 · a research-derived question is shown as observed", [[DR, '"RESEARCH-DERIVED": "Research-derived question"', '"RESEARCH-DERIVED": "Asked publicly (observed)"']], "T37c"],
  ["S14", "F37 C2 · a research-derived question appears in a verified-demand label", [[DR, '"RESEARCH-DERIVED": "Research-derived question"', '"RESEARCH-DERIVED": "Verified public demand"']], "T37c"],
  /* ── F37 C3 (P14, F37-5, F37-6) ── */
  ["S15", "F37 C3 · a claim stating a body's rule cites a source other than that body", [[AS, "    if (!present(claim.body) || s.kind !== SOURCE_KINDS.BODY || s.body !== claim.body) return unknown(CLAIM_UNKNOWN.BODY);\n", ""]], "T37d"],
  ["S16", "F37 C3 · an ordinary claim is refused for want of an official body", [[AS, "  /* OTHER: any named, linked, dated source the finding says supports it", "  if (s.kind !== SOURCE_KINDS.BODY) return unknown(CLAIM_UNKNOWN.BODY);\n  /* OTHER: any named, linked, dated source the finding says supports it"]], "T37d"],
  ["S17", "F37 C3 · a secondary source is called official", [[DR, '<p class="citation">${esc(c.label)} source: ', '<p class="citation">${esc(c.label === "SECONDARY" ? "OFFICIAL" : c.label)} source: ']], "T37d"],
  ["S18", "F37 C3 · a third party's estimate is not stated as its estimate", [[DR, 'const estimateOf = (c) => (present(c.statedAs) && /estimate/.test(c.statedAs) ? ` · ${c.statedAs}` : "");', 'const estimateOf = () => "";']], "T37d"],
  ["S19", "F37 C3 · a source that does not support the claim is accepted", [[AS, "  if (claim.supports?.finding !== SUPPORTS || !present(claim.supports?.ref)) return unknown(CLAIM_UNKNOWN.NOT_SUPPORTED);", "  if (!present(claim.supports?.ref)) return unknown(CLAIM_UNKNOWN.NOT_SUPPORTED);"]], "T37d"],
  /* RR-186: re-anchored — an UNKNOWN part is shown once, wherever it first belongs; the limb drops it everywhere */
  ["S20", "F37 C3 · an UNKNOWN part is dropped", [[DR, "const unknownOnce = (parts) => parts.filter((u) => {", "const unknownOnce = (parts) => [].filter((u) => {"]], "T37d"],
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
  ["S29", "F37 C5 · a measurable check with no recorded input is passed by default (technical)", [[DR, '  checks.technical = !present(links.selfUrl) ? { state: CHECK.NOT_MEASURED,', "  checks.technical = !present(links.selfUrl) ? { state: CHECK.PASS,"]], "T37f"] /* RR-208: re-anchored — the check now reads links.selfUrl */,
  ["S30", "F37 C5 · a judged quality of F40's is required by F37", [[DR, "  const states = Object.values(checks).map((c) => c.state);", '  checks.engaging = { state: CHECK.NOT_MEASURED, why: "F40\'s judgement" };\n  const states = Object.values(checks).map((c) => c.state);']], "T37f"],
  ["S31", "F37 C5 · copy that promises ranking passes", [[DR, "markup.state === MARKUP.ALIGNED && !PROMISE.test(html) ?", "markup.state === MARKUP.ALIGNED ?"]], "T37h"],
  ["S32", "F37 C5 · a draft with no direct answer passes", [[DR, "  checks.directAnswer = central.length ? { state: CHECK.PASS }", "  checks.directAnswer = true ? { state: CHECK.PASS }"]], "T37f"],
  /* ── F37 C6 (D3, F37-11, F37-12) ── */
  ["S33", "F37 C6 · a marked question is not visible on the draft in the same words", [[DR, FAQ, FAQ.replace("name: s.heading,", "name: `${s.heading} (marked)`,")]], "T37h"],
  ["S34", "F37 C6 · an UNKNOWN answer is marked up as answered", [[DR, FAQ, `${FAQ}\n    for (const u of [...unknown, ...own]) faq.push({ "@type": "Question", name: s.heading, acceptedAnswer: { "@type": "Answer", text: String(u.claimId) } });`]], "T37h"],
  /* ── F37 C7 (Acceptance Amendment 1, RR-186) — each distinct claim once; later mentions refer back by a link ── */
  ["S35", "F37 C7 · a distinct claim is rendered more than once on a draft", [[DR, "const once = (claims) => claims.filter((c) => !seen.has(c.claimId) && seen.add(c.claimId));", "const once = (claims) => claims.filter((c) => seen.add(c.claimId));"]], "T37-C7"],
  ["S36", "F37 C7 · a later mention repeats a claim's text instead of referring back by a link", [[DR, "...traced(once(mine), s.heading), ...own.map(unknownHtml)", "...traced(mine, s.heading), ...own.map(unknownHtml)"]], "T37-C7"],
  ["S37", "F37 C7 · a refer-back adds visible text outside the parts F40's filler criterion names", [[DR, "`<p class=\"qa-tier\">${esc(tierLine)}</p>`, ...traced(once(mine), s.heading)", "`<p class=\"qa-tier\">${esc(tierLine)}</p>`, `<p class=\"refer\">See the answer above.</p>`, ...traced(once(mine), s.heading)"]], "T37-C7"],
  ["S38", "F37 C7 · a refer-back points nowhere on the page", [[DR, '<section class=\"direct-answer\" id=\"answer\">', '<section class=\"direct-answer\" id=\"answers\">']], "T37-C7"],
  ["S39", "F37 C7 · a heading's wording changes to carry a refer-back", [[DR, HEAD, '`<h2><a href="#answer">${esc(s.heading)} ↑</a></h2>`, `<p class="qa-tier">${esc(tierLine)}</p>`,']], "T37-C7"],
  ["S40", "F37 C7 · a claim loses its label, source, date read or trace by being referred to", [[DR, '...traced(once(answerClaims), "the answer")', '...once(answerClaims).map(claimHtml)']], "T37-C7"],
  ["S41", "F37 C7 · a question's markup carries an answer not visible on the page", [[DR, FAQ, FAQ.replace("text: answerText(rendered) }", "text: `${answerText(rendered)} It also covers every other renewal.` }")]], "T37-C7"],
  ["S42", "F37 C7 · F40's text, criteria or method is changed to make a draft pass", [[QJ, "rendered more than once on the draft where no recorded justification names what the repeat adds at that place.", "rendered more than twice on the draft where no recorded justification names what the repeat adds at that place."]], "T37-C7"],
  /* ── C8 (Acceptance Amendment 2, RR-208) ── */
  ["S43", "C8 · a link comes from anything other than F94's plan (no plan, yet a link is rendered)", [[DR, "  const outLinks = links.state === PLAN.ABSENT ? [] : links.out;", "  const outLinks = links.state === PLAN.ABSENT ? [{ pageId: \"invented\", url: \"https://invented.invalid/page\" }] : links.out;"], [DR, "  if (links.state === PLAN.COMPLETE && list) out.push(", "  if (links.state !== PLAN.PARTIAL && list) out.push("]], "T37-C8"],
  ["S44", "C8 · a URL comes from anything other than F94's plan (no plan, yet a canonical is rendered)", [[DR, "  const head = present(links?.selfUrl) ? `<link rel=\"canonical\" href=\"${esc(links.selfUrl)}\">\\n` : \"\";", "  const head = present(links?.selfUrl ?? \"https://invented.invalid/page\") ? `<link rel=\"canonical\" href=\"${esc(links.selfUrl ?? \"https://invented.invalid/page\")}\">\\n` : \"\";"]], "T37-C8"],
  ["S45", "C8 · a plan for another need is read by the draft", [[DR, " || !own || plan.subject?.ref !== own) return", " || !own) return"]], "T37-C8"],
  ["S46", "C8 · construction hands a draft another need's plan", [[CON, "find((p) => p?.subject?.ref === `F35:CREATE:${decision?.subject?.needId}`) ?? null;", "find((p) => p?.feature === \"F94\") ?? null;"]], "T37-C8"],
  ["S47", "C8 · a plan F94's fault check would refuse (a link with no reason or an unusable target) is read", [[DR, "  if (![...(plan.linksIn ?? []), ...(plan.linksOut ?? [])].every(usable)) return", "  if (false) return"]], "T37-C8"],
  ["S48", "C8 · a target the plan did not plan as a link out is rendered", [[DR, "    out: Object.freeze((plan.linksOut ?? []).map(", "    out: Object.freeze([...(plan.linksOut ?? []), ...(plan.linksIn ?? [])].map("]], "T37-C8"],
  ["S49", "C8 · an anchor text or title is invented", [[DR, "<li><a href=\"${esc(l.url)}\">${esc(l.url)}</a></li>", "<li><a href=\"${esc(l.url)}\">${esc(`Read about ${l.pageId}`)}</a></li>"]], "T37-C8"],
  ["S50", "C8 · a PARTIAL plan is rendered without its PARTIAL label", [[DR, "<p class=\"plan-partial\">PARTIAL — this site plan stands on an ${esc(links.inventory)} inventory: pages it does not hold are not considered</p>", ""]], "T37-C8"],
  ["S51", "C8 · a PARTIAL plan is presented as complete", [[DR, "    state: plan.complete === true && plan.bound?.state === \"COMPLETE\" ? PLAN.COMPLETE : PLAN.PARTIAL,", "    state: PLAN.COMPLETE,"]], "T37-C8"],
  ["S52", "C8 · the internal-links check PASSES on a PARTIAL plan", [[DR, "    : links.state === PLAN.PARTIAL ? { state: CHECK.NOT_MEASURED, why:", "    : false ? { state: CHECK.NOT_MEASURED, why:"]], "T37-C8"],
  ["S53", "C8 · technical eligibility PASSES on a URL whose uniqueness the plan leaves NOT MEASURED", [[DR, "    : !links.urlUnique ? { state: CHECK.NOT_MEASURED, why:", "    : false ? { state: CHECK.NOT_MEASURED, why:"]], "T37-C8"],
  ["S54", "C8 · with no plan, the absence is not stated", [[DR, "  for (const n of planNotes) out.push(unknownHtml({ claimId: null, why: n }));", ""]], "T37-C8"],
  ["S55", "C8 · a URL the plan does not hold is rendered (its URL NOT MEASURED)", [[DR, "    selfUrl: urlOk ? plan.url.url : null,", "    selfUrl: urlOk ? plan.url.url : \"https://invented.invalid/page\","]], "T37-C8"],
  ["S56", "C8 · the notice adds visible text outside F40's filler parts", [[DR, "  for (const n of planNotes) out.push(unknownHtml({ claimId: null, why: n }));", "  for (const n of planNotes) out.push(`<p class=\"plan-note\">${esc(n)}</p>`);"]], "T37-C8"],
  ["S57", "C8 · the runner hands F40's draft no plan (the plan does not reach the judged draft)", [[BP, "plan: planFor(plans, d.decision) }),", "plan: null }),"]], "T37-C8"],
  ["S58", "C8 · F40's criteria are changed to make a draft pass", [[QJ, "Filler is any visible text block of the draft that is none of:", "Filler is any visible text block of the draft (a plan notice aside) that is none of:"]], "T37-C8"],
  ["S59", "C8 · F94's code is changed to make a draft pass", [[SP, "export const COMPLETE = \"COMPLETE\";", "export const COMPLETE = \"COMPLETE\"; /* PARTIAL counts as complete for drafts */"]], "T37-C8"],
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
  `RR-208 F37 A2 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
