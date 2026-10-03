/**
 * 🔴 F30 · CHANGE DETECTION · ONE SABOTAGE PER CLAUSE LIMB (RR-138 §4).
 *
 *   node test/helpers/f30-change-detection-sabotage.mjs      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f30-change-detection-sabotage-rr138-2026-10-03.txt (its own file).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/audit/change-detection.mjs", B = "bin/change-check.mjs";
const T = ["test/f30-change-detection.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const SAME = "C2 · C5 · the same page twice", DIFF = "C2 · two observations of DIFFERENT", RULE = "C4 · a real recorded change", NOISE = "C5 · noise suppressed", OBS = "C3 · a SKIPPED", RUN = "C3 · a NON-COMPLIANT", DUE = "C6 · recrawl timing", DEN = "C7 · every count", GEN = "C1 · GENERIC", XT = "C1 · another tenant";

const SABOTAGES = [
  /* S1 performs FAILURE C2 itself (one clean observation reads UNCHANGED); a first version made it crash, a red that proved only a TypeError */
  ["S1", "C2: a page with one clean observation is NOT MEASURED, never UNCHANGED", M, "results.push({ state: NOT_MEASURED, reason: \"NO_SECOND_CLEAN_OBSERVATION\",", "results.push({ state: distinct.length ? \"UNCHANGED\" : NOT_MEASURED, changed: [], reason: \"NO_SECOND_CLEAN_OBSERVATION\",", SAME],
  ["S2", "C2: observations are grouped by the SAME page identity", M, "    if (!cleanByPage.has(o.value.requested_url)) cleanByPage.set(o.value.requested_url, []);\n    cleanByPage.get(o.value.requested_url).push(o);", "    if (!cleanByPage.has(\"*\")) cleanByPage.set(\"*\", []);\n    cleanByPage.get(\"*\").push(o); if (!cleanByPage.has(o.value.requested_url)) cleanByPage.set(o.value.requested_url, cleanByPage.get(\"*\"));", DIFF],
  ["S3", "C2: one page at ONE time is one observation", M, "    const distinct = clean.filter((o, i) => i === 0 || o.observed_at !== clean[i - 1].observed_at);", "    const distinct = clean;", DIFF],
  ["S4", "C3: a skipped observation is not clean", M, "  if (o.method === \"crawl.skipped\" || v.skipped === true) return \"SKIPPED\";\n", "", OBS],
  ["S5", "C3: an errored observation is not clean", M, "  if (v.error) return \"ERRORED\";\n", "", OBS],
  ["S6", "C3: a truncated observation is not clean", M, "  if (v.truncated === true) return \"TRUNCATED\";\n", "", OBS],
  ["S7", "C3: pacing must be proved with no breach", M, "  run.pacing?.ok === true && run.pacing.breaches === 0 &&\n", "", RUN],
  ["S8", "C3: the collection must be KEPT (a ledger entry naming this run)", M, "e.run_ref.endsWith(` crawl_run ${run.run_id}`)", "true", RUN],
  ["S9", "C3: a dry run is not a measurement", M, "run.dryRun !== true && ", "", RUN],
  ["S10", "C4: the content fingerprint is in the recorded rule", M, "\"content-type\", \"content_sha256\"]),", "\"content-type\"]),", RULE],
  ["S11", "C4: a difference of any size is a change (no threshold)", M, "    if (a !== b) changed.push(f);", "    if (a !== b && String(a).length !== String(b).length) changed.push(f);", RULE],
  ["S12", "C5: a field recorded on one side is NOT MEASURED, never a change", M, "    if (a === undefined || b === undefined) { notMeasured.push(f); continue; }\n", "", NOISE],
  ["S13", "C6: no declared interval → NOT DECLARED (no default)", M, "  if (!setting || !Number.isInteger(setting.everyHours) || setting.everyHours < 1) return { state: \"NOT DECLARED\" };", "  if (!setting) setting = { everyHours: 24 };", DUE],
  ["S14", "C6: the clock starts at the last CLEAN observation", M, "lastCleanAt: distinct.at(-1)?.observed_at ?? null", "lastCleanAt: placed.filter((x) => x.o.value.requested_url === page).map((x) => x.o.observed_at).sort().at(-1) ?? null", DUE],
  /* S14's first version still preferred the last CLEAN observation, so it removed nothing and stayed green — a harness fault, recorded */
  ["S15", "C7: any NOT MEASURED makes the population INCOMPLETE", M, "incomplete: count(NOT_MEASURED) > 0 || ", "incomplete: false && ", DEN],
  ["S16", "C1/C6: a client reads only its OWN recrawl setting", B, "const setting = settings.find((s) => s.subjectId === SUBJECT) ?? null;", "const setting = settings[0] ?? null;", GEN],
  ["S17", "C1: only the subject's own declared batches are read", B, "const BATCHES = subject.entry.members.filter((m) => m.resourceKind === \"RESEARCH_BATCH\").map((m) => m.resourceRef);", "const BATCHES = lookupSubject(index, process.env.F30_OTHER ?? \"fixture-world-subject\").entry.members.filter((m) => m.resourceKind === \"RESEARCH_BATCH\").map((m) => m.resourceRef);", GEN],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
/* GREEN FIRST: every named test passes on the unsabotaged code, or a red below proves nothing */
const green = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
const greenFails = [...`${green.stdout}`.matchAll(/^✖ (.+?) \(\d/gm)].map((m) => m[1]);
const named = [...new Set(SABOTAGES.map((s) => s[5]))];
const namedGreen = named.every((n) => new RegExp(`^✔ ${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m").test(green.stdout));
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F30 change-detection sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE; each run killed after 300 s`,
  `GREEN FIRST: unsabotaged run exit ${green.status} · failing ${greenFails.length} · every named test (${named.length}) passing ${namedGreen}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
if (green.status === 0 && namedGreen) for (const [id, limb, file, from, to, expect] of SABOTAGES) {
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
writeFileSync(join(REPO, "runs", "audit", "f30-change-detection-sabotage-rr138-2026-10-03.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
