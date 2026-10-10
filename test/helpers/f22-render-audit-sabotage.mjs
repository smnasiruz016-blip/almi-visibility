/**
 * 🔴 F22 · THE JAVASCRIPT RENDERING AUDIT · ONE SABOTAGE PER CLAUSE LIMB (RR-137 §3).
 *
 *   node test/helpers/f22-render-audit-sabotage.mjs --deliberate      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f22-render-audit-sabotage-rr139-2026-10-03.txt (its own file).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const D = "src/audit/render-compare.mjs", P = "src/render/same-origin-policy.mjs", B = "bin/render-audit.mjs";
const T = ["test/f22-render-audit.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C2 = "C2 · against a PARTIAL", C3 = "C3 · four dimensions", C6 = "C6 · denominators", POL = "C4 · the live policy", BRW = "C4 · in the browser", GEN = "C1 · GENERIC", HASH = "C1 · a body whose bytes", LIVE = "C4 · the binary's live mode";

const SABOTAGES = [
  ["K1", "C2: no comparison against a non-COMPLETE render", D, "  if (renderState !== \"COMPLETE\") {\n", "  if (false) {\n", C2],
  ["K2", "C3: the render's links are read from the render", D, "extractLinks(elementsOnly(renderedHtml), pageUrl)", "extractLinks(elementsOnly(sourceHtml), pageUrl)", C3],
  ["K3", "C3: links are read from elements, not script text", D, "  const links = multisetDiff([...new Set(extractLinks(elementsOnly(sourceHtml), pageUrl))]", "  const links = multisetDiff([...new Set(extractLinks(sourceHtml, pageUrl))]", GEN],
  ["K4", "C3: an unparseable JSON-LD block is counted", D, "    try { blocks.push(canonicalJson(JSON.parse(m[2]))); } catch { unparseable += 1; }\n", "    try { blocks.push(canonicalJson(JSON.parse(m[2]))); } catch { }\n", C3],
  ["K5", "C6: a page without a body is in every dimension's NOT MEASURED", D, "      [NOT_MEASURED]: xs.filter((x) => x.state === NOT_MEASURED).length + pagesWithoutBody,\n", "      [NOT_MEASURED]: xs.filter((x) => x.state === NOT_MEASURED).length,\n", C6],
  ["K6", "C4: an undeclared host is refused", P, "      if (originOf(url) === null || !admits(url)) return refused(\"UNDECLARED_HOST\");\n", "      if (originOf(url) === null) return refused(\"UNDECLARED_HOST\");\n", POL],
  /* RR-138: re-pointed at the robots line LIVE NOW (RR-138 §2 rewrote it to name RUN_CAP when the ceiling is what failed robots) */
  /* RR-139: re-pointed again — the robots line now also releases the page's reserved slot */
  ["K7", "C4: robots rules are obeyed", P, "      if (!verdict.allowed) { made -= 1; return refused(sent >= maxTotal ? \"RUN_CAP\" : \"ROBOTS\"); }\n", "      if (false) { made -= 1; return refused(sent >= maxTotal ? \"RUN_CAP\" : \"ROBOTS\"); }\n", POL],
  ["K8", "C4: an oversized response is refused", P, "      if (res.truncated) return refused(\"SIZE_CAP\");\n", "", POL],
  /* RR-139: re-pointed — the old anchor (a run-wide delta) was the live run's defect and is gone; the per-call settle is the live line */
  ["K9", "C4: the cap counts requests started, hops and retries included", P, "      made += own.n - 1;\n", "      made += 0;\n", POL],
  ["K10", "C4: no response cache crosses pages", P, "  function forPage() {\n    const cache = new Map();\n", "  const shared = new Map();\n  function forPage() {\n    const cache = shared;\n", POL],
  ["K12", "C4: live mode needs the owner's green", B, "if (LIVE && !flag(\"i-have-the-owners-green\")) {\n", "if (false) {\n", LIVE],
  ["K13", "C1: a body is read only when its hash matches the batch's record", B, "  if (body === null || sha(body) !== o.content_sha256) { withoutBody += 1; continue; }\n", "  if (body === null) { withoutBody += 1; continue; }\n", HASH],
  ["K14", "C1: only pages of the subject's declared site are rendered", B, "  if (!SITE_ORIGINS.includes(new URL(o.value.final_url ?? o.value.requested_url).origin)) { offSite += 1; continue; }\n", "", HASH],
  ["K16", "C4: live mode requests the document itself through the policy", B, "      const doc = await pp.resolve(p.url);\n", "      const doc = { served: true, status: 200, contentType: \"text/html\", body: Buffer.from(p.body) };\n", "C4 · the binary's LIVE path"],
  ["K15", "C5: the render path never reads the sealed directory", B, "const store = lookupStore(rootIndexFor(process.env), \"RESEARCH\");\n", "existsSync(join(REPO, \"case-study-01\"));\nconst store = lookupStore(rootIndexFor(process.env), \"RESEARCH\");\n", LIVE],
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
  `F22 render-audit sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f22-render-audit-sabotage-rr139-2026-10-03.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
