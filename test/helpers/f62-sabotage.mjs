/**
 * 🔴 RR-148 · F62 APPLICABILITY · ONE SABOTAGE PER CLAUSE LIMB (acceptance _handoffs a5ec9f1).
 *
 *   node test/helpers/f62-sabotage.mjs      NOT part of `npm test`
 *
 * BASELINE: the test file must be wholly GREEN before any sabotage, or nothing is run. PRE-FLIGHT: every span exactly once in the code
 * live now. Each sabotage alone; the named test must fail by an ASSERTION (a SyntaxError, TypeError or other crash is a harness fault,
 * never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f62-sabotage-rr148-2026-10-03.txt — its own file; it refuses to overwrite one that exists.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EVIDENCE = join(REPO, "runs", "audit", process.env.F62_EVIDENCE_NAME ?? "f62-sabotage-rr148-2026-10-03.txt");
if (existsSync(EVIDENCE)) { console.error(`refused: ${EVIDENCE} exists — an earlier run's evidence is never overwritten; name a new file with F62_EVIDENCE_NAME`); process.exit(2); }
const AP = "src/research/applicability.mjs", RT = "src/research/research-routes.mjs";
const T = ["test/f62-applicability.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const P1 = "P1 · C1", P2 = "P2 · C2", P3 = "P3 · C3", P4 = "P4 · C4", P5 = "P5 · C5", P6 = "P6 · C6", P7B = "P7b · C7", P8 = "P8 · C8";

const SABOTAGES = [
  /* C1 */
  ["S1", "C1 ACCEPTED is never turned into REQUIRED", AP, "outcome: outcomes[0], records:", "outcome: outcomes[0] === OUTCOMES.ACCEPTED ? OUTCOMES.REQUIRED : outcomes[0], records:", P1],
  ["S2", "C1 a conflict is never resolved by choosing", AP, "if (outcomes.length > 1) return Object.freeze({ ...out, outcome: OUTCOMES.UNKNOWN,", "if (outcomes.length > 1) return Object.freeze({ ...out, outcome: outcomes[0],", P1],
  ["S3", "C1 an outcome is read only from a record that states it", AP, "  const stating = act.filter((f) => STATED.includes(f?.applicability?.outcome));\n", "  const stating = act.filter((f) => STATED.includes(f?.applicability?.outcome) || /requires/.test(f?.claim?.predicate ?? \"\")).map((f) => (f.applicability ? f : { ...f, applicability: { outcome: OUTCOMES.REQUIRED } }));\n", P1],
  /* C2 */
  ["S4", "C2 an absent source is UNKNOWN, never NOT_REQUIRED", AP, "outcome: OUTCOMES.UNKNOWN, why: \"no source", "outcome: OUTCOMES.NOT_REQUIRED, why: \"no source", P2],
  /* C3 */
  ["S5", "C3 only a source F46 admits decides", AP, "  if (auth.result !== \"ADMISSIBLE\") return", "  if (false) return", P3],
  ["S6", "C3 only the deciding body's own (tier 1) source decides", AP, "  if (f?.source?.tier !== 1) return", "  if (false) return", P3],
  ["S7", "C3 only a citation F46 PROVES decides", AP, "  if (cite.verdict !== CITATION.PROVED) {", "  if (false) {", P3],
  ["S8", "C3 only a record F45 presents CURRENT decides", AP, "  if (h.presentation !== \"CURRENT\") return", "  if (false) return", P3],
  ["S9", "C3 a deciding record carries its observed date", AP, "observedOn: health.get(f.id)?.freshness?.checkedOn ?? null", "observedOn: null", P3],
  /* C4 */
  ["S10", "C4 a narrower record never decides the wider combination", AP, "      if (s.size === n.scope.size && covers(s, n.scope)) exact.push(f);\n", "      if (covers(s, n.scope)) exact.push(f);\n", P4],
  ["S11", "C4 a wider record is never copied down", AP, "else if (s.size < n.scope.size && covers(n.scope, s)) wider.push(f.id ?? null);", "else if (s.size < n.scope.size && covers(n.scope, s)) exact.push(f);", P4],
  /* C5 */
  ["S12", "C5 no carried value is NOT MEASURED, never a measured 0", AP, "  if (values === 0) return unmeasured(MISSING.carried);\n", "", P5],
  ["S13", "C5 no routes in hand is NOT MEASURED", AP, "  if (!Array.isArray(routes) || routes.length === 0) return unmeasured(MISSING.routes);", "  if (!Array.isArray(routes)) return unmeasured(MISSING.routes);", P5],
  ["S14", "C5 the judging date is stated, never the clock's", AP, "  if (!ISO.test(on ?? \"\")) return unmeasured(MISSING.date);", "  if (!ISO.test(on ?? \"\")) on = new Date().toISOString().slice(0, 10);", P5],
  ["S15", "C5 the dimension must be one F13 reports from the product's records", AP, "  if (!(axes?.discovered ?? []).some((d) => d?.key === dimension)) return unmeasured(MISSING.discovered);", "  if (false) return unmeasured(MISSING.discovered);", P5],
  /* C6 */
  ["S16", "C6 only REQUIRED and ACCEPTED combinations are handed on", AP, ".filter((c) => APPLICABLE.includes(c.outcome))", ".filter((c) => c.outcome !== OUTCOMES.UNKNOWN)", P6],
  ["S17", "C6 every route is narrowed, the topic route included", RT, "    routes.splice(0, routes.length, ...kept", "    routes.splice(1, routes.length - 1, ...kept", P6],
  ["S18", "C6 unmeasured applicability hands over nothing", AP, "  if (!applicability?.measured) return NOT_MEASURED;", "  if (!applicability?.measured) return Object.freeze([]);", P6],
  ["S19", "C6 a handed route carries its limits (not a question, not an opportunity, not demand)", AP, "measuredOn: applicability.on, limits: ROUTE_LIMITS,", "measuredOn: applicability.on, limits: null,", P6],
  /* C7 */
  ["S20", "C7 the code names no product", AP, "export const NOT_MEASURED = \"NOT MEASURED\";\n", `export const NOT_MEASURED = "NOT MEASURED";\nexport const PLANTED = "${PRODUCT_WORDS[0]}";\n`, P7B],
  ["S21", "C7 the code reaches no network", AP, "export const NOT_MEASURED_APPLICABILITY = NOT_MEASURED;\n", "export const NOT_MEASURED_APPLICABILITY = NOT_MEASURED;\nexport async function probe(u) { return fetch(u); }\n", P7B],
  /* C8 */
  ["S22", "C8 language, cultural and search differences are NOT MEASURED, named", AP, "Object.freeze({ state: NOT_MEASURED, missing: MISSING.otherEvidence })", "Object.freeze({ state: 0, missing: null })", P8],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const runTests = () => {
  const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
  const out = `${r.stdout}${r.stderr}`;
  return {
    failing: [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]),
    passing: [...out.matchAll(/✔ (.+?) \(\d/g)].map((m) => m[1]),
    reasons: [...new Set([...out.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|RangeError|Error)\b/gm)].map((m) => m[1]))],
  };
};
const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const base = runTests();
const named = [...new Set(SABOTAGES.map((s) => s[5]))];
const baselineGreen = base.failing.length === 0 && named.every((n) => base.passing.some((p) => p.startsWith(n)));
const lines = [
  `RR-148 F62 applicability sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `BASELINE (unsabotaged): passing ${base.passing.length} · failing ${base.failing.length} · every named test green: ${baselineGreen}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
if (!baselineGreen) { console.error("refused: the baseline is not green — a red test cannot prove a sabotage"); process.exit(3); }
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let r;
  try { r = runTests(); } finally { writeFileSync(join(REPO, file), orig); }
  const restored = sha(read(file)) === sha(orig);
  const red = r.failing.some((n) => n.startsWith(expect));
  const byAssertion = r.reasons.length > 0 && r.reasons.every((x) => x === "AssertionError");
  const ok = landed && red && restored && byAssertion;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test (${expect}) red ${red} · failing ${[...new Set(r.failing)].length} · reason ${r.reasons.join("+") || "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
