/**
 * 🔴 RR-216 · F92 · ONE SABOTAGE PER FAILURE LIMB of F92's first acceptance (_handoffs 06cdb82: C1–C7 and [ALL]) — each on LIVE, REACHABLE code,
 * its span found EXACTLY ONCE, applied ALONE, the named test confirmed GREEN first and then required RED by an AssertionError (never a crash of
 * the TEST), every file restored by raw-byte sha256, the production trail hashed before and after. FIXTURE PAGES ONLY (RR-177).
 *
 *   node test/helpers/rr216-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr216-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr216-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file. The engine of test/helpers/rr188-sabotage.mjs (via rr206, rr210, rr214), unchanged.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MV = "src/page/media-visibility.mjs", ME = "src/page/media-visibility-evidence.mjs", CA = "src/audit/accessibility.mjs";
const CBE = "src/page/content-brief-evidence.mjs", TF = "test/rr216-f92.test.mjs";
const T = ["test/rr216-f92.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr216-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const UNUSABLE = "export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.REDIRECTED, STATUS.NOT_SERVED]);";
const SABOTAGES = [
  /* ── C1 ── */
  ["S01", "C1 · a relied-on video on a declared host is missed", [[MV, "    if (!host || !VIDEO_HOSTS.includes(host)) continue;", "    if (true) continue;"]], "T92-C1"],
  ["S02", "C1 · a medium is listed that the declared rule does not hold (an iframe on another host)", [[MV, "    if (!host || !VIDEO_HOSTS.includes(host)) continue;", "    if (!host) continue;"]], "T92-C1"],
  ["S03", "C1 · a decorative claim is counted as relied-on media", [[MV, "    if (f26 === \"DECORATIVE\") { decorative.push(", "    if (false) { decorative.push("]], "T92-C1"],
  ["S04", "C1 · script-inserted media is reported measured", [[MV, "  const s = scannable(html);", "  const s = String(html ?? \"\");"]], "T92-C1"],
  ["S05", "C1 · a page with no media is reported as a finding", [[MV, "    media: media.length ? SIGNAL.PRESENT : SIGNAL.NO_MEDIA,", "    media: media.length ? SIGNAL.PRESENT : SIGNAL.FINDING,"]], "T92-C1"],
  /* ── C2 ── */
  ["S06", "C2 · alt presence is measured again instead of read from F26", [[MV, "function f26Image(tag) {\n  const r = ", "function f26Image(tag) {\n  if (/\\balt\\s*=/.test(tag)) return \"PRESENT\";\n  const r = "]], "T92-C2"],
  ["S07", "C2 · an image with no alt carries no finding", [[MV, "    if (item.f26 === \"MISSING\") return Object.freeze({ signal: SIGNAL.FINDING,", "    if (item.f26 === \"MISSING\") return Object.freeze({ signal: SIGNAL.PRESENT,"]], "T92-C2"],
  ["S08", "C2 · a video with no declared description marker is reported described", [[MV, "  return Object.freeze({ signal: SIGNAL.FINDING, why: \"a video with no VideoObject name and description", "  return Object.freeze({ signal: SIGNAL.PRESENT, why: \"a video with no VideoObject name and description"]], "T92-C2"],
  ["S09", "C2 · a track outside the declared kinds is read as a description", [[MV, ".filter((k) => TRACK_KINDS.includes(k));", ".filter((k) => k !== \"\");"]], "T92-C2"],
  ["S10", "C2 · F92 suggests alt text", [[MV, "/* ── C3 · truthful and adequate: a recorded judgement only ── */", "export function suggestAlt(item) { return `An image of ${item.src}`; }\n/* ── C3 · truthful and adequate: a recorded judgement only ── */"]], "T92-C2"],
  /* ── C3 ── */
  ["S11", "C3 · a description is reported truthful with no recorded judgement", [[MV, "  if (!given) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_LAWFUL_JUDGE });", "  if (!given) return Object.freeze({ signal: SIGNAL.PRESENT, why: NO_LAWFUL_JUDGE });"]], "T92-C3"],
  ["S12", "C3 · a fixture judgement is accepted in a real run", [[MV, "  if (s.kind === \"FIXTURE\" && population !== \"FIXTURE\") return refuse(", "  if (false) return refuse("]], "T92-C3"],
  ["S13", "C3 · an unregistered provider's judgement is accepted", [[MV, "  if (s.kind === \"AGENT\" && !(registeredProviders.includes(s.provider) && present(s.callRef))) return refuse(", "  if (s.kind === \"AGENT\" && !present(s.callRef)) return refuse("]], "T92-C3"],
  ["S14", "C3 · an undeclared source (a person) is accepted", [[MV, "  if (!present(s.kind) || s.kind === \"PERSON\" || s.kind === \"OWNER\") return refuse(", "  if (!present(s.kind)) return refuse("], [MV, "  if (![\"FIXTURE\", \"AGENT\"].includes(s.kind)) return refuse(", "  if (![\"FIXTURE\", \"AGENT\", \"PERSON\"].includes(s.kind)) return refuse("]], "T92-C3"],
  ["S15", "C3 · adequacy is inferred from the description itself", [[MV, "  if (!given) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_LAWFUL_JUDGE });", "  if (!given) return Object.freeze({ signal: described.by ? SIGNAL.PRESENT : SIGNAL.NOT_MEASURED, why: NO_LAWFUL_JUDGE });"]], "T92-C3"],
  /* ── C4 ── */
  ["S16", "C4 · a named media URL no visible media carries is reported consistent", [[MV, "signal: visible.has(n.url) ? SIGNAL.CONSISTENT : SIGNAL.FINDING, why:", "signal: SIGNAL.CONSISTENT, why:"]], "T92-C4"],
  ["S17", "C4 · a matching named media URL is reported inconsistent", [[MV, "  const visible = new Set(media.flatMap((m) => m.srcs ?? [m.src]));", "  const visible = new Set();"]], "T92-C4"],
  ["S18", "C4 · a video with no structured or sitemap metadata carries no finding", [[MV, "    return Object.freeze({ src: v.src, signal: hasVO || hasSM ? SIGNAL.PRESENT : SIGNAL.FINDING,", "    return Object.freeze({ src: v.src, signal: SIGNAL.PRESENT,"]], "T92-C4"],
  ["S19", "C4 · sitemap consistency is decided where no capture holds media entries", [[MV, "  if (!Array.isArray(sitemapMedia)) sitemap = Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_SITEMAP_MEDIA,", "  if (!Array.isArray(sitemapMedia)) sitemap = Object.freeze({ signal: SIGNAL.CONSISTENT, why: NO_SITEMAP_MEDIA,"]], "T92-C4"],
  ["S20", "C4 · the URL-strings capture is read as media entries", [[ME, "  const held = records.filter((r) => r?.record_type === \"observation\" && Array.isArray(r.value?.media));", "  const held = records.filter((r) => r?.record_type === \"observation\");"]], "T92-C4"],
  /* ── C5 ── */
  ["S21", "C5 · media is recommended with no recorded need naming a media format", [[MV, "  if (!need || !present(need.mediaFormat) || !present(need.ref)) return", "  if (!need) return"]], "T92-C5"],
  ["S22", "C5 · media is recommended for every page by default", [[MV, "  if (!need || !present(need.mediaFormat) || !present(need.ref)) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_MEDIA_NEED });", "  if (!need || !present(need.mediaFormat) || !present(need.ref)) return Object.freeze({ signal: SIGNAL.PRESENT, format: \"image\", why: NO_MEDIA_NEED });"]], "T92-C5"],
  ["S23", "C5 · a need with no recorded media format is read as naming one", [[ME, "export const mediaNeedOf = (spec) => (typeof spec?.mediaFormat === \"string\"", "export const mediaNeedOf = (spec) => ({ needId: spec?.subject, mediaFormat: \"image\", ref: \"default\" }) || (typeof spec?.mediaFormat === \"string\""]], "T92-C5"],
  ["S24", "C5 · F92 inserts media into a draft's plan", [[MV, "  const r = assessMedia({ pageId: `draft:${draft?.subject ?? need?.needId ?? \"unknown\"}`, html: draft?.html ?? \"\", need });", "  const r = assessMedia({ pageId: `draft:${draft?.subject ?? need?.needId ?? \"unknown\"}`, html: `${draft?.html ?? \"\"}<img src=\"/stock.png\" alt=\"stock\">`, need });"]], "T92-C5"],
  /* ── C6 ── */
  ["S25", "C6 · on an INCOMPLETE inventory a claim is made about pages it does not hold", [[MV, "siteHasNoMedia: anyMedia ? false : bound.state === \"COMPLETE\" ? true : SIGNAL.NOT_MEASURED }),", "siteHasNoMedia: anyMedia ? false : true }),"]], "T92-C6"],
  ["S26", "C6 · a result lacks its bound", [[MV, "text: present(v?.bound) ? v.bound : \"no completeness verdict recorded (F31)\" });", "text: null });"]], "T92-C6"],
  ["S27", "C6 · another tenant's page is read into the audit", [[MV, "  for (const p of pages) (sameTenant(p?.tenantId, tenantId) ? own : refused).push(p);", "  for (const p of pages) own.push(p);"]], "T92-C6"],
  ["S28", "C6 · the reader asks for another (no) tenant's records", [[ME, "  const { population, fault } = io.population({ tenantId, resolve, env, now });", "  const { population, fault } = io.population({ tenantId: null, resolve, env, now });"]], "T92-C6"],
  ["S29", "C6 · something is fetched", [[MV, "export const SIGNAL = Object.freeze(", "export const probe = (u) => fetch(u);\nexport const SIGNAL = Object.freeze("]], "T92-C6"],
  ["S30", "C6 · F92 writes to a store", [[MV, "import { decideResolvedTenants } from \"../tenancy/scope.mjs\";", "import { decideResolvedTenants } from \"../tenancy/scope.mjs\";\nimport { appendFileSync } from \"node:fs\";"]], "T92-C6"],
  ["S31", "C6 · a signal is given a default", [[MV, "judged: judgedOf(m, described, given, { population, registeredProviders }) });", "judged: Object.freeze({ signal: \"UNKNOWN\" }) });"]], "T92-C6"],
  /* ── C7 ── */
  ["S32", "C7 · F92 changes another row's code (F26's assessment)", [[CA, " * F26 · ACCESSIBILITY ASSESSMENT (acceptance _handoffs b1a94e7, RR-95).", " * F26 · ACCESSIBILITY ASSESSMENT (acceptance _handoffs b1a94e7, RR-95) — read by F92."]], "T92-C7"],
  ["S33", "C7 · F92's findings are wired into F41's brief without F41's own amendment", [[CBE, "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";", "import { readExistingPagePopulation } from \"./existing-page-population.mjs\";\nimport { readClientMedia } from \"./media-visibility-evidence.mjs\";"]], "T92-C7"],
  /* ── [ALL] ── */
  ["S34", "[ALL] · a proof reads a page body (the 27 pages set aside)", [[TF, "const MV = \"src/page/media-visibility.mjs\", ME = \"src/page/media-visibility-evidence.mjs\";", "const MV = \"src/page/media-visibility.mjs\", ME = \"src/page/media-visibility-evidence.mjs\";\nconst bodies = () => readPartitionBodies;"]], "T92-ALL"],
  ["S35", "[ALL] · a run reports counts it did not produce", [[MV, "      media: count((r) => [r.media]),", "      media: { ...count((r) => [r.media]), PRESENT: 99 },"]], "T92-ALL"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = RUN.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = sha(read(TRAIL));
const run = () => spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baselineGreen = base.status === 0;
const named = [...new Set(RUN.map((s) => s[3]))];
const seenGreen = (p) => new RegExp(`✔ ${esc(p)} `).test(`${base.stdout}${base.stderr}`);
const namedGreen = named.every(seenGreen);
const lines = [
  `RR-216 F92 sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T.join(" + ")} · each applied ALONE · no provider, no network, no third-party read`,
  `BASELINE (the named tests before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · named tests seen GREEN: ${named.filter(seenGreen).length} of ${named.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect] of baselineGreen && namedGreen ? RUN : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const touched = [...new Set(spans.map((s) => s[0]))];
  for (const f of touched) {
    let text = originals.get(f).toString("utf8");
    for (const [, from, to] of spans.filter((s) => s[0] === f)) { const ff = inEol(text, from); const at = text.indexOf(ff); text = text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length); }
    writeFileSync(join(REPO, f), text, "utf8");
  }
  const landed = touched.every((f) => sha(read(f)) !== sha(originals.get(f)));
  let failing = [], out = "";
  try {
    const r = run();
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    for (const f of touched) writeFileSync(join(REPO, f), originals.get(f));
  }
  const restored = touched.every((f) => sha(read(f)) === sha(originals.get(f)));
  const red = failing.some((n) => n.startsWith(`${expect} `));
  const cls = failureClassOf(out, expect);
  const byAssertion = cls === "AssertionError";
  const syntax = /SyntaxError/.test(out);
  const childCrashed = /\n\s+at .*bin\/|TypeError: |ReferenceError: /.test(out);
  const ok = landed && red && byAssertion && !syntax && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · a production child crashed ${childCrashed} · failing ${[...new Set(failing.map((n) => n.split(" ")[0]))].join(",")} · restored ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${RUN.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length ? 0 : 1;
