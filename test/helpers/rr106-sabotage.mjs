/**
 * 🔴 RR-106 · THE RR-105 REPAIR — ONE SABOTAGE PER PROTECTION, AGAINST THE CODE LIVE NOW.
 *
 *   node test/helpers/rr106-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The method of test/helpers/rr104-sabotage.mjs: PRE-FLIGHT (each span exactly once), each sabotage ALONE, proved to have LANDED, its NAMED
 * test required red, restored by raw-byte sha256, the production trail hashed before and after. Evidence: runs/audit/rr106-sabotage-2026-09-30.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const A = "src/evidence/evidence-state-adapters.mjs", PF = "src/crawl/preflight.mjs", B = "bin/crawl.mjs";
const T = ["test/rr106-preflight-and-production-append.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const S1 = "§1 · response_headers is OBSERVED", S1F = "§1 · FIRING CONTROLS", S3 = "§3 · the PRODUCTION governed append COMMITS", S2 = "§2 · the PREFLIGHT drives", S2F = "§2 · FIRING CONTROL", S2B = "§2 · IN THE BINARY", V = "FIRING CONTROL: a failed or missing write";

const SABOTAGES = [
  ["A01", "STATE: response_headers has no rule again (the RR-105 defect)", A, '    case "response_headers": return ofResponseHeaders(record);\n', "", S1],
  ["A02", "STATE: page_links placed with no input", A, 'page_links: { inputs: (r) => (present(r.source_observation_id) ?', "page_links: { inputs: (r) => (true ?", S1F],
  ["A03", "STATE: a headers record placed without its evidence id", A, "if (!present(r.evidence_id)) return unmapped(", "if (false) return unmapped(", S1F],
  ["A04", "STATE: response_headers placed INFERRED, not OBSERVED", A, 'return place(rule, "OBSERVED", { evidenceRef: `response_headers:', 'return place(rule, "INFERRED", { evidenceRef: `response_headers:', S1],
  ["P01", "PREFLIGHT: a refusal is ignored", PF, "const ok = external.length === 0 && checks.every((c) => c.ok);", "const ok = external.length === 0;", S2F],
  ["P02", "PREFLIGHT: the evidence records are not handed to the builder", PF, "build.observations([...result.observations, ...result.evidence])", "build.observations([...result.observations])", S2],
  ["B01", "BINARY: the preflight is skipped on a live run", B, "\nif (live) {\n  const PF_INSTANT = ", "\nif (false) {\n  const PF_INSTANT = ", S2B],
  ["B02", "BINARY: a refused preflight does not stop the run", B, '    console.error("🔴 NO REQUEST WAS MADE. The run stops before the connector, the IPv6 probe, DNS or any fetch: a result that cannot be kept is not collected.");\n    process.exit(3);', '    console.error("🔴 NO REQUEST WAS MADE. The run stops before the connector, the IPv6 probe, DNS or any fetch: a result that cannot be kept is not collected.");', S2B],
  ["B03", "BINARY: the preflight checks a different builder from the live run", B, "observations: (records) => observationsAppend(records, PF_INSTANT, PF_CORRELATION),", "observations: (records) => ({ records }),", S2B],
  ["V01", "VERDICT: one failed write still reads KEPT", PF, "return failed.length === 0 && Object.keys(outcomes).length > 0 ?", "return failed.length <= 1 ?", V],
  ["V02", "VERDICT: the refused-append path reports success", B, "console.error(`🔴 COLLECTION: ${collectionVerdict({ observations: null }).verdict}", "console.log(`COLLECTION: KEPT", V],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `RR-106 repair sabotage run · ${new Date().toISOString()}`,
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
  const f = inEol(text, from);
  const at = text.indexOf(f);
  writeFileSync(join(REPO, file), text.slice(0, at) + inEol(text, to) + text.slice(at + f.length), "utf8");
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
writeFileSync(join(REPO, "runs", "audit", "rr106-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
