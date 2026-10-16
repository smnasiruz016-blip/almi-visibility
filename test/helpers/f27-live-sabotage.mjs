/**
 * 🔴 F27 · ACCEPTANCE AMENDMENT 3 · THE CLIENT'S LIVE PAGES — ONE SABOTAGE PER FAILURE LIMB of C1 to C7 (src/audit/live-security.mjs, the
 * connector's one transport read in src/tenancy/connectors.mjs, bin/live-security.mjs, the declarations in config/security/).
 *
 *   node test/helpers/f27-live-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now. Then each sabotage replaces its span ALONE, proves it
 * LANDED, runs the named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before
 * and after. Evidence: runs/audit/f27-live-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/audit/live-security.mjs", CON = "src/tenancy/connectors.mjs", BIN = "bin/live-security.mjs", HB = "config/security/live-header-baseline.mjs", PE = "config/security/public-exposure-declaration.mjs";
const T = ["test/f27-live-security.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C2 = "C2 · HTTPS AND TLS · FIRING CONTROL (F27 A3)", C3 = "C3 · MIXED CONTENT · FIRING CONTROL (F27 A3)", C4 = "C4 · UNSAFE FORMS · FIRING CONTROL (F27 A3)", C5 = "C5 · HEADERS · FIRING CONTROL (F27 A3)",
  C6 = "C6 · PUBLIC EXPOSURE · FIRING CONTROL (F27 A3)", C7 = "C1 C7 · POPULATION, DENOMINATORS, THREE VERDICTS · FIRING CONTROL (F27 A3)", CON1 = "CONNECTOR · ONE READ · FIRING CONTROL (F27 A3)", PP = "PRODUCTION PATH (F27 A3)";

/* [id, limb, file, span, replacement, the test that must turn red] */
const SABOTAGES = [
  ["L01", "C2 a 302 or 307 passes as a redirect to https", M, "export const REDIRECT_STATUSES = Object.freeze([301, 308]);", "export const REDIRECT_STATUSES = Object.freeze([301, 302, 307, 308]);", C2],
  ["L02", "C2 a redirect to another host or to http passes", M, "  if (!to || to.protocol !== \"https:\" || to.host !== page?.host) return { state: STATE.FAIL, why: \"the redirect is not to the same host on https\" };\n", "", C2],
  ["L03", "C2 an unrecorded redirect passes", M, "  if (!httpRead || !Number.isInteger(httpRead.status)) return { state: STATE.NOT_MEASURED, why: \"the http: form was not requested, or its answer was not recorded\" };", "  if (!httpRead || !Number.isInteger(httpRead.status)) return { state: STATE.PASS };", C2],
  ["L04", "C2 a TLS protocol below 1.2 passes", M, "export const TLS_PROTOCOLS = Object.freeze([\"TLSv1.2\", \"TLSv1.3\"]);", "export const TLS_PROTOCOLS = Object.freeze([\"TLSv1\", \"TLSv1.1\", \"TLSv1.2\", \"TLSv1.3\"]);", C2],
  ["L05", "C2 a certificate the platform did not verify passes", M, "  if (tls.authorized !== true) return { state: STATE.FAIL, why: \"the platform did not verify the certificate for the host\" };\n", "", C2],
  ["L06", "C2 an expired certificate passes", M, "  if (!(at >= from && at <= to)) return { state: STATE.FAIL, why: \"the read date lies outside the certificate's validity\" };\n", "", C2],
  ["L07", "C3 an http: url() in a style element is missed", M, "    try { if (new URL(raw, base).protocol === \"http:\") http++; } catch { /* not a URL */ }", "", C3],
  ["L08", "C3 a page that runs script reads complete", M, "  for (const m of text.matchAll(/<script\\b([^>]*)>/gi)) { const t = /\\stype\\s*=\\s*[\"']?([^\"'\\s>]+)/i.exec(m[1])?.[1]?.toLowerCase() ?? \"\"; if (t !== \"application/ld+json\") return true; }", "", C3],
  ["L09", "C4 an http: form action is missed", M, "submissions += f.submissions;", "submissions += 0;", C4],
  ["L10", "C5 an HSTS max-age below the floor passes", HB, "check: \"HSTS_MIN_MAX_AGE\", min: 15768000 }", "check: \"HSTS_MIN_MAX_AGE\", min: 0 }", C5],
  ["L11", "C5 a report-only policy counts for clickjacking", M, "if (/(^|;)\\s*frame-ancestors\\b/i.test(h[\"content-security-policy\"] ?? \"\"))", "if (/(^|;)\\s*frame-ancestors\\b/i.test(h[\"content-security-policy\"] ?? h[\"content-security-policy-report-only\"] ?? \"\"))", C5],
  ["L12", "C5 unsafe-url passes as a referrer policy", HB, "failing: Object.freeze([\"unsafe-url\", \"no-referrer-when-downgrade\"])", "failing: Object.freeze([])", C5],
  ["L13", "C5 a page that is not HTML over https is judged", M, "  if (!htmlOverHttps) return { state: STATE.NOT_APPLICABLE };\n", "", C5],
  ["L14", "C5 an unrecorded response is reported failing or passing", M, "  if (!read || !read.headers) return { state: STATE.NOT_MEASURED, why: \"the response was not recorded\" };", "  if (!read || !read.headers) return { state: STATE.FAIL, why: \"absent\" };", C5],
  ["L15", "C5 the Content-Security-Policy is given a verdict", M, "verdict: \"REPORTED — NO VERDICT\" }", "verdict: csp.some((c) => c.enforced) ? VERDICT.PROVED : VERDICT.DISPROVED }", C5],
  ["L16", "C6 a sensitive artefact on a recorded response is missed", PE, "paths: Object.freeze([/(^|\\/)\\.env(\\.[^/]*)?$/i,", "paths: Object.freeze([", C6],
  ["L17", "C6 an exposure rule is widened past the owner's words (a 404 counts)", M, "if (c.kind === \"SENSITIVE_ARTEFACT\" && resp.status >= 200 && resp.status < 300 && ", "if (c.kind === \"SENSITIVE_ARTEFACT\" && ", C6],
  ["L18", "C6 with no declaration, exposure reads judged", M, "verdict: !exposureDeclaration ? VERDICT.COULD_NOT_PROVE : ", "verdict: !exposureDeclaration ? VERDICT.PROVED : ", C6],
  ["L19", "C1 a LIVE page with no recorded read is silently skipped", M, "  if (n - read.length) absent.push(`${n - read.length} of ${n} LIVE page(s) have no recorded read`);\n", "", C7],
  ["L20", "C7 an empty population reads PROVED", M, "found.length ? VERDICT.DISPROVED : n > 0 && read.length === n ? VERDICT.PROVED : VERDICT.COULD_NOT_PROVE };", "found.length ? VERDICT.DISPROVED : VERDICT.PROVED };", C7],
  ["L21", "C7 one DISPROVED part does not disprove the row", M, "const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : ", "const verdict = ", C7],
  ["L22", "C1 the connector reads an address off its origins", CON, "    if (![\"http:\", \"https:\"].includes(u.protocol) || !admits(httpsForm)) throw new ConnectorRefused(\"ORIGIN_NOT_DECLARED_FOR_THIS_CONNECTOR\");\n", "", CON1],
  ["L23", "C1 a read bypasses the paced release", CON, "    await release(url, gapMs);\n    const send = sendFor(u.protocol);", "    const send = sendFor(u.protocol);", CON1],
  ["L24", "C1 the run goes on with more requests than the limit", BIN, "if (planned > LIMIT) { console.error(`🔴 REFUSED — REQUESTS_OUTNUMBER_THE_LIMIT: ${planned} planned against a limit of ${LIMIT}. NO REQUEST WAS MADE.`); process.exit(3); }", "", PP],
  ["L25", "C1 a limit above the owner's ceiling is taken", BIN, "LIMIT >= 1 && LIMIT <= LIVE_CHECK_CEILING", "LIMIT >= 1", PP],
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
  `F27 live sabotage run · ${new Date().toISOString()}`,
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
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f27-live-sabotage", lines.join("\n") + "\n")}`);
