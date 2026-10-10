/**
 * 🔴 F87 · THE OPERATOR OVERVIEW (RR-130 §2) · ONE SABOTAGE PER SAFEGUARD.
 *
 *   node test/helpers/f87-operator-sabotage.mjs --deliberate      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f87-operator-sabotage-rr130-2026-10-02.txt (its own file).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OV = "src/ops/operator-overview.mjs", RD = "src/ops/operator-overview-reader.mjs", B = "bin/operations-overview.mjs";
const T = ["test/f87-operator-overview.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const P1 = "1 · FIRING CONTROL", P2 = "2 · FIRING CONTROL", P3 = "3 · FIRING CONTROL", P4 = "4 · FIRING CONTROL", REAL = "REAL · the operator overview", AUTH = "the operator read is AUTHORISED", ENTRY = "THE ENTRY POINT: refuses";

const SABOTAGES = [
  ["O1", "a released value carries no URL, host, identifier, quote or question character", OV, "const PERMITTED_TEXT = /^[A-Za-z][A-Za-z0-9 _'(),—-]{0,159}$/;", "const PERMITTED_TEXT = /^[\\s\\S]*$/;", P1],
  ["O2", "a field outside counts and codes is refused before print", OV, "  if (bad.length) throw Object.assign(", "  if (false) throw Object.assign(", P1],
  ["O3", "render prints only an overview that passed the check", OV, "export function renderOverview(o) {\n  assertOverview(o);", "export function renderOverview(o) {", P1],
  ["O4", "an attribution naming no tenant is charged to no one", OV, "if (a.state === \"ATTRIBUTED\" && typeof a.tenantId === \"string\" && a.tenantId !== \"\") {", "if (a.state === \"ATTRIBUTED\") {", P3],
  ["O5", "a contested batch member is UNATTRIBUTED", OV, "[UNATTRIBUTED]: arithmetic.undeclared + arithmetic.ambiguous,", "[UNATTRIBUTED]: arithmetic.undeclared,", P2],
  ["O6", "facts are never read across tenants — NOT MEASURED here", OV, "staleness: { facts: NOT_MEASURED,", "staleness: { facts: 0,", P4],
  ["O7", "no recorded failure reads UNPROVED, never passed", OV, "recovery.recordedFailures === 0 ? \"no real recorded mid-write failure — recovery UNPROVED, not passed\"", "recovery.recordedFailures === 0 ? \"recovery proved\"", P4],
  ["O8", "the operator read is decided at GLOBAL_PRODUCT scope", OV, "export const OPERATOR_SCOPE = Object.freeze({ scopeType: \"GLOBAL_PRODUCT\",", "export const OPERATOR_SCOPE = Object.freeze({ scopeType: \"TENANT\",", AUTH],
  ["O9", "a refused actor reads nothing", B, "if (!decision.allowed) {", "if (false) {", ENTRY],
  ["O10", "the batch is attributed by F02's partition, never charged wholesale", RD, "  const batch = partitionMembers({ members, resolve }).arithmetic;", "  const batch = { population: members.length, partitions: 1, inPartitions: members.length, undeclared: 0, ambiguous: 0, remainder: 0 };", REAL],
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
  `F87 operator overview sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f87-operator-sabotage-rr130-2026-10-02.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
