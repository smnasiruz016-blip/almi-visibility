/**
 * 🔴 F22 · ACCEPTANCE AMENDMENT 1 · THE CLIENT'S BUILT PAGES, RENDERED — ONE SABOTAGE PER FAILURE LIMB of C1 to C6 (the detector in
 * src/audit/render-compare.mjs, the population and audit in src/render/built-page-render.mjs, the GREEN's bounds in src/render/same-origin-
 * policy.mjs and config/audit/live-render-green.mjs, bin/render-built-pages.mjs).
 *
 *   node test/helpers/f22-built-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now. Then each sabotage replaces its span ALONE, proves it
 * LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before
 * and after. Evidence: runs/audit/f22-built-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = "src/audit/render-compare.mjs", J = "src/render/built-page-render.mjs", P = "src/render/same-origin-policy.mjs", B = "bin/render-built-pages.mjs", G = "config/audit/live-render-green.mjs";
const T = ["test/f22-built-render.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C3 = "C3 · SEVEN DIMENSIONS · FIRING CONTROL (F22 A1)", C2 = "C2 C6 · FIRING CONTROL (F22 A1)", IN = "INPUT · POPULATION · FIRING CONTROL (F22 A1)", C4 = "C4 · THE GREEN'S BOUNDS · FIRING CONTROL (F22 A1)",
  C1P = "C1 · PRODUCTION PATH (F22 A1)", C4P = "C4 · PRODUCTION PATH (F22 A1)", C5 = "C5 · THE SEALED EXAM RULE (F22 A1)";

/* [id, limb, file, span, replacement, the test that must turn red] */
const SABOTAGES = [
  ["B01", "C3 a title a script changes is missed", D, "      TITLE: verdict(multisetDiff(titlesIn(sourceHtml), titlesIn(renderedHtml))),", "      TITLE: verdict(multisetDiff([], [])),", C3],
  ["B02", "C3 an H1 a script adds is missed", D, "      H1: verdict(multisetDiff(h1sIn(sourceHtml), h1sIn(renderedHtml))),", "      H1: verdict(multisetDiff([], [])),", C3],
  ["B03", "C3 a robots value a script changes or removes is missed", D, "      ROBOTS_META: verdict(multisetDiff(robotsMetaIn(sourceHtml), robotsMetaIn(renderedHtml))),", "      ROBOTS_META: verdict(multisetDiff([], [])),", C3],
  ["B04", "C3 only the frozen four dimensions are compared", D, 'export const DIMENSIONS = Object.freeze(["TITLE", "H1", "CONTENT", "LINKS", "STRUCTURED_DATA", "CANONICAL", "ROBOTS_META"]);', 'export const DIMENSIONS = Object.freeze(["CONTENT", "LINKS", "STRUCTURED_DATA", "CANONICAL"]);', C3],
  ["B05", "C3 the same text written two ways is invented as a difference", D, "  .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,", "  .replace(/(?!)/gi,", C3],
  ["B06", "C3 a title in the body (an SVG's) is invented as the document's", D, "const headOf = (html) => /<head\\b[^>]*>([\\s\\S]*?)<\\/head\\s*>/i.exec(html)?.[1] ?? html;", "const headOf = (html) => html;", C3],
  ["B07", "C2 a PARTIAL render is compared", D, '  if (renderState !== "COMPLETE") {', '  if (renderState === "FAILED") {', C2],
  ["B08", "C6 a page with no stored render is not counted", J, "    const absent = ids.filter((id) => !latest.has(id)).length;", "    const absent = 0;", C2],
  ["B09", "C2 an earlier render of a page is judged in place of its latest", J, "ids.includes(r.pageId)) latest.set(r.pageId, r);", "ids.includes(r.pageId) && !latest.has(r.pageId)) latest.set(r.pageId, r);", C2],
  ["B10", "C6 an empty population is not named empty", J, "  const empty = Object.values(out).every((m) => m.pages === 0);", "  const empty = false;", C2],
  ["B11", "INPUT a LIVE page whose published bytes differ is rendered as published", J, '      else if (pub.sha256 !== record.publishedSha256) refused = "PUBLISHED_BYTES_DIFFER";\n', "", IN],
  ["B12", "INPUT a LIVE page is rendered as built, not as published", J, "      else html = pub.html;", "      else html = record.html;", IN],
  ["B13", "INPUT a file whose bytes are not the recorded ones is served", J, "if (bytes === null || sha256(bytes) !== a.sha256) continue;", "if (bytes === null) continue;", IN],
  ["B14", "INPUT a file the record does not name is served", J, "  const f = job.files.get(url);", "  const f = job.files.get(url) ?? [...job.files.values()][0];", IN],
  ["B15", "C4 a failed request is retried under the GREEN", P, "    if (noRetry && own?.failed) return Promise.reject(new NoRetry());\n", "", C4],
  ["B16", "C4 the GREEN's interval is widened away", G, "  intervalMs: 2000,", "  intervalMs: 1000,", C4],
  ["B17", "C4 a live render requests a subresource outside the GREEN", B, 'subresources: (u) => (LIVE_RENDER_GREEN.pagesOnly ? { served: false, refusal: "OUTSIDE_THE_GREEN" } : pp.resolve(u)) });', "subresources: (u) => pp.resolve(u) });", C4P],
  ["B18", "C4 a limit above the GREEN's is taken", B, "LIMIT >= 1 && LIMIT <= LIVE_RENDER_GREEN.maxRequests", "LIMIT >= 1", C4P],
  ["B19", "C4 the run goes on when its requests outnumber the limit", B, "  if (live && targets.length + 1 > LIMIT) {", "  if (false) {", C4P],
  ["B20", "C4 a live run goes on without --confirm", B, '  if (!process.argv.includes("--confirm")) {', "  if (false) {", C4P],
  ["B21", "C1 an offline page is rendered without the files its record names (PARTIAL)", B, "readVisibleText: true, subresources: offlineFiles(t) });\n        const source", "readVisibleText: true });\n        const source", C1P],
  ["B22", "C1 a render is stored under another tenant", B, "tenantId: SCOPE.tenantId, pageId: t.pageId,", 'tenantId: "tenant:00000000000000000000000000000bad", pageId: t.pageId,', C1P],
  ["B23", "C6 the output carries a page address", B, "  console.log(`  rendered     ${reads.length} page(s)", "  console.log(reads.map((r) => r.url).join(\" \")); console.log(`  rendered     ${reads.length} page(s)", C1P],
  ["B24", "C5 the render path names a sealed directory", B, 'const STORE_FILE = "built-page-renders.jsonl";', 'const STORE_FILE = "built-page-renders.jsonl"; const SEALED_DIR = "exam-bank";', C5],
];

/* --only=<id>: one limb, applied alone (FAST MODE F10: a limb is re-run on its own) */
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
if (ONLY !== null && !SABOTAGES.some((x) => x[0] === ONLY)) { console.error(`no limb ${ONLY}`); process.exit(2); }
const RUN = ONLY === null ? SABOTAGES : SABOTAGES.filter((x) => x[0] === ONLY);
const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F22 built-render sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 600 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of RUN) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], reasons = "";
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 600000 });
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
lines.push("", `proved ${proved} of ${RUN.length}${ONLY === null ? "" : ` (--only=${ONLY}; ${SABOTAGES.length} limbs in all)`} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f22-built-sabotage", lines.join("\n") + "\n")}`);
