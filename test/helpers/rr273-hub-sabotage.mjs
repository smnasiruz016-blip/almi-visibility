/**
 * 🔴 RR-273 · THE GUIDES HUB — ONE SABOTAGE PER FAILURE LIMB of the hub (src/page/guides-hub.mjs), its record as built and as LIVE
 * (bin/guides-hub.mjs) and F23's hub-only link check (bin/link-status.mjs --hub).
 *
 *   node test/helpers/rr273-hub-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now. Then each sabotage replaces its span ALONE, proves it
 * LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before
 * and after. Evidence: runs/audit/rr273-hub-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/page/guides-hub.mjs", BIN = "bin/guides-hub.mjs", LS = "bin/link-status.mjs";
const T = ["test/rr273-guides-hub.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const FC = "HUB · FIRING CONTROL (RR-273)", PP = "HUB · PRODUCTION PATH (RR-273)";

/* [id, limb, file, span, replacement, the test that must turn red] */
const SABOTAGES = [
  ["H01", "an entry's H1 is not its page's own", M, "h1: hero.h1, intro", "h1: hero.h1.toUpperCase(), intro", FC],
  ["H02", "an entry keeps one line of its intro", M, "intro: hero.intro, from", "intro: hero.intro.slice(0, 1), from", FC],
  ["H03", "a page that is not LIVE is listed", M, "if (r?.record_type !== JOINED_RECORD || !present(r?.publishedUrl)) return", "if (r?.record_type !== JOINED_RECORD) return", FC],
  ["H04", "guides of two designs give one hub", M, "  if (parts.some((p) => p.style !== parts[0].style || p.header !== parts[0].header || p.footer !== parts[0].footer)) return refused(HUB_REFUSE.MIXED_DESIGN);\n", "", FC],
  ["H05", "a title not composed from the recorded phrase", M, "const t = composeTitle({ phrases: [head], capitals });", "const t = { title: \"OET Guides\", trace: [] };", FC],
  ["H06", "the hub carries a noindex line", M, "<base href=\"${escapeText(folderOf(url))}\">", "<meta name=\"robots\" content=\"noindex\"><base href=\"${escapeText(folderOf(url))}\">", FC],
  ["H07", "the hub's canonical is not its own address", M, "<link rel=\"canonical\" href=\"${escapeText(url)}\"><title>", "<link rel=\"canonical\" href=\"${escapeText(folderOf(url))}\"><title>", FC],
  ["H08", "a served hub with a noindex line passes", M, "noNoindex: ok(!/<meta[^>]+name=\"robots\"[^>]+noindex/i.test(s), ", "noNoindex: ok(true, ", FC],
  ["H09", "a canonical naming another address passes", M, "ok(canon.length === 1 && canon[0] === escapeText(url), ", "ok(canon.length <= 1, ", FC],
  ["H10", "FAQ data on the hub passes", M, "noFaqData: ok(!/FAQPage/.test(s), ", "noFaqData: ok(true, ", FC],
  ["H11", "an ItemList out of order passes", M, " && list.itemListElement[i]?.position === i + 1), ", "), ", FC],
  ["H12", "a header, footer or style not the guides' passes", M, "ok(design?.state === \"DESIGN\" && blockOf(\"header\", s) === design.header && blockOf(\"footer\", s) === design.footer && styleOf(s) === design.style, ", "ok(true, ", FC],
  ["H13", "a base address that is not the guides' folder passes", M, "ok(one(/<base href=\"([^\"]*)\">/, s) === escapeText(folderOf(String(url ?? \"\"))), ", "ok(true, ", FC],
  ["H14", "a served hub that differs from the hub as built passes", M, "ok(want.state === \"BUILT\" && s === want.html, ", "ok(want.state === \"BUILT\", ", FC],
  ["H15", "an entry that is not its page's own H1 and intro passes", M, "ok(sections.length === entries.length && entries.every((e, i) => sections[i] === ", "ok(true || entries.every((e, i) => sections[i] === ", FC],
  ["H16", "a guide not linked passes", M, "ok(hrefs.length === entries.length && entries.every((e, i) => hrefs[i] === escapeText(e.url)), ", "ok(true, ", FC],
  ["H17", "a title or H1 not the composed one passes", M, "ok(one(/<title>([\\s\\S]*?)<\\/title>/, s) === escapeText(title) && h1s.length === 1 && h1s[0] === escapeText(title), ", "ok(true, ", FC],
  ["H18", "the hub is recorded LIVE with no owner decision", M, "  if (!/^_handoffs:\\S+\\.md$/.test(decision ?? \"\")) return refused(HUB_REFUSE.NO_DECISION, String(decision ?? \"\"));\n", "", FC],
  ["H19", "the link check plans the hub's header and footer too", M, "html: `<main>${mainOf(hub.html) ?? \"\"}</main>`", "html: hub.html", FC],
  ["H20", "the link check takes a hub that is not LIVE", M, "r?.record_type === HUB_RECORD && r.publishedUrl === url", "r?.record_type === HUB_RECORD && r.url === url", FC],
  ["H21", "a hub off the client's hosts is recorded", BIN, "if (!hubHost || !hosts.includes(hubHost)) {", "if (!hubHost) {", PP],
  ["H22", "a hub is recorded without --confirm", BIN, "if (!permission.mayWrite) { console.log(\"  NOT WRITTEN — no --confirm: nothing recorded\"); process.exit(0); }", "", PP],
  ["H23", "the hub is recorded LIVE twice", BIN, "  if (typeof latest.publishedUrl === \"string\") { console.error(`🔴 REFUSED — ALREADY_PUBLISHED on ${latest.publishedOn}; nothing written`); process.exit(3); }\n", "", PP],
  ["H24", "the link check goes on for a hub not LIVE", LS, "if (HUB !== null && hub === null) { console.error(\"🔴 REFUSED — NO_LIVE_HUB: the batch records no LIVE guides hub at that address on a declared host. NO REQUEST WAS MADE.\"); process.exit(3); }", "", PP],
  ["H25", "the hub-only link check plans the whole batch", LS, "const pages = hub ? [hub] : population.pages;", "const pages = population.pages;", PP],
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
  `RR-273 hub sabotage run · ${new Date().toISOString()}`,
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
console.log(`evidence written: ${writeEvidenceOnce(REPO, "rr273-hub-sabotage", lines.join("\n") + "\n")}`);
