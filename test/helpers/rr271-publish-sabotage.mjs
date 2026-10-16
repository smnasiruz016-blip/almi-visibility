/**
 * 🔴 RR-271 · A BUILT PAGE, PUBLISHED — ONE SABOTAGE PER FAILURE LIMB of the publish step (src/page/publish-page.mjs) and of the record of
 * a page as LIVE (bin/publish-pages.mjs).
 *
 *   node test/helpers/rr271-publish-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now. Then each sabotage replaces its span ALONE, proves it
 * LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before
 * and after. Evidence: runs/audit/rr271-publish-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/page/publish-page.mjs", BIN = "bin/publish-pages.mjs";
const T = ["test/rr271-publish-pages.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const FC = "PUBLISH · FIRING CONTROL (RR-271)", PP = "PUBLISH · PRODUCTION PATH (RR-271)";

/* [id, limb, file, span, replacement, the test that must turn red] */
const SABOTAGES = [
  ["P01", "the noindex line stays on the published page", M, "const out = html.replace(PUBLISH.NOINDEX, canonicalLine(url))", "const out = html.replace(PUBLISH.NOINDEX, PUBLISH.NOINDEX + canonicalLine(url))", FC],
  ["P02", "the two stamps stay on the published page", M, '.split(stampLine(record.stamp)).join("");', ";", FC],
  ["P03", "an address that is not https is published", M, 'return x.protocol === "https:" && x.hash', "return x.hash", FC],
  ["P04", "a build with no noindex line, or two, is published", M, "  if (count(html, PUBLISH.NOINDEX) !== 1) return refused(PUBLISH_REFUSE.NOINDEX_COUNT, String(count(html, PUBLISH.NOINDEX)));\n", "", FC],
  ["P05", "a build without its two stamps is published", M, "  if (count(html, stampLine(record.stamp)) !== 2) return refused(PUBLISH_REFUSE.STAMP_COUNT, String(count(html, stampLine(record.stamp))));\n", "", FC],
  ["P06", "a served page with a noindex line passes", M, 'ok(!/<meta[^>]+name="robots"[^>]+noindex/i.test(s), ', "ok(true, ", FC],
  ["P07", "a canonical naming another address passes", M, "ok(canon.length === 1 && canon[0] === escapeText(url), ", "ok(canon.length <= 1, ", FC],
  ["P08", "FAQ data that is not the build's passes", M, "ok(ldOf(s) !== null && ldOf(s) === ldOf(built) && ", "ok(", FC],
  ["P09", "a visible stamp passes", M, "ok(present(record?.stamp) && !s.includes(escapeText(record.stamp)), ", "ok(true, ", FC],
  ["P10", "a header or footer that is not the build's passes", M, 'ok(blockOf("header", s) !== null && blockOf("header", s) === blockOf("header", built) && blockOf("footer", s) !== null && blockOf("footer", s) === blockOf("footer", built), ', "ok(true, ", FC],
  ["P11", "a served page that differs from the published build passes", M, 'ok(want.state === "PUBLISHED" && s === want.html, ', 'ok(want.state === "PUBLISHED", ', FC],
  ["P12", "a title not the build's passes", M, "ok(titleOf(s) !== null && titleOf(s) === titleOf(built), ", "ok(true, ", FC],
  ["P13", "a published record does not say where it was published", M, "publishedUrl: url, publishedOn: on, ", "publishedOn: on, ", FC],
  ["P14", "a page is recorded on a host the client does not declare", BIN, "if (!u || !hosts.includes(u.hostname)) {", "if (!u) {", PP],
  ["P15", "a page is recorded at an address that is not its own", BIN, "if (!present(slugOf(r)) || !u.pathname.endsWith(`/${slugOf(r)}`)) {", "if (!present(slugOf(r))) {", PP],
  ["P16", "a page already published is recorded again", BIN, '  if (typeof r.publishedUrl === "string") { refused.push(`${page}: ALREADY_PUBLISHED at ${r.publishedUrl}`); continue; }\n', "", PP],
  ["P17", "a list that names no owner decision is recorded", BIN, "if (!decision || !Array.isArray(listed?.pages)", "if (!Array.isArray(listed?.pages)", PP],
  ["P18", "pages are recorded although a listed page cannot be", BIN, "if (refused.length) { console.error(`🔴 REFUSED — ${refused.length} listed page(s) cannot be recorded; nothing written`); process.exit(3); }", "", PP],
  ["P19", "a page is recorded without --confirm", BIN, 'if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm: nothing recorded"); process.exit(refused.length ? 3 : 0); }', "", PP],
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
  `RR-271 publish sabotage run · ${new Date().toISOString()}`,
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
console.log(`evidence written: ${writeEvidenceOnce(REPO, "rr271-publish-sabotage", lines.join("\n") + "\n")}`);
