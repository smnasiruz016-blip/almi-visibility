/**
 * 🔴 RR-138 §2 · THE SHARED RENDER COLLECTION · ONE SABOTAGE PER GUARD.
 *
 *   node test/helpers/rr138-render-collect-sabotage.mjs      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/rr138-render-collect-sabotage-<round>-<day>.txt, one file per round (2026-10-02, rr139, rr143), never overwritten.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const P = "src/render/same-origin-policy.mjs", B = "bin/render-collect.mjs", F = "src/render/render-preflight.mjs", RD = "src/render/render-evidence-reader.mjs", RN = "src/render/renderer.mjs", MA = "bin/mobile-audit.mjs";
const T = ["test/rr138-render-collect.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const R1 = "R1 · refused BEFORE", R2 = "R2 · the run", R3 = "R3 · the TOTAL", R4 = "R4 · each row", R6 = "R6 · the PREFLIGHT", R7 = "R7 · the TOTAL ceiling holds", R8 = "R8 · a script", R9 = "R9 · CONCURRENT", R10 = "R10 · with JavaScript OFF", R11 = "R11 · F25 C7 from stored evidence";

const SABOTAGES = [
  ["X1", "a third-party subresource is refused before it leaves", P, "      if (originOf(url) === null || !admits(url)) return refused(\"UNDECLARED_HOST\");\n", "      if (originOf(url) === null) return refused(\"UNDECLARED_HOST\");\n", R2],
  ["X2", "only GET or HEAD leaves — no login, payment or form submission", P, "      if (method !== \"GET\" && method !== \"HEAD\") return refused(\"METHOD_NOT_ALLOWED\");\n", "", R2],
  ["X3", "a 401/402/407 route is refused", P, "      if (AUTH_OR_PAYMENT_STATUSES.has(res.status)) return refused(\"AUTH_OR_PAYMENT\");\n", "", R2],
  ["X4", "the TOTAL ceiling is enforced where every request passes", P, "    if (sent >= maxTotal) return Promise.reject(new RunCapReached());\n", "", R7],
  ["X5", "a resource is fetched once per page however many renders read it", P, "      return cache.get(url) ?? resolve(url, opts);\n", "      return resolve(url, opts);\n", R2],
  ["X6", "no GREEN, no run", B, "if (!flag(\"live\") || !flag(\"i-have-the-owners-green\")) {\n", "if (false) {\n", R1],
  ["X7", "no storage permission, no run", B, "if (!permission.mayWrite) {\n", "if (false) {\n", R1],
  ["X8", "an evidence batch that is not clean is refused", B, "if (existsSync(RENDER_FILE)) {", "if (false) {", R1],
  ["X9", "the preflight asks F04 before any request", F, "      if (!decision?.allowed) throw", "      if (false) throw", R6],
  ["X10", "the preflight refuses an append-if-new record without a key", F, "        if (keyless > 0) throw", "        if (false) throw", R6],
  ["X11", "a row reads only the records that name it", RD, "    if (!Array.isArray(r.value.readBy) || !r.value.readBy.includes(row)) { notForThisRow += 1; continue; }\n", "", R4],
  ["X12", "a stored body is read only when its hash holds", RD, "      if (bytes === null || sha(bytes) !== want) { unverified += 1; return null; }\n", "      if (bytes === null) { unverified += 1; return null; }\n", R4],
  ["X13", "a script cannot send the render elsewhere", RN, "        if (documentServed && req.isNavigationRequest() && req.frame().parentFrame() === null) {\n", "        if (false) {\n", R8],
  /* RR-139 · the two defects the live run exposed */
  ["X14", "a page counts only its OWN requests (the run-wide delta the live run used is reinstated)", P, "      const res = await perCall.run(own, () => fetcher.fetchUrl(url));\n      made += own.n - 1;\n", "      const b0 = fetcher.requestsIssued();\n      const res = await fetcher.fetchUrl(url);\n      made += fetcher.requestsIssued() - b0 - 1;\n", R9],
  ["X15", "an unrouted request that loaded nothing is counted REFUSED, not unaccounted", RN, "  const neverLoaded = unrouted.filter((r) => failedNoResponse.has(r) && !responded.has(r));\n", "  const neverLoaded = [];\n", R10],
  ["X16", "a slot is reserved before the await, so concurrent calls cannot all pass the cap", P, "      made += 1;\n      const verdict = await robots.check(url);\n      if (!verdict.allowed) { made -= 1; return", "      const verdict = await robots.check(url);\n      if (!verdict.allowed) { return", R9],
  /* RR-143 · F25 C7: the population read from stored evidence is every page of the source batch, not the rendered ones alone */
  ["X17", "F25 counts a page with no stored render in its population (NOT MEASURED), never only the rendered pages", MA, "  const out = pages.map((p) => { const e = ev.byPage.get(p.id); return e ?", "  const out = collected.map((p) => { const e = ev.byPage.get(p.id); return e ?", R11],
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
  `RR-138 render-collect sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "rr138-render-collect-sabotage-rr143-2026-10-03.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
