/**
 * 🔴 F91 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 2048dd3 EVIDENCE; RR-113 §6) — spans moved to the live code for Amendment 1
 * (_handoffs 4ef1b9c, RR-130 §6). The RR-113 run's evidence file stays untouched; this run writes its own.
 *
 *   node test/helpers/f91-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f91-sabotage-rr130-2026-10-02.txt (the 2026-10-01 file is the RR-113 run, kept).
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
  ["S1", "C1 several dimensions are never multiplied blindly", PL, "  } else missing = MISSING.combinationRule;", "  } else candidates = used.reduce((acc, d) => acc.flatMap((c) => d.values.map((v) => ({ ...c, [d.key]: v }))), [{}]);", "C1 · FIRING CONTROL"],
  ["S2", "C1 a candidate universe never enters the arithmetic", PL, "    if (why) excluded.push({ key: d.key, why }); else used.push(d);", "    if (why && d.applicability !== APPLICABILITY.CANDIDATE_UNIVERSE) excluded.push({ key: d.key, why }); else used.push(d);", "C1 · FIRING CONTROL"],
  ["S3", "C1 a dimension with no recorded source is excluded", PL, "          : !(typeof d.source === \"string\" && d.source.trim() !== \"\") ? \"no recorded source\"", "          : false ? \"no recorded source\"", "C1 · FIRING CONTROL"],
  ["S4", "C1 a declared combination counts only over applying dimensions' declared values, once", PL, "    candidates = [...new Map(declaredCombinations.filter(ok).map((c) => [candidateKey(c), c])).values()];", "    candidates = declaredCombinations;", "C1 · FIRING CONTROL"],
  ["S5", "C1 number 1 is labelled candidates only", PL, "  possible: \"POSSIBLE COMBINATIONS — candidates only; not pages, not a plan, not a target, not a potential, not a page estimate\",", "  possible: \"POSSIBLE PAGES\",", "C1 · FIRING CONTROL"],
  ["S6", "C2 an INFERRED suggestion never qualifies", PL, "  INFERRED: Object.freeze({ qualifies: false,", "  INFERRED: Object.freeze({ qualifies: true,", "C2 · FIRING CONTROL: the demand mapping"],
  ["S7", "C2 a state no contract decides stays UNKNOWN", PL, "  if (rules.length === 0 || rules.some((r) => r === null)) return undefined;", "  if (rules.length === 0) return undefined;", "C2 · FIRING CONTROL: the demand mapping"],
  ["S8", "C2 an empty sample is UNKNOWN, never no demand", PL, "  if (rules.length === 0 || rules.some((r) => r === null)) return undefined;", "  if (rules.some((r) => r === null)) return undefined;", "C2 · FIRING CONTROL: the demand mapping"],
  ["S9", "C2 one UNKNOWN candidate makes number 2 NOT MEASURED", PL, "  if (unknown > 0) return { ...base, ...nm(", "  if (false) return { ...base, ...nm(", "C2 · FIRING CONTROL: every limb"],
  ["S10", "C2 a limb recorded as not met excludes its candidate", PL, "    if (failed) { excluded[failed] += 1; continue; }", "    if (failed) { excluded[failed] += 1; }", "C2 · FIRING CONTROL: every limb"],
  ["S11", "C2 the four kinds of demand evidence are counted apart", PL, "    for (const i of r?.demand ?? []) kinds[DEMAND_RULES[i?.state]?.kind ?? \"unknownStates\"] += 1;", "    for (const i of r?.demand ?? []) kinds.observedQuestions += 1;", "C2 · FIRING CONTROL: every limb"],
  ["S12", "C3 number 3 is never a number while number 2 is not", PL, "  if (!measured(verified.value)) return { label: LABELS.needed, ...nm(`number 2, which is itself NOT MEASURED — ${verified.missing}`) };", "  if (!measured(verified.value)) return { label: LABELS.needed, value: 0 };", "C3 · FIRING CONTROL: COVERED"],
  ["S13", "C3 merging is identity after the stated normalisation, never similarity", PL, "export const normaliseWording = (s) => String(s ?? \"\").toLowerCase().replace(/\\s+/g, \" \").trim().replace(/[\\s.?!,;:]+$/u, \"\");", "export const normaliseWording = (s) => String(s ?? \"\").toLowerCase().trim().split(/\\W+/).slice(0, 2).join(\" \");", "C3 · FIRING CONTROL: identical wording"],
  ["S14", "C3 different combinations never merge without a recorded judgement", PL, "    const ck = `c:${candidateKey(c)}`;", "    const ck = \"c:one\";", "C3 · FIRING CONTROL: identical wording"],
  ["S15", "C3 a judgement naming an unknown question is ignored, not applied", PL, "    if (qOwner.has(a) && qOwner.has(b)) {", "    if (true) {", "C3 · FIRING CONTROL: identical wording"],
  ["S16", "C3 a COVERED group is never a new page", PL, "    if (g.coverage === \"COVERED\") { out.covered += 1; continue; }", "    if (g.coverage === \"COVERED\") { out.new += 1; continue; }", "C3 · FIRING CONTROL: COVERED"],
  ["S17", "C3 coverage that cannot be decided HOLDS the group", PL, "    if (g.coverage !== \"NOT_COVERED\") { hold(\"coverage\"); continue; }", "    if (g.coverage !== \"NOT_COVERED\" && g.coverage !== \"CANNOT_DECIDE\") { hold(\"coverage\"); continue; }", "C3 · FIRING CONTROL: COVERED"],
  ["S18", "C3 a group F32 records without unique value is refused", PL, "    if (g.rightToExist === \"REFUSED\" || g.uniqueValue === false) { out.refused += 1; continue; }", "    if (g.rightToExist === \"REFUSED\") { out.refused += 1; continue; }", "C3 · FIRING CONTROL: COVERED"],
  ["S19", "C3 no verified facts HOLDS the group", PL, "    if (g.verifiedFacts !== true) { hold(\"facts\"); continue; }", "", "C3 · FIRING CONTROL: COVERED"],
  ["S20", "C3 no sourced verified answer HOLDS the group", PL, "    if (g.verifiedAnswer !== true) { hold(\"answer\"); continue; }", "", "C3 · FIRING CONTROL: COVERED"],
  ["S21", "C5 the order is NOT CHECKABLE with any NOT MEASURED", PL, "  if (![n1, n2, n3].every((n) => measured(n.value))) return { state: \"NOT CHECKABLE\", verdict: VERDICT.COULD_NOT_PROVE };", "", "C5 · FIRING CONTROL"],
  ["S22", "C5 a breached order is a defect", PL, "return n1.value >= n2.value && n2.value >= n3.value ? { state: \"HOLDS\", verdict: VERDICT.PROVED } : { state: \"BREACHED — a planner defect\", verdict: VERDICT.DISPROVED };", "return { state: \"HOLDS\", verdict: VERDICT.PROVED };", "C5 · FIRING CONTROL"],
  ["S23", "C6 NOT MEASURED is never printed as 0", PL, "export const formatNumber = (n) => (measured(n.value) ? `${n.label}: ${n.value}` : `${n.label}: NOT MEASURED — missing ${n.missing}`);", "export const formatNumber = (n) => `${n.label}: ${measured(n.value) ? n.value : 0}`;", "C6 · CONTROL"],
  ["S24", "C7 the planner names no product", PL, "export const candidateKey = (c) =>", `const PLANTED = "${PRODUCT_WORDS[0]}";\nexport const candidateKey = (c) =>`, "C7 · FIRING CONTROL: the planner names"],
  ["S25", "C7 the planner names no dimension", PL, "export const candidateKey = (c) =>", "const PLANTED_DIM = \"profession\";\nexport const candidateKey = (c) =>", "C7 · FIRING CONTROL: the planner names"],
  ["S26", "C7 the planner carries no page quota", PL, "export const candidateKey = (c) =>", "const MAX_PAGES = 50;\nexport const candidateKey = (c) =>", "C7 · FIRING CONTROL: the planner names"],
  ["S27", "C1 number 1 comes from the product's own declaration", RD, "values: [...(product.variants ?? [])], source:", "values: [], source:", "REAL ·"],
  ["S28", "C1 data-only qualifier keys are excluded, never combined", RD, "excludedDataKeys: [...dataKeys.keys()].filter((k) => !declaredKeys.has(k)).length,", "excludedDataKeys: 0,", "REAL ·"],
  ["S29", "C7 a malformed planning record is counted, never read", RD, "    } else malformed += 1;", "    }", "C7 · the reader shapes"],
  ["S30", "C4 the entry point says nothing is summed", BIN, "console.log(`  order 1 ≥ 2 ≥ 3: ${p.order.state} — never reordered; the three numbers are never summed and no page total or quota exists`);", "", "C4 · THE ENTRY POINT"],
  ["S31", "C8 the entry point prints the sample bound", BIN, "console.log(`  bound: ${p.notice}`);", "", "C4 · THE ENTRY POINT"],
  ["S35", "C6 an unread planning store prints its demand kinds NOT MEASURED, never zeros", BIN, "${i.planningRecords > 0 ? fmt(p.verified.kinds) :", "${true ? fmt(p.verified.kinds) :", "C4 · THE ENTRY POINT"],
  ["S32", "C8 no complete sample and no ranking are claimed", PL, "export const SAMPLE_NOTICE = \"a recorded SAMPLE, never every question asked; no ranking, indexing or AI citation is promised\";", "export const SAMPLE_NOTICE = \"the questions\";", "C8 ·"],
  ["S33", "C8 the planner writes nothing", PL, "export const NOT_MEASURED = \"NOT MEASURED\";", "import { writeFileSync } from \"node:fs\";\nexport const NOT_MEASURED = \"NOT MEASURED\";", "C8 ·"],
  ["S34", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · the planner and its reader"],
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
writeFileSync(join(REPO, "runs", "audit", "f91-sabotage-rr130-2026-10-02.txt"), lines.join("\n").split(PRODUCT_WORDS[0]).join("<planted product word>") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
