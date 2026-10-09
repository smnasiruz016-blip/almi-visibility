/**
 * 🔴 RR-234 · C4 STILL REFUSES AFTER IT WAS MADE DETERMINISTIC — each limb breaks ONE thing on the REAL render/served path (a throwaway
 * change to production code), and "C4 · the live policy" in test/f22-render-audit.test.mjs must turn RED by an AssertionError; every file
 * is restored by raw bytes (sha256 checked), the production trail is hashed before and after, and the test file is GREEN after restore.
 *
 *   node test/helpers/rr234-sabotage.mjs [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr234-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr234-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = "test/f22-render-audit.test.mjs", NAMED = "C4 · the live policy";
const P = "src/render/same-origin-policy.mjs", F = "src/crawl/fetcher.mjs";
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr234-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "the request timeout never aborts (a slow resource would be served)", F, "      const timer = setTimeout(() => controller.abort(), timeoutMs);\n", "      const timer = setTimeout(() => {}, timeoutMs);\n"],
  ["S2", "an on-origin redirect is not followed (the served path breaks at the hop)", F, "        if (next !== null && chain.length < maxRedirectHops && admits(next)) {\n", "        if (false) {\n"],
  ["S3", "the served body is re-encoded as text (binary bytes not kept exact)", P, "body: res.bodyBytes ?? Buffer.from(res.body ?? \"\", \"utf8\") };", "body: Buffer.from(res.body ?? \"\", \"utf8\") };"],
  ["S4", "robots rules are ignored", P, "      if (!verdict.allowed) { made -= 1; return refused(sent >= maxTotal ? \"RUN_CAP\" : \"ROBOTS\"); }\n", "      if (false) { made -= 1; return refused(sent >= maxTotal ? \"RUN_CAP\" : \"ROBOTS\"); }\n"],
  ["S5", "an undeclared host is not refused before a request", P, "      if (originOf(url) === null || !admits(url)) return refused(\"UNDECLARED_HOST\");\n", "      if (originOf(url) === null) return refused(\"UNDECLARED_HOST\");\n"],
  ["S6", "an oversized response is served", P, "      if (res.truncated) return refused(\"SIZE_CAP\");\n", ""],
  ["S7", "the request cap does not count hops and retries", P, "      made += own.n - 1;\n", "      made += 0;\n"],
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
const occurrences = (text, s) => (s ? text.split(inEol(text, s)).length - 1 : 0);
const preflight = RUN.map(([id, , f, from]) => [id, occurrences(originals.get(f).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const start = ls.findIndex((x) => /✖ failing tests:/.test(x));
  const at = ls.findIndex((l, i) => i > start && new RegExp(`^✖ ${esc(prefix)}`).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baseGreen = base.status === 0 && new RegExp(`✔ ${esc(NAMED)}`).test(`${base.stdout}${base.stderr}`);
const lines = [
  `RR-234 C4 live-policy sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) of the production served path over ${T} (named test "${NAMED}") · each applied ALONE`,
  `BASELINE: ${baseGreen ? "GREEN" : "NOT GREEN — no sabotage is run"}`,
  `PRE-FLIGHT (span occurrences in the files now): ${preflight.map(([id, n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, f, from, to] of baseGreen ? RUN : []) {
  const text = originals.get(f).toString("utf8");
  if (occurrences(text, from) !== 1 || to === from) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const ff = inEol(text, from), at = text.indexOf(ff);
  writeFileSync(join(REPO, f), text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length), "utf8");
  const landed = sha(read(f)) !== sha(originals.get(f));
  let out = "", failing = [];
  try { const r = run(); out = `${r.stdout}${r.stderr}`; failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]); }
  finally { writeFileSync(join(REPO, f), originals.get(f)); }
  const restored = sha(read(f)) === sha(originals.get(f));
  const red = failing.some((n) => n.startsWith(NAMED));
  const cls = failureClassOf(out, NAMED);
  const ok = landed && red && cls === "AssertionError" && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} [${f}]: landed ${landed} · "${NAMED}" red ${red} · its failure ${cls ?? "none"} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
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
