/**
 * 🔴 RR-157 · ONE SABOTAGE PER PROTECTION OF test/rr157-meaning.test.mjs — and, for the limbs RR-157 §6 names that are proved elsewhere
 * (the withdrawn plan, a GREEN and a valid source decision, two clients' batches, a lead, a credential), the same sabotages again on the
 * code live now.
 *
 *   node test/helpers/rr157-sabotage.mjs --deliberate     NOT part of `npm test`
 *
 * Method of test/helpers/rr156-sabotage.mjs (multi-span entries allowed). Evidence: runs/audit/rr157-sabotage-2026-10-04.txt — refuses to
 * overwrite.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MJ = "src/research/meaning-judgement.mjs", SA = "src/research/source-adapter.mjs", SE = "src/research/adapters/stack-exchange.mjs";
const C = "src/research/collection.mjs", BIN = "bin/collect-public-questions.mjs";
const T = ["test/rr157-meaning.test.mjs", "test/rr156-lamzish-scope.test.mjs", "test/f16-collection.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const EVIDENCE = join(REPO, "runs", "audit", "rr157-sabotage-2026-10-04.txt");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["X01", "a plainly relevant post judged CANDIDATE is rejected", [[MJ, 'CANDIDATE: "ADMITTED",', 'CANDIDATE: "REJECTED",']], "M2"],
  ["X02", "an unrelated post judged NOT_A_CANDIDATE is admitted", [[MJ, 'NOT_A_CANDIDATE: "REJECTED",', 'NOT_A_CANDIDATE: "ADMITTED",']], "M2"],
  ["X03", "a borderline post (UNKNOWN) is admitted instead of held", [[MJ, 'UNKNOWN: "HELD" });', 'UNKNOWN: "ADMITTED" });']], "M2"],
  ["X04", "a reason not quoted from the original post accepted", [[MJ, 'if (!quotedFrom(draft.quote, v.originalPost)) return refuse("REASON_NOT_QUOTED_FROM_THE_ORIGINAL_POST");', ""]], "M3"],
  ["X05", "a judgement with no quote accepted", [[MJ, 'if (!present(draft.quote)) return refuse("REASON_NOT_QUOTED");', ""]], "M3"],
  ["X06", "a judgement on a snippet or title accepted", [[MJ, 'if (draft.basis !== BASIS) return refuse("JUDGEMENT_NOT_ON_THE_ORIGINAL_POST");', ""]], "M3"],
  ["X07", "a residence the post does not establish accepted", [[MJ, 'if (!present(draft.authorResidence) || !quotedFrom(draft.residenceQuote, v.originalPost)) return refuse("RESIDENCE_NOT_ESTABLISHED_BY_THE_POST");', ""]], "M3"],
  ["X08", "a judgement with no declared judge accepted", [[MJ, 'if (!JUDGE_TYPES.includes(draft.judge?.observerType) || !present(draft.judge?.actorRef)) return refuse("JUDGE_UNDECLARED");', ""]], "M3"],
  ["X09", "a second judgement accepted without naming the one it overturns", [[MJ, 'if (current && draft.overturns !== current.judgement_id) return refuse("ALREADY_JUDGED_NAME_THE_JUDGEMENT_YOU_OVERTURN");', ""]], "M3"],
  ["X10", "the meaning test turned into a match-everything rule (unjudged posts admitted)", [[SA, 'if (profile.mode === "MEANING_JUDGEMENT") return present(profile.test) ? { refusal: null, id: profile.profileId ?? null, mode: "MEANING", test: profile.test } : { refusal: "MEANING_TEST_UNDECLARED" };', 'if (profile.mode === "MEANING_JUDGEMENT") return { refusal: null, id: profile.profileId ?? null, confirms: [/./], ambiguous: [], excludes: [] };']], "M1"],
  ["X11", "a reply stored as part of the original post", [[SE, "const postText = str(now?.body) ? `${now.title}\\n\\n${textOf(now.body)}` : null;", "const postText = str(now?.body) ? `${now.title}\\n\\n${textOf(now.body)}${(now.answers ?? []).map((a) => \" \" + a.body).join(\"\")}` : null;"]], "M1"],
  ["X12", "a residence recorded that no one established", [[MJ, "let residence = NOT_MEASURED;", 'let residence = "abroad";']], "M5"],
  ["X13", "the withdrawn plan runs (its check removed)", [[C, 'if (planSha !== null && withdrawn.some((w) => w.planSha256 === planSha)) r.push("PLAN_WITHDRAWN");', ""]], "L2"],
  ["X14", "a request issued with no GREEN", [[C, 'if (!present(greenId)) return ["GREEN_ABSENT"];', "if (!present(greenId)) return [];"]], "K2"],
  ["X15", "a request issued under an invalid source decision", [[C, ' r.push("SOURCE_DECISION_NOT_VALID");', " void 0;"]], "K9"],
  ["X16", "ALL THREE guards on another client's batch removed", [
    [BIN, "RESOURCES.researchBatch(BATCH), RESOURCES.connector(SUBJECT, KIND)", "RESOURCES.connector(SUBJECT, KIND)"],
    [BIN, 'if (!members.some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === BATCH)) {', "if (false) {"],
    [BIN, 'const tenantDecidedAllowed = typeof plan?.tenantId === "string" && decideForTenant(createTenantResolver(), plan.tenantId, RESOURCES.researchBatch(BATCH)).allowed === true;', "const tenantDecidedAllowed = true;"],
  ], "L5"],
  ["X17", "leads stored as questions", [[BIN, 'const g = append(intake.leads, "leads.jsonl", "APPEND_RESEARCH_LEADS");', 'const g = append(intake.leads, "questions.jsonl", "APPEND_RESEARCH_LEADS");']], "K5"],
  ["X18", "the credential's value touched (its length measured)", [[BIN, "credentialPresent: credentialName !== null && Object.hasOwn(process.env, credentialName),", "credentialPresent: credentialName !== null && String(process.env[credentialName] ?? \"\").length >= 0 && Object.hasOwn(process.env, credentialName),"]], "K7"],
];

if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const baselineGreen = run().status === 0;
const lines = [
  `RR-157 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE (X16: three spans together) · fake transport only, zero real requests`,
  `BASELINE (named tests before any sabotage): ${baselineGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of baselineGreen ? SABOTAGES : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
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
  const red = failing.some((n) => n.startsWith(expect));
  const byAssertion = /AssertionError/.test(out) && !/SyntaxError|TypeError|ReferenceError/.test(out);
  const ok = landed && red && byAssertion && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · by AssertionError only ${byAssertion} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
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
