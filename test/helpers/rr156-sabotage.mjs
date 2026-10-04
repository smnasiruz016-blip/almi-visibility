/**
 * 🔴 RR-156 · ONE SABOTAGE PER PROTECTION OF test/rr156-lamzish-scope.test.mjs — and, for the limbs RR-156 §5 names that live in
 * test/f16-collection.test.mjs (a lead admitted, zero misreported, a credential touched), the same sabotages again on the code live now.
 *
 *   node test/helpers/rr156-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * Method of test/helpers/f16-collection-sabotage.mjs: BASELINE green, PRE-FLIGHT (every span exactly once), each sabotage ALONE, LANDED,
 * its NAMED test red by AssertionError only, restored by raw-byte sha256, the production trail hashed before and after. One sabotage is TWO
 * spans applied together (W08): a run naming another client's batch is stopped by THREE independent guards — the tenant scope gate, the
 * subject's batch membership, and the plan's tenant through the one decision. Removing fewer leaves the others holding (measured in the
 * rehearsal: two removed, the test stayed green), which is the design, not a gap.
 * Evidence: runs/audit/rr156-sabotage-2026-10-04.txt — refuses to overwrite.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = "src/research/collection.mjs", BIN = "bin/collect-public-questions.mjs", SA = "src/research/source-adapter.mjs", WP = "config/research/withdrawn-plans.mjs";
const T = ["test/rr156-lamzish-scope.test.mjs", "test/f16-collection.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const EVIDENCE = join(REPO, "runs", "audit", "rr156-sabotage-2026-10-04.txt");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

/* [id, limb, [[file, from, to], …], named test] */
const SABOTAGES = [
  ["W01", "the withdrawn-plan check removed", [[C, 'if (planSha !== null && withdrawn.some((w) => w.planSha256 === planSha)) r.push("PLAN_WITHDRAWN");', ""]], "L2"],
  ["W02", "the withdrawn plan's hash altered in the list", [[WP, 'planSha256: "5e97c4d3235d30eda162f629006628c92d9bd32a13b264ee07187557d50c9954"', 'planSha256: "5e97c4d3235d30eda162f629006628c92d9bd32a13b264ee07187557d50c9955"']], "L2"],
  ["W03", "the entry point stops handing the withdrawn list to the preflight", [[BIN, "planSha, withdrawn: WITHDRAWN_PLANS, records,", "planSha, withdrawn: [], records,"]], "L2"],
  ["W04", "a GREEN for another plan admitted", [[C, 'else if (!mine) r.push("GREEN_NAMES_ANOTHER_PLAN");', "else if (!mine) void 0;"]], "L3"],
  ["W05", "the relevance profile's excluding rules ignored", [[SA, 'const x = hit(p.excludes); if (x >= 0) return { verdict: "UNRELATED", rule: `excludes[${x}]` };', ""]], "L4"],
  ["W06", "the relevance gate removed", [[SA, 'if (rel.verdict !== "RELEVANT") { refuse("NOT_ABOUT_THE_DECLARED_SUBJECT"); continue; }', ""]], "L4"],
  ["W07", "admitted records claim another client", [[SA, "const shared = { subject, origin,", 'const shared = { subject: "fixture-other-client", origin,']], "L5"],
  ["W08", "ALL THREE guards on another client's batch removed (scope gate + membership + the plan's tenant decision)", [
    [BIN, "RESOURCES.researchBatch(BATCH), RESOURCES.connector(SUBJECT, KIND)", "RESOURCES.connector(SUBJECT, KIND)"],
    [BIN, 'if (!members.some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === BATCH)) {', "if (false) {"],
    [BIN, 'const tenantDecidedAllowed = typeof plan?.tenantId === "string" && decideForTenant(createTenantResolver(), plan.tenantId, RESOURCES.researchBatch(BATCH)).allowed === true;', "const tenantDecidedAllowed = true;"],
  ], "L5"],
  ["W09", "a plan for more than two no longer refused", [[C, 'else if (plan.requests > COLLECTION_REQUEST_CEILING) r.push("PLAN_EXCEEDS_REQUEST_CEILING");', ""]], "L6"],
  ["W10", "the collector handed the plan's own count", [[C, "cap: Math.min(plan.requests, COLLECTION_REQUEST_CEILING),", "cap: plan.requests,"]], "L6"],
  ["W11", "the ceiling raised to three", [[C, "export const COLLECTION_REQUEST_CEILING = 2;", "export const COLLECTION_REQUEST_CEILING = 3;"]], "L6"],
  ["W12", "leads stored as questions", [[BIN, 'const g = append(intake.leads, "leads.jsonl", "APPEND_RESEARCH_LEADS");', 'const g = append(intake.leads, "questions.jsonl", "APPEND_RESEARCH_LEADS");']], "K5"],
  ["W13", "zero no longer reported as zero", [[C, "zero: outcome === OUTCOMES.COMPLETED && retrieved !== NOT_MEASURED && questions === 0,", "zero: false,"]], "K5"],
  ["W14", "the credential's value touched (its length measured)", [[BIN, "credentialPresent: credentialName !== null && Object.hasOwn(process.env, credentialName),", "credentialPresent: credentialName !== null && String(process.env[credentialName] ?? \"\").length >= 0 && Object.hasOwn(process.env, credentialName),"]], "K7"],
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
  `RR-156 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE (W08: two spans together) · fake transport only, zero real requests`,
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
    for (const [sf, from, to] of spans.filter((s) => s[0] === f)) { const ff = inEol(text, from); const at = text.indexOf(ff); text = text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length); void sf; }
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
