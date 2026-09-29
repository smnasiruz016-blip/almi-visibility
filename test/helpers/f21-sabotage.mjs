/**
 * 🔴 F21 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 804ebd1 EVIDENCE; RR-86 §5).
 *
 *   node test/helpers/f21-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST (RR-85 §7): every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed
 * before any sabotage runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE,
 * proves it LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail
 * is hashed before and after. Evidence: runs/audit/f21-sabotage-2026-09-29.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IS = "src/audit/indexability-signals.mjs", IR = "src/audit/indexability-reader.mjs", BIN = "bin/indexability-audit.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = "test/f21-indexability-signals.test.mjs";
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C2 K1 listed + disallowed", IS, `k.K1 = !listedKnown ? null : !isListed ? false : s.robots.state === "UNKNOWN" ? null : s.robots.state === "DISALLOWED";`, "k.K1 = !listedKnown ? null : false;", "C2 ·"],
  ["S2", "C2 K2 listed + noindex", IS, `k.K2 = !listedKnown ? null : !isListed ? false : s.noindex.state === "UNKNOWN" ? null : s.noindex.state === "NOINDEX";`, "k.K2 = !listedKnown ? null : false;", "C2 ·"],
  ["S3", "C2 K3 listed + canonical elsewhere", IS, "k.K3 = !listedKnown ? null : !isListed ? false : canonOther ? true : !canonKnown || headerOpen ? null : false;", "k.K3 = !listedKnown ? null : false;", "C2 ·"],
  ["S4", "C2 K4 canonical to a bad target", IS, "k.K4 = bad ? true : allKnown ? false : null;", "k.K4 = allKnown ? false : null;", "C2 ·"],
  ["S5", "C2 K5 conflicting canonicals", IS, `k.K5 = s.canonical.state === "CONFLICTING" ? true : !canonKnown || headerOpen ? null : false;`, "k.K5 = !canonKnown || headerOpen ? null : false;", "C2 ·"],
  ["S6", "C2 K6 noindex + canonical elsewhere", IS, `k.K6 = s.noindex.state === "NOINDEX" && canonOther ? true`, "k.K6 = false ? true", "C2 ·"],
  ["S7", "C1 robots rules are applied", IS, "return { known: true, allows: (url) => decide(group, url).allowed, ref: record.observation_id, basis: `GROUP_${group.matchedBy}` };", "return { known: true, allows: () => true, ref: record.observation_id, basis: `GROUP_${group.matchedBy}` };", "C1 ·"],
  ["S8", "C1 the recorded X-Robots-Tag is read", IS, "const s = noindexState({ metaRobots: meta ?? [], xRobotsTag: headerRecorded ? xr : null });", "const s = noindexState({ metaRobots: meta ?? [], xRobotsTag: null });", "C1 ·"],
  ["S9", "C1 every canonical tag is read", IS, `const html = tags.length === 0 ? "NONE" : tags.some((t) => t === null) || targets.length > 1 ? "CONFLICTING" : targets[0] === url ? "SELF" : "OTHER";`, `const html = tags.length === 0 ? "NONE" : tags.some((t) => t === null) ? "CONFLICTING" : targets[0] === url ? "SELF" : "OTHER";`, "C1 ·"],
  ["S10", "C1 a 5xx robots record is UNKNOWN", IS, `if (status >= 400 && status < 500) return { known: true, allows: () => true, ref: record.observation_id, basis: "ROBOTS_4XX_NO_RULES" };`, `if (status >= 400) return { known: true, allows: () => true, ref: record.observation_id, basis: "ROBOTS_4XX_NO_RULES" };`, "C1 ·"],
  ["S11", "C3 two spellings of one URL are one URL", IS, "for (const u of v.urls ?? []) { const c = canon(typeof u === \"string\" ? u : u?.loc ?? u?.url); if (c && inScope(c)) listed.set(c, s.observation_id); }", "for (const u of v.urls ?? []) { const c = typeof u === \"string\" ? u : null; if (c && inScope(c)) listed.set(c, s.observation_id); }", "C3 ·"],
  ["S12", "C4 an unrecorded canonical header is never clean", IS, `const headerOpen = canonKnown && s.canonical.header !== "RECORDED";`, "const headerOpen = false;", "C4 ·"],
  ["S13", "C4 'not listed' only over a fully stored sitemap", IS, `complete.set(o, v.coverageState === "COMPLETE" && (v.childrenSkipped ?? 0) === 0 && Number.isInteger(v.urlsTotal) && v.urlsStored === v.urlsTotal);`, "complete.set(o, true);", "C4 ·"],
  ["S14", "C4 no robots record is UNKNOWN", IS, `if (!v) return { known: false, reason: "NO_ROBOTS_RECORD", ref: null };`, "if (!v) return { known: true, allows: () => true, ref: null };", "C4 ·"],
  ["S15", "C4 three states, never two", IS, "const state = holds.length ? URL_STATES.CONTRADICTED : unjudged.length ? URL_STATES.NOT_MEASURED : URL_STATES.CONSISTENT;", "const state = holds.length ? URL_STATES.CONTRADICTED : URL_STATES.CONSISTENT;", "C4 ·"],
  ["S16", "C5 only in-scope observations are judged", IS, "for (const o of observations.filter((x) => inScope(x.value?.final_url ?? x.value?.requested_url))) {", "for (const o of observations) {", "C5 ·"],
  ["S17", "C5 robots rows only through declared origins", IR, "return { records: (p.byTenant[tenantId] ?? []).map((x) => x.record), rejected: p.rejected.length, readable: true };", "return { records: rows.map((x) => x.record), rejected: p.rejected.length, readable: true };", "C5 ·"],
  ["S18", "C6 findings carry identities, never URLs", IS, "return Object.freeze({ pageId: targetPageId(url), state,", "return Object.freeze({ pageId: url, state,", "C6 ·"],
  ["S19", "C7 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C7 ·"],
  ["S20", "C5 the entry point declares the shared store it reads", BIN, `RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), RESOURCES.evidenceStore()],`, `RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID)],`, "C5/C6 · THE ENTRY POINT"],
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
  `F21 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
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
    const r = spawnSync(process.execPath, ["--test", T], { cwd: REPO, encoding: "utf8", timeout: 300000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  lines.push(`${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f21-sabotage-2026-09-29.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
