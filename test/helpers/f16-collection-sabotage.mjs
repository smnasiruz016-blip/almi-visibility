/**
 * 🔴 RR-155 · F16 C8–C14 · ONE SABOTAGE PER PROTECTION OF test/f16-collection.test.mjs.
 *
 *   node test/helpers/f16-collection-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The method of test/helpers/rr154-owner-records-sabotage.mjs: BASELINE (the named tests green before any sabotage), PRE-FLIGHT (each span
 * exactly once in the bytes live now), each sabotage ALONE, proved to have LANDED, its NAMED test required red by an AssertionError only
 * (a SyntaxError, TypeError or ReferenceError proves nothing), restored by raw-byte sha256, the production trail hashed before and after.
 * Evidence: runs/audit/f16-collection-sabotage-rr155-2026-10-04.txt — refuses to overwrite an earlier run's evidence.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = "src/research/collection.mjs", G = "src/research/request-governor.mjs", COL = "src/research/adapters/stack-exchange-collector.mjs";
const SA = "src/research/source-adapter.mjs", SE = "src/research/adapters/stack-exchange.mjs", LI = "src/research/lead-intake.mjs";
const BIN = "bin/collect-public-questions.mjs", PQ = "src/research/public-questions.mjs";
const T = ["test/f16-collection.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
/* run 2: the first run's evidence (…-2026-10-04.txt, 23 of 23) stays as the record of the code before the plan's tenant check moved to the
 * one scope decision (S13's span changed with it); this run is the code as committed */
const EVIDENCE = join(REPO, "runs", "audit", "f16-collection-sabotage-rr155-2026-10-04-run2.txt");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S01", "missing GREEN no longer refused", C, 'if (!present(greenId)) return ["GREEN_ABSENT"];', "if (!present(greenId)) return [];", "K2"],
  ["S02", "a STALE GREEN no longer refused", C, ' r.push("GREEN_PREDATES_THE_PLAN");', " void 0;", "K2"],
  ["S03", "a REUSED GREEN no longer refused", C, 'if (spent.has(greenId)) r.push("GREEN_ALREADY_SPENT");', "", "K2"],
  ["S04", "a GREEN for another plan no longer refused", C, 'else if (!mine) r.push("GREEN_NAMES_ANOTHER_PLAN");', "else if (!mine) void 0;", "K2"],
  ["S05", "the request cap exceeded by one", C, "cap: plan.requests,", "cap: plan.requests + 1,", "K3"],
  ["S06", "a quota exhausted no longer stops the run", G, 'if (quotaRemaining !== null && quotaRemaining <= 0) return refuse("QUOTA_EXHAUSTED");', "", "K3"],
  ["S07", "a backoff ignored", COL, 'if (Number.isInteger(first.response?.backoff) && first.response.backoff > 0) return { recorded, recheck: null, tally: g.tally(), stoppedBy: "BACKOFF_REQUESTED" };', "", "K3"],
  ["S08", "a source refusal read as an empty result (and the run goes on)", COL, "if (refusedBySource) return { recorded: null, recheck: null, tally: g.tally(), stoppedBy: refusedBySource };", "", "K3"],
  ["S09", "an irrelevant result admitted", SA, 'if (rel.verdict !== "RELEVANT") { refuse("NOT_ABOUT_THE_DECLARED_SUBJECT"); continue; }', "", "K4"],
  ["S10", "a deleted post no longer refused as deleted", SE, 'if (!now) { refuse("POST_DELETED_SINCE_RETRIEVAL"); continue; }', "", "K4"],
  ["S11", "a missing licence no longer refused as missing", SE, 'if (str(p.content_license) === null) { refuse("CONTENT_LICENSE_ABSENT"); continue; }', "", "K4"],
  ["S12", "a duplicate admitted", LI, "if (seen.has(q.question_id)) { refused.DUPLICATE_INTAKE = (refused.DUPLICATE_INTAKE ?? 0) + 1; continue; }", "", "K4"],
  ["S13", "a plan for another tenant runs", C, 'if (tenantDecidedAllowed !== true) r.push("PLAN_NOT_THIS_TENANTS");', "", "K6"],
  ["S14", "a plan for another subject runs", C, 'if (plan.subject !== subject) r.push("PLAN_NOT_THIS_SUBJECTS");', "", "K6"],
  ["S15", "zero no longer reported as zero", C, "zero: outcome === OUTCOMES.COMPLETED && retrieved !== NOT_MEASURED && questions === 0,", "zero: false,", "K5"],
  ["S16", "leads stored as questions", BIN, 'const g = append(intake.leads, "leads.jsonl", "APPEND_RESEARCH_LEADS");', 'const g = append(intake.leads, "questions.jsonl", "APPEND_RESEARCH_LEADS");', "K5"],
  ["S17", "the credential's value touched (its length measured)", BIN, "credentialPresent: credentialName !== null && Object.hasOwn(process.env, credentialName),", "credentialPresent: credentialName !== null && String(process.env[credentialName] ?? \"\").length >= 0 && Object.hasOwn(process.env, credentialName),", "K7"],
  ["S18", "a missing credential no longer refused", C, 'if (!credentialPresent) r.push("CREDENTIAL_ABSENT");', "", "K7"],
  ["S19", "the test seams no longer halt outside a test run", BIN, "if (seams.length && !inVerifiedTestContext(process.env)) {", "if (false) {", "K6"],
  ["S20", "a run without --confirm proceeds", BIN, "if (!permission.mayWrite) {", "if (false) {", "K6"],
  ["S21", "an invalid source decision passes", C, ' r.push("SOURCE_DECISION_NOT_VALID");', " void 0;", "K9"],
  ["S22", "a read-back module gains a raw network call", SA, "export function admitSource(decl) {", "export function admitSource(decl) {\n  if (decl?.probe === true) fetch(decl.url);", "K8"],
  ["S23", "an agent's record relabelled as a person's is counted as a person", PQ, "v.provenance.seenBy === OBSERVER_TYPES[t] ? t : null;", "true ? t : null;", "K8"],
];

if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 600000 });
const baseline = run();
const baselineGreen = baseline.status === 0;
const lines = [
  `RR-155 F16 collection sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE · fake transport only, zero real requests`,
  `BASELINE (named tests before any sabotage): ${baselineGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of baselineGreen ? SABOTAGES : []) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const f = inEol(text, from);
  const at = text.indexOf(f);
  writeFileSync(join(REPO, file), text.slice(0, at) + inEol(text, to) + text.slice(at + f.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], out = "";
  try {
    const r = run();
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const byAssertion = /AssertionError/.test(out) && !/SyntaxError|TypeError|ReferenceError/.test(out);
  const ok = landed && red && byAssertion && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · by AssertionError only ${byAssertion} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
