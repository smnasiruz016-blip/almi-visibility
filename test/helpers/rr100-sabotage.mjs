/**
 * 🔴 RR-100 · EVERY DECLARED CHECK BOUNDARY — ONE SABOTAGE PER CONDITION, IN BOTH DIRECTIONS, PLUS THE DECLARATIONS THEMSELVES.
 *
 *   node test/helpers/rr100-sabotage.mjs --deliberate     NOT part of `npm test` (test/*.test.mjs only)
 *
 * NARROW sabotages switch one firing condition off in the live code: its "just inside" pair must go red. WIDEN sabotages make the code
 * fire past its declared boundary: a "just outside" pair must go red. DECLARATION sabotages drop, rename or unregister a declared
 * condition: the drift guard must go red. PRE-FLIGHT first: each span must occur EXACTLY ONCE in the code live now. Each sabotage is
 * applied ALONE, proved to have LANDED, its named test required red, the file restored by raw-byte sha256; the production trail is
 * hashed before and after. Evidence: runs/audit/rr100-sabotage-2026-09-30.txt.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CK = "src/audit/checks.mjs", TC = "src/audit/technical-checks.mjs", DF = "src/audit/dns-family.mjs", RC = "src/audit/check.mjs";
const BOTH = (id) => `BOTH DIRECTIONS · ${id}`;
const T = ["test/rr100-check-boundaries.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  /* robots-scope */
  ["N01", "robots-scope NARROW: the search-crawler block no longer fires", CK, 'if (a.verdict !== "BLOCKED_FOR_GOOGLEBOT") return null;', "if (true) return null;", BOTH("robots-scope")],
  ["W01", "robots-scope WIDEN: a block for our crawler alone fires", CK, 'if (a.verdict !== "BLOCKED_FOR_GOOGLEBOT") return null;', 'if (a.verdict === "ALLOWED_FOR_BOTH") return null;', BOTH("robots-scope")],
  /* dns-family */
  ["N02", "dns-family NARROW: AAAA_ONLY no longer raises", DF, 'if (f.state === "AAAA_ONLY") {', "if (false) {", BOTH("dns-family")],
  ["W02", "dns-family WIDEN: A_ONLY raises too", DF, 'if (f.state === "AAAA_ONLY") {', 'if (f.state === "AAAA_ONLY" || f.state === "A_ONLY") {', BOTH("dns-family")],
  /* status-and-redirects */
  ["N03", "status NARROW: a 201 counts as clean", TC, "if (o.status === 200 && chain.length <= 1 && !redirected) return null;", "if ((o.status === 200 || o.status === 201) && chain.length <= 1 && !redirected) return null;", BOTH("status-and-redirects")],
  ["N04", "status NARROW: a two-hop chain counts as clean", TC, "if (o.status === 200 && chain.length <= 1 && !redirected) return null;", "if (o.status === 200 && chain.length <= 2 && !redirected) return null;", BOTH("status-and-redirects")],
  ["N05", "status NARROW: a redirect counts as clean", TC, "if (o.status === 200 && chain.length <= 1 && !redirected) return null;", "if (o.status === 200 && chain.length <= 1) return null;", BOTH("status-and-redirects")],
  ["W03", "status WIDEN: a one-entry chain fires", TC, "if (o.status === 200 && chain.length <= 1 && !redirected) return null;", "if (o.status === 200 && chain.length <= 0 && !redirected) return null;", BOTH("status-and-redirects")],
  /* canonical */
  ["N06", "canonical NARROW: a missing canonical no longer fires", TC, "if (!canonical) {", "if (false) {", BOTH("canonical")],
  ["N07", "canonical NARROW: an unparseable canonical no longer fires", TC, "resolved = new URL(canonical, page.canonical_url);", "resolved = new URL(page.canonical_url);", BOTH("canonical")],
  ["N08", "canonical NARROW: an off-host canonical no longer fires", TC, "if (resolved.hostname !== here.hostname) {", "if (false) {", BOTH("canonical")],
  ["N09", "canonical NARROW: a 404 target no longer fires", TC, "if (target !== undefined && target !== 200) {", "if (target !== undefined && target >= 500) {", BOTH("canonical")],
  ["W04", "canonical WIDEN: a same-host cross-URL canonical fires", TC, "if (resolved.hostname !== here.hostname) {", "if (resolved.pathname !== here.pathname) {", BOTH("canonical")],
  /* noindex */
  ["N10", "noindex NARROW: a header noindex no longer counts", TC, "noindexed: inMeta || inHeader,", "noindexed: inMeta,", BOTH("noindex")],
  ["W05", "noindex WIDEN: every page with a body fires", TC, "if (!s.noindexed && !s.disagree) return null;", "if (false) return null;", BOTH("noindex")],
  /* head-elements */
  ["N11", "head NARROW: no-title", TC, 'if (!h.title) problems.push("no <title>");', "if (false) problems.push(\"no <title>\");", BOTH("head-elements")],
  ["N12", "head NARROW: no-description", TC, 'if (!h.description) problems.push("no meta description");', "if (false) problems.push(\"no meta description\");", BOTH("head-elements")],
  ["N13", "head NARROW: multiple-descriptions", TC, "if (h.descriptionCount > 1) problems.push(", "if (h.descriptionCount > 2) problems.push(", BOTH("head-elements")],
  ["N14", "head NARROW: no-h1", TC, 'if (h.h1s.length === 0) problems.push("no <h1>");', "if (false) problems.push(\"no <h1>\");", BOTH("head-elements")],
  ["N15", "head NARROW: multiple-h1", TC, "if (h.h1s.length > 1) problems.push(", "if (h.h1s.length > 2) problems.push(", BOTH("head-elements")],
  ["N16", "head NARROW: empty-h1", TC, 'if (h.h1s.some((t) => t === "")) problems.push', "if (false) problems.push", BOTH("head-elements")],
  ["N17", "head NARROW: shared-title", TC, "const dupTitle = h.title && (siteContext.titleCounts?.get(h.title) ?? 0) > 1;", "const dupTitle = h.title && (siteContext.titleCounts?.get(h.title) ?? 0) > 2;", BOTH("head-elements")],
  ["N18", "head NARROW: skipped-heading-level", TC, "if (seen.has(lvl) && !seen.has(lvl - 1)) {", "if (false) {", BOTH("head-elements")],
  ["W06", "head WIDEN: a single h1 fires", TC, "if (h.h1s.length > 1) problems.push(", "if (h.h1s.length >= 1) problems.push(", BOTH("head-elements")],
  /* query-parameters */
  ["N19", "query NARROW: one parameter no longer fires", TC, "if (params.length === 0) return null;", "if (params.length <= 1) return null;", BOTH("query-parameters")],
  ["W07", "query WIDEN: a URL with no parameter fires", TC, "if (params.length === 0) return null;", "if (false) return null;", BOTH("query-parameters")],
  /* indexability-preflight */
  ["N20", "preflight NARROW: reachable200", TC, "reachable200: status === 200 ? true : status === undefined ? null : false,", "reachable200: status === undefined ? null : true,", BOTH("indexability-preflight")],
  ["N21", "preflight NARROW: notRobotsDisallowed", TC, "notRobotsDisallowed: robotsAllowed === undefined ? null : robotsAllowed,", "notRobotsDisallowed: robotsAllowed === undefined ? null : true,", BOTH("indexability-preflight")],
  ["N22", "preflight NARROW: notNoindexed", TC, "notNoindexed: noindexed === undefined ? null : !noindexed,", "notNoindexed: noindexed === undefined ? null : true,", BOTH("indexability-preflight")],
  ["N23", "preflight NARROW: canonicalSelfOrResolving", TC, "canonicalSelfOrResolving: canonicalOk === undefined ? null : canonicalOk,", "canonicalSelfOrResolving: canonicalOk === undefined ? null : true,", BOTH("indexability-preflight")],
  ["N24", "preflight NARROW: inSitemap", TC, "inSitemap: inSitemap === undefined ? null : inSitemap,", "inSitemap: inSitemap === undefined ? null : true,", BOTH("indexability-preflight")],
  ["N25", "preflight NARROW: contentInRawHtml", TC, "contentInRawHtml: hasContent === undefined ? null : hasContent,", "contentInRawHtml: hasContent === undefined ? null : true,", BOTH("indexability-preflight")],
  ["W08", "preflight WIDEN: a clean page is blocked", TC, "inSitemap: inSitemap === undefined ? null : inSitemap,", "inSitemap: inSitemap === undefined ? null : false,", BOTH("indexability-preflight")],
  /* the declarations */
  ["D01", "DECLARATION: a condition renamed away from the proved one", CK, '{ id: "aaaa-only", when:', '{ id: "aaaa-or-neither", when:', "DRIFT GUARD"],
  ["D02", "DECLARATION: a firing path dropped from the declaration", TC, '      { id: "redirected", when: "the recorded final URL differs from the requested URL" },', "", "DRIFT GUARD"],
  ["D03", "DECLARATION: a check loses its boundary entirely", RC, "boundary: validBoundary(id, boundary) });", "boundary: id === \"query-parameters\" ? undefined : validBoundary(id, boundary) });", "every detector behind F90"],
  ["D04", "REGISTRY: duplicate condition ids accepted", RC, "&& new Set(b.fires.map((f) => f.id)).size === b.fires.length;", ";", "the registry refuses"],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `RR-100 boundary sabotage run · ${new Date().toISOString()}`,
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
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
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
writeFileSync(join(REPO, "runs", "audit", "rr100-sabotage-2026-09-30.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
