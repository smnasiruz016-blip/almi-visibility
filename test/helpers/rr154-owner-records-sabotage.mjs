/**
 * 🔴 RR-154 §1–§2 · ONE SABOTAGE PER PROTECTION OF test/rr154-owner-records.test.mjs.
 *
 *   node test/helpers/rr154-owner-records-sabotage.mjs     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The method of test/helpers/rr103-sabotage.mjs: PRE-FLIGHT (each span exactly once in the bytes live now), each sabotage ALONE, proved to
 * have LANDED, its NAMED test required red by an AssertionError (a SyntaxError or TypeError proves nothing), restored by raw-byte sha256,
 * the production trail hashed before and after. Evidence: runs/audit/rr154-owner-records-sabotage-2026-10-03.txt — refuses to overwrite.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS = "config/authority/corpus.mjs", REG = "src/authority/register.mjs", MR = "config/governance/mandatory-reading.mjs";
const T = ["test/rr154-owner-records.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const EVIDENCE = join(REPO, "runs", "audit", "rr154-owner-records-sabotage-2026-10-03.txt");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const head = (prop) => `"propositionId": "${prop}",\n    "scope": [\n      "ALMIVISIBILITY"\n    ],\n    "issuer": {\n`;

const SABOTAGES = [
  ["H1", "the owner's source decision loses its OWNER issuer", CORPUS, `${head("OWNER_DECISION_RR-154_STACK_EXCHANGE_SOURCE")}      "class": "OWNER",`, `${head("OWNER_DECISION_RR-154_STACK_EXCHANGE_SOURCE")}      "class": "BETA_G",`, "O1"],
  ["H2", "the earlier RR-120 record is rewritten with an issuer", CORPUS, `${head("RR-120_STACK_EXCHANGE_DECISION")}      "class": null,`, `${head("RR-120_STACK_EXCHANGE_DECISION")}      "class": "OWNER",`, "O2"],
  ["H3", "the register stops refusing an issuer-less record", REG, `  if (!nonEmpty(r.issuer?.class)) f.push("ISSUER_UNDECLARED");\n`, "", "O1"],
  ["H4", "the source decision dropped from mandatory reading", MR, `  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-03_RR-154_STACK_EXCHANGE_SOURCE.md", loader: "authority register (CURRENT record)" }),\n`, "", "O3"],
];

if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
const baseline = run();
const baselineGreen = baseline.status === 0;
const lines = [
  `RR-154 owner-records sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · each applied ALONE`,
  `BASELINE (named tests before any sabotage): ${baselineGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of baselineGreen ? SABOTAGES : []) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); continue; }
  const f = inEol(text, from);
  const at = text.indexOf(f);
  writeFileSync(join(REPO, file), text.slice(0, at) + inEol(text, to) + text.slice(at + f.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], out = "";
  try {
    const r = run();
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const byAssertion = /AssertionError/.test(out) && !/SyntaxError|TypeError|ReferenceError/.test(out);
  const ok = landed && red && byAssertion && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · by AssertionError only ${byAssertion} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED — A FINDING"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
