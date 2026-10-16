/**
 * 🔴 RR-272 §2 · EVENT_ID_CONFLICT ON EVERY RECORD RUN — ONE SABOTAGE PER LIMB of the fix (src/audit-trail/population.mjs, the
 * correction register's rules in src/audit-trail/wrong-admissions.mjs, the required day in bin/authority-migrate.mjs).
 *
 *   node test/helpers/rr272-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now. Then each sabotage replaces its span ALONE, proves it
 * LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before
 * and after. Evidence: runs/audit/rr272-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const POP = "src/audit-trail/population.mjs", W = "src/audit-trail/wrong-admissions.mjs", M = "bin/authority-migrate.mjs";
const T = ["test/rr272-wrong-admissions.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const ADM = "ADMISSIONS · FIRING CONTROL (RR-272)", COR = "CORRECTION · FIRING CONTROL (RR-272)", MIG = "MIGRATE · PRODUCTION PATH (RR-272)";

/* [id, limb, file, span, replacement, the test that must turn red] */
const SABOTAGES = [
  ["W01", "an admission already on the trail is offered again (the conflict returns)", POP, "    if (prior) {\n      const stored", "    if (false) {\n      const stored", ADM],
  ["W02", "a disposition changed since the admission is not named", POP, "...(stored !== d.disposition ? { dispositionSince: { stored, inForce: d.disposition } } : {})", "", ADM],
  ["W03", "the trail's admissions are not the ones read", POP, 'recorded.filter((e) => e?.action === "ADMIT_AUTHORITY_RECORD")', 'recorded.filter((e) => e?.action === "ADMIT_NOTHING")', ADM],
  ["W04", "a correction that rewrites passes", W, '  if (c?.treatment !== "REPRESENTED_NOT_REWRITTEN") out.push({ code: "CORRECTION_CLAIMS_REWRITE", field: "treatment" });\n', "", COR],
  ["W05", "a correction whose count is not its list passes", W, "c.wrongAdmissions === list.length)) out.push", "true)) out.push", COR],
  ["W06", "a correction naming no difference passes", W, 'if (stored === inForce) out.push({ code: "CORRECTION_NAMES_NO_DIFFERENCE", field: `admissions[${i}]` });', "void stored, inForce;", COR],
  ["W09", "a correction value the trail would refuse passes", W, "if (typeof s === \"string\" && s.length > METADATA_MAX_VALUE_CHARS) out.push", "if (false) out.push", COR],
  ["W07","authority-migrate runs with no --now", M, "|| !engCommit || !validDay(NOW)) {", "|| !engCommit) {", MIG],
  ["W08", "authority-migrate takes a day that does not exist", M, " && Number.isFinite(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;", ";", MIG],
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
  `RR-272 wrong-admissions sabotage run · ${new Date().toISOString()}`,
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
console.log(`evidence written: ${writeEvidenceOnce(REPO, "rr272-sabotage", lines.join("\n") + "\n")}`);
