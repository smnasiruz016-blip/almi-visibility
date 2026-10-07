/**
 * 🔴 RR-210 · F38 · ONE SABOTAGE PER FAILURE LIMB of F38's first acceptance (_handoffs 96ae49e: C1–C7 and [ALL]) — each on LIVE, REACHABLE code,
 * its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never a crash of
 * the TEST), every file restored by raw-byte sha256, the production trail hashed before and after. FIXTURE PAGES ONLY (RR-177).
 *
 *   node test/helpers/rr210-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr210-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr210-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr188-sabotage.mjs (via rr206), unchanged.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AF = "src/page/answer-first.mjs", AE = "src/page/answer-first-evidence.mjs", TC = "src/audit/technical-checks.mjs";
const CBE = "src/page/content-brief-evidence.mjs", TF = "test/rr210-f38.test.mjs";
const T = ["test/rr210-f38.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr210-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const UNUSABLE = "export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.REDIRECTED, STATUS.NOT_SERVED]);";
const SABOTAGES = [
  /* ── C1 ── */
  ["S01", "C1 · a draft whose first block after the top heading is not the direct answer is accepted", [[AF, 'if (!head) return Object.freeze({ verdict: VERDICT.FAIL, why: "the first content block after the top heading is not the direct answer" });', 'if (!head) return Object.freeze({ verdict: VERDICT.PASS, why: "accepted" });']], "T38-C1"],
  ["S02", "C1 · content other than the title, heading and answer before the first question is accepted", [[AF, "  if (firstQa >= 0 && between.trim() !== \"\") return", "  if (false) return"]], "T38-C1"],
  ["S03", "C1 · F38 re-renders the draft it reads (drops a planted block before judging)", [[AF, "  const html = String(draft?.html ?? \"\").replace(/^<link\\b[^>]*>\\n/, \"\");", "  const html = String(draft?.html ?? \"\").replace(/^<link\\b[^>]*>\\n/, \"\").replace(/<p class=\"intro\">[^<]*<\\/p>\\n?/g, \"\");"]], "T38-C1"],
  ["S04", "C1 · an existing page's answer placement is reported as measured", [[AF, "      answerPlacement: ANSWER_PLACEMENT_NOT_MEASURED,\n", "      answerPlacement: \"PASS\",\n"]], "T38-C1"],
  /* ── C2 ── */
  ["S05", "C2 · a title lacking the central question's own words is accepted", [[AF, "  if (head?.title !== (present(spec?.title) ? spec.title.trim() : null)) add(\"C2\"", "  if (false) add(\"C2\""]], "T38-C2"],
  ["S06", "C2 · a keyword the verified content does not hold is added to the title", [[AF, "  const title = present(spec?.title) ? spec.title.trim() : null;", "  const title = present(spec?.title) ? `${spec.title.trim()} | best renewal guide` : null;"]], "T38-C2"],
  ["S07", "C2 · a length decides (a title length gate)", [[AF, "  const findings = [];\n  const title =", "  const findings = [];\n  if (String(spec?.title ?? \"\").length > 60) findings.push({ part: \"title\", kind: \"TOO_LONG\" });\n  const title ="]], "T38-C2"],
  ["S08", "C2 · F38 re-judges repetition", [[AF, "import { PROMISE, claimsOf } from \"./draft-render.mjs\";", "import { PROMISE, claimsOf } from \"./draft-render.mjs\";\nimport { JUDGEMENTS } from \"./quality-judgements.mjs\";"]], "T38-C2"],
  /* ── C3 ── */
  ["S09", "C3 · a description stating more than the rendered supported claims is accepted", [[AF, "  if (head?.description != null && head.description !==", "  if (false && head.description !=="]], "T38-C3"],
  ["S10", "C3 · a claim that is not a supported central claim enters the description", [[AF, ".filter((m) => central.has(m[1])).map(", ".map("]], "T38-C3"],
  ["S11", "C3 · an UNKNOWN part's wording in the head is accepted", [[AF, "  if (unknown.some((u) =>", "  if (false && unknown.some((u) =>"]], "T38-C3"],
  ["S12", "C3 · a promise of ranking in the head is accepted", [[AF, "  if (PROMISE.test(`${head?.title", "  if (false && PROMISE.test(`${head?.title"]], "T38-C3"],
  ["S13", "C3 · F38 judges useful or engaging itself", [[AF, "/** The titles and meta descriptions a stored body holds", "export function judgeEngaging() { return \"PASS\"; }\n/** The titles and meta descriptions a stored body holds"]], "T38-C3"],
  /* ── C4 ── */
  ["S14", "C4 · a head with no title, two titles or an empty one is accepted", [[AF, "  if (h.titles.length !== 1 || !present(h.titles[0])) add(", "  if (false) add("]], "T38-C4"],
  ["S15", "C4 · a head with no description, two or an empty one is accepted", [[AF, "  if (h.descriptions.length !== 1 || !present(h.descriptions[0])) add(", "  if (false) add("]], "T38-C4"],
  ["S16", "C4 · a head inside the body F40 judges is accepted", [[AF, "  if (body.titles.length || body.descriptions.length) add(", "  if (false) add("]], "T38-C4"],
  ["S17", "C4 · a title duplicating a recorded page's or another draft's is accepted", [[AF, "  if (title && (others.titles ?? []).includes(title)) findings.push(", "  if (false) findings.push("]], "T38-C4"],
  ["S18", "C4 · a description duplicating a recorded page's is accepted", [[AF, "  if (description && (others.descriptions ?? []).includes(description)) findings.push(", "  if (false) findings.push("]], "T38-C4"],
  ["S19", "C4 · a description is invented for a draft with no supported central claim", [[AF, "  const description = claims.length ? claims.map((c) => c.text).join(\" \") : null;", "  const description = claims.length ? claims.map((c) => c.text).join(\" \") : `About ${spec?.title ?? \"this page\"}.`;"]], "T38-C4"],
  ["S20", "C4 · the runner does not compare a draft's title with the run's other drafts", [[AE, "...others.flatMap((o) => o.titles)]", "]"]], "T38-C4"],
  /* ── C5 ── */
  ["S21", "C5 · an existing page with no title carries no finding", [[AF, "    if (!list.length) return [FINDING.ABSENT];", "    if (!list.length) return [];"]], "T38-C5"],
  ["S22", "C5 · an existing page's empty description carries no finding", [[AF, "    if (list.every((v) => !present(v))) out.push(FINDING.EMPTY);", ""]], "T38-C5"],
  ["S23", "C5 · an existing page's two descriptions carry no finding", [[AF, "    if (list.length > 1) out.push(FINDING.MULTIPLE);", ""]], "T38-C5"],
  ["S24", "C5 · a duplicated title or description carries no finding", [[AF, "    if (list.length === 1 && present(list[0]) && counts.get(list[0]) > 1) out.push(FINDING.DUPLICATED);", ""]], "T38-C5"],
  ["S25", "C5 · a page with no stored body is reported clean", [[AF, "  const withBody = own.filter((p) => present(p.html));", "  const withBody = own;"], [AF, "    if (!present(p.html)) return Object.freeze({ pageId: p.pageId, measured: false,", "    if (false) return Object.freeze({ pageId: p.pageId, measured: false,"]], "T38-C5"] /* re-anchored after the practice pass: the first form crashed the module (TypeError), it did not reach the assertion */,
  ["S26", "C5 · overstating is reported as measured on an existing page", [[AF, "      overstating: OVERSTATING_NOT_MEASURED,\n", "      overstating: \"PASS\",\n"]], "T38-C5"],
  ["S27", "C5 · F38 generates or rewrites an existing page's title", [[AF, "/** The titles and meta descriptions a stored body holds", "export function rewriteTitle(page) { return page; }\n/** The titles and meta descriptions a stored body holds"]], "T38-C5"],
  /* ── C6 ── */
  ["S28", "C6 · on an INCOMPLETE inventory a title is reported unique among the client's pages", [[AF, "  const complete = completeness?.state === \"COMPLETE\";\n  const unique = findings.some(", "  const complete = true;\n  const unique = findings.some("]], "T38-C6"],
  ["S29", "C6 · a result lacks its bound", [[AF, "bound: completeness?.bound ?? \"no completeness verdict recorded (F31)\",", "bound: null,"]], "T38-C6"],
  ["S30", "C6 · the reader asks for another (no) tenant's records", [[AE, "  const { population, fault } = io.population({ tenantId, resolve, env, now });", "  const { population, fault } = io.population({ tenantId: null, resolve, env, now });"]], "T38-C6"],
  ["S31", "C6 · another tenant's page is read into the audit", [[AF, "  for (const p of pages) (sameTenant(p?.tenantId, tenantId) ? own : refused).push(p);", "  for (const p of pages) own.push(p);"]], "T38-C6"],
  ["S32", "C6 · something is fetched", [[AF, "export const VERDICT = Object.freeze(", "export const probe = (u) => fetch(u);\nexport const VERDICT = Object.freeze("]], "T38-C6"],
  ["S33", "C6 · something is written", [[AF, "import { decideResolvedTenants } from \"../tenancy/scope.mjs\";", "import { decideResolvedTenants } from \"../tenancy/scope.mjs\";\nimport { writeFileSync } from \"node:fs\";"]], "T38-C6"],
  /* ── C7 ── */
  ["S34", "C7 · F38 changes another row's code (the head-elements check)", [[TC, "description: \"Missing or empty title/description/H1, more than one H1, duplicate titles, or a skipped heading level.\",", "description: \"Missing or empty title/description/H1, more than one H1, duplicate titles or descriptions (F38), or a skipped heading level.\","]], "T38-C7"],
  ["S35", "C7 · F38's head is wired into F41's preview without F41's own amendment", [[CBE, "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";", "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";\nimport { readClientHeads } from \"./answer-first-evidence.mjs\";"]], "T38-C7"],
  /* ── [ALL] ── */
  ["S36", "[ALL] · a proof reads a page body (the 27 pages set aside)", [[TF, "const SP = \"src/page/answer-first.mjs\", SE = \"src/page/answer-first-evidence.mjs\";", "const SP = \"src/page/answer-first.mjs\", SE = \"src/page/answer-first-evidence.mjs\";\nconst bodies = () => readPartitionBodies;"]], "T38-ALL"],
  ["S37", "[ALL] · a run reports counts it did not produce", [[AF, "    title: Object.freeze(tally(\"title\")), description:", "    title: Object.freeze({ ...tally(\"title\"), ABSENT: 0 }), description:"]], "T38-ALL"],
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
  `RR-210 F38 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
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
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · a production child crashed ${childCrashed} · failing ${[...new Set(failing.map((n) => n.split(" ")[0]))].join(",")} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
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
