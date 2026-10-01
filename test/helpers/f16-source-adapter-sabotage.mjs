/**
 * 🔴 F16 · THE SOURCE-ADAPTER BOUNDARY · ONE SABOTAGE PER SAFEGUARD (RR-118 §7).
 *
 *   node test/helpers/f16-source-adapter-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f16-source-adapter-sabotage-rr119-run2-2026-10-01.txt (RR-119 run 2, after S29 span fix; run 1 file and the RR-118 file kept untouched).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SA = "src/research/source-adapter.mjs", BIN = "bin/source-intake.mjs", AD = "src/evidence/evidence-state-adapters.mjs", AU = "config/governance/authorisation.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f16-source-adapter.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "§4 an unverified term refuses the source", SA, "    else if (term?.status !== VERIFIED) refusals.push(`${t.toUpperCase()}_TERM_NOT_VERIFIED`);", "    else if (false) refusals.push(`${t.toUpperCase()}_TERM_NOT_VERIFIED`);", "§4 · FIRING CONTROL: a source is admitted only"],
  ["S2", "§4 a verified term needs a citation", SA, "    else if (!present(term.citation)) refusals.push(`${t.toUpperCase()}_TERM_HAS_NO_CITATION`);", "", "§4 · FIRING CONTROL: a source is admitted only"],
  ["S3", "§4 an unknown source kind is refused", SA, "  if (!Object.hasOwn(SOURCE_KINDS, decl?.kind)) refusals.push(\"SOURCE_KIND_UNKNOWN\");", "", "§4 · FIRING CONTROL: a source is admitted only"],
  ["S4", "§4 a refused source keeps nothing", SA, "  if (!admission.admitted) return { admitted: false, refusals: admission.refusals, retrieved: NOT_MEASURED, records: [], refused: {} };", "", "§4 · FIRING CONTROL: a source is admitted only"],
  ["S5", "§4 a missing field refuses the item", SA, "    if (missing.length) { refuse(`${missing[0].toUpperCase()}_ABSENT`); continue; }", "", "§4 · FIRING CONTROL: a missing required field"],
  ["S6", "§4 a snippet is never the author's wording", SA, "      if (item.wordingOrigin !== \"SOURCE_TEXT\") { refuse(\"SNIPPET_IS_NOT_THE_AUTHORS_WORDING\"); continue; }", "", "§4 · FIRING CONTROL: a missing required field"],
  ["S7", "§4 the topic is required", SA, "  if (!present(retrieval.topic)) head.push(\"TOPIC_ABSENT\");", "", "§4 · FIRING CONTROL: a missing required field"],
  ["S8", "§4 the coverage limits are required", SA, "  if (!present(retrieval.coverageLimits)) head.push(\"COVERAGE_LIMITS_ABSENT\");", "", "§4 · FIRING CONTROL: a missing required field"],
  ["S9", "§4 the client's declared origin is required", SA, "  if (!present(origin)) head.push(\"SUBJECT_HAS_NO_DECLARED_SITE_ORIGIN\");", "", "§4 · FIRING CONTROL: a missing required field"],
  ["S10", "§4 a time must be a time", SA, "    if (!ISO_TIME.test(item.observedAt)) { refuse(\"OBSERVEDAT_NOT_A_TIME\"); continue; }", "", "§4 · FIRING CONTROL: a missing required field"],
  ["S11", "§4 a keyword idea is never a question", SA, "    if (question) {", "    if (true) {", "§4 · FIRING CONTROL: a keyword idea"],
  ["S12", "§4 a keyword signal is INFERRED, never OBSERVED", AD, "  return place(rule, \"INFERRED\", { inputRefs: [`source:${h16(v.sourceId)}`], method: \"source-generated-keyword-idea\", computedAt: r.recorded_at });", "  return place(rule, \"OBSERVED\", { evidenceRef: `keyword_signal:${r.signal_id}`, sourceId: v.sourceId, observedAt: r.recorded_at });", "§4 · FIRING CONTROL: a keyword idea"],
  ["S13", "§5 an empty retrieval is EMPTY, never NOT MEASURED", SA, "  if (r.retrieved === 0) return [...lines, \"EMPTY SAMPLE", "  if (false) return [...lines, \"EMPTY SAMPLE", "§5 · FIRING CONTROL: an empty retrieval"],
  ["S14", "§5 no retrieval is NOT MEASURED, never 0", SA, "  if (!retrieval || !Array.isArray(retrieval.items)) return { admitted: true, refusals: [], retrieved: NOT_MEASURED, records: [], refused: {} };", "  if (!retrieval || !Array.isArray(retrieval.items)) return { admitted: true, refusals: [], retrieved: 0, records: [], refused: {} };", "§5 · FIRING CONTROL: an empty retrieval"],
  ["S15", "§5 every output says SAMPLE", SA, "  const lines = [`SAMPLE — not a census of the world's questions · declared limits:", "  const lines = [`RESULTS · declared limits:", "§5 · FIRING CONTROL: an empty retrieval"],
  ["S16", "§6 each record carries its own client's origin (the reader's partition)", BIN, "const origin = site?.reaches?.find((x) => x.resourceKind === \"SITE_ORIGIN\")?.resourceRef ?? null;", "const origin = \"https://shared-origin.invalid\";", "§6 · TWO UNRELATED PRODUCTS"],
  ["S17", "§6 another product's batch is refused at the gate", BIN, "RESOURCES.researchBatch(BATCH)", "RESOURCES.subject(SUBJECT)", "§6 · TWO UNRELATED PRODUCTS"],
  ["S18", "§6 questions and keyword signals go to separate stores", BIN, "[KEYWORD_SIGNAL, \"keyword-signals.jsonl\", \"APPEND_KEYWORD_SIGNALS\"]", "[KEYWORD_SIGNAL, \"questions.jsonl\", \"APPEND_KEYWORD_SIGNALS\"]", "§6 · TWO UNRELATED PRODUCTS"],
  ["S19", "§4 the production path refuses an unverified source", BIN, "if (!result.admitted) process.exit(3);", "", "§4 · THE PRODUCTION PATH REFUSES"],
  ["S20", "§5 a TEST_PILOT batch's output carries the marking", BIN, "if (declaredPurpose === \"TEST_PILOT\") console.log(", "if (false) console.log(", "§5 · FIRING CONTROL: a TEST_PILOT batch"],
  ["S21", "§5 an undeclared batch purpose is refused", BIN, "if (declaredPurpose !== null && !BATCH_PURPOSES.includes(declaredPurpose)) {", "if (false) {", "§5 · FIRING CONTROL: a TEST_PILOT batch"],
  ["S22", "§5 the marking is stamped into each record", SA, "attribution: item.attribution, dataPurpose };", "attribution: item.attribution, dataPurpose: null };", "§5 · FIRING CONTROL: a TEST_PILOT batch"],
  ["S23", "§7 KEPT only after a commit", BIN, "  if (governed.outcome !== \"COMMITTED\" && governed.outcome !== \"ALREADY_COMMITTED\") {", "  if (false) {", "§7 · FIRING CONTROL: when the governed commit FAILS"],
  ["S24", "§7 the governed actions are registered", AU, "    \"APPEND_SOURCE_QUESTIONS\", \"APPEND_KEYWORD_SIGNALS\",\n", "", "§6 · TWO UNRELATED PRODUCTS"],
  ["S25", "§4 the boundary names no product", SA, "export const SOURCE_KINDS = Object.freeze(", `export const PLANTED = "${PRODUCT_WORDS[0]}";\nexport const SOURCE_KINDS = Object.freeze(`, "§4 · FIRING CONTROL: the boundary names no product"],
  ["S26", "§4 the boundary names no provider", SA, "export const KEYWORD_SIGNAL = \"keyword_signal\";", "export const KEYWORD_SIGNAL = \"keyword_signal\";\nexport const UPSTREAM = \"stackexchange\";", "§4 · FIRING CONTROL: the boundary names no product"],
  ["S27", "§4 the boundary reaches no sealed store", SA, "import { RECORD_TYPE, NOT_MEASURED } from \"./public-questions.mjs\";", "import { RECORD_TYPE, NOT_MEASURED } from \"./public-questions.mjs\";\nimport \"../governance/sealed-store-roots.mjs\";", "§4 · FIRING CONTROL: the boundary reaches no sealed store"],
  ["S29", "§4 (RR-119) a restricted term refuses for its own reason", SA, "    if (term?.status === RESTRICTED) refusals.push(`${t.toUpperCase()}_TERM_RESTRICTED_BY_SOURCE`);\n    else if (term?.status !== VERIFIED)", "    if (term?.status !== VERIFIED)", "§4 · FIRING CONTROL (RR-119)"],
  ["S30", "§4 (RR-119) a verified term needs its snapshot date", SA, "    else if (!ISO_DATE.test(term.retrievedOn ?? \"\")) refusals.push(`${t.toUpperCase()}_TERM_HAS_NO_SNAPSHOT_DATE`);", "", "§4 · FIRING CONTROL (RR-119)"],
  ["S31", "§4 (RR-119) the production path refuses a restricted source", SA, "    if (term?.status === RESTRICTED) refusals.push(", "    if (false) refusals.push(", "§4 · THE PRODUCTION PATH REFUSES a source whose storage"],
  ["S28","§4 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "§4 · FIRING CONTROL: the boundary reaches no sealed store"],
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
  `F16 source-adapter sabotage run · ${new Date().toISOString()}`,
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
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f16-source-adapter-sabotage-rr119-run2-2026-10-01.txt"), lines.join("\n").split(PRODUCT_WORDS[0]).join("<planted product word>") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
