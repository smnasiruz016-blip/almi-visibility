/**
 * 🔴 RR-104 · THE COLLECTOR'S EVIDENCE FIELDS — ONE SABOTAGE PER PROTECTION, AGAINST THE CODE LIVE NOW.
 *
 *   node test/helpers/rr104-sabotage.mjs --deliberate     NOT part of `npm test` (test/*.test.mjs only)
 *
 * The method of test/helpers/f90-sabotage.mjs: PRE-FLIGHT (each span exactly once), each sabotage ALONE, proved to have LANDED, its NAMED
 * test required red, restored by raw-byte sha256, the production trail hashed before and after. Evidence: runs/audit/rr104-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = "src/crawl/fetcher.mjs", S = "src/crawl/seeds.mjs", P = "src/crawl/provenance.mjs", C = "src/crawl/crawler.mjs";
const T = ["test/rr104-collector-evidence.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const RED = "1.1 · REDACTION CONTROL", SIZE = "SIZE BOUNDS", STAB = "STABLE PROVENANCE: the crawl observation", RES = "STABLE PROVENANCE: the same bytes", L12 = "1.2 · each link";

const SABOTAGES = [
  ["Z01", "REDACTION: a sensitive name admitted when an allowlist names it", F, "    if (SENSITIVE_HEADER.test(h)) continue;\n", "", RED],
  ["Z02", "REDACTION: session-carrying names no longer sensitive", F, "|.*session.*|.*token.*|.*secret.*)$/i;", "|.*secret.*)$/i;", RED],
  ["Z03", "SIZE: an over-long header value kept whole", F, 'if (Buffer.byteLength(s, "utf8") > maxValueBytes) {', "if (false) {", SIZE],
  ["Z04", "SIZE: the link count uncapped", S, "if (links.length >= maxLinks) continue;", "if (false) continue;", SIZE],
  ["Z05", "STABLE: the observation's header subset grows to the allowlist", C, "headers: pick(res.headers, HEADER_SUBSET),", "headers: res.headers,", STAB],
  ["Z06", "STABLE: an evidence key carries the clock", P, "source.content_sha256, value]));", "source.content_sha256, value, source.observed_at]));", RES],
  ["Z07", "STABLE: an evidence record loses its source observation", P, "source_observation_id: source.observation_id,", "source_observation_id: null,", STAB],
  ["Z08", "1.2: the anchor text is dropped", S, "const text = cap(textOnly(m[2]));", 'const text = cap("");', L12],
  ["Z09", "1.2: an aria-labelledby name is guessed", S, 'if (attr(open, "aria-labelledby") !== null) nameSource = "NOT_MEASURED_ARIA_LABELLEDBY";', 'if (false) nameSource = "NOT_MEASURED_ARIA_LABELLEDBY";', L12],
  ["Z10", "RULE 1: Last-Modified stored as a publication date", C, "value: { claims: d.claims,", 'value: { claims: [...d.claims, ...(res.headers?.["last-modified"] ? [{ source: "header:last-modified", claimKind: "PUBLISHED", value: res.headers["last-modified"] }] : [])],', "RULE 1"],
  ["Z11", "RULE 2: a raw-HTML observation reads rendered", P, 'record?.value?.renderMode === "RAW_HTML") return "RAW_HTML — not rendered, not operated";', 'record?.value?.renderMode === "RAW_HTML") return PROVENANCE.RENDERED;', "RULE 2"],
  ["Z12", "RULE 2: the crawler may record RENDERED provenance", P, " || provenance === PROVENANCE.RENDERED) throw", ") throw", "RULE 2"],
  ["Z13", "RULE 3: an unfetched link reads as working", P, 'return { state: "NOT_FETCHED", status: null,', 'return { state: "WORKING", status: 200,', "RULE 3"],
  ["Z14", "RULE 4: an uncollected header reads ABSENT", P, "if (!collected || !collected.includes(h)) return { state: NOT_MEASURED,", "if (!collected) return { state: NOT_MEASURED,", "RULE 4"],
  ["Z15", "RULE 4: an old link's missing detail is defaulted", P, "if (!Object.hasOwn(link ?? {}, field)) return { state: NOT_MEASURED,", "if (false) return { state: NOT_MEASURED,", "RULE 4"],
  ["Z16", "RETRY: a network failure is not retried", F, "      try {\n        return await once(url);\n      } catch (err2) {", "      try {\n        throw err;\n      } catch (err2) {", "RETRY"],
  ["Z17", "ISOLATION: evidence shared across runs", C, "if (res.ok) evidence.push(...pageEvidence(obs, res));", "if (res.ok) { (globalThis.__rr104 ??= []).push(...pageEvidence(obs, res)); evidence.push(...globalThis.__rr104); }", "TENANT ISOLATION"],
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
  `RR-104 collector sabotage run · ${new Date().toISOString()}`,
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
writeFileSync(join(REPO, "runs", "audit", "rr104-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === SABOTAGES.length ? 0 : 1;
