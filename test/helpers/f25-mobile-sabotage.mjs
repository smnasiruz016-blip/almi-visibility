/**
 * 🔴 F25 · MOBILE READINESS · ONE SABOTAGE PER CLAUSE LIMB (RR-137 §4).
 *
 *   node test/helpers/f25-mobile-sabotage.mjs      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f25-mobile-sabotage-<round>-<day>.txt, one file per round (rr137, rr144), never overwritten.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/audit/mobile-readiness.mjs", B = "bin/mobile-audit.mjs", R = "src/render/renderer.mjs";
const T = ["test/f25-mobile-readiness.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C2 = "C2 · the viewport", C3 = "C3 · against a PARTIAL", C4 = "C4 · overflow", C5 = "C5 · WCAG", C6 = "C6 · words", BRW = "C4 · C5 · C6 · in a real browser", GEN = "C1 · GENERIC", HASH = "C1 · a body whose hash", LIVE = "C1 · the live mode", A1 = "C3 · AMENDMENT 1";

const SABOTAGES = [
  ["M1", "C2: comments and scripts are not read for the viewport", M, "  const metas = [...elementsOnly(html).matchAll(", "  const metas = [...String(html ?? \"\").matchAll(", C2],
  ["M2", "C2: user-scalable=no restricts zoom", M, "  const zoomRestricted = props[\"user-scalable\"] === \"no\" || ", "  const zoomRestricted = ", C2],
  ["M3", "C2: a maximum-scale below 2 restricts zoom", M, "(max !== null && Number.isFinite(max) && max < 2)", "false", C2],
  ["M4", "C2: several declarations are counted, never resolved", M, "  if (metas.length > 1) return { state: \"MULTIPLE\", count: metas.length };\n", "", C2],
  /* RR-144: re-anchored — RR-144 rewrote the C3 guard into measurableBasisOf (Amendment 1); the old span matched 0 times */
  ["M5", "C3: overflow only from a COMPLETE mobile render", M, "  const b = measurableBasisOf(mobile, ownHosts);\n  if (!b || !mobile.layout) return nm(mobile, \"responsive rendering\");\n", "  const b = { basis: \"COMPLETE\" };\n  if (!mobile?.layout) return nm(mobile, \"responsive rendering\");\n", C3],
  ["M6", "C4: the overflow is measured", M, "  const over = Math.max(0, Math.round(mobile.layout.scrollWidth - mobile.layout.viewportWidth));\n", "  const over = 0;\n", C4],
  ["M7", "C5: a small target is undersized only when its circle meets another", M, "    if (hits) undersized += 1;\n", "    undersized += 1;\n", C5],
  ["M8", "C5: invisible elements are not targets", M, "  const ts = mobile.layout.targets.filter((t) => t.visible && t.w > 0 && t.h > 0);\n", "  const ts = mobile.layout.targets.filter((t) => t.w > 0 && t.h > 0);\n", C5],
  /* RR-144: re-anchored with M5 — the desktop render's measurability is decided by measurableBasisOf now */
  ["M9", "C6: mobile content needs the desktop render COMPLETE too", M, "  const bd = measurableBasisOf(desktop, ownHosts);\n", "  const bd = measurableBasisOf(desktop, ownHosts) ?? { basis: \"COMPLETE\" };\n", C3],
  ["M10", "C7: any NOT MEASURED makes the population INCOMPLETE", M, "  out.incomplete = pagesWithoutBody > 0 || ", "  out.incomplete = false && ", C6],
  ["M11", "C4: the layout viewport, not the zoomed visual one", R, "viewportWidth: document.documentElement.clientWidth, targets };", "viewportWidth: window.innerWidth, targets };", BRW],
  ["M12", "C1: a body is read only when its hash matches", B, "  if (body === null || sha(body) !== o.content_sha256) { withoutBody += 1; continue; }\n", "  if (body === null) { withoutBody += 1; continue; }\n", HASH],
  ["M13", "C1: only pages of the declared site", B, "  if (!SITE_ORIGINS.includes(new URL(o.value.final_url ?? o.value.requested_url).origin)) { offSite += 1; continue; }\n", "", HASH],
  ["M14", "C7: with nothing measured the target count is NOT MEASURED, never 0", B, "measuredTargetPages ? `${s.tapTargets.undersized} of ${s.tapTargets.targets} measured target(s)` : NOT_MEASURED", "`${s.tapTargets.undersized} of ${s.tapTargets.targets} measured target(s)`", HASH],
  ["M15", "C1: live mode needs the owner's green", B, "if (LIVE && !flag(\"i-have-the-owners-green\")) {\n", "if (false) {\n", LIVE],
  /* RR-144 · Amendment 1 (24cd44f): each limb of OWN-SITE COMPLETE, and the duty to report what was refused */
  ["M16", "A1: a refusal on the page's OWN site disqualifies", M, "    if (ownHosts.has(host)) return null;\n", "", A1],
  ["M17", "A1: a render that did not settle in time disqualifies", M, "render.timedOut !== false || ", "", A1],
  ["M18", "A1: the refusals are accounted for by host", M, "  if (outside !== render.requests.refused) return null;\n", "", A1],
  ["M19", "A1: a measure from an OWN-SITE COMPLETE render carries its refusals", M, "{ basis: b.basis, refusedOutside: b.refusedOutside, refusedByReason: b.refusedByReason }", "{ basis: b.basis }", A1],
  ["M20", "A1: the summary counts the refused requests of OWN-SITE COMPLETE renders", M, "    ownSite.refusedOutside += b.refusedOutside;\n", "", A1],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F25 mobile sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
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
  const ok = landed && red && restored && !/SyntaxError/.test(reasons);
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
restoreAll();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f25-mobile-sabotage-rr144-2026-10-03.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
