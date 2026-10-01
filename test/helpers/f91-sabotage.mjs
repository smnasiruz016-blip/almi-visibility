/**
 * 🔴 F91 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 2048dd3 EVIDENCE; RR-113 §6).
 *
 *   node test/helpers/f91-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f91-sabotage-2026-10-01.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PL = "src/page/page-opportunities.mjs", RD = "src/page/page-opportunities-reader.mjs", BIN = "bin/page-opportunities.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f91-page-opportunities.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 several dimensions are never multiplied blindly", PL, "  else missing = MISSING.combinationRule;", "  else candidates = used.reduce((acc, d) => acc.flatMap((c) => d.values.map((v) => ({ ...c, [d.key]: v }))), [{}]);", "C1 · FIRING CONTROL"],
  ["S2", "C1 a dimension with no declared value is omitted", PL, "const used = dimensions.filter((d) => Array.isArray(d.values) && d.values.length > 0);", "const used = dimensions;", "C1 · FIRING CONTROL"],
  ["S3", "C1 number 1 is labelled candidates only", PL, "possible: \"POSSIBLE COMBINATIONS — candidates only; not pages, not a plan, not a target, not a potential, not a page estimate\",", "possible: \"POSSIBLE PAGES\",", "C1 · FIRING CONTROL"],
  ["S4", "C2 no qualifying states are chosen by the planner", PL, "  if (!Array.isArray(qualifyingDemandStates)) return { label: LABELS.verified, ...nm(MISSING.qualifyingStates), excluded, undecided: null, opportunities: null };", "  if (!Array.isArray(qualifyingDemandStates)) qualifyingDemandStates = [\"STRONG\", \"MODERATE\", \"WEAK\", \"UNKNOWN\", \"MONITOR\"];", "C2 · FIRING CONTROL"],
  ["S5", "C2 an unrecorded limb leaves its candidate undecided", PL, "if (LIMBS.some((l) => met[l] !== true && met[l] !== false)) { undecided++; continue; }", "if (LIMBS.some((l) => met[l] !== true && met[l] !== false)) { continue; }", "C2 · an UNRECORDED limb"],
  ["S6", "C2 a limb recorded as not met excludes its candidate", PL, "if (failed) { excluded[failed]++; continue; }", "if (failed) { excluded[failed]++; }", "C2 · FIRING CONTROL"],
  ["S7", "C2 owned evidence is counted apart", PL, "if (r.demand.owned === true) owned++;", "if (false) owned++;", "C2 · an UNRECORDED limb"],
  ["S8", "C3 no grouping rule is chosen by the planner", PL, "  if (typeof groupOf !== \"function\") return { label: LABELS.needed, ...nm(MISSING.groupingRule) };", "  if (typeof groupOf !== \"function\") groupOf = (c) => JSON.stringify(c);", "C3 · FIRING CONTROL"],
  ["S9", "C3 coverage must be recorded", PL, "    if (a?.covered !== true && a?.covered !== false) return { label: LABELS.needed, ...nm(MISSING.coverage), groups: groups.length };", "", "C3 · FIRING CONTROL"],
  ["S10", "C3 groups, not combinations, become pages", PL, "const groups = [...new Set(verified.opportunities.map((c) => groupOf(c)))];", "const groups = verified.opportunities.map((c) => groupOf(c));", "C3 · FIRING CONTROL"],
  ["S11", "C3 a covered or valueless group is not a page", PL, "if (a.covered) covered++; else if (!a.uniqueValue) noValue++; else pages++;", "pages++;", "C3 · FIRING CONTROL"],
  ["S12", "C3 number 3 is never a number while number 2 is not", PL, "  if (!measured(verified.value)) return { label: LABELS.needed, ...nm(`number 2, which is itself NOT MEASURED — ${verified.missing}`) };", "  if (!measured(verified.value)) return { label: LABELS.needed, value: 0 };", "C3 · FIRING CONTROL"],
  ["S13", "C5 the order is NOT CHECKABLE with any NOT MEASURED", PL, "  if (![n1, n2, n3].every((n) => measured(n.value))) return { state: \"NOT CHECKABLE\", verdict: VERDICT.COULD_NOT_PROVE };", "", "C5 · FIRING CONTROL"],
  ["S14", "C5 a breached order is a defect", PL, "return n1.value >= n2.value && n2.value >= n3.value ? { state: \"HOLDS\", verdict: VERDICT.PROVED } : { state: \"BREACHED — a planner defect\", verdict: VERDICT.DISPROVED };", "return { state: \"HOLDS\", verdict: VERDICT.PROVED };", "C5 · FIRING CONTROL"],
  ["S15", "C6 NOT MEASURED is never printed as 0", PL, "export const formatNumber = (n) => (measured(n.value) ? `${n.label}: ${n.value}` : `${n.label}: NOT MEASURED — missing ${n.missing}`);", "export const formatNumber = (n) => `${n.label}: ${measured(n.value) ? n.value : 0}`;", "C6 · CONTROL"],
  ["S16", "C6 a plan with NOT MEASURED numbers never reads PROVED", PL, "  const verdict = order.verdict;", "  const verdict = VERDICT.PROVED;", "C6 · CONTROL"],
  ["S17", "C7 the planner names no product", PL, "const keyOf = (c) =>", `const PLANTED = "${PRODUCT_WORDS[0]}";\nconst keyOf = (c) =>`, "C7 · FIRING CONTROL"],
  ["S18", "C1 number 1 comes from the product's own declaration", RD, "values: [...(product.variants ?? [])]", "values: []", "REAL ·"],
  ["S19", "C1 data-only qualifier keys are excluded, never combined", RD, "const excludedDataKeys = [...dataKeys.keys()].filter((k) => !declaredKeys.has(k)).length;", "const excludedDataKeys = 0;", "REAL ·"],
  ["S20", "C4 the entry point says nothing is summed", BIN, "console.log(`  order 1 ≥ 2 ≥ 3: ${p.order.state} — never reordered; the three numbers are never summed and no page total or quota exists`);", "", "C4 · THE ENTRY POINT"],
  ["S21", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · the planner and its reader"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F91 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], reasons = "";
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
    reasons = [...new Set([...`${r.stdout}${r.stderr}`.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|Error)\b/gm)].map((m) => m[1]))].join("/") || "none";
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f91-sabotage-2026-10-01.txt"), lines.join("\n").split(PRODUCT_WORDS[0]).join("<planted product word>") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
