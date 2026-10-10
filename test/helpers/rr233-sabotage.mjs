/**
 * 🔴 RR-233 · THE ADMISSIBLE-NAME RULES REFUSE — each limb breaks ONE thing in the REAL config/authority/inclusion.mjs (a throwaway
 * change), and its NAMED test in test/rr233-admissible-names.test.mjs must turn RED by an AssertionError; the file is restored by raw
 * bytes (sha256 checked) and the production trail is hashed before and after; the whole test file must be GREEN again after restore.
 *
 *   node test/helpers/rr233-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr233-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr233-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = "test/rr233-admissible-names.test.mjs", F = "config/authority/inclusion.mjs", C = "src/authority/corpus.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr233-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SPEC = "SPECIFICATION_AMENDMENT_(?:[6-9]|[1-9]\\d+)_\\d{4}-\\d{2}-\\d{2}\\.md$/, issuer: \"OWNER\" }),";
const CONSENT = "TENANT_CONSENT_T[1-9]\\d*_\\d{4}-\\d{2}-\\d{2}\\.md$/, issuer: \"OWNER\" }),";
const SABOTAGES = [
  ["R1", "the amendment number widened to any number (Q3 (a) as first written: admits the committed, never-admitted 2/3/4)", "N4 ·", SPEC, SPEC.replace("(?:[6-9]|[1-9]\\d+)", "\\d+")],
  ["R2", "the same widening, seen by the full census over the governance repository", "N5 ·", SPEC, SPEC.replace("(?:[6-9]|[1-9]\\d+)", "\\d+")],
  ["R3", "a suffix allowed after the amendment's date (a held FOR_OWNER_APPROVAL draft would enter)", "N2 ·", SPEC, SPEC.replace("\\d{2}\\.md$/", "\\d{2}[A-Za-z0-9_-]*\\.md$/")],
  ["R4", "the specification-amendment rule removed", "N1 ·", `  Object.freeze({ id: "specification-amendment", re: /^AlmiVisibility_${SPEC}\n`, ""],
  ["R5", "the consent record's tenant label widened to any word (a client name would enter)", "N3 ·", CONSENT, CONSENT.replace("T[1-9]\\d*", "[A-Z0-9]+")],
  ["R6", "the consent record's extension widened to any extension", "N3 ·", CONSENT, CONSENT.replace("\\.md$/", "\\.[A-Za-z]+$/")],
  ["R7", "the consent record's issuer removed (it would resolve INVALID, never CURRENT)", "N1 ·", CONSENT, CONSENT.replace('issuer: "OWNER"', "issuer: null")],
  /* RR-243: N5's one allowance — a name newly admitted ONLY by one of the two RR-233 rules — must stay that narrow */
  ["R8", "N5 allows any move of the admitted set (a planted older-rule admission would pass)", "N5 ·", "allowed: was === null && allowedNew.includes(now) });", "allowed: true });", C],
  ["R9", "N5 allows a newly admitted name under any rule, not only the two RR-233 rules", "N5 ·", "allowed: was === null && allowedNew.includes(now) });", "allowed: was === null });", C],
];
const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const fileOf = (limb) => limb[5] ?? F;
const FILES = [...new Set([F, ...RUN.map(fileOf)])];
const originals = new Map(FILES.map((p) => [p, read(p)]));
const original = originals.get(F);
const restore = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restore);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => (s ? text.split(inEol(text, s)).length - 1 : 0);
const textOf = (p) => originals.get(p).toString("utf8");
const preflight = RUN.map((limb) => [limb[0], occurrences(textOf(fileOf(limb)), limb[3])]);
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const start = ls.findIndex((x) => /✖ failing tests:/.test(x));
  const at = ls.findIndex((l, i) => i > start && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baseOut = `${base.stdout}${base.stderr}`;
const baseGreen = base.status === 0 && RUN.every(([, , named]) => new RegExp(`✔ ${esc(named)} `).test(baseOut)) && !/# skipped [1-9]/.test(baseOut) && !/ℹ skipped [1-9]/.test(baseOut);
const lines = [
  `RR-233 admissible-name rules sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) of ${FILES.join(" + ")} over ${T} · each applied ALONE · each names the test that must turn RED`,
  `BASELINE: ${baseGreen ? "GREEN (every named test passed, none skipped)" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the file now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const entry of baseGreen ? RUN : []) {
  const [id, limb, named, from, to] = entry;
  const file = fileOf(entry), text0 = textOf(file), original = originals.get(file);
  if (occurrences(text0, from) !== 1 || to === from) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const ff = inEol(text0, from), at = text0.indexOf(ff);
  writeFileSync(join(REPO, file), text0.slice(0, at) + inEol(text0, to) + text0.slice(at + ff.length), "utf8");
  const landed = sha(read(file)) !== sha(original);
  let out = "", failing = [];
  try { const r = run(); out = `${r.stdout}${r.stderr}`; failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]); }
  finally { writeFileSync(join(REPO, file), original); }
  const restored = sha(read(file)) === sha(original);
  const red = failing.some((n) => n.startsWith(`${named} `));
  const cls = failureClassOf(out, named);
  const ok = landed && red && cls === "AssertionError" && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb}: landed ${landed} · "${named}" red ${red} · its failure ${cls ?? "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
  console.log(lines.at(-1));
}
const after = run();
const greenAgain = after.status === 0;
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `GREEN after restore: ${greenAgain}`, `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.slice(-2).join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length && greenAgain ? 0 : 1;
