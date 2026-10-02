/**
 * 🔴 F19 · THE GENERIC, SITE-HELD CRAWLER AND ITS PACED REDIRECT HOPS · ONE SABOTAGE PER SAFEGUARD (RR-135).
 *
 *   node test/helpers/f19-generic-crawl-sabotage.mjs      NOT part of `npm test`
 *
 * PRE-FLIGHT: every span exactly once in the code live now. Each sabotage alone; the named test must fail by an assertion (a SyntaxError
 * is a harness fault, never a proof); restored by raw-byte sha256; the production trail hashed before and after.
 * Evidence: runs/audit/f19-generic-crawl-sabotage-rr135-2026-10-02.txt (its own file).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const B = "bin/crawl.mjs", C = "src/tenancy/connectors.mjs", F = "src/crawl/fetcher.mjs", R = "src/crawl/robots.mjs", W = "src/crawl/crawler.mjs";
const T = ["test/f19-generic-crawl.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const GEN = "GENERIC", RES = "RESUMABLE", HELD = "SITE-HELD · a seed outside", HOPBIN = "SITE-HELD · in the binary", HOPS = "PACED HOPS";

const SABOTAGES = [
  ["G1", "the connector admits only its declared site origins", C, "    admits: (url) => origins === null || origins.has(originOf(url)),\n", "    admits: (url) => true,\n", HELD],
  ["G2", "a live run with no seed is refused before any request", B, "  if (seeds.length === 0) {\n", "  if (false) {\n", HELD],
  ["G3", "the platform never follows a redirect for the crawler", F, "          redirect: \"manual\",\n", "          redirect: \"follow\",\n", HOPS],
  ["G4", "a redirect hop waits for the pacer", F, "      await pace(k);\n", "      if (k !== \"redirect\") await pace(k);\n", HOPS],
  ["G5", "a redirect is followed only to an admitted origin", F, "chain.length < maxRedirectHops && admits(next)", "chain.length < maxRedirectHops", HOPS],
  ["G6", "a redirected robots.txt is not followed (fails closed)", R, "          redirect: \"manual\",\n", "", HOPS],
  ["G7", "the redirect chain is recorded on the observation", W, "      redirect_chain: res.redirectChain ?? [],\n", "      redirect_chain: [],\n", HOPBIN],
  ["G8", "a resumed batch never duplicates a saved observation", B, "  occurredAt, correlationId, discipline: \"APPEND_IF_NEW\",\n", "  occurredAt, correlationId, discipline: \"APPEND_WITHOUT_DEDUPE\",\n", RES],
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
  `F19 generic-crawl sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "f19-generic-crawl-sabotage-rr135-2026-10-02.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
