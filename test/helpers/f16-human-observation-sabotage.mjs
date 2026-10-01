/**
 * 🔴 F16 · THE HUMAN-OBSERVATION PATH · ONE SABOTAGE PER SAFEGUARD (RR-116 §8).
 *
 *   node test/helpers/f16-human-observation-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f16-human-observation-sabotage-2026-10-01.txt.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HO = "src/research/human-observation.mjs", AD = "src/evidence/evidence-state-adapters.mjs", BIN = "bin/observe-question.mjs", AU = "config/governance/authorisation.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f16-human-observation.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "§4 a missing required field refuses", HO, "refusals.push(`${f.toUpperCase()}_ABSENT`);", ";", "§4 · FIRING CONTROL"],
  ["S2", "§5 an unreviewable reference refuses an observation", HO, "  if (category === \"RESEARCHER_OBSERVATION\" && s.reference !== undefined && s.reference !== null && !reviewable(s.reference)) refusals.push(\"REFERENCE_NOT_REVIEWABLE\");", "", "§5 · FIRING CONTROL: a typed question"],
  ["S3", "§5 a link is reviewable only as an http(s) link", HO, "try { return /^https?:$/.test(new URL(ref).protocol); } catch { return false; }", "return true;", "§5 · FIRING CONTROL: a typed question"],
  ["S4", "§4 a time must be a time", HO, "for (const t of [\"observedAt\", \"recordedAt\"]) if (present(s[t]) && !ISO_TIME.test(s[t])) refusals.push(`${t.toUpperCase()}_NOT_A_TIME`);", "", "§4 · FIRING CONTROL"],
  ["S5", "§5 the observer is a role, never personal data", HO, "  if (present(s.observerRole) && PERSONAL.test(s.observerRole)) refusals.push(\"OBSERVER_ROLE_CARRIES_PERSONAL_DATA\");", "", "§5 · provenance"],
  ["S6", "§4 the wording is kept byte for byte", HO, "        original: s.wording,", "        original: s.wording.trim(),", "§4 · the original wording"],
  ["S7", "§4 an accepted record cannot be rewritten", HO, "      value: Object.freeze({", "      value: ({", "§4 · the original wording"],
  ["S8", "§5 the engine never claims to have seen it", HO, "engineObserved: false", "engineObserved: true", "§5 · provenance"],
  ["S9", "§6 a suggestion is INFERRED, never OBSERVED", HO, "INFERRED_SUGGESTION: \"INFERRED\" });", "INFERRED_SUGGESTION: \"OBSERVED\" });", "§6 · FIRING CONTROL"],
  ["S10", "§5 the STORE refuses an observed question with no reference", AD, "    if (!hasRef) return unmapped(\"an observed question with no reviewable reference is not evidence\", rule);", "", "§5 · FIRING CONTROL: the STORE"],
  ["S11", "§6 a client's claim is UNKNOWN, never evidence", AD, "\"UNKNOWN\", { checkId: `public_question:${r.question_id}`, insufficiency: \"FIRST_PARTY_CLAIM_NOT_EVIDENCE\" }", "\"OBSERVED\", { evidenceRef: `public_question:${r.question_id}`, sourceId: \"client\", observedAt: r.recorded_at }", "§6 · FIRING CONTROL"],
  ["S12", "§6 another subject's submission is never kept", BIN, "const accepted = results.filter((r, i) => r.accepted && submissions[i].subject === SUBJECT).map((r) => r.record);", "const accepted = results.filter((r) => r.accepted).map((r) => r.record);", "§6/§8 · PRODUCTION PATH"],
  ["S13", "§4 without --confirm nothing is written", BIN, "if (!permission.mayWrite) { console.log(\"  NOT WRITTEN — no --confirm: 0 records kept\"); process.exit(0); }", "", "§4 · without --confirm"],
  ["S14", "§6 each record carries ITS client's declared origin", BIN, "const origin = site?.reaches?.find((x) => x.resourceKind === \"SITE_ORIGIN\")?.resourceRef ?? null;", "const origin = \"https://shared-origin.invalid\";", "§6/§8 · PRODUCTION PATH"],
  ["S15", "§7 every output says SAMPLE", BIN, "  `SAMPLE — not a census of the world's questions · declared limits:", "  `RESULTS · declared limits:", "§6/§8 · PRODUCTION PATH"],
  ["S16", "§10 KEPT is printed only when the write committed", BIN, "if (governed.outcome !== \"COMMITTED\" && governed.outcome !== \"ALREADY_COMMITTED\") {", "if (false) {", "§6/§8 · PRODUCTION PATH"],
  ["S17", "§8 the governed action is registered (else the boundary refuses it)", AU, "    \"APPEND_HUMAN_OBSERVATIONS\",\n", "", "§6/§8 · PRODUCTION PATH"],
  ["S18", "§0 the path names no product", HO, "export const CATEGORIES = Object.freeze(", `export const PLANTED = "${PRODUCT_WORDS[0]}";\nexport const CATEGORIES = Object.freeze(`, "§0 · FIRING CONTROL"],
  ["S19", "§6 the path never reaches a sealed store", HO, "import { RECORD_TYPE, NOT_MEASURED } from \"./public-questions.mjs\";", "import { RECORD_TYPE, NOT_MEASURED } from \"./public-questions.mjs\";\nimport \"../governance/sealed-store-roots.mjs\";", "§6 · FIRING CONTROL: the validator"],
  ["S20", "§6 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "§6 · FIRING CONTROL: the validator"],
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
  `F16 human-observation sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f16-human-observation-sabotage-2026-10-01.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
