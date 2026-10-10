/**
 * 🔴 F26 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs b1a94e7 EVIDENCE; RR-95 §3).
 *
 *   node test/helpers/f26-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f26-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AX = "src/audit/accessibility.mjs", BIN = "bin/accessibility.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f26-accessibility.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 an image with no alternative is found", AX, `if (alt === null) machine["img-alt"]++;`, "if (false) {}", "C1 · every declared"],
  ["S2", "C1 a missing page language is found", AX, `if (!html0 || !filled(attr(html0, "lang"))) machine["page-lang"]++;`, "", "C1 · every declared"],
  ["S3", "C1 a missing or empty title is found", AX, `if (!title || !filled(text(title[1]))) machine["page-title"]++;`, "if (false) {}", "C1 · every declared"],
  ["S4", "C1 an unnamed link is found", AX, `if (hasName(m[1], m[2], ids)) person["name-adequate"]++; else machine["link-name"]++;\n  }\n  for (const m of s.matchAll(/(<button`, `person["name-adequate"]++;\n  }\n  for (const m of s.matchAll(/(<button`, "C1 · every declared"],
  ["S5", "C1 an unnamed button is found", AX, `if (hasName(m[1], m[2], ids)) person["name-adequate"]++; else machine["button-name"]++;`, `person["name-adequate"]++;`, "C1 · every declared"],
  ["S6", "C1 an unnamed frame is found", AX, `person["name-adequate"]++; else machine["frame-name"]++;`, `person["name-adequate"]++; else {}`, "C1 · every declared"],
  ["S7", "C1 markup inside script, style, template or a comment is never read", AX, `.replace(/<(script|style|template)\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>/gi, " ");`, ";", "C1 · every declared"],
  ["S8", "C1 a truncated body is NOT MEASURED", AX, ` || p.truncated === true) return`, `) return`, "C1 · FIRING CONTROL"],
  ["S9", "C2 a decorative claim is located for a person, never dropped", AX, `if (hidden(m[0]) || role === "presentation" || role === "none") person["decorative-claim"]++;`, `if (hidden(m[0]) || role === "presentation" || role === "none") {}`, "C2 ·"],
  ["S10", "C2 a present alternative goes to a person, never to the machine count", AX, `else person["alt-adequate"]++;`, `else machine["img-alt"]++;`, "C2 ·"],
  ["S11", "C4 no page is ever PROVED", AX, `verdict: failures > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE`, `verdict: failures > 0 ? VERDICT.DISPROVED : "PROVED"`, "C4 ·"],
  ["S12", "C4 a machine failure makes a page DISPROVED", AX, `verdict: failures > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE`, `verdict: VERDICT.COULD_NOT_PROVE`, "C4 ·"],
  ["S13", "C3 the stored-body exclusion is stated", AX, `export const STORED_BODY_EXCLUDES = "script-inserted content, styles (colour, size, visibility, order) and interaction (keyboard, focus, state)";`, `export const STORED_BODY_EXCLUDES = "";`, "C3 ·"],
  ["S14", "C5 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C5 · THE ENTRY POINT"],
  ["S15", "C5 the entry point assesses its OWN tenant", BIN, "readClientAccessibility({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() })", `readClientAccessibility({ tenantId: "tenant:ffffffffffffffffffffffffffffffff", resolve: createTenantResolver() })`, "C5 · THE ENTRY POINT"],
  ["S16", "C5 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C5 · the assessment"],
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
  `F26 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f26-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
