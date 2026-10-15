/**
 * 🔴 F44 · ACCEPTANCE AMENDMENT 2 (RR-268) · THE SOURCE READER — ONE SABOTAGE PER FAILURE LIMB of C7 to C12.
 *
 *   node test/helpers/f44-source-reader-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f44-source-reader-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/facts/source-reader.mjs", BF = "src/facts/batch-facts.mjs", BIN = "bin/source-facts.mjs", ADP = "src/evidence/evidence-state-adapters.mjs";
const T = ["test/f44-source-reader.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C7 = "C7 · FIRING CONTROL", C8 = "C8 · FIRING CONTROL", C9 = "C9 · FIRING CONTROL", C10 = "C10 · FIRING CONTROL", C11 = "C11 · FIRING CONTROL", BFC = "C11 · BATCH FACTS · FIRING CONTROL", C12 = "C12 · NEUTRAL", PP = "PRODUCTION PATH · C7 C10 C11";

/* [id, limb, file, span, replacement, the test that must turn red] */
const SABOTAGES = [
  ["R01", "C7 the page is read before (without) its robots file", M, "const r = await robots.check(url);", "const r = { state: \"ALLOWED\", allowed: true, reason: \"\" };", C7],
  ["R02", "C7 a path the robots file disallows is read", M, "  if (!r.allowed) return blocked(url, ROUTE.ENGINE, BLOCK.ROBOTS_DISALLOWED, r.reason);\n", "", C7],
  ["R03", "C7 a page is read when its robots file could not be", M, "  if (r.state === \"UNKNOWN\") return blocked(url, ROUTE.ENGINE, BLOCK.ROBOTS_UNREADABLE, r.reason);\n", "", C7],
  ["R04", "C7 the request carries a cookie", M, "headers: { \"User-Agent\": USER_AGENT }", "headers: { \"User-Agent\": USER_AGENT, Cookie: \"s=1\" }", C7],
  ["R05", "C7 a login wall is read past", M, "  if (LOGIN_PATH.test(new URL(landed).pathname) || LOGIN_MARKS.test(body)) return blocked(url, ROUTE.ENGINE, BLOCK.LOGIN_WALL, \"the page asks for a login — not read past\");\n", "", C7],
  ["R06", "C8 the browser route is used without the client having started it", M, " || route.startedByClient !== true", "", C8],
  ["R07", "C8 the browser route reads one host sooner than 5 s apart", M, "export const BROWSER_GAP_MS = 5000;", "export const BROWSER_GAP_MS = 2000;", C8],
  ["R08", "C8 the browser route reads past its run cap", M, "if (state.reads >= cap)", "if (false)", C8],
  ["R09", "C8 a captcha does not stop the route", M, "if (stop) { state.stopped = stop; return", "if (stop) { return", C8],
  ["R10", "C8 a blocked read with no route is an error, not BLOCKED with its URL", M, "return blocked(url, ROUTE.BROWSER, BLOCK.NO_ROUTE,", "throw new Error(\"no route\"); return blocked(url, ROUTE.BROWSER, BLOCK.NO_ROUTE,", C8],
  ["R11", "C8 a page that is not found goes to the browser route", M, "export const FALLBACK_ON = Object.freeze([BLOCK.REFUSED, BLOCK.CHALLENGE, BLOCK.EMPTY]);", "export const FALLBACK_ON = Object.freeze([BLOCK.REFUSED, BLOCK.CHALLENGE, BLOCK.EMPTY, BLOCK.NOT_FOUND]);", C8],
  ["R12", "C8 the run's bound is not honoured", M, "  if (requestsMade() + 2 > maxReads) return blocked(url, ROUTE.ENGINE, BLOCK.READ_CAP, `the run's bound of ${maxReads} request(s) would be passed`);\n", "", C8],
  ["R13", "C9 a refusal of the paid-provider gate is not reported", M, "return Object.freeze({ state: \"REFUSED\", code:", "return Object.freeze({ state: \"PROPOSED\", code:", C9],
  ["R14", "C9 a proposal of more than one sentence is kept", M, "const why = !isOneSentence(p?.sentence) ? REJECT.NOT_ONE_SENTENCE", "const why = false ? REJECT.NOT_ONE_SENTENCE", C9],
  ["R15", "C9 a proposal of another source is kept", M, ": p?.source !== read.url ? REJECT.NOT_ONE_SOURCE", ": false ? REJECT.NOT_ONE_SOURCE", C9],
  ["R16", "C10 a looser normalisation decides (case is ignored)", M, "return n !== \"\" && normaliseText(String(text ?? \"\")).includes(n);", "return n !== \"\" && normaliseText(String(text ?? \"\")).toLowerCase().includes(n.toLowerCase());", C10],
  ["R17", "C10 a fact is checked against a page that was not read and stored", M, "if (!read || read.state !== READ_STATE.READ || typeof read.text !== \"string\")", "if (!read)", C10],
  ["R18", "C10 the stored read loses its sha256", M, "? { sha256: read.sha256, chars:", "? { chars:", C10],
  ["R19", "C10 a blocked read is stored as an observation", ADP, "  if (r.state !== \"READ\") return place(`${rule}.blocked`, \"UNKNOWN\",", "  if (false) return place(`${rule}.blocked`, \"UNKNOWN\",", C10],
  ["R20", "C11 a fact whose quotation is gone reads CURRENT", M, "state: missing.length ? RECHECK.CHANGED : RECHECK.CURRENT", "state: RECHECK.CURRENT", C11],
  ["R21", "C11 a CHANGED fact flags no page", M, "rebuild: Object.freeze(missing.length ? [...base.pages] : [])", "rebuild: Object.freeze([])", C11],
  ["R22", "C11 a blocked source is not reported BLOCKED", M, "if (read.state !== READ_STATE.READ) { out.push(", "if (false) { out.push(", C11],
  ["R23", "C11 a fact with no quotation is not REJECTED", M, "    if (quotations.length === 0) { out.push(Object.freeze({ ...base, state: RECHECK.REJECTED, reason: REJECT.NO_QUOTATION, rebuild: Object.freeze([]) })); continue; }\n", "", C11],
  ["R24", "C11 a stored fact is rewritten by the check", M, "  for (const f of facts) {\n", "  for (const f of facts) {\n    f.readOn = on;\n", C11],
  ["R25", "C11 a span of any length counts as a quotation", BF, "export const QUOTATION_MIN_CHARS = 8;", "export const QUOTATION_MIN_CHARS = 1;", BFC],
  ["R26", "C11 a fact loses the pages that use it", BF, "      out.get(id).pages.add(page);\n", "", BFC],
  ["R27", "C12 the reader's code names a host", M, "export const SOURCE_READ_RECORD = \"source_page_read\";", "const DEFAULT_SOURCE = \"https://www.example.com/\";\nexport const SOURCE_READ_RECORD = \"source_page_read\";", C12],
  ["R28", "C12 the entry point reads outside the declared connector", BIN, "reads.set(url, await readSource(url, { fetchImpl: CONNECTOR.fetch,", "reads.set(url, await readSource(url, { fetchImpl: globalThis.fetch,", C12],
  ["R29", "PP a batch the declared connector does not reach is read", BIN, "if (declared.state !== \"DECLARED\" || !(declared.connector.reaches ?? []).some(", "if (false && !(declared.connector.reaches ?? []).some(", PP],
  ["R30", "PP the rechecks are not stored", BIN, "results.map((r) => recheckRecord({ result: r, tenantId: SCOPE.tenantId, on: ON, run: runId })), \"fact-rechecks.jsonl\");", "results.map((r) => recheckRecord({ result: r, tenantId: SCOPE.tenantId, on: ON, run: runId })), \"fact-rechecks-elsewhere.jsonl\");", PP],
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
  `F44 source-reader sabotage run · ${new Date().toISOString()}`,
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
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f44-source-reader-sabotage", lines.join("\n") + "\n")}`);
