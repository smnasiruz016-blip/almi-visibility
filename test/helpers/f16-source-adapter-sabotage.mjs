/**
 * 🔴 F16 · THE SOURCE-ADAPTER BOUNDARY · ONE SABOTAGE PER SAFEGUARD (RR-118 §7).
 *
 *   node test/helpers/f16-source-adapter-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f16-source-adapter-sabotage-rr125-2026-10-01.txt (RR-125 rerun after S27 followed its live line; every earlier round file is kept untouched).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SA = "src/research/source-adapter.mjs", BIN = "bin/source-intake.mjs", AD = "src/evidence/evidence-state-adapters.mjs", AU = "config/governance/authorisation.mjs", CP = "tools/need-coverage-call-paths.mjs";
const QA = "src/research/adapters/stack-exchange.mjs", GOV = "src/research/request-governor.mjs", COL = "src/research/adapters/stack-exchange-collector.mjs";
const T = ["test/f16-source-adapter.test.mjs", "test/f16-qa-network-adapter.test.mjs", "test/f16-collector.test.mjs"];
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
  ["S13", "§5 an empty retrieval is EMPTY, never NOT MEASURED", SA, "  if (r.retrieved === 0) return guardScope(r, [...lines, ...scope, \"EMPTY SAMPLE", "  if (false) return guardScope(r, [...lines, ...scope, \"EMPTY SAMPLE", "§5 · FIRING CONTROL: an empty retrieval"],
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
  ["S27", "§4 the boundary reaches no sealed store", SA, "import { RECORD_TYPE, NOT_MEASURED, OBSERVER_TYPES } from \"./public-questions.mjs\";", "import { RECORD_TYPE, NOT_MEASURED, OBSERVER_TYPES } from \"./public-questions.mjs\";\nimport \"../governance/sealed-store-roots.mjs\";", "§4 · FIRING CONTROL: the boundary reaches no sealed store"],
  ["S29", "§4 (RR-119) a restricted term refuses for its own reason", SA, "    if (term?.status === RESTRICTED) refusals.push(`${t.toUpperCase()}_TERM_RESTRICTED_BY_SOURCE`);\n    else if (term?.status !== VERIFIED)", "    if (term?.status !== VERIFIED)", "§4 · FIRING CONTROL (RR-119)"],
  ["S30", "§4 (RR-119) a verified term needs its snapshot date", SA, "    else if (!ISO_DATE.test(term.retrievedOn ?? \"\")) refusals.push(`${t.toUpperCase()}_TERM_HAS_NO_SNAPSHOT_DATE`);", "", "§4 · FIRING CONTROL (RR-119)"],
  ["S31", "§4 (RR-119) the production path refuses a restricted source", SA, "    if (term?.status === RESTRICTED) refusals.push(", "    if (false) refusals.push(", "§4 · THE PRODUCTION PATH REFUSES a source whose storage"],
  ["S32", "§3 a licence version outside the declared set is refused", SA, "    if (Array.isArray(decl.licenceVersions) && !decl.licenceVersions.includes(item.licenceVersion)) {", "    if (false) {", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S33", "§3 the date cross-check compares the OLDER date", QA, "  const t = Math.min(createdEpoch, editedEpoch);", "  const t = Math.max(createdEpoch, editedEpoch);", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S34", "§3 the date cross-check keeps the 2.5 boundary", QA, "  if (t < DAY(\"2011-04-08\")) return \"2.5\";", "", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S35", "§3 (RR-121) a missing creator is refused by name, never defaulted", QA, "    if (!creator) { refuse(\"CREATOR_ABSENT\"); continue; }", "", "§3 · FIRING CONTROL: a missing creator, link or title"],
  ["S48", "§3 (RR-121) an absent licence field is refused, not inferred", QA, "    if (str(p.content_license) === null) { refuse(\"CONTENT_LICENSE_ABSENT\"); continue; }", "", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S49", "§3 (RR-121) an unrecognised licence value is refused", QA, "    if (stated === null) { refuse(\"CONTENT_LICENSE_UNRECOGNISED\"); continue; }", "", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S50", "§3 (RR-121) the STATED licence governs, never the date", QA, "      licenceName: \"CC BY-SA\", licenceVersion: stated,", "      licenceName: \"CC BY-SA\", licenceVersion: licenceVersionByDate(p.creation_date, edited),", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S51", "§3 (RR-121) a date disagreement is counted", QA, "    if (licenceVersionByDate(p.creation_date, edited) !== stated) note(", "    if (false) note(", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S52", "§3 (RR-121) a cross-check is reported, not hidden", SA, "    ...(Object.keys(r.notes ?? {}).length ? [", "    ...(false ? [", "§3 · FIRING CONTROL (RR-121): the response's STATED licence"],
  ["S53", "§3 (RR-121) a missing title is refused by name", QA, "    if (!title) { refuse(\"TITLE_ABSENT\"); continue; }", "", "§3 · FIRING CONTROL: a missing creator, link or title"],
  ["S54", "§3 (RR-121) a missing link is refused by name", QA, "    if (!link) { refuse(\"POST_LINK_ABSENT\"); continue; }", "", "§3 · FIRING CONTROL: a missing creator, link or title"],
  ["S55", "§4 (RR-121) the run's cap stops the collector", GOV, "      if (sent >= cap) return refuse(\"REQUEST_CAP_REACHED\");", "", "§4 · FIRING CONTROL: the run's own CAP"],
  ["S56", "§4 (RR-121) no quota left stops the collector", GOV, "      if (quotaRemaining !== null && quotaRemaining <= 0) return refuse(\"QUOTA_EXHAUSTED\");", "", "§4 · FIRING CONTROL: the QUOTA stops"],
  ["S57", "§4 (RR-121) a backoff in force stops the method", GOV, "      if (backoffUntil.has(method) && clock() < backoffUntil.get(method)) return refuse(\"BACKOFF_IN_FORCE\");", "", "§4 · FIRING CONTROL: BACKOFF is obeyed"],
  ["S58", "§4 (RR-121) an identical request within the window is refused", GOV, "      if (lastSent.has(id) && clock() - lastSent.get(id) < dedupeWindowSeconds) return refuse(\"IDENTICAL_REQUEST_WITHIN_WINDOW\");", "", "§4 · FIRING CONTROL: a semantically identical request"],
  ["S59", "§4 (RR-121) a returned backoff is recorded", GOV, "      if (Number.isInteger(response?.backoff) && response.backoff > 0) backoffUntil.set(", "      if (false) backoffUntil.set(", "§4 · FIRING CONTROL: BACKOFF is obeyed"],
  ["S60", "§4 (RR-121) a returned quota is recorded", GOV, "      if (Number.isInteger(response?.quota_remaining)) quotaRemaining = ", "      if (false) quotaRemaining = ", "§4 · FIRING CONTROL: the QUOTA stops"],
  ["S61", "§4 (RR-121) a credential never makes a request different", GOV, ".filter((k) => !CREDENTIAL_PARAMS.has(k))", ".filter(() => true)", "§4 · FIRING CONTROL: a semantically identical request"],
  ["S62", "§4 (RR-121) a refused recheck keeps no recheck", COL, "  if (again.refused) return { recorded, recheck: null,", "  if (false) return { recorded, recheck: null,", "§4 · the collector makes exactly one search"],
  ["S63", "§4 (RR-121) an empty search is not rechecked", COL, "  if (ids.length === 0) return {", "  if (false) return {", "§4 · the collector makes exactly one search"],
  ["S64", "§4 (RR-121) the backoff window is per method", GOV, "backoffUntil.has(method) && clock() < backoffUntil.get(method)", "backoffUntil.size > 0 && clock() < Math.max(...backoffUntil.values())", "§4 · FIRING CONTROL: BACKOFF is obeyed"],
  ["S36", "§5 (RR-120) a deleted post is refused as deleted", QA, "    if (!now) { refuse(\"POST_DELETED_SINCE_RETRIEVAL\"); continue; }", "", "§5 · FIRING CONTROL: a post deleted or changed"],
  ["S37", "§5 (RR-120) a changed post is refused", QA, "    if (now?.title !== p.title || nowEdited !== edited) {", "    if (false) {", "§5 · FIRING CONTROL: a post deleted or changed"],
  ["S38", "§5 (RR-120) a changed version alone is a change", QA, "now?.title !== p.title || nowEdited !== edited)", "now?.title !== p.title)", "§5 · FIRING CONTROL: a post deleted or changed"],
  ["S39", "§5 (RR-120) no recheck keeps nothing", QA, "    if (!recheck) { refuse(\"CURRENCY_NOT_RECHECKED\"); continue; }", "", "§5 · FIRING CONTROL: a post deleted or changed"],
  ["S40", "§4 (RR-120) only mapped fields leave the adapter", QA, "    items.push({\n", "    items.push({ body: p.body,\n", "§4 · FIRING CONTROL: only the mapped fields"],
  ["S41", "§4 (RR-120) only declared fields enter the record", SA, "        value: Object.freeze({ ...shared, kind: \"OBSERVED\",", "        value: Object.freeze({ ...item, ...shared, kind: \"OBSERVED\",", "§4 · FIRING CONTROL: only the mapped fields"],
  ["S42", "§6 (RR-120) an overclaimed coverage throws", SA, "  if (over.length) throw Object.assign(", "  if (false) throw Object.assign(", "§6 · FIRING CONTROL: every output carries the scope disclaimer"],
  ["S43", "§6 (RR-120) every output carries the disclaimer", SA, "stored beside each record (not printed — count-only)\", SCOPE_DISCLAIMER];", "stored beside each record (not printed — count-only)\"];", "§6 · FIRING CONTROL: every output carries the scope disclaimer"],
  ["S44", "§5 (RR-120) adapter refusals stay in the denominator", SA, "  const total = retrieval.items.length + Object.values(before).reduce((a, n) => a + n, 0);", "  const total = retrieval.items.length;", "§5 · FIRING CONTROL: a post deleted or changed"],
  ["S45", "§5 (RR-120) adapter refusals are counted by rule", SA, "  const records = [], refused = { ...before };", "  const records = [], refused = {};", "§5 · FIRING CONTROL: a post deleted or changed"],
  ["S46", "§5 (RR-120) an unknown adapter is refused", BIN, "if (ADAPTER && !Object.hasOwn(ADAPTERS, ADAPTER)) {", "if (false) {", "§5 · TWO UNRELATED PRODUCTS, ONE CODE PATH, THE PRODUCTION ENTRY POINT"],
  ["S47", "§4 (RR-120) the adapter names no product", QA, "export const LICENCE_URL = ", `export const PLANTED = "${PRODUCT_WORDS[0]}";\nexport const LICENCE_URL = `, "§4 · FIRING CONTROL: the adapter names no product"],
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
writeFileSync(join(REPO, "runs", "audit", "f16-source-adapter-sabotage-rr125-2026-10-01.txt"), lines.join("\n").split(PRODUCT_WORDS[0]).join("<planted product word>") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
