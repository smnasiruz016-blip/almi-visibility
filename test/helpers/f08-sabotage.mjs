/**
 * §13 · SABOTAGE. For each: confirm the mutation LANDED · run the NAMED test · require RED FOR THE INTENDED
 * REASON with attribution · restore byte-identically · verify by hash.
 *
 * 🔴 IT RESTORES ON ABORT. A harness that leaves damage behind when interrupted turns a proof into an incident,
 * so every exit path — success, failure, throw, SIGINT — goes through restore().
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const BOUNDARY = "src/governance/governed-write.mjs";
const ADAPTERS = "src/governance/durability-adapters.mjs";
const RUN = "src/governance/governed-run.mjs";
const EVENT = "src/audit-trail/event.mjs";
const T = "test/governed-write.test.mjs";

const SABOTAGES = [
  { id: "S3", what: "mutate the target before ATTEMPTED is durable", file: BOUNDARY, test: T,
    /* Narrowed: the first attempt REMOVED the ATTEMPTED event entirely, which broke sixteen tests and so could
     * not be attributed to P7. This defers ONLY the ATTEMPTED write, which is exactly the defect named — the
     * mutation proceeds before the attempt record is durable — and nothing else changes. */
    from: '  const identity = { governedWriteKey: key, governedWritePhase: phase, correlationId: audit.correlationId };\n  return audit.store.append(draft, { identity });',
    to: '  const identity = { governedWriteKey: key, governedWritePhase: phase, correlationId: audit.correlationId };\n  if (phase === "ATTEMPTED") { setTimeout(() => audit.store.append(draft, { identity }), 0); return { event: { eventId: null }, appended: false }; }\n  return audit.store.append(draft, { identity });',
    expect: /the mutation began before ATTEMPTED was durable/ },

  { id: "S19", what: "suppress a permission-refusal audit", file: BOUNDARY, test: T,
    from: '  if (!permission || permission.mayWrite !== true) {\n    const refused = appendPhase({',
    to: '  if (!permission || permission.mayWrite !== true) {\n    if (true) return { ...base, outcome: "REFUSED", attemptedEventId: null, terminalEventId: null, faults: [] };\n    const refused = appendPhase({',
    expect: /REFUSED/ },

  { id: "S7+S8", what: "duplicate the target and the occurrence event on retry", file: BOUNDARY, test: T,
    from: '  if (found.state === "COMMITTED") {',
    to: '  if (false && found.state === "COMMITTED") {',
    expect: /retries added occurrence events|ALREADY_COMMITTED/ },

  { id: "S9", what: "accept a conflicting idempotency key", file: BOUNDARY, test: T,
    from: '  if (idempotencyKey !== null && idempotencyKey !== derived) {',
    to: '  if (false && idempotencyKey !== null && idempotencyKey !== derived) {',
    expect: /IDEMPOTENCY_KEY_NOT_DERIVABLE|Missing expected exception/ },

  { id: "S29", what: "widen the audit-store exemption to cover a governed write", file: BOUNDARY, test: T,
    from: '  if (own.some((p) => p.endsWith(target))) {',
    to: '  if (false && own.some((p) => p.endsWith(target))) {',
    expect: /the exemption has become a hole|AUDIT_STORE_TARGET_FORBIDDEN/ },

  { id: "S13", what: "declare a discovered state with no owner", file: BOUNDARY, test: T,
    from: '      owner: "NEXT_GOVERNED_WRITE_TO_SAME_TARGET",',
    to: '      owner: "",',
    expect: /has no named owner/ },

  { id: "S32", what: "report a DECLARED-UNREACHABLE outcome as proved", file: BOUNDARY, test: T,
    from: '  VALIDATED_APPEND: Object.freeze(["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "ALREADY_COMMITTED"]),',
    to: '  VALIDATED_APPEND: Object.freeze(["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "ALREADY_COMMITTED", "COMMIT_STATUS_UNKNOWN"]),',
    expect: /9 reachable-as-returned|COMMIT_STATUS_UNKNOWN/ },

  { id: "S16", what: "ignore a malformed tail (and so allow a valid tail to be truncated)", file: ADAPTERS, test: T,
    from: '      if (readRecords().malformedTail) faults.push({ code: "MALFORMED_TAIL"',
    to: '      if (false && readRecords().malformedTail) faults.push({ code: "MALFORMED_TAIL"',
    expect: /MALFORMED_TAIL|FAILED_BEFORE_COMMIT/ },

  { id: "S22", what: "honour the store override OUTSIDE a test context", file: RUN, test: T,
    from: '  if (!inVerifiedTestContext(env)) {\n    throw new AuditStoreOverrideForbidden(',
    to: '  if (false && !inVerifiedTestContext(env)) {\n    throw new AuditStoreOverrideForbidden(',
    expect: /an override was honoured with env|Missing expected exception/ },

  { id: "S27", what: "let the recorder version create a false cross-build conflict", file: EVENT, test: T,
    from: '  "recordedAt", "previousEventHash", "eventHash", "migratedAt", "softwareVersion",',
    to: '  "recordedAt", "previousEventHash", "eventHash", "migratedAt",',
    expect: /still conflict across builds|the recorder's build is still part of occurrence identity|conflicting duplicate/ },
];

const originals = new Map();
for (const s of new Set(SABOTAGES.map((x) => x.file))) originals.set(s, readFileSync(join(REPO, s), "utf8"));
let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  for (const [f, text] of originals) writeFileSync(join(REPO, f), text, "utf8");
}
process.on("exit", restore);
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("uncaughtException", (e) => { restore(); console.error(e); process.exit(1); });

const results = [];
for (const s of SABOTAGES) {
  const path = join(REPO, s.file);
  const original = originals.get(s.file);
  const before = sha(original);
  const count = original.split(s.from).length - 1;

  if (count !== 1) { results.push({ ...s, verdict: `NOT RUN — the target text occurs ${count} time(s)` }); continue; }

  writeFileSync(path, original.split(s.from).join(s.to), "utf8");
  const after = readFileSync(path, "utf8");
  const landed = sha(after) !== before && after.includes(s.to);

  let output = "", failed = 0;
  try {
    output = execFileSync(process.execPath, ["--test", s.test], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 });
  } catch (err) { output = `${err.stdout ?? ""}${err.stderr ?? ""}`; }
  failed = Number((output.match(/^ℹ fail (\d+)$/m) ?? [0, 0])[1]);

  const red = failed > 0;
  const intended = s.expect.test(output);
  writeFileSync(path, original, "utf8");
  const restoredClean = sha(readFileSync(path, "utf8")) === before;

  results.push({
    ...s, landed, failed,
    verdict: !landed ? "🔴 SABOTAGE DID NOT LAND" : !red ? "🔴 LANDED BUT GREEN — the guard is dead" : !intended ? "🔴 RED FOR THE WRONG REASON" : "RED, for the intended reason",
    restoredClean,
  });
}
restore();

console.log("§13 · SABOTAGE — each landed, ran its named test, and was restored by hash\n");
let bad = 0;
for (const r of results) {
  const ok = r.verdict.startsWith("RED") && r.restoredClean;
  if (!ok) bad += 1;
  console.log(`  ${ok ? "ok  " : "🔴  "} ${r.id.padEnd(7)} ${String(r.what).padEnd(62)} failed=${String(r.failed ?? "-").padStart(2)} ${r.verdict}${r.restoredClean === false ? "  🔴 NOT RESTORED" : ""}`);
}
console.log(`\n${results.length} sabotage(s) · ${results.length - bad} proved · ${bad} NOT proved`);

const dirty = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" })
  .split("\n").filter((l) => l.trim() && !l.startsWith("??"));
console.log(`tree after restore — tracked modifications: ${dirty.length}`);
for (const l of dirty) console.log(`   ${l}`);
process.exit(bad === 0 ? 0 : 1);
