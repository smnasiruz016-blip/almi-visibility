/**
 * 🔴 RR-80 · ONE SABOTAGE PER FAILURE LIMB — first-party demotion (00f20db), question-fit gate (ef4c6fc), the F07 Amendment 4 guard
 * (5afaae5) and Specification Amendment 2's pin (388ae02).
 *
 *   node test/helpers/rr80-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * Each sabotage replaces ONE exact span, proves it LANDED, runs ONE test file, requires the NAMED test to fail, restores the file
 * and proves the restore by raw-byte sha256. The production trail is hashed before and after the run and must be unchanged. A
 * restore also runs on any exit. A sabotage that does not turn its named test red is reported NOT PROVED — never dropped.
 * Evidence: runs/audit/rr80-sabotage-<date>T<hhmm>.txt, one file per run (RR-246); the 28 Sep run's file is kept as it was.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REC = "src/evidence/records.mjs", ST = "src/evidence/source-tiers.mjs", QF = "src/facts/question-fit.mjs";
const GD = "tools/sealed-store-read-guard.mjs", CAP = "config/fboard/capabilities.mjs";
const T_DEM = "test/first-party-evidence-demotion.test.mjs", T_FIT = "test/f50-question-fit-gate.test.mjs";
const T_GD = "test/f07-sealed-store-read-guard.test.mjs", T_A2 = "test/spec-amendment-2.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  /* one line, so the span is the same in an LF and a CRLF checkout */
  ["D1", "E1", REC, "const i = SOURCE_TIERS.indexOf(tier);", "const i = FIRST_PARTY_TIERS.includes(tier) ? 0 : SOURCE_TIERS.indexOf(tier);", T_DEM, "E1 ·"],
  ["D2", "E2", REC, "return INDEPENDENT_SOURCE_TIERS.includes(tier) && !FIRST_PARTY_TIERS.includes(tier);", "return INDEPENDENT_SOURCE_TIERS.includes(tier) || FIRST_PARTY_TIERS.includes(tier);", T_DEM, "E2 ·"],
  ["D3", "E2", ST, `["OFFICIAL", "OFFICIAL", "REPUTABLE_SECONDARY", "REPUTABLE_SECONDARY", "COMPETITOR_COMMUNITY"]`, `["OFFICIAL", "OFFICIAL", "VERIFIED_ALMIWORLD", "REPUTABLE_SECONDARY", "COMPETITOR_COMMUNITY"]`, T_DEM, "E2 ·"],
  ["D4", "E4", ST, "if (FIRST_PARTY_TIERS.includes(s.source_tier)) out.firstParty += 1;", "if (false) out.firstParty += 1;", T_DEM, "E4 ·"],
  ["G1", "G1", QF, "if (!FIT_STATES.includes(requestedState)) return", "if (false) return", T_FIT, "G1 ·"],
  ["G2a", "G2", QF, "const failed = capabilityIds.filter((id) => !usable.has(id))", "const failed = [].filter((id) => !usable.has(id))", T_FIT, "G2 ·"],
  ["G2b", "G2", QF, `if (a.record.verificationState !== "VERIFIED") { why.set`, `if (false) { why.set`, T_FIT, "G2 ·"],
  ["G2c", "G2", QF, `  if (!Array.isArray(capabilityIds) || capabilityIds.length === 0) return unknown("NO_CAPABILITY_RELIED_ON");\n`, "", T_FIT, "G2 ·"],
  ["G2d", "G2", QF, "const read = readCapabilityClaims(records, { resolve, requestedTenantId: tenantId, productId });", "const read = { claims: records };", T_FIT, "G2 ·"],
  ["G2e", "G2 (redundant: admission already refuses a VERIFIED self-sourced claim)", QF, `if (a.record.source.class !== INDEPENDENT) { why.set`, `if (false) { why.set`, T_FIT, "G2 ·"],
  ["G3", "G3", QF, `  if (requestedState === "PARTIALLY_ADDRESSES" && !(nonEmpty(addressedPart) && nonEmpty(unaddressedPart))) return { recorded: false, refused: "INCOMPLETE_PARTIALLY" };\n`, "", T_FIT, "G3 ·"],
  ["G5", "G5", QF, `const unmet = requestedState === "DOES_NOT_ADDRESS" ? reason :`, `const unmet = false ? reason :`, T_FIT, "G5 ·"],
  ["G7", "G7", QF, "usable += 1;", "usable += 0;", T_FIT, "G7 ·"],
  ["K1", "guard LOCATION", GD, "if (normed.some((x) => x.includes(d))) return", "if (false) return", T_GD, "LOCATION ·"],
  ["K2", "guard slash styles", GD, `.replace(/(^|[\\s"'=(:;,])\\/([a-zA-Z])\\//g, "$1$2:/")`, `.replace(/^\\/([a-zA-Z])\\//, "$1:/")`, T_GD, "LOCATION ·"],
  ["K3", "guard DEREFERENCE", GD, "if (strings.some((x) => re.test(x))) return", "if (false) return", T_GD, "ENV_REFERENCE_DEREFERENCE ·"],
  ["K4", "guard RESOLVER", GD, "if (!writesReviewedCode && !readsReviewedCode) return", "if (false) return", T_GD, "RESOLVER_OUTSIDE_ENGINE ·"],
  ["K5", "guard never names a location", GD, `return { allowed: false, rule: "LOCATION", store: s.name };`, `return { allowed: false, rule: "LOCATION", store: s.dir };`, T_GD, "a refusal names"],
  ["K6", "guard entry refuses", GD, "process.exit(REFUSED_EXIT); }", "process.exit(0); }", T_GD, "THE PRODUCTION ENTRY"],
  ["A1", "amended row pinned", CAP, `{"id":"F50","domain":"Core intelligence"`, `{"id":"F50","domain":"Advanced"`, T_A2, "A2·1"],
  ["A2", "F62 class", CAP, `{"id":"F62","domain":"Core intelligence"`, `{"id":"F62","domain":"Advanced"`, T_A2, "A2·4"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const trailBefore = sha(read(TRAIL));
const lines = [`RR-80 sabotage run · ${new Date().toISOString()}`, `population: ${SABOTAGES.length} sabotages over 4 test files · bound: one span per sabotage, applied ALONE`, `production trail sha256 before: ${trailBefore}`, ""];
let proved = 0;
for (const [id, limb, file, from, to, testFile, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [];
  try {
    const r = spawnSync(process.execPath, ["--test", testFile], { cwd: REPO, encoding: "utf8", timeout: 240000 });
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
/* RR-246: each run writes its OWN evidence file and never overwrites an earlier one (this used to rewrite the 28 Sep record every run) */
writeFileSync(join(REPO, "runs", "audit", `rr80-sabotage-${new Date().toISOString().slice(0, 16).replace(":", "")}.txt`), lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
