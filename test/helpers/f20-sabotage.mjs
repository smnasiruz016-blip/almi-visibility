/**
 * 🔴 F20 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs f566059 EVIDENCE; RR-96 §4).
 *
 *   node test/helpers/f20-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f20-sabotage-2026-09-30.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const UA = "src/audit/url-audit.mjs", BIN = "bin/url-audit.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f20-url-audit.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 a recorded fetch error is NOT MEASURED, never broken", UA, `if (v?.error) return { state: "NOT_MEASURED", missing: "a successful fetch — the recorded fetch failed" };`, `if (v?.error) return { state: "SERVER_ERROR" };`, "C1 ·"],
  ["S2", "C1 a 4xx is a client error", UA, `if (s >= 400 && s < 500) return { state: "CLIENT_ERROR", status: s };`, "", "C1 ·"],
  ["S3", "C1 an observed page reached in another form is not linked-only", UA, ".filter((t) => t && !observedKeys.has(formKey(t)) )", ".filter((t) => t)", "C1 ·"],
  ["S4", "C2 a repeated location is a LOOP", UA, `if (h !== null && seen.has(h)) return { state: "LOOP", hops: hops.length };`, "", "C2 ·"],
  ["S5", "C2 no recorded chain is NOT MEASURED", UA, `if (!Array.isArray(v?.redirect_chain)) return { state: "NOT_MEASURED", missing: "a recorded redirect chain" };`, `if (!Array.isArray(v?.redirect_chain)) return { state: "NONE", hops: 0 };`, "C2 ·"],
  ["S6", "C2 a loop disproves the audit", UA, `o.redirects.state === "LOOP"`, "false", "C2 ·"],
  ["S7", "C3 whitespace, a backslash or a control character is malformed", UA, `if (/[\\s\\\\]/.test(raw) || /[\\u0000-\\u001f\\u007f]/.test(raw)) return`, "if (false) return", "C3 ·"],
  ["S8", "C3 a string the WHATWG parser rejects is malformed", UA, `catch { return { form: "MALFORMED", why: "rejected by the WHATWG URL parser" }; }`, `catch { return { form: "WELL_FORMED", url: raw }; }`, "C3 ·"],
  ["S9", "C3 a non-web scheme is counted apart", UA, `if (NON_WEB.test(raw.trim())) return { form: "NON_WEB" };`, "", "C3 ·"],
  ["S10", "C4 a page linked in two forms is INCONSISTENT", UA, "const linkedInMoreThanOneForm = [...linkedForms.values()].filter((s) => s.size > 1).length;", "const linkedInMoreThanOneForm = 0;", "C4 ·"],
  ["S11", "C4 a canonical naming another form is INCONSISTENT", UA, `else if (new URL(c).href.replace(/#.*$/, "") !== new URL(finalUrl).href.replace(/#.*$/, "")) canonicalInconsistent++;`, "", "C4 ·"],
  ["S12", "C4 no canonical is NOT MEASURED, never consistent", UA, "if (!canonical) { canonicalMissing++; continue; }", "if (!canonical) { continue; }", "C4 ·"],
  ["S13", "C5 PROVED only when nothing is open", UA, "verdict: findings > 0 ? AUDIT_VERDICT.DISPROVED : open ? AUDIT_VERDICT.COULD_NOT_PROVE : AUDIT_VERDICT.PROVED", "verdict: findings > 0 ? AUDIT_VERDICT.DISPROVED : AUDIT_VERDICT.PROVED", "C5 · FIRING CONTROL"],
  ["S14", "C5 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C5 · THE ENTRY POINT"],
  ["S15", "C5 the entry point audits its OWN tenant", BIN, "readClientUrlAudit({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() })", `readClientUrlAudit({ tenantId: "tenant:ffffffffffffffffffffffffffffffff", resolve: createTenantResolver() })`, "C5 · THE ENTRY POINT"],
  ["S16", "C5 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C5 · the audit"],
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
  `F20 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f20-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
