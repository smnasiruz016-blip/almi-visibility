/**
 * 🔴 F55 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 7323446 EVIDENCE; RR-93).
 *
 *   node test/helpers/f55-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f55-sabotage-2026-09-29.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AC = "src/audit/ai-crawler-access.mjs", RD = "src/audit/ai-crawler-access-reader.mjs", BIN = "bin/ai-crawler-access.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f55-ai-crawler-access.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 an unreachable (5xx) robots.txt is DISALLOWED", AC, "if (status >= 500 && status < 600) return { decide: () => ({ state: POLICY.DISALLOWED,", "if (status >= 500 && status < 600) return { decide: () => ({ state: POLICY.ALLOWED,", "C1 ·"],
  ["S2", "C1 a failed robots fetch is DISALLOWED", AC, "if (v.fetchError) return { decide: () => ({ state: POLICY.DISALLOWED,", "if (v.fetchError) return { decide: () => ({ state: POLICY.ALLOWED,", "C1 ·"],
  ["S3", "C1 an unavailable (4xx) robots.txt is ALLOWED", AC, "if (status >= 400 && status < 500) return { decide: () => ({ state: POLICY.ALLOWED,", "if (status >= 400 && status < 500) return { decide: () => ({ state: POLICY.DISALLOWED,", "C1 ·"],
  ["S4", "C1 no recorded robots.txt is NOT MEASURED", AC, `if (!v) return { decide: () => ({ state: POLICY.NOT_MEASURED, why: "no recorded robots.txt" }) };`, `if (!v) return { decide: () => ({ state: POLICY.ALLOWED, why: "no recorded robots.txt" }) };`, "C1 ·"],
  ["S5", "C1 the crawler's own token selects its group", AC, "const group = selectGroup(parseGroups(v.body), token);", `const group = selectGroup(parseGroups(v.body), "*");`, "C1 ·"],
  ["S6", "C2 retrieval is never inferred from policy", AC, `{ state: "NOT_MEASURED", why: "no recorded retrieval by this crawler" }`, `{ state: policy.state === POLICY.ALLOWED ? "OBSERVED" : "NOT_MEASURED" }`, "C2 ·"],
  ["S7", "C2 a retrieval counts only for its own crawler", AC, "r?.token === c.token && ", "", "C2 ·"],
  ["S8", "C2 a retrieval counts only when recorded with a ref", AC, `typeof r.ref === "string" && r.ref !== "" && `, "", "C2 ·"],
  ["S9", "C2 recorded retrievals are passed, never defaulted", AC, "if (!Array.isArray(retrievals)) throw", "if (false) throw", "C2 ·"],
  ["S10", "C3 a directive to this crawler's token is reported", AC, `if (name !== "robots" && name !== t) continue;`, `if (name !== "robots") continue;`, "C3 ·"],
  ["S11", "C3 a page directive never changes the reach verdict", AC, "const policy = robotsPolicy(robotsFor(p.url), c.token).decide(p.url);", "const policy = /noindex|none/.test(p.html ?? \"\") ? { state: POLICY.DISALLOWED } : robotsPolicy(robotsFor(p.url), c.token).decide(p.url);", "C3 ·"],
  ["S12", "C4 only the declared AI crawlers with a documented token", AC, `.filter((c) => AI_CATEGORIES.includes(c?.category) && c?.tier === "OFFICIAL" && `, ".filter((c) => true && ", "C4 ·"],
  ["S13", "C4 an empty declaration is COULD-NOT-PROVE", AC, `if (!crawlers?.length) return Object.freeze({ verdict: "COULD_NOT_PROVE",`, `if (false) return Object.freeze({ verdict: "COULD_NOT_PROVE",`, "C4 ·"],
  ["S14", "C5 a page is decided only by its own origin's robots.txt", RD, "robotsFor: (url) => byOrigin.get(originOf(url)) ?? null", `robotsFor: () => createJsonlStore(robotsPath).readAll().filter((r) => r.record_type === "observation").sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0] ?? null`, "C5 ·"],
  ["S15", "C6 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C6 · THE ENTRY POINT"],
  ["S16", "C6 the entry point audits its OWN tenant", BIN, "readClientAiCrawlerAccess({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() })", `readClientAiCrawlerAccess({ tenantId: "tenant:ffffffffffffffffffffffffffffffff", resolve: createTenantResolver() })`, "C6 · THE ENTRY POINT"],
  ["S17", "C6 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C6 · the audit"],
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
  `F55 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f55-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
