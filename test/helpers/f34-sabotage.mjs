/**
 * 🔴 F34 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 53f74b4 EVIDENCE).
 *
 *   node test/helpers/f34-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * Each sabotage replaces ONE exact single-line span (identical in an LF and a CRLF checkout), proves it LANDED, runs the named
 * proof file, requires the NAMED test to fail, restores the file and proves the restore by raw-byte sha256. The production trail
 * is hashed before and after and must be unchanged. A restore also runs on any exit. A sabotage that does not turn its named test
 * red is reported NOT PROVED — never dropped. Evidence: runs/audit/f34-sabotage-2026-09-28.txt; re-run after F33 (RR-84): runs/audit/f34-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EPF = "src/page/existing-page-first.mjs", POP = "src/page/existing-page-population.mjs", CON = "src/page/construct.mjs", BP = "bin/build-page.mjs";
const NC = "subjects/almi-oet/tools/nursing-chain.mjs", CEN = "tools/existing-page-first-census.mjs", NGC = "tools/no-generation-census.mjs";
const IDS = "src/evidence/ids.mjs", NCV = "src/page/need-coverage.mjs";
const T = "test/f34-no-blind-regeneration.test.mjs", PC = "test/page-construction.test.mjs", NBR = "test/no-blind-regeneration.test.mjs";
const HO = "test/f34-f35-handoff.test.mjs"; // RR-248: where S10's protection lives since RR-179 (c)
/* 🔴 RR-248 · BLOCKED (beta-g ruling, 11 Oct): a limb whose protection is a DEFECT in product code. It still runs and is reported, but it
 * is NEVER counted PROVED, and test/rr248-span-freshness.test.mjs SF-7 names every blocked limb. Lifted only by the round that fixes it. */
const BLOCKED = new Map([
  /* none — RR-249 fixed the F34 C6 defect (F35's stop is recorded, bin/build-page.mjs) and lifted S9 */
]);
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 missing population refused", EPF, `if (population === null || typeof population !== "object" || !Array.isArray(population.pages) || !COVERAGE_STATES.includes(population.coverageState)) {`, "if (false) {", "C1 · a missing", T],
  ["S2", "C1 another tenant refused", EPF, "if (!sameTenant(population.tenantId) || population.pages.some((p) => p?.tenantId !== undefined && !sameTenant(p.tenantId))) {", "if (false) {", "C1 · a missing", T],
  /* RR-248: restated — F34 Amendment 1 C7 (RR-174, 47e1769): MONITOR is no longer an F34 outcome, an uncertain one is HOLD */
  ["S3", "C2 empty but not COMPLETE is HOLD (C7; was MONITOR)", EPF, `return population.coverageState === "COMPLETE" ? out(O.NO_EXISTING_PAGE, R.NONE, seen) : out(O.HOLD, R.NOT_COMPLETE, seen);`, "return out(O.NO_EXISTING_PAGE, R.NONE, seen);", "C2 · with NO existing page", T],
  /* S4, S5 RE-POINTED (RR-84): F33 now carries these protections inside the same check — the old spans no longer exist. */
  ["S4", "C2 different wording never produced", NCV, "if (pages.some((p) => p.verdict === PAGE_VERDICTS.UNDECIDED)) return out(O.CANNOT_DECIDE, R.UNDECIDED_PAGES, pages);", "if (false) return out(O.CANNOT_DECIDE, R.UNDECIDED_PAGES, pages);", "C2 · the SAME need in DIFFERENT WORDS", T],
  ["S5", "C2 a page naming the intent is matched", NCV, "[PAGE_EVIDENCE.HEADLINE_THIS_ONLY]: PAGE_VERDICTS.COVERS,", "[PAGE_EVIDENCE.HEADLINE_THIS_ONLY]: PAGE_VERDICTS.DIFFERENT,", "C2 · an existing page that names the intent", T],
  ["S6", "C4 recorded defect routes to IMPROVE", EPF, "if (defective.length) {", "if (false) {", "C4 ·", T],
  ["S7", "C6 a stopped candidate owes a decision", EPF, "if (!decision || decision.outcome === EXISTING_PAGE_OUTCOMES.NO_EXISTING_PAGE) return null;", "return null;", "C6 · a stopped candidate", T],
  /* S8: RETIRED by RR-295 (owner decision 3) — its target, the old builder, is removed */
  /* RR-249: the F34 C6 fix — the runner records F35's own F34 decision for a candidate F35 stopped; S9 breaks THAT record (no longer BLOCKED) */
  /* S9: RETIRED by RR-295 (owner decision 3) — its target, the old builder, is removed */
  /* RR-248 · CASE (b) — MOVED (beta-g ruling, 11 Oct): since RR-179 (c) (_handoffs a8dc190) and RR-180 (a) (_handoffs 20150be) construction
   * acts only on F35's decision, and F35 judges F34 over the tenant's population before anything reaches construction; the runner's
   * existingPages: ep is read by no path that can change a verdict. The limb breaks F35's population (RR-248's first restatement here,
   * a re-anchored runner span, could never go red). */
  ["S10", "C1 F35 judges F34 over the real population before anything reaches construction (RR-179 c)", "src/page/action-evidence.mjs", "const ex = existingPageFirst({ candidate: { slug, intent: spec.variant, structure: { values } }, tenantId, population });", "const ex = existingPageFirst({ candidate: { slug, intent: spec.variant, structure: { values } }, tenantId, population: { tenantId, coverageState: \"COMPLETE\", pages: [] } });", "F34→F35 · a declared spec", HO],
  ["S11", "population applies the coverage correction", POP, "return c ? c.corrected_value : run.coverageState;", "return run.coverageState;", "population ·", T],
  ["S12", "C1 an unreadable batch is not a population", POP, "if (e instanceof ObservationBatchFault) return { population: null, fault: e.fault, population_of: null };", `if (e instanceof ObservationBatchFault) return { population: { tenantId: scope.tenantId, coverageState: "COMPLETE", pages: [] }, fault: null, population_of: null };`, "C6 · the shared gate", T],
  ["S13", "C6 the shared gate records", POP, "if (ev) scope.recordDecision(ev);", "if (false) scope.recordDecision(ev);", "C6 · the shared gate", T],
  /* S14: RETIRED by RR-295 (owner decision 3) — its target, the old builder, is removed */
  ["S15", "C5 an unclassified path is a fault", CEN, `{ faults.push({ file, code: "UNCLASSIFIED_PAGE_PATH" }); return { file, class: null }; }`, "{ return { file, class: null }; }", "C5 · FIRING CONTROLS", T],
  ["S16", "C5 a routed path must hold its marks", CEN, `c.marks.every((m) => typeof m === "string" && m !== "" && src.includes(m))`, "true", "C5 · FIRING CONTROLS", T],
  ["S17", "C3 a product-repository write is seen", NGC, "test: (line) => ANY_WRITE.test(line) && ESCAPES_REPO.test(line),", "test: () => false,", "C3 ·", T],
  ["S18", "C3 a publish is seen", NGC, "test: (line) => PUBLISH.test(line),", "test: () => false,", "C3 ·", T],
  ["S19", "C3 a rediscovered URL keeps its existing page_id", IDS, "return shortHash(canonicalUrl(rawUrl));", "return shortHash(canonicalUrl(rawUrl) + Math.random());", "🔴 a rediscovered URL resolves to its EXISTING page_id", NBR],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const trailBefore = sha(read(TRAIL));
const lines = [`F34 sabotage run · ${new Date().toISOString()}`, `population: ${SABOTAGES.length} sabotages over ${[...new Set(SABOTAGES.map((s) => s[6]))].join(", ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`, `production trail sha256 before: ${trailBefore}`, ""];
let proved = 0;
const ONLY = process.argv.find((x) => x.startsWith("--only="))?.slice(7).split(",") ?? null; // RR-248: one limb at a time
for (const [id, limb, file, from, to, expect, testFile] of SABOTAGES) {
  if (ONLY && !ONLY.includes(id)) continue;
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [];
  try {
    const r = spawnSync(process.execPath, ["--test", testFile], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const blocked = BLOCKED.get(id) ?? null;
  const ok = landed && red && restored && blocked === null;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${blocked ? `BLOCKED — NOT PROVED: ${blocked}` : ok ? "PROVED" : "NOT PROVED"}`);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
const ran = SABOTAGES.filter(([id]) => !ONLY || ONLY.includes(id));
const blockedRan = ran.filter(([id]) => BLOCKED.has(id)).map(([id]) => id);
lines.push("", `proved ${proved} of ${ran.length}${blockedRan.length ? ` · BLOCKED ${blockedRan.length} (${blockedRan.join(", ")}) — never PROVED` : ""} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f34-sabotage", lines.join("\n") + "\n")}`);
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
