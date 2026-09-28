/**
 * 🔴 F77 · ONE SABOTAGE PER REPAIRED LIMB (acceptance _handoffs 7042c77 EVIDENCE; limb map 84f26b9).
 *
 *   node test/helpers/f77-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * Each sabotage replaces ONE exact single-line span (identical in an LF and a CRLF checkout), proves it LANDED, runs the F77 proof
 * file, requires the NAMED test to fail, restores the file and proves the restore by raw-byte sha256. The production trail is
 * hashed before and after and must be unchanged. A restore also runs on any exit. A sabotage that does not turn its named test
 * red is reported NOT PROVED — never dropped. Evidence: runs/audit/f77-sabotage-2026-09-28.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IO = "src/search/ingest-operation.mjs", ES = "src/evidence/store.mjs", BIN = "bin/gsc-ingest.mjs", T_R2 = "test/f77-metered-retry.test.mjs";
const GW = "src/governance/governed-write.mjs", ST = "src/audit-trail/store.mjs", LK = "src/governance/process-lock.mjs", CE = "tools/paid-metered-call-census.mjs";
const TEST = "test/f77-idempotency-retry-recovery.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "M1 decision at the action's time", GW, ", clock: () => decidedAt });", " });", "M1 ·"],
  ["S2", "M2 store lock", ST, "return withExclusiveLock(`${eventsPath}.lock`, () => appendUnlocked(draft, options));", "return appendUnlocked(draft, options);", "M2 · R3"],
  ["S3", "M2 saga lock", GW, "return withExclusiveLock(sagaLockPath(args.audit.store, key), () => executeGovernedWriteUnlocked(args));", "return executeGovernedWriteUnlocked(args);", "M2 · R1b"],
  ["S4", "M2 lock bound honoured", LK, "if (Date.now() - start > boundMs) throw", "if (Date.now() - start > boundMs * 30) throw", "M2 · the lock is BOUNDED"],
  ["S5", "M2 dead holder cleared", LK, "pid !== process.pid && !alive(pid)) {", "pid !== process.pid && false) {", "M2 · the lock is BOUNDED"],
  ["S6", "M4 raw egress classified", CE, "if (RAW_EGRESS.test(line)) (Object.hasOwn(DECLARED_EGRESS, p) ? egress : unclassified).push(`${p}:${i + 1}`);", "if (RAW_EGRESS.test(line)) egress.push(`${p}:${i + 1}`);", "M4 ·"],
  ["S7", "M4 real paid provider seen", CE, `const paid = gates.map((g) => ({ site: g.site, provider: FAKE.test(String(files[g.file])) ? "FAKE_EXERCISE" : "REAL_OR_UNKNOWN" }));`, `const paid = gates.map((g) => ({ site: g.site, provider: "FAKE_EXERCISE" }));`, "M4 ·"],
  ["S8", "M4 connector kinds classified", CE, "const unclassifiedKinds = kinds.filter((k) => !Object.hasOwn(CONNECTOR_CALL_CLASS, k));", "const unclassifiedKinds = kinds.filter(() => false);", "M4 ·"],
  ["S10", "R2 retry replays answered calls", IO, "if (held?.state === CALL_STATES.ANSWERED) {", "if (false) {", "R2 · RETRY after an INTERRUPTION", T_R2],
  ["S11", "R2 uncertain call refused", IO, "if (held?.state === CALL_STATES.ISSUED) {", "if (false) {", "R2 · RETRY after an UNCERTAIN", T_R2],
  ["S12", "R2 retry saves nothing twice", ES, `if (mode === "RETRY" && (`, "if (false && (", "R2 · RETRY after the evidence was committed", T_R2],
  ["S13", "R2 retry reuses the operation instant", IO, "export const operationClock = (operation) => () => new Date(operation.startedAt);", "export const operationClock = (operation) => () => new Date();", "R2 · RETRY after the evidence was committed", T_R2],
  ["S14", "R2 fresh collection records a sighting", ES, "const commitInput = () => [...wouldWrite, ...resighted];", "const commitInput = () => [...wouldWrite];", "R2 · a FRESH collection", T_R2],
  ["S15", "R2 every metered call counted", IO, "    counters.issued += 1;", "", "R2 · the REAL metered call sequence", T_R2],
  ["S16", "R2 committed operation short-circuits", BIN, "if (operation.committed) {", "if (false) {", "R2 · END TO END", T_R2],
  ["S17", "R2P reopening trigger", CE, "census.realPaidProviders > 0)", "census.realPaidProviders > 1000)", "R2P ·", T_R2],
  ["S9", "M5 recovery identity has no time", GW, "const identity = { governedWriteKey: key, governedWritePhase: phase, correlationId: audit.correlationId };", "const identity = { governedWriteKey: key, governedWritePhase: phase, correlationId: audit.correlationId, nonce: `${Date.now()}${Math.random()}` };", "M5 ·"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const trailBefore = sha(read(TRAIL));
const lines = [`F77 sabotage run · ${new Date().toISOString()}`, `population: ${SABOTAGES.length} sabotages over ${[...new Set(SABOTAGES.map((s) => s[6] ?? TEST))].join(", ")} · bound: one span per sabotage, applied ALONE; each run killed after 240 s`, `production trail sha256 before: ${trailBefore}`, ""];
let proved = 0;
for (const [id, limb, file, from, to, expect, testFile = TEST] of SABOTAGES) {
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
writeFileSync(join(REPO, "runs", "audit", "f77-sabotage-2026-09-28.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
