/**
 * 🔴 F41 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 454396e EVIDENCE; RR-87).
 *
 *   node test/helpers/f41-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f41-sabotage-2026-09-29.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CB = "src/page/content-brief.mjs", EV = "src/page/content-brief-evidence.mjs", BIN = "bin/page-briefs.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f41-content-brief.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 no approval, no brief", CB, "if (!approval) return Object.freeze({ subject, state: BRIEF_STATE.NOT_ISSUED,", "if (false) return Object.freeze({ subject, state: BRIEF_STATE.NOT_ISSUED,", "C1 ·"],
  ["S2", "C1 the approval is of THIS action", CB, " && decision.actions.some((x) => x.action === a.action)", "", "C1 ·"],
  ["S3", "C1 the approval is for THIS subject", CB, "a.subject?.kind === subject.kind && a.subject?.id === id && ", "", "C1 ·"],
  ["S4", "C1 the approval is recorded (has a ref)", CB, "approvals.find((a) => recorded(a) && ", "approvals.find((a) => ", "C1 ·"],
  ["S5", "C1 CANNOT DECIDE is NOT ISSUED for want of an action", CB, `if (decision.decision !== "CHOSEN" || decision.actions.length === 0) return`, "if (false) return", "C1 ·"],
  ["S6", "C1 approvals are passed, never defaulted", CB, `if (!Array.isArray(approvals)) throw new TypeError("approvals must be passed explicitly`, `if (false) throw new TypeError("approvals must be passed explicitly`, "C1 ·"],
  ["S7", "C2 recorded evidence carries a ref", CB, `const recorded = (x) => x && typeof x.ref === "string" && x.ref !== "";`, "const recorded = (x) => Boolean(x);", "C2 ·"],
  ["S8", "C2 intent only from the recorded need", CB, "s.intent = recorded(e.need) && e.need.value ?", "s.intent = true ?", "C2 ·"],
  ["S9", "C2 internal links need a COMPLETE inventory", CB, `e.links.completeness === "COMPLETE" && `, "", "C2 ·"],
  ["S10", "C3 a fact needs a source", CB, `const why = !hasSource ? "NO_SOURCE" :`, `const why = false ? "NO_SOURCE" :`, "C3 ·"],
  ["S11", "C3 a fact must be VERIFIED", CB, `: f.verificationState !== "VERIFIED" ? "NOT_VERIFIED"`, `: false ? "NOT_VERIFIED"`, "C3 ·"],
  ["S12", "C3 a fact must be fresh enough", CB, ": !FRESH_ENOUGH.includes(fresh) ? `FRESHNESS_${fresh}`", ": false ? `FRESHNESS_${fresh}`", "C3 ·"],
  ["S13", "C4 READY only when complete", CB, "state: missingSections.length ? BRIEF_STATE.INCOMPLETE : BRIEF_STATE.READY,", "state: BRIEF_STATE.READY,", "C4 ·"],
  ["S14", "C4 every missing section named", CB, "missing: Object.freeze(missingSections.map((k) => `${k}: ${s[k].missing}`)),", "missing: Object.freeze([]),", "C4 ·"],
  ["S15", "C6 competitor evidence is a diagnostic, never a length", CB, "diagnostics: Object.freeze((e.competitorInputs ?? []).filter(recorded).map((c) => c.ref)),", "diagnostics: Object.freeze([]), words: (e.competitorInputs ?? []).map((c) => c.words),", "C5/C6 ·"],
  ["S16", "REAL the real need reaches the brief", EV, "need: covered ? { value: covered, ref: `F33:COVERS:${pageId}` } : null,", "need: null,", "REAL ·"],
  ["S17", "C7 the entry point prints its bound", BIN, "console.log(`  bound            ${r.bound}`);", "console.log(\"  bound\");", "C7 · THE ENTRY POINT"],
  ["S18", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 · the brief"],
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
  `F41 sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f41-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
