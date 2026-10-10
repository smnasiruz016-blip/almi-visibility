/**
 * 🔴 F33 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 9dc9bc2 EVIDENCE).
 *
 *   node test/helpers/f33-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * Each sabotage replaces ONE exact single-line span, proves it LANDED, runs the named proof file, requires the NAMED test to fail,
 * restores the file and proves the restore by raw-byte sha256. The production trail is hashed before and after and must be unchanged.
 * A restore also runs on any exit. A sabotage that does not turn its named test red is reported NOT PROVED — never dropped.
 * Evidence: runs/audit/f33-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NCV = "src/page/need-coverage.mjs", EPF = "src/page/existing-page-first.mjs", CON = "src/page/construct.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f33-need-coverage.test.mjs", PC = "test/page-construction.test.mjs", T34 = "test/f34-no-blind-regeneration.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 F34's missing-information refusal still fires", EPF, `if (population === null || typeof population !== "object" || !Array.isArray(population.pages) || !COVERAGE_STATES.includes(population.coverageState)) {`, "if (false) {", "C1 ·", T],
  ["S2", "C1 F34's foreign-tenant refusal still fires", EPF, "if (!sameTenant(population.tenantId) || population.pages.some((p) => p?.tenantId !== undefined && !sameTenant(p.tenantId))) {", "if (false) {", "C1 ·", T],
  ["S3", "C2 a headline naming only this need COVERS", NCV, "[PAGE_EVIDENCE.HEADLINE_THIS_ONLY]: PAGE_VERDICTS.COVERS,", "[PAGE_EVIDENCE.HEADLINE_THIS_ONLY]: PAGE_VERDICTS.DIFFERENT,", "C2 · COVERED on the REAL structure", T],
  ["S4", "C2 different wording is the same need (stems)", NCV, "if (w.endsWith(s) && w.length - s.length >= MIN_STEM) { w = w.slice(0, -s.length); changed = true; break; }", "if (false) { break; }", "C2 · the SAME need in DIFFERENT WORDS", T],
  ["S5", "C2 different wording is the same need (prefix rule)", NCV, "export const sameStem = (a, b) => a === b || (Math.min(a.length, b.length) >= MIN_PREFIX && (a.startsWith(b) || b.startsWith(a)));", "export const sameStem = (a, b) => a === b;", "C2 · the SAME need in DIFFERENT WORDS", T],
  ["S6", "C3 a headline naming only other needs is DIFFERENT", NCV, "[PAGE_EVIDENCE.HEADLINE_OTHERS_ONLY]: PAGE_VERDICTS.DIFFERENT,", "[PAGE_EVIDENCE.HEADLINE_OTHERS_ONLY]: PAGE_VERDICTS.UNDECIDED,", "C3 · NOT COVERED on the REAL structure", T],
  ["S7", "C3 NOT COVERED only over a COMPLETE population", NCV, `if (population.coverageState !== "COMPLETE") return out(O.CANNOT_DECIDE, R.NOT_COMPLETE, pages);`, `if (false) return out(O.CANNOT_DECIDE, R.NOT_COMPLETE, pages);`, "C3 · NOT COVERED is NEVER given", T],
  ["S8", "C3 NOT COVERED lets production go on", EPF, "mayProduce: outcome === O.NO_EXISTING_PAGE || outcome === O.NOT_COVERED });", "mayProduce: outcome === O.NO_EXISTING_PAGE });", "C3 · NOT COVERED on the REAL structure", T],
  ["S9", "C4 an undecidable page holds the decision", NCV, "if (pages.some((p) => p.verdict === PAGE_VERDICTS.UNDECIDED)) return out(O.CANNOT_DECIDE, R.UNDECIDED_PAGES, pages);", "if (false) return out(O.CANNOT_DECIDE, R.UNDECIDED_PAGES, pages);", "C4 · each undecidable world", T],
  ["S10", "C4 a page naming no registered need is UNDECIDED", NCV, "[PAGE_EVIDENCE.NO_REGISTERED_NEED]: PAGE_VERDICTS.UNDECIDED,", "[PAGE_EVIDENCE.NO_REGISTERED_NEED]: PAGE_VERDICTS.DIFFERENT,", "C4 · each undecidable world", T],
  ["S11", "C4 a shared headline is UNDECIDED", NCV, "[PAGE_EVIDENCE.HEADLINE_THIS_AND_OTHERS]: PAGE_VERDICTS.UNDECIDED,", "[PAGE_EVIDENCE.HEADLINE_THIS_AND_OTHERS]: PAGE_VERDICTS.DIFFERENT,", "C4 · each undecidable world", T],
  ["S12", "C4 no registered structure cannot decide", NCV, "if (values.length === 0) return out(O.CANNOT_DECIDE, R.NO_STRUCTURE);", "if (values.length === 0) return out(O.NOT_COVERED, R.NO_STRUCTURE);", "C4 · each undecidable world", T],
  ["S13", "C5 the recorded reason carries F33's evidence", EPF, 'const f33 = need ? ` need=${need.outcome} ev=${evidenceSummary(need) || "none"}` : "";', 'const f33 = "";', "C5 ·", T],
  ["S14", "C5 NOT COVERED is recorded", EPF, 'if (decision.mayProduce) return { eventType: "EVALUATION", action: "DECIDE_NEED_NOT_COVERED_BY_EXISTING_PAGES", outcome: "ALLOWED", reasonCode: decision.reason, metadata };', "if (decision.mayProduce) return null;", "C5 ·", T],
  ["S15", "C5/C6 the runner's recorded decision carries F33", EPF, 'const f33 = need ? ` need=${need.outcome} ev=${evidenceSummary(need) || "none"}` : "";', 'const f33 = need ? " need=?" : "";', "C6 · END TO END", T34],
  ["S16", "C6 the one check reaches F33", EPF, "const need = decideNeedCoverage({ need: candidate?.intent, structure: candidate?.structure, population });", 'const need = { outcome: "NOT_COVERED", reason: "X", pages: [], covering: [], undecided: [] };', "C6 · the one check every routed path calls", T],
  ["S17", "C6 construction hands F33 the registered structure", CON, "existingPageFirst({ candidate: { slug, intent: me.spec?.variant, structure: { values: variants } }, tenantId, population: existingPages });", "existingPageFirst({ candidate: { slug, intent: me.spec?.variant }, tenantId, population: existingPages });", "F34 · C2 · a candidate whose intent", PC],
  ["S18", "C7 a network call in the decision is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 ·", T],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const trailBefore = sha(read(TRAIL));
const lines = [`F33 sabotage run · ${new Date().toISOString()}`, `population: ${SABOTAGES.length} sabotages over ${[...new Set(SABOTAGES.map((s) => s[6]))].join(", ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`, `production trail sha256 before: ${trailBefore}`, ""];
let proved = 0;
for (const [id, limb, file, from, to, expect, testFile] of SABOTAGES) {
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
  const ok = landed && red && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f33-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
