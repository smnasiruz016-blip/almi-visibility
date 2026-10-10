/**
 * 🔴 F79 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs f34f3af, Amendment 1 60dee9b, EVIDENCE; RR-93).
 *
 *   node test/helpers/f79-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f79-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EC = "src/evidence/evidence-cache.mjs", RL = "src/evidence/evidence-cache-real.mjs", BIN = "bin/evidence-cache.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f79-evidence-cache.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 one answer: the most recent valid record", EC, ".sort((a, b) => Date.parse(b.r.observed_at) - Date.parse(a.r.observed_at));", ";", "C1 ·"],
  ["S2", "C1 nothing held is a miss, never a hit", EC, `if (candidates.length === 0) return Object.freeze({ answer: "MISS", miss: MISS.NOT_HELD,`, `if (candidates.length === 0) return Object.freeze({ answer: "HIT", miss: MISS.NOT_HELD,`, "C1 ·"],
  ["S3", "C1 source-change signals are passed, never defaulted", EC, "if (!Array.isArray(sourceChanges)) throw", "if (false) throw", "C1 ·"],
  ["S4", "C2 another tenant's record is never served (the F02 decision)", EC, "if (!owner.tenantId || !decideResolvedTenants(ctx.tenantId, owner.tenantId).allowed) return [MISS.OUTSIDE_SCOPE", "if (!owner.tenantId) return [MISS.OUTSIDE_SCOPE", "C2 · FIRING CONTROL"],
  ["S5", "C2 a domain property spanning tenants belongs to none", EC, "if (tenants.size === 1) return { tenantId: [...tenants][0] };", "if (tenants.size >= 1) return { tenantId: [...tenants][0] };", "C2 · FIRING CONTROL"],
  ["S6", "C3 a windowed record serves only its own window", EC, "if (!q || q.startDate !== w.startDate || q.endDate !== w.endDate) return [MISS.OUTSIDE_WINDOW", "if (!q) return [MISS.OUTSIDE_WINDOW", "C3 ·"],
  ["S7", "C3 an undeclared age is never fresh", EC, `return [MISS.FRESHNESS_NOT_DECLARED, "an unwindowed record, and no freshness rule is declared — its age is NOT MEASURED"];`, "return null;", "C3 ·"],
  ["S8", "C3 an expired record is never served", EC, `return [MISS.EXPIRED, "past the declared freshness rule — an expired record is never served as current"];`, "return null;", "C3 ·"],
  ["S9", "C3 a later source change forces a miss", EC, "if (changed) return [MISS.SOURCE_CHANGED", "if (false) return [MISS.SOURCE_CHANGED", "C3 ·"],
  ["S10", "C4 inline content must hash to the recorded hash", EC, `return sha256(JSON.stringify(record.value)) === record.content_sha256 ? { ok: true, via: "inline content" }`, `return true ? { ok: true, via: "inline content" }`, "C4 · FIRING CONTROL"],
  ["S11", "C4 a raw file must hash to the recorded hash", EC, `return sha256(bytes) === record.content_sha256 ? { ok: true, via: "raw file" }`, `return true ? { ok: true, via: "raw file" }`, "C4 · FIRING CONTROL"],
  ["S12", "C4 a missing raw file is a miss", EC, `if (bytes === null || bytes === undefined) return { ok: false, why: "the raw file it names is missing" };`, `if (bytes === null || bytes === undefined) return { ok: true, via: "raw file" };`, "C4 · FIRING CONTROL"],
  ["S13", "C4 integrity decides the lookup", EC, "if (!integ.ok) return [MISS.INTEGRITY_FAILED, integ.why];", "", "C4 · FIRING CONTROL"],
  ["S14", "C5 metered requests are the ones the served records recorded", RL, "meteredRequestsServed: hits.reduce((n, a) => n + (a.requestCount ?? 0), 0),", "meteredRequestsServed: hits.length,", "C5/C2 ·"],
  ["S15", "C5 an unrecorded request count is counted, never zero", RL, "servedWithRequestCountNotRecorded: hits.filter((a) => a.requestCount === null).length,", "servedWithRequestCountNotRecorded: 0,", "C5/C2 ·"],
  ["S16", "C6 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C6 · THE ENTRY POINT"],
  ["S17", "C6 the entry point answers for its OWN tenant", BIN, "readRecordedReuse({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() })", `readRecordedReuse({ tenantId: "tenant:ffffffffffffffffffffffffffffffff", resolve: createTenantResolver() })`, "C6 · THE ENTRY POINT"],
  ["S18", "C6 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C6 · the cache"],
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
  `F79 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [];
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f79-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
