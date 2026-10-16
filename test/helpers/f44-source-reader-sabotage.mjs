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
const PDF = "src/facts/pdf-text.mjs";
const M = "src/facts/source-reader.mjs", BF = "src/facts/batch-facts.mjs", BIN = "bin/source-facts.mjs", PT = "src/facts/private-texts.mjs", ADP = "src/evidence/evidence-state-adapters.mjs";
const T = ["test/f44-source-reader.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const PDFR = "C7 · PDF READER · FIRING CONTROL (RR-269 §2)", CAP = "CAPTURE · CLIENT FILE · FIRING CONTROL (RR-269 §1)";
const C7 = "C7 · FIRING CONTROL", C8 = "C8 · FIRING CONTROL", C9 = "C9 · FIRING CONTROL", C10 = "C10 · FIRING CONTROL", C11 = "C11 · FIRING CONTROL", BFC = "C11 · BATCH FACTS · FIRING CONTROL", C12 = "C12 · NEUTRAL", PP = "PRODUCTION PATH · C7 C10 C11", PRV = "RR-274 · PRIVATE TEXTS · FIRING CONTROL", EXT = "C9 + C10 · EXTRACTION RECORD · FIRING CONTROL";

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
  /* RR-268 C: the stored-text extraction (--extract), the non-text guard, and the admitted quotation counted for the recheck */
  ["R31", "C7 a document that is not text is kept as a page's text", M, "if (type !== \"\" && !TEXT_TYPES.test(type)) return blocked(", "if (false) return blocked(", C7],
  ["R32", "C9/C10 a proposal on another source re-admits the fact", M, "proposal.fact && factLink === proposal.source ? EXTRACTION.RE_ADMITTED", "proposal.fact ? EXTRACTION.RE_ADMITTED", EXT],
  ["R33", "C10 a verdict has no evidence rule", ADP, "  fact_extraction: { inputs:", "  fact_extraction_off: { inputs:", EXT],
  ["R34", "C11 an admitted claim quotation is not counted for the recheck", BF, "if (String(c.quotation ?? \"\").length >= QUOTATION_MIN_CHARS && ", "if (false && ", BFC],
  ["R35", "PP the verdicts are written without --confirm", BIN, "  if (!permission.mayWrite) { console.log(\"  NOT WRITTEN — no --confirm: nothing kept\"); process.exit(0); }", "", PP],
  ["R36", "PP the route's NOT METERED cost entry is not kept", BIN, "const c = RUN_COST.appendOwn(entry);", "const c = { outcome: \"COMMITTED\" };", PP],
  ["R37", "PP a proposals file outside the batch's own name is read", BIN, "(live || !/^fact-proposals-", "(live || false && !/^fact-proposals-", PP],
  /* RR-269 §1/§2: the PDF reader, the client's own reads, the read list */
  ["R38", "C7 a PDF is not read by the PDF reader", M, "if (isPdf(bytes) || PDF_TYPE.test(type)) return pdfRead(", "if (false) return pdfRead(", PDFR],
  ["R39", "C7 a scanned PDF is read as a PDF with text", PDF, "state: /\\S/.test(text) ? PDF_TEXT.TEXT : PDF_TEXT.NO_TEXT, text, pages: pages.length", "state: PDF_TEXT.TEXT, text, pages: pages.length", PDFR],
  ["R40", "C7 a font's own ToUnicode map is not read", PDF, "      if (cmap?.map.has(code)) return cmap.map.get(code);\n", "", PDFR],
  ["R41", "C7 a gap between two glyphs is not a space", PDF, "if (prev && g.x - prev.ex > 0.18 * g.fs && !/\\s$/.test(out) && !/^\\s/.test(g.ch)) out += \" \";", "if (false) out += \" \";", PDFR],
  ["R42", "C7 an encrypted PDF is read", PDF, "if (/\\/Encrypt\\s/.test(bytes.toString(\"latin1\"))) return", "if (false) return", PDFR],
  ["R43", "C8 a capture that does not say the client's browser is imported", M, ": !/\\broute:\\s*client browser\\b/i.test(readLine) ? CAPTURE_REFUSE.NOT_CLIENT_BROWSER", ": false ? CAPTURE_REFUSE.NOT_CLIENT_BROWSER", CAP],
  ["R44", "C8 a capture is kept as a read the engine drove", M, "route: ROUTE.BROWSER, via: VIA.CAPTURE,", "route: ROUTE.BROWSER, via: VIA.ENGINE,", CAP],
  ["R45", "C10 a fact stands on a file the client says is out of date", M, "  if (read.currency?.state === CURRENCY.OUT_OF_DATE) return", "  if (false) return", CAP],
  ["R46", "C10 a capture's own read date is lost", M, "readOn: read.via === VIA.CAPTURE || read.via === VIA.CLIENT_FILE ? read.readOn : on,", "readOn: on,", CAP],
  ["R47", "PP a fact is rechecked against a file the client says is out of date", BIN, " && r.currency?.state !== CURRENCY.OUT_OF_DATE).map((r) => [r.url, r]));", ").map((r) => [r.url, r]));", PP],
  ["R48", "PP a source outside the read list is read", BIN, "const urls = listed ? [...new Set(listed.sources)].sort() :", "const urls = false ? [] :", PP],
  ["R49", "PP the imported reads are written without --confirm", BIN, "  if (!permission.mayWrite) { console.log(\"  NOT WRITTEN — no --confirm: no read and no recheck kept\"); process.exit(0); }", "", PP],
  ["R50", "C11 a quotation missing from a captured part of a page is read as gone", M, "    if (missing.length && read.capture && read.capture.whole !== true) {", "    if (false) {", CAP],
  ["R51", "C7 a PDF's glyphs are read in the order they are drawn, not where the page shows them", PDF, "const sorted = [...glyphs].sort((a, b) => b.y - a.y || a.x - b.x);", "const sorted = [...glyphs];", PDFR],
  ["R52", "C7 RR-270 a simple font's codes are read two bytes at a time when its ToUnicode map declares a two-byte code space", PDF, "  const bytesPerCode = composite ? 2 : 1;", "  const bytesPerCode = composite || cmap?.twoByte ? 2 : 1;", PDFR],
  /* RR-274: the page texts of other organisations kept privately — never in the public batch */
  ["R53", "RR-274 a public copy keeps the page text", PT, "return Object.freeze({ ...record, text: null, textAt: TEXT_AT });", "return Object.freeze({ ...record, textAt: TEXT_AT });", PRV],
  ["R54", "RR-274 a private text is joined although it is not the one the public record states", PT, "    if (sha256(p.text) !== r.sha256) return Object.freeze({ ...r, text: null, textMissing: TEXT_MISSING.HASH_DIFFERS });\n", "", PRV],
  ["R55", "RR-274 a private text of another read is joined", PT, "const p = byKey.get(r.measurement_key);", "const p = byKey.get(r.measurement_key) ?? [...byKey.values()][0];", PRV],
  ["R56", "RR-274 a live read writes the full text into the public batch", BIN, "const g = append(fullReads.map(publicCopy), \"source-reads.jsonl\");", "const g = append(fullReads, \"source-reads.jsonl\");", PP],
  ["R57", "RR-274 a live read runs without the private sources root", BIN, "refuseWithoutPrivate(\"a live read\");\n", "", PP],
  ["R58", "RR-274 an extraction reads the public text (none) instead of the private one", BIN, "withPrivateTexts(rows(\"source-reads.jsonl\"), privateRows(\"source-reads.jsonl\"), { rootState: PRIVATE.state })", "rows(\"source-reads.jsonl\")", PP],
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
