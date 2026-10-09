/**
 * 🔴 RR-232 · THE CLIENT-IDENTITY GUARD REFUSES — each limb puts ONE client-identifying string (or one broken exemption) into the REAL
 * engine files, and test/client-identity-guard.test.mjs "G1 · CENSUS" must turn RED by an AssertionError; every file is restored by
 * raw-byte sha256 and the production trail is hashed before and after.
 *
 * The client strings are DERIVED here at run time from the declarations (tools/client-identity-guard.mjs) — this file names no client.
 *
 *   node test/helpers/rr232-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr232-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr232-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveClientIdentifiers, findLeaks, governanceNames } from "../../tools/client-identity-guard.mjs";
import { OPERATOR_IDENTITY, GENERIC_PATH_STOPLIST } from "../../config/client-identity.mjs";
import { AUTHORITY_CORPUS } from "../../config/authority/corpus.mjs";
import { DATA_ROOT } from "./declared-world.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = "test/client-identity-guard.test.mjs", NAMED = "G1 · CENSUS";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr232-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

/* the client strings, derived — never written in this file */
const IDS = deriveClientIdentifiers({ dataRoot: DATA_ROOT, operator: OPERATOR_IDENTITY, stoplist: GENERIC_PATH_STOPLIST });
const of = (k) => [...IDS].filter(([, kind]) => kind === k).map(([v]) => v);
const PATH = of("path").find((p) => p.includes("-")) ?? of("path")[0];
const DOMAIN = of("domain")[0], NAME = of("name")[0], LABEL = of("domain-label")[0];
/* the frozen clause line the guard would flag without exemption (i) */
const ACC = "config/fboard/acceptances.mjs";
const accLines = read(ACC).toString("utf8").replace(/\r\n/g, "\n").split("\n");
const FROZEN_LINE = findLeaks({ texts: [[ACC, accLines.join("\n")]], identifiers: IDS, frozen: new Set(), names: governanceNames({ corpus: AUTHORITY_CORPUS }) })
  .map((l) => accLines[l.line - 1]).find((l) => /^\s*(input|expected|failure|evidence): "/.test(l));

const SABOTAGES = [
  ["P1", "a client PATH put back into F19's board event text (the RR-230 leak)", "config/fboard/f-board.mjs", "the declared part (one URL section of the site) is INCOMPLETE", `the ${PATH} part is INCOMPLETE`],
  ["P2", "a client DOMAIN in a comment", "src/write-law.mjs", " * It is the first connected product's law", ` * It is the first connected product's law (${DOMAIN})`],
  ["P3", "a client NAME in a comment", "src/write-law.mjs", "that product has it BECAUSE", `that product (${NAME}) has it BECAUSE`],
  ["P4", "ONE byte of an exempted frozen clause changed", ACC, FROZEN_LINE, FROZEN_LINE?.replace(/"(,?)\s*$/, 'X"$1')],
  ["P5", "a fake exemption: a stoplist word that is a client identifier", "config/client-identity.mjs", '"/privacy", "/terms"]', `"/privacy", "/terms", "/${LABEL}"]`],
  ["P6", "a fake exemption: a SECOND operator identity", "config/client-identity.mjs", '  Object.freeze({ name: "AlmiWorld" }),\n', '  Object.freeze({ name: "AlmiWorld" }),\n  Object.freeze({ name: "Second" }),\n'],
  ["P7", "a fake exemption: a governance file name that is not in the register, holding a client label", "src/facts/gaps.mjs", "about the first connected product's destination-regulator block", `about the first connected product's destination-regulator block (AlmiVisibility_FAKE_${String(LABEL).toUpperCase()}_RECORD.md)`],
];
const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => (typeof s === "string" && s ? text.split(inEol(text, s)).length - 1 : 0);
const preflight = RUN.map(([id, , f, from]) => [id, occurrences(originals.get(f).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baseGreen = base.status === 0 && new RegExp(`✔ ${esc(NAMED)} `).test(`${base.stdout}${base.stderr}`);
const lines = [
  `RR-232 client-identity guard sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T} (named test "${NAMED}") · each applied ALONE · client strings derived at run time, never written here`,
  `BASELINE: ${baseGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the files now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, f, from, to] of baseGreen ? RUN : []) {
  const text = originals.get(f).toString("utf8");
  if (occurrences(text, from) !== 1 || typeof to !== "string" || to === from) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const ff = inEol(text, from);
  const at = text.indexOf(ff);
  writeFileSync(join(REPO, f), text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length), "utf8");
  const landed = sha(read(f)) !== sha(originals.get(f));
  let out = "", failing = [];
  try { const r = run(); out = `${r.stdout}${r.stderr}`; failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]); }
  finally { writeFileSync(join(REPO, f), originals.get(f)); }
  const restored = sha(read(f)) === sha(originals.get(f));
  const red = failing.some((n) => n.startsWith(`${NAMED} `));
  const cls = failureClassOf(out, NAMED);
  const ok = landed && red && cls === "AssertionError" && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} [${f}]: landed ${landed} · "${NAMED}" red ${red} · its failure ${cls ?? "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
  console.log(lines.at(-1));
}
/* GREEN after restore: the named test is green again on the restored files */
const after = run();
const greenAgain = after.status === 0;
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `GREEN after restore: ${greenAgain}`, `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.slice(-2).join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length && greenAgain ? 0 : 1;
