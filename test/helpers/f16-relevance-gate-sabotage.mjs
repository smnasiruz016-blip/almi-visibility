/**
 * 🔴 F16 · THE RELEVANCE GATE · ONE SABOTAGE PER SAFEGUARD (RR-126).
 *
 *   node test/helpers/f16-relevance-gate-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span must exist EXACTLY ONCE in the code live now. Each sabotage replaces its span ALONE, proves it LANDED, runs
 * the proof files, requires the NAMED test to fail, and restores by raw-byte sha256; a SyntaxError red is a harness fault, never a proof.
 * The production trail is hashed before and after.
 * Evidence: runs/audit/f16-relevance-gate-sabotage-rr126-run2-2026-10-01.txt (run 2, after R14 was pointed at the test that pins the literal; run 1 kept).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SA = "src/research/source-adapter.mjs", BIN = "bin/source-intake.mjs", COL = "src/research/adapters/stack-exchange-collector.mjs";
const T = ["test/f16-relevance-gate.test.mjs", "test/f16-collector.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const PROFILE = "§3 · FIRING CONTROL: the gate needs the subject's OWN declared profile", ORDER = "§3 · FIRING CONTROL: one rule per item, in order";
const THREE = "§3 · THREE ITEMS THROUGH THE REAL INTAKE", NEUTRAL = "§3 · FIRING CONTROL: the core names no subject", COLLECT = "§4 · the collector makes exactly one search";

const SABOTAGES = [
  ["R1", "an exclusion beats a confirmation", SA, "  const x = hit(p.excludes); if (x >= 0) return { verdict: \"UNRELATED\", rule: `excludes[${x}]` };\n", "", ORDER],
  ["R2", "a confirming rule makes an item relevant", SA, "  const c = hit(p.confirms); if (c >= 0) return", "  const c = hit(p.confirms); if (false) return", ORDER],
  ["R3", "a bare abbreviation is AMBIGUOUS", SA, "  const a = hit(p.ambiguous); if (a >= 0) return", "  const a = hit(p.ambiguous); if (false) return", ORDER],
  ["R4", "an ambiguous item is kept out by its own name", SA, "    if (rel.verdict === \"AMBIGUOUS\") { refuse(\"RELEVANCE_AMBIGUOUS_KEPT_OUT\"); continue; }\n", "", THREE],
  ["R5", "an unrelated item is refused", SA, "    if (rel.verdict !== \"RELEVANT\") { refuse(\"NOT_ABOUT_THE_DECLARED_SUBJECT\"); continue; }\n", "", THREE],
  ["R6", "no profile, no entry", SA, "  if (!profile || typeof profile !== \"object\") return { refusal: \"RELEVANCE_PROFILE_UNDECLARED\" };", "  if (!profile || typeof profile !== \"object\") return { refusal: null, id: null, confirms: [/./], ambiguous: [], excludes: [] };", PROFILE],
  ["R7", "another subject's profile is refused", SA, "  if (profile.subject !== subject) return { refusal: \"RELEVANCE_PROFILE_IS_ANOTHER_SUBJECTS\" };\n", "", PROFILE],
  ["R8", "a profile must confirm something", SA, "  if (!Array.isArray(profile.confirms) || profile.confirms.length === 0) return { refusal: \"RELEVANCE_PROFILE_HAS_NO_CONFIRMING_RULE\" };\n", "", PROFILE],
  ["R9", "a broken pattern refuses, never passes", SA, "  } catch { return { refusal: \"RELEVANCE_PATTERN_INVALID\" }; }", "  } catch { return { refusal: null, id: null, confirms: [], ambiguous: [], excludes: [] }; }", PROFILE],
  ["R10", "a profile refusal stops the retrieval", SA, "  if (profile.refusal) head.push(profile.refusal);", "  if (profile.refusal) { /* sabotaged */ }", PROFILE],
  ["R11", "the record names the rule that decided it", SA, "attribution: item.attribution, dataPurpose, relevance: relevanceRecord };", "attribution: item.attribution, dataPurpose, relevance: { ...relevanceRecord, rule: null } };", THREE],
  ["R12", "relevance is judged on the item's own text", SA, "    const rel = relevanceOf(question ? item.wording : item.idea, profile);", "    const rel = relevanceOf(\"an OET writing exam question\", profile);", THREE],
  ["R13", "the entry point hands the declared profile to the gate", BIN, "dataPurpose: declaredPurpose, relevance });", "dataPurpose: declaredPurpose, relevance: null });", THREE],
  ["R14", "the collector uses the full-text method", COL, "export const SEARCH = \"/2.3/search/advanced\",", "export const SEARCH = \"/2.3/search\",", "§4 · the documented numbers are the governor's numbers"],
  ["R15", "the collector sends q, not the old parameters", COL, "  const params = { site, q, pagesize, page: 1, filter: \"default\" };", "  const params = { site, intitle: q, pagesize, page: 1, filter: \"default\" };", COLLECT],
  ["R16", "the core carries no subject's rule", SA, "export const KEYWORD_SIGNAL = \"keyword_signal\";", "export const KEYWORD_SIGNAL = \"keyword_signal\";\nconst SUBJECT_RULE = \"OET\";", NEUTRAL],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F16 relevance-gate sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
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
  const ok = landed && red && restored && !/SyntaxError/.test(reasons);
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f16-relevance-gate-sabotage-rr126-run2-2026-10-01.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
