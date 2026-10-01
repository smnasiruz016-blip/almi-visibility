/**
 * 🔴 F44 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs eecdfe4 EVIDENCE; RR-113 §9).
 *
 *   node test/helpers/f44-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f44-sabotage-2026-10-01.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FS = "src/facts/fact-supply.mjs", RD = "src/facts/fact-supply-reader.mjs", BIN = "bin/fact-supply.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f44-fact-supply.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C2 a missing qualifier key makes the claim ABSENT", FS, "&& r?.claim !== null && typeof r?.claim === \"object\" && Object.hasOwn(r.claim, \"qualifier\"),", ",", "C2 · a qualifier recorded as null"],
  ["S2", "C2 a null qualifier is the schema's 'no qualifier', present", FS, "Object.hasOwn(r.claim, \"qualifier\"),", "r.claim.qualifier !== null && r.claim.qualifier !== undefined,", "C2 · a qualifier recorded as null"],
  ["S3", "C2 value is read at its path", FS, "  value: (r) => r?.value !== null && typeof r?.value === \"object\" && r.value.value !== undefined,", "  value: (r) => true,", "C2 · FIRING CONTROL"],
  ["S4", "C2 scope is read at its path", FS, "  scope: (r) => text(r?.scope) || (r?.scope !== null && typeof r?.scope === \"object\"),", "  scope: (r) => true,", "C2 · FIRING CONTROL"],
  ["S5", "C2 source is read at its path", FS, "  source: (r) => text(r?.source?.url),", "  source: (r) => true,", "C2 · FIRING CONTROL"],
  ["S6", "C2 tier is read at its path", FS, "  tier: (r) => r?.source?.tier !== undefined && r?.source?.tier !== null,", "  tier: (r) => true,", "C2 · FIRING CONTROL"],
  ["S7", "C2 checker is read at its path", FS, "  checker: (r) => text(r?.verification?.checkedBy),", "  checker: (r) => true,", "C2 · FIRING CONTROL"],
  ["S8", "C2 check date is read at its path", FS, "  date: (r) => typeof r?.verification?.checkedOn === \"string\" && /^\\d{4}-\\d{2}-\\d{2}/.test(r.verification.checkedOn),", "  date: (r) => true,", "C2 · FIRING CONTROL"],
  ["S9", "C2 freshness needs its rule AND its days", FS, "  freshness: (r) => text(r?.freshness?.rule) && Number.isInteger(r?.freshness?.days),", "  freshness: (r) => text(r?.freshness?.rule),", "C2 · FIRING CONTROL"],
  ["S10", "C2 provenance is read at its path", FS, "  provenance: (r) => text(r?.provenance?.route),", "  provenance: (r) => true,", "C2 · FIRING CONTROL"],
  ["S11", "C1 an empty population is never PROVED", FS, "(n === 0 ? VERDICT.COULD_NOT_PROVE : absent > 0", "(absent > 0", "C1 · records the registry declares derived"],
  ["S12", "C1 derived records are counted apart", FS, "  const primary = primaryFacts(records);", "  const primary = records;", "C1 · records the registry declares derived"],
  ["S13", "C3 a unit is never judged", FS, "const unit = { byValueType: unitByType, denominator: n, missing: MISSING.unitRule, verdict: VERDICT.COULD_NOT_PROVE };", "const unit = { byValueType: unitByType, denominator: n, missing: MISSING.unitRule, verdict: Object.values(unitByType).some((c) => c[\"recorded-empty\"] > 0) ? VERDICT.DISPROVED : VERDICT.PROVED };", "C3 · FIRING CONTROL"],
  ["S14", "C3 an empty unit is recorded-empty", FS, "const k = text(r?.value?.unit) ? \"recorded\" : \"recorded-empty\";", "const k = r?.value?.unit !== undefined ? \"recorded\" : \"recorded-empty\";", "C3 · FIRING CONTROL"],
  ["S15", "C4 a derived record without its derivation DISPROVES", FS, "withDerivation.length < derived.length ? VERDICT.DISPROVED : VERDICT.PROVED,", "VERDICT.PROVED,", "C4 · FIRING CONTROL"],
  ["S16", "C4 the waiver names exactly five fields", FS, "export const DERIVED_WAIVED = Object.freeze([\"source\", \"tier\", \"checker\", \"date\", \"freshness\"]);", "export const DERIVED_WAIVED = Object.freeze([\"source\", \"tier\", \"checker\", \"date\", \"freshness\", \"provenance\"]);", "C4 · FIRING CONTROL"],
  ["S17", "C5 every capability claim goes through the existing admission", FS, "  const results = caps.map((c) => admit(c));", "  const results = caps.map((c) => ({ admitted: true, record: c, refusals: [] }));", "C5 · FIRING CONTROL"],
  ["S18", "C5 a refused capability claim DISPROVES", FS, "verdict: caps.length === 0 ? VERDICT.COULD_NOT_PROVE : admitted.length < caps.length ? VERDICT.DISPROVED : VERDICT.PROVED,", "verdict: caps.length === 0 ? VERDICT.COULD_NOT_PROVE : VERDICT.PROVED,", "C5 · FIRING CONTROL"],
  ["S19", "C5 an empty capability population is never PROVED", FS, "verdict: caps.length === 0 ? VERDICT.COULD_NOT_PROVE : admitted.length", "verdict: caps.length === 0 ? VERDICT.PROVED : admitted.length", "C5 · an empty capability"],
  ["S20", "C5 a self-sourced claim's tier is counted from the admitted record", FS, "selfSourcedWithATier: selfSourced.filter((r) => r.source.tier !== null).length,", "selfSourcedWithATier: selfSourced.length,", "C5 · FIRING CONTROL"],
  ["S21", "C5 the reader's context resolves only its own product", RD, "productResourceOf: (productId) => (productId === product.productId ? RESOURCES.subject(productId) : null)", "productResourceOf: (productId) => RESOURCES.subject(productId)", "C5 · REAL RESOLVER"],
  ["S22", "C6 one DISPROVED part disproves the row", FS, "  const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE;", "  const verdict = VERDICT.COULD_NOT_PROVE;", "C6 · FIRING CONTROL"],
  ["S23", "C1 the entry point says an empty capability population is never a pass", BIN, "0 capability claim(s) recorded — the population is EMPTY, never a pass", "0 capability claim(s) recorded", "C1 · THE ENTRY POINT"],
  ["S24", "C1 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C1 · the audit and its reader"],
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
  `F44 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f44-sabotage-2026-10-01.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
