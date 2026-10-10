/**
 * 🔴 F23 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs d3c8e79 EVIDENCE; RR-111 §6).
 *
 *   node test/helpers/f23-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f23-sabotage-2026-10-01.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LA = "src/audit/link-audit.mjs", RD = "src/audit/link-audit-reader.mjs", BIN = "bin/link-audit.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f23-link-audit.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 comments, script, style and template are not links", LA, "const body = scannable(html);", "const body = String(html);", "C1 · every <a href>"],
  ["S2", "C1 a fragment, mailto, tel or javascript href is not a link", LA, "if (SKIPPED_HREF(href)) continue;", "if (href === null) continue;", "C1 · every <a href>"],
  ["S3", "C1 a name is never attached to an anchor it cannot be aligned with", LA, "const aligned = named.length === opened.length && named.every((l, i) => l.to === opened[i]);", "const aligned = true;", "C1 · FIRING CONTROL"],
  ["S4", "C1 a page with no stored body is named", LA, "if (absentPages) absent.push(", "if (false) absent.push(", "C1 · a page with no stored body"],
  ["S5", "C1 a truncated body makes a part unprovable", LA, "const complete = absentPages === 0 && truncatedPages === 0;", "const complete = absentPages === 0;", "C1 · a page with no stored body"],
  ["S6", "C2 a 4xx target is BROKEN", LA, `if (s.state === "CLIENT_ERROR" || s.state === "SERVER_ERROR") return STATE.BROKEN;`, `if (s.state === "SERVER_ERROR") return STATE.BROKEN;`, "C2 · each recorded"],
  ["S7", "C2 a robots skip is NOT MEASURED whatever it carries", LA, "if (!rec || rec.skipped) return STATE.NOT_MEASURED;", "if (!rec) return STATE.NOT_MEASURED;", "C2 · each recorded"],
  ["S8", "C2 two records that disagree are NOT MEASURED", LA, "return states.size === 1 ? [...states][0] : STATE.NOT_MEASURED;", "return [...states][0] ?? STATE.NOT_MEASURED;", "C2 · each recorded"],
  ["S9", "C2 a 3xx target is REDIRECTED", LA, `if (s.state === "OTHER" && s.status >= 300 && s.status < 400) return STATE.REDIRECTED;`, "", "C2 · each recorded"],
  ["S10", "C2 a same-host link is internal", LA, "const side = target !== null && new URL(target).host === host ? internal : external;", "const side = external;", "C2 · FIRING CONTROL"],
  ["S11", "C2 the reader lists an observation under its final URL too", RD, "[o.value?.requested_url, o.value?.final_url]", "[o.value?.requested_url]", "C2 · the reader lists"],
  ["S12", "C3 an unmeasured class is never printed as 0", LA, "const classes = measured === 0", "const classes = false", "C3 · FIRING CONTROL"],
  ["S13", "C3/C7 a part with any NOT MEASURED link is never PROVED", LA, "n > 0 && unmeasured === 0 && complete", "n > 0 && complete", "C3 · FIRING CONTROL"],
  ["S14", "C4 an aria-labelledby name is NOT MEASURED, never nameless", LA, `if (l.name === null || l.name.accessibleNameSource === "NOT_MEASURED_ARIA_LABELLEDBY") anchor.notMeasured += 1;`, "if (l.name === null) anchor.notMeasured += 1;", "C4 · FIRING CONTROL"],
  ["S15", "C4 a link with no accessible name is an ANCHOR PROBLEM", LA, "else if (l.name.accessibleName === null) anchor.nameless += 1;", "else if (false) anchor.nameless += 1;", "C4 · FIRING CONTROL"],
  ["S16", "C5 zero inbound is named UNKNOWN, never orphan", LA, "if (zero) absent.push(", "if (false) absent.push(", "C5 ·"],
  ["S17", "C6 no excessive boundary is invented", LA, "excessive: { notMeasured: withBody, denominator: withBody, missing: MISSING.excessive, verdict: VERDICT.COULD_NOT_PROVE },", "excessive: { notMeasured: withBody, denominator: withBody, missing: MISSING.excessive, verdict: links > 100 ? VERDICT.DISPROVED : VERDICT.PROVED },", "C6 ·"],
  ["S18", "C7 an empty population is never PROVED", LA, "n > 0 && unmeasured === 0 && complete", "unmeasured === 0 && complete", "C7 ·"],
  ["S19", "C7 the row is never PROVED while any part is not", LA, "verdicts.every((v) => v === VERDICT.PROVED)", "verdicts.some((v) => v === VERDICT.PROVED)", "C7 ·"],
  ["S20", "C1 the entry point audits its OWN tenant", BIN, "readClientLinkAudit({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() })", `readClientLinkAudit({ tenantId: "tenant:ffffffffffffffffffffffffffffffff", resolve: createTenantResolver() })`, "C1 · THE ENTRY POINT"],
  ["S21", "C1 the entry point prints its bound", BIN, "console.log(`  bound        ${r.bound}`);", `console.log("  bound");`, "C1 · THE ENTRY POINT"],
  ["S22", "C1 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C1 · the audit and its reader"],
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
  `F23 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f23-sabotage-2026-10-01.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
