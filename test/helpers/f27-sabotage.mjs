/**
 * 🔴 F27 · ONE SABOTAGE PER PROTECTION (acceptance _handoffs 8a6312b, amended 93fa696 — EVIDENCE; RR-111 §6).
 *
 *   node test/helpers/f27-sabotage.mjs      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f27-sabotage-rr129-2026-10-02.txt (RR-129 rerun after the header assessment; the 1 Oct file is kept untouched).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TS = "src/audit/transport-security.mjs", RD = "src/audit/transport-security-reader.mjs", BIN = "bin/transport-security.mjs", CP = "tools/need-coverage-call-paths.mjs";
const T = ["test/f27-transport-security.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  ["S1", "C1 a missing body is named", TS, "if (absent) named.push(", "if (false) named.push(", "C1 · FIRING CONTROL"],
  ["S2", "C1 a truncated body is never read as complete", TS, "const readable = withBody.filter((p) => !p.truncated);", "const readable = withBody;", "C1 · FIRING CONTROL"],
  ["S3", "C1 the reader carries a body's truncation", RD, "truncated: truncated.has(p.body_observation_id)", "truncated: false", "C1 · the reader keeps"],
  ["S4", "C1 a recorded request for the http: form is seen", RD, "httpFormRequested: httpRequested.has(p.canonical)", "httpFormRequested: false", "C1 · the reader keeps"],
  ["S5", "C2 an http final URL DISPROVES the part", TS, "verdict: notHttps > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE },", "verdict: VERDICT.COULD_NOT_PROVE },", "C2 · FIRING CONTROL"],
  ["S6", "C2 HTTPS is never PROVED while TLS is unrecorded", TS, "verdict: notHttps > 0 ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE },", "verdict: notHttps > 0 ? VERDICT.DISPROVED : VERDICT.PROVED },", "C2 · FIRING CONTROL"],
  ["S7", "C2 a never-fetched page is NOT MEASURED, never HTTPS", TS, "const fetched = pages.filter((p) => p.fetched && p.url !== null);", "const fetched = pages.map((p) => ({ ...p, url: p.url ?? \"https://x.example/\" }));", "C2 · FIRING CONTROL"],
  ["S8", "C3 an attribute is read only at a whitespace boundary (data-src)", TS, "new RegExp(`\\\\s${name}", "new RegExp(`\\\\b${name}", "C3 · FIRING CONTROL: every"],
  ["S9", "C3 a script's own src is read", TS, "for (const m of outsideComments.matchAll(/<script\\b([^>]*)>[\\s\\S]*?<\\/script\\s*>/gi)) see(attrOf(`<script ${m[1]}>`, \"src\"));", "", "C3 · FIRING CONTROL: every"],
  ["S10", "C3 a script in a comment or template is not read", TS, ".replace(/<!--[\\s\\S]*?-->/g, \" \").replace(/<template\\b[^>]*>[\\s\\S]*?<\\/template\\s*>/gi, \" \");", ";", "C3 · markup inside"],
  ["S11", "C3 every srcset candidate is read", TS, "if (set) for (const c of set.split(\",\")) see(c.trim().split(/\\s+/)[0]);", "if (set) see(set.split(\",\")[0].trim().split(/\\s+/)[0]);", "C3 · FIRING CONTROL: every"],
  ["S12", "C3 only loading link rels are read", TS, "if (/^link$/i.test(name) && LOADING_REL.test(attrOf(tag, \"rel\") ?? \"\")) see(attrOf(tag, \"href\"));", "if (/^link$/i.test(name)) see(attrOf(tag, \"href\"));", "C3 · FIRING CONTROL: every"],
  ["S13", "C3 an http page is not judged for mixed content", TS, "const httpsReadable = readable.filter((p) => new URL(p.url).protocol === \"https:\");", "const httpsReadable = readable;", "C3 · markup inside"],
  ["S14", "C4 an http: formaction is unsafe", TS, "for (const m of body.matchAll(/<(button|input)\\b[^>]*>/gi)) if (isHttp(attrOf(m[0], \"formaction\"), base)) submissions++;", "", "C4 · FIRING CONTROL"],
  ["S15", "C4 a password counts only on an http page", TS, "if (!httpsPage) for (const m of body.matchAll(/<input", "if (true) for (const m of body.matchAll(/<input", "C4 · FIRING CONTROL"],
  ["S16", "C4 a form with no action is judged by its own page", TS, "isHttp(action === null || action === \"\" ? base : action, base)", "isHttp(action, base)", "C4 · FIRING CONTROL"],
  ["S17", "C5 no header is judged without a declaration", TS, "observations: fetchedObservations, judged: 0,", "observations: fetchedObservations, judged: Object.keys(headerNames).length,", "C5 ·"],
  ["S18", "C6 public exposure is never passed", TS, "publicExposure: { missing: [MISSING.publicExposure], verdict: VERDICT.COULD_NOT_PROVE },", "publicExposure: { missing: [MISSING.publicExposure], verdict: VERDICT.PROVED },", "C5 ·"],
  ["S19", "C7 one DISPROVED part disproves the row", TS, "const verdict = verdicts.includes(VERDICT.DISPROVED) ? VERDICT.DISPROVED : VERDICT.COULD_NOT_PROVE;", "const verdict = VERDICT.COULD_NOT_PROVE;", "C7 ·"],
  ["S20", "C7 the raw-HTML exclusion is named", TS, "`raw HTML: ${MISSING.rendered}`, ", "", "C7 ·"],
  ["S21", "C1 the entry point reads its OWN tenant", BIN, "readClientTransport({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() })", "readClientTransport({ tenantId: \"tenant:ffffffffffffffffffffffffffffffff\", resolve: createTenantResolver() })", "C1 · THE ENTRY POINT"],
  ["S22", "C1 the entry point prints TLS as NOT MEASURED", BIN, "· TLS NOT MEASURED — ", "· — ", "C1 · THE ENTRY POINT"],
  ["S23", "C1 a network call is seen", CP, `{ code: "RAW_NETWORK_CALL", test: (t) => t.split("\\n").some((l) => RAW_EGRESS.test(l)) },`, `{ code: "RAW_NETWORK_CALL", test: () => false },`, "C1 · the audit and its reader"],
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
  `F27 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 300 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
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
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
writeFileSync(join(REPO, "runs", "audit", "f27-sabotage-rr129-2026-10-02.txt"), lines.join("\n") + "\n");
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore ? 0 : 1;
