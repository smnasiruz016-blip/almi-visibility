/**
 * 🔴 F27 C5 · HEADERS BY PAGE TYPE · ONE SABOTAGE PER SAFEGUARD (RR-129 §3).
 *
 *   node test/helpers/f27-header-sabotage.mjs      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f27-header-sabotage-rr129-2026-10-02.txt (its own file).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HA = "src/audit/header-assessment.mjs", TS = "src/audit/transport-security.mjs", RD = "src/audit/transport-security-reader.mjs";
const T = ["test/f27-header-assessment.test.mjs", "test/f27-transport-security.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const APPLIES = "C5 · FIRING CONTROL: a header applies only where", UNREC = "C5 · FIRING CONTROL: a header the collector never recorded", ABSENT = "C5 · FIRING CONTROL: ABSENT only where", FRAME = "C5 · FIRING CONTROL: frame protection", OWN = "C5 · FIRING CONTROL: on a REAL partition", AUDIT = "C5 · the audit judges each page";

const SABOTAGES = [
  ["H1", "HSTS applies only to pages served over HTTPS", HA, "case \"SERVED_OVER_HTTPS\": return scheme === null ? null : scheme === \"https:\";", "case \"SERVED_OVER_HTTPS\": return true;", APPLIES],
  ["H2", "CSP applies only where the page runs script", HA, "case \"HTML_RUNS_SCRIPT\": return seen(SCRIPT);", "case \"HTML_RUNS_SCRIPT\": return true;", APPLIES],
  ["H3", "a truncated body that does not show the behaviour is NOT MEASURED", HA, "re.test(html) ? true : page.truncated ? null : false", "re.test(html) ? true : false", APPLIES],
  ["H4", "an unrecorded header is NOT MEASURED, never ABSENT", HA, "  return { state: NOT_MEASURED, why: r.fact };", "  return { state: \"ABSENT\" };", UNREC],
  ["H5", "frame protection behind a recorded CSP is NOT MEASURED", HA, "  if (h.frameProtection && recordedHeader(page.observation, \"content-security-policy\").state === \"RECORDED\") {", "  if (false) {", FRAME],
  ["H6", "an applicable ABSENT disproves", HA, "const verdict = absent > 0 ? \"DISPROVED\"", "const verdict = false ? \"DISPROVED\"", ABSENT],
  ["H7", "an empty population never reads PROVED", HA, "unmeasured === 0 && pages.length > 0 ?", "unmeasured === 0 ?", ABSENT],
  ["H8", "the audit judges under the declaration", TS, "    headers: declaration\n      ?", "    headers: false\n      ?", AUDIT],
  ["H9", "each fetched page carries its OWN observation", RD, "    observation: byId.get(p.body_observation_id) ?? null,", "    observation: null,", OWN],
  ["H10", "an undeclared condition is refused", HA, "    default: throw Object.assign(new Error(`HEADER_CONDITION_UNDECLARED: ${condition}`), { code: \"HEADER_CONDITION_UNDECLARED\" });", "    default: return true;", APPLIES],
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
  `F27 header assessment sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f27-header-sabotage-rr129-2026-10-02.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
