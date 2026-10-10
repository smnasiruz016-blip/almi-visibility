/**
 * 🔴 F44 CAPABILITY PRECONDITION · ONE SABOTAGE PER FAILURE LIMB (acceptance _handoffs d6a41a3, EVIDENCE clause).
 *
 *   node test/helpers/f44-capability-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * Each sabotage replaces ONE exact span in a production source file, proves the replacement LANDED in the bytes, runs the F44
 * capability test file, requires the NAMED test to fail, then restores the file and proves the restore by raw-byte sha256.
 * The production audit trail is hashed before and after the whole run and must be unchanged. A restore also runs on any exit,
 * so an abort cannot leave damage behind. Writes its evidence to runs/audit/f44-capability-precondition-sabotage-2026-09-28.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEST = "test/f44-capability-claim-precondition.test.mjs";
const CC = "src/facts/capability-claims.mjs";
const ST = "src/evidence/source-tiers.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "P1", CC, "const sourceClass = fp.decided && fp.selfSourced ? SELF_SOURCED : claim.source.class;", "const sourceClass = claim.source.class;", "P1a"],
  ["S2", "P1", CC, `  if (nonEmpty(claim?.source?.declarationRef)) return { decided: true, selfSourced: true, basis: "OWNER_DECLARATION" };\n`, "", "P1a"],
  ["S3", "P1", CC, "const independent = same.filter((r) => r.source.class === INDEPENDENT).length;", "const independent = same.length;", "P1d"],
  ["S4", "P1", CC, "if (record?.source?.class !== INDEPENDENT) throw new Error(", "if (false) throw new Error(", "P1e"],
  ["S5", "P1", CC, "return { decided: false, reason: `FIRST_PARTY_UNDECIDABLE_${d.outcome}` };", `return { decided: true, selfSourced: false, basis: "SABOTAGED" };`, "P1c"],
  ["S6", "P2", CC, "const tier = sourceClass === SELF_SOURCED ? null : declaredTier;", "const tier = declaredTier;", "P2a"],
  ["S7", "P2", ST, "if (isCapabilityClaim(f) && f?.source?.class !== INDEPENDENT) {", "if (false) {", "P2b"],
  ["S8", "P2", CC, `  if (sourceClass === SELF_SOURCED && claim.verificationState === "VERIFIED") refusals.push("SELF_SOURCED_CANNOT_BE_VERIFIED");\n`, "", "P2c"],
  ["S9", "P3", CC, "if (!d.allowed) refusals.push(`PRODUCT_NOT_OF_THIS_TENANT_${d.outcome}`);", "if (false) refusals.push(`PRODUCT_NOT_OF_THIS_TENANT_${d.outcome}`);", "P3a"],
  ["S10", "P3", CC, `return decideForTenant(resolve, requestedTenantId, { resourceKind: "TENANT_PARTITION", resourceRef: r?.scope?.tenantId }).allowed;`, "return true;", "P3b"],
  ["S11", "P3", CC, `  if (!nonEmpty(requestedTenantId)) return { claims: [], returned: 0, withheld: records.length, refused: "NO_TENANT_REQUESTED", ...b };\n`, "", "P3b"],
  ["S12", "P4", CC, `  if (!nonEmpty(claim?.checker)) refusals.push("CHECKER_ABSENT");\n`, "", "P4a"],
  ["S13", "P4", CC, "if (claims.length > MAX_CLAIMS_PER_CALL) throw new RangeError(", "if (false) throw new RangeError(", "P4b"],
  ["S14", "P4", CC, "return { capabilityClaims: records.filter(isCapabilityClaim).length, ...b };", "return { capabilityClaims: 0, ...b };", "P4c"],
];

const originals = new Map([CC, ST].map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const trailBefore = sha(read(TRAIL));
const lines = [`F44 capability-claim precondition · sabotage run · ${new Date().toISOString()}`, `population: ${SABOTAGES.length} sabotages over ${TEST} · bound: one span per sabotage, applied ALONE`, `production trail sha256 before: ${trailBefore}`, ""];
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const damaged = text.slice(0, at) + to + text.slice(at + from.length);
  writeFileSync(join(REPO, file), damaged, "utf8");
  const landed = sha(read(file)) !== sha(orig) && read(file).toString("utf8").indexOf(from) < 0;
  let failedNames = [];
  try {
    const r = spawnSync(process.execPath, ["--test", TEST], { cwd: REPO, encoding: "utf8", timeout: 240000 });
    failedNames = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (P\d[a-z]) ·/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failedNames.includes(expect);
  const ok = landed && red && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} ${file}: landed ${landed} · named test ${expect} red ${red} · failing [${[...new Set(failedNames)].join(",")}] · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f44-capability-precondition-sabotage-2026-09-28.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = proved === SABOTAGES.length && residue === 0 && trailAfter === trailBefore ? 0 : 1;
