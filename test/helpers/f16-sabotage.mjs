/**
 * 🔴 F16 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 944f769 EVIDENCE; RR-114 §11).
 *
 *   node test/helpers/f16-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f16-sabotage-2026-10-01.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PQ = "src/research/public-questions.mjs", RD = "src/research/public-questions-reader.mjs", BIN = "bin/public-questions.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f16-public-questions.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 the path never reaches a sealed store", RD, "import { RECORD_TYPE } from \"./public-questions.mjs\";", "import { RECORD_TYPE } from \"./public-questions.mjs\";\nimport \"../governance/sealed-store-roots.mjs\";", "C1 · FIRING CONTROL: the intake path"],
  ["S2", "C1 the reader asks for the RESEARCH store only", RD, "const store = lookupStore(rootIndexFor(env), \"RESEARCH\");", "const store = lookupStore(rootIndexFor(env), \"OBSERVATIONS\");", "C1 · FIRING CONTROL: the intake path"],
  ["S3", "C1 only the client's partition is read", RD, "records.push(...part.records.filter((r) => r.record_type === RECORD_TYPE));", "records.push(...all.filter((r) => r.record_type === RECORD_TYPE));", "C1 · FIRING CONTROL: the production reader"],
  ["S4", "C1 nothing is read until a batch is named", BIN, "  process.exit(2);", "", "C1 · THE ENTRY POINT"],
  ["S5", "C2 a field not captured is NOT MEASURED", PQ, "REQUIRED_FIELDS.map((f) => [f, filled(v[f]) ? v[f] : NOT_MEASURED])", "REQUIRED_FIELDS.map((f) => [f, v[f] ?? \"\"])", "C2 · FIRING CONTROL"],
  ["S6", "C2 an empty object is not a captured field", PQ, "!(typeof v === \"object\" && Object.keys(v).length === 0)", "true", "C2 · FIRING CONTROL"],
  ["S7", "C3 the three kinds stay in three lists", PQ, "[k, all.filter((q) => q.kind === k)]", "[k, all]", "C3 · FIRING CONTROL"],
  ["S8", "C3 a client claim is not evidence", PQ, "CLIENT_CLAIM: \"NOT EVIDENCE — the client's own first-party statement (RR-89 §1.2)\",", "CLIENT_CLAIM: \"OBSERVED — reported by the client\",", "C3 · FIRING CONTROL"],
  ["S9", "C3 a client claim never outranks an observation", PQ, "  if (a.kind === KINDS.CLIENT_CLAIM && b.kind === KINDS.OBSERVED) return false;", "  if (a.kind === KINDS.CLIENT_CLAIM && b.kind === KINDS.OBSERVED) return true;", "C3 · FIRING CONTROL"],
  ["S10", "C3 a question with no recorded kind DISPROVES", PQ, "population === 0 ? VERDICT.COULD_NOT_PROVE : malformed > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE;", "population === 0 ? VERDICT.COULD_NOT_PROVE : VERDICT.COULD_NOT_PROVE;", "C3 · FIRING CONTROL"],
  ["S11", "C4 no sameness rule is picked", PQ, "  if (typeof sameAs !== \"function\") return { grouped: false, missing: MISSING.sameness, groups: questions.map((q) => Object.freeze([q.id])) };", "  if (typeof sameAs !== \"function\") sameAs = (x, y) => x.original.wording.toLowerCase() === y.original.wording.toLowerCase();", "C4 · FIRING CONTROL"],
  ["S12", "C4 an original is frozen", PQ, "original: Object.freeze({ wording: v.original, provenance: Object.freeze({ ...(v.provenance ?? {}) }) }),", "original: { wording: v.original, provenance: { ...(v.provenance ?? {}) } },", "C4 · FIRING CONTROL"],
  ["S13", "C4 grouping keeps every original", PQ, "    if (g) g.push(q.id); else groups.push([q.id]);", "    if (!g) groups.push([q.id]);", "C4 · FIRING CONTROL"],
  ["S14", "C5 every report says SAMPLE with its limits", PQ, "    `SAMPLE — not a census of the world's questions · declared limits: ${limits}`,", "    `RESULTS`,", "C5 · FIRING CONTROL"],
  ["S15", "C5 a completeness claim is refused", PQ, "  if (bad) throw new Error(\"COMPLETENESS_CLAIM_IN_OUTPUT: a report line claims more than a sample\");", "", "C5 · FIRING CONTROL"],
  ["S16", "C6 a recorded wording never reaches a report", PQ, "  if (lines.some((l) => wordings.some((w) => l.includes(w)))) throw new Error(\"QUESTION_WORDING_IN_OUTPUT: a report is count-only\");", "", "C6 · FIRING CONTROL"],
  ["S17", "C6 no answer travels through intake", PQ, "    original: Object.freeze({ wording: v.original,", "    answer: v.answer,\n    original: Object.freeze({ wording: v.original,", "C6 · FIRING CONTROL"],
  ["S18", "C7 the census parts are NOT MEASURED", PQ, "    census: Object.fromEntries(CENSUS_PARTS.map((p) => [p, NOT_MEASURED])),", "    census: Object.fromEntries(CENSUS_PARTS.map((p) => [p, 0])),", "C7 · the census parts"],
  ["S19", "C7 an empty sample is never PROVED", PQ, "const verdict = population === 0 ? VERDICT.COULD_NOT_PROVE :", "const verdict = population === 0 ? VERDICT.PROVED :", "C7 · the census parts"],
  ["S20", "C7 the path names no product", PQ, "export const RECORD_TYPE = \"public_question\";", `export const RECORD_TYPE = "public_question";\nexport const PLANTED = "${PRODUCT_WORDS[0]}";`, "C7 · FIRING CONTROL"],
  ["S21", "C1 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C1 · the intake path loads no module"],
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
  `F16 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f16-sabotage-2026-10-01.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
