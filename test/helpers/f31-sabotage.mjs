/**
 * 🔴 F31 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 3a8f7ba EVIDENCE; RR-85 §7).
 *
 *   node test/helpers/f31-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f31-sabotage-2026-09-29.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SC = "src/crawl/scope-completeness.mjs", SI = "src/crawl/scope-inventory.mjs", POP = "src/page/existing-page-population.mjs";
const BPART = "src/crawl/batch-partition.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f31-inventory.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 a URL claimed by two identities is reported", SI, `if (shared) conflicts.push({ pageId: p.page_id, code: "URL_CLAIMED_BY_TWO_IDENTITIES" });`, "if (false) {}", "C1 ·"],
  ["S2", "C1 an identity not derived from its URL is reported", SI, `if (derived !== p.page_id) conflicts.push({ pageId: p.page_id, code: "IDENTITY_NOT_DERIVED_FROM_URL" });`, "if (false) {}", "C1 ·"],
  ["S3", "C2 fingerprints are verified against stored bytes", SI, "verified: bodies.has(o.observation_id) ? sha(bodies.get(o.observation_id)) === o.content_sha256 : null,", "verified: true,", "C2 ·"],
  ["S4", "C2 no fingerprint is invented", SI, `const fingerprints = obs.filter((o) => typeof o.content_sha256 === "string" && o.content_sha256 !== "").map((o) => ({`, "const fingerprints = obs.map((o) => ({", "C2 ·"],
  ["S5", "C3 a page never answered with a status is UNKNOWN", SI, "const last = obs.filter(hasServedState).at(-1);", "const last = obs.at(-1);", "C3 ·"],
  ["S6", "C4 a client's partition holds only its own members", BPART, "const mine = new Set(p.partitions.get(tenantId) ?? []);", "const mine = new Set([...p.partitions.values()].flat());", "C4 · OWNERSHIP"],
  ["S7", "C4 only the client's own links are read", BPART, "    if (!observationIds.has(id)) continue;\n    const e = JSON.parse(line);", "    const e = JSON.parse(line);", "C4 · the links read"],
  ["S8", "C5 every page cites its observations", SI, "evidence: Object.freeze({ batchId, observationIds: Object.freeze(obs.map((o) => o.observation_id)) }),", "evidence: Object.freeze({ batchId, observationIds: Object.freeze([]) }),", "C5 ·"],
  ["S9", "C6 listed but unobserved is INCOMPLETE", SC, "const listedUnobserved = [...listed].filter((u) => !served.has(u)).length;", "const listedUnobserved = 0;", "C6 · each gap"],
  ["S10", "C6 linked but unobserved is INCOMPLETE", SC, "const linkedUnobserved = [...linked].filter((u) => !served.has(u)).length;", "const linkedUnobserved = 0;", "C6 · each gap"],
  ["S11", "C6 a sitemap cut short is INCOMPLETE", SC, `return v.coverageState !== "COMPLETE" || (v.childrenSkipped ?? 0) > 0 || (Number.isInteger(v.urlsTotal) && Number.isInteger(v.urlsStored) && v.urlsStored < v.urlsTotal);`, "return false;", "C6 · each gap"],
  ["S12", "C6 a truncated body is INCOMPLETE", SC, "const truncated = scoped.filter((o) => o.value?.truncated === true).length;", "const truncated = 0;", "C6 · each gap"],
  ["S13", "C6 a request without a served state is INCOMPLETE", SC, "const requestedWithoutState = scoped.filter((o) => !hasServedState(o)).length;", "const requestedWithoutState = 0;", "C6 · each gap"],
  ["S14", "C6 no freshness rule is UNKNOWN", SC, "[!rule, R.NO_FRESHNESS_RULE]", "[false, R.NO_FRESHNESS_RULE]", "C6 · each gap"],
  ["S15", "C6 past the rule is STALE", SC, "if (now.getTime() > Date.parse(expiresAt)) return verdict(S.STALE, [R.EXPIRED]);", "if (false) return verdict(S.STALE, [R.EXPIRED]);", "C6 · each gap"],
  ["S16", "C6 no origin is OUT OF SCOPE", SC, "if (scope.length === 0) return verdict(S.OUT_OF_SCOPE, [R.NO_ORIGIN]);", "if (false) return verdict(S.OUT_OF_SCOPE, [R.NO_ORIGIN]);", "C6 · each gap"],
  ["S17", "C6 the freshness rule is read from the declaration", POP, "const rule = d.tenants.find((t) => mine(t?.tenantId))?.existingPageInventory ?? null;", "const rule = null;", "C6 · the freshness rule is READ"],
  ["S18", "C6 the verdict is recorded", POP, "scope.recordDecision?.(completenessEvent(completeness));", "void completenessEvent;", "C6 · the verdict is RECORDED"],
  ["S19", "C7 5.1 only a fresh COMPLETE reads COMPLETE", SC, `if (v?.state === COMPLETENESS.COMPLETE) return "COMPLETE";`, `if (v?.state) return "COMPLETE";`, "C7 · 5.1"],
  ["S20", "C7 5.1 the loader's coverage comes from the verdict", POP, "coverageState: completeness ? coverageForConsumers(completeness) : derived,", `coverageState: completeness ? "COMPLETE" : derived,`, "C7 · 5.1"],
  ["S21", "C7 5.2 a COMPLETE verdict can let F33 decide", SC, `if (v?.state === COMPLETENESS.COMPLETE) return "COMPLETE";`, `if (v?.state === COMPLETENESS.COMPLETE) return "PARTIAL";`, "C7 · 5.2"],
  ["S22", "C8 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C8 ·"],
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
  `F31 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
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
    const r = spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
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
writeFileSync(join(REPO, "runs", "audit", "f31-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
